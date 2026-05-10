const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 * @param {string} recipient - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Type (order, system, inventory)
 * @param {string} link - Optional deep link
 */
const createNotification = async (recipient, title, message, type = 'system', link = '') => {
  try {
    await Notification.create({
      recipient,
      title,
      message,
      type,
      link
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

module.exports = { createNotification };
