const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['Lead', 'Quotation', 'Invoice', 'Deal', 'General'],
      default: 'General',
      index: true
    },
    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true
    },
    bodyHtml: {
      type: String,
      required: [true, 'HTML body content is required']
    },
    bodyText: {
      type: String,
      default: ''
    },
    variables: {
      type: [String],
      default: ['customer_name', 'company_name', 'user_name']
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

emailTemplateSchema.index({ organizationId: 1, category: 1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
