const mongoose = require('mongoose');

const leadNoteSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
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
      enum: ['note', 'call-log', 'requirement', 'email-log', 'system'],
      default: 'note'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeadNote', leadNoteSchema);
