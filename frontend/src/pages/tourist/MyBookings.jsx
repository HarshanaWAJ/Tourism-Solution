import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Eye, MapPin, Sparkles, Ticket } from "lucide-react";
import { api } from "../../api/client.js";
import { Badge, Button, Card, EmptyState, Spinner } from "../../components/ui.jsx";

const STATUS_TONE = {
  pending_confirmation: "saffronSoft",
  confirmed: "teal",
  cancelled: "rubySoft",
  completed: "tealSoft",
  no_show: "rubySoft",
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
      <h1 className="font-display text-3xl font-semibold mb-2">My trips &amp; bookings</h1>
      <p className="text-teal-950/60 mb-6">Manage your saved trip itineraries and confirmed service bookings.</p>

      {justBooked && (
        <Card className="bg-teal-800 text-sand-50 border-none px-4 py-3 mb-6 text-sm flex items-center gap-2">
          <Ticket className="w-4 h-4" /> Booking confirmed — reference <strong className="ledger">{justBooked}</strong>.
        </Card>
      )}

      <div className="flex gap-4 border-b border-teal-900/10 mb-6">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${activeTab === "bookings" ? "border-teal-900 text-teal-900" : "border-transparent text-teal-950/50 hover:text-teal-900"}`}
        >
          Booked listings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("itineraries")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${activeTab === "itineraries" ? "border-teal-900 text-teal-900" : "border-transparent text-teal-950/50 hover:text-teal-900"}`}
        >
          Saved trip plans ({savedItineraries.length})
        </button>
      </div>

      {loading && <Spinner label="Loading your trips…" />}

      {!loading && activeTab === "bookings" && (
        bookings.length === 0 ? (
          <EmptyState icon={Ticket} title="No bookings yet" body="Go discover attractions and services to get started." />
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <Card key={b._id} className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-semibold">{b.listing?.title}</p>
                  <p className="text-sm text-teal-950/60">{b.vendor?.businessName} · <span className="ledger">Ref {b.confirmationCode}</span></p>
                  <p className="text-sm text-teal-950/60 ledger">{b.currency} {b.totalPrice} · {b.partySize} {b.partySize === 1 ? "guest" : "guests"}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge tone={STATUS_TONE[b.status] || "outline"} className="capitalize">{b.status.replace(/_/g, " ")}</Badge>
                  {b.status === "pending_confirmation" && (
                    <button onClick={() => pay(b._id)} className="text-xs font-medium text-teal-900 underline">Pay now</button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {!loading && activeTab === "itineraries" && (
        savedItineraries.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No saved trip plans yet"
            body="Let the AI planner build an itinerary around your interests and budget."
            action={<Button onClick={() => navigate("/planner")}><Sparkles className="w-4 h-4" /> Plan a trip now</Button>}
          />
        ) : (
          <div className="space-y-4">
            {savedItineraries.map((it) => (
              <Card key={it._id} className="p-5 space-y-3">
                <div className="flex justify-between items-start flex-wrap gap-2 border-b border-teal-900/5 pb-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-teal-950">{it.title}</h3>
                    <p className="text-xs text-teal-950/60 font-medium mt-0.5 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" /> {new Date(it.startDate).toLocaleDateString()} – {new Date(it.endDate).toLocaleDateString()} · {it.items?.length || 0} scheduled stops
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/planner")}><Eye className="w-3.5 h-3.5" /> View in planner</Button>
                </div>

                <div className="space-y-2 pt-1">
                  {it.items?.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="text-xs text-teal-950/80 flex items-center justify-between bg-teal-50/40 p-2 rounded-lg border border-teal-900/5">
                      <span className="font-medium">Day {item.day}: {item.title}</span>
                      {item.locationName && <span className="text-teal-950/50 flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.locationName}</span>}
                    </div>
                  ))}
                  {it.items?.length > 4 && <p className="text-xs text-teal-950/40 italic">+{it.items.length - 4} more scheduled stops…</p>}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
