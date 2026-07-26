import { Router } from "express";
import PlaceSubmission from "../models/PlaceSubmission.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/**
 * Tourist suggests a place that wasn't found in Discover search. It sits
 * in "pending" until an admin reviews it (see routes/admin.js) — approval
 * turns it into a real Location + Listing with images attached.
 */
router.post("/", requireAuth, requireRole("tourist"), async (req, res) => {
  const { title, category, description, searchQueryContext, location, imageIds = [] } = req.body;

  if (!title || !location?.label || !location?.city) {
    return res.status(400).json({ error: "title, location.label, and location.city are required" });
  }

  const submission = await PlaceSubmission.create({
    submittedBy: req.user.id,
    title,
    category: category || "attraction",
    description,
    searchQueryContext,
    location,
    images: imageIds,
  });

  res.status(201).json({ submission });
});

// Tourist: track the status of places they've suggested.
router.get("/mine", requireAuth, requireRole("tourist"), async (req, res) => {
  const submissions = await PlaceSubmission.find({ submittedBy: req.user.id })
    .sort("-createdAt")
    .populate("images")
    .populate("resultingListing");
  res.json({ submissions });
});

export default router;
