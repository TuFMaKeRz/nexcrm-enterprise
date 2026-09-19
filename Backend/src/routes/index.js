const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const roleRoutes = require('./roleRoutes');
const userRoutes = require('./userRoutes');
const emailRoutes = require('./emailRoutes');
const organizationRoutes = require('./organizationRoutes');
const departmentRoutes = require('./departmentRoutes');
const leadRoutes = require('./leadRoutes');
const leadSourceRoutes = require('./leadSourceRoutes');
const leadStatusRoutes = require('./leadStatusRoutes');
const customerRoutes = require('./customerRoutes');
const pipelineRoutes = require('./pipelineRoutes');
const dealRoutes = require('./dealRoutes');
const taskRoutes = require('./taskRoutes');
const activityRoutes = require('./activityRoutes');
const calendarRoutes = require('./calendarRoutes');
const productRoutes = require('./productRoutes');
const quotationRoutes = require('./quotationRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const notificationRoutes = require('./notificationRoutes');
const communicationRoutes = require('./communicationRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const dataToolsRoutes = require('./dataToolsRoutes');
const workflowRoutes = require('./workflowRoutes');
const industryPackRoutes = require('./industryPackRoutes');
const superAdminRoutes = require('./superAdminRoutes');
const leadCaptureRoutes = require('./leadCaptureRoutes');

// API Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Business CRM Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount module routes
router.use('/auth', authRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/emails', emailRoutes);
router.use('/organization', organizationRoutes);
router.use('/departments', departmentRoutes);
router.use('/leads', leadRoutes);
router.use('/lead-sources', leadSourceRoutes);
router.use('/lead-statuses', leadStatusRoutes);
router.use('/customers', customerRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/deals', dealRoutes);
router.use('/tasks', taskRoutes);
router.use('/activities', activityRoutes);
router.use('/calendar', calendarRoutes);
router.use('/products', productRoutes);
router.use('/quotations', quotationRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/communication', communicationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', analyticsRoutes);
router.use('/workflows', workflowRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/', leadCaptureRoutes);
router.use('/', industryPackRoutes);
router.use('/', dataToolsRoutes);

module.exports = router;
