const express = require('express');
const router = express.Router();

const {
  getQuotations,
  getQuotationStats,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  convertQuotationToInvoice,
  deleteQuotation
} = require('../controllers/quotationController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

// Stats
router.get('/stats',                      requirePermission(PERMISSIONS.QUOTATIONS_VIEW), getQuotationStats);

// Core CRUD
router.get('/',                           requirePermission(PERMISSIONS.QUOTATIONS_VIEW), getQuotations);
router.post('/',                          requirePermission(PERMISSIONS.QUOTATIONS_CREATE), createQuotation);
router.get('/:id',                        requirePermission(PERMISSIONS.QUOTATIONS_VIEW), getQuotationById);
router.put('/:id',                        requirePermission(PERMISSIONS.QUOTATIONS_EDIT), updateQuotation);
router.delete('/:id',                     requirePermission(PERMISSIONS.QUOTATIONS_DELETE), deleteQuotation);

// Status & 1-Click Conversion
router.patch('/:id/status',               requirePermission(PERMISSIONS.QUOTATIONS_EDIT), updateQuotationStatus);
router.post('/:id/convert',               requirePermission(PERMISSIONS.INVOICES_CREATE), convertQuotationToInvoice);

module.exports = router;
