const express = require('express');
const router = express.Router();
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { globalSearch } = require('../controllers/searchController');
const {
  importLeadsBatch,
  bulkActions,
  filteredExport
} = require('../controllers/dataToolsController');

// All routes require authentication & tenant scoping
router.use(protect);
router.use(requireTenant);

// Global Search
router.get('/search', globalSearch);

// Data Import / Export / Bulk
router.post('/data/import/leads', requirePermission('leads:create'), importLeadsBatch);
router.post('/data/bulk-actions', bulkActions);
router.post('/data/export', filteredExport);

module.exports = router;
