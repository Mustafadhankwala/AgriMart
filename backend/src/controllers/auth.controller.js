const User = require("../models/User.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new AppError("User already exists", 409);
  }

  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  const adminExists = await User.findOne({ role: "admin" });

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    status: role === "admin" && adminExists ? "pending" : "active",
  });

  const responseData = {
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  if (user.status === "active") {
    responseData.token = generateToken(user._id);
  } else {
    responseData.message = "Your account is pending approval by an existing admin.";
  }

  res.status(201).json(responseData);
});
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    if (user.status === "pending") {
      throw new AppError("Your account is pending approval by an admin.", 403);
    }
    if (user.status === "rejected") {
      throw new AppError("Your account request has been rejected.", 403);
    }

    return res.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      token: generateToken(user._id),
    });
  }

  throw new AppError("Invalid email or password", 401);
});

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT secret is not configured", 500);
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

module.exports = {
  registerUser,
  loginUser
};
