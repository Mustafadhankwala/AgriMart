const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) throw new AppError("User not found", 404);
  res.json({ success: true, data: user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError("User not found", 404);

  const allowedUpdates = [
    "name", "email", "phone", "location", 
    "farmName", "farmSize", "primaryCrops", "certification",
    "marketArea", "preferredCategory", "address"
  ];
  
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  const updatedUser = await user.save();
  res.json({ success: true, data: updatedUser });
});

const { logAdminAction } = require("../utils/logger");

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.json({ success: true, count: users.length, data: users });
});

const getFarmers = asyncHandler(async (req, res) => {
  const farmers = await User.find({ role: "farmer" }).select("-password");
  res.json({ success: true, count: farmers.length, data: farmers });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const oldRole = user.role;
  const allowedUpdates = {};
  ["name", "email", "role", "status"].forEach((field) => {
    if (req.body[field] !== undefined) allowedUpdates[field] = req.body[field];
  });

  const updatedUser = await User.findByIdAndUpdate(req.params.id, allowedUpdates, {
    returnDocument: "after",
    runValidators: true,
  }).select("-password");

  if (req.user.role === 'admin') {
    await logAdminAction(
      req.user._id,
      "UPDATE_USER",
      "User",
      user._id,
      `Changed role from ${oldRole} to ${updatedUser.role}`
    );
  }

  res.json({ success: true, data: updatedUser });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  await User.findByIdAndDelete(req.params.id);

  if (req.user.role === 'admin') {
    await logAdminAction(
      req.user._id,
      "DELETE_USER",
      "User",
      user._id,
      `Deleted user: ${user.name} (${user.email})`
    );
  }

  res.json({ success: true, message: "User deleted" });
});

const getTestimonials = asyncHandler(async (req, res) => {
  // Get 3 random users who are either farmers or retailers
  const testimonials = await User.aggregate([
    { $match: { role: { $in: ["farmer", "retailer"] } } },
    { $sample: { size: 3 } },
    { $project: { name: 1, role: 1, _id: 0 } },
  ]);

  res.json({ success: true, data: testimonials });
});

module.exports = {
  getUsers,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  getFarmers,
  getTestimonials,
};
