const express = require('express');
const router = express.Router();
const {
  getOrganization,
  updateProfile,
  updateLocalization,
  updateBranding,
  applyIndustryPreset
} = require('../controllers/organizationController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

// All organization routes require authentication and tenant context
router.use(protect);
router.use(requireTenant);

router.get('/', requirePermission(PERMISSIONS.SETTINGS_VIEW), getOrganization);
router.put('/profile', requirePermission(PERMISSIONS.SETTINGS_MANAGE), updateProfile);
router.put('/localization', requirePermission(PERMISSIONS.SETTINGS_MANAGE), updateLocalization);
router.put('/branding', requirePermission(PERMISSIONS.SETTINGS_MANAGE), updateBranding);
router.post('/preset', requirePermission(PERMISSIONS.SETTINGS_MANAGE), applyIndustryPreset);

module.exports = router;
