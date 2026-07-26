import FareConfig from "../models/FareConfig.js";

/**
 * Hard-coded defaults used when a vehicle type has no DB config yet.
 * Prices in USD.
 */
const DEFAULTS = {
  tuk_tuk: { firstKmPrice: 0.60, perKmPrice: 0.35, waitingChargePerMin: 0.04, minimumFare: 0.60, currency: "USD" },
  bike:    { firstKmPrice: 0.50, perKmPrice: 0.25, waitingChargePerMin: 0.03, minimumFare: 0.50, currency: "USD" },
  car:     { firstKmPrice: 1.50, perKmPrice: 0.55, waitingChargePerMin: 0.07, minimumFare: 1.50, currency: "USD" },
  van:     { firstKmPrice: 2.50, perKmPrice: 0.80, waitingChargePerMin: 0.10, minimumFare: 2.50, currency: "USD" },
};

/**
 * Fetch live config for one vehicle type.
 * Falls back to the hard-coded DEFAULTS if no DB record exists yet.
 */
export async function getFareConfig(vehicleType) {
  const config = await FareConfig.findOne({ vehicleType });
  return config || { ...DEFAULTS[vehicleType] || DEFAULTS.car, vehicleType };
}

/**
 * Fetch all vehicle fare configs (for admin listing).
 * Merges DB records over defaults so every vehicle type is always present.
 */
export async function getAllFareConfigs() {
  const records = await FareConfig.find();
  const byType = Object.fromEntries(records.map((r) => [r.vehicleType, r]));

  return Object.keys(DEFAULTS).map((type) => ({
    ...DEFAULTS[type],
    vehicleType: type,
    ...(byType[type]?.toObject ? byType[type].toObject() : byType[type] || {}),
  }));
}

/**
 * Core fare calculation.
 *
 * Pricing model:
 *   fare = firstKmPrice
 *        + max(0, km - 1) × perKmPrice
 *        + waitingMinutes × waitingChargePerMin
 *
 * @param {object}  config          - Fare config object (from getFareConfig)
 * @param {number}  distanceMeters  - Total distance of the route / actual trip
 * @param {number}  waitingSeconds  - Seconds the driver waited (pre-trip + stops)
 * @returns {{ amount: number, currency: string, breakdown: object }}
 */
export function calculateFare(config, distanceMeters, waitingSeconds = 0) {
  const km = distanceMeters / 1000;
  const waitingMinutes = waitingSeconds / 60;

  const firstKmCharge = config.firstKmPrice;
  const additionalKmCharge = Math.max(0, km - 1) * config.perKmPrice;
  const waitingCharge = waitingMinutes * config.waitingChargePerMin;

  const subtotal = firstKmCharge + additionalKmCharge + waitingCharge;
  const amount = Math.max(
    config.minimumFare || 0,
    Math.round(subtotal * 100) / 100
  );

  return {
    amount,
    currency: config.currency || "USD",
    breakdown: {
      distanceKm: Math.round(km * 100) / 100,
      firstKmCharge: Math.round(firstKmCharge * 100) / 100,
      additionalKmCharge: Math.round(additionalKmCharge * 100) / 100,
      waitingMinutes: Math.round(waitingMinutes * 100) / 100,
      waitingCharge: Math.round(waitingCharge * 100) / 100,
    },
  };
}

/**
 * Convenience wrapper — loads config from DB then calculates.
 * Use for initial fare estimates when creating a ride.
 */
export async function estimateFare(vehicleType, distanceMeters, durationSeconds) {
  const config = await getFareConfig(vehicleType);
  // For estimates, no waiting time is assumed.
  return calculateFare(config, distanceMeters, 0);
}
