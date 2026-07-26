import { Router } from "express";
import Vendor from "../models/Vendor.js";
import VerificationDocument from "../models/VerificationDocument.js";
import Dispute from "../models/Dispute.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Driver from "../models/Driver.js";
import Ride from "../models/Ride.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

// --- Vendor verification queue ---
router.get("/verification-queue", async (req, res) => {
  const vendors = await Vendor.find({ verificationStatus: "pending" }).populate("owner", "name email");
  const docsByVendor = await VerificationDocument.find({
    vendor: { $in: vendors.map((v) => v._id) },
    status: "pending",
  });
  res.json({ vendors, documents: docsByVendor });
});

// --- Driver verification queue (license + vehicle docs) ---
router.get("/driver-verification-queue", async (req, res) => {
  const drivers = await Driver.find({ verificationStatus: "pending" }).populate("owner", "name email phone");
  const docsByDriver = await VerificationDocument.find({
    driver: { $in: drivers.map((d) => d._id) },
    status: "pending",
  });
  res.json({ drivers, documents: docsByDriver });
});

router.patch("/verification-documents/:id", async (req, res) => {
  const { status, reviewNotes } = req.body; // approved | rejected
  const doc = await VerificationDocument.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  doc.status = status;
  doc.reviewNotes = reviewNotes;
  doc.reviewedBy = req.user.id;
  await doc.save();

  if (status === "approved" && doc.vendor) {
    const vendor = await Vendor.findById(doc.vendor);
    if (!vendor.verificationBadges.includes(doc.type)) {
      vendor.verificationBadges.push(doc.type);
    }
    // A vendor becomes fully "verified" once it holds at least one core badge.
    vendor.verificationStatus = "verified";
    await vendor.save();
  }

  if (status === "approved" && doc.driver) {
    // A driver becomes verified (and can go online) once any core doc clears.
    await Driver.findByIdAndUpdate(doc.driver, { verificationStatus: "verified" });
  }

  res.json({ document: doc });
});

router.patch("/vendors/:id/suspend", async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  vendor.isSuspended = req.body.isSuspended;
  await vendor.save();
  res.json({ vendor });
});

router.patch("/vendors/:id/fraud-score", async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  vendor.fraudScore = req.body.fraudScore;
  await vendor.save();
  res.json({ vendor });
});

// --- Taxi fleet: manage all drivers, verification, and live rides ---
router.get("/taxi/drivers", async (req, res) => {
  const drivers = await Driver.find().populate("owner", "name email phone").sort("-createdAt");
  res.json({ drivers });
});

router.patch("/taxi/drivers/:id/verification", async (req, res) => {
  const { status } = req.body; // verified | rejected | pending | unverified
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  driver.verificationStatus = status;
  await driver.save();
  res.json({ driver });
});

router.patch("/taxi/drivers/:id/suspend", async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  driver.isSuspended = Boolean(req.body.isSuspended);
  if (driver.isSuspended) driver.isOnline = false;
  await driver.save();
  res.json({ driver });
});

router.get("/taxi/rides", async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const rides = await Ride.find(filter)
    .sort("-createdAt")
    .limit(100)
    .populate("tourist", "name phone")
    .populate({ path: "driver", populate: { path: "owner", select: "name phone" } });
  res.json({ rides });
});

// --- Disputes ---
router.get("/disputes", async (req, res) => {
  const disputes = await Dispute.find(req.query.status ? { status: req.query.status } : {})
    .populate("booking")
    .populate("raisedBy", "name email")
    .populate("against", "businessName")
    .sort("-createdAt");
  res.json({ disputes });
});

router.patch("/disputes/:id", async (req, res) => {
  const { status, resolution, refundAmount } = req.body;
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return res.status(404).json({ error: "Dispute not found" });

  dispute.status = status;
  if (resolution) dispute.resolution = resolution;
  if (refundAmount !== undefined) dispute.refundAmount = refundAmount;
  dispute.resolvedBy = req.user.id;
  await dispute.save();

  res.json({ dispute });
});

// --- Analytics / reporting ---
router.get("/analytics/overview", async (req, res) => {
  const [
    userCount,
    vendorCount,
    verifiedVendorCount,
    listingCount,
    bookingStats,
    openDisputes,
    driverCount,
    onlineDriverCount,
    rideStats,
  ] = await Promise.all([
    User.countDocuments({ role: "tourist" }),
    Vendor.countDocuments(),
    Vendor.countDocuments({ verificationStatus: "verified" }),
    Listing.countDocuments({ isActive: true }),
    Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
    ]),
    Dispute.countDocuments({ status: { $in: ["open", "investigating"] } }),
    Driver.countDocuments(),
    Driver.countDocuments({ isOnline: true, isSuspended: false }),
    Ride.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, revenue: { $sum: "$fareFinal" } } },
    ]),
  ]);

  res.json({
    touristCount: userCount,
    vendorCount,
    verifiedVendorCount,
    listingCount,
    bookingsByStatus: bookingStats,
    openDisputes,
    driverCount,
    onlineDriverCount,
    ridesByStatus: rideStats,
  });
});

export default router;
