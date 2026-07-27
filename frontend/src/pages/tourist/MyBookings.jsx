import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";

const STATUS_COLORS = {
  pending_confirmation: "bg-saffron-100 text-saffron-600",
  confirmed: "bg-teal-800 text-sand-50",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-teal-50 text-teal-900",
  no_show: "bg-red-100 text-red-600",
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const justBooked = location.state?.justBooked;

  useEffect(() => {
    Promise.all([
      api.myBookings().then((res) => setBookings(res.bookings || [])),
      api.myItineraries("confirmed").then((res) => setSavedItineraries(res.itineraries || [])),
    ]).finally(() => setLoading(false));
  }, []);

  async function pay(bookingId) {
    try {
      await api.pay({ bookingId });
      const res = await api.myBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-2">My Trips & Bookings</h1>
      <p className="text-teal-950/60 mb-6">Manage your saved trip itineraries and confirmed service bookings.</p>

      {justBooked && (
        <div className="bg-teal-800 text-sand-50 rounded-xl px-4 py-3 mb-6 text-sm">
          Booking confirmed — reference <strong>{justBooked}</strong>.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-teal-900/10 mb-6">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "bookings"
              ? "border-teal-900 text-teal-900"
              : "border-transparent text-teal-950/50 hover:text-teal-900"
          }`}
        >
          Booked Listings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("itineraries")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "itineraries"
              ? "border-teal-900 text-teal-900"
              : "border-transparent text-teal-950/50 hover:text-teal-900"
          }`}
        >
          Saved Trip Plans ({savedItineraries.length})
        </button>
      </div>

      {loading && <p className="text-teal-950/50">Loading your trips…</p>}

      {!loading && activeTab === "bookings" && (
        <>
          {bookings.length === 0 ? (
            <p className="text-teal-950/50">No bookings yet — go discover attractions and services.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div key={b._id} className="border border-teal-900/10 rounded-2xl p-5 flex items-center justify-between gap-4 bg-white shadow-2xs">
                  <div>
                    <p className="font-display text-lg font-semibold">{b.listing?.title}</p>
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
          )}
        </>
      )}

      {!loading && activeTab === "itineraries" && (
        <>
          {savedItineraries.length === 0 ? (
            <div className="bg-teal-50/50 rounded-2xl p-8 text-center space-y-3 border border-teal-900/10">
              <p className="text-teal-950/60 font-medium">No saved trip plans yet.</p>
              <button
                onClick={() => navigate("/planner")}
                className="bg-teal-900 text-sand-50 px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-teal-800 transition"
              >
                ⚡ Plan a Trip Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {savedItineraries.map((it) => (
                <div key={it._id} className="border border-teal-900/10 rounded-2xl p-5 bg-white shadow-2xs space-y-3">
                  <div className="flex justify-between items-start flex-wrap gap-2 border-b border-teal-900/5 pb-3">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-teal-950">{it.title}</h3>
                      <p className="text-xs text-teal-950/60 font-medium mt-0.5">
                        📅 {new Date(it.startDate).toLocaleDateString()} – {new Date(it.endDate).toLocaleDateString()} • {it.items?.length || 0} scheduled stops
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/planner")}
                      className="bg-saffron-500 hover:bg-saffron-400 text-teal-950 px-4 py-2 rounded-xl text-xs font-semibold transition"
                    >
                      👁️ View Detailed Plan in Planner
                    </button>
                  </div>

                  {/* Summary Preview of Items */}
                  <div className="space-y-2 pt-1">
                    {it.items?.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="text-xs text-teal-950/80 flex items-center justify-between bg-teal-50/40 p-2 rounded-lg border border-teal-900/5">
                        <span className="font-medium">Day {item.day}: {item.title}</span>
                        {item.locationName && <span className="text-teal-950/50">📍 {item.locationName}</span>}
                      </div>
                    ))}
                    {it.items?.length > 4 && (
                      <p className="text-xs text-teal-950/40 italic">+{it.items.length - 4} more scheduled stops...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
