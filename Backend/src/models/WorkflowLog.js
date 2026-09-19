const mongoose = require('mongoose');

const workflowLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowRule',
      required: true,
      index: true
    },
    ruleName: {
      type: String,
      required: true
    },
    trigger: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ['Lead', 'Deal', 'Customer', 'Invoice', 'Task', 'Other'],
      default: 'Lead'
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    status: {
      type: String,
      enum: ['Success', 'Failed', 'Skipped'],
      default: 'Success',
      index: true
    },
    actionsExecuted: {
      type: [String],
      default: []
    },
    actionResults: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    error: {
      type: String,
      default: null
    },
    executionTimeMs: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

workflowLogSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('WorkflowLog', workflowLogSchema);
