import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { api, imageUrl } from "../../api/client.js";
import { Spinner } from "../../components/ui.jsx";
import TaxiFleet from "./TaxiFleet.jsx";

const TABS = ["Overview", "Verification", "Places", "Support Tickets", "Disputes", "Reviews", "Taxi Fleet"];

export default function AdminCenter() {
  const [tab, setTab] = useState("Overview");

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2 flex items-center gap-2"><LayoutDashboard className="w-7 h-7 text-teal-700" /> Admin Center</h1>
      <p className="text-teal-950/60 mb-8">Verification, moderation, support tickets, analytics, and disputes across the platform.</p>

      <div className="flex gap-1 bg-teal-50 rounded-full p-1 mb-8 w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === t ? "bg-teal-900 text-sand-50" : "text-teal-900/70 hover:bg-teal-100/60"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <Overview />}
      {tab === "Verification" && <Verification />}
      {tab === "Places" && <PlaceSubmissions />}
      {tab === "Support Tickets" && <SupportTickets />}
      {tab === "Disputes" && <Disputes />}
      {tab === "Reviews" && <ReviewModeration />}
      {tab === "Taxi Fleet" && <TaxiFleet />}
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.adminOverview().then(setData); }, []);
  if (!data) return <Spinner />;

  const cards = [
    { label: "Tourists", value: data.touristCount },
    { label: "Vendors", value: data.vendorCount },
    { label: "Verified vendors", value: data.verifiedVendorCount },
    { label: "Active listings", value: data.listingCount },
    { label: "Pending places", value: data.pendingPlaceSubmissions },
    { label: "Open tickets", value: data.openSupportTickets ?? 0 },
    { label: "Open disputes", value: data.openDisputes },
    { label: "Drivers", value: data.driverCount },
    { label: "Drivers online", value: data.onlineDriverCount },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="border border-teal-900/10 rounded-2xl p-5 bg-white shadow-card">
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

  if (!queue) return <Spinner />;
  if (queue.documents.length === 0) return <p className="text-teal-950/50">No pending verification documents.</p>;

  return (
    <div className="space-y-4">
      {queue.documents.map((doc) => {
        const vendor = queue.vendors.find((v) => v._id === doc.vendor);
        return (
          <div key={doc._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white shadow-card flex items-center justify-between">
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

function PlaceSubmissions() {
  const [submissions, setSubmissions] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  async function refresh() {
    setSubmissions(null);
    setSubmissions((await api.adminPlaceSubmissions(statusFilter)).submissions);
  }
  useEffect(() => { refresh(); }, [statusFilter]); // eslint-disable-line

  async function decide(id, status) {
    const reviewNotes = status === "rejected" ? (prompt("Reason for rejecting (optional):") || "") : undefined;
    await api.adminReviewPlace(id, { status, reviewNotes });
    refresh();
  }

  return (
    <div>
      <div className="flex gap-1 bg-white border border-teal-900/10 rounded-full p-1 mb-6 w-fit">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition ${
              statusFilter === s ? "bg-teal-900 text-sand-50" : "text-teal-900/70"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {!submissions && <Spinner />}
      {submissions && submissions.length === 0 && (
        <p className="text-teal-950/50">No {statusFilter !== "all" ? statusFilter : ""} place suggestions.</p>
      )}

      <div className="space-y-4">
        {submissions?.map((s) => (
          <div key={s._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{s.title} <span className="text-xs font-normal text-teal-950/50 capitalize">· {s.category}</span></p>
                <p className="text-sm text-teal-950/60">{s.location?.city}{s.location?.address ? `, ${s.location.address}` : ""}</p>
                <p className="text-xs text-teal-950/40 mt-1">Suggested by {s.submittedBy?.name} ({s.submittedBy?.email})</p>
                {s.description && <p className="text-sm text-teal-950/70 mt-2 max-w-xl">{s.description}</p>}
                {s.searchQueryContext && (
                  <p className="text-xs text-teal-950/40 mt-1">Original search: "{s.searchQueryContext}"</p>
                )}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${
                s.status === "approved" ? "bg-teal-800 text-sand-50" :
                s.status === "rejected" ? "bg-ruby-100 text-ruby-700" : "bg-saffron-100 text-saffron-600"
              }`}>
                {s.status}
              </span>
            </div>

            {s.images?.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {s.images.map((img) => (
                  <img key={img._id} src={imageUrl(img._id)} alt="" className="h-20 w-20 object-cover rounded-lg" />
                ))}
              </div>
            )}

            {s.status === "pending" && (
              <div className="flex gap-2 mt-4">
                <button onClick={() => decide(s._id, "approved")} className="text-xs font-medium bg-teal-900 text-sand-50 rounded-full px-4 py-2">
                  Approve & publish
                </button>
                <button onClick={() => decide(s._id, "rejected")} className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2">
                  Reject
                </button>
              </div>
            )}
            {s.reviewNotes && <p className="text-xs text-teal-950/50 mt-3">Note: {s.reviewNotes}</p>}
          </div>
        ))}
      </div>
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

  if (!disputes) return <Spinner />;
  if (disputes.length === 0) return <p className="text-teal-950/50">No disputes.</p>;

  return (
    <div className="space-y-4">
      {disputes.map((d) => (
        <div key={d._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white shadow-card">
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

  if (!reviews) return <Spinner />;
  if (reviews.length === 0) return <p className="text-teal-950/50">Moderation queue is empty.</p>;

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white shadow-card flex items-center justify-between">
          <div>
            <p className="font-medium">{r.author?.name} on {r.listing?.title}</p>
            <p className="text-sm text-teal-950/70">{"★".repeat(r.rating)} — {r.comment}</p>
            {r.moderationStatus === "flagged" && <p className="text-xs text-ruby-600 mt-1">Auto-flagged for review</p>}
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

function SupportTickets() {
  const [tickets, setTickets] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  async function refresh() {
    setTickets(null);
    const params = statusFilter !== "all" ? { status: statusFilter } : {};
    const res = await api.adminTickets(params);
    setTickets(res.tickets || []);
  }

  useEffect(() => { refresh(); }, [statusFilter]); // eslint-disable-line

  async function updateStatus(id, status) {
    setBusyId(id);
    try {
      await api.adminUpdateTicket(id, { status });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex gap-1 bg-white border border-teal-900/10 rounded-full p-1 mb-6 w-fit flex-wrap">
        {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition ${
              statusFilter === s ? "bg-teal-900 text-sand-50" : "text-teal-900/70"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {!tickets && <Spinner label="Loading support tickets…" />}
      {tickets && tickets.length === 0 && (
        <p className="text-teal-950/50">No support tickets found.</p>
      )}

      <div className="space-y-4">
        {tickets?.map((t) => {
          const isEmergency = t.priority === "emergency" || t.category === "safety";
          return (
            <div
              key={t._id}
              className={`border rounded-2xl p-5 bg-white space-y-3 ${
                isEmergency ? "border-ruby-500/25 bg-ruby-100/40" : "border-teal-900/10"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-teal-950 text-base">{t.subject}</span>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                        t.category === "safety" || t.priority === "emergency"
                          ? "bg-ruby-600 text-white"
                          : t.priority === "high"
                          ? "bg-saffron-500 text-teal-950"
                          : "bg-teal-100 text-teal-800"
                      }`}
                    >
                      {t.priority} {t.category ? `· ${t.category}` : ""}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full ${
                        t.status === "open"
                          ? "bg-saffron-100 text-saffron-700"
                          : t.status === "in_progress"
                          ? "bg-teal-100 text-teal-800"
                          : t.status === "resolved"
                          ? "bg-teal-100 text-teal-800"
                          : "bg-teal-950/5 text-teal-950/50"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-teal-950/60 mt-1">
                    Submitted by <strong>{t.user?.name || "User"}</strong> ({t.user?.email || "N/A"}) ·{" "}
                    {new Date(t.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-1.5 shrink-0 flex-wrap">
                  {t.status !== "in_progress" && t.status !== "resolved" && (
                    <button
                      disabled={busyId === t._id}
                      onClick={() => updateStatus(t._id, "in_progress")}
                      className="text-xs font-medium border border-teal-700/30 text-teal-800 bg-teal-50 rounded-full px-3 py-1.5 hover:bg-teal-100 transition disabled:opacity-50"
                    >
                      Mark in progress
                    </button>
                  )}
                  {t.status !== "resolved" && (
                    <button
                      disabled={busyId === t._id}
                      onClick={() => updateStatus(t._id, "resolved")}
                      className="text-xs font-semibold bg-teal-700 text-white rounded-full px-3.5 py-1.5 hover:bg-teal-800 transition disabled:opacity-50"
                    >
                      Resolve ticket
                    </button>
                  )}
                  {t.status !== "closed" && (
                    <button
                      disabled={busyId === t._id}
                      onClick={() => updateStatus(t._id, "closed")}
                      className="text-xs font-medium border border-teal-900/15 text-teal-900/70 bg-white rounded-full px-3 py-1.5 hover:bg-teal-50 transition disabled:opacity-50"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-teal-950/80 leading-relaxed bg-sand-50/50 p-3 rounded-xl border border-teal-900/5">
                {t.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

