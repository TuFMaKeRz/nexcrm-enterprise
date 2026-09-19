const express = require('express');
const router = express.Router();

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createManualNotification
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');

router.use(protect);
router.use(requireTenant);

router.get('/',                       getNotifications);
router.get('/unread-count',           getUnreadCount);
router.patch('/mark-all-read',        markAllAsRead);
router.patch('/:id/read',             markAsRead);
router.delete('/:id',                 deleteNotification);
router.post('/',                      createManualNotification);

module.exports = router;
