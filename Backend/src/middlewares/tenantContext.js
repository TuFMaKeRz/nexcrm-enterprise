const ApiResponse = require('../utils/apiResponse');

// Ensure that an organization context exists
const requireTenant = (req, res, next) => {
  if (!req.organizationId) {
    return ApiResponse.error(
      res,
      'Tenant isolation error: No active organization context found for this request.',
      400
    );
  }
  next();
};

/**
 * Builds a query filter scoped to the user's role and data access level.
 * @param {Object} req - Express request object containing req.user, req.role, req.organizationId
 * @param {String} ownerField - The field name storing the assigned user ID (e.g. 'assignedTo' or 'createdBy')
 * @returns {Object} MongoDB query filter including organizationId and data scope
 */
const buildTenantScopeFilter = (req, ownerField = 'assignedTo') => {
  const baseFilter = { organizationId: req.organizationId };

  if (!req.role) return baseFilter;

  const dataScope = req.role.dataScope || 'own';
  const roleName = req.role.name;

  // Super Admin & Org Owner see everything in the tenant
  if (roleName === 'Super Admin' || roleName === 'Organization Owner' || roleName === 'Admin') {
    return baseFilter;
  }

  if (dataScope === 'organization') {
    return baseFilter;
  }

  if (dataScope === 'department') {
    // If user belongs to a department, filter by records in that department
    return {
      ...baseFilter,
      $or: [
        { department: req.user.department },
        { [ownerField]: req.user._id }
      ]
    };
  }

  if (dataScope === 'team') {
    // Manager can view records assigned to themselves or their reportees
    return {
      ...baseFilter,
      $or: [
        { [ownerField]: req.user._id }
        // Note: For full team query, subagent/controller can expand with reportee IDs
      ]
    };
  }

  // Default: 'own' - only records assigned to or created by current user
  return {
    ...baseFilter,
    $or: [
      { [ownerField]: req.user._id },
      { createdBy: req.user._id }
    ]
  };
};

module.exports = {
  requireTenant,
  buildTenantScopeFilter
};
