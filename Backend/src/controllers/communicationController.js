const EmailTemplate = require('../models/EmailTemplate');
const CommunicationLog = require('../models/CommunicationLog');
const Organization = require('../models/Organization');
const ApiResponse = require('../utils/apiResponse');
const { sendEmail, interpolate, baseEmailLayout, testSmtpConnection } = require('../services/emailService');
const { logAudit } = require('../middlewares/auditLogger');

// Default starter templates if none exist
const DEFAULT_TEMPLATES = [
  {
    name: 'Lead Welcome & Introduction',
    category: 'Lead',
    subject: 'Welcome to {{company_name}} — Empowering Your Business Growth',
    bodyHtml: `
      <h2>Hello {{customer_name}},</h2>
      <p>Thank you for expressing interest in <strong>{{company_name}}</strong>!</p>
      <p>We specialize in helping fast-growing organizations scale their operations efficiently. Our executive team is reviewing your requirements, and your dedicated account representative will reach out to schedule an introductory discovery session.</p>
      <p>In the meantime, feel free to reply directly to this email if you have any urgent questions.</p>
      <br>
      <p>Warm regards,<br><strong>{{user_name}}</strong><br>{{company_name}}</p>
    `,
    variables: ['customer_name', 'company_name', 'user_name']
  },
  {
    name: 'Quotation Proposal Sent',
    category: 'Quotation',
    subject: 'Formal Proposal & Estimate #{{quotation_number}} from {{company_name}}',
    bodyHtml: `
      <h2>Dear {{customer_name}},</h2>
      <p>Please find enclosed our formal quotation <strong>#{{quotation_number}}</strong> for an estimated grand total of <strong>{{amount}}</strong>.</p>
      <p>This estimate is valid for 30 days. You can review the itemized scope of work, deliverables, and payment schedule directly in the attached documentation.</p>
      <p>To proceed or request minor revisions, simply reply to this email or confirm your approval.</p>
      <br>
      <p>Best regards,<br><strong>{{user_name}}</strong><br>{{company_name}}</p>
    `,
    variables: ['customer_name', 'company_name', 'quotation_number', 'amount', 'user_name']
  },
  {
    name: 'Invoice Payment Due Reminder',
    category: 'Invoice',
    subject: 'Invoice #{{invoice_number}} Payment Reminder — Due on {{due_date}}',
    bodyHtml: `
      <h2>Hello {{customer_name}},</h2>
      <p>This is a friendly reminder that payment for Invoice <strong>#{{invoice_number}}</strong> totaling <strong>{{amount}}</strong> is due on <strong>{{due_date}}</strong>.</p>
      <p>Please remit payment via Bank Transfer or UPI quoting your invoice number as reference.</p>
      <p>If payment has already been initiated, please accept our thanks and disregard this notice.</p>
      <br>
      <p>Accounts Team<br>{{company_name}}</p>
    `,
    variables: ['customer_name', 'company_name', 'invoice_number', 'amount', 'due_date', 'user_name']
  },
  {
    name: 'Deal Won & Kickoff Greeting',
    category: 'Deal',
    subject: 'Congratulations! Official Partnership Kickoff with {{company_name}}',
    bodyHtml: `
      <h2>Dear {{customer_name}},</h2>
      <p>We are thrilled to officially welcome you as our client partner on <strong>{{deal_name}}</strong>!</p>
      <p>Our implementation team is already preparing the project roadmap and onboarding resources to ensure a seamless kickoff.</p>
      <br>
      <p>Sincerely,<br><strong>{{user_name}}</strong><br>{{company_name}}</p>
    `,
    variables: ['customer_name', 'company_name', 'deal_name', 'user_name']
  }
];

// Helper to seed default templates if empty
const ensureDefaultTemplates = async (organizationId) => {
  const count = await EmailTemplate.countDocuments({ organizationId, isArchived: false });
  if (count === 0) {
    const templatesToInsert = DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      organizationId,
      isDefault: true
    }));
    await EmailTemplate.insertMany(templatesToInsert);
  }
};

