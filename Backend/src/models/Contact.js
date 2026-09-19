const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },

    firstName:      { type: String, required: [true, 'First name required'], trim: true },
    lastName:       { type: String, trim: true, default: '' },
    email:          { type: String, trim: true, lowercase: true, default: '' },
    phone:          { type: String, trim: true, default: '' },
    secondaryPhone: { type: String, trim: true, default: '' },
    designation:    { type: String, trim: true, default: '' },
    department:     { type: String, trim: true, default: '' },
    linkedIn:       { type: String, trim: true, default: '' },
    notes:          { type: String, trim: true, default: '' },
    isPrimary:      { type: Boolean, default: false },
    isActive:       { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

contactSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = mongoose.model('Contact', contactSchema);
