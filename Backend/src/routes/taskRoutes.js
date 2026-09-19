const express = require('express');
const router = express.Router();

const {
  getTasks,
  getTaskStats,
  createTask,
  toggleTaskComplete,
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

router.get('/stats',            requirePermission(PERMISSIONS.TASKS_VIEW),   getTaskStats);
router.get('/',                 requirePermission(PERMISSIONS.TASKS_VIEW),   getTasks);
router.post('/',                requirePermission(PERMISSIONS.TASKS_CREATE),  createTask);
router.patch('/:id/complete',   requirePermission(PERMISSIONS.TASKS_EDIT),   toggleTaskComplete);
router.put('/:id',              requirePermission(PERMISSIONS.TASKS_EDIT),   updateTask);
router.delete('/:id',           requirePermission(PERMISSIONS.TASKS_DELETE), deleteTask);

module.exports = router;
