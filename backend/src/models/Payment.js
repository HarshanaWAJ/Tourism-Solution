import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", index: true },
    ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", index: true },
    payer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    provider: {
      type: String,
      enum: ["stripe", "payhere", "cash_on_arrival", "bank_transfer"],
      default: "stripe",
    },
    providerReference: { type: String },
    status: {
      type: String,
      enum: ["initiated", "succeeded", "failed", "refunded", "partially_refunded"],
      default: "initiated",
      index: true,
    },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

paymentSchema.pre("validate", function (next) {
  if (!this.booking && !this.ride) {
    return next(new Error("A payment must reference either a booking or a ride"));
  }
  next();
});

export default mongoose.model("Payment", paymentSchema);
