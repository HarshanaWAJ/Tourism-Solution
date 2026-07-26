import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["scam_warning", "weather", "safety", "transport_disruption", "health"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    region: { type: String }, // e.g. "Colombo", "Ella", nationwide if blank
    activeFrom: { type: Date, default: Date.now },
    activeUntil: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Alert", alertSchema);
