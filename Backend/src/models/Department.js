const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    color: {
      type: String,
      default: '#6366f1'
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

// Compound index to ensure unique department name per organization
departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
