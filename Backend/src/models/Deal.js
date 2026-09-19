const mongoose = require('mongoose');

const dealProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  { _id: false }
);

const dealSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true
    },
    value: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: [0, 'Deal value cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    pipelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pipeline',
      required: [true, 'Pipeline ID is required'],
      index: true
    },
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Stage ID is required'],
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer account is required'],
      index: true
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 20
    },
    expectedCloseDate: {
      type: Date,
      default: null
    },
    actualCloseDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['Open', 'Won', 'Lost', 'Abandoned'],
      default: 'Open',
      index: true
    },
    winLossReason: {
      type: String,
      trim: true,
      default: ''
    },
    products: {
      type: [dealProductSchema],
      default: []
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

// Virtual for weighted value: (value * probability) / 100
dealSchema.virtual('weightedValue').get(function () {
  return ((this.value || 0) * (this.probability || 0)) / 100;
});

dealSchema.index({ organizationId: 1, pipelineId: 1, stageId: 1 });
dealSchema.index({ organizationId: 1, customerId: 1 });
dealSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model('Deal', dealSchema);
