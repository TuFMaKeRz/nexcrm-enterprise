const mongoose = require('mongoose');

const pipelineStageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Stage name is required'],
      trim: true
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 20
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
    }
  },
  { _id: true }
);

const pipelineSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Pipeline name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    stages: {
      type: [pipelineStageSchema],
      default: []
    }
  },
  { timestamps: true }
);

pipelineSchema.index({ organizationId: 1, name: 1 }, { unique: true });
pipelineSchema.index({ organizationId: 1, isDefault: 1 });

module.exports = mongoose.model('Pipeline', pipelineSchema);
