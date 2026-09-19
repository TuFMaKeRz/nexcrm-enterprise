const { z } = require('zod');
const Department = require('../models/Department');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

const departmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional(),
  head: z.string().nullable().optional(),
  color: z.string().optional()
});

/**
 * Get all departments in the current organization with member counts
 * GET /api/v1/departments
 */
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ organizationId: req.organizationId })
      .populate('head', 'firstName lastName email phone')
      .sort({ name: 1 });

    // Count members in each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const memberCount = await User.countDocuments({
          organizationId: req.organizationId,
          department: dept.name
        });
        return {
          ...dept.toObject(),
          memberCount
        };
      })
    );

    return ApiResponse.success(res, 'Departments fetched successfully', departmentsWithCounts);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new department
 * POST /api/v1/departments
 */
const createDepartment = async (req, res, next) => {
  try {
    const validatedData = departmentSchema.parse(req.body);
    const { name, description, head, color } = validatedData;

    const existing = await Department.findOne({
      organizationId: req.organizationId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return ApiResponse.error(res, `Department '${name}' already exists in your company.`, 400);
    }

    const dept = await Department.create({
      organizationId: req.organizationId,
      name,
      description: description || '',
      head: head || null,
      color: color || '#6366f1'
    });

    const populatedDept = await Department.findById(dept._id).populate('head', 'firstName lastName email');

    await logAudit({
      organizationId: req.organizationId,
      action: 'DEPARTMENT_CREATED',
      entity: 'Department',
      entityId: dept._id,
      details: { name },
      req
    });

    return ApiResponse.created(res, 'Department created successfully', {
      ...populatedDept.toObject(),
      memberCount: 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update department details or head
 * PUT /api/v1/departments/:id
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, head, color, isActive } = req.body;

    const dept = await Department.findOne({ _id: id, organizationId: req.organizationId });
    if (!dept) {
      return ApiResponse.error(res, 'Department not found', 404);
    }

    const oldName = dept.name;

    if (name) dept.name = name;
    if (description !== undefined) dept.description = description;
    if (head !== undefined) dept.head = head || null;
    if (color) dept.color = color;
    if (isActive !== undefined) dept.isActive = isActive;

    await dept.save();

    // If department name changed, update all users with old department name
    if (name && name !== oldName) {
      await User.updateMany(
        { organizationId: req.organizationId, department: oldName },
        { department: name }
      );
    }

    const populatedDept = await Department.findById(dept._id).populate('head', 'firstName lastName email');
    const memberCount = await User.countDocuments({
      organizationId: req.organizationId,
      department: dept.name
    });

    await logAudit({
      organizationId: req.organizationId,
      action: 'DEPARTMENT_UPDATED',
      entity: 'Department',
      entityId: dept._id,
      details: { name: dept.name },
      req
    });

    return ApiResponse.success(res, 'Department updated successfully', {
      ...populatedDept.toObject(),
      memberCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete department
 * DELETE /api/v1/departments/:id
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dept = await Department.findOne({ _id: id, organizationId: req.organizationId });
    if (!dept) {
      return ApiResponse.error(res, 'Department not found', 404);
    }

    // Check if department has active members
    const memberCount = await User.countDocuments({
      organizationId: req.organizationId,
      department: dept.name
    });

    if (memberCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot delete department '${dept.name}'. It currently has ${memberCount} assigned employee(s). Please reassign them first.`,
        400
      );
    }

    await Department.findByIdAndDelete(id);

    await logAudit({
      organizationId: req.organizationId,
      action: 'DEPARTMENT_DELETED',
      entity: 'Department',
      entityId: id,
      details: { name: dept.name },
      req
    });

    return ApiResponse.success(res, 'Department deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
