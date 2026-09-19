const express = require('express');
const router = express.Router();

const {
  getInvoices,
  getInvoiceStats,
  getInvoiceById,
  createInvoice,
  recordPayment,
  updateInvoice,
  deleteInvoice
} = require('../controllers/invoiceController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

// Stats
router.get('/stats',                      requirePermission(PERMISSIONS.INVOICES_VIEW), getInvoiceStats);

// Core CRUD
router.get('/',                           requirePermission(PERMISSIONS.INVOICES_VIEW), getInvoices);
router.post('/',                          requirePermission(PERMISSIONS.INVOICES_CREATE), createInvoice);
router.get('/:id',                        requirePermission(PERMISSIONS.INVOICES_VIEW), getInvoiceById);
router.put('/:id',                        requirePermission(PERMISSIONS.INVOICES_EDIT), updateInvoice);
router.delete('/:id',                     requirePermission(PERMISSIONS.INVOICES_DELETE), deleteInvoice);

// Payment Recording
router.post('/:id/payments',              requirePermission(PERMISSIONS.PAYMENTS_RECORD), recordPayment);

module.exports = router;
