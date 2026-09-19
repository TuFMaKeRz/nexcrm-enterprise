const { z } = require('zod');
const ApiResponse = require('../utils/apiResponse');
const emailService = require('../services/emailService');
const { logAudit } = require('../middlewares/auditLogger');
const env = require('../config/env');

const sendEmailSchema = z.object({
  to: z.string().email('Valid recipient email required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Email content is required'),
  templateKey: z.string().optional()
});

/**
 * Send custom email to lead, contact, or customer
 * POST /api/v1/emails/send
 */
const sendCustomEmail = async (req, res, next) => {
  try {
    const validatedData = sendEmailSchema.parse(req.body);
    const { to, subject, content } = validatedData;

    const html = emailService.baseEmailLayout(
      subject,
      `<h2 style="color: #ffffff; margin-top: 0;">${subject}</h2><div style="margin: 16px 0;">${content}</div>`
    );

    const result = await emailService.sendEmail({
      to,
      subject,
      html
    });

    if (req.organizationId) {
      await logAudit({
        organizationId: req.organizationId,
        userId: req.user?._id,
        action: 'EMAIL_SENT',
        entity: 'Communication',
        details: { to, subject, messageId: result.messageId },
        req
      });
    }

    return ApiResponse.success(res, 'Email dispatched successfully', {
      to,
      subject,
      messageId: result.messageId,
      previewUrl: result.previewUrl
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test SMTP connection and deliver a test message
 * POST /api/v1/emails/test-smtp
 */
const testSmtp = async (req, res, next) => {
  try {
    const { targetEmail } = req.body;
    const recipient = targetEmail || req.user?.email || 'test@example.com';

    const result = await emailService.testSmtpConnection(recipient);

    return ApiResponse.success(res, `SMTP test email delivered to ${recipient}`, {
      recipient,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
      smtpHost: env.smtp.host,
      smtpPort: env.smtp.port,
      isConfigured: Boolean(env.smtp.user && env.smtp.pass)
    });
  } catch (error) {
    return ApiResponse.error(res, `SMTP verification failed: ${error.message}`, 500);
  }
};

/**
 * Get available email templates
 * GET /api/v1/emails/templates
 */
const getTemplates = async (req, res, next) => {
  try {
    const templates = [
      {
        id: 'new_lead_welcome',
        name: 'New Lead Welcome & Intro',
        subject: 'Thank you for your enquiry with {{company_name}}',
        variables: ['customer_name', 'company_name', 'sales_person'],
        previewBody: '<p>Hi {{customer_name}},</p><p>Thank you for reaching out to us. We have assigned a dedicated sales consultant to review your requirements.</p>'
      },
      {
        id: 'sales_followup',
        name: 'Sales Follow-up & Discussion',
        subject: 'Following up regarding our discussion with {{company_name}}',
        variables: ['customer_name', 'company_name', 'deal_name', 'sales_person'],
        previewBody: '<p>Hi {{customer_name}},</p><p>I wanted to follow up on our recent discussion regarding {{deal_name}}. Please let me know when you are available for a brief sync.</p>'
      },
      {
        id: 'quotation_submission',
        name: 'Quotation Submission',
        subject: 'Quotation #{{quotation_number}} from {{company_name}}',
        variables: ['customer_name', 'company_name', 'quotation_number', 'amount'],
        previewBody: '<p>Hi {{customer_name}},</p><p>Please find attached the formal quotation #{{quotation_number}} for the total amount of {{amount}}.</p>'
      },
      {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        subject: 'Payment reminder for Invoice #{{invoice_number}}',
        variables: ['customer_name', 'invoice_number', 'amount', 'due_date'],
        previewBody: '<p>Dear {{customer_name}},</p><p>This is a gentle reminder regarding pending payment of {{amount}} due on {{due_date}}.</p>'
      }
    ];

    return ApiResponse.success(res, 'Templates fetched successfully', {
      templates,
      smtpConfig: {
        host: env.smtp.host,
        port: env.smtp.port,
        from: env.smtp.from,
        hasCustomCredentials: Boolean(env.smtp.user && env.smtp.pass)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendCustomEmail,
  testSmtp,
  getTemplates
};
