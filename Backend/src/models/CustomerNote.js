const mongoose = require('mongoose');

const customerNoteSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
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
      enum: ['note', 'call-log', 'email-log', 'meeting', 'system'],
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

module.exports = mongoose.model('CustomerNote', customerNoteSchema);
