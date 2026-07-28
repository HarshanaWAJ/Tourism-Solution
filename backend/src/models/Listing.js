import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["hotel", "guide", "transport", "restaurant", "activity", "attraction", "package"],
      required: true,
      index: true,
    },
    description: { type: String },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    images: [{ type: String }],
    basePrice: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    priceUnit: {
      type: String,
      enum: ["per_night", "per_person", "per_trip", "per_hour", "flat"],
      default: "flat",
    },
    tags: [{ type: String }], // e.g. "family-friendly", "wildlife", "beach"
    languagesSupported: [{ type: String }],
    isActive: { type: Boolean, default: true },
    bookingRequired: { type: Boolean, default: false }, // hotels forced to true; others optional
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hotels are always booking-required — cannot be overridden
listingSchema.pre("save", function (next) {
  if (this.category === "hotel") {
    this.bookingRequired = true;
  }
  next();
});

listingSchema.index({ title: "text", description: "text", tags: "text" });

export default mongoose.model("Listing", listingSchema);
