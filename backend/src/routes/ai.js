import { Router } from "express";
import Listing from "../models/Listing.js";
import Itinerary from "../models/Itinerary.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { runLocalLlm, localModelFileExists } from "../llm/localLlm.js";

const router = Router();

/**
 * This is the entry point for the AI assistant service described in the
 * architecture (a separate service for recommendations/chat/itinerary
 * generation). Here it's implemented as a thin route that:
 *   1. Pulls candidate listings from the catalog based on interests/budget.
 *   2. If a local GGUF model is available (backend/models/model.gguf, or
 *      LLM_MODEL_PATH), asks it to sequence them into a day-by-day
 *      itinerary and to answer free-form chat questions. This runs fully
 *      in-process via node-llama-cpp — no API key, no network call.
 *   3. Otherwise falls back to a deterministic rules-based planner so the
 *      product still works before a model file has been downloaded.
 * In production this logic should live in its own service behind the
 * API gateway, as noted in "Recommended backend services".
 */

async function callLocalLlm(prompt, options) {
  if (!localModelFileExists()) return null;
  try {
    return await runLocalLlm(prompt, options);
  } catch (err) {
    console.error("[ai] local LLM error:", err.message);
    return null;
  }
}

function rulesBasedPlan(listings, days) {
  const perDay = Math.max(1, Math.ceil(listings.length / days));
  const items = [];
  let cursor = 0;
  for (let day = 1; day <= days; day++) {
    for (let i = 0; i < perDay && cursor < listings.length; i++, cursor++) {
      items.push({
        day,
        title: listings[cursor].title,
        listing: listings[cursor]._id,
        notes: `Suggested ${listings[cursor].category} for day ${day}`,
      });
    }
  }
  return items;
}

router.post("/plan-trip", requireAuth, requireRole("tourist"), async (req, res) => {
  const { interests = [], budgetLevel = "mid", startDate, endDate, city } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });

  const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);

  const filter = { isActive: true };
  if (interests.length) filter.tags = { $in: interests };
  const candidates = await Listing.find(filter).populate("location").limit(30);

  let items;
  const llmText = await callLocalLlm(
    `A tourist wants a ${days}-day trip ` +
      `(budget level: ${budgetLevel}, interests: ${interests.join(", ") || "general sightseeing"}` +
      (city ? `, based near ${city}` : "") +
      `). From this list of available listings, propose a day-by-day plan. ` +
      `Listings (id | title | category | tags): ` +
      candidates.map((c) => `${c._id} | ${c.title} | ${c.category} | ${(c.tags || []).join(",")}`).join("; ") +
      `\n\nRespond ONLY with JSON, no other text: an array of {"day": number, "title": string, "listingId": string, "notes": string}.`,
    {
      systemPrompt:
        "You are a Sri Lanka trip planning assistant. You only ever respond with valid JSON, never prose.",
      maxTokens: 900,
    }
  );

  if (llmText) {
    try {
      const clean = llmText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      items = parsed.map((p) => ({ day: p.day, title: p.title, listing: p.listingId, notes: p.notes }));
    } catch {
      items = rulesBasedPlan(candidates, days);
    }
  } else {
    items = rulesBasedPlan(candidates, days);
  }

  const itinerary = await Itinerary.create({
    tourist: req.user.id,
    title: `${days}-day Sri Lanka trip`,
    startDate,
    endDate,
    generatedByAI: true,
    items,
  });

  res.status(201).json({ itinerary });
});

// Lightweight multilingual chat endpoint for the AI assistant widget.
router.post("/chat", requireAuth, async (req, res) => {
  const { message, language = "en" } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  const llmText = await callLocalLlm(message, {
    systemPrompt:
      `You are a friendly, safety-conscious Sri Lanka tourism assistant. ` +
      `Reply in language code "${language}". Keep answers concise and practical.`,
    maxTokens: 500,
  });

  res.json({
    reply:
      llmText ||
      "The local AI model isn't set up on the server yet. Download a GGUF model into backend/models/ " +
        "(see backend/models/README.md) to enable live chat — no API key needed.",
  });
});

router.get("/itineraries/mine", requireAuth, requireRole("tourist"), async (req, res) => {
  const itineraries = await Itinerary.find({ tourist: req.user.id }).sort("-createdAt");
  res.json({ itineraries });
});

export default router;
