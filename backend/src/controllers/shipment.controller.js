const Shipment = require("../models/Shipment");
const Order = require("../models/Order");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { createShiprocketOrder, trackShiprocketOrder } = require("../utils/shiprocket");

const createShipment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId).populate("product").populate("retailer");
  if (!order) throw new AppError("Order not found", 404);

  // Check if shipment already exists
  const existingShipment = await Shipment.findOne({ order: orderId });
  if (existingShipment) throw new AppError("Shipment already exists for this order", 400);

  // Prepare Shiprocket Order Data (simplified)
  const srOrderData = {
    order_id: order._id,
    order_date: order.createdAt,
    pickup_location: "Primary",
    billing_customer_name: order.retailer.name,
    billing_last_name: "",
    billing_address: order.deliveryAddress || "N/A",
    billing_city: "City",
    billing_pincode: "110001",
    billing_state: "State",
    billing_country: "India",
    billing_email: order.retailer.email,
    billing_phone: order.phone || "9999999999",
    order_items: [
      {
        name: order.product.name,
        sku: order.product._id,
        units: order.quantity,
        selling_price: order.product.price,
      },
    ],
    payment_method: "Prepaid",
    sub_total: order.totalPrice,
    length: 10,
    breadth: 10,
    height: 10,
    weight: order.quantity,
  };

  const srResponse = await createShiprocketOrder(srOrderData);

  const shipment = await Shipment.create({
    order: orderId,
    farmer: order.farmer,
    retailer: order.retailer,
    carrier: "Shiprocket",
    trackingId: srResponse.shipment_id || "SR" + Math.random().toString(36).substring(2, 9).toUpperCase(),
    shiprocketOrderId: srResponse.order_id,
    shiprocketShipmentId: srResponse.shipment_id,
    status: "Accepted",
    history: [
      {
        status: "Accepted",
        location: "System",
        message: "Order accepted by farmer and shipment initiated via Shiprocket.",
      },
    ],
  });

  res.status(201).json({ success: true, data: shipment });
});

const getMyShipments = asyncHandler(async (req, res) => {
  const query = req.user.role === "farmer" ? { farmer: req.user._id } : { retailer: req.user._id };
  const shipments = await Shipment.find(query)
    .populate({
      path: "order",
      populate: { path: "product", select: "name unit" }
    })
    .populate("farmer", "name")
    .populate("retailer", "name")
    .sort("-createdAt");
    
  res.json({ success: true, count: shipments.length, data: shipments });
});

const getTrackingDetails = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) throw new AppError("Shipment not found", 404);

  // Fetch real-time data from Shiprocket
  const tracking = await trackShiprocketOrder(shipment.shiprocketShipmentId);
  
  res.json({ success: true, data: { shipment, tracking } });
});

module.exports = {
  createShipment,
  getMyShipments,
  getTrackingDetails
};
