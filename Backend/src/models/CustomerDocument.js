const mongoose = require('mongoose');

const customerDocumentSchema = new mongoose.Schema(
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
    name:         { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    filePath:     { type: String, required: true },
    fileType:     { type: String, default: '' },
    fileSize:     { type: Number, default: 0 },  // bytes
    category: {
      type: String,
      enum: ['Contract', 'Proposal', 'NDA', 'Invoice', 'ID Proof', 'Other'],
      default: 'Other'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerDocument', customerDocumentSchema);
