const { z } = require('zod');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Role = require('../models/Role');
const ApiResponse = require('../utils/apiResponse');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { logAudit } = require('../middlewares/auditLogger');
const { DEFAULT_ROLE_PERMISSIONS } = require('../utils/permissions');
const emailService = require('../services/emailService');

// Validation schemas
const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Register a new organization and owner account
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { companyName, industry, firstName, lastName, email, password, phone } = validatedData;

    // Generate unique slug from company name
    const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Check if user email already exists globally in any organization
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return ApiResponse.error(res, 'A user account with this email address already exists.', 400);
    }

    // 1. Create Organization
    const organization = await Organization.create({
      name: companyName,
      slug,
      industry: industry || 'Generic Business',
      email: email.toLowerCase(),
      phone: phone || ''
    });

    // 2. Find or create Organization Owner role for this organization
    let ownerRole = await Role.findOne({
      organizationId: organization._id,
      name: 'Organization Owner'
    });

    if (!ownerRole) {
      // Clone from system template or default permissions
      ownerRole = await Role.create({
        organizationId: organization._id,
        name: 'Organization Owner',
        description: 'Full administrative control over this company workspace',
        permissions: DEFAULT_ROLE_PERMISSIONS['Organization Owner'],
        dataScope: 'organization',
        isSystemRole: true
      });
    }

    // 3. Create Owner User
    const user = await User.create({
      organizationId: organization._id,
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: ownerRole._id,
      department: 'Management'
    });

    // Generate Tokens
    const tokenPayload = {
      userId: user._id,
      organizationId: organization._id,
      roleName: ownerRole.name
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log audit
    await logAudit({
      organizationId: organization._id,
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'ORGANIZATION_REGISTERED',
      entity: 'Organization',
      entityId: organization._id,
      details: { companyName, slug, ownerEmail: email },
      req
    });

    return ApiResponse.created(res, 'Organization workspace created successfully', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: {
          id: ownerRole._id,
          name: ownerRole.name,
          dataScope: ownerRole.dataScope,
          permissions: ownerRole.permissions
        }
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        industry: organization.industry,
        currency: organization.currency,
        dateFormat: organization.dateFormat,
        subscription: organization.subscription
      },
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user and issue tokens
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user with password selected
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('role')
      .populate('organizationId');

    if (!user) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 'Your user account has been disabled. Please contact your admin.', 403);
    }

    if (user.organizationId && !user.organizationId.isActive) {
      return ApiResponse.error(res, 'Your company workspace has been deactivated.', 403);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const organization = user.organizationId;
    const role = user.role;

    const tokenPayload = {
      userId: user._id,
      organizationId: organization ? organization._id : null,
      roleName: role ? role.name : 'Viewer'
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Log audit
    if (organization) {
      await logAudit({
        organizationId: organization._id,
        userId: user._id,
        userName: user.fullName,
        userEmail: user.email,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user._id,
        details: { email },
        req
      });
    }

    return ApiResponse.success(res, 'Logged in successfully', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        avatar: user.avatar,
        role: role
          ? {
              id: role._id,
              name: role.name,
              dataScope: role.dataScope,
              permissions: role.permissions
            }
          : null
      },
      organization: organization
        ? {
            id: organization._id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo,
            industry: organization.industry,
            currency: organization.currency,
            dateFormat: organization.dateFormat,
            subscription: organization.subscription
          }
        : null,
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return ApiResponse.error(res, 'Refresh token required', 401);
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return ApiResponse.error(res, 'Invalid or expired refresh token. Please login again.', 401);
    }

    const user = await User.findById(decoded.userId)
      .populate('role')
      .populate('organizationId');

    if (!user || !user.isActive) {
      return ApiResponse.error(res, 'User inactive or no longer exists.', 401);
    }

    const tokenPayload = {
      userId: user._id,
      organizationId: user.organizationId ? user.organizationId._id : null,
      roleName: user.role ? user.role.name : 'Viewer'
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    return ApiResponse.success(res, 'Token refreshed successfully', {
      accessToken: newAccessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile & tenant info
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const organization = req.organization;
    const role = req.role;

    return ApiResponse.success(res, 'User profile fetched', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        role: role
          ? {
              id: role._id,
              name: role.name,
              dataScope: role.dataScope,
              permissions: role.permissions
            }
          : null
      },
      organization: organization
        ? {
            id: organization._id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo,
            industry: organization.industry,
            currency: organization.currency,
            dateFormat: organization.dateFormat,
            timezone: organization.timezone,
            branding: organization.branding,
            subscription: organization.subscription
          }
        : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    if (req.user && req.organizationId) {
      await logAudit({
        organizationId: req.organizationId,
        userId: req.user._id,
        userName: req.user.fullName,
        userEmail: req.user.email,
        action: 'USER_LOGOUT',
        entity: 'User',
        entityId: req.user._id,
        req
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return ApiResponse.success(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - generate reset token
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return ApiResponse.error(res, 'Please provide an email address', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return success to avoid email enumeration
      return ApiResponse.success(
        res,
        'If an account exists with that email, a password reset link has been generated.'
      );
    }

    // Generate random crypto reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to passwordResetToken field
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    await logAudit({
      organizationId: user.organizationId,
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: user._id,
      details: { email: user.email },
      req
    });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Send password reset email
    let emailResult = null;
    try {
      emailResult = await emailService.sendPasswordResetEmail(user.email, resetUrl, user.firstName);
    } catch (mailErr) {
      console.warn('⚠️ Could not send password reset email:', mailErr.message);
    }

    return ApiResponse.success(res, 'Password reset instructions generated and sent via email', {
      resetToken,
      resetUrl,
      emailPreview: emailResult?.previewUrl || null,
      expiresIn: '15 minutes'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using token
 * POST /api/v1/auth/reset-password/:token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return ApiResponse.error(res, 'Password must be at least 6 characters', 400);
    }

    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).populate('role').populate('organizationId');

    if (!user) {
      return ApiResponse.error(res, 'Invalid or expired password reset token', 400);
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await logAudit({
      organizationId: user.organizationId?._id,
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user._id,
      req
    });

    // Auto-login after password reset
    const tokenPayload = {
      userId: user._id,
      organizationId: user.organizationId ? user.organizationId._id : null,
      roleName: user.role ? user.role.name : 'Viewer'
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return ApiResponse.success(res, 'Password reset successful. You are now logged in.', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      organization: user.organizationId,
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/v1/auth/update-profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;
    const user = await User.findById(req.user._id).populate('role').populate('organizationId');

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'PROFILE_UPDATED',
      entity: 'User',
      entityId: user._id,
      details: { firstName, lastName, phone },
      req
    });

    return ApiResponse.success(res, 'Profile updated successfully', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role
      },
      organization: user.organizationId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 'Please provide both current and new password', 400);
    }

    if (newPassword.length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return ApiResponse.error(res, 'Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: user._id,
      userName: req.user.fullName,
      userEmail: req.user.email,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user._id,
      req
    });

    return ApiResponse.success(res, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword
};
