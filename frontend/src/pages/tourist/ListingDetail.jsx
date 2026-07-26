import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, imageUrl } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import TrustBadge from "../../components/TrustBadge.jsx";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getListing(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  async function handleBook() {
    if (!user) return navigate("/login");
    if (user.role !== "tourist") return setError("Only tourist accounts can book.");
    setStatus("booking");
    setError("");
    try {
      const res = await api.createBooking({ listingId: id, availabilitySlotId: selectedSlot, partySize: Number(partySize) });
      setStatus("booked");
      navigate("/my-bookings", { state: { justBooked: res.booking.confirmationCode } });
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  if (error && !data) return <div className="max-w-4xl mx-auto px-6 py-16 text-red-600">{error}</div>;
  if (!data) return <div className="max-w-4xl mx-auto px-6 py-16 text-teal-950/50">Loading…</div>;

  const { listing, availability, reviews } = data;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <span className="text-xs uppercase tracking-widest text-saffron-600 font-semibold">{listing.category}</span>
      <h1 className="font-display text-4xl font-semibold mt-1 mb-3">{listing.title}</h1>
      <p className="text-teal-950/60 mb-4">{listing.location?.city}, {listing.location?.region}</p>
      <TrustBadge vendor={listing.vendor} />

      {listing.images?.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-2xl">
          {listing.images.slice(0, 6).map((img, idx) => (
            <img
              key={idx}
              src={imageUrl(img)}
              alt={`${listing.title} photo ${idx + 1}`}
              className="h-32 w-full object-cover rounded-xl"
            />
          ))}
        </div>
      )}

      <p className="text-teal-950/80 leading-relaxed my-6 max-w-2xl">{listing.description}</p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="font-display text-xl mb-3">Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>
            {reviews.length === 0 && <p className="text-sm text-teal-950/50">No approved reviews yet.</p>}
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r._id} className="border-b border-teal-900/10 pb-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{r.author?.name}</span>
                    <span className="text-saffron-600">{"★".repeat(r.rating)}</span>
                  </div>
                  <p className="text-sm text-teal-950/70 mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="border border-teal-900/10 rounded-2xl p-5 h-fit bg-white">
          <p className="text-2xl font-semibold text-teal-900 mb-1">
            {listing.currency} {listing.basePrice}
            <span className="text-sm font-normal text-teal-950/50"> /{listing.priceUnit?.replace("per_", "")}</span>
          </p>

          <label className="text-sm font-medium text-teal-900 block mt-4 mb-1">Available date</label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm"
          >
            <option value="">Select a date</option>
            {availability.map((slot) => (
              <option key={slot._id} value={slot._id} disabled={slot.status === "sold_out"}>
                {new Date(slot.date).toLocaleDateString()} {slot.startTime ? `· ${slot.startTime}` : ""}
                {slot.status === "sold_out" ? " (sold out)" : ` · ${slot.capacityTotal - slot.capacityBooked} left`}
              </option>
            ))}
          </select>

          <label className="text-sm font-medium text-teal-900 block mt-3 mb-1">Party size</label>
          <input
            type="number" min={1} value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            className="w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm"
          />

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <button
            onClick={handleBook}
            disabled={!selectedSlot || status === "booking"}
            className="w-full mt-5 bg-teal-900 text-sand-50 rounded-full py-3 font-medium hover:bg-teal-800 transition disabled:opacity-50"
          >
            {status === "booking" ? "Booking…" : "Book now"}
          </button>
          <p className="text-xs text-teal-950/50 mt-3 text-center">
            Need something custom (multi-day, private group)? Message the vendor to request a quote.
          </p>
        </aside>
      </div>
    </div>
  );
}
