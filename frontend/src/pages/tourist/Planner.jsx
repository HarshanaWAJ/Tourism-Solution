import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, MapPin, Car, Eye, Printer, CheckCircle2, Cloud, Send } from "lucide-react";
import { api } from "../../api/client.js";
import { Badge, Button, Card, ErrorBanner } from "../../components/ui.jsx";

const INTERESTS = ["culture", "wildlife", "beach", "hiking", "food", "surfing", "family-friendly"];

export default function Planner() {
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get("city") || "";
  const initialListingId = searchParams.get("listingId") || "";

  const [form, setForm] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    budgetLevel: "mid",
    city: initialCity,
    selectedListingIds: initialListingId ? [initialListingId] : [],
    interests: [],
  });

  const [itinerary, setItinerary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [weatherPreview, setWeatherPreview] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [cityListings, setCityListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    { from: "assistant", text: "Ayubowan! Select your destination city and dates below to automatically generate a weather-optimized & travel-time accurate trip plan." },
  ]);
  const [chatBusy, setChatBusy] = useState(false);

  const [savedTrips, setSavedTrips] = useState([]);
  const [savingBusy, setSavingBusy] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);

  async function loadSavedTrips() {
    try {
      const res = await api.myItineraries("confirmed");
      setSavedTrips(res.itineraries || []);
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    loadSavedTrips();
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchPreview() {
      if (!form.city) {
        setWeatherPreview(null);
        return;
      }
      setWeatherLoading(true);
      try {
        const res = await api.getWeatherForecast({ city: form.city, startDate: form.startDate, endDate: form.endDate });
        if (active) setWeatherPreview(res.forecasts || []);
      } catch {
        if (active) setWeatherPreview(null);
      } finally {
        if (active) setWeatherLoading(false);
      }
    }
    fetchPreview();
    return () => { active = false; };
  }, [form.city, form.startDate, form.endDate]);

  useEffect(() => {
    let active = true;
    async function fetchCityPlaces() {
      if (!form.city || !form.city.trim()) {
        setCityListings([]);
        return;
      }
      setLoadingListings(true);
      try {
        const res = await api.searchListings({ city: form.city });
        if (active) setCityListings(res.results || []);
      } catch {
        if (active) setCityListings([]);
      } finally {
        if (active) setLoadingListings(false);
      }
    }
    fetchCityPlaces();
    return () => { active = false; };
  }, [form.city]);

  function removeItem(idx) {
    setItinerary((it) => ({ ...it, items: it.items.filter((_, i) => i !== idx) }));
  }

  async function acceptItinerary() {
    setSavingBusy(true);
    setError("");
    try {
      if (itinerary.items.length !== (itinerary._originalCount ?? itinerary.items.length)) {
        await api.updateItinerary(itinerary._id, { items: itinerary.items });
      }
      const res = await api.acceptItinerary(itinerary._id);
      setItinerary(res.itinerary);
      setSelectedTripId(res.itinerary._id);
      loadSavedTrips();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBusy(false);
    }
  }

  async function discardItinerary() {
    if (!itinerary?._id) return;
    try {
      await api.discardItinerary(itinerary._id);
    } catch {
      // ignore
    }
    setItinerary(null);
    setSelectedTripId(null);
  }

  function toggleInterest(i) {
    setForm((f) => ({ ...f, interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i] }));
  }

  function togglePlaceSelection(listingId) {
    setForm((f) => {
      const exists = f.selectedListingIds.includes(listingId);
      return { ...f, selectedListingIds: exists ? f.selectedListingIds.filter((id) => id !== listingId) : [...f.selectedListingIds, listingId] };
    });
  }

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.planTrip(form);
      setItinerary({ ...res.itinerary, _originalCount: res.itinerary.items.length });
      setSelectedTripId(res.itinerary._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function viewSavedTripDetails(trip) {
    setItinerary(trip);
    setSelectedTripId(trip._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function printItinerary() {
    if (!itinerary) return;
    const days = Array.from(new Set(itinerary.items.map((i) => i.day)));

    const dayHtml = days.map((day) => {
      const dayItems = itinerary.items.filter((i) => i.day === day);
      const dayWeather = (itinerary.dailyWeather || []).find((w) => w.day === day) || dayItems[0]?.weather;

      const weatherHeader = dayWeather
        ? `<div class="day-weather">${dayWeather.icon} ${dayWeather.condition} &nbsp; ${dayWeather.tempMax}°C / ${dayWeather.tempMin}°C &nbsp;•&nbsp; ${dayWeather.rainProb}% rain chance</div>`
        : "";
      const recBadge = dayWeather?.recommendation
        ? `<div class="day-rec">${dayWeather.recommendation}</div>` : "";

      const itemsHtml = dayItems.map((item) => {
        const travel = item.travelFromPrevious?.durationSeconds > 0
          ? `<div class="travel-leg">🚗 Travel: ${item.travelFromPrevious.durationText} (${item.travelFromPrevious.distanceText})</div>` : "";
        return `${travel}
          <div class="stop">
            <div class="stop-time">${item.startTime || "Morning"}</div>
            <div class="stop-body">
              <h4>${item.title}</h4>
              ${item.locationName ? `<p class="location">📍 ${item.locationName}</p>` : ""}
              <p class="notes">${item.notes || ""}</p>
              ${item.weather?.recommendation ? `<p class="weather-rec">${item.weather.icon} ${item.weather.recommendation}</p>` : ""}
            </div>
          </div>`;
      }).join("");

      return `<div class="day-block">
        <div class="day-header">Day ${day} ${weatherHeader} ${recBadge}</div>
        <div class="day-items">${itemsHtml}</div>
      </div>`;
    }).join("");

    const startStr = new Date(itinerary.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const endStr = new Date(itinerary.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${itinerary.title} — Ceylon Way Trip Plan</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #0a2620; background: #fff; padding: 32px 40px; }
    .brand { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #b45309; font-weight: 600; }
    h1 { font-family: 'Fraunces', serif; font-size: 28px; color: #0a2620; margin: 6px 0 4px; }
    .meta { font-size: 12px; color: #0a2620aa; margin-bottom: 28px; border-bottom: 1px solid #e2f0ec; padding-bottom: 16px; }
    .day-block { margin-bottom: 24px; border: 1px solid #e2f0ec; border-radius: 12px; overflow: hidden; break-inside: avoid; }
    .day-header { background: #f0f9f6; padding: 10px 16px; font-weight: 600; font-size: 12px; color: #134e4a; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .day-weather { font-size: 12px; color: #0a2620; }
    .day-rec { font-size: 11px; color: #6b7280; background: white; border: 1px solid #e2f0ec; border-radius: 20px; padding: 2px 10px; }
    .day-items { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
    .travel-leg { font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 5px 12px; width: fit-content; }
    .stop { display: flex; gap: 12px; }
    .stop-time { font-size: 11px; font-weight: 600; color: #134e4a; background: #f0f9f6; border: 1px solid #e2f0ec; border-radius: 6px; padding: 3px 8px; white-space: nowrap; align-self: flex-start; margin-top: 2px; }
    .stop-body { flex: 1; }
    .stop-body h4 { font-size: 14px; font-weight: 600; color: #0a2620; }
    .location { font-size: 11px; color: #134e4a; margin-top: 2px; font-weight: 500; }
    .notes { font-size: 11px; color: #0a262099; margin-top: 4px; line-height: 1.5; }
    .weather-rec { font-size: 11px; color: #134e4a; margin-top: 4px; font-weight: 500; border-top: 1px solid #f0f9f6; padding-top: 4px; }
    .footer { margin-top: 32px; font-size: 10px; color: #0a262055; text-align: center; border-top: 1px solid #e2f0ec; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="brand">Ceylon Way — Lanka Tourism Platform</div>
  <h1>${itinerary.title}</h1>
  <div class="meta">📅 ${startStr} – ${endStr} &nbsp;•&nbsp; ${itinerary.items.length} scheduled stops &nbsp;•&nbsp; Weather-optimised itinerary</div>
  ${dayHtml}
  <div class="footer">Generated by Ceylon Way AI Trip Planner · ceylonway.lk &nbsp;|&nbsp; Printed ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const message = chatInput;
    const history = chatLog.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    setChatLog((log) => [...log, { from: "user", text: message }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const res = await api.chat({ message, history, city: form.city || "colombo" });
      setChatLog((log) => [...log, { from: "assistant", text: res.reply }]);
    } catch (err) {
      setChatLog((log) => [...log, { from: "assistant", text: `Sorry — ${err.message}` }]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-6 h-6 text-saffron-500" /> AI trip planner</h1>
          <p className="text-teal-950/60">Select your target city and preferred locations to automatically sequence a weather-optimized trip plan.</p>
        </div>

        <Card as="form" onSubmit={generate} className="bg-teal-50 border-teal-900/8 shadow-none p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-teal-900">Destination city / region</label>
              <input
                type="text" placeholder="e.g. Kandy, Ella, Galle, Colombo"
                value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-teal-900">Budget level</label>
              <select value={form.budgetLevel} onChange={(e) => setForm({ ...form, budgetLevel: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white">
                <option value="budget">Budget</option>
                <option value="mid">Mid-range</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-teal-900">Start date</label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="text-sm font-medium text-teal-900">End date</label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white" />
            </div>
          </div>

          {form.city && (
            <div className="bg-white rounded-xl p-4 border border-teal-900/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Relevant places in {form.city} ({cityListings.length})
                </label>
                {loadingListings && <span className="text-xs text-teal-950/40">Loading places…</span>}
              </div>

              {cityListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {cityListings.map((listing) => {
                    const isSelected = form.selectedListingIds.includes(listing._id);
                    return (
                      <div
                        key={listing._id}
                        onClick={() => togglePlaceSelection(listing._id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected ? "bg-teal-900 text-sand-50 border-teal-900 font-medium" : "bg-teal-50/50 border-teal-900/10 text-teal-950 hover:bg-teal-100/50"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold truncate">{listing.title}</div>
                          <div className={`text-[10px] capitalize ${isSelected ? "text-sand-200" : "text-teal-950/60"}`}>
                            {listing.category} · {listing.location?.city}
                          </div>
                        </div>
                        <input type="checkbox" checked={isSelected} onChange={() => {}} className="h-4 w-4 accent-saffron-500 rounded cursor-pointer" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                !loadingListings && <p className="text-xs text-teal-950/50">Enter a destination city to view and pick specific places for your itinerary.</p>
              )}
            </div>
          )}

          {form.city && (
            <div className="bg-white rounded-xl p-3.5 border border-teal-900/10 text-xs">
              <div className="flex justify-between items-center mb-2 font-semibold text-teal-900">
                <span className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> Multi-day weather forecast ({form.city})</span>
                {weatherLoading && <span className="text-teal-950/40 font-normal">Loading weather…</span>}
              </div>
              {weatherPreview && weatherPreview.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {weatherPreview.map((w, idx) => (
                    <div key={idx} className="bg-teal-50/60 p-2 rounded-lg border border-teal-900/5">
                      <div className="font-medium text-teal-900 text-[11px]">{w.date}</div>
                      <div className="text-lg my-0.5">{w.icon}</div>
                      <div className="font-semibold">{w.tempMax}° / {w.tempMin}°C</div>
                      <div className="text-[10px] text-teal-950/60 mt-0.5">{w.condition} ({w.rainProb}% rain)</div>
                    </div>
                  ))}
                </div>
              ) : (
                !weatherLoading && <p className="text-teal-950/50">Enter dates to view live Open-Meteo weather predictions.</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-teal-900 block mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  type="button" key={i} onClick={() => toggleInterest(i)}
                  className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${
                    form.interests.includes(i) ? "bg-teal-900 text-sand-50 border-teal-900 font-medium" : "border-teal-900/20 text-teal-900 hover:bg-teal-100/50"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <ErrorBanner>{error}</ErrorBanner>

          <Button disabled={busy} className="w-full" size="lg">
            <Sparkles className="w-4 h-4" /> {busy ? "Sequencing routes & weather…" : "Generate weather & route plan"}
          </Button>
        </Card>

        {itinerary && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-teal-900/10 pb-4 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-2xl font-semibold text-teal-950">{itinerary.title}</h3>
                  {itinerary.status === "confirmed" && <Badge tone="tealSoft"><CheckCircle2 className="w-3 h-3" /> Saved</Badge>}
                </div>
                <p className="text-xs text-teal-950/60 mt-1 font-medium">
                  {new Date(itinerary.startDate).toLocaleDateString()} – {new Date(itinerary.endDate).toLocaleDateString()} · {itinerary.items?.length || 0} scheduled stops
                </p>
              </div>
              <Badge tone={itinerary.status === "confirmed" ? "teal" : "saffronSoft"}>
                {itinerary.status === "confirmed" ? "Saved itinerary" : "Draft — review & save"}
              </Badge>
            </div>

            {Array.from(new Set(itinerary.items.map((i) => i.day))).map((day) => {
              const dayItems = itinerary.items.filter((i) => i.day === day);
              const dayWeather = (itinerary.dailyWeather || []).find((w) => w.day === day) || dayItems[0]?.weather;

              return (
                <div key={day} className="rounded-xl border border-teal-900/10 overflow-hidden bg-sand-100/50">
                  <div className="bg-teal-900/5 px-4 py-3 border-b border-teal-900/10 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-widest text-saffron-600 font-bold">Day {day}</span>
                      {dayWeather && (
                        <span className="text-sm font-semibold text-teal-900 flex items-center gap-1.5">
                          <span>{dayWeather.icon}</span>
                          <span>{dayWeather.condition}</span>
                          <span className="text-xs text-teal-950/70 font-normal">({dayWeather.tempMax}°C / {dayWeather.tempMin}°C)</span>
                        </span>
                      )}
                    </div>
                    {dayWeather?.recommendation && (
                      <span className="text-[11px] bg-white text-teal-900 border border-teal-900/10 px-2.5 py-1 rounded-full font-medium">{dayWeather.recommendation}</span>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {dayItems.map((item, idx) => (
                      <div key={idx} className="space-y-3">
                        {item.travelFromPrevious && item.travelFromPrevious.durationSeconds > 0 && (
                          <div className="flex items-center gap-2 text-xs text-teal-900/70 bg-saffron-100/70 px-3 py-1.5 rounded-lg border border-saffron-500/20 w-fit">
                            <Car className="w-3.5 h-3.5 text-saffron-700" />
                            <span className="font-semibold text-saffron-700">Estimated travel:</span>
                            <span>{item.travelFromPrevious.durationText}</span>
                            <span className="text-saffron-700/60">({item.travelFromPrevious.distanceText})</span>
                          </div>
                        )}

                        <div className="bg-white p-4 rounded-xl border border-teal-900/10 flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-900/10 ledger">{item.startTime || "Morning"}</span>
                              <h4 className="font-semibold text-teal-950 text-base">{item.title}</h4>
                            </div>
                            {item.locationName && <p className="text-xs font-medium text-teal-900/70 flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.locationName}</p>}
                            <p className="text-xs text-teal-950/70 leading-relaxed pt-1">{item.notes}</p>

                            {item.weather?.recommendation && (
                              <div className="text-[11px] text-teal-800/80 font-medium flex items-center gap-1.5 pt-1.5 border-t border-teal-900/5 mt-2">
                                <span>{item.weather.icon}</span>
                                <span>{item.weather.recommendation}</span>
                              </div>
                            )}
                          </div>

                          {itinerary.status !== "confirmed" && (
                            <button type="button" onClick={() => removeItem(itinerary.items.indexOf(item))} className="text-xs text-ruby-600 hover:text-ruby-700 hover:underline shrink-0 pt-1 font-medium">
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {itinerary.status !== "confirmed" ? (
              <div className="flex gap-3 pt-4 border-t border-teal-900/10">
                <Button onClick={acceptItinerary} disabled={savingBusy || itinerary.items.length === 0} variant="dark" size="lg" className="flex-1">
                  {savingBusy ? "Saving trip…" : "Confirm & save to My Trips"}
                </Button>
                <Button onClick={discardItinerary} variant="ghost">Discard draft</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-3 border-t border-teal-900/10">
                <p className="text-xs text-teal-950/60 font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700" /> Saved to My Trips. View, print, or generate another plan anytime.</p>
                <Button onClick={printItinerary} size="sm"><Printer className="w-3.5 h-3.5" /> Print / export</Button>
              </div>
            )}
          </Card>
        )}

        {savedTrips.length > 0 && (
          <Card className="p-5 space-y-3">
            <h3 className="font-display text-lg font-semibold text-teal-950 flex items-center justify-between">
              <span>Your saved trips ({savedTrips.length})</span>
              <span className="text-xs text-teal-950/50 font-normal font-body">Click any trip to view full details</span>
            </h3>
            <ul className="space-y-2.5">
              {savedTrips.map((t) => {
                const isCurrent = selectedTripId === t._id;
                return (
                  <li
                    key={t._id} onClick={() => viewSavedTripDetails(t)}
                    className={`text-sm border rounded-xl p-3.5 flex justify-between items-center cursor-pointer transition ${
                      isCurrent ? "bg-teal-900 text-sand-50 border-teal-900" : "bg-teal-50/40 border-teal-900/10 text-teal-950 hover:bg-teal-100/50"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-base flex items-center gap-2">
                        <span>{t.title}</span>
                        {isCurrent && <Badge tone="saffronSoft">Viewing now</Badge>}
                      </div>
                      <div className={`text-xs mt-0.5 ${isCurrent ? "text-sand-100/80" : "text-teal-950/60"}`}>
                        {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()} · {t.items?.length || 0} scheduled stops
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); viewSavedTripDetails(t); }}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold border transition shrink-0 flex items-center gap-1.5 ${
                        isCurrent ? "bg-saffron-500 text-teal-950 border-saffron-400" : "bg-white text-teal-900 border-teal-900/20 hover:bg-teal-900 hover:text-sand-50"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> View details
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      <div className="lg:col-span-5 flex flex-col rounded-2xl bg-white overflow-hidden h-[620px] shadow-card sticky top-24">
        <div className="bg-teal-900 text-sand-50 px-5 py-3.5 font-display text-lg flex items-center justify-between">
          <span>AI travel assistant</span>
          <span className="text-xs font-body font-normal opacity-70">Multilingual</span>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-teal-50/20">
          {chatLog.map((m, idx) => (
            <div key={idx} className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from === "user" ? "ml-auto bg-teal-900 text-sand-50" : "bg-white border border-teal-900/10 text-teal-950"}`}>
              {m.text}
            </div>
          ))}
          {chatBusy && <div className="text-xs text-teal-950/40 italic">Assistant is thinking…</div>}
        </div>
        <form onSubmit={sendChat} className="p-3 border-t border-teal-900/10 flex gap-2 bg-white">
          <input
            value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about visas, weather, transport…"
            className="flex-1 rounded-full border border-teal-900/15 px-4 py-2 text-sm focus:outline-none focus:border-teal-700"
          />
          <button className="bg-teal-900 text-sand-50 rounded-full px-4 text-sm font-medium hover:bg-teal-800 transition flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
