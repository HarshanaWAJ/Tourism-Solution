import { Router } from "express";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/**
 * This is a provider-agnostic stub. In production, swap the "processPayment"
 * function for a real Stripe/PayHere SDK call. PayHere is included as an
 * option since it's the common local gateway for Sri Lankan merchants,
 * alongside Stripe for international cards.
 */
function processPayment({ amount, provider }) {
  return {
    success: true,
    providerReference: `${provider}_${crypto.randomBytes(6).toString("hex")}`,
  };
}

router.post("/", requireAuth, requireRole("tourist"), async (req, res) => {
  const { bookingId, provider = "stripe" } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (String(booking.tourist) !== req.user.id) return res.status(403).json({ error: "Not your booking" });

  const result = processPayment({ amount: booking.totalPrice, provider });

  const payment = await Payment.create({
    booking: booking._id,
    payer: req.user.id,
    amount: booking.totalPrice,
    currency: booking.currency,
    provider,
    providerReference: result.providerReference,
    status: result.success ? "succeeded" : "failed",
    receiptUrl: result.success ? `/receipts/${booking.confirmationCode}.pdf` : undefined,
  });

  if (result.success && booking.status === "pending_confirmation") {
    booking.status = "confirmed";
    await booking.save();
  }

  res.status(201).json({ payment, booking });
});

router.get("/mine", requireAuth, async (req, res) => {
  const payments = await Payment.find({ payer: req.user.id }).populate("booking").sort("-createdAt");
  res.json({ payments });
});

export default router;
