import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    requestedDates: {
      start: { type: Date, required: true },
      end: { type: Date },
    },
    partySize: { type: Number, default: 1 },
    notes: { type: String },
    proposedPrice: { type: Number },
    status: {
      type: String,
      enum: ["requested", "quoted", "accepted", "declined", "expired"],
      default: "requested",
      index: true,
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Quote", quoteSchema);
