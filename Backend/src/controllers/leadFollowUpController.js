const LeadFollowUp = require('../models/LeadFollowUp');
const Lead = require('../models/Lead');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/leads/:id/followups
 */
const getFollowUps = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // 'pending' | 'completed' | undefined

    const filter = { leadId: id, organizationId: req.organizationId };
    if (status === 'pending')   filter.isCompleted = false;
    if (status === 'completed') filter.isCompleted = true;

    const followUps = await LeadFollowUp.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ scheduledAt: 1 });

    return ApiResponse.success(res, 'Follow-ups fetched', followUps);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/leads/:id/followups
 */
const createFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, subject, scheduledAt, notes } = req.body;

    if (!type || !scheduledAt) {
      return ApiResponse.error(res, 'Follow-up type and scheduled date/time are required', 400);
    }

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    const followUp = await LeadFollowUp.create({
      leadId:         id,
      organizationId: req.organizationId,
      type,
      subject:        subject || '',
      scheduledAt:    new Date(scheduledAt),
      notes:          notes || '',
      createdBy:      req.user._id
    });

    // Update lead lastActivityAt
    await Lead.findByIdAndUpdate(id, { lastActivityAt: new Date() });

    const populated = await LeadFollowUp.findById(followUp._id)
      .populate('createdBy', 'firstName lastName');

    return ApiResponse.created(res, 'Follow-up scheduled successfully', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/leads/:id/followups/:fid — mark complete
 */
const completeFollowUp = async (req, res, next) => {
  try {
    const { id, fid } = req.params;
    const { outcome, notes } = req.body;

    const followUp = await LeadFollowUp.findOne({
      _id: fid,
      leadId: id,
      organizationId: req.organizationId
    });

    if (!followUp) {
      return ApiResponse.error(res, 'Follow-up not found', 404);
    }

    followUp.isCompleted = true;
    followUp.completedAt = new Date();
    if (outcome) followUp.outcome = outcome;
    if (notes)   followUp.notes = notes;

    await followUp.save();
    await Lead.findByIdAndUpdate(id, { lastActivityAt: new Date() });

    return ApiResponse.success(res, 'Follow-up marked as completed', followUp);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/leads/:id/followups/:fid
 */
const deleteFollowUp = async (req, res, next) => {
  try {
    const { id, fid } = req.params;

    const followUp = await LeadFollowUp.findOne({
      _id: fid,
      leadId: id,
      organizationId: req.organizationId
    });

    if (!followUp) {
      return ApiResponse.error(res, 'Follow-up not found', 404);
    }

    await LeadFollowUp.findByIdAndDelete(fid);
    return ApiResponse.success(res, 'Follow-up deleted');
  } catch (error) {
    next(error);
  }
};

// Get overdue & upcoming follow-ups across all leads
/**
 * GET /api/v1/leads/followups/overview
 */
const getFollowUpOverview = async (req, res, next) => {
  try {
    const now = new Date();

    const [overdue, upcoming] = await Promise.all([
      LeadFollowUp.find({
        organizationId: req.organizationId,
        isCompleted: false,
        scheduledAt: { $lt: now }
      })
        .populate('leadId', 'firstName lastName company')
        .populate('createdBy', 'firstName lastName')
        .sort({ scheduledAt: 1 })
        .limit(20),
      LeadFollowUp.find({
        organizationId: req.organizationId,
        isCompleted: false,
        scheduledAt: { $gte: now }
      })
        .populate('leadId', 'firstName lastName company')
        .populate('createdBy', 'firstName lastName')
        .sort({ scheduledAt: 1 })
        .limit(20)
    ]);

    return ApiResponse.success(res, 'Follow-up overview fetched', { overdue, upcoming });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFollowUps, createFollowUp, completeFollowUp, deleteFollowUp, getFollowUpOverview };
