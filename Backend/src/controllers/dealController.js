const { z } = require('zod');
const Deal = require('../models/Deal');
const Pipeline = require('../models/Pipeline');
const Customer = require('../models/Customer');
const Contact = require('../models/Contact');
const User = require('../models/User');
const DealNote = require('../models/DealNote');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');
const { seedDefaultPipeline } = require('./pipelineController');
const { triggerWorkflowEngine } = require('../services/workflowEngine');

// ── Validation Schema ──────────────────────────────────────────
const createDealSchema = z.object({
  title: z.string().min(1, 'Deal title is required').trim(),
  value: z.number().min(0, 'Deal value cannot be negative'),
  currency: z.string().optional().default('INR'),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  contactId: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  probability: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional().default([]),
  products: z.array(z.object({
    name: z.string(),
    quantity: z.number().default(1),
    unitPrice: z.number().default(0),
    total: z.number().default(0)
  })).optional().default([]),
  winLossReason: z.string().optional().default('')
});

// ============================================================
// GET DEALS (Kanban & List View)
// GET /api/v1/deals
// ============================================================
const getDeals = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    await seedDefaultPipeline(orgId);

    const {
      pipelineId, stageId, assignedTo, customerId,
      status, search, page, limit
    } = req.query;

    const filter = { organizationId: orgId, isArchived: false };

    if (pipelineId) filter.pipelineId = pipelineId;
    if (stageId) filter.stageId = stageId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (customerId) filter.customerId = customerId;
    if (status && status !== 'all') filter.status = status;

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } }
      ];
    }

    const query = Deal.find(filter)
      .populate('customerId', 'companyName industry website')
      .populate('contactId', 'firstName lastName email phone designation')
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('pipelineId', 'name stages')
      .sort({ createdAt: -1 });

    if (page && limit) {
      const skip = (Number(page) - 1) * Number(limit);
      const [deals, total] = await Promise.all([
        query.skip(skip).limit(Number(limit)),
        Deal.countDocuments(filter)
      ]);

      return ApiResponse.success(res, 'Deals fetched', {
        deals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    }

    const deals = await query;
    return ApiResponse.success(res, 'Deals fetched', { deals });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET DEAL STATS & WEIGHTED PIPELINE FORECAST
// GET /api/v1/deals/stats
// ============================================================
const getDealStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { pipelineId } = req.query;

    const matchFilter = { organizationId: orgId, isArchived: false };
    if (pipelineId) matchFilter.pipelineId = pipelineId;

    const allDeals = await Deal.find(matchFilter);

    let totalPipelineValue = 0;
    let weightedPipelineValue = 0;
    let openDealsCount = 0;
    let wonDealsCount = 0;
    let lostDealsCount = 0;
    let wonDealsValue = 0;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let wonThisMonthValue = 0;
    let wonThisMonthCount = 0;

    allDeals.forEach((d) => {
      if (d.status === 'Open') {
        totalPipelineValue += d.value || 0;
        weightedPipelineValue += ((d.value || 0) * (d.probability || 0)) / 100;
        openDealsCount += 1;
      } else if (d.status === 'Won') {
        wonDealsCount += 1;
        wonDealsValue += d.value || 0;
        if (d.actualCloseDate && new Date(d.actualCloseDate) >= startOfMonth) {
          wonThisMonthValue += d.value || 0;
          wonThisMonthCount += 1;
        }
      } else if (d.status === 'Lost') {
        lostDealsCount += 1;
      }
    });

    const closedDeals = wonDealsCount + lostDealsCount;
    const winRate = closedDeals > 0 ? Math.round((wonDealsCount / closedDeals) * 100) : 0;

    return ApiResponse.success(res, 'Deal stats fetched', {
      totalPipelineValue: Math.round(totalPipelineValue),
      weightedPipelineValue: Math.round(weightedPipelineValue),
      openDealsCount,
      wonDealsCount,
      lostDealsCount,
      wonDealsValue: Math.round(wonDealsValue),
      wonThisMonthValue: Math.round(wonThisMonthValue),
      wonThisMonthCount,
      winRate
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET DEAL BY ID
// GET /api/v1/deals/:id
// ============================================================
const getDealById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customerId', 'companyName industry website billingAddress taxId gstin')
      .populate('contactId', 'firstName lastName email phone designation department')
      .populate('assignedTo', 'firstName lastName email avatar phone department')
      .populate('pipelineId', 'name stages');

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', 404);
    }

    const notes = await DealNote.find({ dealId: id, organizationId: req.organizationId })
      .populate('createdBy', 'firstName lastName avatar email')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Deal fetched', {
      deal,
      notes
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE DEAL
// POST /api/v1/deals
// ============================================================
const createDeal = async (req, res, next) => {
  try {
    const data = createDealSchema.parse(req.body);
    const orgId = req.organizationId;

    // Resolve Pipeline
    let pipeline;
    if (data.pipelineId) {
      pipeline = await Pipeline.findOne({ _id: data.pipelineId, organizationId: orgId });
    } else {
      pipeline = await Pipeline.findOne({ organizationId: orgId, isDefault: true }) ||
                 await Pipeline.findOne({ organizationId: orgId, isActive: true });
    }

    if (!pipeline) {
      pipeline = await seedDefaultPipeline(orgId);
    }

    // Resolve Stage
    let targetStage = null;
    if (data.stageId) {
      targetStage = pipeline.stages.find((s) => s._id.toString() === data.stageId.toString());
    }
    if (!targetStage && pipeline.stages.length > 0) {
      targetStage = pipeline.stages[0];
    }

    if (!targetStage) {
      return ApiResponse.error(res, 'Pipeline has no valid stages', 400);
    }

    const probability = data.probability !== undefined ? data.probability : targetStage.probability;
    let status = 'Open';
    let actualCloseDate = null;
    if (targetStage.isWon) {
      status = 'Won';
      actualCloseDate = new Date();
    } else if (targetStage.isLost) {
      status = 'Lost';
      actualCloseDate = new Date();
    }

    const deal = await Deal.create({
      organizationId: orgId,
      title: data.title,
      value: data.value,
      currency: data.currency || 'INR',
      pipelineId: pipeline._id,
      stageId: targetStage._id,
      customerId: data.customerId,
      contactId: data.contactId || null,
      assignedTo: data.assignedTo || req.user._id,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      actualCloseDate,
      probability,
      status,
      winLossReason: data.winLossReason || '',
      products: data.products,
      tags: data.tags
    });

    // Initial system note
    await DealNote.create({
      dealId: deal._id,
      organizationId: orgId,
      content: `Deal created in stage "${targetStage.name}" with value ${deal.currency} ${deal.value.toLocaleString()} by ${req.user.firstName} ${req.user.lastName}.`,
      type: 'system',
      createdBy: req.user._id
    });

    await logAudit({
      organizationId: orgId,
      action: 'DEAL_CREATED',
      entity: 'Deal',
      entityId: deal._id,
      details: { title: deal.title, value: deal.value, stage: targetStage.name },
      req
    });

    const populated = await Deal.findById(deal._id)
      .populate('customerId', 'companyName industry website')
      .populate('contactId', 'firstName lastName email phone designation')
      .populate('assignedTo', 'firstName lastName email')
      .populate('pipelineId', 'name stages');

    // Trigger Automation Workflow Engine
    triggerWorkflowEngine('deal.created', populated, orgId, req.user).catch((err) =>
      console.error('Workflow trigger error on deal.created:', err)
    );

    return ApiResponse.created(res, 'Deal created successfully', populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// MOVE DEAL STAGE (Kanban Drag-and-Drop)
// PATCH /api/v1/deals/:id/stage
// ============================================================
const moveDealStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stageId, winLossReason } = req.body;

    if (!stageId) {
      return ApiResponse.error(res, 'stageId is required', 400);
    }

    const deal = await Deal.findOne({ _id: id, organizationId: req.organizationId });
    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', 404);
    }

    const pipeline = await Pipeline.findById(deal.pipelineId);
    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    const targetStage = pipeline.stages.find((s) => s._id.toString() === stageId.toString());
    if (!targetStage) {
      return ApiResponse.error(res, 'Target stage not found in pipeline', 404);
    }

    const oldStage = pipeline.stages.find((s) => s._id.toString() === deal.stageId.toString());
    const oldStageName = oldStage ? oldStage.name : 'Unknown';

    // Update Stage & Probability
    deal.stageId = targetStage._id;
    deal.probability = targetStage.probability;

    // Handle Win/Loss status
    if (targetStage.isWon) {
      deal.status = 'Won';
      deal.actualCloseDate = new Date();
    } else if (targetStage.isLost) {
      deal.status = 'Lost';
      deal.actualCloseDate = new Date();
    } else {
      deal.status = 'Open';
      deal.actualCloseDate = null;
    }

    if (winLossReason) {
      deal.winLossReason = winLossReason;
    }

    await deal.save();

    // Stage change log
    await DealNote.create({
      dealId: deal._id,
      organizationId: req.organizationId,
      content: `Stage changed from "${oldStageName}" to "${targetStage.name}" (${targetStage.probability}% win probability).${winLossReason ? ` Reason: ${winLossReason}` : ''}`,
      type: 'stage-change',
      metadata: { from: oldStageName, to: targetStage.name, probability: targetStage.probability },
      createdBy: req.user._id
    });

    await logAudit({
      organizationId: req.organizationId,
      action: 'DEAL_STAGE_CHANGED',
      entity: 'Deal',
      entityId: deal._id,
      details: { dealTitle: deal.title, from: oldStageName, to: targetStage.name, status: deal.status },
      req
    });

    const populated = await Deal.findById(deal._id)
      .populate('customerId', 'companyName industry website')
      .populate('contactId', 'firstName lastName email phone designation')
      .populate('assignedTo', 'firstName lastName email')
      .populate('pipelineId', 'name stages');

    // Trigger Automation Workflow Engine (e.g. on Won status -> Auto-Generate Customer)
    triggerWorkflowEngine('deal.stage_changed', populated, req.organizationId, req.user).catch((err) =>
      console.error('Workflow trigger error on deal.stage_changed:', err)
    );

    return ApiResponse.success(res, `Deal moved to "${targetStage.name}"`, populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE DEAL
// PUT /api/v1/deals/:id
// ============================================================
const updateDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({ _id: id, organizationId: req.organizationId });

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', 404);
    }

    const allowedFields = [
      'title', 'value', 'currency', 'customerId', 'contactId',
      'assignedTo', 'expectedCloseDate', 'probability', 'tags',
      'products', 'winLossReason', 'status'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        deal[field] = req.body[field];
      }
    }

    // If stage was updated directly
    if (req.body.stageId && req.body.stageId.toString() !== deal.stageId.toString()) {
      const pipeline = await Pipeline.findById(deal.pipelineId);
      if (pipeline) {
        const stage = pipeline.stages.find((s) => s._id.toString() === req.body.stageId.toString());
        if (stage) {
          deal.stageId = stage._id;
          if (req.body.probability === undefined) deal.probability = stage.probability;
          if (stage.isWon) { deal.status = 'Won'; deal.actualCloseDate = new Date(); }
          else if (stage.isLost) { deal.status = 'Lost'; deal.actualCloseDate = new Date(); }
          else { deal.status = 'Open'; }
        }
      }
    }

    await deal.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'DEAL_UPDATED',
      entity: 'Deal',
      entityId: deal._id,
      details: { title: deal.title },
      req
    });

    const populated = await Deal.findById(deal._id)
      .populate('customerId', 'companyName industry website')
      .populate('contactId', 'firstName lastName email phone designation')
      .populate('assignedTo', 'firstName lastName email')
      .populate('pipelineId', 'name stages');

    return ApiResponse.success(res, 'Deal updated successfully', populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE DEAL
// DELETE /api/v1/deals/:id
// ============================================================
const deleteDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({ _id: id, organizationId: req.organizationId });

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', 404);
    }

    deal.isArchived = true;
    await deal.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'DEAL_ARCHIVED',
      entity: 'Deal',
      entityId: deal._id,
      details: { title: deal.title },
      req
    });

    return ApiResponse.success(res, 'Deal archived successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DEAL NOTES & TIMELINE
// ============================================================
const getDealNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notes = await DealNote.find({ dealId: id, organizationId: req.organizationId })
      .populate('createdBy', 'firstName lastName avatar email')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Deal notes fetched', notes);
  } catch (error) {
    next(error);
  }
};

const addDealNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, type = 'note' } = req.body;

    if (!content || !content.trim()) {
      return ApiResponse.error(res, 'Note content is required', 400);
    }

    const note = await DealNote.create({
      dealId: id,
      organizationId: req.organizationId,
      content: content.trim(),
      type,
      createdBy: req.user._id
    });

    const populated = await DealNote.findById(note._id).populate('createdBy', 'firstName lastName avatar email');
    return ApiResponse.created(res, 'Note added to deal', populated);
  } catch (error) {
    next(error);
  }
};

const deleteDealNote = async (req, res, next) => {
  try {
    const { id, nid } = req.params;
    await DealNote.findOneAndDelete({ _id: nid, dealId: id, organizationId: req.organizationId });
    return ApiResponse.success(res, 'Deal note deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeals,
  getDealStats,
  getDealById,
  createDeal,
  moveDealStage,
  updateDeal,
  deleteDeal,
  getDealNotes,
  addDealNote,
  deleteDealNote
};
