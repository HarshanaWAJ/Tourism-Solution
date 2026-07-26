import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    availabilitySlot: { type: mongoose.Schema.Types.ObjectId, ref: "AvailabilitySlot" },
    quote: { type: mongoose.Schema.Types.ObjectId, ref: "Quote" },
    partySize: { type: Number, default: 1 },
    totalPrice: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending_confirmation", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending_confirmation",
      index: true,
    },
    cancellationReason: { type: String },
    confirmationCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
