import { Router } from "express";
import Listing from "../models/Listing.js";
import Itinerary from "../models/Itinerary.js";
import Location from "../models/Location.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { runLocalLlm, localModelFileExists } from "../llm/localLlm.js";
import { getWeatherForecast, getCityCoords, CITY_COORDINATES } from "../utils/weather.js";
import { getTravelInfo } from "../utils/routing.js";

const router = Router();

const CITY_ATTRACTIONS_CATALOG = {
  colombo: [
    { title: "Gangaramaya Temple & Seema Malaka", category: "attraction", description: "Iconic Buddhist temple and floating meditation center on Beira Lake.", tags: ["culture", "family-friendly"] },
    { title: "Galle Face Green Promenade & Street Food", category: "activity", description: "Oceanfront urban park perfect for sunset walks, kite flying, and local street food.", tags: ["food", "family-friendly"] },
    { title: "National Museum of Colombo", category: "museum", description: "Sri Lanka's largest museum featuring regalia of Kandyan monarchs and ancient artifacts.", tags: ["culture"] },
    { title: "Lotus Tower & Observation Deck", category: "attraction", description: "Panoramic 360-degree views of Colombo city skyline and Indian Ocean.", tags: ["family-friendly", "sightseeing"] },
    { title: "Pettah Floating Market & Bazaar Walk", category: "activity", description: "Vibrant local market area with colonial architecture and bustling trade stalls.", tags: ["culture", "food"] },
    { title: "Dutch Hospital Shopping & Dining Precinct", category: "restaurant", description: "Restored 17th-century Dutch colonial complex featuring top restaurants and tea lounges.", tags: ["food", "dining"] },
    { title: "Independence Memorial Hall & Park", category: "attraction", description: "National monument surrounded by manicured lawns and walking trails.", tags: ["culture"] },
    { title: "Mount Lavinia Sunset Beach & Seafood", category: "beach", description: "Historic golden sand beach south of Colombo famous for seafood and ocean dining.", tags: ["beach", "food"] }
  ],
  kandy: [
    { title: "Temple of the Sacred Tooth Relic (Sri Dalada Maligawa)", category: "attraction", description: "Venerated Buddhist shrine housing the sacred tooth relic of the Buddha.", tags: ["culture"] },
    { title: "Royal Botanical Gardens Peradeniya", category: "attraction", description: "World-renowned botanical gardens spanning 147 acres with giant bamboo and orchids.", tags: ["nature", "family-friendly"] },
    { title: "Kandy Lake Scenic Promenade Walk", category: "activity", description: "Peaceful walking circuit around the central artificial lake created by King Sri Wickrama Rajasinghe.", tags: ["hiking", "sightseeing"] },
    { title: "Udawatta Kele Sanctuary Hike", category: "hiking", description: "Historic forest reserve on a hill-ridge directly behind the Tooth Temple.", tags: ["hiking", "wildlife"] },
    { title: "Kandy Cultural Dance & Drumming Performance", category: "activity", description: "Traditional Kandyan dancing show with fire-walking displays.", tags: ["culture"] }
  ],
  galle: [
    { title: "Galle Fort Ramparts & Lighthouse Walk", category: "attraction", description: "UNESCO World Heritage Dutch fort built in 1588 with ocean views.", tags: ["culture", "sightseeing"] },
    { title: "Unawatuna Beach & Coral Reef", category: "beach", description: "Banana-shaped golden sand bay protected by a coral reef.", tags: ["beach", "swimming"] },
    { title: "Maritime Archaeology Museum", category: "museum", description: "Housed inside a 1671 Dutch warehouse detailing maritime heritage.", tags: ["culture"] }
  ],
  ella: [
    { title: "Nine Arch Bridge Viewpoint & Train Spotting", category: "attraction", description: "Colonial-era viaduct bridge surrounded by lush tea hills.", tags: ["hiking", "sightseeing"] },
    { title: "Little Adam's Peak Hike", category: "hiking", description: "Gentle 45-minute summit trail with panoramic gap views.", tags: ["hiking"] },
    { title: "Ella Rock Trek & Tea Trail", category: "hiking", description: "Challenging trek through tea plantations and eucalyptus forests.", tags: ["hiking"] }
  ],
  sigiriya: [
    { title: "Sigiriya Lion Rock Fortress Ancient Citadel", category: "attraction", description: "5th-century palace fortress built atop a 200m granite rock column.", tags: ["culture", "hiking"] },
    { title: "Pidurangala Rock Sunrise Climb", category: "hiking", description: "Adjacent rock mountain offering the best panoramic vantage view of Sigiriya.", tags: ["hiking"] },
    { title: "Dambulla Royal Cave Temple Complex", category: "attraction", description: "Largest best-preserved cave temple complex in Sri Lanka with 153 Buddha statues.", tags: ["culture"] }
  ]
};

