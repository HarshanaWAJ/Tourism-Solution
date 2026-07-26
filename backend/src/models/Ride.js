import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    label: { type: String },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", index: true },

    vehicleType: { type: String, enum: ["tuk_tuk", "car", "van", "bike"], required: true },
    pickup: { type: pointSchema, required: true },
    destination: { type: pointSchema, required: true },

    // OSRM route geometry, stored as an array of [lng, lat] pairs.
    routeGeometry: { type: [[Number]], default: [] },
    distanceMeters: { type: Number },
    durationSeconds: { type: Number },

    fareEstimate: { type: Number, required: true },
    fareFinal: { type: Number },
    currency: { type: String, default: "USD" },

    paymentMode: { type: String, enum: ["cash", "card"], default: "cash" },
    paymentStatus: {
      type: String,
      enum: ["pending", "authorized", "paid", "failed"],
      default: "pending",
      index: true,
    },
    stripePaymentIntentId: { type: String },

    status: {
      type: String,
      enum: [
        "searching",
        "no_drivers_available",
        "accepted",
        "arriving",
        "in_progress",
        "completed",
        "cancelled",
      ],
      default: "searching",
      index: true,
    },
    cancelledBy: { type: String, enum: ["tourist", "driver", "admin"] },
    cancelReason: { type: String },

    acceptedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    touristRating: { type: Number, min: 1, max: 5 },
    touristReview: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Ride", rideSchema);
