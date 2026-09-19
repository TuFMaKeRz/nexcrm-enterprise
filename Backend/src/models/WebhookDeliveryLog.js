const mongoose = require('mongoose');

const webhookDeliveryLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WebhookSubscription',
      required: true,
      index: true
    },
    event: {
      type: String,
      required: true,
      index: true
    },
    targetUrl: {
      type: String,
      required: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    signature: {
      type: String,
      default: ''
    },
    statusCode: {
      type: Number,
      default: null
    },
    responseBody: {
      type: String,
      default: ''
    },
    executionTimeMs: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'simulated_success'],
      default: 'success'
    },
    attemptNumber: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

webhookDeliveryLogSchema.index({ subscriptionId: 1, createdAt: -1 });
webhookDeliveryLogSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookDeliveryLog', webhookDeliveryLogSchema);
