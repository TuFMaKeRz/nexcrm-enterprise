const mongoose = require('mongoose');

const industryPackConfigSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    activePack: {
      type: String,
      enum: ['real_estate', 'agency_software', 'education_consultancy', 'general_b2b'],
      default: 'real_estate'
    },
    // Real Estate Settings
    realEstateSettings: {
      propertyTypes: {
        type: [String],
        default: ['2 BHK Apartment', '3 BHK Luxury Apartment', '4 BHK Penthouse', 'Independent Villa', 'Commercial Plot / Office']
      },
      budgetBrackets: {
        type: [String],
        default: ['₹30L - ₹50L', '₹50L - ₹1Cr', '₹1Cr - ₹2.5Cr', '₹2.5Cr - ₹5Cr', '₹5Cr+']
      },
      localities: {
        type: [String],
        default: ['Whitefield', 'Indiranagar', 'Koramangala', 'HSR Layout', 'Electronic City', 'Bandra West', 'Cyber Hub']
      },
      defaultBrokerCommissionRate: {
        type: Number,
        default: 2.0 // 2% standard
      }
    },
    // Agency / Software Settings
    agencySettings: {
      techStacks: {
        type: [String],
        default: ['React', 'Next.js', 'Node.js', 'Python / Django', 'Flutter', 'AWS / Cloud', 'AI / LLM Integration', 'DevOps / CI/CD']
      },
      billingModels: {
        type: [String],
        default: ['Fixed Milestone Price', 'Hourly Time & Material', 'Monthly Dedicated Retainer']
      },
      defaultHourlyRate: {
        type: Number,
        default: 2500 // ₹2,500/hr
      },
      contractDurations: {
        type: [String],
        default: ['3 Months', '6 Months', '12 Months (Annual AMC)']
      }
    },
    // Education Consultancy Settings
    educationSettings: {
      targetCountries: {
        type: [String],
        default: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'Ireland', 'Singapore']
      },
      courseTypes: {
        type: [String],
        default: ['Master of Science (MS)', 'MBA / Executive MBA', 'Bachelor of Technology (B.Tech)', 'Diploma / Post-Grad Diploma']
      },
      intakeSessions: {
        type: [String],
        default: ['Fall 2026', 'Spring 2027', 'Summer 2027', 'Fall 2027']
      },
      visaStages: {
        type: [String],
        default: [
          'Application Submitted',
          'Offer Letter Received',
          'Financials & Blocked Account Verified',
          'Visa Interview Scheduled',
          'Visa Approved & Flight Booked'
        ]
      }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('IndustryPackConfig', industryPackConfigSchema);
