import mongoose from "mongoose";

const touristProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    nationality: { type: String },
    interests: [{ type: String }], // e.g. wildlife, surfing, culture, food
    budgetLevel: { type: String, enum: ["budget", "mid", "luxury"], default: "mid" },
    travelDates: {
      start: { type: Date },
      end: { type: Date },
    },
    partySize: { type: Number, default: 1 },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    homeCountryEmbassyContact: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("TouristProfile", touristProfileSchema);