// ============================================================
// GET EMAIL TEMPLATES
// GET /api/v1/communication/templates
// ============================================================
const getEmailTemplates = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { category, search } = req.query;

    await ensureDefaultTemplates(orgId);

    const filter = { organizationId: orgId, isArchived: false };
    if (category && category !== 'all') filter.category = category;
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { subject: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const templates = await EmailTemplate.find(filter).sort({ category: 1, name: 1 });
    return ApiResponse.success(res, 'Email templates fetched', templates);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE EMAIL TEMPLATE
// POST /api/v1/communication/templates
// ============================================================
const createEmailTemplate = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { name, category = 'General', subject, bodyHtml, bodyText, variables = [] } = req.body;

    if (!name || !subject || !bodyHtml) {
      return ApiResponse.error(res, 'Template name, subject, and body content are required', 400);
    }

    const template = await EmailTemplate.create({
      organizationId: orgId,
      name,
      category,
      subject,
      bodyHtml,
      bodyText: bodyText || '',
      variables,
      createdBy: req.user._id
    });

    return ApiResponse.created(res, 'Email template created', template);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE EMAIL TEMPLATE
// PUT /api/v1/communication/templates/:id
// ============================================================
const updateEmailTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await EmailTemplate.findOne({ _id: id, organizationId: req.organizationId });

    if (!template) {
      return ApiResponse.error(res, 'Template not found', 404);
    }

    const { name, category, subject, bodyHtml, bodyText, variables } = req.body;
    if (name) template.name = name;
    if (category) template.category = category;
    if (subject) template.subject = subject;
    if (bodyHtml) template.bodyHtml = bodyHtml;
    if (bodyText !== undefined) template.bodyText = bodyText;
    if (variables) template.variables = variables;

    await template.save();
    return ApiResponse.success(res, 'Template updated', template);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE EMAIL TEMPLATE
// DELETE /api/v1/communication/templates/:id
// ============================================================
const deleteEmailTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await EmailTemplate.findOne({ _id: id, organizationId: req.organizationId });

    if (!template) {
      return ApiResponse.error(res, 'Template not found', 404);
    }

    template.isArchived = true;
    await template.save();

    return ApiResponse.success(res, 'Template archived');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DIRECT EMAIL SENDER (With Template Interpolation & Log)
// POST /api/v1/communication/email/send
// ============================================================
const sendDirectEmail = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;
    const {
      to,
      recipientName,
      subject,
      templateId,
      bodyHtml,
      variables = {},
      relatedCustomer,
      relatedLead,
      relatedDeal
    } = req.body;

    if (!to) {
      return ApiResponse.error(res, 'Recipient email address (to) is required', 400);
    }

    let finalSubject = subject;
    let finalHtml = bodyHtml;
    let templateName = 'Direct Custom Email';

    const org = await Organization.findById(orgId);
    const mergedVariables = {
      company_name: org?.name || 'NexCRM Enterprise',
      user_name: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      customer_name: recipientName || 'Valued Client',
      ...variables
    };

    if (templateId) {
      const template = await EmailTemplate.findOne({ _id: templateId, organizationId: orgId });
      if (template) {
        templateName = template.name;
        finalSubject = interpolate(template.subject, mergedVariables);
        finalHtml = interpolate(template.bodyHtml, mergedVariables);
      }
    } else if (finalHtml) {
      finalHtml = interpolate(finalHtml, mergedVariables);
      if (finalSubject) finalSubject = interpolate(finalSubject, mergedVariables);
    }

    if (!finalSubject || !finalHtml) {
      return ApiResponse.error(res, 'Subject and Email Body are required', 400);
    }

    // Wrap in standard responsive layout
    const formattedHtml = baseEmailLayout(finalSubject, finalHtml);

    // Send via emailService (Nodemailer / Ethereal)
    let emailResult;
    try {
      emailResult = await sendEmail({
        to,
        subject: finalSubject,
        html: formattedHtml
      });
    } catch (sendErr) {
      // Log failed dispatch
      await CommunicationLog.create({
        organizationId: orgId,
        channel: 'Email',
        recipientEmail: to,
        recipientName: recipientName || '',
        relatedCustomer: relatedCustomer || undefined,
        relatedLead: relatedLead || undefined,
        relatedDeal: relatedDeal || undefined,
        subject: finalSubject,
        templateName,
        content: finalHtml,
        status: 'Failed',
        errorDetails: sendErr.message,
        sentBy: userId
      });

      return ApiResponse.error(res, `Failed to deliver email: ${sendErr.message}`, 500);
    }

    // Log successful dispatch
    const log = await CommunicationLog.create({
      organizationId: orgId,
      channel: 'Email',
      recipientEmail: to,
      recipientName: recipientName || '',
      relatedCustomer: relatedCustomer || undefined,
      relatedLead: relatedLead || undefined,
      relatedDeal: relatedDeal || undefined,
      subject: finalSubject,
      templateName,
      content: finalHtml,
      status: 'Sent',
      messageId: emailResult.messageId || '',
      previewUrl: emailResult.previewUrl || '',
      sentBy: userId
    });

    await logAudit({
      organizationId: orgId,
      action: 'EMAIL_SENT',
      entity: 'CommunicationLog',
      entityId: log._id,
      details: { to, subject: finalSubject, templateName },
      req
    });

    return ApiResponse.success(res, 'Email dispatched successfully', {
      log,
      previewUrl: emailResult.previewUrl
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// WHATSAPP API DISPATCHER & CLICK-TO-CHAT
// POST /api/v1/communication/whatsapp/send
// ============================================================
const sendWhatsAppMessage = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;
    const {
      phone,
      recipientName,
      message,
      templateName = 'Direct WhatsApp Ping',
      variables = {},
      relatedCustomer,
      relatedLead,
      relatedDeal
    } = req.body;

    if (!phone) {
      return ApiResponse.error(res, 'Recipient phone number is required', 400);
    }

    const org = await Organization.findById(orgId);
    const mergedVariables = {
      company_name: org?.name || 'NexCRM Enterprise',
      user_name: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      customer_name: recipientName || 'Valued Client',
      ...variables
    };

    const finalMessage = interpolate(message, mergedVariables);

    // Clean phone number for WhatsApp deep link
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const clickToChatUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;

    // Log WhatsApp dispatch
    const log = await CommunicationLog.create({
      organizationId: orgId,
      channel: 'WhatsApp',
      recipientPhone: phone,
      recipientName: recipientName || '',
      relatedCustomer: relatedCustomer || undefined,
      relatedLead: relatedLead || undefined,
      relatedDeal: relatedDeal || undefined,
      templateName,
      content: finalMessage,
      status: 'Delivered',
      metadata: { clickToChatUrl },
      sentBy: userId
    });

    await logAudit({
      organizationId: orgId,
      action: 'WHATSAPP_DISPATCHED',
      entity: 'CommunicationLog',
      entityId: log._id,
      details: { phone, templateName },
      req
    });

    return ApiResponse.success(res, 'WhatsApp message logged and link generated', {
      log,
      clickToChatUrl
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET COMMUNICATION LOGS & TIMELINE
// GET /api/v1/communication/logs
// ============================================================
const getCommunicationLogs = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { channel, customerId, leadId, dealId, search, page = 1, limit = 25 } = req.query;

    const filter = { organizationId: orgId };

    if (channel && channel !== 'all') filter.channel = channel;
    if (customerId) filter.relatedCustomer = customerId;
    if (leadId) filter.relatedLead = leadId;
    if (dealId) filter.relatedDeal = dealId;

    if (search && search.trim()) {
      filter.$or = [
        { recipientEmail: { $regex: search.trim(), $options: 'i' } },
        { recipientPhone: { $regex: search.trim(), $options: 'i' } },
        { recipientName: { $regex: search.trim(), $options: 'i' } },
        { subject: { $regex: search.trim(), $options: 'i' } },
        { content: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      CommunicationLog.find(filter)
        .populate('sentBy', 'firstName lastName email')
        .populate('relatedCustomer', 'name companyName')
        .populate('relatedLead', 'firstName lastName company')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CommunicationLog.countDocuments(filter)
    ]);

    return ApiResponse.success(res, 'Communication logs fetched', {
      logs,
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
// TEST SMTP CONNECTION
// POST /api/v1/communication/email/test
// ============================================================
const testSmtp = async (req, res, next) => {
  try {
    const { toEmail } = req.body;
    const target = toEmail || req.user.email;

    const result = await testSmtpConnection(target);
    return ApiResponse.success(res, `Test email dispatched to ${target}`, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendDirectEmail,
  sendWhatsAppMessage,
  getCommunicationLogs,
  testSmtp
};
