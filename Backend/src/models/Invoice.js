const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
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

const paymentRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than 0']
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque', 'Other'],
      default: 'Bank Transfer'
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      uppercase: true
    },
    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation'
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer account is required'],
      index: true
    },
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal'
    },
    status: {
      type: String,
      enum: ['Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Unpaid',
      index: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      default: () => new Date(+new Date() + 15 * 24 * 60 * 60 * 1000) // +15 days default
    },
    paymentTerms: {
      type: String,
      enum: ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom'],
      default: 'Net 15'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    items: [invoiceItemSchema],
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
    paidAmount: {
      type: Number,
      default: 0
    },
    balanceDue: {
      type: Number,
      default: 0
    },
    payments: [paymentRecordSchema],
    bankDetails: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      ifscSwiftCode: { type: String, default: '' },
      upiId: { type: String, default: '' }
    },
    termsAndConditions: {
      type: String,
      default: '1. Please remit payment via Bank Transfer or UPI quoting this invoice number.\n2. Overdue payments are subject to a 1.5% interest per month.\n3. Thank you for your business!'
    },
    notes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// Auto compute balanceDue before save
invoiceSchema.pre('save', function (next) {
  if (this.grandTotal !== undefined && this.paidAmount !== undefined) {
    this.balanceDue = Math.max(0, this.grandTotal - this.paidAmount);

    // Auto-advance status if not draft/cancelled
    if (this.status !== 'Draft' && this.status !== 'Cancelled') {
      if (this.balanceDue <= 0 && this.grandTotal > 0) {
        this.status = 'Paid';
      } else if (this.paidAmount > 0 && this.balanceDue > 0) {
        this.status = 'Partially Paid';
      } else if (this.paidAmount === 0) {
        const isPastDue = this.dueDate && new Date(this.dueDate) < new Date();
        this.status = isPastDue ? 'Overdue' : 'Unpaid';
      }
    }
  }
  next();
});

invoiceSchema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ organizationId: 1, status: 1 });
invoiceSchema.index({ organizationId: 1, customer: 1 });
invoiceSchema.index({ organizationId: 1, dueDate: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
