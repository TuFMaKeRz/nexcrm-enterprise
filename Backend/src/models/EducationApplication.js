const mongoose = require('mongoose');

const educationApplicationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    studentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    studentPhone: {
      type: String,
      required: [true, 'Student phone is required'],
      trim: true
    },
    targetCountry: {
      type: String,
      required: [true, 'Target country is required'],
      default: 'United States'
    },
    targetUniversity: {
      type: String,
      required: [true, 'Target university is required'],
      trim: true
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true
    },
    courseType: {
      type: String,
      default: 'Master of Science (MS)'
    },
    intakeSession: {
      type: String,
      default: 'Fall 2026'
    },
    visaStage: {
      type: String,
      enum: [
        'Application Submitted',
        'Offer Letter Received',
        'Financials & Blocked Account Verified',
        'Visa Interview Scheduled',
        'Visa Approved & Flight Booked',
        'Visa Rejected'
      ],
      default: 'Application Submitted',
      index: true
    },
    counsellor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tuitionFeeEstimate: {
      type: Number,
      default: 2500000 // ₹25 Lakhs
    },
    notes: {
      type: String,
      default: ''
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    }
  },
  { timestamps: true }
);

educationApplicationSchema.index({ organizationId: 1, visaStage: 1 });

module.exports = mongoose.model('EducationApplication', educationApplicationSchema);
