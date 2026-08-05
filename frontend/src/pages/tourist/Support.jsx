import { useEffect, useState } from "react";
import { AlertTriangle, LifeBuoy, MapPinned, Phone, ShieldAlert } from "lucide-react";
import { api } from "../../api/client.js";
import { Badge, Button, Card, ErrorBanner } from "../../components/ui.jsx";

const EMERGENCY_NUMBERS = [
  { label: "Police", value: "119" },
  { label: "Ambulance / fire", value: "1990" },
  { label: "Tourist Police", value: "+94 11 242 1052" },
];

const ALERT_TONE = { critical: "bg-ruby-100 text-ruby-700", warning: "bg-saffron-100 text-saffron-700", info: "bg-teal-50 text-teal-900" };

export default function Support() {
  const [alerts, setAlerts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ category: "other", subject: "", description: "" });
  const [status, setStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [sharedLocation, setSharedLocation] = useState(null);

  useEffect(() => {
    api.alerts().then((res) => setAlerts(res.alerts)).catch(() => {});
    api.myTickets().then((res) => setTickets(res.tickets || [])).catch(() => {});
  }, []);

  function shareLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) };
        setSharedLocation(loc);
        setForm((f) => ({
          ...f,
          category: "safety",
          description: f.description
            ? `${f.description}\n\nLive location: ${loc.lat}, ${loc.lng}`
            : `Live location: ${loc.lat}, ${loc.lng}`,
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  async function submitTicket(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      await api.createTicket(form);
      setStatus("sent");
      setForm({ category: "other", subject: "", description: "" });
      setSharedLocation(null);
      api.myTickets().then((res) => setTickets(res.tickets || []));
    } catch (err) {
      setStatus("error:" + err.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2">Support &amp; safety</h1>
      <p className="text-teal-950/60 mb-8">Live alerts, an emergency line, and a place to report anything that felt wrong.</p>

      <Card className="bg-ruby-100 border-ruby-500/20 p-5 mb-6">
        <p className="font-semibold text-ruby-700 mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> In an emergency</p>
        <div className="flex flex-wrap gap-4 mb-3">
          {EMERGENCY_NUMBERS.map((n) => (
            <a key={n.label} href={`tel:${n.value.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-sm text-ruby-700 font-medium hover:underline">
              <Phone className="w-3.5 h-3.5" /> {n.label}: <span className="ledger">{n.value}</span>
            </a>
          ))}
        </div>
        <p className="text-xs text-ruby-700/70">Call local services first. Use "SOS · share location" below alongside that call for platform-mediated help.</p>
      </Card>

      <Card className="bg-teal-950 text-sand-50 border-none p-5 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg font-semibold flex items-center gap-2"><LifeBuoy className="w-4.5 h-4.5 text-ruby-400" /> SOS · share my location</p>
          <p className="text-xs text-sand-50/60 mt-1 max-w-sm">
            {sharedLocation ? `Location captured: ${sharedLocation.lat}, ${sharedLocation.lng} — attached to the report below.` : "Attach your current coordinates to a safety report before submitting."}
          </p>
        </div>
        <Button variant="danger" onClick={shareLocation} disabled={locating}>
          <MapPinned className="w-4 h-4" /> {locating ? "Locating…" : "Share location"}
        </Button>
      </Card>

      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="font-display text-xl flex items-center gap-2"><AlertTriangle className="w-4.5 h-4.5 text-saffron-600" /> Active alerts</h2>
          {alerts.map((a) => (
            <div key={a._id} className={`rounded-xl p-4 text-sm ${ALERT_TONE[a.severity] || ALERT_TONE.info}`}>
              <p className="font-semibold">{a.title}{a.region ? ` · ${a.region}` : ""}</p>
              <p>{a.body}</p>
            </div>
          ))}
        </div>
      )}

      <Card as="form" onSubmit={submitTicket} className="bg-teal-50 border-teal-900/8 shadow-none p-5 space-y-4 mb-8">
        <h2 className="font-display text-xl">Contact support</h2>
        <div>
          <label className="text-sm font-medium text-teal-900">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white capitalize">
            {["safety", "payment", "booking", "vendor_complaint", "technical", "other"].map((c) => (
              <option key={c} value={c}>{c.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-teal-900">Subject</label>
          <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white" />
        </div>
        <div>
          <label className="text-sm font-medium text-teal-900">Describe what happened</label>
          <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white" />
        </div>
        {status === "sent" && <p className="text-sm text-teal-800 font-medium">Ticket submitted — our team will follow up.</p>}
        {status.startsWith("error") && <ErrorBanner>{status.slice(6)}</ErrorBanner>}
        <Button disabled={status === "sending"} variant="dark">{status === "sending" ? "Sending…" : "Submit"}</Button>
      </Card>

      {tickets.length > 0 && (
        <div>
          <h2 className="font-display text-xl mb-3">Your reports</h2>
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t._id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-950">{t.subject}</p>
                  <p className="text-xs text-teal-950/50 capitalize">{t.category.replace(/_/g, " ")}</p>
                </div>
                <Badge tone={t.status === "resolved" ? "tealSoft" : "saffronSoft"} className="capitalize">{t.status?.replace(/_/g, " ") || "open"}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
