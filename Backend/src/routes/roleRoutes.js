const express = require('express');
const router = express.Router();
const {
  getRoles,
  getPermissionsList,
  createCustomRole,
  updateRole,
  deleteRole
} = require('../controllers/roleController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { PERMISSIONS } = require('../utils/permissions');

// All role routes require authentication
router.use(protect);

router.get('/', requirePermission(PERMISSIONS.ROLES_VIEW), getRoles);
router.get('/permissions', requirePermission(PERMISSIONS.ROLES_VIEW), getPermissionsList);
router.post('/', requirePermission(PERMISSIONS.ROLES_MANAGE), createCustomRole);
router.put('/:id', requirePermission(PERMISSIONS.ROLES_MANAGE), updateRole);
router.delete('/:id', requirePermission(PERMISSIONS.ROLES_MANAGE), deleteRole);

module.exports = router;
