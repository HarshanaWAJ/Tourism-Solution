import Stripe from "stripe";

let stripeClient = null;

/**
 * Returns a configured Stripe client. Throws a clear, actionable error if
 * STRIPE_SECRET_KEY hasn't been set yet — see README.md ("Stripe setup")
 * for how to get one and add it to backend/.env.
 */
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to backend/.env to enable card payments " +
        "(see the \"Stripe setup\" section in README.md)."
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
