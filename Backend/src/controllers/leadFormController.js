const LeadForm = require('../models/LeadForm');
const ApiResponse = require('../utils/apiResponse');

// Generate code snippets for a form
const generateEmbedSnippets = (form, host = 'http://localhost:5000') => {
  const publicFormUrl = `http://localhost:5173/forms/${form.slug}`;
  const submitEndpoint = `${host}/api/v1/public/forms/${form.slug}/submit`;

  // 1. Standard HTML Form snippet
  const htmlSnippet = `<!-- NexCRM Public Lead Capture Form Widget -->
<form action="${submitEndpoint}" method="POST" style="max-width: 480px; font-family: Inter, system-ui, sans-serif; background: #0f172a; color: #fff; padding: 24px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2);">
  <h3 style="margin-top: 0; color: #fff;">${form.title}</h3>
  <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">${form.description}</p>
  
  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 12px; margin-bottom: 4px; color: #cbd5e1;">First Name *</label>
    <input type="text" name="firstName" required style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 12px; margin-bottom: 4px; color: #cbd5e1;">Work Email *</label>
    <input type="email" name="email" required style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 12px; margin-bottom: 4px; color: #cbd5e1;">Phone Number *</label>
    <input type="tel" name="phone" required style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff;" />
  </div>

  <div style="margin-bottom: 16px;">
    <label style="display: block; font-size: 12px; margin-bottom: 4px; color: #cbd5e1;">Message / Requirements</label>
    <textarea name="message" rows="3" style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff;"></textarea>
  </div>

  <!-- Anti-spam honeypot (hidden) -->
  <input type="text" name="hp_website" style="display: none !important;" tabindex="-1" autocomplete="off" />

  <button type="submit" style="width: 100%; padding: 12px; background: ${form.primaryColor || '#6366f1'}; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
    ${form.submitButtonText || 'Submit Inquiry'}
  </button>
</form>`;

  // 2. JavaScript Pop-up / Overlay Widget snippet
  const jsWidgetSnippet = `<!-- NexCRM Inbound Lead Capture Script Widget -->
<script src="http://localhost:5173/widgets/nexcrm-lead-widget.js" data-form-slug="${form.slug}" data-theme-color="${form.primaryColor || '#6366f1'}" async></script>
<button onclick="window.NexCRMLeadWidget.open('${form.slug}')" style="background: ${form.primaryColor || '#6366f1'}; color: #fff; padding: 12px 20px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer;">
  ${form.title}
</button>`;

  // 3. Responsive iFrame Embed snippet
  const iframeSnippet = `<!-- NexCRM Responsive Embed iFrame -->
<iframe src="${publicFormUrl}" width="100%" height="600" frameborder="0" style="border: none; border-radius: 12px; overflow: hidden; max-width: 540px;"></iframe>`;

  return {
    publicUrl: publicFormUrl,
    submitEndpoint,
    htmlSnippet,
    jsWidgetSnippet,
    iframeSnippet
  };
};

// ============================================================
// 1. GET LEAD FORMS
// GET /api/v1/lead-forms
// ============================================================
const getLeadForms = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    let forms = await LeadForm.find({ organizationId: orgId }).sort({ createdAt: -1 });

    // If tenant has no form yet, seed an initial default form
    if (forms.length === 0) {
      const defaultForm = await LeadForm.create({
        organizationId: orgId,
        title: 'Get In Touch & Free Consultation',
        slug: `lead-inquiry-${Date.now().toString().slice(-4)}`,
        description: 'Leave your details below and our product specialist will reach out within 2 hours.',
        submitButtonText: 'Submit & Get Callback',
        primaryColor: '#6366f1',
        createdBy: req.user._id
      });
      forms = [defaultForm];
    }

    const formsWithSnippets = forms.map((form) => ({
      ...form.toObject(),
      snippets: generateEmbedSnippets(form, `${req.protocol}://${req.get('host')}`)
    }));

    return ApiResponse.success(res, 'Lead capture forms fetched', {
      forms: formsWithSnippets,
      totalForms: forms.length
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. CREATE LEAD FORM
// POST /api/v1/lead-forms
// ============================================================
const createLeadForm = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const {
      title,
      slug,
      description,
      submitButtonText,
      primaryColor = '#6366f1',
      fieldsConfig,
      defaultLeadSource = 'Website',
      redirectUrl,
      thankYouMessage
    } = req.body;

    if (!title) {
      return ApiResponse.error(res, 'Form title is required', 400);
    }

    const resolvedSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now().toString().slice(-4)}`;

    const form = await LeadForm.create({
      organizationId: orgId,
      title,
      slug: resolvedSlug,
      description,
      submitButtonText: submitButtonText || 'Submit & Contact Sales',
      primaryColor,
      fieldsConfig: fieldsConfig || undefined,
      defaultLeadSource,
      redirectUrl,
      thankYouMessage,
      createdBy: req.user._id
    });

    const snippets = generateEmbedSnippets(form, `${req.protocol}://${req.get('host')}`);

    return ApiResponse.created(res, 'Lead capture form created successfully', {
      form,
      snippets
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. UPDATE LEAD FORM
// PUT /api/v1/lead-forms/:id
// ============================================================
const updateLeadForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const form = await LeadForm.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!form) {
      return ApiResponse.error(res, 'Lead form not found', 404);
    }

    const snippets = generateEmbedSnippets(form, `${req.protocol}://${req.get('host')}`);

    return ApiResponse.success(res, 'Lead form updated', {
      form,
      snippets
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. DELETE LEAD FORM
// DELETE /api/v1/lead-forms/:id
// ============================================================
const deleteLeadForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const form = await LeadForm.findOneAndDelete({ _id: id, organizationId: orgId });
    if (!form) {
      return ApiResponse.error(res, 'Lead form not found', 404);
    }

    return ApiResponse.success(res, 'Lead capture form deleted');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. GET EMBED SNIPPETS FOR SPECIFIC FORM
// GET /api/v1/lead-forms/:id/embed
// ============================================================
const getFormEmbedSnippets = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const form = await LeadForm.findOne({ _id: id, organizationId: orgId });
    if (!form) {
      return ApiResponse.error(res, 'Lead form not found', 404);
    }

    const snippets = generateEmbedSnippets(form, `${req.protocol}://${req.get('host')}`);
    return ApiResponse.success(res, 'Embed snippets generated', snippets);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeadForms,
  createLeadForm,
  updateLeadForm,
  deleteLeadForm,
  getFormEmbedSnippets
};
