const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

// All department routes require authentication and tenant context
router.use(protect);
router.use(requireTenant);

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), getDepartments);
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), createDepartment);
router.put('/:id', requirePermission(PERMISSIONS.USERS_EDIT), updateDepartment);
router.delete('/:id', requirePermission(PERMISSIONS.USERS_DELETE), deleteDepartment);

module.exports = router;
