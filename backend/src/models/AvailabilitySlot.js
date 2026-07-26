import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    date: { type: Date, required: true, index: true },
    startTime: { type: String }, // "09:00" - optional, for activities/transport
    endTime: { type: String },
    capacityTotal: { type: Number, required: true, default: 1 },
    capacityBooked: { type: Number, default: 0 },
    priceOverride: { type: Number }, // for dynamic/promo pricing on this slot
    status: {
      type: String,
      enum: ["open", "closed", "sold_out"],
      default: "open",
    },
  },
  { timestamps: true }
);

availabilitySlotSchema.index({ listing: 1, date: 1 });

availabilitySlotSchema.virtual("capacityRemaining").get(function () {
  return Math.max(this.capacityTotal - this.capacityBooked, 0);
});

export default mongoose.model("AvailabilitySlot", availabilitySlotSchema);
