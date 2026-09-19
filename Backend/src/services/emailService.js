const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

/**
 * Initializes or retrieves the Nodemailer transporter.
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  // If real SMTP credentials are provided
  if (env.smtp.user && env.smtp.pass) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    });
    console.log(`📧 Connected to Live SMTP Server: ${env.smtp.host}:${env.smtp.port} (${env.smtp.user})`);
    return transporter;
  }

  // Developer mode fallback: creates Ethereal or Mock Transport
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log(`📧 SMTP dev mode: Ethereal test mailbox provisioned (${testAccount.user})`);
    return transporter;
  } catch (err) {
    console.warn('⚠️ Ethereal mailbox unavailable, fallback to stream transport:', err.message);
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return transporter;
  }
};

/**
 * Replaces {{variable}} placeholders in template text/html
 */
const interpolate = (template, variables = {}) => {
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, val || '');
  }
  return result;
};

/* ==========================================================================
   HTML EMAIL TEMPLATES
   ========================================================================== */

const baseEmailLayout = (title, contentHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.15); overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; }
    .body { padding: 32px; font-size: 15px; line-height: 1.6; color: #cbd5e1; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 20px 0; text-align: center; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
    .footer { padding: 20px 32px; background: #0b1120; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(148, 163, 184, 0.1); }
    .alert-box { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #a5b4fc; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NexCRM Platform</h1>
      <p>Multi-Tenant Customer Relationship & Sales Platform</p>
    </div>
    <div class="body">
      ${contentHtml}
    </div>
    <div class="footer">
      This is an automated notification from your NexCRM Workspace.<br>
      © ${new Date().getFullYear()} NexCRM. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

/**
 * Send an email using Nodemailer
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailTransporter = await getTransporter();

    const mailOptions = {
      from: env.smtp.from,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html
    };

    const info = await mailTransporter.sendMail(mailOptions);

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`\n📬 [EMAIL SENT] To: ${to} | Subject: "${subject}"`);
        console.log(`🔗 Ethereal Web Preview: ${previewUrl}\n`);
      }
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      envelope: info.envelope
    };
  } catch (error) {
    console.error('❌ Email dispatch failed:', error.message);
    throw error;
  }
};

/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async (to, resetUrl, userName = 'User') => {
  const content = `
    <h2 style="color: #ffffff; margin-top: 0;">Password Reset Request</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>We received a request to reset the password for your NexCRM account.</p>
    <p>Click the button below to set a new password. This link is secure and valid for the next <strong>15 minutes</strong>:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
    </div>
    <p style="font-size: 13px; color: #94a3b8;">
      If you did not request a password reset, you can safely ignore this email. Your existing password will remain unchanged.
    </p>
    <div class="alert-box">
      <strong>Direct link:</strong> <a href="${resetUrl}" style="color: #818cf8; word-break: break-all;">${resetUrl}</a>
    </div>
  `;

  return await sendEmail({
    to,
    subject: 'Action Required: Reset Your NexCRM Password',
    html: baseEmailLayout('Reset Password', content)
  });
};

/**
 * Send Workspace Welcome Email
 */
const sendWelcomeEmail = async (to, userName, companyName) => {
  const loginUrl = `${env.clientUrl}/login`;
  const content = `
    <h2 style="color: #ffffff; margin-top: 0;">Welcome to NexCRM! 🎉</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your company workspace for <strong>${companyName}</strong> has been successfully configured and activated.</p>
    <p>You can now log in to configure your sales pipeline, set up custom roles, and invite your team members.</p>
    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn" target="_blank">Access Your Workspace</a>
    </div>
  `;

  return await sendEmail({
    to,
    subject: `Welcome to NexCRM — Workspace "${companyName}" Ready`,
    html: baseEmailLayout('Welcome to NexCRM', content)
  });
};

/**
 * Send Test SMTP Verification Email
 */
const testSmtpConnection = async (toEmail) => {
  const content = `
    <h2 style="color: #ffffff; margin-top: 0;">SMTP Test Successful ✅</h2>
    <p>Congratulations!</p>
    <p>This email confirms that your NexCRM SMTP connection and email dispatch engine are properly configured and operational.</p>
    <div class="alert-box">
      Timestamp: ${new Date().toISOString()}<br>
      Host: ${env.smtp.host}<br>
      Port: ${env.smtp.port}
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: 'NexCRM SMTP Connection Test - Verified',
    html: baseEmailLayout('SMTP Connection Test', content)
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  testSmtpConnection,
  interpolate,
  baseEmailLayout
};
