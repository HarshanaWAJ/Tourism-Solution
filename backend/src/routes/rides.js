import { Router } from "express";
import Driver from "../models/Driver.js";
import Ride from "../models/Ride.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getIO } from "../realtime/socket.js";
import { getRoute } from "../utils/routing.js";
import { estimateFare, getFareConfig, calculateFare } from "../utils/fare.js";
import { getStripe } from "../config/stripe.js";

const router = Router();

async function findNearbyDrivers(pickup, vehicleType, radiusMeters = 5000) {
  return Driver.find({
    isOnline: true,
    isSuspended: false,
    verificationStatus: "verified",
    vehicleType,
    currentLocation: {
      $near: {
        $geometry: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
        $maxDistance: radiusMeters,
      },
    },
  }).limit(10);
}

// Tourist: request a ride. Quotes a route + fare via OSRM, then pings
// nearby verified/online drivers of the requested vehicle type.
router.post("/", requireAuth, requireRole("tourist"), async (req, res) => {
  const { pickup, destination, vehicleType, paymentMode = "cash" } = req.body;
  if (!pickup?.lat || !pickup?.lng || !destination?.lat || !destination?.lng || !vehicleType) {
    return res.status(400).json({ error: "pickup {lat,lng}, destination {lat,lng}, and vehicleType are required" });
  }

  const route = await getRoute(pickup, destination);
  const { amount: fareEstimate, currency } = await estimateFare(vehicleType, route.distanceMeters, 0);

  const ride = await Ride.create({
    tourist: req.user.id,
    vehicleType,
    pickup,
    destination,
    routeGeometry: route.geometry,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    fareEstimate,
    currency,
    paymentMode,
    status: "searching",
  });

  const nearbyDrivers = await findNearbyDrivers(pickup, vehicleType);
  const io = getIO();
  nearbyDrivers.forEach((d) => {
    io.to(`user:${d.owner}`).emit("ride:request", {
      rideId: ride._id,
      pickup,
      destination,
      fareEstimate,
      currency,
      vehicleType,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
    });
  });

  if (nearbyDrivers.length === 0) {
    ride.status = "no_drivers_available";
    await ride.save();
  }

  res.status(201).json({ ride, candidateDrivers: nearbyDrivers.length });
});

// Driver: accept a ride that's still searching. The status filter in
// findOneAndUpdate makes this atomic, so two drivers can't both "win" it.
router.post("/:id/accept", requireAuth, requireRole("driver"), async (req, res) => {
  const driver = await Driver.findOne({ owner: req.user.id });
  if (!driver) return res.status(404).json({ error: "No driver profile found for this account" });
  if (!driver.isOnline) return res.status(400).json({ error: "You must be online to accept rides" });

  const ride = await Ride.findOneAndUpdate(
    { _id: req.params.id, status: "searching" },
    { status: "accepted", driver: driver._id, acceptedAt: new Date() },
    { new: true }
  );
  if (!ride) return res.status(409).json({ error: "This ride is no longer available" });

  getIO().to(`user:${ride.tourist}`).emit("ride:status", { rideId: ride._id, status: "accepted", driver });
  res.json({ ride });
});

