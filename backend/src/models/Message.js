import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    thread: { type: String, required: true, index: true }, // e.g. `booking:<id>` or `quote:<id>`
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    originalLanguage: { type: String, default: "en" },
    translatedBody: { type: mongoose.Schema.Types.Mixed }, // { "si": "...", "ta": "..." }
    readAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