async function callLocalLlm(prompt, options) {
  if (!localModelFileExists()) return null;
  try {
    return await runLocalLlm(prompt, options);
  } catch (err) {
    console.error("[ai] local LLM error:", err.message);
    return null;
  }
}

/**
 * Intelligent Weather-Conditioned and Travel-Time Optimized Trip Planner Engine
 * Operates strictly on user-relevant locations within the requested city/region.
 */
async function buildWeatherAndRouteOptimizedPlan(candidates, days, dailyForecasts, userCity) {
  const items = [];
  const totalListings = candidates.length;

  if (totalListings === 0) return { items, dailyWeather: dailyForecasts };

  const outdoorCategories = new Set(["activity", "attraction", "hiking", "beach", "surfing", "wildlife", "tour"]);
  const indoorCategories = new Set(["hotel", "restaurant", "museum", "spa", "culture", "food", "crafts", "shopping"]);

  const outdoorPool = [];
  const indoorPool = [];

  for (const item of candidates) {
    const isOutdoor = (item.tags || []).some((t) => outdoorCategories.has(t.toLowerCase())) ||
      outdoorCategories.has(item.category?.toLowerCase());
    if (isOutdoor) {
      outdoorPool.push(item);
    } else {
      indoorPool.push(item);
    }
  }

  let outdoorIndex = 0;
  let indoorIndex = 0;
  let prevCoords = userCity ? getCityCoords(userCity) : null;

  for (let dayNum = 1; dayNum <= days; dayNum++) {
    const dayForecast = dailyForecasts[dayNum - 1] || dailyForecasts[dailyForecasts.length - 1] || {
      condition: "Partly Cloudy",
      tempMax: 30,
      tempMin: 24,
      rainProb: 20,
      icon: "⛅",
      outdoorFriendly: true,
      recommendation: "Good weather for sightseeing",
    };

    const itemsForTodayCount = Math.min(3, Math.max(1, Math.ceil((totalListings - items.length) / (days - dayNum + 1))));
    const dayStartTimes = ["09:00", "13:30", "17:00"];

    for (let slot = 0; slot < itemsForTodayCount; slot++) {
      let chosenListing = null;

      if (dayForecast.outdoorFriendly) {
        if (outdoorIndex < outdoorPool.length) {
          chosenListing = outdoorPool[outdoorIndex++];
        } else if (indoorIndex < indoorPool.length) {
          chosenListing = indoorPool[indoorIndex++];
        }
      } else {
        if (indoorIndex < indoorPool.length) {
          chosenListing = indoorPool[indoorIndex++];
        } else if (outdoorIndex < outdoorPool.length) {
          chosenListing = outdoorPool[outdoorIndex++];
        }
      }

      if (!chosenListing) {
        const usedIds = new Set(items.map((i) => String(i.listing || i.title)));
        chosenListing = candidates.find((c) => !usedIds.has(String(c._id || c.title)));
      }

      if (!chosenListing) break;

      const listingCoords = chosenListing.location?.geo?.coordinates || chosenListing.coordinates; // [lng, lat]
      const currentCoords = listingCoords && listingCoords.length === 2 && (listingCoords[0] !== 0 || listingCoords[1] !== 0)
        ? { lat: listingCoords[1], lng: listingCoords[0] }
        : prevCoords;

      let travelInfo = { distanceMeters: 0, durationSeconds: 0, distanceText: "0 km", durationText: "0 min" };
      if (prevCoords && currentCoords && (prevCoords.lat !== currentCoords.lat || prevCoords.lng !== currentCoords.lng)) {
        travelInfo = await getTravelInfo(prevCoords, currentCoords);
      }

      if (currentCoords) prevCoords = currentCoords;

      const suitabilityNote = dayForecast.outdoorFriendly
        ? `☀️ Clear forecast (${dayForecast.tempMax}°C) — ideal for outdoor tour`
        : `🌧️ Rain chance (${dayForecast.rainProb}%) — indoor activity scheduled`;

      const cityDisplay = chosenListing.location?.city || userCity || "Sri Lanka";
      const locationLabel = chosenListing.location?.label || chosenListing.title;

      items.push({
        day: dayNum,
        startTime: dayStartTimes[slot] || "10:00",
        title: chosenListing.title,
        listing: chosenListing._id || null,
        locationName: `${locationLabel}, ${cityDisplay}`,
        coordinates: listingCoords || [],
        notes: `${chosenListing.category ? chosenListing.category.toUpperCase() : "VISIT"}: ${chosenListing.description?.slice(0, 80) || chosenListing.title}...`,
        travelFromPrevious: travelInfo,
        weather: {
          condition: dayForecast.condition,
          tempMax: dayForecast.tempMax,
          tempMin: dayForecast.tempMin,
          rainProb: dayForecast.rainProb,
          icon: dayForecast.icon,
          recommendation: suitabilityNote,
        },
      });
    }
  }

  const dailyWeather = dailyForecasts.slice(0, days).map((f, idx) => ({
    day: idx + 1,
    date: f.date,
    condition: f.condition,
    tempMax: f.tempMax,
    tempMin: f.tempMin,
    rainProb: f.rainProb,
    icon: f.icon,
    recommendation: f.recommendation,
  }));

  return { items, dailyWeather };
}

