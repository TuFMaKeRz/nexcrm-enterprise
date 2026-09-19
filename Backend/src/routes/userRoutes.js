const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getUserById,
  getUserActivity,
  adminResetPassword
} = require('../controllers/userController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

// All user routes require authentication and tenant context
router.use(protect);
router.use(requireTenant);

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), getUsers);
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), createUser);
router.get('/:id', requirePermission(PERMISSIONS.USERS_VIEW), getUserById);
router.put('/:id', requirePermission(PERMISSIONS.USERS_EDIT), updateUser);
router.patch('/:id/status', requirePermission(PERMISSIONS.USERS_EDIT), toggleUserStatus);
router.get('/:id/activity', requirePermission(PERMISSIONS.USERS_VIEW), getUserActivity);
router.post('/:id/reset-password', requirePermission(PERMISSIONS.USERS_EDIT), adminResetPassword);

module.exports = router;
