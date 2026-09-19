const mongoose = require('mongoose');

const leadFormSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Form title is required'],
      trim: true,
      default: 'Get a Free Consultation & Quote'
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      default: 'Fill out this quick form and our sales & advisory team will reach out within 2 hours.',
      trim: true
    },
    submitButtonText: {
      type: String,
      default: 'Submit & Get Instant Callback',
      trim: true
    },
    primaryColor: {
      type: String,
      default: '#6366f1'
    },
    backgroundColor: {
      type: String,
      default: '#0f172a'
    },
    textColor: {
      type: String,
      default: '#ffffff'
    },
    fieldsConfig: {
      firstName: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'First Name' } },
      lastName: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: false }, label: { type: String, default: 'Last Name' } },
      email: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Work Email' } },
      phone: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Phone / WhatsApp' } },
      company: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: false }, label: { type: String, default: 'Company Name' } },
      budget: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: false }, label: { type: String, default: 'Estimated Budget' } },
      serviceInterest: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: false }, label: { type: String, default: 'Service / Property of Interest' } },
      message: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: false }, label: { type: String, default: 'Project Details / Requirement' } }
    },
    defaultLeadSource: {
      type: String,
      default: 'Website'
    },
    redirectUrl: {
      type: String,
      default: '',
      trim: true
    },
    thankYouMessage: {
      type: String,
      default: '🎉 Thank you! Your submission has been received. Our team will contact you shortly.',
      trim: true
    },
    submissionCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
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

// Compound index on organizationId and slug
leadFormSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
leadFormSchema.index({ slug: 1 });

module.exports = mongoose.model('LeadForm', leadFormSchema);
