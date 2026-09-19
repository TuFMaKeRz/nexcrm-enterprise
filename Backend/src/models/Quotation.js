const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      enum: ['Product', 'Service'],
      default: 'Product'
    },
    unit: {
      type: String,
      default: 'Units'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    costPrice: {
      type: Number,
      default: 0
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 18
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    quotationNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      trim: true,
      uppercase: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer account is required'],
      index: true
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal'
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Approved', 'Rejected', 'Converted', 'Expired'],
      default: 'Draft',
      index: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // +30 days
    },
    currency: {
      type: String,
      default: 'INR'
    },
    items: [quotationItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    discountTotal: {
      type: Number,
      default: 0
    },
    taxTotal: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0
    },
    termsAndConditions: {
      type: String,
      default: '1. Prices are valid for 30 days from the issue date.\n2. Payment terms: 50% advance, 50% upon delivery/completion.\n3. Applicable taxes will be charged as per government regulations.'
    },
    notes: {
      type: String,
      default: ''
    },
    convertedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedTo: {
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

quotationSchema.index({ organizationId: 1, quotationNumber: 1 }, { unique: true });
quotationSchema.index({ organizationId: 1, status: 1 });
quotationSchema.index({ organizationId: 1, customer: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);
