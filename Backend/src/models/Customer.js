const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street:  { type: String, default: '' },
  city:    { type: String, default: '' },
  state:   { type: String, default: '' },
  zip:     { type: String, default: '' },
  country: { type: String, default: '' }
}, { _id: false });

const customerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },

    // ── Identity ──────────────────────────────────────────────
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    industry: { type: String, trim: true, default: '' },
    website:  { type: String, trim: true, default: '' },

    // ── Tax & Financials ──────────────────────────────────────
    taxId:     { type: String, trim: true, default: '' },
    gstin:     { type: String, trim: true, default: '' },
    panNumber: { type: String, trim: true, default: '' },

    // ── Address ───────────────────────────────────────────────
    billingAddress:  { type: addressSchema, default: () => ({}) },
    shippingAddress: { type: addressSchema, default: () => ({}) },
    sameAsbilling:   { type: Boolean, default: false },

    // ── Relationship ──────────────────────────────────────────
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ── Conversion Tracking ───────────────────────────────────
    convertedFromLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null
    },

    // ── Status ────────────────────────────────────────────────
    isActive:   { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },

    // ── Notes & Tags ──────────────────────────────────────────
    tags: { type: [String], default: [] }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

customerSchema.index({ organizationId: 1, companyName: 1 }, { unique: true });
customerSchema.index({ organizationId: 1, isArchived: 1 });

module.exports = mongoose.model('Customer', customerSchema);
