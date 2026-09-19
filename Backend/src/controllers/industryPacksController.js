const IndustryPackConfig = require('../models/IndustryPackConfig');
const SiteVisit = require('../models/SiteVisit');
const EducationApplication = require('../models/EducationApplication');
const ApiResponse = require('../utils/apiResponse');

// ============================================================
// INDUSTRY PACKS CATALOG DEFINITIONS
// ============================================================
const INDUSTRY_PACKS = [
  {
    id: 'real_estate',
    name: 'Real Estate & Property Development',
    tagline: 'Property types, site visit dispatching, broker commission ledger & locality mapping',
    icon: 'Building',
    color: '#f59e0b',
    features: [
      'Site Visit Booking Scheduler with driver/agent dispatch',
      'Broker / Channel Partner Commission Ledger (% calculation & payouts)',
      'Property Inventory (2BHK, 3BHK Luxury, Penthouse, Villas, Commercial)',
      'Budget Brackets (₹30L up to ₹5Cr+) & Locality tagging'
    ]
  },
  {
    id: 'agency_software',
    name: 'Digital Agency & Software Engineering',
    tagline: 'Project discovery briefs, tech stack tagging, milestone scoping & monthly retainers',
    icon: 'Code',
    color: '#818cf8',
    features: [
      'Tech Stack Tagging Engine (React, Node, Python, AWS, AI/LLM, Flutter)',
      'Hourly Retainer & Milestone Budget Estimator',
      'Dedicated Retainer & AMC Contract Duration Tracking',
      'Sprint & Milestone Deliverables breakdown'
    ]
  },
  {
    id: 'education_consultancy',
    name: 'Education Consultancy & Study Abroad',
    tagline: 'Target universities, country preferences, intake sessions & 5-stage visa journey',
    icon: 'GraduationCap',
    color: '#10b981',
    features: [
      'Target Countries (USA, UK, Canada, Australia, Germany, Ireland)',
      'Intake Session Tracker (Fall 2026, Spring 2027)',
      '5-Stage Visual Visa Pipeline (Offer Letter ➔ Financials ➔ Visa Approved)',
      'Student Academic Profile & Course Recommendation'
    ]
  },
  {
    id: 'general_b2b',
    name: 'Enterprise B2B & General Sales',
    tagline: 'Universal high-velocity B2B sales pipeline, quotations and multi-tier billing',
    icon: 'Briefcase',
    color: '#38bdf8',
    features: [
      'Standard Multi-Stage Deal Pipelines',
      'Quotations & Multi-Currency Invoicing',
      'Contract & NDA Document Repository'
    ]
  }
];

