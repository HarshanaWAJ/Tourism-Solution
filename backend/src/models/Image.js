import mongoose from "mongoose";

/**
 * Images are stored as base64-encoded data directly inside MongoDB
 * documents (no filesystem/S3 dependency), so the whole platform's
 * media library lives in the database alongside everything else.
 * Keep uploads small (see middleware/upload.js size limit) since Mongo
 * documents have a 16MB ceiling.
 */
const imageSchema = new mongoose.Schema(
  {
    filename: { type: String },
    contentType: { type: String, required: true },
    data: { type: String, required: true }, // base64-encoded bytes
    sizeBytes: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    context: {
      // Free-form tag for where this image is used, e.g. "listing", "place-submission"
      type: String,
      default: "general",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);
