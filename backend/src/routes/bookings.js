import { Router } from "express";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Quote from "../models/Quote.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Listing from "../models/Listing.js";
import Vendor from "../models/Vendor.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function generateConfirmationCode() {
  return "LT-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Tourist: direct booking against an open availability slot
router.post("/", requireAuth, requireRole("tourist"), async (req, res) => {
  const { listingId, availabilitySlotId, partySize } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing || !listing.isActive) return res.status(404).json({ error: "Listing not found" });

  const slot = await AvailabilitySlot.findById(availabilitySlotId);
  if (!slot || slot.status !== "open") return res.status(400).json({ error: "Slot not available" });
  if (slot.capacityBooked + (partySize || 1) > slot.capacityTotal) {
    return res.status(400).json({ error: "Not enough capacity remaining in this slot" });
  }

  const unitPrice = slot.priceOverride ?? listing.basePrice;
  const totalPrice = unitPrice * (partySize || 1);

  const booking = await Booking.create({
    tourist: req.user.id,
    vendor: listing.vendor,
    listing: listing._id,
    availabilitySlot: slot._id,
    partySize: partySize || 1,
    totalPrice,
    currency: listing.currency,
    status: "pending_confirmation",
    confirmationCode: generateConfirmationCode(),
  });

  slot.capacityBooked += partySize || 1;
  if (slot.capacityBooked >= slot.capacityTotal) slot.status = "sold_out";
  await slot.save();

  res.status(201).json({ booking });
});

// Tourist: request for quote (for custom/negotiated bookings e.g. multi-day guide packages)
router.post("/quotes", requireAuth, requireRole("tourist"), async (req, res) => {
  const { listingId, start, end, partySize, notes } = req.body;
  const listing = await Listing.findById(listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  const quote = await Quote.create({
    tourist: req.user.id,
    vendor: listing.vendor,
    listing: listing._id,
    requestedDates: { start, end },
    partySize,
    notes,
    status: "requested",
  });

  res.status(201).json({ quote });
});

// Vendor: respond to a quote request
router.patch("/quotes/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  const { proposedPrice, status } = req.body; // status: "quoted" | "declined"
  const quote = await Quote.findById(req.params.id).populate("vendor");
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  if (req.user.role !== "admin" && String(quote.vendor.owner) !== req.user.id) {
    return res.status(403).json({ error: "Not your quote to manage" });
  }
  if (proposedPrice !== undefined) quote.proposedPrice = proposedPrice;
  if (status) quote.status = status;
  await quote.save();
  res.json({ quote });
});

// Tourist: accept a quoted price -> converts into a confirmed booking
router.post("/quotes/:id/accept", requireAuth, requireRole("tourist"), async (req, res) => {
  const quote = await Quote.findById(req.params.id);
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  if (quote.status !== "quoted") return res.status(400).json({ error: "Quote is not in a quoted state" });

  quote.status = "accepted";
  await quote.save();

  const booking = await Booking.create({
    tourist: quote.tourist,
    vendor: quote.vendor,
    listing: quote.listing,
    quote: quote._id,
    partySize: quote.partySize,
    totalPrice: quote.proposedPrice,
    status: "pending_confirmation",
    confirmationCode: generateConfirmationCode(),
  });

  res.status(201).json({ booking });
});

// Vendor: confirm / cancel a booking
router.patch("/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  const { status, cancellationReason } = req.body;
  const booking = await Booking.findById(req.params.id).populate({ path: "vendor" });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const vendor = await Vendor.findById(booking.vendor);
  if (req.user.role !== "admin" && String(vendor.owner) !== req.user.id) {
    return res.status(403).json({ error: "Not your booking to manage" });
  }

  booking.status = status;
  if (cancellationReason) booking.cancellationReason = cancellationReason;
  await booking.save();

  if (status === "cancelled" && booking.availabilitySlot) {
    const slot = await AvailabilitySlot.findById(booking.availabilitySlot);
    if (slot) {
      slot.capacityBooked = Math.max(slot.capacityBooked - booking.partySize, 0);
      slot.status = "open";
      await slot.save();
    }
  }

  res.json({ booking });
});

// Tourist: my bookings
router.get("/mine", requireAuth, requireRole("tourist"), async (req, res) => {
  const bookings = await Booking.find({ tourist: req.user.id })
    .populate("listing")
    .populate("vendor")
    .sort("-createdAt");
  res.json({ bookings });
});

// Vendor: bookings for my listings
router.get("/vendor/mine", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user.id });
  if (!vendor) return res.status(400).json({ error: "No vendor profile found" });
  const bookings = await Booking.find({ vendor: vendor._id })
    .populate("listing")
    .populate("tourist", "name email")
    .sort("-createdAt");
  res.json({ bookings });
});

export default router;
