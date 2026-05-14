const AppError = require("./AppError");

let cachedToken = null;
let tokenExpiry = null;

const getShiprocketToken = async () => {
  // Check if token is still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const mode = process.env.SHIPROCKET_MODE || "DEMO";

  if (mode === "DEMO" || !email || !password || email.includes("example.com")) {
    console.warn(`Shiprocket ${mode === "DEMO" ? "DEMO" : "Simulation"} mode active.`);
    return "SIMULATED_TOKEN";
  }

  try {
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Shiprocket authentication failed");
    }

    cachedToken = data.token;
    // Shiprocket tokens usually last 10 days, but we'll refresh daily
    tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    return cachedToken;
  } catch (error) {
    console.error("Shiprocket Auth Error:", error.message);
    return "SIMULATED_TOKEN";
  }
};

const createShiprocketOrder = async (orderData) => {
  const token = await getShiprocketToken();
  
  if (token === "SIMULATED_TOKEN") {
    return {
      order_id: "SR-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      shipment_id: "SHIP-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      status: "NEW",
      is_simulated: true
    };
  }

  try {
    // For production, you'd map our Order data to Shiprocket's expected format
    // Ref: https://shiprocket.readme.io/reference/createadhocorder
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Shiprocket Create Order Error:", error.message);
    return { error: error.message, is_simulated: true };
  }
};

const trackShiprocketOrder = async (shipmentId) => {
  const token = await getShiprocketToken();
  
  if (token === "SIMULATED_TOKEN" || !shipmentId) {
    const statuses = ["Picked Up", "In Transit", "Reached Hub", "Out for Delivery", "Delivered"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      tracking_data: {
        track_status: 1,
        shipment_status: randomStatus,
        shipment_track: [
          {
            status: randomStatus,
            location: "Logistics Center, Mumbai",
            date: new Date().toISOString(),
            activity: `Package status updated to ${randomStatus}`
          },
          {
            status: "Picked Up",
            location: "Farmer Pickup Point",
            date: new Date(Date.now() - 86400000).toISOString(),
            activity: "Shipment picked up by courier partner"
          }
        ]
      }
    };
  }

  try {
    const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error("Shiprocket Tracking Error:", error.message);
    return { error: error.message };
  }
};

module.exports = {
  getShiprocketToken,
  createShiprocketOrder,
  trackShiprocketOrder
};
