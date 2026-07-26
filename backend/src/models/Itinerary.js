import mongoose from "mongoose";

const itineraryItemSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    startTime: { type: String },
    title: { type: String, required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    notes: { type: String },
  },
  { _id: false }
);

const itinerarySchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    generatedByAI: { type: Boolean, default: false },
    items: [itineraryItemSchema],
    shareToken: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model("Itinerary", itinerarySchema);
