import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client.js";

const STATUS_COLORS = {
  pending_confirmation: "bg-saffron-100 text-saffron-600",
  confirmed: "bg-teal-800 text-sand-50",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-teal-50 text-teal-900",
  no_show: "bg-red-100 text-red-600",
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const justBooked = location.state?.justBooked;

  useEffect(() => {
    api.myBookings().then((res) => setBookings(res.bookings)).finally(() => setLoading(false));
  }, []);

  async function pay(bookingId) {
    try {
      await api.pay({ bookingId });
      const res = await api.myBookings();
      setBookings(res.bookings);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2">My Trips</h1>
      {justBooked && (
        <div className="bg-teal-800 text-sand-50 rounded-xl px-4 py-3 mb-6 text-sm">
          Booking confirmed — reference <strong>{justBooked}</strong>.
        </div>
      )}
      {loading && <p className="text-teal-950/50">Loading…</p>}
      {!loading && bookings.length === 0 && <p className="text-teal-950/50">No bookings yet — go discover something.</p>}

      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b._id} className="border border-teal-900/10 rounded-2xl p-5 flex items-center justify-between gap-4 bg-white">
            <div>
              <p className="font-display text-lg">{b.listing?.title}</p>
              <p className="text-sm text-teal-950/60">{b.vendor?.businessName} · Ref {b.confirmationCode}</p>
              <p className="text-sm text-teal-950/60">{b.currency} {b.totalPrice} · {b.partySize} {b.partySize === 1 ? "guest" : "guests"}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[b.status]}`}>
                {b.status.replace("_", " ")}
              </span>
              {b.status === "pending_confirmation" && (
                <button onClick={() => pay(b._id)} className="text-xs font-medium text-teal-900 underline">
                  Pay now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
