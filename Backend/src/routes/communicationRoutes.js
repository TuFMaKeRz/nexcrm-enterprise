const express = require('express');
const router = express.Router();

const {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendDirectEmail,
  sendWhatsAppMessage,
  getCommunicationLogs,
  testSmtp
} = require('../controllers/communicationController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');

router.use(protect);
router.use(requireTenant);

// Templates
router.get('/templates',              getEmailTemplates);
router.post('/templates',             createEmailTemplate);
router.put('/templates/:id',          updateEmailTemplate);
router.delete('/templates/:id',       deleteEmailTemplate);

// Dispatch
router.post('/email/send',            sendDirectEmail);
router.post('/email/test',            testSmtp);
router.post('/whatsapp/send',         sendWhatsAppMessage);

// History & Logs
router.get('/logs',                   getCommunicationLogs);

module.exports = router;
