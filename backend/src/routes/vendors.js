import { Router } from "express";
import Vendor from "../models/Vendor.js";
import Listing from "../models/Listing.js";
import Booking from "../models/Booking.js";
import VerificationDocument from "../models/VerificationDocument.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public: view a vendor's public profile + badges
router.get("/:id", async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  const listings = await Listing.find({ vendor: vendor._id, isActive: true });
  res.json({ vendor, listings });
});

// Vendor: my profile
router.get("/me/profile", requireAuth, requireRole("vendor"), async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user.id });
  if (!vendor) return res.status(404).json({ error: "No vendor profile found" });
  res.json({ vendor });
});

router.patch("/me/profile", requireAuth, requireRole("vendor"), async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user.id });
  if (!vendor) return res.status(404).json({ error: "No vendor profile found" });
  const { businessName, description, contactPhone, contactEmail, website } = req.body;
  Object.assign(vendor, { businessName, description, contactPhone, contactEmail, website });
  await vendor.save();
  res.json({ vendor });
});

// Vendor: submit a verification document (KYC) — sets status to "pending"
router.post("/me/verification-documents", requireAuth, requireRole("vendor"), async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user.id });
  if (!vendor) return res.status(404).json({ error: "No vendor profile found" });

  const { type, fileUrl, issuedBy, expiresAt } = req.body;
  const doc = await VerificationDocument.create({
    vendor: vendor._id,
    type,
    fileUrl,
    issuedBy,
    expiresAt,
    status: "pending",
  });

  vendor.verificationStatus = "pending";
  await vendor.save();

  res.status(201).json({ document: doc });
});

// Vendor: dashboard summary — availability, bookings, ratings
router.get("/me/dashboard", requireAuth, requireRole("vendor"), async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user.id });
  if (!vendor) return res.status(404).json({ error: "No vendor profile found" });

  const [listings, bookings] = await Promise.all([
    Listing.find({ vendor: vendor._id }),
    Booking.find({ vendor: vendor._id }).sort("-createdAt").limit(20).populate("listing", "title"),
  ]);

  const upcoming = bookings.filter((b) => ["pending_confirmation", "confirmed"].includes(b.status));
  const revenueConfirmed = bookings
    .filter((b) => ["confirmed", "completed"].includes(b.status))
    .reduce((sum, b) => sum + b.totalPrice, 0);

  res.json({
    vendor,
    listingCount: listings.length,
    upcomingBookings: upcoming.length,
    revenueConfirmed,
    recentBookings: bookings,
  });
});

export default router;
