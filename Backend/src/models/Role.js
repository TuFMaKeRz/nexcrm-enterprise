const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null // null means system-wide template role
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    permissions: [
      {
        type: String,
        trim: true
      }
    ],
    dataScope: {
      type: String,
      enum: ['own', 'team', 'department', 'organization'],
      default: 'own'
    },
    isSystemRole: {
      type: Boolean,
      default: false
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
roleSchema.index({ organizationId: 1, name: 1 });

module.exports = mongoose.model('Role', roleSchema);
