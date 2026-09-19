const express = require('express');
const router = express.Router();
const publicFormController = require('../controllers/publicFormController');
const leadFormController = require('../controllers/leadFormController');
const webhookController = require('../controllers/webhookController');
const { protect } = require('../middlewares/authMiddleware');

// ─── PUBLIC ENDPOINTS (NO AUTH REQUIRED FOR EMBEDDED WEBSITES) ───
router.get('/public/forms/:slug', publicFormController.getPublicFormConfig);
router.post('/public/forms/:slug/submit', publicFormController.submitPublicLeadForm);

// ─── PROTECTED ENDPOINTS (AUTHENTICATED CRM WORKSPACE) ───────────
router.use('/lead-forms', protect);
router.get('/lead-forms', leadFormController.getLeadForms);
router.post('/lead-forms', leadFormController.createLeadForm);
router.put('/lead-forms/:id', leadFormController.updateLeadForm);
router.delete('/lead-forms/:id', leadFormController.deleteLeadForm);
router.get('/lead-forms/:id/embed', leadFormController.getFormEmbedSnippets);

router.use('/webhooks', protect);
router.get('/webhooks', webhookController.getWebhooks);
router.post('/webhooks', webhookController.createWebhook);
router.put('/webhooks/:id', webhookController.updateWebhook);
router.delete('/webhooks/:id', webhookController.deleteWebhook);
router.post('/webhooks/:id/test-ping', webhookController.triggerTestPing);
router.get('/webhooks/logs', webhookController.getWebhookLogs);

module.exports = router;
