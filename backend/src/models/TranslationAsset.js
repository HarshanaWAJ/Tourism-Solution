import mongoose from "mongoose";

const translationAssetSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true }, // "Listing", "Alert", etc.
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    field: { type: String, required: true }, // "title", "description"
    language: { type: String, required: true }, // "si", "ta", "de", "fr"...
    text: { type: String, required: true },
    source: { type: String, enum: ["machine", "human_reviewed"], default: "machine" },
  },
  { timestamps: true }
);

translationAssetSchema.index({ entityType: 1, entityId: 1, field: 1, language: 1 }, { unique: true });

export default mongoose.model("TranslationAsset", translationAssetSchema);
