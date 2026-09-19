const express = require('express');
const router = express.Router();

const {
  getPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  setDefaultPipeline
} = require('../controllers/pipelineController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

router.get('/',                    requirePermission(PERMISSIONS.PIPELINES_VIEW),   getPipelines);
router.post('/',                   requirePermission(PERMISSIONS.PIPELINES_MANAGE), createPipeline);
router.get('/:id',                 requirePermission(PERMISSIONS.PIPELINES_VIEW),   getPipelineById);
router.put('/:id',                 requirePermission(PERMISSIONS.PIPELINES_MANAGE), updatePipeline);
router.delete('/:id',              requirePermission(PERMISSIONS.PIPELINES_MANAGE), deletePipeline);
router.patch('/:id/default',        requirePermission(PERMISSIONS.PIPELINES_MANAGE), setDefaultPipeline);

module.exports = router;
