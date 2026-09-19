const { z } = require('zod');
const Lead = require('../models/Lead');
const LeadSource = require('../models/LeadSource');
const LeadStatus = require('../models/LeadStatus');
const User = require('../models/User');
const LeadNote = require('../models/LeadNote');
const Customer = require('../models/Customer');
const Contact = require('../models/Contact');
const CustomerNote = require('../models/CustomerNote');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');
const { triggerWorkflowEngine } = require('../services/workflowEngine');

// ============================================================
// SCORING ENGINE
// ============================================================
/**
 * Calculate lead score (0-100) based on data richness
 * Returns { score, temperature }
 */
const calculateLeadScore = (lead) => {
  let score = 0;

  if (lead.phone && lead.phone.trim())           score += 10;
  if (lead.email && lead.email.trim())           score += 15;
  if (lead.company && lead.company.trim())       score += 10;
  if (lead.industry && lead.industry.trim())     score += 5;
  if (lead.demoRequested)                        score += 20;
  if (lead.budget && lead.budget > 0)            score += 15;
  if (lead.expectedValue && lead.expectedValue > 0) score += 15;

  score = Math.min(100, score);

  let temperature = 'Cold';
  if (score >= 81)      temperature = 'Very Hot';
  else if (score >= 61) temperature = 'Hot';
  else if (score >= 31) temperature = 'Warm';

  return { score, temperature };
};

// ============================================================
// ASSIGNMENT ENGINE
// ============================================================
/**
 * Resolve assignee based on strategy
 * @param {string} strategy - 'manual' | 'round-robin' | 'load-based'
 * @param {string} assignedToId - only required for 'manual'
 * @param {string} department - required for 'round-robin' and 'load-based'
 * @param {ObjectId} organizationId
 */
