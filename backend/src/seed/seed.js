import "dotenv/config";
import { connectDB } from "../config/db.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Location from "../models/Location.js";
import Listing from "../models/Listing.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Alert from "../models/Alert.js";

async function run() {
  await connectDB();
  console.log("[seed] clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Vendor.deleteMany({}),
    Location.deleteMany({}),
    Listing.deleteMany({}),
    AvailabilitySlot.deleteMany({}),
    Alert.deleteMany({}),
  ]);

  const admin = new User({ name: "Platform Admin", email: "admin@lankatourism.lk", role: "admin" });
  await admin.setPassword("Admin123!");
  await admin.save();

  const tourist = new User({ name: "Alex Traveler", email: "tourist@example.com", role: "tourist" });
  await tourist.setPassword("Tourist123!");
  await tourist.save();

  const vendorUser = new User({ name: "Nimal Perera", email: "vendor@example.com", role: "vendor" });
  await vendorUser.setPassword("Vendor123!");
  await vendorUser.save();

  const vendor = await Vendor.create({
    owner: vendorUser._id,
    businessName: "Ella Hilltop Guesthouse",
    category: "hotel",
    description: "Cozy hillside guesthouse with panoramic views of the Ella Gap.",
    contactPhone: "+94 77 123 4567",
    contactEmail: "vendor@example.com",
    verificationStatus: "verified",
    verificationBadges: ["business_registration", "sltda_license"],
  });

  const ellaLocation = await Location.create({
    label: "Ella Hilltop Guesthouse",
    city: "Ella",
    region: "Uva Province",
    geo: { type: "Point", coordinates: [81.0462, 6.8667] },
  });

  const sigiriyaLocation = await Location.create({
    label: "Sigiriya Rock Fortress",
    city: "Sigiriya",
    region: "Central Province",
    geo: { type: "Point", coordinates: [80.7603, 7.9570] },
  });

  const listing1 = await Listing.create({
    vendor: vendor._id,
    title: "Ella Hilltop Guesthouse - Deluxe Room",
    category: "hotel",
    description: "Deluxe double room with balcony and gap view, breakfast included.",
    location: ellaLocation._id,
    basePrice: 45,
    currency: "USD",
    priceUnit: "per_night",
    tags: ["mountain", "family-friendly", "budget"],
    languagesSupported: ["en", "si", "de"],
  });

  const listing2 = await Listing.create({
    vendor: vendor._id,
    title: "Sigiriya Rock Sunrise Guided Hike",
    category: "guide",
    description: "Beat the crowds with an early sunrise climb led by a certified local guide.",
    location: sigiriyaLocation._id,
    basePrice: 30,
    currency: "USD",
    priceUnit: "per_person",
    tags: ["culture", "hiking", "wildlife"],
    languagesSupported: ["en", "si", "fr"],
  });

  const today = new Date();
  const slots = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    slots.push({ listing: listing1._id, date: d, capacityTotal: 3, capacityBooked: 0, status: "open" });
    slots.push({
      listing: listing2._id,
      date: d,
      startTime: "05:30",
      endTime: "09:00",
      capacityTotal: 8,
      capacityBooked: 0,
      status: "open",
    });
  }
  await AvailabilitySlot.insertMany(slots);

  await Alert.create({
    type: "scam_warning",
    title: "Beware of unofficial 'tour guides' at Fort Railway Station",
    body: "Only book guides that show a verified badge on the platform or an official SLTDA ID card.",
    severity: "warning",
    region: "Colombo",
  });

  console.log("[seed] done.");
  console.log("[seed] Login as admin:  admin@lankatourism.lk / Admin123!");
  console.log("[seed] Login as tourist: tourist@example.com / Tourist123!");
  console.log("[seed] Login as vendor:  vendor@example.com / Vendor123!");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
