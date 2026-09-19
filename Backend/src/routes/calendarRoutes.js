const express = require('express');
const router = express.Router();

const { getCalendarEvents } = require('../controllers/calendarController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

router.get('/events', requirePermission(PERMISSIONS.ACTIVITIES_VIEW), getCalendarEvents);

module.exports = router;
