const mongoose = require('mongoose');

const dealNoteSchema = new mongoose.Schema(
  {
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
      index: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['note', 'call-log', 'email-log', 'meeting', 'stage-change', 'system'],
      default: 'note'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DealNote', dealNoteSchema);
