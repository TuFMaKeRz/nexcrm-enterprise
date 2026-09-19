const { z } = require('zod');
const Pipeline = require('../models/Pipeline');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

// Default stages template
const DEFAULT_STAGES = [
  { name: 'Discovery', probability: 20, color: '#6366f1', order: 1, isWon: false, isLost: false },
  { name: 'Demo / Evaluation', probability: 40, color: '#8b5cf6', order: 2, isWon: false, isLost: false },
  { name: 'Proposal Sent', probability: 60, color: '#3b82f6', order: 3, isWon: false, isLost: false },
  { name: 'Negotiation', probability: 80, color: '#f59e0b', order: 4, isWon: false, isLost: false },
  { name: 'Closed Won', probability: 100, color: '#10b981', order: 5, isWon: true, isLost: false },
  { name: 'Closed Lost', probability: 0, color: '#ef4444', order: 6, isWon: false, isLost: true }
];

/**
 * Seed default pipeline for organization if none exists
 */
const seedDefaultPipeline = async (organizationId) => {
  const count = await Pipeline.countDocuments({ organizationId });
  if (count === 0) {
    return await Pipeline.create({
      organizationId,
      name: 'Standard Sales Pipeline',
      description: 'Default sales cycle for products & services',
      isDefault: true,
      isActive: true,
      stages: DEFAULT_STAGES
    });
  }
  return null;
};

// ── Validation Schemas ─────────────────────────────────────────
const stageSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'Stage name is required').trim(),
  probability: z.number().min(0).max(100).default(20),
  color: z.string().default('#6366f1'),
  order: z.number().default(0),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false)
});

const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').trim(),
  description: z.string().optional().default(''),
  isDefault: z.boolean().optional().default(false),
  stages: z.array(stageSchema).optional()
});

// ============================================================
// GET ALL PIPELINES
// GET /api/v1/pipelines
// ============================================================
const getPipelines = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    await seedDefaultPipeline(orgId);

    const pipelines = await Pipeline.find({ organizationId: orgId, isActive: true })
      .sort({ isDefault: -1, createdAt: 1 });

    return ApiResponse.success(res, 'Pipelines fetched', pipelines);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET PIPELINE BY ID
// GET /api/v1/pipelines/:id
// ============================================================
const getPipelineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findOne({ _id: id, organizationId: req.organizationId });

    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    return ApiResponse.success(res, 'Pipeline fetched', pipeline);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE PIPELINE
// POST /api/v1/pipelines
// ============================================================
const createPipeline = async (req, res, next) => {
  try {
    const data = createPipelineSchema.parse(req.body);

    const existing = await Pipeline.findOne({
      organizationId: req.organizationId,
      name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') }
    });
    if (existing) {
      return ApiResponse.error(res, `Pipeline "${data.name}" already exists.`, 400);
    }

    // If marked default, unset others
    if (data.isDefault) {
      await Pipeline.updateMany(
        { organizationId: req.organizationId },
        { isDefault: false }
      );
    }

    const stages = data.stages && data.stages.length > 0 ? data.stages : DEFAULT_STAGES;

    const pipeline = await Pipeline.create({
      organizationId: req.organizationId,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault,
      stages
    });

    await logAudit({
      organizationId: req.organizationId,
      action: 'PIPELINE_CREATED',
      entity: 'Pipeline',
      entityId: pipeline._id,
      details: { name: pipeline.name, stageCount: pipeline.stages.length },
      req
    });

    return ApiResponse.created(res, 'Pipeline created successfully', pipeline);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE PIPELINE & STAGES
// PUT /api/v1/pipelines/:id
// ============================================================
const updatePipeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findOne({ _id: id, organizationId: req.organizationId });

    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    if (req.body.name && req.body.name.trim() !== pipeline.name) {
      const existing = await Pipeline.findOne({
        organizationId: req.organizationId,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${req.body.name.trim()}$`, 'i') }
      });
      if (existing) {
        return ApiResponse.error(res, `Another pipeline with name "${req.body.name}" already exists.`, 400);
      }
      pipeline.name = req.body.name.trim();
    }

    if (req.body.description !== undefined) pipeline.description = req.body.description;

    if (req.body.isDefault) {
      await Pipeline.updateMany(
        { organizationId: req.organizationId, _id: { $ne: id } },
        { isDefault: false }
      );
      pipeline.isDefault = true;
    }

    if (Array.isArray(req.body.stages) && req.body.stages.length > 0) {
      pipeline.stages = req.body.stages;
    }

    await pipeline.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'PIPELINE_UPDATED',
      entity: 'Pipeline',
      entityId: pipeline._id,
      details: { name: pipeline.name },
      req
    });

    return ApiResponse.success(res, 'Pipeline updated successfully', pipeline);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE PIPELINE
// DELETE /api/v1/pipelines/:id
// ============================================================
const deletePipeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const count = await Pipeline.countDocuments({ organizationId: req.organizationId, isActive: true });
    if (count <= 1) {
      return ApiResponse.error(res, 'Cannot delete the only active pipeline. You must have at least one pipeline.', 400);
    }

    const pipeline = await Pipeline.findOne({ _id: id, organizationId: req.organizationId });
    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    pipeline.isActive = false;
    await pipeline.save();

    // If was default, make another one default
    if (pipeline.isDefault) {
      const another = await Pipeline.findOne({ organizationId: req.organizationId, isActive: true });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    await logAudit({
      organizationId: req.organizationId,
      action: 'PIPELINE_DELETED',
      entity: 'Pipeline',
      entityId: pipeline._id,
      details: { name: pipeline.name },
      req
    });

    return ApiResponse.success(res, 'Pipeline deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// SET DEFAULT PIPELINE
// PATCH /api/v1/pipelines/:id/default
// ============================================================
const setDefaultPipeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findOne({ _id: id, organizationId: req.organizationId });
    if (!pipeline) {
      return ApiResponse.error(res, 'Pipeline not found', 404);
    }

    await Pipeline.updateMany(
      { organizationId: req.organizationId },
      { isDefault: false }
    );

    pipeline.isDefault = true;
    await pipeline.save();

    return ApiResponse.success(res, `Pipeline "${pipeline.name}" is now set as default`, pipeline);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  setDefaultPipeline,
  seedDefaultPipeline
};
