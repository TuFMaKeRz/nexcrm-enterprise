const { z } = require('zod');
const Activity = require('../models/Activity');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

// ── Validation Schema ──────────────────────────────────────────
const createActivitySchema = z.object({
  type: z.enum(['Call', 'Meeting', 'Demo', 'Site Visit', 'WhatsApp', 'Email', 'Other']),
  title: z.string().min(1, 'Activity title is required').trim(),
  description: z.string().optional().default(''),
  outcome: z.enum([
    'Connected - Positive',
    'Connected - Neutral',
    'Connected - Negative',
    'Voicemail / No Answer',
    'Demo Completed',
    'Follow-up Required',
    'Proposal Requested',
    'Deal Signed',
    'Lost Interest',
    'Other'
  ]).default('Connected - Positive'),
  activityDate: z.string(),
  duration: z.number().min(1).default(15),
  location: z.string().optional().default(''),
  assignedTo: z.string().optional().nullable(),
  relatedTo: z.object({
    model: z.enum(['Lead', 'Customer', 'Deal', 'General']).default('General'),
    id: z.string().optional().nullable()
  }).optional().default({ model: 'General', id: null }),
  contactId: z.string().optional().nullable(),
  // Option to auto-create a follow-up task
  createFollowUpTask: z.boolean().optional().default(false),
  followUpDueDate: z.string().optional().nullable()
});

// Helper to enrich related entities
const enrichActivityRelatedEntities = async (activities, organizationId) => {
  const leadIds = [];
  const customerIds = [];
  const dealIds = [];

  activities.forEach((a) => {
    if (a.relatedTo?.id) {
      if (a.relatedTo.model === 'Lead') leadIds.push(a.relatedTo.id);
      else if (a.relatedTo.model === 'Customer') customerIds.push(a.relatedTo.id);
      else if (a.relatedTo.model === 'Deal') dealIds.push(a.relatedTo.id);
    }
  });

  const [leads, customers, deals] = await Promise.all([
    leadIds.length > 0 ? Lead.find({ _id: { $in: leadIds }, organizationId }).select('firstName lastName company') : [],
    customerIds.length > 0 ? Customer.find({ _id: { $in: customerIds }, organizationId }).select('companyName') : [],
    dealIds.length > 0 ? Deal.find({ _id: { $in: dealIds }, organizationId }).select('title value') : []
  ]);

  const leadMap = {};
  leads.forEach((l) => { leadMap[l._id.toString()] = `${l.firstName} ${l.lastName || ''} (${l.company || 'Lead'})`.trim(); });

  const customerMap = {};
  customers.forEach((c) => { customerMap[c._id.toString()] = c.companyName; });

  const dealMap = {};
  deals.forEach((d) => { dealMap[d._id.toString()] = d.title; });

  return activities.map((a) => {
    const doc = a.toObject ? a.toObject() : a;
    let relatedName = null;
    if (doc.relatedTo?.id) {
      const idStr = doc.relatedTo.id.toString();
      if (doc.relatedTo.model === 'Lead') relatedName = leadMap[idStr];
      else if (doc.relatedTo.model === 'Customer') relatedName = customerMap[idStr];
      else if (doc.relatedTo.model === 'Deal') relatedName = dealMap[idStr];
    }
    return { ...doc, relatedName };
  });
};

