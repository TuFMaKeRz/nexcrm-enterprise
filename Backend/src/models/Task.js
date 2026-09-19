const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Completed', 'Cancelled'],
      default: 'To Do',
      index: true
    },
    dueDate: {
      type: Date,
      default: null,
      index: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Polymorphic reference to Lead, Customer, or Deal
    relatedTo: {
      model: {
        type: String,
        enum: ['Lead', 'Customer', 'Deal', 'General'],
        default: 'General'
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        refPath: 'relatedTo.model'
      }
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
  { timestamps: true }
);

taskSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
taskSchema.index({ organizationId: 1, 'relatedTo.model': 1, 'relatedTo.id': 1 });

module.exports = mongoose.model('Task', taskSchema);
