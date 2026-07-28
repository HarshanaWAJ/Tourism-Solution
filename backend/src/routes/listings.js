import { Router } from "express";
import Listing from "../models/Listing.js";
import Location from "../models/Location.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Review from "../models/Review.js";
import Vendor from "../models/Vendor.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/listings?query=&category=&city=&minPrice=&maxPrice=&tags=beach,family&date=2026-08-10
router.get("/", async (req, res) => {
  const { query, category, city, minPrice, maxPrice, tags, date } = req.query;

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (query) filter.$text = { $search: query };
  if (tags) filter.tags = { $in: tags.split(",") };
  if (minPrice || maxPrice) {
    filter.basePrice = {};
    if (minPrice) filter.basePrice.$gte = Number(minPrice);
    if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
  }

  let listingQuery = Listing.find(filter).populate("location").populate("vendor");

  if (city) {
    const locationIds = await Location.find({ city: new RegExp(city, "i") }).distinct("_id");
    listingQuery = listingQuery.where("location").in(locationIds);
  }

  let listings = await listingQuery.limit(60).lean();

  // Only surface listings from vendors that aren't suspended.
  listings = listings.filter((l) => l.vendor && !l.vendor.isSuspended);

  if (date) {
    const target = new Date(date);
    const dayStart = new Date(target.setHours(0, 0, 0, 0));
    const dayEnd = new Date(target.setHours(23, 59, 59, 999));
    const listingIds = listings.map((l) => l._id);
    const availableSlots = await AvailabilitySlot.find({
      listing: { $in: listingIds },
      date: { $gte: dayStart, $lte: dayEnd },
      status: "open",
      $expr: { $lt: ["$capacityBooked", "$capacityTotal"] },
    }).distinct("listing");
    const availableSet = new Set(availableSlots.map(String));
    listings = listings.filter((l) => availableSet.has(String(l._id)));
  }

  res.json({ count: listings.length, results: listings });
});

router.get("/:id", async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("location").populate("vendor");
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  const [availability, reviews] = await Promise.all([
    AvailabilitySlot.find({ listing: listing._id, date: { $gte: new Date() } }).sort("date").limit(30),
    Review.find({ listing: listing._id, moderationStatus: "approved" }).sort("-createdAt").limit(20).populate("author", "name"),
  ]);

  res.json({ listing, availability, reviews });
});

// Vendor: view all of my own listings, including inactive/unpublished ones
router.get("/vendor/mine", requireAuth, requireRole("vendor"), async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user.id });
  if (!vendor) return res.status(400).json({ error: "No vendor profile found for this account" });

  const listings = await Listing.find({ vendor: vendor._id }).populate("location").sort("-createdAt");
  res.json({ count: listings.length, results: listings });
});

// Vendor: create a listing
router.post("/", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  const { title, category, description, location, basePrice, currency, priceUnit, tags, images, languagesSupported, bookingRequired } = req.body;
  const vendor = await Vendor.findOne({ owner: req.user.id });
  if (!vendor) return res.status(400).json({ error: "No vendor profile found for this account" });

  const loc = location._id
    ? await Location.findById(location._id)
    : await Location.create(location);

  // Hotels are always booking-required regardless of what was sent
  const resolvedBookingRequired = category === "hotel" ? true : (bookingRequired ?? false);

  const listing = await Listing.create({
    vendor: vendor._id,
    title,
    category,
    description,
    location: loc._id,
    basePrice,
    currency,
    priceUnit,
    tags,
    images,
    languagesSupported,
    bookingRequired: resolvedBookingRequired,
  });

  res.status(201).json({ listing });
});

// Vendor: update own listing
router.patch("/:id", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("vendor");
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (req.user.role !== "admin" && String(listing.vendor.owner) !== req.user.id) {
    return res.status(403).json({ error: "You do not own this listing" });
  }
  const editable = [
    "title", "category", "description", "basePrice", "currency", "priceUnit",
    "tags", "images", "languagesSupported", "isActive", "bookingRequired",
  ];
  for (const field of editable) {
    if (field in req.body) listing[field] = req.body[field];
  }
  // Hotels must always remain booking-required — enforce here too
  if (listing.category === "hotel") listing.bookingRequired = true;
  await listing.save();
  res.json({ listing });
});

// Vendor: add availability slots
router.post("/:id/availability", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("vendor");
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (req.user.role !== "admin" && String(listing.vendor.owner) !== req.user.id) {
    return res.status(403).json({ error: "You do not own this listing" });
  }
  const { slots } = req.body; // [{date, capacityTotal, startTime, endTime, priceOverride}]
  const created = await AvailabilitySlot.insertMany(
    slots.map((s) => ({ ...s, listing: listing._id }))
  );
  res.status(201).json({ slots: created });
});

export default router;
