const express = require('express');
const router = express.Router();
const {
  getLeadSources, createLeadSource, updateLeadSource, deleteLeadSource
} = require('../controllers/leadSourceController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

router.get('/',     requirePermission(PERMISSIONS.LEADS_VIEW),   getLeadSources);
router.post('/',    requirePermission(PERMISSIONS.SETTINGS_MANAGE), createLeadSource);
router.put('/:id',  requirePermission(PERMISSIONS.SETTINGS_MANAGE), updateLeadSource);
router.delete('/:id', requirePermission(PERMISSIONS.SETTINGS_MANAGE), deleteLeadSource);

module.exports = router;
