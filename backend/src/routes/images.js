import { Router } from "express";
import Image from "../models/Image.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

/**
 * Any authenticated user (tourist, vendor, admin) can upload images —
 * used for place suggestions, listing photos, and verification docs.
 * The bytes are base64-encoded and saved straight into the Image
 * collection in MongoDB; nothing is written to the filesystem or a
 * third-party bucket.
 */
router.post("/", requireAuth, upload.array("images", 6), async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: "No images uploaded" });

  const docs = await Image.insertMany(
    files.map((f) => ({
      filename: f.originalname,
      contentType: f.mimetype,
      data: f.buffer.toString("base64"),
      sizeBytes: f.size,
      uploadedBy: req.user.id,
      context: req.body.context || "general",
    }))
  );

  res.status(201).json({
    images: docs.map((d) => ({ id: d._id, url: `/api/images/${d._id}` })),
  });
});

// Publicly readable so <img> tags can point straight at it.
router.get("/:id", async (req, res) => {
  const image = await Image.findById(req.params.id);
  if (!image) return res.status(404).json({ error: "Image not found" });
  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(Buffer.from(image.data, "base64"));
});

export default router;
