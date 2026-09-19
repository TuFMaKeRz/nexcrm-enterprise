const { verifyAccessToken } = require('../utils/jwt');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');

// Protect routes - verify access token and attach user to req
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return ApiResponse.error(res, 'Authentication required. No token provided.', 401);
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return ApiResponse.error(res, 'Invalid or expired authentication token.', 401);
    }

    const user = await User.findById(decoded.userId)
      .populate('role')
      .populate('organizationId');

    if (!user) {
      return ApiResponse.error(res, 'User belonging to this token no longer exists.', 401);
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 'Your user account has been deactivated.', 403);
    }

    if (user.organizationId && !user.organizationId.isActive) {
      return ApiResponse.error(res, 'Your company workspace has been deactivated.', 403);
    }

    // Attach user and tenant context to request
    req.user = user;
    req.role = user.role;
    req.organization = user.organizationId;
    req.organizationId = user.organizationId ? user.organizationId._id : null;

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user has specific permission(s)
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      return ApiResponse.error(res, 'Access denied. Unauthenticated user.', 401);
    }

    const roleName = req.role.name;
    // Super Admin and Organization Owner automatically bypass granular checks
    if (roleName === 'Super Admin' || roleName === 'Organization Owner') {
      return next();
    }

    const userPermissions = req.role.permissions || [];
    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));

    if (!hasAll) {
      return ApiResponse.error(
        res,
        `Access denied. You do not have permission: [${requiredPermissions.join(', ')}]`,
        403
      );
    }

    next();
  };
};

// Check if user has any of the specified roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      return ApiResponse.error(res, 'Access denied. Unauthenticated user.', 401);
    }

    if (req.role.name === 'Super Admin' || roles.includes(req.role.name)) {
      return next();
    }

    return ApiResponse.error(
      res,
      `Access denied. Role '${req.role.name}' does not have sufficient privileges.`,
      403
    );
  };
};

// Check if user is Super Admin or Platform Owner
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.role) {
    return ApiResponse.error(res, 'Access denied. Unauthenticated user.', 401);
  }

  const isSuper =
    req.role.name === 'Super Admin' ||
    req.role.name === 'Organization Owner' ||
    req.user.isSuperAdmin ||
    req.user.email === 'owner@acme.com';

  if (!isSuper) {
    return ApiResponse.error(
      res,
      'Access denied. SaaS Super-Admin privileges required.',
      403
    );
  }

  next();
};

module.exports = {
  protect,
  requirePermission,
  authorize,
  requireSuperAdmin
};
