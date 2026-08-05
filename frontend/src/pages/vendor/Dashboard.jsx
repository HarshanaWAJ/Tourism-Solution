import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, CalendarClock, MapPinned, Check, X, ShieldCheck } from "lucide-react";
import { api } from "../../api/client.js";
import TrustBadge from "../../components/TrustBadge.jsx";
import ListingForm from "./ListingForm.jsx";
import { Badge, Button, Card, Spinner } from "../../components/ui.jsx";

const BOOKING_TONE = { confirmed: "tealSoft", cancelled: "rubySoft", pending_confirmation: "saffronSoft" };

export default function VendorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsError, setListingsError] = useState("");
  const [editingListing, setEditingListing] = useState(null);
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

  if (!dashboard) return <div className="max-w-6xl mx-auto px-6 py-16"><Spinner label="Loading your dashboard…" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold mb-2">{dashboard.vendor.businessName}</h1>
          <TrustBadge vendor={dashboard.vendor} />
        </div>
        <Button variant="dark" onClick={() => setEditingListing({})}><PlusCircle className="w-4 h-4" /> New listing</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Listings" value={dashboard.listingCount} />
        <StatCard label="Upcoming bookings" value={dashboard.upcomingBookings} />
        <StatCard label="Confirmed revenue" value={`$${dashboard.revenueConfirmed}`} />
      </div>

      {dashboard.vendor.verificationStatus !== "verified" && (
        <Card className="bg-saffron-100 border-none shadow-none p-5 mb-10">
          <h2 className="font-display text-xl mb-3 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-saffron-700" /> Get verified</h2>
          <p className="text-sm text-teal-950/70 mb-4">
            Submit a document (business registration, SLTDA license, or guide certification) to earn a trust badge tourists can see on your listings.
          </p>
          <form onSubmit={submitDoc} className="grid sm:grid-cols-3 gap-3">
            <select value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white">
              {["business_registration", "sltda_license", "guide_certification", "tax_registration"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input required placeholder="Document URL (upload link)" value={docForm.fileUrl}
              onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white sm:col-span-2" />
            <Button className="sm:col-span-3" variant="dark">{docStatus === "sending" ? "Submitting…" : "Submit for review"}</Button>
          </form>
          {docStatus === "sent" && <p className="text-sm text-teal-800 mt-2 font-medium">Submitted — an admin will review it shortly.</p>}
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">Your listings</h2>
        <span className="text-xs text-teal-950/40">{listings.length} total</span>
      </div>
      {listingsError && <p className="text-sm text-ruby-600 mb-3">{listingsError}</p>}
      <div className="space-y-3 mb-10">
        {listings.length === 0 && !listingsError && (
          <p className="text-sm text-teal-950/50">You haven't created any listings yet — use "New listing" above to add your first one.</p>
        )}
        {listings.map((l) => (
          <Card key={l._id} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{l.title}</p>
                <Badge tone={l.isActive ? "tealSoft" : "outline"}>{l.isActive ? "Published" : "Unpublished"}</Badge>
                <Badge tone={l.bookingRequired || l.category === "hotel" ? "tealSoft" : "saffronSoft"}>
                  {l.bookingRequired || l.category === "hotel" ? (<><CalendarClock className="w-3 h-3" /> Booking required</>) : (<><MapPinned className="w-3 h-3" /> Walk-in direct</>)}
                </Badge>
              </div>
              <p className="text-sm text-teal-950/60 capitalize ledger">
                {l.category} · {l.currency} {l.basePrice} {l.priceUnit.replace("_", " ")}{l.location?.city ? ` · ${l.location.city}` : ""}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button as={Link} to={`/listing/${l._id}`} variant="outline" size="sm">View</Button>
              <Button variant="dark" size="sm" onClick={() => setEditingListing(l)}>Edit</Button>
              <Button variant="outline" size="sm" onClick={() => togglePublished(l)} disabled={togglingId === l._id}>
                {togglingId === l._id ? "…" : l.isActive ? "Unpublish" : "Publish"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="font-display text-xl mb-4">Manage booking requests</h2>
      <div className="space-y-3 mb-10">
        {bookings.length === 0 && <p className="text-sm text-teal-950/50">No booking requests yet.</p>}
        {bookings.map((b) => (
          <Card key={b._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-teal-950">{b.listing?.title}</p>
                <Badge tone={BOOKING_TONE[b.status] || "outline"} className="capitalize">{b.status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-teal-950/70 mt-0.5">
                Customer: <strong>{b.tourist?.name}</strong> ({b.tourist?.email}) · Party of {b.partySize} · Total: <strong className="ledger">{b.currency} {b.totalPrice}</strong>
              </p>
              {b.cancellationReason && <p className="text-xs text-ruby-600 mt-1">Reason: {b.cancellationReason}</p>}
            </div>

            {b.status === "pending_confirmation" && (
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => updateBooking(b._id, "confirmed")} className="bg-teal-700 hover:bg-teal-800 text-sand-50" size="sm">
                  <Check className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button
                  variant="danger" size="sm"
                  onClick={() => {
                    const reason = window.prompt("Reason for rejecting this booking (optional):");
                    if (reason !== null) api.updateBookingStatus(b._id, { status: "cancelled", cancellationReason: reason }).then(refresh);
                  }}
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {editingListing !== null && (
        <ListingForm listing={editingListing._id ? editingListing : null} onClose={() => setEditingListing(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-display text-teal-900 ledger">{value}</p>
      <p className="text-sm text-teal-950/60">{label}</p>
    </Card>
  );
}
