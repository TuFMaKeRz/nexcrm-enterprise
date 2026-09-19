const WorkflowRule = require('../models/WorkflowRule');
const WorkflowLog = require('../models/WorkflowLog');
const ApiResponse = require('../utils/apiResponse');
const { evaluateConditions, executeWorkflowAction } = require('../services/workflowEngine');

// ============================================================
// PRE-BUILT WORKFLOW TEMPLATES CATALOG
// ============================================================
const PREBUILT_TEMPLATES = [
  {
    id: 'high-value-lead',
    name: 'High-Value Lead Auto-Assign & Fast Follow-Up',
    description: 'When a new lead value > ₹50,000 is created, assign to Senior Rep, schedule task due in 2h, and send welcome email.',
    trigger: 'lead.created',
    conditionLogic: 'AND',
    conditions: [
      { field: 'expectedValue', operator: 'greater_than', value: 50000 }
    ],
    actions: [
      { actionType: 'create_task', params: { title: 'Urgent: High-Value Lead Qualification', priority: 'Urgent', dueInHours: 2 } },
      { actionType: 'send_notification', params: { title: 'High-Value Lead Alert', message: 'A lead worth over ₹50,000 has been captured.' } }
    ]
  },
  {
    id: 'deal-won-customer-onboarding',
    name: 'Deal Won ➔ Auto-Generate Customer Account',
    description: 'When a deal stage changes to "Won", automatically generate a Customer account and notify Accounts department.',
    trigger: 'deal.stage_changed',
    conditionLogic: 'AND',
    conditions: [
      { field: 'status', operator: 'equals', value: 'Won' }
    ],
    actions: [
      { actionType: 'create_customer', params: {} },
      { actionType: 'send_notification', params: { title: 'Deal Closed Won!', message: 'Customer account created and ready for billing.' } }
    ]
  },
  {
    id: 'hot-lead-escalation',
    name: 'Hot Lead Score Escalation',
    description: 'When a lead temperature reaches "Very Hot" (Score >= 80), create an immediate meeting follow-up task.',
    trigger: 'lead.created',
    conditionLogic: 'OR',
    conditions: [
      { field: 'temperature', operator: 'equals', value: 'Very Hot' },
      { field: 'score', operator: 'greater_than', value: 79 }
    ],
    actions: [
      { actionType: 'create_task', params: { title: 'Schedule Discovery Call with Hot Lead', priority: 'High', dueInHours: 4 } }
    ]
  }
];

// ============================================================
// GET ALL WORKFLOW RULES
// GET /api/v1/workflows
// ============================================================
const getRules = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    let rules = await WorkflowRule.find({ organizationId: orgId, isArchived: false })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // If zero rules exist, auto-seed default prebuilt templates
    if (rules.length === 0) {
      const seeded = await Promise.all(
        PREBUILT_TEMPLATES.map((tmpl) =>
          WorkflowRule.create({
            organizationId: orgId,
            name: tmpl.name,
            description: tmpl.description,
            trigger: tmpl.trigger,
            conditionLogic: tmpl.conditionLogic,
            conditions: tmpl.conditions,
            actions: tmpl.actions,
            isActive: true,
            createdBy: req.user._id
          })
        )
      );
      rules = seeded;
    }

    return ApiResponse.success(res, 'Workflow rules fetched', rules);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE NEW WORKFLOW RULE
// POST /api/v1/workflows
// ============================================================
const createRule = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;
    const { name, description, trigger, conditionLogic, conditions, actions, isActive = true } = req.body;

    if (!name || !trigger || !actions || actions.length === 0) {
      return ApiResponse.error(res, 'Name, trigger, and at least one action are required', 400);
    }

    const rule = await WorkflowRule.create({
      organizationId: orgId,
      name,
      description,
      trigger,
      conditionLogic: conditionLogic || 'AND',
      conditions: conditions || [],
      actions,
      isActive,
      createdBy: userId
    });

    return ApiResponse.success(res, 'Workflow rule created successfully', rule, 201);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE WORKFLOW RULE
// PUT /api/v1/workflows/:id
// ============================================================
const updateRule = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const updated = await WorkflowRule.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: req.body },
      { new: true }
    );

    if (!updated) {
      return ApiResponse.error(res, 'Workflow rule not found', 404);
    }

    return ApiResponse.success(res, 'Workflow rule updated', updated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// TOGGLE ACTIVE STATUS
// PATCH /api/v1/workflows/:id/toggle
// ============================================================
const toggleRuleStatus = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const rule = await WorkflowRule.findOne({ _id: id, organizationId: orgId });
    if (!rule) {
      return ApiResponse.error(res, 'Workflow rule not found', 404);
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    return ApiResponse.success(res, `Workflow rule ${rule.isActive ? 'activated' : 'deactivated'}`, rule);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE WORKFLOW RULE
// DELETE /api/v1/workflows/:id
// ============================================================
const deleteRule = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const deleted = await WorkflowRule.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: { isArchived: true, isActive: false } },
      { new: true }
    );

    if (!deleted) {
      return ApiResponse.error(res, 'Workflow rule not found', 404);
    }

    return ApiResponse.success(res, 'Workflow rule deleted');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET WORKFLOW EXECUTION LOGS
// GET /api/v1/workflows/logs
// ============================================================
const getWorkflowLogs = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { limit = 50, page = 1, status } = req.query;

    const filter = { organizationId: orgId };
    if (status) filter.status = status;

    const logs = await WorkflowLog.find(filter)
      .populate('ruleId', 'name trigger')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));

    const total = await WorkflowLog.countDocuments(filter);

    return ApiResponse.success(res, 'Workflow logs fetched', {
      logs,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET PRE-BUILT TEMPLATES
// GET /api/v1/workflows/templates
// ============================================================
const getTemplates = (req, res) => {
  return ApiResponse.success(res, 'Pre-built templates catalog fetched', PREBUILT_TEMPLATES);
};

// ============================================================
// SIMULATE / DRY RUN A RULE
// POST /api/v1/workflows/test
// ============================================================
const testExecuteRule = async (req, res, next) => {
  try {
    const { rule, sampleData } = req.body;
    if (!rule || !sampleData) {
      return ApiResponse.error(res, 'Rule definition and sample payload required', 400);
    }

    const matches = evaluateConditions(rule, sampleData);
    return ApiResponse.success(res, 'Rule test simulation complete', {
      conditionOutcome: matches ? 'MATCHED' : 'NOT_MATCHED',
      willExecuteActions: matches ? (rule.actions || []).map((a) => a.actionType) : []
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRules,
  createRule,
  updateRule,
  toggleRuleStatus,
  deleteRule,
  getWorkflowLogs,
  getTemplates,
  testExecuteRule
};