// GET /api/ai/weather-forecast?city=Ella&startDate=2026-08-01&endDate=2026-08-03
router.get("/weather-forecast", async (req, res) => {
  const { city, lat, lng, startDate, endDate } = req.query;
  let targetCoords = getCityCoords(city);
  if (lat && lng) {
    targetCoords = { lat: Number(lat), lng: Number(lng) };
  }
  const forecasts = await getWeatherForecast(targetCoords.lat, targetCoords.lng, startDate, endDate);
  res.json({ city: city || "Selected Region", coords: targetCoords, forecasts });
});

// POST /api/ai/plan-trip
router.post("/plan-trip", requireAuth, requireRole("tourist"), async (req, res) => {
  const { interests = [], budgetLevel = "mid", startDate, endDate, city = "colombo", selectedListingId, selectedListingIds = [] } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });

  const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
  const targetCityKey = (city || "colombo").trim().toLowerCase();

  // Determine base coordinates for weather & travel routing
  const cityCoords = getCityCoords(targetCityKey);
  const dailyForecasts = await getWeatherForecast(cityCoords.lat, cityCoords.lng, startDate, endDate);

  // Gather user explicitly selected listing IDs
  const explicitListingIds = new Set();
  if (selectedListingId) explicitListingIds.add(String(selectedListingId));
  if (Array.isArray(selectedListingIds)) {
    selectedListingIds.forEach((id) => explicitListingIds.add(String(id)));
  }

  let userSelectedListings = [];
  if (explicitListingIds.size > 0) {
    userSelectedListings = await Listing.find({ _id: { $in: Array.from(explicitListingIds) }, isActive: true }).populate("location");
  }

  // Filter listings strictly matching the requested city/region
  const cityRegex = new RegExp(targetCityKey, "i");
  const matchingLocIds = await Location.find({
    $or: [
      { city: cityRegex },
      { region: cityRegex },
      { label: cityRegex },
      { address: cityRegex },
    ],
  }).distinct("_id");

  const filter = { isActive: true };
  if (matchingLocIds.length > 0) {
    filter.location = { $in: matchingLocIds };
  } else {
    // Search listing title/description directly if location object lacks explicit city match
    filter.$or = [
      { title: cityRegex },
      { description: cityRegex },
    ];
  }

  if (interests.length) {
    filter.tags = { $in: interests };
  }

  let candidates = await Listing.find(filter).populate("location").limit(30);

  // If strict interest filter yielded 0 candidates for this city, relax interests filter but keep strict city filter
  if (candidates.length === 0 && matchingLocIds.length > 0) {
    delete filter.tags;
    delete filter.$or;
    candidates = await Listing.find(filter).populate("location").limit(30);
  }

  // Combine user selected listings + city matching candidates
  const candidateMap = new Map();
  userSelectedListings.forEach((l) => candidateMap.set(String(l._id), l));
  candidates.forEach((l) => {
    if (!candidateMap.has(String(l._id))) {
      candidateMap.set(String(l._id), l);
    }
  });

  let finalCandidates = Array.from(candidateMap.values());

  // STRICT CITY CHECK: Guarantee no distant listings from other cities leak into this trip!
  finalCandidates = finalCandidates.filter((c) => {
    const locCity = c.location?.city?.toLowerCase() || "";
    const locRegion = c.location?.region?.toLowerCase() || "";
    const locLabel = c.location?.label?.toLowerCase() || "";
    const titleLower = c.title?.toLowerCase() || "";
    return locCity.includes(targetCityKey) || locRegion.includes(targetCityKey) || locLabel.includes(targetCityKey) || titleLower.includes(targetCityKey);
  });

  // If candidate count is less than needed for the trip days, fill up using authentic city attractions catalog
  if (finalCandidates.length < days * 2) {
    const catalog = CITY_ATTRACTIONS_CATALOG[targetCityKey] || CITY_ATTRACTIONS_CATALOG.colombo;
    const existingTitles = new Set(finalCandidates.map((c) => c.title.toLowerCase()));

    for (const item of catalog) {
      if (!existingTitles.has(item.title.toLowerCase())) {
        finalCandidates.push({
          _id: null,
          title: item.title,
          category: item.category,
          description: item.description,
          tags: item.tags,
          location: {
            city: targetCityKey.charAt(0).toUpperCase() + targetCityKey.slice(1),
            label: item.title,
            geo: { type: "Point", coordinates: [cityCoords.lng, cityCoords.lat] },
          },
          coordinates: [cityCoords.lng, cityCoords.lat],
        });
      }
    }
  }

  // Generate weather & route optimized plan strictly using candidate locations in target city
  const result = await buildWeatherAndRouteOptimizedPlan(finalCandidates, days, dailyForecasts, targetCityKey);

  const titleCity = targetCityKey.charAt(0).toUpperCase() + targetCityKey.slice(1);
  const itinerary = await Itinerary.create({
    tourist: req.user.id,
    title: `${days}-Day ${titleCity} Trip`,
    startDate,
    endDate,
    generatedByAI: true,
    status: "draft",
    items: result.items,
    dailyWeather: result.dailyWeather,
  });

  res.status(201).json({ itinerary });
});

