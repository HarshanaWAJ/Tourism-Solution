import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../api/client.js";
import { getSocket } from "../../api/socket.js";

const TABS = ["Live map", "Drivers", "Verification", "Rides"];

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

  if (!drivers) return <p className="text-teal-950/50">Loading…</p>;
  if (drivers.length === 0) return <p className="text-teal-950/50">No drivers have registered yet.</p>;

  return (
    <div className="space-y-3">
      {drivers.map((d) => (
        <div key={d._id} className="border border-teal-900/10 rounded-xl p-4 flex items-center justify-between bg-white gap-4">
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
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600">suspended</span>
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

  if (!queue) return <p className="text-teal-950/50">Loading…</p>;
  if (queue.documents.length === 0) return <p className="text-teal-950/50">No pending driver verification documents.</p>;

  return (
    <div className="space-y-4">
      {queue.documents.map((doc) => {
        const driver = queue.drivers.find((d) => d._id === doc.driver);
        return (
          <div key={doc._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white flex items-center justify-between">
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
  no_drivers_available: "bg-red-100 text-red-600",
  accepted: "bg-teal-50 text-teal-700",
  arriving: "bg-teal-50 text-teal-700",
  in_progress: "bg-teal-800 text-sand-50",
  completed: "bg-teal-50 text-teal-900",
  cancelled: "bg-red-100 text-red-600",
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

      {!rides && <p className="text-teal-950/50">Loading…</p>}
      {rides && rides.length === 0 && <p className="text-teal-950/50">No rides match this filter.</p>}

      <div className="space-y-3">
        {rides?.map((r) => (
          <div key={r._id} className="border border-teal-900/10 rounded-xl p-4 flex items-center justify-between bg-white gap-4">
            <div className="min-w-0">
              <p className="font-medium truncate">
                {r.pickup?.label || `${r.pickup?.lat?.toFixed(3)}, ${r.pickup?.lng?.toFixed(3)}`} →{" "}
                {r.destination?.label || `${r.destination?.lat?.toFixed(3)}, ${r.destination?.lng?.toFixed(3)}`}
              </p>
              <p className="text-sm text-teal-950/60">
                {r.tourist?.name} {r.driver?.owner?.name ? `· driver ${r.driver.owner.name}` : ""} · {r.currency}{" "}
                {r.fareFinal ?? r.fareEstimate} · <span className="capitalize">{r.paymentMode}</span> (
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
