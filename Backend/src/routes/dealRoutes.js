const express = require('express');
const router = express.Router();

const {
  getDeals,
  getDealStats,
  getDealById,
  createDeal,
  moveDealStage,
  updateDeal,
  deleteDeal,
  getDealNotes,
  addDealNote,
  deleteDealNote
} = require('../controllers/dealController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

// Stats
router.get('/stats',        requirePermission(PERMISSIONS.DEALS_VIEW),   getDealStats);

// Core CRUD
router.get('/',             requirePermission(PERMISSIONS.DEALS_VIEW),   getDeals);
router.post('/',            requirePermission(PERMISSIONS.DEALS_CREATE),  createDeal);
router.get('/:id',          requirePermission(PERMISSIONS.DEALS_VIEW),   getDealById);
router.put('/:id',          requirePermission(PERMISSIONS.DEALS_EDIT),   updateDeal);
router.delete('/:id',       requirePermission(PERMISSIONS.DEALS_DELETE), deleteDeal);

// Kanban Drag-and-Drop Stage Mover
router.patch('/:id/stage',  requirePermission(PERMISSIONS.DEALS_EDIT),   moveDealStage);

// Deal Notes
router.get('/:id/notes',         requirePermission(PERMISSIONS.DEALS_VIEW),   getDealNotes);
router.post('/:id/notes',        requirePermission(PERMISSIONS.DEALS_CREATE),  addDealNote);
router.delete('/:id/notes/:nid', requirePermission(PERMISSIONS.DEALS_EDIT),   deleteDealNote);

module.exports = router;
