const express = require('express');
const router = express.Router();
const {
  sendCustomEmail,
  testSmtp,
  getTemplates
} = require('../controllers/emailController');
const { protect } = require('../middlewares/authMiddleware');

// All email routes require authentication
router.use(protect);

router.post('/send', sendCustomEmail);
router.post('/test-smtp', testSmtp);
router.get('/templates', getTemplates);

module.exports = router;