// ============================================================
// GET INDUSTRY PACKS & CURRENT TENANT CONFIG
// GET /api/v1/industry-packs
// ============================================================
const getPacksConfig = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    let config = await IndustryPackConfig.findOne({ organizationId: orgId });

    if (!config) {
      config = await IndustryPackConfig.create({
        organizationId: orgId,
        activePack: 'real_estate'
      });
    }

    return ApiResponse.success(res, 'Industry pack config fetched', {
      availablePacks: INDUSTRY_PACKS,
      activePack: config.activePack,
      config
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ACTIVATE / SWITCH INDUSTRY PACK
// POST /api/v1/industry-packs/activate
// ============================================================
const activatePack = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const packType = req.body.packType || req.body.packId || req.body.pack;
    const { customSettings } = req.body;

    if (!['real_estate', 'agency_software', 'education_consultancy', 'general_b2b'].includes(packType)) {
      return ApiResponse.error(res, 'Invalid industry pack type', 400);
    }

    const update = { activePack: packType, updatedBy: req.user._id };
    if (customSettings) {
      if (packType === 'real_estate') update.realEstateSettings = customSettings;
      if (packType === 'agency_software') update.agencySettings = customSettings;
      if (packType === 'education_consultancy') update.educationSettings = customSettings;
    }

    const config = await IndustryPackConfig.findOneAndUpdate(
      { organizationId: orgId },
      { $set: update },
      { new: true, upsert: true }
    );

    return ApiResponse.success(res, `Activated "${packType}" industry customization pack`, {
      activePack: config.activePack,
      config
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// REAL ESTATE: SITE VISITS & BROKER COMMISSIONS
// GET & POST /api/v1/industry/site-visits
// ============================================================
const getSiteVisits = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const visits = await SiteVisit.find({ organizationId: orgId })
      .populate('assignedRep', 'firstName lastName')
      .sort({ scheduledDate: -1 });

    // Calculate broker commission summary
    let totalCommissions = 0;
    let pendingCommissions = 0;
    let paidCommissions = 0;

    visits.forEach((v) => {
      totalCommissions += v.brokerCommissionAmount || 0;
      if (v.brokerPayoutStatus === 'Paid') paidCommissions += v.brokerCommissionAmount || 0;
      else pendingCommissions += v.brokerCommissionAmount || 0;
    });

    return ApiResponse.success(res, 'Site visits fetched', {
      visits,
      summary: {
        totalVisits: visits.length,
        bookedUnits: visits.filter((v) => v.status === 'Booked Unit').length,
        totalCommissions: Math.round(totalCommissions),
        pendingCommissions: Math.round(pendingCommissions),
        paidCommissions: Math.round(paidCommissions)
      }
    });
  } catch (error) {
    next(error);
  }
};

const createSiteVisit = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const {
      clientName,
      clientPhone,
      clientEmail,
      propertyName,
      propertyLocation,
      propertyType,
      locality,
      propertyBudget,
      scheduledDate,
      assignedRep,
      brokerName,
      brokerPhone,
      brokerCommissionRate = 2.0
    } = req.body;

    const resolvedPropName = propertyName || propertyLocation || 'Prestige Lakeside Habitat';

    if (!clientName || !clientPhone || !scheduledDate) {
      return ApiResponse.error(res, 'Client name, phone, and scheduled date are required', 400);
    }

    const budget = parseFloat(propertyBudget) || 10000000;
    const commRate = parseFloat(brokerCommissionRate) || 2.0;
    const commAmount = Math.round((budget * commRate) / 100);

    const siteVisit = await SiteVisit.create({
      organizationId: orgId,
      clientName,
      clientPhone,
      clientEmail,
      propertyName: resolvedPropName,
      propertyType: propertyType || '3 BHK Luxury Apartment',
      locality: locality || propertyLocation || 'Whitefield',
      propertyBudget: budget,
      scheduledDate: new Date(scheduledDate),
      assignedRep: assignedRep || req.user._id,
      brokerName: brokerName || '',
      brokerPhone: brokerPhone || '',
      brokerCommissionRate: commRate,
      brokerCommissionAmount: commAmount,
      brokerPayoutStatus: brokerName ? 'Pending' : 'Not Applicable'
    });

    return ApiResponse.created(res, 'Site visit scheduled and broker commission calculated', siteVisit);
  } catch (error) {
    next(error);
  }
};

const updateSiteVisitStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, visitFeedback, brokerPayoutStatus } = req.body;

    const update = {};
    if (status) update.status = status;
    if (visitFeedback !== undefined) update.visitFeedback = visitFeedback;
    if (brokerPayoutStatus) update.brokerPayoutStatus = brokerPayoutStatus;

    const visit = await SiteVisit.findOneAndUpdate(
      { _id: id, organizationId: req.organizationId },
      { $set: update },
      { new: true }
    );

    if (!visit) {
      return ApiResponse.error(res, 'Site visit not found', 404);
    }

    return ApiResponse.success(res, 'Site visit updated', visit);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EDUCATION CONSULTANCY: UNIVERSITY & VISA APPLICATIONS
// GET & POST /api/v1/industry/education-applications
// ============================================================
const getEducationApplications = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const applications = await EducationApplication.find({ organizationId: orgId })
      .populate('counsellor', 'firstName lastName')
      .sort({ createdAt: -1 });

    const stageBreakdown = {
      'Application Submitted': 0,
      'Offer Letter Received': 0,
      'Financials & Blocked Account Verified': 0,
      'Visa Interview Scheduled': 0,
      'Visa Approved & Flight Booked': 0
    };

    applications.forEach((a) => {
      if (stageBreakdown[a.visaStage] !== undefined) {
        stageBreakdown[a.visaStage]++;
      }
    });

    return ApiResponse.success(res, 'Education applications fetched', {
      applications,
      stageBreakdown,
      totalStudents: applications.length
    });
  } catch (error) {
    next(error);
  }
};

