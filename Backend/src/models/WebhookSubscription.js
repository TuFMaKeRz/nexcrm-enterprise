const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookSubscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Webhook subscription name is required'],
      trim: true,
      default: 'Outbound Webhook Integration'
    },
    targetUrl: {
      type: String,
      required: [true, 'Target webhook URL is required'],
      trim: true
    },
    secretKey: {
      type: String,
      default: () => crypto.randomBytes(24).toString('hex')
    },
    events: [
      {
        type: String,
        enum: [
          'lead.created',
          'lead.updated',
          'lead.converted',
          'deal.created',
          'deal.stage_changed',
          'deal.won',
          'deal.lost',
          'quotation.approved',
          'invoice.created',
          'payment.received'
        ]
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    deliveryStats: {
      totalSent: { type: Number, default: 0 },
      totalSuccess: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
      lastTriggeredAt: { type: Date, default: null },
      lastResponseStatus: { type: Number, default: null }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

webhookSubscriptionSchema.index({ organizationId: 1, isActive: 1 });

module.exports = mongoose.model('WebhookSubscription', webhookSubscriptionSchema);
