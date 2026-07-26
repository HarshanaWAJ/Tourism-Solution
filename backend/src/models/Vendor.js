import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["hotel", "guide", "transport", "restaurant", "activity", "attraction"],
      required: true,
      index: true,
    },
    description: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    website: { type: String },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
      index: true,
    },
    verificationBadges: [
      {
        type: String,
        enum: ["business_registration", "sltda_license", "guide_certification", "tax_registration"],
      },
    ],
    fraudScore: { type: Number, default: 0 }, // 0 = clean, higher = riskier
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Vendor", vendorSchema);
