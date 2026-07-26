import { Router } from "express";
import Driver from "../models/Driver.js";
import VerificationDocument from "../models/VerificationDocument.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getIO } from "../realtime/socket.js";

const router = Router();

// Driver: create the vehicle/license profile (account must already have role "driver")
router.post("/", requireAuth, requireRole("driver"), async (req, res) => {
  const existing = await Driver.findOne({ owner: req.user.id });
  if (existing) return res.status(409).json({ error: "Driver profile already exists for this account" });

  const { vehicleType, vehicleModel, vehiclePlate, vehicleColor, licenseNumber } = req.body;
  if (!vehicleType || !vehiclePlate || !licenseNumber) {
    return res.status(400).json({ error: "vehicleType, vehiclePlate, and licenseNumber are required" });
  }

  const driver = await Driver.create({
    owner: req.user.id,
    vehicleType,
    vehicleModel,
    vehiclePlate,
    vehicleColor,
    licenseNumber,
  });
  res.status(201).json({ driver });
});

router.get("/me/profile", requireAuth, requireRole("driver"), async (req, res) => {
  const driver = await Driver.findOne({ owner: req.user.id });
  if (!driver) return res.status(404).json({ error: "No driver profile found for this account" });
  res.json({ driver });
});

router.patch("/me/profile", requireAuth, requireRole("driver"), async (req, res) => {
  const driver = await Driver.findOne({ owner: req.user.id });
  if (!driver) return res.status(404).json({ error: "No driver profile found for this account" });

  const editable = ["vehicleModel", "vehiclePlate", "vehicleColor", "licenseNumber"];
  for (const field of editable) {
    if (field in req.body) driver[field] = req.body[field];
  }
  await driver.save();
  res.json({ driver });
});

// Driver: go online/offline. Must be verified first (checked by an admin).
router.patch("/me/status", requireAuth, requireRole("driver"), async (req, res) => {
  const driver = await Driver.findOne({ owner: req.user.id });
  if (!driver) return res.status(404).json({ error: "No driver profile found for this account" });
  if (req.body.isOnline && driver.verificationStatus !== "verified") {
    return res.status(403).json({ error: "Your license/vehicle must be verified before you can go online" });
  }
  if (driver.isSuspended) return res.status(403).json({ error: "Your driver account is suspended" });

  driver.isOnline = Boolean(req.body.isOnline);
  await driver.save();
  res.json({ driver });
});

// Driver: push a GPS ping. Persists the location and relays it live to
// whoever is watching this ride (tourist + admin), plus the admin fleet map.
router.post("/me/location", requireAuth, requireRole("driver"), async (req, res) => {
  const { lat, lng, rideId } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat and lng (numbers) are required" });
  }

  const driver = await Driver.findOne({ owner: req.user.id });
  if (!driver) return res.status(404).json({ error: "No driver profile found for this account" });

  driver.currentLocation = { type: "Point", coordinates: [lng, lat] };
  driver.locationUpdatedAt = new Date();
  await driver.save();

  const payload = { driverId: driver._id, lat, lng, at: driver.locationUpdatedAt };
  const io = getIO();
  if (rideId) io.to(`ride:${rideId}`).emit("driver:location", { ...payload, rideId });
  io.to("admin:live").emit("driver:location", payload);

  res.json({ ok: true });
});

// Any authenticated user: nearby online/verified drivers (used for ride
// matching internally, and handy for debugging/support tooling).
router.get("/nearby", requireAuth, async (req, res) => {
  const { lat, lng, radiusMeters = 5000, vehicleType } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng query params are required" });

  const filter = {
    isOnline: true,
    isSuspended: false,
    verificationStatus: "verified",
    currentLocation: {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusMeters),
      },
    },
  };
  if (vehicleType) filter.vehicleType = vehicleType;

  const drivers = await Driver.find(filter).limit(20).populate("owner", "name phone");
  res.json({ count: drivers.length, results: drivers });
});

// Driver: submit a KYC document (driving license, vehicle registration, insurance)
router.post("/me/verification-documents", requireAuth, requireRole("driver"), async (req, res) => {
  const driver = await Driver.findOne({ owner: req.user.id });
  if (!driver) return res.status(404).json({ error: "No driver profile found for this account" });

  const { type, fileUrl, issuedBy, expiresAt } = req.body;
  if (!type || !fileUrl) return res.status(400).json({ error: "type and fileUrl are required" });

  const doc = await VerificationDocument.create({
    driver: driver._id,
    type,
    fileUrl,
    issuedBy,
    expiresAt,
    status: "pending",
  });

  driver.verificationStatus = "pending";
  await driver.save();

  res.status(201).json({ document: doc });
});

export default router;
