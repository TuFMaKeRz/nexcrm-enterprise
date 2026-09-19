const LeadForm = require('../models/LeadForm');
const Lead = require('../models/Lead');
const LeadSource = require('../models/LeadSource');
const LeadStatus = require('../models/LeadStatus');
const Organization = require('../models/Organization');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { triggerWorkflowEngine } = require('../services/workflowEngine');
const { dispatchWebhookEvent } = require('../services/webhookDispatcher');

// Calculate lead score helper
const calculateLeadScore = (lead) => {
  let score = 0;
  if (lead.phone && lead.phone.trim()) score += 15;
  if (lead.email && lead.email.trim()) score += 20;
  if (lead.company && lead.company.trim()) score += 15;
  if (lead.budget && lead.budget > 0) score += 20;
  if (lead.notes && lead.notes.trim()) score += 10;
  if (lead.serviceInterest) score += 20;

  score = Math.min(100, score);
  let temperature = 'Cold';
  if (score >= 80) temperature = 'Very Hot';
  else if (score >= 60) temperature = 'Hot';
  else if (score >= 30) temperature = 'Warm';

  return { score, temperature };
};

// ============================================================
// 1. GET PUBLIC FORM CONFIGURATION (NO AUTH REQUIRED)
// GET /api/v1/public/forms/:slug
// ============================================================
const getPublicFormConfig = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const form = await LeadForm.findOne({ slug: slug.toLowerCase(), isActive: true })
      .populate('organizationId', 'name slug logo branding industry');

    if (!form) {
      return ApiResponse.error(res, 'Public lead form not found or has been disabled.', 404);
    }

    return ApiResponse.success(res, 'Public form configuration retrieved', {
      id: form._id,
      title: form.title,
      slug: form.slug,
      description: form.description,
      submitButtonText: form.submitButtonText,
      primaryColor: form.primaryColor,
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      fieldsConfig: form.fieldsConfig,
      thankYouMessage: form.thankYouMessage,
      redirectUrl: form.redirectUrl,
      organization: {
        name: form.organizationId?.name,
        slug: form.organizationId?.slug,
        logo: form.organizationId?.logo,
        industry: form.organizationId?.industry,
        branding: form.organizationId?.branding
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. SUBMIT PUBLIC LEAD FORM (NO AUTH REQUIRED)
// POST /api/v1/public/forms/:slug/submit
// ============================================================
const submitPublicLeadForm = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const body = req.body;

    // Anti-spam Honeypot check
    if (body.hp_website || body._honeypot) {
      return ApiResponse.success(res, 'Submission received.', { leadId: 'filtered' });
    }

    const form = await LeadForm.findOne({ slug: slug.toLowerCase(), isActive: true });
    if (!form) {
      return ApiResponse.error(res, 'Public lead form not found or inactive.', 404);
    }

    const orgId = form.organizationId;

    // Extract submission fields
    const firstName = body.firstName || body.name?.split(' ')[0] || 'Inbound';
    const lastName = body.lastName || body.name?.split(' ').slice(1).join(' ') || 'Lead';
    const email = (body.email || '').toLowerCase().trim();
    const phone = (body.phone || '').trim();
    const company = (body.company || '').trim();
    const budget = parseFloat(body.budget) || 0;
    const notes = (body.message || body.notes || body.requirement || '').trim();
    const serviceInterest = body.serviceInterest || body.service || '';

    if (!email && !phone) {
      return ApiResponse.error(res, 'Please provide either an email address or a phone number.', 400);
    }

    // Resolve or find Default Lead Source & Status
    let leadSource = await LeadSource.findOne({ organizationId: orgId, name: form.defaultLeadSource || 'Website' });
    if (!leadSource) {
      leadSource = await LeadSource.findOne({ organizationId: orgId });
    }

    let leadStatus = await LeadStatus.findOne({ organizationId: orgId, name: { $in: ['New', 'New Lead', 'Inquiry', 'Open'] } });
    if (!leadStatus) {
      leadStatus = await LeadStatus.findOne({ organizationId: orgId });
    }

    // Resolve default sales assignee (round robin or first active user)
    const assignee = await User.findOne({ organizationId: orgId, isActive: true }).sort({ createdAt: 1 });

    const leadData = {
      firstName,
      lastName,
      email,
      phone,
      company,
      budget,
      expectedValue: budget,
      notes,
      serviceInterest
    };

    const { score, temperature } = calculateLeadScore(leadData);

    // Create the Lead in NexCRM
    const newLead = await Lead.create({
      organizationId: orgId,
      firstName,
      lastName,
      email,
      phone,
      company,
      source: leadSource?._id,
      sourceName: form.defaultLeadSource || 'Website',
      status: leadStatus?._id,
      statusName: leadStatus?.name || 'New',
      assignedTo: assignee?._id,
      score,
      temperature,
      budget,
      expectedValue: budget,
      notes,
      tags: ['Website Inbound', form.title.slice(0, 30)]
    });

    // Increment form submission counter
    await LeadForm.findByIdAndUpdate(form._id, { $inc: { submissionCount: 1 } });

    // Asynchronously trigger Workflow Automations
    try {
      await triggerWorkflowEngine('lead.created', newLead, orgId);
    } catch (wfErr) {
      console.warn('[Workflow Trigger Warning]:', wfErr.message);
    }

    // Asynchronously dispatch Outbound Webhooks
    try {
      await dispatchWebhookEvent(orgId, 'lead.created', {
        id: newLead._id,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        email: newLead.email,
        phone: newLead.phone,
        company: newLead.company,
        budget: newLead.budget,
        score: newLead.score,
        temperature: newLead.temperature,
        source: 'Website',
        formSlug: form.slug,
        formTitle: form.title,
        createdAt: newLead.createdAt
      });
    } catch (whErr) {
      console.warn('[Webhook Dispatch Warning]:', whErr.message);
    }

    return ApiResponse.created(res, form.thankYouMessage || 'Form submitted successfully!', {
      leadId: newLead._id,
      redirectUrl: form.redirectUrl || null,
      thankYouMessage: form.thankYouMessage
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicFormConfig,
  submitPublicLeadForm
};
