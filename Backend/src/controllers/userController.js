const { z } = require('zod');
const User = require('../models/User');
const Role = require('../models/Role');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');
const emailService = require('../services/emailService');

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  roleId: z.string().min(1, 'Role ID is required'),
  department: z.string().default('Sales'),
  reportingManager: z.string().optional(),
  sendWelcomeEmail: z.boolean().optional()
});

/**
 * Get all users in the current organization
 * GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { department, role, search, status } = req.query;

    const filter = { organizationId: req.organizationId };

    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .populate('role', 'name description dataScope permissions')
      .populate('reportingManager', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Users fetched successfully', users);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user / employee in the organization
 * POST /api/v1/users
 */
const createUser = async (req, res, next) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const { firstName, lastName, email, password, phone, roleId, department, reportingManager } = validatedData;

    // Check organization limit
    const org = req.organization;
    const currentUsersCount = await User.countDocuments({ organizationId: req.organizationId });
    if (org && org.subscription && currentUsersCount >= org.subscription.maxUsers) {
      return ApiResponse.error(
        res,
        `User limit reached (${org.subscription.maxUsers} users). Upgrade your subscription to add more users.`,
        400
      );
    }

    // Check duplicate email in this organization
    const existing = await User.findOne({
      organizationId: req.organizationId,
      email: email.toLowerCase()
    });

    if (existing) {
      return ApiResponse.error(res, 'A user with this email already exists in your company.', 400);
    }

    // Validate role
    const role = await Role.findById(roleId);
    if (!role) {
      return ApiResponse.error(res, 'Invalid role selected.', 400);
    }

    const user = await User.create({
      organizationId: req.organizationId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: role._id,
      department: department || 'Sales',
      reportingManager: reportingManager || null
    });

    const populatedUser = await User.findById(user._id)
      .populate('role', 'name description dataScope')
      .populate('reportingManager', 'firstName lastName email');

    await logAudit({
      organizationId: req.organizationId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user._id,
      details: { email, role: role.name, department },
      req
    });

    if (validatedData.sendWelcomeEmail) {
      emailService
        .sendWelcomeEmail(email, firstName, req.organization?.name || 'NexCRM')
        .catch((err) => console.warn('⚠️ Could not send welcome email:', err.message));
    }

    return ApiResponse.created(res, 'User created successfully', populatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user details
 * PUT /api/v1/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, roleId, department, reportingManager } = req.body;

    const user = await User.findOne({ _id: id, organizationId: req.organizationId });
    if (!user) {
      return ApiResponse.error(res, 'User not found in your organization.', 404);
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (roleId) user.role = roleId;
    if (department) user.department = department;
    if (reportingManager !== undefined) user.reportingManager = reportingManager || null;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('role', 'name description dataScope')
      .populate('reportingManager', 'firstName lastName email');

    await logAudit({
      organizationId: req.organizationId,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user._id,
      details: { updatedFields: req.body },
      req
    });

    return ApiResponse.success(res, 'User updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active/inactive status
 * PATCH /api/v1/users/:id/status
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, organizationId: req.organizationId });
    if (!user) {
      return ApiResponse.error(res, 'User not found in your organization.', 404);
    }

    // Protect against self-deactivation
    if (user._id.toString() === req.user._id.toString()) {
      return ApiResponse.error(res, 'You cannot deactivate your own account.', 400);
    }

    user.isActive = !user.isActive;
    await user.save();

    await logAudit({
      organizationId: req.organizationId,
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: user._id,
      details: { email: user.email, isActive: user.isActive },
      req
    });

    return ApiResponse.success(res, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, {
      id: user._id,
      isActive: user.isActive
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, organizationId: req.organizationId })
      .populate('role', 'name description dataScope permissions')
      .populate('reportingManager', 'firstName lastName email phone');

    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    return ApiResponse.success(res, 'User details fetched', user);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user activity timeline
 * GET /api/v1/users/:id/activity
 */
const getUserActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const AuditLog = require('../models/AuditLog');

    const activities = await AuditLog.find({
      organizationId: req.organizationId,
      userId: id
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return ApiResponse.success(res, 'User activity timeline fetched', activities);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin direct password reset for employee
 * POST /api/v1/users/:id/reset-password
 */
const adminResetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters', 400);
    }

    const user = await User.findOne({ _id: id, organizationId: req.organizationId });
    if (!user) {
      return ApiResponse.error(res, 'User not found in your company', 404);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'ADMIN_RESET_USER_PASSWORD',
      entity: 'User',
      entityId: user._id,
      details: { targetUserEmail: user.email },
      req
    });

    return ApiResponse.success(res, `Password for ${user.fullName} (${user.email}) has been reset successfully.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getUserById,
  getUserActivity,
  adminResetPassword
};
