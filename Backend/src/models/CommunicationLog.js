const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    channel: {
      type: String,
      enum: ['Email', 'WhatsApp', 'SMS'],
      default: 'Email',
      index: true
    },
    recipientEmail: {
      type: String,
      trim: true,
      default: ''
    },
    recipientPhone: {
      type: String,
      trim: true,
      default: ''
    },
    recipientName: {
      type: String,
      trim: true,
      default: ''
    },
    relatedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    relatedLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    relatedDeal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal'
    },
    subject: {
      type: String,
      default: ''
    },
    templateName: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Sent', 'Delivered', 'Failed', 'Queued'],
      default: 'Sent',
      index: true
    },
    messageId: {
      type: String,
      default: ''
    },
    previewUrl: {
      type: String,
      default: ''
    },
    errorDetails: {
      type: String,
      default: ''
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

communicationLogSchema.index({ organizationId: 1, channel: 1, createdAt: -1 });
communicationLogSchema.index({ organizationId: 1, relatedCustomer: 1 });
communicationLogSchema.index({ organizationId: 1, relatedLead: 1 });

module.exports = mongoose.model('CommunicationLog', communicationLogSchema);
