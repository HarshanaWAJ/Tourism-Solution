import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

const INTERESTS = ["culture", "wildlife", "beach", "hiking", "food", "surfing", "family-friendly"];

export default function Planner() {
  const [form, setForm] = useState({ startDate: "", endDate: "", budgetLevel: "mid", city: "", interests: [] });
  const [itinerary, setItinerary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    { from: "assistant", text: "Ayubowan! Tell me your dates, budget, and interests below, or ask me anything about traveling in Sri Lanka." },
  ]);
  const [chatBusy, setChatBusy] = useState(false);

  const [savedTrips, setSavedTrips] = useState([]);
  const [savingBusy, setSavingBusy] = useState(false);

  async function loadSavedTrips() {
    try {
      const res = await api.myItineraries("confirmed");
      setSavedTrips(res.itineraries);
    } catch {
      // non-fatal — sidebar list just stays empty
    }
  }
  useEffect(() => { loadSavedTrips(); }, []);

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
      // ignore — worst case it just stays as an orphaned draft
    }
    setItinerary(null);
  }

  function toggleInterest(i) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i],
    }));
  }

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.planTrip(form);
      setItinerary({ ...res.itinerary, _originalCount: res.itinerary.items.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const message = chatInput;
    setChatLog((log) => [...log, { from: "user", text: message }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const res = await api.chat({ message });
      setChatLog((log) => [...log, { from: "assistant", text: res.reply }]);
    } catch (err) {
      setChatLog((log) => [...log, { from: "assistant", text: `Sorry — ${err.message}` }]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10">
      <div>
        <h1 className="font-display text-3xl font-semibold mb-2">AI Trip Planner</h1>
        <p className="text-teal-950/60 mb-6">Multilingual chat and route suggestions built from verified listings.</p>

        <form onSubmit={generate} className="bg-teal-50 rounded-2xl p-5 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-teal-900">Start date</label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-teal-900">End date</label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-teal-900">Budget level</label>
            <select value={form.budgetLevel} onChange={(e) => setForm({ ...form, budgetLevel: e.target.value })}
              className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm">
              <option value="budget">Budget</option>
              <option value="mid">Mid-range</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-teal-900 block mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button type="button" key={i} onClick={() => toggleInterest(i)}
                  className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${
                    form.interests.includes(i) ? "bg-teal-900 text-sand-50 border-teal-900" : "border-teal-900/20 text-teal-900"
                  }`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="w-full bg-saffron-500 text-teal-950 rounded-full py-3 font-medium hover:bg-saffron-400 transition disabled:opacity-60">
            {busy ? "Building your route…" : "Generate itinerary"}
          </button>
        </form>

        {itinerary && (
          <div className="border border-teal-900/10 rounded-2xl p-5 bg-white mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl">{itinerary.title}</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                itinerary.status === "confirmed" ? "bg-teal-800 text-sand-50" : "bg-saffron-100 text-saffron-600"
              }`}>
                {itinerary.status === "confirmed" ? "Saved" : "Draft — review before saving"}
              </span>
            </div>

            {Array.from(new Set(itinerary.items.map((i) => i.day))).map((day) => (
              <div key={day} className="mb-4">
                <p className="text-xs uppercase tracking-widest text-saffron-600 font-semibold mb-1">Day {day}</p>
                <ul className="space-y-1 text-sm text-teal-950/80">
                  {itinerary.items.map((i, idx) => i.day === day && (
                    <li key={idx} className="flex items-center justify-between gap-2">
                      <span>• {i.title} <span className="text-teal-950/50">— {i.notes}</span></span>
                      {itinerary.status !== "confirmed" && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-xs text-red-500 hover:underline shrink-0"
                        >
                          remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {itinerary.status !== "confirmed" ? (
              <div className="flex gap-2 mt-4 pt-4 border-t border-teal-900/10">
                <button
                  onClick={acceptItinerary}
                  disabled={savingBusy || itinerary.items.length === 0}
                  className="flex-1 bg-teal-900 text-sand-50 rounded-full py-2.5 text-sm font-medium hover:bg-teal-800 transition disabled:opacity-60"
                >
                  {savingBusy ? "Saving…" : "Looks good — save my trip"}
                </button>
                <button
                  onClick={discardItinerary}
                  className="text-sm text-teal-900/60 px-4 hover:text-teal-900"
                >
                  Discard
                </button>
              </div>
            ) : (
              <p className="text-xs text-teal-950/50 mt-3 pt-3 border-t border-teal-900/10">
                Saved to My Trips. Generate a new plan any time to add another.
              </p>
            )}
          </div>
        )}

        {savedTrips.length > 0 && (
          <div>
            <h3 className="font-display text-lg mb-2">Your saved trips</h3>
            <ul className="space-y-2">
              {savedTrips.map((t) => (
                <li key={t._id} className="text-sm border border-teal-900/10 rounded-xl px-4 py-2.5 flex justify-between bg-white">
                  <span>{t.title}</span>
                  <span className="text-teal-950/50">
                    {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col border border-teal-900/10 rounded-2xl bg-white overflow-hidden h-[560px]">
        <div className="bg-teal-900 text-sand-50 px-5 py-3 font-display text-lg">Ask the assistant</div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {chatLog.map((m, idx) => (
            <div key={idx} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.from === "user" ? "ml-auto bg-teal-900 text-sand-50" : "bg-teal-50 text-teal-950"
            }`}>
              {m.text}
            </div>
          ))}
          {chatBusy && <div className="text-xs text-teal-950/40">Thinking…</div>}
        </div>
        <form onSubmit={sendChat} className="p-3 border-t border-teal-900/10 flex gap-2">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about visas, weather, transport…"
            className="flex-1 rounded-full border border-teal-900/15 px-4 py-2 text-sm" />
          <button className="bg-teal-900 text-sand-50 rounded-full px-5 text-sm font-medium">Send</button>
        </form>
      </div>
    </div>
  );
}