const createEducationApplication = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const {
      studentName,
      studentEmail,
      studentPhone,
      targetCountry,
      targetUniversity,
      courseName,
      coursePreference,
      courseType,
      intakeSession,
      tuitionFeeEstimate,
      counsellor,
      counselorAssigned
    } = req.body;

    const resolvedCourse = courseName || coursePreference || 'M.S. in Computer Science';

    if (!studentName || !studentPhone || !targetCountry || !targetUniversity) {
      return ApiResponse.error(res, 'Student details, target country, and university are required', 400);
    }

    const app = await EducationApplication.create({
      organizationId: orgId,
      studentName,
      studentEmail,
      studentPhone,
      targetCountry,
      targetUniversity,
      courseName: resolvedCourse,
      courseType: courseType || 'Master of Science (MS)',
      intakeSession: intakeSession || 'Fall 2026',
      tuitionFeeEstimate: tuitionFeeEstimate || 2500000,
      visaStage: 'Application Submitted',
      counsellor: counsellor || req.user._id
    });

    return ApiResponse.created(res, 'Student university application registered', app);
  } catch (error) {
    next(error);
  }
};

const updateApplicationStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stage = req.body.visaStage || req.body.stage;
    const { notes } = req.body;

    const update = {};
    if (stage) update.visaStage = stage;
    if (notes !== undefined) update.notes = notes;

    const app = await EducationApplication.findOneAndUpdate(
      { _id: id, organizationId: req.organizationId },
      { $set: update },
      { new: true }
    );

    if (!app) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    return ApiResponse.success(res, `Application progressed to "${app.visaStage}"`, app);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// AGENCY / SOFTWARE: PROJECT SCOPING & RETAINER CALCULATOR
// POST /api/v1/industry/agency-scopes
// ============================================================
const calculateAgencyScope = (req, res) => {
  const {
    projectName = 'Custom SaaS Engineering Project',
    techStack,
    selectedTechStacks = ['React', 'Node.js', 'AWS / Cloud'],
    estimatedHours = 160,
    hourlyRate = 2500,
    contractDurationMonths,
    contractMonths = 6,
    billingModel = 'Monthly Dedicated Retainer'
  } = req.body;

  const resolvedTechStack = techStack || selectedTechStacks;
  const resolvedMonths = contractDurationMonths || contractMonths || 6;
  const totalDevelopmentCost = estimatedHours * hourlyRate;
  const monthlyRetainer = Math.round(totalDevelopmentCost / Math.max(1, resolvedMonths));
  const suggestedMilestones = [
    { milestone: 'Phase 1: Architecture & UX Blueprint', percentage: 25, amount: Math.round(totalDevelopmentCost * 0.25) },
    { milestone: 'Phase 2: Core Engineering & Integrations', percentage: 50, amount: Math.round(totalDevelopmentCost * 0.50) },
    { milestone: 'Phase 3: QA, Deployment & Production Handover', percentage: 25, amount: Math.round(totalDevelopmentCost * 0.25) }
  ];

  return ApiResponse.success(res, 'Agency project scope & retainer estimated', {
    projectName,
    techStack: resolvedTechStack,
    selectedTechStacks: resolvedTechStack,
    estimatedHours,
    hourlyRate,
    totalEstimatedCost: totalDevelopmentCost,
    totalDevelopmentCost,
    billingModel,
    contractMonths: resolvedMonths,
    monthlyRetainer,
    suggestedMilestones
  });
};

module.exports = {
  getPacksConfig,
  activatePack,
  getSiteVisits,
  createSiteVisit,
  updateSiteVisitStatus,
  getEducationApplications,
  createEducationApplication,
  updateApplicationStage,
  calculateAgencyScope
};
