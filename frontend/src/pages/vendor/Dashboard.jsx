import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import TrustBadge from "../../components/TrustBadge.jsx";
import ListingForm from "./ListingForm.jsx";

export default function VendorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsError, setListingsError] = useState("");
  const [editingListing, setEditingListing] = useState(null); // null = closed, {} = create, listing = edit
  const [docForm, setDocForm] = useState({ type: "business_registration", fileUrl: "", issuedBy: "" });
  const [docStatus, setDocStatus] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  async function refresh() {
    const [d, b, l] = await Promise.all([
      api.vendorDashboard(),
      api.vendorBookings(),
      api.vendorListings().catch((err) => {
        setListingsError(err.message);
        return { results: [] };
      }),
    ]);
    setDashboard(d);
    setBookings(b.bookings);
    setListings(l.results);
  }

  useEffect(() => { refresh(); }, []);

  async function updateBooking(id, status) {
    await api.updateBookingStatus(id, { status });
    refresh();
  }

  async function togglePublished(listing) {
    setTogglingId(listing._id);
    try {
      await api.updateListing(listing._id, { isActive: !listing.isActive });
      await refresh();
    } catch (err) {
      setListingsError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function submitDoc(e) {
    e.preventDefault();
    setDocStatus("sending");
    try {
      await api.submitVerificationDoc(docForm);
      setDocStatus("sent");
      refresh();
    } catch (err) {
      setDocStatus("error:" + err.message);
    }
  }

  if (!dashboard) return <div className="max-w-6xl mx-auto px-6 py-16 text-teal-950/50">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold mb-2">{dashboard.vendor.businessName}</h1>
          <TrustBadge vendor={dashboard.vendor} />
        </div>
        <button onClick={() => setEditingListing({})} className="bg-teal-900 text-sand-50 rounded-full px-5 py-2.5 text-sm font-medium hover:bg-teal-800 transition">
          + New listing
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Listings" value={dashboard.listingCount} />
        <StatCard label="Upcoming bookings" value={dashboard.upcomingBookings} />
        <StatCard label="Confirmed revenue" value={`$${dashboard.revenueConfirmed}`} />
      </div>

      {dashboard.vendor.verificationStatus !== "verified" && (
        <div className="bg-saffron-100 rounded-2xl p-5 mb-10">
          <h2 className="font-display text-xl mb-3">Get verified</h2>
          <p className="text-sm text-teal-950/70 mb-4">
            Submit a document (business registration, SLTDA license, or guide certification) to earn a trust badge tourists can see on your listings.
          </p>
          <form onSubmit={submitDoc} className="grid sm:grid-cols-3 gap-3">
            <select value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm">
              {["business_registration", "sltda_license", "guide_certification", "tax_registration"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input required placeholder="Document URL (upload link)" value={docForm.fileUrl}
              onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm sm:col-span-2" />
            <button className="sm:col-span-3 bg-teal-900 text-sand-50 rounded-xl py-2.5 text-sm font-medium">
              {docStatus === "sending" ? "Submitting…" : "Submit for review"}
            </button>
          </form>
          {docStatus === "sent" && <p className="text-sm text-teal-800 mt-2">Submitted — an admin will review it shortly.</p>}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">Your listings</h2>
        <span className="text-xs text-teal-950/40">{listings.length} total</span>
      </div>
      {listingsError && <p className="text-sm text-red-600 mb-3">{listingsError}</p>}
      <div className="space-y-3 mb-10">
        {listings.length === 0 && !listingsError && (
          <p className="text-sm text-teal-950/50">You haven't created any listings yet — use "New listing" above to add your first one.</p>
        )}
        {listings.map((l) => (
          <div key={l._id} className="border border-teal-900/10 rounded-xl p-4 flex items-center justify-between bg-white gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{l.title}</p>
                <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  l.isActive ? "bg-teal-50 text-teal-700 font-semibold" : "bg-teal-950/5 text-teal-950/40"
                }`}>
                  {l.isActive ? "Published" : "Unpublished"}
                </span>
                <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  l.bookingRequired || l.category === "hotel"
                    ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}>
                  {l.bookingRequired || l.category === "hotel" ? "🗓️ Booking Required" : "📍 Walk-in Direct"}
                </span>
              </div>
              <p className="text-sm text-teal-950/60 capitalize">
                {l.category} · {l.currency} {l.basePrice} {l.priceUnit.replace("_", " ")}
                {l.location?.city ? ` · ${l.location.city}` : ""}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to={`/listing/${l._id}`} className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2 hover:bg-teal-50 transition">
                View
              </Link>
              <button onClick={() => setEditingListing(l)} className="text-xs font-medium bg-teal-900 text-sand-50 rounded-full px-4 py-2 hover:bg-teal-800 transition">
                Edit
              </button>
              <button
                onClick={() => togglePublished(l)}
                disabled={togglingId === l._id}
                className="text-xs font-medium border border-teal-900/20 rounded-full px-4 py-2 hover:bg-teal-50 transition disabled:opacity-50"
              >
                {togglingId === l._id ? "…" : l.isActive ? "Unpublish" : "Publish"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display text-xl mb-4">Manage Booking Requests</h2>
      <div className="space-y-3 mb-10">
        {bookings.length === 0 && <p className="text-sm text-teal-950/50">No booking requests yet.</p>}
        {bookings.map((b) => (
          <div key={b._id} className="border border-teal-900/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-teal-950">{b.listing?.title}</p>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                  b.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800"
                    : b.status === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : b.status === "pending_confirmation"
                    ? "bg-amber-100 text-amber-800 animate-pulse"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {b.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-sm text-teal-950/70 mt-0.5">
                Customer: <strong>{b.tourist?.name}</strong> ({b.tourist?.email}) · Party of {b.partySize} · Total: <strong>{b.currency} {b.totalPrice}</strong>
              </p>
              {b.cancellationReason && (
                <p className="text-xs text-red-600 mt-1">Reason: {b.cancellationReason}</p>
              )}
            </div>

            {b.status === "pending_confirmation" && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => updateBooking(b._id, "confirmed")}
                  className="text-xs font-semibold bg-emerald-700 text-white rounded-full px-4 py-2 hover:bg-emerald-800 transition shadow-xs"
                >
                  ✓ Approve Booking
                </button>
                <button
                  onClick={() => {
                    const reason = window.prompt("Reason for rejecting this booking (optional):");
                    if (reason !== null) {
                      api.updateBookingStatus(b._id, { status: "cancelled", cancellationReason: reason })
                        .then(refresh);
                    }
                  }}
                  className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-4 py-2 hover:bg-red-100 transition"
                >
                  ✕ Reject Booking
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingListing !== null && (
        <ListingForm
          listing={editingListing._id ? editingListing : null}
          onClose={() => setEditingListing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border border-teal-900/10 rounded-2xl p-5 bg-white">
      <p className="text-3xl font-display text-teal-900">{value}</p>
      <p className="text-sm text-teal-950/60">{label}</p>
    </div>
  );
}
