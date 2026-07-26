import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import TouristProfile from "../models/TouristProfile.js";
import Vendor from "../models/Vendor.js";
import Driver from "../models/Driver.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// Register as a tourist
router.post("/register/tourist", async (req, res) => {
  const { name, email, password, preferredLanguage, interests, nationality } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password are required" });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const user = new User({ name, email, role: "tourist", preferredLanguage });
  await user.setPassword(password);
  await user.save();

  await TouristProfile.create({ user: user._id, interests, nationality });

  res.status(201).json({ user: user.toSafeJSON(), token: signToken(user) });
});

// Register as a vendor (business) — starts in "unverified" status
router.post("/register/vendor", async (req, res) => {
  const { name, email, password, businessName, category, contactPhone } = req.body;
  if (!name || !email || !password || !businessName || !category) {
    return res.status(400).json({ error: "name, email, password, businessName, category are required" });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const user = new User({ name, email, role: "vendor" });
  await user.setPassword(password);
  await user.save();

  const vendor = await Vendor.create({
    owner: user._id,
    businessName,
    category,
    contactPhone,
    contactEmail: email,
  });

  res.status(201).json({ user: user.toSafeJSON(), vendor, token: signToken(user) });
});

// Register as a taxi driver — starts in "unverified" status; must be
// verified by an admin (license + vehicle docs) before going online.
router.post("/register/driver", async (req, res) => {
  const { name, email, password, phone, vehicleType, vehiclePlate, vehicleModel, vehicleColor, licenseNumber } = req.body;
  if (!name || !email || !password || !vehicleType || !vehiclePlate || !licenseNumber) {
    return res.status(400).json({ error: "name, email, password, vehicleType, vehiclePlate, licenseNumber are required" });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const user = new User({ name, email, phone, role: "driver" });
  await user.setPassword(password);
  await user.save();

  const driver = await Driver.create({
    owner: user._id,
    vehicleType,
    vehiclePlate,
    vehicleModel,
    vehicleColor,
    licenseNumber,
  });

  res.status(201).json({ user: user.toSafeJSON(), driver, token: signToken(user) });
});

// Login (all roles)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await user.checkPassword(password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  user.lastLoginAt = new Date();
  await user.save();

  res.json({ user: user.toSafeJSON(), token: signToken(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: user.toSafeJSON() });
});

export default router;