const resolveAssignment = async (strategy, assignedToId, department, organizationId) => {
  if (strategy === 'manual' && assignedToId) {
    return assignedToId;
  }

  const filter = { organizationId, isActive: true };
  if (department) filter.department = department;

  if (strategy === 'round-robin') {
    const agents = await User.find(filter).sort({ createdAt: 1 }).select('_id');
    if (agents.length === 0) return null;
    const totalLeads = await Lead.countDocuments({ organizationId, isArchived: false });
    return agents[totalLeads % agents.length]._id;
  }

  if (strategy === 'load-based') {
    const agents = await User.find(filter).select('_id');
    if (agents.length === 0) return null;

    const loads = await Lead.aggregate([
      {
        $match: {
          organizationId,
          isConverted: false,
          isArchived: false,
          assignedTo: { $in: agents.map((a) => a._id) }
        }
      },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    const loadMap = {};
    loads.forEach((l) => { loadMap[l._id.toString()] = l.count; });

    let minLoad = Infinity;
    let selectedAgent = agents[0]._id;

    for (const agent of agents) {
      const load = loadMap[agent._id.toString()] || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedAgent = agent._id;
      }
    }

    return selectedAgent;
  }

  return null;
};

// ============================================================
// GET ALL LEADS — paginated, filtered
// GET /api/v1/leads
// ============================================================
const getLeads = async (req, res, next) => {
  try {
    const {
      status, source, assignedTo, temperature,
      search, isConverted, page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const filter = { organizationId: req.organizationId, isArchived: false };

    if (status)      filter.status = status;
    if (source)      filter.source = source;
    if (assignedTo)  filter.assignedTo = assignedTo;
    if (temperature) filter.temperature = temperature;
    if (isConverted !== undefined) filter.isConverted = isConverted === 'true';

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { company:   { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
        { phone:     { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('status', 'name color isWon isLost')
        .populate('source', 'name color')
        .populate('assignedTo', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Lead.countDocuments(filter)
    ]);

    return ApiResponse.success(res, 'Leads fetched successfully', {
      leads,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET LEAD STATS (KPI)
// GET /api/v1/leads/stats
// ============================================================
const getLeadStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total,
      newToday,
      converted,
      byTemperature,
      byStatus
    ] = await Promise.all([
      Lead.countDocuments({ organizationId: orgId, isArchived: false }),
      Lead.countDocuments({ organizationId: orgId, isArchived: false, createdAt: { $gte: today } }),
      Lead.countDocuments({ organizationId: orgId, isConverted: true }),
      Lead.aggregate([
        { $match: { organizationId: orgId, isArchived: false } },
        { $group: { _id: '$temperature', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { organizationId: orgId, isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'leadstatuses',
            localField: '_id',
            foreignField: '_id',
            as: 'statusInfo'
          }
        },
        { $unwind: { path: '$statusInfo', preserveNullAndEmptyArrays: true } }
      ])
    ]);

    const temperatureMap = {};
    byTemperature.forEach((t) => { temperatureMap[t._id] = t.count; });

    return ApiResponse.success(res, 'Lead stats fetched', {
      total,
      newToday,
      converted,
      hot: (temperatureMap['Hot'] || 0) + (temperatureMap['Very Hot'] || 0),
      cold: temperatureMap['Cold'] || 0,
      warm: temperatureMap['Warm'] || 0,
      temperatureBreakdown: temperatureMap,
      byStatus
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CHECK DUPLICATE
// POST /api/v1/leads/check-duplicate
// ============================================================
const checkDuplicate = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return ApiResponse.success(res, 'No fields to check', { duplicates: [] });
    }

    const orClauses = [];
    if (email && email.trim()) orClauses.push({ email: email.toLowerCase().trim() });
    if (phone && phone.trim()) orClauses.push({ phone: phone.trim() });

    const duplicates = await Lead.find({
      organizationId: req.organizationId,
      isArchived: false,
      $or: orClauses
    })
      .populate('status', 'name color')
      .populate('assignedTo', 'firstName lastName')
      .select('firstName lastName company email phone status assignedTo createdAt');

    return ApiResponse.success(res, 'Duplicate check complete', { duplicates });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE LEAD
// POST /api/v1/leads
// ============================================================
const createLeadSchema = z.object({
  firstName:       z.string().min(1, 'First name is required'),
  lastName:        z.string().optional().default(''),
  company:         z.string().optional().default(''),
  email:           z.string().optional().default(''),
  phone:           z.string().optional().default(''),
  secondaryPhone:  z.string().optional().default(''),
  designation:     z.string().optional().default(''),
  city:            z.string().optional().default(''),
  state:           z.string().optional().default(''),
  country:         z.string().optional().default(''),
  industry:        z.string().optional().default(''),
  website:         z.string().optional().default(''),
  status:          z.string().optional(),
  source:          z.string().optional(),
  department:      z.string().optional().default(''),
  expectedValue:   z.number().optional().default(0),
  budget:          z.number().optional().default(0),
  demoRequested:   z.boolean().optional().default(false),
  tags:            z.array(z.string()).optional().default([]),
  initialNote:     z.string().optional().default(''),
  // Assignment
  assignmentStrategy: z.enum(['manual', 'round-robin', 'load-based']).optional().default('manual'),
  assignedTo:      z.string().optional()
});

const createLead = async (req, res, next) => {
  try {
    const data = createLeadSchema.parse(req.body);

    // Resolve assignee
    const resolvedAssignee = await resolveAssignment(
      data.assignmentStrategy,
      data.assignedTo,
      data.department,
      req.organizationId
    );

    // Auto-score
    const { score, temperature } = calculateLeadScore(data);

    const lead = await Lead.create({
      organizationId: req.organizationId,
      firstName:     data.firstName,
      lastName:      data.lastName,
      company:       data.company,
      email:         data.email ? data.email.toLowerCase() : '',
      phone:         data.phone,
      secondaryPhone: data.secondaryPhone,
      designation:   data.designation,
      city:          data.city,
      state:         data.state,
      country:       data.country,
      industry:      data.industry,
      website:       data.website,
      status:        data.status || null,
      source:        data.source || null,
      department:    data.department,
      expectedValue: data.expectedValue,
      budget:        data.budget,
      demoRequested: data.demoRequested,
      tags:          data.tags,
      initialNote:   data.initialNote,
      assignedTo:    resolvedAssignee,
      score,
      temperature,
      lastActivityAt: new Date()
    });

    // Auto-create initial note if provided
    if (data.initialNote && data.initialNote.trim()) {
      await LeadNote.create({
        leadId:         lead._id,
        organizationId: req.organizationId,
        content:        data.initialNote,
        type:           'note',
        createdBy:      req.user._id
      });
    }

    const populated = await Lead.findById(lead._id)
      .populate('status', 'name color isWon isLost')
      .populate('source', 'name color')
      .populate('assignedTo', 'firstName lastName email');

    await logAudit({
      organizationId: req.organizationId,
      action: 'LEAD_CREATED',
      entity: 'Lead',
      entityId: lead._id,
      details: { name: lead.fullName, score, temperature },
      req
    });

    // Trigger Automation Workflow Engine
    triggerWorkflowEngine('lead.created', populated, req.organizationId, req.user).catch((err) =>
      console.error('Workflow trigger error on lead.created:', err)
    );

    return ApiResponse.created(res, 'Lead created successfully', populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET LEAD BY ID — full detail
// GET /api/v1/leads/:id
// ============================================================
const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId })
      .populate('status', 'name color isWon isLost order')
      .populate('source', 'name color')
      .populate('assignedTo', 'firstName lastName email phone department');

    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    return ApiResponse.success(res, 'Lead fetched', lead);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE LEAD
// PUT /api/v1/leads/:id
// ============================================================
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    const allowedFields = [
      'firstName', 'lastName', 'company', 'email', 'phone', 'secondaryPhone',
      'designation', 'city', 'state', 'country', 'industry', 'website',
      'status', 'source', 'assignedTo', 'department',
      'expectedValue', 'budget', 'demoRequested', 'tags', 'isConverted'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    }

    // Recalculate score on update
    const { score, temperature } = calculateLeadScore(lead);
    lead.score = score;
    lead.temperature = temperature;
    lead.lastActivityAt = new Date();

    await lead.save();

    const updated = await Lead.findById(lead._id)
      .populate('status', 'name color isWon isLost')
      .populate('source', 'name color')
      .populate('assignedTo', 'firstName lastName email');

    await logAudit({
      organizationId: req.organizationId,
      action: 'LEAD_UPDATED',
      entity: 'Lead',
      entityId: lead._id,
      details: { name: lead.fullName },
      req
    });

    return ApiResponse.success(res, 'Lead updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ASSIGN LEAD
// PATCH /api/v1/leads/:id/assign
// ============================================================
const assignLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo, strategy = 'manual', department } = req.body;

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    const resolvedAssignee = await resolveAssignment(
      strategy,
      assignedTo,
      department || lead.department,
      req.organizationId
    );

    lead.assignedTo = resolvedAssignee;
    lead.lastActivityAt = new Date();
    await lead.save();

    const updated = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email department');

    await logAudit({
      organizationId: req.organizationId,
      action: 'LEAD_ASSIGNED',
      entity: 'Lead',
      entityId: lead._id,
      details: { strategy, assignedTo: resolvedAssignee },
      req
    });

    return ApiResponse.success(res, 'Lead assigned successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CONVERT LEAD → Customer + Primary Contact
// POST /api/v1/leads/:id/convert
// ============================================================
const convertLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    if (lead.isConverted) {
      return ApiResponse.error(res, 'This lead has already been converted.', 400);
    }

    // 1. Create or Find Customer Account
    const companyName = lead.company && lead.company.trim()
      ? lead.company.trim()
      : `${lead.firstName} ${lead.lastName || ''}`.trim() + ' (Individual)';

    let customer = await Customer.findOne({
      organizationId: req.organizationId,
      companyName: { $regex: new RegExp(`^${companyName}$`, 'i') }
    });

    if (!customer) {
      customer = await Customer.create({
        organizationId: req.organizationId,
        companyName,
        industry: lead.industry || '',
        website: lead.website || '',
        billingAddress: {
          city: lead.city || '',
          state: lead.state || '',
          country: lead.country || ''
        },
        accountManager: lead.assignedTo || req.user._id,
        convertedFromLead: lead._id,
        tags: lead.tags || []
      });
    }

    // 2. Create primary Contact
    const contact = await Contact.create({
      customerId: customer._id,
      organizationId: req.organizationId,
      firstName: lead.firstName,
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      secondaryPhone: lead.secondaryPhone || '',
      designation: lead.designation || '',
      isPrimary: true
    });

    // 3. Mark Lead as converted
    lead.isConverted = true;
    lead.convertedAt = new Date();
    lead.lastActivityAt = new Date();
    await lead.save();

    // 4. Log timeline note on Lead & Customer
    await LeadNote.create({
      leadId: lead._id,
      organizationId: req.organizationId,
      content: `Lead converted to Customer "${customer.companyName}" by ${req.user.firstName} ${req.user.lastName}.`,
      type: 'system',
      createdBy: req.user._id
    });

    await CustomerNote.create({
      customerId: customer._id,
      organizationId: req.organizationId,
      content: `Customer account created via Lead conversion (${lead.fullName}).`,
      type: 'system',
      createdBy: req.user._id
    });

    await logAudit({
      organizationId: req.organizationId,
      action: 'LEAD_CONVERTED',
      entity: 'Lead',
      entityId: lead._id,
      details: { leadName: lead.fullName, customerId: customer._id, customerName: customer.companyName },
      req
    });

    return ApiResponse.success(res, `Lead "${lead.fullName}" converted successfully to Customer "${customer.companyName}".`, {
      customer,
      contact,
      lead
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE (Archive) LEAD
// DELETE /api/v1/leads/:id
// ============================================================
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    // Soft delete — archive
    lead.isArchived = true;
    await lead.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'LEAD_ARCHIVED',
      entity: 'Lead',
      entityId: lead._id,
      details: { name: lead.fullName },
      req
    });

    return ApiResponse.success(res, 'Lead archived successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeads,
  getLeadStats,
  checkDuplicate,
  createLead,
  getLeadById,
  updateLead,
  assignLead,
  convertLead,
  deleteLead
};
