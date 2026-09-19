const crypto = require('crypto');
const WebhookSubscription = require('../models/WebhookSubscription');
const WebhookDeliveryLog = require('../models/WebhookDeliveryLog');
const ApiResponse = require('../utils/apiResponse');
const { sendTestPing } = require('../services/webhookDispatcher');

const AVAILABLE_WEBHOOK_EVENTS = [
  { id: 'lead.created', name: 'Lead Created', description: 'Triggered whenever a new lead is created (form, API, or manual)' },
  { id: 'lead.updated', name: 'Lead Updated', description: 'Triggered when lead status, score, or details change' },
  { id: 'lead.converted', name: 'Lead Converted', description: 'Triggered when a lead is converted into a Customer Account' },
  { id: 'deal.created', name: 'Deal Created', description: 'Triggered when a new deal enters the sales pipeline' },
  { id: 'deal.stage_changed', name: 'Deal Stage Changed', description: 'Triggered when a deal advances across Kanban stages' },
  { id: 'deal.won', name: 'Deal Won', description: 'Triggered when a deal is closed won' },
  { id: 'deal.lost', name: 'Deal Lost', description: 'Triggered when a deal is marked closed lost' },
  { id: 'quotation.approved', name: 'Quotation Approved', description: 'Triggered when a customer or manager approves a quote' },
  { id: 'invoice.created', name: 'Invoice Created', description: 'Triggered when a commercial invoice is issued' },
  { id: 'payment.received', name: 'Payment Recorded', description: 'Triggered when a customer payment is received & logged' }
];

// ============================================================
// 1. GET WEBHOOK SUBSCRIPTIONS
// GET /api/v1/webhooks
// ============================================================
const getWebhooks = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const webhooks = await WebhookSubscription.find({ organizationId: orgId }).sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Webhook subscriptions fetched', {
      webhooks,
      availableEvents: AVAILABLE_WEBHOOK_EVENTS,
      totalWebhooks: webhooks.length
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. CREATE WEBHOOK SUBSCRIPTION
// POST /api/v1/webhooks
// ============================================================
const createWebhook = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { name, targetUrl, events } = req.body;

    if (!targetUrl) {
      return ApiResponse.error(res, 'Target webhook URL is required', 400);
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return ApiResponse.error(res, 'At least one webhook event subscription is required', 400);
    }

    const secretKey = crypto.randomBytes(24).toString('hex');

    const webhook = await WebhookSubscription.create({
      organizationId: orgId,
      name: name || 'Outbound Webhook',
      targetUrl,
      secretKey,
      events,
      isActive: true,
      createdBy: req.user._id
    });

    return ApiResponse.created(res, 'Webhook subscription created successfully', webhook);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. UPDATE WEBHOOK SUBSCRIPTION
// PUT /api/v1/webhooks/:id
// ============================================================
const updateWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const { name, targetUrl, events, isActive } = req.body;

    const update = {};
    if (name) update.name = name;
    if (targetUrl) update.targetUrl = targetUrl;
    if (events) update.events = events;
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const webhook = await WebhookSubscription.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!webhook) {
      return ApiResponse.error(res, 'Webhook subscription not found', 404);
    }

    return ApiResponse.success(res, 'Webhook subscription updated', webhook);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. DELETE WEBHOOK SUBSCRIPTION
// DELETE /api/v1/webhooks/:id
// ============================================================
const deleteWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const webhook = await WebhookSubscription.findOneAndDelete({ _id: id, organizationId: orgId });
    if (!webhook) {
      return ApiResponse.error(res, 'Webhook subscription not found', 404);
    }

    await WebhookDeliveryLog.deleteMany({ subscriptionId: id });

    return ApiResponse.success(res, 'Webhook subscription deleted');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. SEND TEST PING TO WEBHOOK ENDPOINT
// POST /api/v1/webhooks/:id/test-ping
// ============================================================
const triggerTestPing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const webhook = await WebhookSubscription.findOne({ _id: id, organizationId: orgId });
    if (!webhook) {
      return ApiResponse.error(res, 'Webhook subscription not found', 404);
    }

    const testResult = await sendTestPing(webhook);

    return ApiResponse.success(res, 'Test ping dispatched to webhook endpoint', testResult);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. GET WEBHOOK DELIVERY LOGS
// GET /api/v1/webhooks/logs
// ============================================================
const getWebhookLogs = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { subscriptionId, limit = 50 } = req.query;

    const query = { organizationId: orgId };
    if (subscriptionId) query.subscriptionId = subscriptionId;

    const logs = await WebhookDeliveryLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return ApiResponse.success(res, 'Webhook delivery logs fetched', {
      logs,
      totalLogs: logs.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  triggerTestPing,
  getWebhookLogs,
  AVAILABLE_WEBHOOK_EVENTS
};
