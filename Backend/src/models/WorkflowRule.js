const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true }, // e.g., 'expectedValue', 'source', 'status', 'score'
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'exists'],
      default: 'equals'
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const actionSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: [
        'assign_user',
        'create_task',
        'send_email',
        'send_notification',
        'create_customer',
        'update_field',
        'dispatch_webhook'
      ],
      required: true
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const workflowRuleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Workflow rule name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    trigger: {
      type: String,
      enum: [
        'lead.created',
        'lead.status_changed',
        'deal.created',
        'deal.stage_changed',
        'invoice.paid',
        'task.overdue'
      ],
      required: [true, 'Trigger event is required'],
      index: true
    },
    conditionLogic: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND'
    },
    conditions: {
      type: [conditionSchema],
      default: []
    },
    actions: {
      type: [actionSchema],
      required: [true, 'At least one action is required'],
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        'Workflow rule must contain at least 1 action'
      ]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    executionCount: {
      type: Number,
      default: 0
    },
    lastExecutedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

workflowRuleSchema.index({ organizationId: 1, trigger: 1, isActive: 1 });

module.exports = mongoose.model('WorkflowRule', workflowRuleSchema);
