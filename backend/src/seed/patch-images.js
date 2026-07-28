/**
 * patch-images.js
 * One-time migration — adds Unsplash cover images to existing listings
 * by title substring match. Safe to run multiple times (idempotent).
 *
 * Run: node src/seed/patch-images.js
 */
import "dotenv/config";
import { connectDB } from "../config/db.js";
import mongoose from "mongoose";
import Listing from "../models/Listing.js";

const PATCHES = [
  {
    titleContains: "Colombo Heritage",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    ],
  },
  {
    titleContains: "National Museum",
    images: [
      "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
      "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&q=80",
    ],
  },
  {
    titleContains: "Galle Face",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    ],
  },
  {
    titleContains: "Ella Hilltop",
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    ],
  },
  {
    titleContains: "Sigiriya",
    images: [
      "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=800&q=80",
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80",
    ],
  },
];

async function run() {
  await connectDB();
  console.log("[patch-images] connected, patching listings...");

  // Ensure all hotels have bookingRequired: true, and non-hotels default to false
  const hotelResult = await Listing.updateMany({ category: "hotel" }, { $set: { bookingRequired: true } });
  console.log(`  Hotels enforced bookingRequired=true → updated ${hotelResult.modifiedCount}`);

  const nonHotelResult = await Listing.updateMany({ category: { $ne: "hotel" }, bookingRequired: { $exists: false } }, { $set: { bookingRequired: false } });
  console.log(`  Non-hotels defaulted bookingRequired=false → updated ${nonHotelResult.modifiedCount}`);

  console.log("[patch-images] done. Data patched successfully.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
