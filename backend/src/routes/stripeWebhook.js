import Ride from "../models/Ride.js";
import { getStripe } from "../config/stripe.js";

/**
 * Mounted directly in server.js with express.raw() BEFORE the global
 * express.json() middleware, since Stripe's signature check needs the
 * exact raw request body bytes.
 *
 * Note: the *successful* capture of a ride payment is already handled
 * synchronously in routes/rides.js when a ride is marked "completed" —
 * this webhook exists as a safety net for out-of-band events (a card
 * getting declined on authorization, a later dispute, etc.) so the ride's
 * paymentStatus doesn't silently drift from what Stripe actually did.
 */
export default async function stripeWebhookHandler(req, res) {
  const signature = req.headers["stripe-signature"];
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send("STRIPE_WEBHOOK_SECRET is not configured on the server");
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    const ride = await Ride.findOne({ stripePaymentIntentId: intent.id });
    if (ride) {
      ride.paymentStatus = "failed";
      await ride.save();
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object;
    const ride = await Ride.findOne({ stripePaymentIntentId: dispute.payment_intent });
    if (ride) console.warn(`[stripe webhook] Dispute opened for ride ${ride._id}`);
  }

  res.json({ received: true });
}
