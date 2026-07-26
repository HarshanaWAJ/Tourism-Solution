import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function Support() {
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ category: "other", subject: "", description: "" });
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.alerts().then((res) => setAlerts(res.alerts)).catch(() => {});
  }, []);

  async function submitTicket(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      await api.createTicket(form);
      setStatus("sent");
      setForm({ category: "other", subject: "", description: "" });
    } catch (err) {
      setStatus("error:" + err.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2">Support &amp; Safety</h1>
      <p className="text-teal-950/60 mb-8">Live alerts, an emergency line, and a place to report anything that felt wrong.</p>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8">
        <p className="font-semibold text-red-700 mb-1">In an emergency</p>
        <p className="text-sm text-red-700/80">Police: 119 · Ambulance: 1990 · Tourist Police: +94 11 242 1052. Select "Safety" below for platform-mediated help alongside calling local services.</p>
      </div>

      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="font-display text-xl">Active alerts</h2>
          {alerts.map((a) => (
            <div key={a._id} className={`rounded-xl p-4 text-sm ${
              a.severity === "critical" ? "bg-red-50 text-red-700" : a.severity === "warning" ? "bg-saffron-100 text-saffron-600" : "bg-teal-50 text-teal-900"
            }`}>
              <p className="font-semibold">{a.title}{a.region ? ` · ${a.region}` : ""}</p>
              <p>{a.body}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submitTicket} className="bg-teal-50 rounded-2xl p-5 space-y-4">
        <h2 className="font-display text-xl">Contact support</h2>
        <div>
          <label className="text-sm font-medium text-teal-900">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm">
            {["safety", "payment", "booking", "vendor_complaint", "technical", "other"].map((c) => (
              <option key={c} value={c}>{c.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-teal-900">Subject</label>
          <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-teal-900">Describe what happened</label>
          <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
        </div>
        {status === "sent" && <p className="text-sm text-teal-800">Ticket submitted — our team will follow up.</p>}
        {status.startsWith("error") && <p className="text-sm text-red-600">{status.slice(6)}</p>}
        <button disabled={status === "sending"} className="bg-teal-900 text-sand-50 rounded-full px-6 py-2.5 text-sm font-medium hover:bg-teal-800 transition">
          {status === "sending" ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
