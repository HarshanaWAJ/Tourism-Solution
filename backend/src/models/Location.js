import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    address: { type: String },
    city: { type: String, index: true },
    region: { type: String },
    country: { type: String, default: "Sri Lanka" },
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
  },
  { timestamps: true }
);

locationSchema.index({ geo: "2dsphere" });

export default mongoose.model("Location", locationSchema);
