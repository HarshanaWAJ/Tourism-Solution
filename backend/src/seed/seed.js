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
    businessName: "Lanka Premier Hospitality & Tours",
    category: "hotel",
    description: "Verified premier hospitality provider operating luxury hotels and guided city tours across Sri Lanka.",
    contactPhone: "+94 77 123 4567",
    contactEmail: "vendor@example.com",
    verificationStatus: "verified",
    verificationBadges: ["business_registration", "sltda_license"],
  });

  // Locations
  const colomboLoc1 = await Location.create({
    label: "Gangaramaya Temple & Beira Lake",
    city: "Colombo",
    region: "Western Province",
    geo: { type: "Point", coordinates: [79.8560, 6.9167] },
  });

  const colomboLoc2 = await Location.create({
    label: "National Museum of Colombo",
    city: "Colombo",
    region: "Western Province",
    geo: { type: "Point", coordinates: [79.8610, 6.9100] },
  });

  const colomboLoc3 = await Location.create({
    label: "Galle Face Oceanfront Hotel & Promenade",
    city: "Colombo",
    region: "Western Province",
    geo: { type: "Point", coordinates: [79.8450, 6.9240] },
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

  // Listings
  const listing1 = await Listing.create({
    vendor: vendor._id,
    title: "Colombo Heritage Cultural Walk & Temple Tour",
    category: "attraction",
    description: "Guided morning exploration of Gangaramaya Temple, Beira Lake, and Pettah Floating Market.",
    location: colomboLoc1._id,
    basePrice: 25,
    currency: "USD",
    priceUnit: "per_person",
    tags: ["culture", "family-friendly", "city-tour"],
    languagesSupported: ["en", "si"],
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    ],
  });

  const listing2 = await Listing.create({
    vendor: vendor._id,
    title: "National Museum & Colonial Artifacts Guided Pass",
    category: "attraction",
    description: "Comprehensive guided entry to Sri Lanka's crown regalia, ancient bronzes, and royal artifacts.",
    location: colomboLoc2._id,
    basePrice: 15,
    currency: "USD",
    priceUnit: "per_person",
    tags: ["culture", "museum", "family-friendly"],
    languagesSupported: ["en", "si", "de"],
    images: [
      "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
      "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&q=80",
    ],
  });

  const listing3 = await Listing.create({
    vendor: vendor._id,
    title: "Galle Face Ocean Suite & Dining Experience",
    category: "hotel",
    description: "Luxurious seaside hotel suite overlooking the Indian Ocean and Galle Face Promenade.",
    location: colomboLoc3._id,
    basePrice: 120,
    currency: "USD",
    priceUnit: "per_night",
    tags: ["luxury", "food", "oceanview"],
    languagesSupported: ["en", "si"],
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    ],
  });

  const listing4 = await Listing.create({
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
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    ],
  });

  const listing5 = await Listing.create({
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
    images: [
      "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=800&q=80",
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80",
    ],
  });

  const today = new Date();
  const slots = [];
  const listingsList = [listing1, listing2, listing3, listing4, listing5];

  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    listingsList.forEach((lst) => {
      slots.push({
        listing: lst._id,
        date: d,
        startTime: "09:00",
        endTime: "17:00",
        capacityTotal: 10,
        capacityBooked: 0,
        status: "open",
      });
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

  console.log("[seed] done seeding multi-city listings.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
