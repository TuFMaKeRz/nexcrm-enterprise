const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: 120
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    logo: {
      type: String,
      default: ''
    },
    industry: {
      type: String,
      default: 'Generic Business',
      enum: [
        'Real Estate',
        'Digital Marketing Agency',
        'Software & IT',
        'Education & Immigration',
        'Insurance Agency',
        'Financial Services',
        'Manufacturing & Retail',
        'Generic Business'
      ]
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'India' },
      postalCode: { type: String, default: '' }
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    currency: {
      code: { type: String, default: 'INR' },
      symbol: { type: String, default: '₹' }
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    taxInfo: {
      taxName: { type: String, default: 'GSTIN' },
      taxNumber: { type: String, default: '' }
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    branding: {
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#06b6d4' },
      bannerText: { type: String, default: '' },
      invoiceHeader: { type: String, default: 'Thank you for your business!' },
      invoiceFooter: { type: String, default: 'For inquiries, please contact our accounts department.' },
      defaultTerms: { type: String, default: '1. Payment is due within 15 days.\n2. Invoices are subject to standard service agreement.' }
    },
    subscription: {
      plan: {
        type: String,
        enum: ['starter', 'business', 'professional', 'enterprise'],
        default: 'business'
      },
      status: {
        type: String,
        enum: ['active', 'trial', 'past_due', 'cancelled'],
        default: 'trial'
      },
      maxUsers: { type: Number, default: 10 },
      maxLeads: { type: Number, default: 10000 },
      validUntil: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
organizationSchema.index({ 'subscription.status': 1 });

module.exports = mongoose.model('Organization', organizationSchema);
