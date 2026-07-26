import mongoose from "mongoose";

/**
 * When a tourist searches Discover and can't find a place, they can
 * suggest it be added to the catalog. That suggestion (with photos)
 * sits here pending admin review; approving it creates a real
 * Location + Listing so it becomes searchable/bookable like any other
 * catalog entry.
 */
const placeSubmissionSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["hotel", "guide", "transport", "restaurant", "activity", "attraction", "package"],
      default: "attraction",
    },
    description: { type: String },
    searchQueryContext: { type: String }, // what the tourist originally searched for
    location: {
      label: { type: String, required: true },
      address: { type: String },
      city: { type: String, required: true },
      region: { type: String },
      country: { type: String, default: "Sri Lanka" },
      lat: { type: Number },
      lng: { type: Number },
    },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewNotes: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    resultingListing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
  },
  { timestamps: true }
);

export default mongoose.model("PlaceSubmission", placeSubmissionSchema);
