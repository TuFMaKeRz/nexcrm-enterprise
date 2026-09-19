const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { protect, requireSuperAdmin } = require('../middlewares/authMiddleware');

// All super-admin endpoints are protected and require SuperAdmin privileges
router.use(protect);
router.use(requireSuperAdmin);

// Dashboard overview and MRR metrics
router.get('/dashboard', superAdminController.getSuperAdminDashboard);

// Tenant Directory & Operations
router.get('/tenants', superAdminController.getTenants);
router.post('/tenants/provision', superAdminController.provisionTenant);
router.patch('/tenants/:id/status', superAdminController.updateTenantStatus);
router.patch('/tenants/:id/plan', superAdminController.updateTenantPlan);

// Subscription Plans Catalog
router.get('/plans', superAdminController.getSubscriptionPlans);

// System Health & Diagnostics
router.get('/system-health', superAdminController.getSystemHealth);

module.exports = router;