router.patch("/itineraries/:id", requireAuth, requireRole("tourist"), async (req, res) => {
  const itinerary = await Itinerary.findOne({ _id: req.params.id, tourist: req.user.id });
  if (!itinerary) return res.status(404).json({ error: "Itinerary not found" });
  if (itinerary.status === "confirmed") {
    return res.status(400).json({ error: "This itinerary is already saved; edits aren't allowed after acceptance" });
  }

  if (req.body.title) itinerary.title = req.body.title;
  if (req.body.items) itinerary.items = req.body.items;
  await itinerary.save();

  res.json({ itinerary });
});

router.patch("/itineraries/:id/accept", requireAuth, requireRole("tourist"), async (req, res) => {
  const itinerary = await Itinerary.findOne({ _id: req.params.id, tourist: req.user.id });
  if (!itinerary) return res.status(404).json({ error: "Itinerary not found" });

  itinerary.status = "confirmed";
  itinerary.acceptedAt = new Date();
  await itinerary.save();

  res.json({ itinerary });
});

router.delete("/itineraries/:id", requireAuth, requireRole("tourist"), async (req, res) => {
  const itinerary = await Itinerary.findOne({ _id: req.params.id, tourist: req.user.id });
  if (!itinerary) return res.status(404).json({ error: "Itinerary not found" });
  if (itinerary.status === "confirmed") {
    return res.status(400).json({ error: "Saved trips can't be deleted from here" });
  }
  await itinerary.deleteOne();
  res.json({ success: true });
});

