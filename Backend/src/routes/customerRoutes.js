const express = require('express');
const router = express.Router();

const {
  getCustomers, getCustomerStats, createCustomer,
  getCustomerById, updateCustomer, deleteCustomer
} = require('../controllers/customerController');
const {
  getContacts, createContact, updateContact, deleteContact, setPrimaryContact
} = require('../controllers/contactController');
const { getNotes, createNote, deleteNote } = require('../controllers/customerNoteController');
const {
  uploadMiddleware, getDocuments, uploadDocument, downloadDocument, deleteDocument
} = require('../controllers/documentController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

// ── Customer Core ─────────────────────────────────────────
router.get('/stats',  requirePermission(PERMISSIONS.CUSTOMERS_VIEW),   getCustomerStats);
router.get('/',       requirePermission(PERMISSIONS.CUSTOMERS_VIEW),   getCustomers);
router.post('/',      requirePermission(PERMISSIONS.CUSTOMERS_CREATE),  createCustomer);
router.get('/:id',    requirePermission(PERMISSIONS.CUSTOMERS_VIEW),   getCustomerById);
router.put('/:id',    requirePermission(PERMISSIONS.CUSTOMERS_EDIT),   updateCustomer);
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS_DELETE), deleteCustomer);

// ── Contacts ──────────────────────────────────────────────
router.get('/:id/contacts',                requirePermission(PERMISSIONS.CONTACTS_VIEW),   getContacts);
router.post('/:id/contacts',               requirePermission(PERMISSIONS.CONTACTS_CREATE),  createContact);
router.put('/:id/contacts/:cid',           requirePermission(PERMISSIONS.CONTACTS_EDIT),   updateContact);
router.delete('/:id/contacts/:cid',        requirePermission(PERMISSIONS.CONTACTS_DELETE), deleteContact);
router.patch('/:id/contacts/:cid/primary', requirePermission(PERMISSIONS.CONTACTS_EDIT),   setPrimaryContact);

// ── Notes / Activity Timeline ─────────────────────────────
router.get('/:id/notes',         requirePermission(PERMISSIONS.CUSTOMERS_VIEW),   getNotes);
router.post('/:id/notes',        requirePermission(PERMISSIONS.CUSTOMERS_CREATE),  createNote);
router.delete('/:id/notes/:nid', requirePermission(PERMISSIONS.CUSTOMERS_EDIT),   deleteNote);

// ── Documents ─────────────────────────────────────────────
router.get('/:id/documents',               requirePermission(PERMISSIONS.CUSTOMERS_VIEW),   getDocuments);
router.post('/:id/documents',              requirePermission(PERMISSIONS.CUSTOMERS_CREATE),  uploadMiddleware, uploadDocument);
router.get('/:id/documents/:did/download', requirePermission(PERMISSIONS.CUSTOMERS_VIEW),   downloadDocument);
router.delete('/:id/documents/:did',       requirePermission(PERMISSIONS.CUSTOMERS_EDIT),   deleteDocument);

module.exports = router;
