const mongoose = require('mongoose');

const leadSourceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true
    },
    color: {
      type: String,
      default: '#6366f1'
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

leadSourceSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('LeadSource', leadSourceSchema);
