import mongoose from "mongoose";

const verificationDocumentSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", index: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", index: true },
    type: {
      type: String,
      enum: [
        "business_registration",
        "sltda_license",
        "guide_certification",
        "tax_registration",
        "id_document",
        "driving_license",
        "vehicle_registration",
        "vehicle_insurance",
      ],
      required: true,
    },
    fileUrl: { type: String, required: true },
    issuedBy: { type: String },
    expiresAt: { type: Date },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

verificationDocumentSchema.pre("validate", function (next) {
  if (!this.vendor && !this.driver) {
    return next(new Error("A verification document must belong to either a vendor or a driver"));
  }
  next();
});

export default mongoose.model("VerificationDocument", verificationDocumentSchema);
