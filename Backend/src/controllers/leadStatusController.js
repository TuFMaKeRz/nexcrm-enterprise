const LeadStatus = require('../models/LeadStatus');
const Lead = require('../models/Lead');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/lead-statuses
 */
const getLeadStatuses = async (req, res, next) => {
  try {
    const statuses = await LeadStatus.find({
      organizationId: req.organizationId,
      isActive: true
    }).sort({ order: 1, createdAt: 1 });

    return ApiResponse.success(res, 'Lead statuses fetched', statuses);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/lead-statuses
 */
const createLeadStatus = async (req, res, next) => {
  try {
    const { name, color, isWon, isLost } = req.body;

    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Status name is required', 400);
    }

    const existing = await LeadStatus.findOne({
      organizationId: req.organizationId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existing) {
      return ApiResponse.error(res, `Status '${name}' already exists.`, 400);
    }

    // Calculate next order
    const lastStatus = await LeadStatus.findOne({ organizationId: req.organizationId }).sort({ order: -1 });
    const nextOrder = lastStatus ? lastStatus.order + 1 : 0;

    const status = await LeadStatus.create({
      organizationId: req.organizationId,
      name: name.trim(),
      color: color || '#6366f1',
      order: nextOrder,
      isWon: isWon || false,
      isLost: isLost || false,
      isDefault: false
    });

    return ApiResponse.created(res, 'Lead status created', status);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/lead-statuses/:id
 */
const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color, order, isWon, isLost, isActive } = req.body;

    const status = await LeadStatus.findOne({ _id: id, organizationId: req.organizationId });
    if (!status) {
      return ApiResponse.error(res, 'Lead status not found', 404);
    }

    if (name !== undefined)     status.name = name.trim();
    if (color !== undefined)    status.color = color;
    if (order !== undefined)    status.order = order;
    if (isWon !== undefined)    status.isWon = isWon;
    if (isLost !== undefined)   status.isLost = isLost;
    if (isActive !== undefined) status.isActive = isActive;

    await status.save();
    return ApiResponse.success(res, 'Lead status updated', status);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/lead-statuses/:id
 */
const deleteLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const status = await LeadStatus.findOne({ _id: id, organizationId: req.organizationId });
    if (!status) {
      return ApiResponse.error(res, 'Lead status not found', 404);
    }

    if (status.isDefault) {
      return ApiResponse.error(res, 'Cannot delete a default pipeline stage.', 400);
    }

    const linkedLeads = await Lead.countDocuments({ organizationId: req.organizationId, status: id });
    if (linkedLeads > 0) {
      return ApiResponse.error(
        res,
        `Cannot delete '${status.name}'. ${linkedLeads} lead(s) are currently in this stage.`,
        400
      );
    }

    await LeadStatus.findByIdAndDelete(id);
    return ApiResponse.success(res, 'Lead status deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeadStatuses, createLeadStatus, updateLeadStatus, deleteLeadStatus };
