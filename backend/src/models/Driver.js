import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    vehicleType: {
      type: String,
      enum: ["tuk_tuk", "car", "van", "bike"],
      required: true,
      index: true,
    },
    vehicleModel: { type: String },
    vehiclePlate: { type: String, required: true },
    vehicleColor: { type: String },
    licenseNumber: { type: String, required: true },

    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
      index: true,
    },

    isOnline: { type: Boolean, default: false, index: true },
    isSuspended: { type: Boolean, default: false },

    // GeoJSON Point — [lng, lat], required for the $near matching query.
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    locationUpdatedAt: { type: Date },

    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    totalTrips: { type: Number, default: 0 },
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: "2dsphere" });

export default mongoose.model("Driver", driverSchema);
