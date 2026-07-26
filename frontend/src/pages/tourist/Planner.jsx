import { useState } from "react";
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
      setItinerary(res.itinerary);
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
          <div className="border border-teal-900/10 rounded-2xl p-5 bg-white">
            <h3 className="font-display text-xl mb-3">{itinerary.title}</h3>
            {Array.from(new Set(itinerary.items.map((i) => i.day))).map((day) => (
              <div key={day} className="mb-4">
                <p className="text-xs uppercase tracking-widest text-saffron-600 font-semibold mb-1">Day {day}</p>
                <ul className="space-y-1 text-sm text-teal-950/80">
                  {itinerary.items.filter((i) => i.day === day).map((i, idx) => (
                    <li key={idx}>• {i.title} <span className="text-teal-950/50">— {i.notes}</span></li>
                  ))}
                </ul>
              </div>
            ))}
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