// Driver (or tourist, for cancellation) progresses the ride's lifecycle.
router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body; // arriving | in_progress | completed | cancelled
  const ride = await Ride.findById(req.params.id).populate("driver");
  if (!ride) return res.status(404).json({ error: "Ride not found" });

  const isTourist = req.user.role === "tourist" && String(ride.tourist) === req.user.id;
  const isDriver = req.user.role === "driver" && ride.driver && String(ride.driver.owner) === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isTourist && !isDriver && !isAdmin) return res.status(403).json({ error: "You're not part of this ride" });

  if (isTourist && status !== "cancelled") {
    return res.status(403).json({ error: "Tourists can only cancel a ride" });
  }
  if (isDriver && !["arriving", "in_progress", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status transition for a driver" });
  }

  ride.status = status;
  if (status === "arriving") ride.arrivedAt = new Date();
  if (status === "in_progress") {
    ride.startedAt = new Date();
    // Auto-compute waiting seconds from arrivedAt → startedAt
    if (ride.arrivedAt) {
      const autoWaiting = Math.round((ride.startedAt - ride.arrivedAt) / 1000);
      // Allow override via body.waitingSeconds (e.g. manual stop timer)
      ride.waitingSeconds = req.body.waitingSeconds != null
        ? Math.max(0, Number(req.body.waitingSeconds))
        : Math.max(0, autoWaiting);
    }
  }
  if (status === "completed") {
    ride.completedAt = new Date();
    // Recalculate final fare from actual distance + waiting time
    const config = await getFareConfig(ride.vehicleType);
    const totalWaitingSec = ride.waitingSeconds || 0;
    const { amount, currency, breakdown } = calculateFare(
      config,
      ride.distanceMeters || 0,
      totalWaitingSec
    );
    ride.fareFinal = amount;
    ride.currency = currency;
    ride.fareBreakdown = breakdown;
  }
  if (status === "cancelled") {
    ride.cancelledBy = isTourist ? "tourist" : isDriver ? "driver" : "admin";
    ride.cancelReason = req.body.reason;
  }
  await ride.save();

  if (status === "completed" && ride.driver) {
    await Driver.findByIdAndUpdate(ride.driver._id || ride.driver, { $inc: { totalTrips: 1 } });
  }

  // Card payments are pre-authorized at request time; capture the final
  // amount now that the trip is actually done.
  if (status === "completed" && ride.paymentMode === "card" && ride.stripePaymentIntentId) {
    try {
      const stripe = getStripe();
      await stripe.paymentIntents.capture(ride.stripePaymentIntentId, {
        amount_to_capture: Math.round(ride.fareFinal * 100),
      });
      ride.paymentStatus = "paid";
    } catch (err) {
      console.error("[rides] Stripe capture failed:", err.message);
      ride.paymentStatus = "failed";
    }
    await ride.save();
  }

  const io = getIO();
  io.to(`ride:${ride._id}`).emit("ride:status", {
    rideId: ride._id,
    status: ride.status,
    fareFinal: ride.fareFinal,
    paymentStatus: ride.paymentStatus,
  });
  // Also push straight to the tourist's personal channel in case they
  // haven't joined the ride room yet (e.g. right after matching).
  io.to(`user:${ride.tourist}`).emit("ride:status", { rideId: ride._id, status: ride.status });

  res.json({ ride });
});

// Tourist: create a Stripe PaymentIntent for a card-paying ride. Uses
// manual capture — this authorizes the card now and the actual charge
// happens in the "completed" status handler above, once the final fare
// is known. See README.md ("Stripe setup") for getting a secret key.
router.post("/:id/payment-intent", requireAuth, requireRole("tourist"), async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (String(ride.tourist) !== req.user.id) return res.status(403).json({ error: "Not your ride" });
  if (ride.paymentMode !== "card") return res.status(400).json({ error: "This ride isn't set to pay by card" });

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(ride.fareEstimate * 100),
    currency: (ride.currency || "usd").toLowerCase(),
    capture_method: "manual",
    automatic_payment_methods: { enabled: true },
    metadata: { rideId: String(ride._id), touristId: req.user.id },
  });

  ride.stripePaymentIntentId = intent.id;
  ride.paymentStatus = "authorized";
  await ride.save();

  res.json({ clientSecret: intent.client_secret });
});

// Driver: confirm cash was collected in hand at trip end.
router.post("/:id/cash-collected", requireAuth, requireRole("driver"), async (req, res) => {
  const ride = await Ride.findById(req.params.id).populate("driver");
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (!ride.driver || String(ride.driver.owner) !== req.user.id) return res.status(403).json({ error: "Not your ride" });
  if (ride.paymentMode !== "cash") return res.status(400).json({ error: "This ride isn't a cash payment" });

  ride.paymentStatus = "paid";
  await ride.save();
  res.json({ ride });
});

router.get("/mine", requireAuth, requireRole("tourist"), async (req, res) => {
  const rides = await Ride.find({ tourist: req.user.id })
    .sort("-createdAt")
    .populate({ path: "driver", populate: { path: "owner", select: "name phone" } });
  res.json({ rides });
});

router.get("/driver/mine", requireAuth, requireRole("driver"), async (req, res) => {
  const driver = await Driver.findOne({ owner: req.user.id });
  if (!driver) return res.status(404).json({ error: "No driver profile found for this account" });
  const rides = await Ride.find({ driver: driver._id }).sort("-createdAt").populate("tourist", "name phone");
  res.json({ rides });
});

router.get("/:id", requireAuth, async (req, res) => {
  const ride = await Ride.findById(req.params.id).populate("driver").populate("tourist", "name phone");
  if (!ride) return res.status(404).json({ error: "Ride not found" });

  const isTourist = String(ride.tourist._id || ride.tourist) === req.user.id;
  const isDriver = ride.driver && String(ride.driver.owner) === req.user.id;
  if (!isTourist && !isDriver && req.user.role !== "admin") {
    return res.status(403).json({ error: "You're not part of this ride" });
  }
  res.json({ ride });
});

export default router;
