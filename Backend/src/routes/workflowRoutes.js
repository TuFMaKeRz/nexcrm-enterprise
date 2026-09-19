const express = require('express');
const router = express.Router();
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const {
  getRules,
  createRule,
  updateRule,
  toggleRuleStatus,
  deleteRule,
  getWorkflowLogs,
  getTemplates,
  testExecuteRule
} = require('../controllers/workflowController');

// All routes protected by tenant context & auth
router.use(protect);
router.use(requireTenant);

router.get('/templates', getTemplates);
router.get('/logs', getWorkflowLogs);
router.post('/test', testExecuteRule);

router.get('/', getRules);
router.post('/', createRule);
router.put('/:id', updateRule);
router.patch('/:id/toggle', toggleRuleStatus);
router.delete('/:id', deleteRule);

module.exports = router;
