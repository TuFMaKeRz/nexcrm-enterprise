const express = require('express');
const router = express.Router();
const {
  getLeadStatuses, createLeadStatus, updateLeadStatus, deleteLeadStatus
} = require('../controllers/leadStatusController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

router.get('/',     requirePermission(PERMISSIONS.LEADS_VIEW),   getLeadStatuses);
router.post('/',    requirePermission(PERMISSIONS.SETTINGS_MANAGE), createLeadStatus);
router.put('/:id',  requirePermission(PERMISSIONS.SETTINGS_MANAGE), updateLeadStatus);
router.delete('/:id', requirePermission(PERMISSIONS.SETTINGS_MANAGE), deleteLeadStatus);

module.exports = router;
