import "dotenv/config";
import "express-async-errors";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { initSocket } from "./realtime/socket.js";

import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import bookingRoutes from "./routes/bookings.js";
import vendorRoutes from "./routes/vendors.js";
import adminRoutes from "./routes/admin.js";
import reviewRoutes from "./routes/reviews.js";
import supportRoutes from "./routes/support.js";
import aiRoutes from "./routes/ai.js";
import paymentRoutes from "./routes/payments.js";
import messageRoutes from "./routes/messages.js";
import driverRoutes from "./routes/drivers.js";
import rideRoutes from "./routes/rides.js";
import imageRoutes from "./routes/images.js";
import placeRoutes from "./routes/places.js";
import stripeWebhookHandler from "./routes/stripeWebhook.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));

// Stripe webhooks must be registered BEFORE express.json() with a raw body
// parser, since the signature check needs the exact raw request bytes.
app.post("/api/payments/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// This Express app acts as the single API gateway surface referenced in the
// architecture: web app, mobile app, and partner integrations all call
// these same versioned endpoints under /api.
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/places", placeRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);
initSocket(httpServer);

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => console.log(`[server] Lanka Tourism API (+ realtime) listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("[server] Failed to connect to MongoDB", err);
    process.exit(1);
  });

export default app;
