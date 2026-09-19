const LeadSource = require('../models/LeadSource');
const Lead = require('../models/Lead');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/lead-sources
 */
const getLeadSources = async (req, res, next) => {
  try {
    const sources = await LeadSource.find({
      organizationId: req.organizationId,
      isActive: true
    }).sort({ isDefault: -1, name: 1 });

    return ApiResponse.success(res, 'Lead sources fetched', sources);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/lead-sources
 */
const createLeadSource = async (req, res, next) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Source name is required', 400);
    }

    const existing = await LeadSource.findOne({
      organizationId: req.organizationId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existing) {
      return ApiResponse.error(res, `Source '${name}' already exists.`, 400);
    }

    const source = await LeadSource.create({
      organizationId: req.organizationId,
      name: name.trim(),
      color: color || '#6366f1',
      isDefault: false
    });

    return ApiResponse.created(res, 'Lead source created', source);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/lead-sources/:id
 */
const updateLeadSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color, isActive } = req.body;

    const source = await LeadSource.findOne({ _id: id, organizationId: req.organizationId });
    if (!source) {
      return ApiResponse.error(res, 'Lead source not found', 404);
    }

    if (name)             source.name = name.trim();
    if (color)            source.color = color;
    if (isActive !== undefined) source.isActive = isActive;

    await source.save();
    return ApiResponse.success(res, 'Lead source updated', source);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/lead-sources/:id
 */
const deleteLeadSource = async (req, res, next) => {
  try {
    const { id } = req.params;

    const source = await LeadSource.findOne({ _id: id, organizationId: req.organizationId });
    if (!source) {
      return ApiResponse.error(res, 'Lead source not found', 404);
    }

    const linkedLeads = await Lead.countDocuments({ organizationId: req.organizationId, source: id });
    if (linkedLeads > 0) {
      return ApiResponse.error(
        res,
        `Cannot delete '${source.name}'. It is linked to ${linkedLeads} lead(s).`,
        400
      );
    }

    await LeadSource.findByIdAndDelete(id);
    return ApiResponse.success(res, 'Lead source deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeadSources, createLeadSource, updateLeadSource, deleteLeadSource };
