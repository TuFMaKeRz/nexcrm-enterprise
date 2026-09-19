const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    clientPhone: {
      type: String,
      required: [true, 'Client phone is required'],
      trim: true
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    propertyName: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true
    },
    propertyType: {
      type: String,
      default: '3 BHK Luxury Apartment'
    },
    locality: {
      type: String,
      default: 'Whitefield'
    },
    propertyBudget: {
      type: Number,
      default: 15000000 // ₹1.5 Cr
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Visit scheduled date is required']
    },
    assignedRep: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Booked Unit'],
      default: 'Scheduled',
      index: true
    },
    visitFeedback: {
      type: String,
      default: ''
    },
    // Broker / Channel Partner Commission
    brokerName: {
      type: String,
      trim: true,
      default: ''
    },
    brokerPhone: {
      type: String,
      trim: true,
      default: ''
    },
    brokerCommissionRate: {
      type: Number,
      default: 2.0 // 2%
    },
    brokerCommissionAmount: {
      type: Number,
      default: 0
    },
    brokerPayoutStatus: {
      type: String,
      enum: ['Not Applicable', 'Pending', 'Approved', 'Paid'],
      default: 'Pending'
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    }
  },
  { timestamps: true }
);

siteVisitSchema.pre('save', function (next) {
  if (this.propertyBudget && this.brokerCommissionRate) {
    this.brokerCommissionAmount = Math.round((this.propertyBudget * this.brokerCommissionRate) / 100);
  }
  next();
});

siteVisitSchema.index({ organizationId: 1, scheduledDate: -1 });

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
