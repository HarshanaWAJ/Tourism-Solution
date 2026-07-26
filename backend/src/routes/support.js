import { Router } from "express";
import SupportTicket from "../models/SupportTicket.js";
import Alert from "../models/Alert.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public: active safety/scam/weather alerts (no auth needed — safety-critical)
router.get("/alerts", async (req, res) => {
  const now = new Date();
  const filter = {
    activeFrom: { $lte: now },
    $or: [{ activeUntil: null }, { activeUntil: { $gte: now } }],
  };
  if (req.query.region) filter.region = req.query.region;
  const alerts = await Alert.find(filter).sort("-severity -activeFrom").limit(50);
  res.json({ alerts });
});

router.post("/alerts", requireAuth, requireRole("admin"), async (req, res) => {
  const alert = await Alert.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ alert });
});

// Support tickets — including emergency category for the safety layer
router.post("/tickets", requireAuth, async (req, res) => {
  const { category, subject, description, priority, relatedBooking } = req.body;
  const ticket = await SupportTicket.create({
    user: req.user.id,
    category,
    subject,
    description,
    priority: category === "safety" ? "emergency" : priority,
    relatedBooking,
  });
  res.status(201).json({ ticket });
});

router.get("/tickets/mine", requireAuth, async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user.id }).sort("-createdAt");
  res.json({ tickets });
});

router.get("/tickets", requireAuth, requireRole("admin"), async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const tickets = await SupportTicket.find(filter)
    .sort("-priority -createdAt")
    .populate("user", "name email");
  res.json({ tickets });
});

router.patch("/tickets/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  Object.assign(ticket, req.body);
  await ticket.save();
  res.json({ ticket });
});

export default router;
