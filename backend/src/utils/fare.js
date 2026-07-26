// Illustrative Sri Lanka-ish rate card, in USD. Tune freely, or make this
// data-driven (e.g. per-region) later — kept simple and centralized here so
// both the ride-request and ride-completion code paths agree on pricing.
const RATE_CARDS = {
  tuk_tuk: { base: 0.6, perKm: 0.35, perMin: 0.04, currency: "USD" },
  bike: { base: 0.5, perKm: 0.25, perMin: 0.03, currency: "USD" },
  car: { base: 1.5, perKm: 0.55, perMin: 0.07, currency: "USD" },
  van: { base: 2.5, perKm: 0.8, perMin: 0.1, currency: "USD" },
};

export function getRateCard(vehicleType) {
  return RATE_CARDS[vehicleType] || RATE_CARDS.car;
}

/** Estimate a fare from route distance/duration. Rounds to 2 decimals. */
export function estimateFare(vehicleType, distanceMeters, durationSeconds) {
  const rate = getRateCard(vehicleType);
  const km = distanceMeters / 1000;
  const min = durationSeconds / 60;
  const raw = rate.base + rate.perKm * km + rate.perMin * min;
  return { amount: Math.max(rate.base, Math.round(raw * 100) / 100), currency: rate.currency };
}
