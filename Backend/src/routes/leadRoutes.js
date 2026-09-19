const express = require('express');
const router = express.Router();
const {
  getLeads, getLeadStats, checkDuplicate,
  createLead, getLeadById, updateLead,
  assignLead, convertLead, deleteLead
} = require('../controllers/leadController');
const {
  getFollowUps, createFollowUp, completeFollowUp, deleteFollowUp, getFollowUpOverview
} = require('../controllers/leadFollowUpController');
const { getNotes, createNote, deleteNote } = require('../controllers/leadNoteController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

// Stats & utilities (must be before /:id)
router.get('/stats',            requirePermission(PERMISSIONS.LEADS_VIEW),   getLeadStats);
router.get('/followups/overview', requirePermission(PERMISSIONS.LEADS_VIEW), getFollowUpOverview);
router.post('/check-duplicate', requirePermission(PERMISSIONS.LEADS_VIEW),   checkDuplicate);

// Core CRUD
router.get('/',     requirePermission(PERMISSIONS.LEADS_VIEW),   getLeads);
router.post('/',    requirePermission(PERMISSIONS.LEADS_CREATE),  createLead);
router.get('/:id',  requirePermission(PERMISSIONS.LEADS_VIEW),   getLeadById);
router.put('/:id',  requirePermission(PERMISSIONS.LEADS_EDIT),   updateLead);
router.delete('/:id', requirePermission(PERMISSIONS.LEADS_DELETE), deleteLead);

// Actions
router.patch('/:id/assign',  requirePermission(PERMISSIONS.LEADS_ASSIGN), assignLead);
router.post('/:id/convert',  requirePermission(PERMISSIONS.LEADS_EDIT),   convertLead);

// Follow-ups (nested under lead)
router.get('/:id/followups',           requirePermission(PERMISSIONS.LEADS_VIEW),   getFollowUps);
router.post('/:id/followups',          requirePermission(PERMISSIONS.LEADS_CREATE),  createFollowUp);
router.patch('/:id/followups/:fid',    requirePermission(PERMISSIONS.LEADS_EDIT),   completeFollowUp);
router.delete('/:id/followups/:fid',   requirePermission(PERMISSIONS.LEADS_EDIT),   deleteFollowUp);

// Notes (nested under lead)
router.get('/:id/notes',         requirePermission(PERMISSIONS.LEADS_VIEW),   getNotes);
router.post('/:id/notes',        requirePermission(PERMISSIONS.LEADS_CREATE),  createNote);
router.delete('/:id/notes/:nid', requirePermission(PERMISSIONS.LEADS_EDIT),   deleteNote);

module.exports = router;
