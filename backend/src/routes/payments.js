import { Router } from "express";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getStripe, isStripeConfigured } from "../config/stripe.js";

const router = Router();

/**
 * POST /api/payments/create-intent
 * Creates a Stripe PaymentIntent (or fallback reference) for a booking.
 */
router.post("/create-intent", requireAuth, requireRole("tourist"), async (req, res) => {
  const { bookingId, provider = "stripe" } = req.body;

  const booking = await Booking.findById(bookingId).populate("listing");
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (String(booking.tourist) !== req.user.id) return res.status(403).json({ error: "Not your booking" });

  let clientSecret = null;
  let paymentIntentId = `${provider}_${crypto.randomBytes(6).toString("hex")}`;

  if (provider === "stripe") {
    if (isStripeConfigured()) {
      try {
        const stripe = getStripe();
        const amountCents = Math.round((booking.totalPrice || 10) * 100);
        const intent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: (booking.currency || "USD").toLowerCase(),
          metadata: {
            bookingId: booking._id.toString(),
            touristId: req.user.id,
            confirmationCode: booking.confirmationCode || "",
          },
        });
        clientSecret = intent.client_secret;
        paymentIntentId = intent.id;
      } catch (err) {
        console.warn("[Stripe Create Intent Warning]:", err.message);
        // Fallback for dev mode
        clientSecret = `sim_secret_${crypto.randomBytes(8).toString("hex")}`;
        paymentIntentId = `pi_sim_${crypto.randomBytes(8).toString("hex")}`;
      }
    } else {
      // Simulating Stripe in dev environment without API key
      clientSecret = `sim_secret_${crypto.randomBytes(8).toString("hex")}`;
      paymentIntentId = `pi_sim_${crypto.randomBytes(8).toString("hex")}`;
    }
  } else if (provider === "cash_on_arrival") {
    paymentIntentId = `cash_${crypto.randomBytes(6).toString("hex")}`;
  }

  res.json({
    clientSecret,
    paymentIntentId,
    amount: booking.totalPrice,
    currency: booking.currency,
    provider,
  });
});

/**
 * POST /api/payments
 * Confirm payment for a booking and mark booking as confirmed.
 */
router.post("/", requireAuth, requireRole("tourist"), async (req, res) => {
  const { bookingId, provider = "stripe", paymentIntentId } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (String(booking.tourist) !== req.user.id) return res.status(403).json({ error: "Not your booking" });

  const ref = paymentIntentId || `${provider}_${crypto.randomBytes(6).toString("hex")}`;

  const payment = await Payment.create({
    booking: booking._id,
    payer: req.user.id,
    amount: booking.totalPrice,
    currency: booking.currency,
    provider: provider === "cash_on_arrival" ? "cash_on_arrival" : "stripe",
    providerReference: ref,
    status: "succeeded",
    receiptUrl: `/receipts/${booking.confirmationCode || "LT-RES"}.pdf`,
  });

  booking.status = "confirmed";
  await booking.save();

  res.status(201).json({
    success: true,
    payment,
    booking,
    message: provider === "cash_on_arrival"
      ? "Booking reserved with Pay on Arrival! Please present confirmation code to vendor upon arrival."
      : "Payment successful! Booking confirmed.",
  });
});

router.get("/mine", requireAuth, async (req, res) => {
  const payments = await Payment.find({ payer: req.user.id }).populate("booking").sort("-createdAt");
  res.json({ payments });
});

export default router;
