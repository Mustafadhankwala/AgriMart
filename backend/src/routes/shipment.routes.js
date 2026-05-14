const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { 
  createShipment, 
  getMyShipments, 
  getTrackingDetails 
} = require("../controllers/shipment.controller");

router.use(protect);

router.post("/", createShipment);
router.get("/my", getMyShipments);
router.get("/:id/track", getTrackingDetails);

module.exports = router;