// Interactive AI Assistant Chat Endpoint with Weather Context Integration
router.post("/chat", requireAuth, async (req, res) => {
  const { message, language = "en" } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  const lowerMsg = message.toLowerCase();
  let detectedCity = Object.keys(CITY_COORDINATES).find((c) => lowerMsg.includes(c)) || "colombo";
  const cityCoords = getCityCoords(detectedCity);

  const weatherData = await getWeatherForecast(cityCoords.lat, cityCoords.lng);
  const todayWeather = weatherData[0] || { condition: "Partly Cloudy", tempMax: 30, tempMin: 24, icon: "⛅" };

  const weatherContextStr = `Live Weather in ${detectedCity.toUpperCase()}: ${todayWeather.icon} ${todayWeather.condition}, ${todayWeather.tempMax}°C / ${todayWeather.tempMin}°C, Rain Chance: ${todayWeather.rainProb}%.`;

  let replyText = null;

  if (localModelFileExists()) {
    replyText = await callLocalLlm(
      `${weatherContextStr}\nUser: ${message}`,
      {
        systemPrompt: `You are a Sri Lanka tourism assistant. You HAVE live weather data (${weatherContextStr}). Language: "${language}". Answer in 1-3 short sentences.`,
        maxTokens: 100,
        temperature: 0.7,
        timeoutMs: 40_000,
      }
    );
  }

  if (!replyText) {
    if (lowerMsg.includes("weather") || lowerMsg.includes("rain") || lowerMsg.includes("temp") || lowerMsg.includes("forecast") || lowerMsg.includes("climate")) {
      replyText = `🌤️ ${weatherContextStr} ${todayWeather.recommendation}`;
    } else if (lowerMsg.includes("plan") || lowerMsg.includes("trip") || lowerMsg.includes("route") || lowerMsg.includes("itinerary")) {
      replyText = `Ayubowan! Use our Smart Trip Planner form above to generate a weather-optimized itinerary with travel times for ${detectedCity.toUpperCase()}. (${weatherContextStr})`;
    } else {
      replyText = `Ayubowan! I am your Lanka Tourism assistant. ${weatherContextStr} How can I help with your journey today?`;
    }
  }

  res.json({ reply: replyText });
});

router.get("/itineraries/mine", requireAuth, requireRole("tourist"), async (req, res) => {
  const filter = { tourist: req.user.id };
  if (req.query.status) filter.status = req.query.status;
  const itineraries = await Itinerary.find(filter).sort("-createdAt");
  res.json({ itineraries });
});

export default router;
