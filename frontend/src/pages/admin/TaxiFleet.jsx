import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { api } from "../../api/client.js";
import { getSocket } from "../../api/socket.js";
import { Spinner, Badge } from "../../components/ui.jsx";

const TABS = ["Live map", "Drivers", "Verification", "Rides", "Fare Config"];

// Avoid bundler asset-path issues with Leaflet's default marker images by
// pointing at the same version's files on a CDN instead.
const driverIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const SRI_LANKA_CENTER = [7.8731, 80.7718];

export default function TaxiFleet() {
  const [tab, setTab] = useState("Live map");

  return (
    <div>
      <div className="flex gap-1 bg-teal-50 rounded-full p-1 mb-8 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              tab === t ? "bg-teal-900 text-sand-50" : "text-teal-900/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Live map" && <LiveMap />}
      {tab === "Drivers" && <DriverList />}
      {tab === "Verification" && <DriverVerification />}
      {tab === "Rides" && <RidesMonitor />}
      {tab === "Fare Config" && <FareConfigPanel />}
    </div>
  );
}

function LiveMap() {
  const [drivers, setDrivers] = useState([]);
  const positions = useRef(new Map()); // driverId -> {lat,lng}

  async function refresh() {
    const res = await api.adminTaxiDrivers();
    const online = res.drivers.filter((d) => d.isOnline && !d.isSuspended);
    online.forEach((d) => {
      const [lng, lat] = d.currentLocation?.coordinates || [0, 0];
      if (lat && lng) positions.current.set(d._id, { lat, lng });
    });
    setDrivers(online);
  }

  useEffect(() => {
    refresh();
    const socket = getSocket();

    function onLocation({ driverId, lat, lng }) {
      positions.current.set(driverId, { lat, lng });
      // Trigger a re-render by touching state minimally.
      setDrivers((prev) => [...prev]);
    }
    socket.on("driver:location", onLocation);

    const interval = setInterval(refresh, 20000); // periodic full refresh as a fallback
    return () => {
      socket.off("driver:location", onLocation);
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <p className="text-sm text-teal-950/60 mb-4">
        {drivers.length} driver{drivers.length === 1 ? "" : "s"} currently online. Markers update live as location
        pings arrive over the socket connection.
      </p>
      <div className="rounded-2xl overflow-hidden border border-teal-900/10" style={{ height: 520 }}>
        <MapContainer center={SRI_LANKA_CENTER} zoom={8} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {drivers.map((d) => {
            const pos = positions.current.get(d._id);
            if (!pos) return null;
            return (
              <Marker key={d._id} position={[pos.lat, pos.lng]} icon={driverIcon}>
                <Popup>
                  <strong>{d.owner?.name}</strong>
                  <br />
                  {d.vehicleType.replace("_", " ")} · {d.vehiclePlate}
                  <br />
                  {d.owner?.phone}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

function DriverList() {
  const [drivers, setDrivers] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function refresh() {
    setDrivers((await api.adminTaxiDrivers()).drivers);
  }
  useEffect(() => { refresh(); }, []);

  async function toggleSuspend(driver) {
    setBusyId(driver._id);
    try {
      await api.adminSuspendDriver(driver._id, !driver.isSuspended);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!drivers) return <Spinner />;
  if (drivers.length === 0) return <p className="text-teal-950/50">No drivers have registered yet.</p>;

  return (
    <div className="space-y-3">
      {drivers.map((d) => (
        <div key={d._id} className="border border-teal-900/10 rounded-xl p-4 flex items-center justify-between bg-white shadow-card gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{d.owner?.name}</p>
              <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                d.verificationStatus === "verified" ? "bg-teal-50 text-teal-700" : "bg-saffron-100 text-saffron-600"
              }`}>
                {d.verificationStatus}
              </span>
              {d.isOnline && !d.isSuspended && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-800 text-sand-50">online</span>
              )}
              {d.isSuspended && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-ruby-100 text-ruby-700">suspended</span>
              )}
            </div>
            <p className="text-sm text-teal-950/60 capitalize">
              {d.vehicleType.replace("_", " ")} · {d.vehiclePlate} · {d.totalTrips} trips · {d.owner?.phone}
            </p>
          </div>
          <button
            onClick={() => toggleSuspend(d)}
            disabled={busyId === d._id}
            className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2 hover:bg-teal-50 transition disabled:opacity-50 shrink-0"
          >
            {busyId === d._id ? "…" : d.isSuspended ? "Unsuspend" : "Suspend"}
          </button>
        </div>
      ))}
    </div>
  );
}

function DriverVerification() {
  const [queue, setQueue] = useState(null);

  async function refresh() {
    setQueue(await api.adminDriverVerificationQueue());
  }
  useEffect(() => { refresh(); }, []);

  async function decide(docId, driverId, status) {
    await api.adminReviewDoc(docId, { status: status === "verified" ? "approved" : "rejected" });
    refresh();
  }

  if (!queue) return <Spinner />;
  if (queue.documents.length === 0) return <p className="text-teal-950/50">No pending driver verification documents.</p>;

  return (
    <div className="space-y-4">
      {queue.documents.map((doc) => {
        const driver = queue.drivers.find((d) => d._id === doc.driver);
        return (
          <div key={doc._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white shadow-card flex items-center justify-between">
            <div>
              <p className="font-medium">{driver?.owner?.name || "Driver"}</p>
              <p className="text-sm text-teal-950/60 capitalize">
                {doc.type.replace(/_/g, " ")} ·{" "}
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="underline">view document</a>
              </p>
              <p className="text-xs text-teal-950/40">
                {driver?.vehicleType?.replace("_", " ")} · {driver?.vehiclePlate} · {driver?.owner?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => decide(doc._id, doc.driver, "verified")} className="text-xs font-medium bg-teal-900 text-sand-50 rounded-full px-4 py-2">
                Approve
              </button>
              <button onClick={() => decide(doc._id, doc.driver, "rejected")} className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2">
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RIDE_STATUS_COLORS = {
  searching: "bg-saffron-100 text-saffron-600",
  no_drivers_available: "bg-ruby-100 text-ruby-700",
  accepted: "bg-teal-50 text-teal-700",
  arriving: "bg-teal-50 text-teal-700",
  in_progress: "bg-teal-800 text-sand-50",
  completed: "bg-teal-50 text-teal-900",
  cancelled: "bg-ruby-100 text-ruby-700",
};

function RidesMonitor() {
  const [rides, setRides] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  async function refresh() {
    const res = await api.adminTaxiRides(statusFilter ? { status: statusFilter } : {});
    setRides(res.rides);
  }
  useEffect(() => { refresh(); }, [statusFilter]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-teal-950/60">Filter:</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm capitalize">
          <option value="">All statuses</option>
          {Object.keys(RIDE_STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {!rides && <Spinner />}
      {rides && rides.length === 0 && <p className="text-teal-950/50">No rides match this filter.</p>}

      <div className="space-y-3">
        {rides?.map((r) => (
          <div key={r._id} className="border border-teal-900/10 rounded-xl p-4 flex items-center justify-between bg-white shadow-card gap-4">
            <div className="min-w-0">
              <p className="font-medium truncate">
                {r.pickup?.label || `${r.pickup?.lat?.toFixed(3)}, ${r.pickup?.lng?.toFixed(3)}`} →{" "}
                {r.destination?.label || `${r.destination?.lat?.toFixed(3)}, ${r.destination?.lng?.toFixed(3)}`}
              </p>
              <p className="text-sm text-teal-950/60">
                {r.tourist?.name} {r.driver?.owner?.name ? `· driver ${r.driver.owner.name}` : ""} · <span className="ledger">{r.currency} {r.fareFinal ?? r.fareEstimate}</span> · <span className="capitalize">{r.paymentMode}</span> (
                <span className="capitalize">{r.paymentStatus}</span>)
              </p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${RIDE_STATUS_COLORS[r.status] || ""}`}>
              {r.status.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Fare Configuration Panel
// ---------------------------------------------------------------------------

const VEHICLE_META = {
  tuk_tuk: { label: "Tuk-Tuk 🛺", color: "amber" },
  car:     { label: "Car 🚗",     color: "teal"  },
  van:     { label: "Van 🚐",     color: "violet"},
  bike:    { label: "Bike 🏍️",    color: "rose"  },
};

function FareConfigPanel() {
  const [configs, setConfigs] = useState(null);
  const [selected, setSelected] = useState("tuk_tuk");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }
  // Live fare preview state
  const [previewKm, setPreviewKm] = useState(5);
  const [previewWaitMin, setPreviewWaitMin] = useState(0);

  async function load() {
    const res = await api.adminGetFareConfig();
    setConfigs(res.configs);
    const initial = res.configs.find((c) => c.vehicleType === selected) || res.configs[0];
    setForm(toForm(initial));
  }

  function toForm(cfg) {
    return {
      firstKmPrice:       String(cfg.firstKmPrice ?? ""),
      perKmPrice:         String(cfg.perKmPrice ?? ""),
      waitingChargePerMin: String(cfg.waitingChargePerMin ?? ""),
      minimumFare:        String(cfg.minimumFare ?? "0"),
      currency:           cfg.currency || "USD",
    };
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!configs) return;
    const cfg = configs.find((c) => c.vehicleType === selected);
    if (cfg) setForm(toForm(cfg));
  }, [selected]);

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setMsg(null);
  }

  // Live fare preview calculation
  function previewFare() {
    const firstKm = parseFloat(form.firstKmPrice) || 0;
    const perKm   = parseFloat(form.perKmPrice)   || 0;
    const waiting = parseFloat(form.waitingChargePerMin) || 0;
    const minFare = parseFloat(form.minimumFare)  || 0;
    const km = Math.max(0, previewKm);
    const first   = firstKm;
    const addl    = Math.max(0, km - 1) * perKm;
    const wait    = previewWaitMin * waiting;
    const total   = Math.max(minFare, first + addl + wait);
    return { first: first.toFixed(2), addl: addl.toFixed(2), wait: wait.toFixed(2), total: total.toFixed(2) };
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.adminSaveFareConfig(selected, {
        firstKmPrice:        parseFloat(form.firstKmPrice),
        perKmPrice:          parseFloat(form.perKmPrice),
        waitingChargePerMin: parseFloat(form.waitingChargePerMin),
        minimumFare:         parseFloat(form.minimumFare || 0),
        currency:            form.currency,
      });
      await load();
      setMsg({ type: "success", text: `${VEHICLE_META[selected]?.label} fare config saved successfully.` });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    const cfg = configs?.find((c) => c.vehicleType === selected);
    if (cfg) setForm(toForm(cfg));
    setMsg(null);
  }

  if (!configs) return <Spinner label="Loading fare configuration…" />;

  const preview = previewFare();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-teal-950">Fare Pricing Configuration</h2>
        <p className="text-sm text-teal-950/55 mt-1">
          Set the base first-kilometre charge, per-kilometre rate, and waiting charge for each vehicle type.
          Changes take effect immediately for all new ride estimates and final fare calculations.
        </p>
      </div>

      {/* Vehicle tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(VEHICLE_META).map(([type, meta]) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
              selected === type
                ? "bg-teal-900 text-white border-teal-900"
                : "bg-white text-teal-900 border-teal-900/20 hover:bg-teal-50"
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---- Form ---- */}
        <form onSubmit={save} className="lg:col-span-3 bg-white border border-teal-900/10 rounded-2xl p-6 space-y-5 shadow-card">
          <h3 className="font-semibold text-teal-950">{VEHICLE_META[selected]?.label} — Pricing Rules</h3>

          {/* Pricing model explanation */}
          <div className="bg-teal-50 rounded-xl p-4 text-sm text-teal-900 space-y-1">
            <p className="font-medium">Fare Calculation Model</p>
            <p className="text-teal-950/70">
              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-xs">
                fare = firstKmPrice + max(0, km−1) × perKmPrice + waitMinutes × waitingCharge
              </span>
            </p>
            <p className="text-teal-950/60 text-xs">Result is clamped to the minimum fare floor if set.</p>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold text-teal-950/60 uppercase tracking-wide mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => field("currency", e.target.value)}
              className="w-full border border-teal-900/15 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="LKR">LKR — Sri Lanka Rupee</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>

          {/* First KM Price */}
          <div>
            <label className="block text-xs font-semibold text-teal-950/60 uppercase tracking-wide mb-1">
              First Kilometre Flat Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-950/40 text-sm font-medium">{form.currency}</span>
              <input
                type="number" min="0" step="0.01" required
                value={form.firstKmPrice}
                onChange={(e) => field("firstKmPrice", e.target.value)}
                className="w-full border border-teal-900/15 rounded-xl pl-12 pr-4 py-2.5 text-sm"
                placeholder="e.g. 1.50"
              />
            </div>
            <p className="text-xs text-teal-950/45 mt-1">Covers the first 1 km. No additional per-km charge for this distance.</p>
          </div>

          {/* Per KM Price */}
          <div>
            <label className="block text-xs font-semibold text-teal-950/60 uppercase tracking-wide mb-1">
              Per Kilometre Price <span className="text-teal-950/40 normal-case font-normal">(after first km)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-950/40 text-sm font-medium">{form.currency}</span>
              <input
                type="number" min="0" step="0.01" required
                value={form.perKmPrice}
                onChange={(e) => field("perKmPrice", e.target.value)}
                className="w-full border border-teal-900/15 rounded-xl pl-12 pr-4 py-2.5 text-sm"
                placeholder="e.g. 0.55"
              />
            </div>
            <p className="text-xs text-teal-950/45 mt-1">Applied to every kilometre beyond the first.</p>
          </div>

          {/* Waiting Charge */}
          <div>
            <label className="block text-xs font-semibold text-teal-950/60 uppercase tracking-wide mb-1">
              Waiting Charge <span className="text-teal-950/40 normal-case font-normal">(per minute)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-950/40 text-sm font-medium">{form.currency}</span>
              <input
                type="number" min="0" step="0.001" required
                value={form.waitingChargePerMin}
                onChange={(e) => field("waitingChargePerMin", e.target.value)}
                className="w-full border border-teal-900/15 rounded-xl pl-12 pr-4 py-2.5 text-sm"
                placeholder="e.g. 0.07"
              />
            </div>
            <p className="text-xs text-teal-950/45 mt-1">Charged per minute while the driver waits at pickup or during traffic stops.</p>
          </div>

          {/* Minimum Fare */}
          <div>
            <label className="block text-xs font-semibold text-teal-950/60 uppercase tracking-wide mb-1">
              Minimum Fare Floor
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-950/40 text-sm font-medium">{form.currency}</span>
              <input
                type="number" min="0" step="0.01"
                value={form.minimumFare}
                onChange={(e) => field("minimumFare", e.target.value)}
                className="w-full border border-teal-900/15 rounded-xl pl-12 pr-4 py-2.5 text-sm"
                placeholder="e.g. 1.00"
              />
            </div>
            <p className="text-xs text-teal-950/45 mt-1">The calculated fare will never go below this value. Set 0 to disable.</p>
          </div>

          {/* Feedback message */}
          {msg && (
            <div className={`text-sm rounded-xl px-4 py-3 ${
              msg.type === "success" ? "bg-teal-50 text-teal-800" : "bg-ruby-100 text-ruby-700"
            }`}>
              {msg.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-teal-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-teal-800 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Configuration"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-5 border border-teal-900/20 rounded-xl text-sm text-teal-900 hover:bg-teal-50 transition"
            >
              Reset
            </button>
          </div>
        </form>

        {/* ---- Live Preview ---- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-teal-900/10 rounded-2xl p-6 shadow-card">
            <h3 className="font-semibold text-teal-950 mb-4">Live Fare Preview</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-teal-950/60 uppercase tracking-wide mb-1">Trip Distance (km)</label>
                <input
                  type="range" min="0.5" max="50" step="0.5"
                  value={previewKm}
                  onChange={(e) => setPreviewKm(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
                <p className="text-sm text-teal-950 font-medium mt-1">{previewKm} km</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-teal-950/60 uppercase tracking-wide mb-1">Waiting Time (minutes)</label>
                <input
                  type="range" min="0" max="60" step="1"
                  value={previewWaitMin}
                  onChange={(e) => setPreviewWaitMin(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
                <p className="text-sm text-teal-950 font-medium mt-1">{previewWaitMin} min</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-5 rounded-xl bg-teal-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-teal-950/70">
                <span>First km flat charge</span>
                <span className="font-medium">{form.currency} {preview.first}</span>
              </div>
              <div className="flex justify-between text-teal-950/70">
                <span>Additional {Math.max(0, previewKm - 1).toFixed(1)} km</span>
                <span className="font-medium">{form.currency} {preview.addl}</span>
              </div>
              <div className="flex justify-between text-teal-950/70">
                <span>Waiting ({previewWaitMin} min)</span>
                <span className="font-medium">{form.currency} {preview.wait}</span>
              </div>
              <div className="border-t border-teal-900/10 pt-2 flex justify-between font-bold text-teal-950 text-base">
                <span>Total Fare</span>
                <span className="text-teal-700">{form.currency} {preview.total}</span>
              </div>
            </div>
          </div>

          {/* Summary table of all vehicles */}
          <div className="bg-white border border-teal-900/10 rounded-2xl p-5 shadow-card">
            <h4 className="text-sm font-semibold text-teal-950 mb-3">All Vehicle Rates</h4>
            <table className="w-full text-xs text-teal-950/70">
              <thead>
                <tr className="text-teal-950/45 uppercase tracking-wide">
                  <th className="text-left pb-2">Type</th>
                  <th className="text-right pb-2">1st km</th>
                  <th className="text-right pb-2">/km</th>
                  <th className="text-right pb-2">/min wait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {configs.map((c) => (
                  <tr key={c.vehicleType} className={`py-1.5 ${c.vehicleType === selected ? "font-semibold text-teal-900" : ""}`}>
                    <td className="py-1.5">{VEHICLE_META[c.vehicleType]?.label || c.vehicleType}</td>
                    <td className="text-right py-1.5">{c.currency} {Number(c.firstKmPrice).toFixed(2)}</td>
                    <td className="text-right py-1.5">{c.currency} {Number(c.perKmPrice).toFixed(2)}</td>
                    <td className="text-right py-1.5">{c.currency} {Number(c.waitingChargePerMin).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
