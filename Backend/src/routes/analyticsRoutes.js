const express = require('express');
const router = express.Router();

const {
  getExecutiveDashboard,
  getLeadReports,
  getSalesRepPerformance,
  getFinancialReports,
  exportDataToCsv
} = require('../controllers/analyticsController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

// Dashboard
router.get('/dashboard',                  getExecutiveDashboard);

// Specialized Reports
router.get('/lead-reports',               requirePermission(PERMISSIONS.REPORTS_VIEW), getLeadReports);
router.get('/sales-rep-performance',      requirePermission(PERMISSIONS.REPORTS_VIEW), getSalesRepPerformance);
router.get('/financial-reports',          requirePermission(PERMISSIONS.REPORTS_VIEW), getFinancialReports);

// One-Click CSV Export
router.get('/export',                     requirePermission(PERMISSIONS.REPORTS_EXPORT), exportDataToCsv);

module.exports = router;
