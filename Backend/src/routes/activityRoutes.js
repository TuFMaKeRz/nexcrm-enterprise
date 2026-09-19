const express = require('express');
const router = express.Router();

const {
  getActivities,
  getActivityStats,
  createActivity,
  updateActivity,
  deleteActivity
} = require('../controllers/activityController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

router.get('/stats',   requirePermission(PERMISSIONS.ACTIVITIES_VIEW),   getActivityStats);
router.get('/',        requirePermission(PERMISSIONS.ACTIVITIES_VIEW),   getActivities);
router.post('/',       requirePermission(PERMISSIONS.ACTIVITIES_CREATE), createActivity);
router.put('/:id',     requirePermission(PERMISSIONS.ACTIVITIES_CREATE), updateActivity);
router.delete('/:id',  requirePermission(PERMISSIONS.ACTIVITIES_CREATE), deleteActivity);

module.exports = router;
