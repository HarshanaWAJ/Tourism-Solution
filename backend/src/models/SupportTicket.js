import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      enum: ["safety", "payment", "booking", "vendor_complaint", "technical", "other"],
      default: "other",
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["low", "normal", "high", "emergency"], default: "normal", index: true },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
    relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);
