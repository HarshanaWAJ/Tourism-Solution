import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import TaxiFleet from "./TaxiFleet.jsx";

const TABS = ["Overview", "Verification", "Disputes", "Reviews", "Taxi Fleet"];

export default function AdminCenter() {
  const [tab, setTab] = useState("Overview");

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2">Admin Center</h1>
      <p className="text-teal-950/60 mb-8">Verification, moderation, analytics, and disputes across the platform.</p>

      <div className="flex gap-1 bg-teal-50 rounded-full p-1 mb-8 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === t ? "bg-teal-900 text-sand-50" : "text-teal-900/70"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <Overview />}
      {tab === "Verification" && <Verification />}
      {tab === "Disputes" && <Disputes />}
      {tab === "Reviews" && <ReviewModeration />}
      {tab === "Taxi Fleet" && <TaxiFleet />}
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.adminOverview().then(setData); }, []);
  if (!data) return <p className="text-teal-950/50">Loading…</p>;

  const cards = [
    { label: "Tourists", value: data.touristCount },
    { label: "Vendors", value: data.vendorCount },
    { label: "Verified vendors", value: data.verifiedVendorCount },
    { label: "Active listings", value: data.listingCount },
    { label: "Open disputes", value: data.openDisputes },
    { label: "Drivers", value: data.driverCount },
    { label: "Drivers online", value: data.onlineDriverCount },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="border border-teal-900/10 rounded-2xl p-5 bg-white">
            <p className="text-3xl font-display text-teal-900">{c.value}</p>
            <p className="text-sm text-teal-950/60">{c.label}</p>
          </div>
        ))}
      </div>
      <h2 className="font-display text-xl mb-3">Bookings by status</h2>
      <div className="space-y-2">
        {data.bookingsByStatus.map((s) => (
          <div key={s._id} className="flex justify-between border-b border-teal-900/10 py-2 text-sm">
            <span className="capitalize">{s._id.replace("_", " ")}</span>
            <span>{s.count} bookings · ${s.revenue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Verification() {
  const [queue, setQueue] = useState(null);

  async function refresh() {
    const res = await api.adminVerificationQueue();
    setQueue(res);
  }
  useEffect(() => { refresh(); }, []);

  async function decide(docId, status) {
    await api.adminReviewDoc(docId, { status });
    refresh();
  }

  if (!queue) return <p className="text-teal-950/50">Loading…</p>;
  if (queue.documents.length === 0) return <p className="text-teal-950/50">No pending verification documents.</p>;

  return (
    <div className="space-y-4">
      {queue.documents.map((doc) => {
        const vendor = queue.vendors.find((v) => v._id === doc.vendor);
        return (
          <div key={doc._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white flex items-center justify-between">
            <div>
              <p className="font-medium">{vendor?.businessName || "Vendor"}</p>
              <p className="text-sm text-teal-950/60 capitalize">{doc.type.replace(/_/g, " ")} · <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="underline">view document</a></p>
              <p className="text-xs text-teal-950/40">{vendor?.owner?.email}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => decide(doc._id, "approved")} className="text-xs font-medium bg-teal-900 text-sand-50 rounded-full px-4 py-2">Approve</button>
              <button onClick={() => decide(doc._id, "rejected")} className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2">Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Disputes() {
  const [disputes, setDisputes] = useState(null);
  async function refresh() { setDisputes((await api.adminDisputes()).disputes); }
  useEffect(() => { refresh(); }, []);

  async function resolve(id, status) {
    const resolution = status === "resolved" ? prompt("Resolution notes:") || "" : undefined;
    await api.adminResolveDispute(id, { status, resolution });
    refresh();
  }

  if (!disputes) return <p className="text-teal-950/50">Loading…</p>;
  if (disputes.length === 0) return <p className="text-teal-950/50">No disputes.</p>;

  return (
    <div className="space-y-4">
      {disputes.map((d) => (
        <div key={d._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium">{d.reason}</p>
              <p className="text-sm text-teal-950/60">{d.raisedBy?.name} vs {d.against?.businessName}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-saffron-100 text-saffron-600 capitalize">{d.status}</span>
          </div>
          <p className="text-sm text-teal-950/70 mb-3">{d.description}</p>
          {["open", "investigating"].includes(d.status) && (
            <div className="flex gap-2">
              <button onClick={() => resolve(d._id, "investigating")} className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2">Investigate</button>
              <button onClick={() => resolve(d._id, "resolved")} className="text-xs font-medium bg-teal-900 text-sand-50 rounded-full px-4 py-2">Resolve</button>
              <button onClick={() => resolve(d._id, "rejected")} className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2">Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewModeration() {
  const [reviews, setReviews] = useState(null);
  async function refresh() { setReviews((await api.adminModerationQueue()).reviews); }
  useEffect(() => { refresh(); }, []);

  async function decide(id, status) {
    await api.adminModerateReview(id, { status });
    refresh();
  }

  if (!reviews) return <p className="text-teal-950/50">Loading…</p>;
  if (reviews.length === 0) return <p className="text-teal-950/50">Moderation queue is empty.</p>;

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white flex items-center justify-between">
          <div>
            <p className="font-medium">{r.author?.name} on {r.listing?.title}</p>
            <p className="text-sm text-teal-950/70">{"★".repeat(r.rating)} — {r.comment}</p>
            {r.moderationStatus === "flagged" && <p className="text-xs text-red-600 mt-1">Auto-flagged for review</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => decide(r._id, "approved")} className="text-xs font-medium bg-teal-900 text-sand-50 rounded-full px-4 py-2">Approve</button>
            <button onClick={() => decide(r._id, "rejected")} className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
