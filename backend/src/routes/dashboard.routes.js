const express = require("express");
const {
  getFarmerStats,
  getFarmerRecentOrders,
  getFarmerTopProducts,
  getAdminNotifications,
  getAdminLogs,
} = require("../controllers/dashboard.controller");
const { protect } = require("../middleware/auth.middleware");
const { farmerOnly, adminOnly } = require("../middleware/role.middleware");

const router = express.Router();

router.get("/farmer/stats", protect, farmerOnly, getFarmerStats);
router.get("/farmer/recent-orders", protect, farmerOnly, getFarmerRecentOrders);
router.get("/farmer/top-products", protect, farmerOnly, getFarmerTopProducts);
router.get("/admin/notifications", protect, adminOnly, getAdminNotifications);
router.get("/admin/logs", protect, adminOnly, getAdminLogs);

module.exports = router;
