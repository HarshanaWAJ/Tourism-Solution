import mongoose from "mongoose";

/**
 * FareConfig stores the platform-wide, admin-configurable pricing rules
 * for every vehicle type.
 *
 * Pricing model:
 *   totalFare = firstKmPrice
 *             + max(0, km - 1) × perKmPrice
 *             + waitingMinutes × waitingChargePerMin
 *
 * One document per vehicleType (upserted on save via the admin API).
 */
const fareConfigSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: ["tuk_tuk", "car", "van", "bike"],
      required: true,
      unique: true,
    },

    currency: { type: String, default: "USD" },

    /** Flat charge that covers the first kilometre (no extra perKm for that km). */
    firstKmPrice: { type: Number, required: true, min: 0 },

    /** Price charged for every kilometre after the first. */
    perKmPrice: { type: Number, required: true, min: 0 },

    /**
     * Waiting / traffic charge per minute.
     * Applied to minutes recorded between "arrived at pickup" and "trip start",
     * as well as any future stop-clock events during a ride.
     */
    waitingChargePerMin: { type: Number, required: true, min: 0 },

    /** Optional minimum fare floor (after full calculation). */
    minimumFare: { type: Number, default: 0, min: 0 },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FareConfig", fareConfigSchema);
