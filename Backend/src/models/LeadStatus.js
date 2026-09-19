const mongoose = require('mongoose');

const leadStatusSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Status name is required'],
      trim: true
    },
    color: {
      type: String,
      default: '#6366f1'
    },
    order: {
      type: Number,
      default: 0
    },
    isWon: {
      type: Boolean,
      default: false
    },
    isLost: {
      type: Boolean,
      default: false
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

leadStatusSchema.index({ organizationId: 1, name: 1 }, { unique: true });
leadStatusSchema.index({ organizationId: 1, order: 1 });

module.exports = mongoose.model('LeadStatus', leadStatusSchema);