// ============================================================
// GET ACTIVITIES
// GET /api/v1/activities
// ============================================================
const getActivities = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const {
      type, outcome, assignedTo, relatedModel,
      relatedId, search, page, limit
    } = req.query;

    const filter = { organizationId: orgId };

    if (type && type !== 'all') filter.type = type;
    if (outcome && outcome !== 'all') filter.outcome = outcome;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (relatedModel && relatedModel !== 'all') filter['relatedTo.model'] = relatedModel;
    if (relatedId) filter['relatedTo.id'] = relatedId;

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const query = Activity.find(filter)
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email')
      .populate('contactId', 'firstName lastName email phone designation')
      .sort({ activityDate: -1 });

    if (page && limit) {
      const skip = (Number(page) - 1) * Number(limit);
      const [activities, total] = await Promise.all([
        query.skip(skip).limit(Number(limit)),
        Activity.countDocuments(filter)
      ]);

      const enriched = await enrichActivityRelatedEntities(activities, orgId);

      return ApiResponse.success(res, 'Activities fetched', {
        activities: enriched,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    }

    const activities = await query;
    const enriched = await enrichActivityRelatedEntities(activities, orgId);

    return ApiResponse.success(res, 'Activities fetched', { activities: enriched });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ACTIVITY STATS
// GET /api/v1/activities/stats
// ============================================================
const getActivityStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;

    const [total, calls, meetings, demos, siteVisits, whatsapp] = await Promise.all([
      Activity.countDocuments({ organizationId: orgId }),
      Activity.countDocuments({ organizationId: orgId, type: 'Call' }),
      Activity.countDocuments({ organizationId: orgId, type: 'Meeting' }),
      Activity.countDocuments({ organizationId: orgId, type: 'Demo' }),
      Activity.countDocuments({ organizationId: orgId, type: 'Site Visit' }),
      Activity.countDocuments({ organizationId: orgId, type: 'WhatsApp' })
    ]);

    return ApiResponse.success(res, 'Activity stats fetched', {
      total,
      calls,
      meetings,
      demos,
      siteVisits,
      whatsapp
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE ACTIVITY
// POST /api/v1/activities
// ============================================================
const createActivity = async (req, res, next) => {
  try {
    const data = createActivitySchema.parse(req.body);
    const orgId = req.organizationId;

    const activity = await Activity.create({
      organizationId: orgId,
      type: data.type,
      title: data.title,
      description: data.description,
      outcome: data.outcome,
      activityDate: new Date(data.activityDate),
      duration: data.duration,
      location: data.location,
      assignedTo: data.assignedTo || req.user._id,
      createdBy: req.user._id,
      relatedTo: {
        model: data.relatedTo?.model || 'General',
        id: data.relatedTo?.id || null
      },
      contactId: data.contactId || null
    });

    // Auto-create follow-up task if requested
    let followUpTask = null;
    if (data.createFollowUpTask && data.followUpDueDate) {
      followUpTask = await Task.create({
        organizationId: orgId,
        title: `Follow up: ${activity.title}`,
        description: `Automated follow-up task created from activity log (${activity.type} - Outcome: ${activity.outcome})`,
        priority: 'High',
        status: 'To Do',
        dueDate: new Date(data.followUpDueDate),
        assignedTo: activity.assignedTo,
        createdBy: req.user._id,
        relatedTo: activity.relatedTo
      });
    }

    await logAudit({
      organizationId: orgId,
      action: 'ACTIVITY_LOGGED',
      entity: 'Activity',
      entityId: activity._id,
      details: { title: activity.title, type: activity.type, outcome: activity.outcome },
      req
    });

    const populated = await Activity.findById(activity._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('contactId', 'firstName lastName email phone');

    return ApiResponse.created(res, 'Activity logged successfully', {
      activity: populated,
      followUpTask
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE ACTIVITY
// PUT /api/v1/activities/:id
// ============================================================
const updateActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findOne({ _id: id, organizationId: req.organizationId });

    if (!activity) {
      return ApiResponse.error(res, 'Activity not found', 404);
    }

    const allowedFields = [
      'type', 'title', 'description', 'outcome',
      'activityDate', 'duration', 'location', 'assignedTo',
      'relatedTo', 'contactId', 'isCompleted'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'activityDate') {
          activity.activityDate = new Date(req.body.activityDate);
        } else {
          activity[field] = req.body[field];
        }
      }
    }

    await activity.save();

    const populated = await Activity.findById(activity._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    return ApiResponse.success(res, 'Activity updated successfully', populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE ACTIVITY
// DELETE /api/v1/activities/:id
// ============================================================
const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Activity.findOneAndDelete({ _id: id, organizationId: req.organizationId });
    return ApiResponse.success(res, 'Activity deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivities,
  getActivityStats,
  createActivity,
  updateActivity,
  deleteActivity
};
