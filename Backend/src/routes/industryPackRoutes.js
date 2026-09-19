const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const {
  getPacksConfig,
  activatePack,
  getSiteVisits,
  createSiteVisit,
  updateSiteVisitStatus,
  getEducationApplications,
  createEducationApplication,
  updateApplicationStage,
  calculateAgencyScope
} = require('../controllers/industryPacksController');

// All endpoints require auth & tenant scoping
router.use(protect);
router.use(requireTenant);

// Pack Configuration & Activation
router.get('/industry-packs', getPacksConfig);
router.post('/industry-packs/activate', activatePack);

// Real Estate Endpoints
router.get('/industry/site-visits', getSiteVisits);
router.post('/industry/site-visits', createSiteVisit);
router.patch('/industry/site-visits/:id/status', updateSiteVisitStatus);

// Education Consultancy Endpoints
router.get('/industry/education-applications', getEducationApplications);
router.post('/industry/education-applications', createEducationApplication);
router.patch('/industry/education-applications/:id/stage', updateApplicationStage);

// Agency Software Endpoints
router.post('/industry/agency-scopes', calculateAgencyScope);

module.exports = router;
