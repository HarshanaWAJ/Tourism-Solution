import { Router } from "express";
import Message from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const { thread, recipientId, body, originalLanguage } = req.body;
  const message = await Message.create({
    thread,
    sender: req.user.id,
    recipient: recipientId,
    body,
    originalLanguage,
  });
  res.status(201).json({ message });
});

router.get("/thread/:thread", requireAuth, async (req, res) => {
  const messages = await Message.find({ thread: req.params.thread }).sort("createdAt");
  res.json({ messages });
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });
  if (String(message.recipient) !== req.user.id) return res.status(403).json({ error: "Not your message" });
  message.readAt = new Date();
  await message.save();
  res.json({ message });
});

export default router;
