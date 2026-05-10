const AuditLog = require("../models/AuditLog");

const logAdminAction = async (adminId, action, targetType, targetId, details) => {
  try {
    await AuditLog.create({
      admin: adminId,
      action,
      targetType,
      targetId,
      details,
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
};

module.exports = { logAdminAction };
