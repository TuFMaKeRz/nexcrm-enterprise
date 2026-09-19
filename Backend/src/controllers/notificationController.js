const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');

// Helper to trigger a notification programmatically
const triggerNotification = async ({
  organizationId,
  recipient,
  title,
  message,
  type = 'general',
  relatedEntity = { entityType: 'General' },
  link = '',
  metadata = {}
}) => {
  try {
    if (!organizationId || !recipient) return null;

    const notif = await Notification.create({
      organizationId,
      recipient,
      title,
      message,
      type,
      relatedEntity,
      link,
      metadata
    });

    return notif;
  } catch (err) {
    console.error('Error triggering notification:', err);
    return null;
  }
};

// ============================================================
// GET NOTIFICATIONS FOR CURRENT USER
// GET /api/v1/notifications
// ============================================================
const getNotifications = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;
    const { isRead, limit = 20, page = 1 } = req.query;

    const filter = {
      organizationId: orgId,
      recipient: userId
    };

    if (isRead !== undefined && isRead !== 'all') {
      filter.isRead = isRead === 'true' || isRead === true;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ organizationId: orgId, recipient: userId, isRead: false })
    ]);

    return ApiResponse.success(res, 'Notifications fetched', {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET UNREAD NOTIFICATIONS COUNT
// GET /api/v1/notifications/unread-count
// ============================================================
const getUnreadCount = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      organizationId: orgId,
      recipient: userId,
      isRead: false
    });

    return ApiResponse.success(res, 'Unread count fetched', { unreadCount: count });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// MARK NOTIFICATION AS READ
// PATCH /api/v1/notifications/:id/read
// ============================================================
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id, organizationId: req.organizationId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notif) {
      return ApiResponse.error(res, 'Notification not found', 404);
    }

    return ApiResponse.success(res, 'Marked as read', notif);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// MARK ALL AS READ
// PATCH /api/v1/notifications/mark-all-read
// ============================================================
const markAllAsRead = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;

    await Notification.updateMany(
      { organizationId: orgId, recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return ApiResponse.success(res, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE NOTIFICATION
// DELETE /api/v1/notifications/:id
// ============================================================
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user._id,
      organizationId: req.organizationId
    });

    if (!notif) {
      return ApiResponse.error(res, 'Notification not found', 404);
    }

    return ApiResponse.success(res, 'Notification removed');
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE MANUAL / BROADCAST NOTIFICATION
// POST /api/v1/notifications
// ============================================================
const createManualNotification = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { recipient, title, message, type = 'general', link, relatedEntity } = req.body;

    const notif = await triggerNotification({
      organizationId: orgId,
      recipient: recipient || req.user._id,
      title,
      message,
      type,
      link,
      relatedEntity
    });

    return ApiResponse.created(res, 'Notification created', notif);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createManualNotification
};
