const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    retailer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trackingId: {
      type: String,
      unique: true,
    },
    carrier: {
      type: String,
      default: "Shiprocket",
    },
    status: {
      type: String,
      default: "Pending",
    },
    currentLocation: {
      type: String,
      default: "Warehouse",
    },
    estimatedDelivery: Date,
    shiprocketOrderId: String,
    shiprocketShipmentId: String,
    history: [
      {
        status: String,
        location: String,
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shipment", shipmentSchema);
