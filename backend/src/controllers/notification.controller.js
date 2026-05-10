const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// Get all notifications for a user
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (notification.recipient.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }

  notification.isRead = true;
  await notification.save();

  res.json({
    success: true,
    data: notification
  });
});

// Mark all as read
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
