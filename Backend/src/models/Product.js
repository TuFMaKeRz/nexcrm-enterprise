const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['Product', 'Service'],
      default: 'Product',
      index: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    unit: {
      type: String,
      enum: ['Units', 'Hours', 'Days', 'Months', 'Years', 'Projects', 'Licenses', 'Items', 'Sets', 'Custom'],
      default: 'Units'
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    taxRate: {
      type: Number,
      default: 18, // 18% standard GST
      min: 0,
      max: 100
    },
    hsnSacCode: {
      type: String,
      trim: true,
      default: ''
    },
    trackInventory: {
      type: Boolean,
      default: false
    },
    stockQuantity: {
      type: Number,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual for profit margin amount
productSchema.virtual('margin').get(function () {
  return Math.max(0, (this.unitPrice || 0) - (this.costPrice || 0));
});

// Virtual for profit margin %
productSchema.virtual('marginPercentage').get(function () {
  if (!this.unitPrice || this.unitPrice === 0) return 0;
  const margin = (this.unitPrice || 0) - (this.costPrice || 0);
  return Math.round((margin / this.unitPrice) * 100);
});

productSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
productSchema.index({ organizationId: 1, type: 1, isActive: 1 });
productSchema.index({ organizationId: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
