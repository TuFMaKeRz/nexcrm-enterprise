const mongoose = require('mongoose');

const leadFollowUpSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'WhatsApp', 'Site Visit', 'Demo', 'Other'],
      required: [true, 'Follow-up type is required']
    },
    subject: {
      type: String,
      trim: true,
      default: ''
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date/time is required']
    },
    completedAt: {
      type: Date,
      default: null
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    outcome: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeadFollowUp', leadFollowUpSchema);
