import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    against: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    evidenceUrls: [{ type: String }],
    status: { type: String, enum: ["open", "investigating", "resolved", "rejected"], default: "open", index: true },
    resolution: { type: String },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    refundAmount: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("Dispute", disputeSchema);
