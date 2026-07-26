import { Router } from "express";
import Review from "../models/Review.js";
import Listing from "../models/Listing.js";
import Vendor from "../models/Vendor.js";
import Booking from "../models/Booking.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Simple content moderation heuristic: flag reviews containing banned terms
// or suspicious contact-sharing patterns, so admins can prioritize their queue.
const BANNED_PATTERNS = [/\bwhatsapp\b.*\d{7,}/i, /\bscam\b/i, /\bfraud\b/i];

router.post("/", requireAuth, requireRole("tourist"), async (req, res) => {
  const { listingId, bookingId, rating, comment, photos } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  if (bookingId) {
    const booking = await Booking.findOne({ _id: bookingId, tourist: req.user.id, listing: listingId });
    if (!booking) return res.status(400).json({ error: "No matching booking found for this review" });
  }

  const flagged = BANNED_PATTERNS.some((re) => re.test(comment || ""));

  const review = await Review.create({
    author: req.user.id,
    listing: listing._id,
    vendor: listing.vendor,
    booking: bookingId,
    rating,
    comment,
    photos,
    moderationStatus: flagged ? "flagged" : "pending",
  });

  res.status(201).json({ review, autoFlagged: flagged });
});

// Admin: moderation queue
router.get("/moderation-queue", requireAuth, requireRole("admin"), async (req, res) => {
  const reviews = await Review.find({ moderationStatus: { $in: ["pending", "flagged"] } })
    .sort("-createdAt")
    .populate("author", "name")
    .populate("listing", "title");
  res.json({ reviews });
});

router.patch("/:id/moderate", requireAuth, requireRole("admin"), async (req, res) => {
  const { status, notes } = req.body; // approved | rejected
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ error: "Review not found" });

  review.moderationStatus = status;
  review.moderationNotes = notes;
  await review.save();

  if (status === "approved") {
    const [listingStats, vendorStats] = await Promise.all([
      Review.aggregate([
        { $match: { listing: review.listing, moderationStatus: "approved" } },
        { $group: { _id: "$listing", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { vendor: review.vendor, moderationStatus: "approved" } },
        { $group: { _id: "$vendor", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);
    if (listingStats[0]) {
      await Listing.findByIdAndUpdate(review.listing, {
        ratingAverage: listingStats[0].avg,
        ratingCount: listingStats[0].count,
      });
    }
    if (vendorStats[0]) {
      await Vendor.findByIdAndUpdate(review.vendor, {
        ratingAverage: vendorStats[0].avg,
        ratingCount: vendorStats[0].count,
      });
    }
  }

  res.json({ review });
});

export default router;
