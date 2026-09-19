const { z } = require('zod');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

// ── Validation Schema ──────────────────────────────────────────
const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').trim(),
  description: z.string().optional().default(''),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  status: z.enum(['To Do', 'In Progress', 'Completed', 'Cancelled']).default('To Do'),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  relatedTo: z.object({
    model: z.enum(['Lead', 'Customer', 'Deal', 'General']).default('General'),
    id: z.string().optional().nullable()
  }).optional().default({ model: 'General', id: null }),
  tags: z.array(z.string()).optional().default([])
});

// Helper to enrich related entity title
const enrichRelatedEntities = async (tasks, organizationId) => {
  const leadIds = [];
  const customerIds = [];
  const dealIds = [];

  tasks.forEach((t) => {
    if (t.relatedTo?.id) {
      if (t.relatedTo.model === 'Lead') leadIds.push(t.relatedTo.id);
      else if (t.relatedTo.model === 'Customer') customerIds.push(t.relatedTo.id);
      else if (t.relatedTo.model === 'Deal') dealIds.push(t.relatedTo.id);
    }
  });

  const [leads, customers, deals] = await Promise.all([
    leadIds.length > 0 ? Lead.find({ _id: { $in: leadIds }, organizationId }).select('firstName lastName company') : [],
    customerIds.length > 0 ? Customer.find({ _id: { $in: customerIds }, organizationId }).select('companyName') : [],
    dealIds.length > 0 ? Deal.find({ _id: { $in: dealIds }, organizationId }).select('title value') : []
  ]);

  const leadMap = {};
  leads.forEach((l) => { leadMap[l._id.toString()] = `${l.firstName} ${l.lastName || ''} (${l.company || 'Lead'})`.trim(); });

  const customerMap = {};
  customers.forEach((c) => { customerMap[c._id.toString()] = c.companyName; });

  const dealMap = {};
  deals.forEach((d) => { dealMap[d._id.toString()] = d.title; });

  return tasks.map((t) => {
    const doc = t.toObject ? t.toObject() : t;
    let relatedName = null;
    if (doc.relatedTo?.id) {
      const idStr = doc.relatedTo.id.toString();
      if (doc.relatedTo.model === 'Lead') relatedName = leadMap[idStr];
      else if (doc.relatedTo.model === 'Customer') relatedName = customerMap[idStr];
      else if (doc.relatedTo.model === 'Deal') relatedName = dealMap[idStr];
    }
    return { ...doc, relatedName };
  });
};

// ============================================================
// GET TASKS
// GET /api/v1/tasks
// ============================================================
const getTasks = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const {
      status, priority, assignedTo, relatedModel,
      relatedId, search, page, limit
    } = req.query;

    const filter = { organizationId: orgId, isArchived: false };

    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (relatedModel && relatedModel !== 'all') filter['relatedTo.model'] = relatedModel;
    if (relatedId) filter['relatedTo.id'] = relatedId;

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } }
      ];
    }

    const query = Task.find(filter)
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email')
      .sort({ dueDate: 1, priority: -1, createdAt: -1 });

    if (page && limit) {
      const skip = (Number(page) - 1) * Number(limit);
      const [tasks, total] = await Promise.all([
        query.skip(skip).limit(Number(limit)),
        Task.countDocuments(filter)
      ]);

      const enriched = await enrichRelatedEntities(tasks, orgId);

      return ApiResponse.success(res, 'Tasks fetched', {
        tasks: enriched,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    }

    const tasks = await query;
    const enriched = await enrichRelatedEntities(tasks, orgId);

    return ApiResponse.success(res, 'Tasks fetched', { tasks: enriched });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET TASK STATS
// GET /api/v1/tasks/stats
// ============================================================
const getTaskStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const [total, todo, inProgress, completed, overdue, urgent] = await Promise.all([
      Task.countDocuments({ organizationId: orgId, isArchived: false }),
      Task.countDocuments({ organizationId: orgId, isArchived: false, status: 'To Do' }),
      Task.countDocuments({ organizationId: orgId, isArchived: false, status: 'In Progress' }),
      Task.countDocuments({ organizationId: orgId, isArchived: false, status: 'Completed' }),
      Task.countDocuments({
        organizationId: orgId,
        isArchived: false,
        status: { $in: ['To Do', 'In Progress'] },
        dueDate: { $lt: new Date() }
      }),
      Task.countDocuments({
        organizationId: orgId,
        isArchived: false,
        status: { $in: ['To Do', 'In Progress'] },
        priority: 'Urgent'
      })
    ]);

    return ApiResponse.success(res, 'Task stats fetched', {
      total,
      todo,
      inProgress,
      completed,
      overdue,
      urgent
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE TASK
// POST /api/v1/tasks
// ============================================================
const createTask = async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const orgId = req.organizationId;

    const task = await Task.create({
      organizationId: orgId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assignedTo: data.assignedTo || req.user._id,
      createdBy: req.user._id,
      relatedTo: {
        model: data.relatedTo?.model || 'General',
        id: data.relatedTo?.id || null
      },
      tags: data.tags
    });

    await logAudit({
      organizationId: orgId,
      action: 'TASK_CREATED',
      entity: 'Task',
      entityId: task._id,
      details: { title: task.title, priority: task.priority, dueDate: task.dueDate },
      req
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    return ApiResponse.created(res, 'Task created successfully', populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 1-CLICK TOGGLE COMPLETION
// PATCH /api/v1/tasks/:id/complete
// ============================================================
const toggleTaskComplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ _id: id, organizationId: req.organizationId });

    if (!task) {
      return ApiResponse.error(res, 'Task not found', 404);
    }

    const isNowCompleted = task.status !== 'Completed';
    task.status = isNowCompleted ? 'Completed' : 'To Do';
    task.completedAt = isNowCompleted ? new Date() : null;

    await task.save();

    await logAudit({
      organizationId: req.organizationId,
      action: isNowCompleted ? 'TASK_COMPLETED' : 'TASK_REOPENED',
      entity: 'Task',
      entityId: task._id,
      details: { title: task.title, status: task.status },
      req
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    return ApiResponse.success(res, `Task marked as ${task.status}`, populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE TASK
// PUT /api/v1/tasks/:id
// ============================================================
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ _id: id, organizationId: req.organizationId });

    if (!task) {
      return ApiResponse.error(res, 'Task not found', 404);
    }

    const allowedFields = [
      'title', 'description', 'priority', 'status',
      'dueDate', 'assignedTo', 'relatedTo', 'tags'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'dueDate') {
          task.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
        } else {
          task[field] = req.body[field];
        }
      }
    }

    if (req.body.status === 'Completed' && !task.completedAt) {
      task.completedAt = new Date();
    } else if (req.body.status && req.body.status !== 'Completed') {
      task.completedAt = null;
    }

    await task.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'TASK_UPDATED',
      entity: 'Task',
      entityId: task._id,
      details: { title: task.title },
      req
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    return ApiResponse.success(res, 'Task updated successfully', populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE TASK
// DELETE /api/v1/tasks/:id
// ============================================================
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ _id: id, organizationId: req.organizationId });

    if (!task) {
      return ApiResponse.error(res, 'Task not found', 404);
    }

    task.isArchived = true;
    await task.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'TASK_ARCHIVED',
      entity: 'Task',
      entityId: task._id,
      details: { title: task.title },
      req
    });

    return ApiResponse.success(res, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskStats,
  createTask,
  toggleTaskComplete,
  updateTask,
  deleteTask
};
