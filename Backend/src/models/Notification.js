const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    type: {
      type: String,
      enum: [
        'lead_assigned',
        'followup_due',
        'quotation_approved',
        'quotation_converted',
        'payment_recorded',
        'deal_won',
        'deal_stage_changed',
        'task_assigned',
        'general'
      ],
      default: 'general',
      index: true
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['Lead', 'Customer', 'Deal', 'Quotation', 'Invoice', 'Task', 'Activity', 'General'],
        default: 'General'
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId
      }
    },
    link: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

notificationSchema.index({ organizationId: 1, recipient: 1, isRead: 1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
