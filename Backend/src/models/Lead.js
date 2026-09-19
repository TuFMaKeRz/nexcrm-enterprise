const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },

    // ── Identity ──────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    company: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    secondaryPhone: {
      type: String,
      trim: true,
      default: ''
    },
    designation: {
      type: String,
      trim: true,
      default: ''
    },

    // ── Location ──────────────────────────────────────────────
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },

    // ── Profile ───────────────────────────────────────────────
    industry: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },

    // ── Pipeline ──────────────────────────────────────────────
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeadStatus',
      default: null
    },
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeadSource',
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    department: {
      type: String,
      trim: true,
      default: ''
    },

    // ── Scoring ───────────────────────────────────────────────
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    temperature: {
      type: String,
      enum: ['Cold', 'Warm', 'Hot', 'Very Hot'],
      default: 'Cold'
    },

    // ── Deal Info ─────────────────────────────────────────────
    expectedValue: {
      type: Number,
      default: 0
    },
    budget: {
      type: Number,
      default: 0
    },
    demoRequested: {
      type: Boolean,
      default: false
    },

    // ── Tags & Notes ──────────────────────────────────────────
    tags: {
      type: [String],
      default: []
    },
    initialNote: {
      type: String,
      trim: true,
      default: ''
    },

    // ── Conversion ────────────────────────────────────────────
    isConverted: {
      type: Boolean,
      default: false
    },
    convertedAt: {
      type: Date,
      default: null
    },
    convertedTo: {
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
      dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null }
    },

    // ── Activity Tracking ─────────────────────────────────────
    lastActivityAt: {
      type: Date,
      default: null
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common query patterns
leadSchema.index({ organizationId: 1, status: 1 });
leadSchema.index({ organizationId: 1, assignedTo: 1 });
leadSchema.index({ organizationId: 1, temperature: 1 });
leadSchema.index({ organizationId: 1, isConverted: 1 });
leadSchema.index({ organizationId: 1, email: 1 });
leadSchema.index({ organizationId: 1, phone: 1 });

// Full name virtual
leadSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = mongoose.model('Lead', leadSchema);
