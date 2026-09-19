const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    type: {
      type: String,
      enum: ['Call', 'Meeting', 'Demo', 'Site Visit', 'WhatsApp', 'Email', 'Other'],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    outcome: {
      type: String,
      enum: [
        'Connected - Positive',
        'Connected - Neutral',
        'Connected - Negative',
        'Voicemail / No Answer',
        'Demo Completed',
        'Follow-up Required',
        'Proposal Requested',
        'Deal Signed',
        'Lost Interest',
        'Other'
      ],
      default: 'Connected - Positive',
      index: true
    },
    activityDate: {
      type: Date,
      required: [true, 'Activity date & time is required'],
      index: true
    },
    duration: {
      type: Number, // in minutes
      default: 15
    },
    location: {
      type: String, // URL (Zoom, Meet) or physical address or phone number
      trim: true,
      default: ''
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
    // Polymorphic reference
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
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null
    },
    isCompleted: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

activitySchema.index({ organizationId: 1, activityDate: 1 });
activitySchema.index({ organizationId: 1, type: 1 });

module.exports = mongoose.model('Activity', activitySchema);
