const Role = require('../models/Role');
const ApiResponse = require('../utils/apiResponse');
const { ALL_PERMISSIONS, PERMISSIONS } = require('../utils/permissions');
const { logAudit } = require('../middlewares/auditLogger');
const { z } = require('zod');

const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission must be assigned'),
  dataScope: z.enum(['own', 'team', 'department', 'organization']).default('own')
});

/**
 * Get all available roles (System roles + Organization custom roles)
 * GET /api/v1/roles
 */
const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({
      $or: [
        { organizationId: null }, // System roles
        { organizationId: req.organizationId } // Tenant custom roles
      ]
    }).sort({ isSystemRole: -1, name: 1 });

    return ApiResponse.success(res, 'Roles fetched successfully', roles);
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of all permissions available in the system
 * GET /api/v1/roles/permissions
 */
const getPermissionsList = async (req, res, next) => {
  try {
    return ApiResponse.success(res, 'Permissions list fetched', {
      allPermissions: ALL_PERMISSIONS,
      permissionKeys: PERMISSIONS
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new custom role for this organization
 * POST /api/v1/roles
 */
const createCustomRole = async (req, res, next) => {
  try {
    const validatedData = createRoleSchema.parse(req.body);
    const { name, description, permissions, dataScope } = validatedData;

    // Check duplicate role name in tenant
    const existingRole = await Role.findOne({
      organizationId: req.organizationId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingRole) {
      return ApiResponse.error(res, `A role named '${name}' already exists in your organization.`, 400);
    }

    const role = await Role.create({
      organizationId: req.organizationId,
      name,
      description: description || '',
      permissions,
      dataScope: dataScope || 'own',
      isSystemRole: false
    });

    await logAudit({
      organizationId: req.organizationId,
      action: 'ROLE_CREATED',
      entity: 'Role',
      entityId: role._id,
      details: { name, permissionsCount: permissions.length },
      req
    });

    return ApiResponse.created(res, 'Role created successfully', role);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a custom role
 * PUT /api/v1/roles/:id
 */
const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, dataScope } = req.body;

    const role = await Role.findOne({ _id: id, organizationId: req.organizationId });
    if (!role) {
      return ApiResponse.error(res, 'Role not found or system roles cannot be modified directly.', 404);
    }

    if (role.isSystemRole) {
      return ApiResponse.error(res, 'System template roles cannot be modified.', 403);
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions && Array.isArray(permissions)) role.permissions = permissions;
    if (dataScope) role.dataScope = dataScope;

    await role.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'ROLE_UPDATED',
      entity: 'Role',
      entityId: role._id,
      details: { name: role.name, permissionsCount: role.permissions.length },
      req
    });

    return ApiResponse.success(res, 'Role updated successfully', role);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a custom role
 * DELETE /api/v1/roles/:id
 */
const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const User = require('../models/User');

    const role = await Role.findOne({ _id: id, organizationId: req.organizationId });
    if (!role) {
      return ApiResponse.error(res, 'Custom role not found', 404);
    }

    if (role.isSystemRole) {
      return ApiResponse.error(res, 'System roles cannot be deleted', 403);
    }

    // Check if any user is currently assigned this role
    const assignedUsers = await User.countDocuments({
      organizationId: req.organizationId,
      role: id
    });

    if (assignedUsers > 0) {
      return ApiResponse.error(
        res,
        `Cannot delete role. It is currently assigned to ${assignedUsers} user(s). Reassign them first.`,
        400
      );
    }

    await Role.findByIdAndDelete(id);

    await logAudit({
      organizationId: req.organizationId,
      action: 'ROLE_DELETED',
      entity: 'Role',
      entityId: id,
      details: { roleName: role.name },
      req
    });

    return ApiResponse.success(res, 'Role deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoles,
  getPermissionsList,
  createCustomRole,
  updateRole,
  deleteRole
};
