import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CalendarClock, CreditCard, Wallet, MapPin, ShieldCheck, Sparkles, Star, X, Lock } from "lucide-react";
import { api, imageUrl } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import TrustBadge from "../../components/TrustBadge.jsx";
import { Button, Card, ErrorBanner, Spinner, Input } from "../../components/ui.jsx";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState("stripe");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [createdBooking, setCreatedBooking] = useState(null);
  const [payBusy, setPayBusy] = useState(false);

  useEffect(() => {
    api.getListing(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  async function initiateBooking() {
    if (!user) return navigate("/login");
    if (user.role !== "tourist") return setError("Only tourist accounts can book.");
    setStatus("creating_booking");
    setError("");
    try {
      const res = await api.createBooking({ listingId: id, availabilitySlotId: selectedSlot, partySize: Number(partySize) });
      setCreatedBooking(res.booking);
      setShowCheckout(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus("");
    }
  }

  async function processPaymentAndConfirm(e) {
    e.preventDefault();
    if (!createdBooking) return;
    setPayBusy(true);
    setError("");
    try {
      const intentRes = await api.createPaymentIntent({ bookingId: createdBooking._id, provider: paymentProvider });
      const confirmRes = await api.pay({ bookingId: createdBooking._id, provider: paymentProvider, paymentIntentId: intentRes.paymentIntentId });
      setShowCheckout(false);
      navigate("/my-bookings", { state: { justBooked: confirmRes.booking?.confirmationCode || createdBooking.confirmationCode } });
    } catch (err) {
      setError(err.message);
    } finally {
      setPayBusy(false);
    }
  }

  if (error && !data) return <div className="max-w-4xl mx-auto px-6 py-16"><ErrorBanner>{error}</ErrorBanner></div>;
  if (!data) return <div className="max-w-4xl mx-auto px-6 py-16"><Spinner label="Loading listing…" /></div>;

  const { listing, availability, reviews } = data;
  const slotObj = availability.find((s) => s._id === selectedSlot);
  const unitPrice = slotObj?.priceOverride ?? listing.basePrice;
  const totalPrice = unitPrice * Number(partySize || 1);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 relative">
      <span className="text-xs uppercase tracking-widest text-saffron-600 font-semibold">{listing.category}</span>
      <h1 className="font-display text-4xl font-semibold mt-1 mb-3">{listing.title}</h1>
      <p className="text-teal-950/60 mb-4 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {listing.location?.city}, {listing.location?.region}</p>
      <TrustBadge vendor={listing.vendor} />

      {listing.images?.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-2xl">
          {listing.images.slice(0, 6).map((img, idx) => (
            <img key={idx} src={imageUrl(img)} alt={`${listing.title} photo ${idx + 1}`} className="h-32 w-full object-cover rounded-xl" />
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
                    <span className="flex text-saffron-500">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </span>
                  </div>
                  <p className="text-sm text-teal-950/70 mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <Card as="aside" className="p-5 h-fit sticky top-24">
          <p className="text-2xl font-semibold text-teal-900 ledger">
            {listing.currency} {listing.basePrice}
            <span className="text-sm font-normal text-teal-950/50 font-body"> /{listing.priceUnit?.replace("per_", "")}</span>
          </p>

          {listing.bookingRequired || listing.category === "hotel" ? (
            <>
              <div className="mt-3 mb-2 flex items-center gap-1.5 text-xs text-teal-800 font-semibold bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-900/10">
                <CalendarClock className="w-3.5 h-3.5" /> Advance booking required
              </div>
              <label className="text-sm font-medium text-teal-900 block mt-4 mb-1">Available date</label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm bg-white"
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

              {error && !showCheckout && <ErrorBanner>{error}</ErrorBanner>}

              <Button
                onClick={initiateBooking}
                disabled={!selectedSlot || status === "creating_booking"}
                variant="dark" size="lg" className="w-full mt-5"
              >
                {status === "creating_booking" ? "Initializing…" : "Book now & pay"}
              </Button>
              <p className="text-xs text-teal-950/50 mt-3 text-center">
                Instant confirmation — pay by card or on arrival.
              </p>
            </>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-saffron-100 border border-saffron-500/20 text-teal-950 space-y-2">
              <div className="flex items-center gap-2 text-saffron-700 font-semibold text-sm">
                <MapPin className="w-4 h-4" /> Direct visit / walk-in location
              </div>
              <p className="text-xs text-teal-950/70 leading-relaxed">
                Advance online booking is <strong>not required</strong> for this spot. Visit directly during opening hours and pay on-site.
              </p>
              <Button
                onClick={() => navigate(`/planner?city=${encodeURIComponent(listing.location?.city || "")}&listingId=${listing._id}`)}
                className="w-full mt-2" size="sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Add to AI trip plan
              </Button>
            </div>
          )}
        </Card>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-teal-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full shadow-lift">
            <div className="flex justify-between items-center p-6 pb-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-teal-950">Complete your booking</h3>
                <p className="text-xs text-teal-950/60 font-medium ledger mt-0.5">Ref {createdBooking?.confirmationCode}</p>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-teal-950/40 hover:text-teal-950 p-1" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher-style order summary — ticket tear separates it from the payment form */}
            <div className="mx-6 bg-teal-50/60 p-4 rounded-2xl border border-teal-900/10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-teal-950/60 font-medium">Experience</span>
                <span className="font-semibold text-teal-950 max-w-[200px] truncate">{listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-950/60 font-medium">Guests</span>
                <span className="font-semibold text-teal-950">{partySize} {Number(partySize) === 1 ? "guest" : "guests"}</span>
              </div>
              <div className="flex justify-between border-t border-teal-900/10 pt-2 font-bold text-base text-teal-900 ledger">
                <span className="font-body font-bold">Total</span>
                <span>{listing.currency} {totalPrice}</span>
              </div>
            </div>

            <form onSubmit={processPaymentAndConfirm} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-teal-950/60 block mb-2">Payment method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider("stripe")}
                    className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentProvider === "stripe" ? "border-teal-900 bg-teal-900 text-white" : "border-teal-900/15 bg-white text-teal-950 hover:bg-teal-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Card (Stripe)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentProvider("cash_on_arrival")}
                    className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentProvider === "cash_on_arrival" ? "border-teal-900 bg-teal-900 text-white" : "border-teal-900/15 bg-white text-teal-950 hover:bg-teal-50"
                    }`}
                  >
                    <Wallet className="w-4 h-4" /> Pay on arrival
                  </button>
                </div>
              </div>

              {paymentProvider === "stripe" && (
                <div className="space-y-3 bg-sand-100 p-4 rounded-2xl border border-teal-900/10">
                  <Input label="Cardholder name" required placeholder="e.g. John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                  <Input label="Card number (Stripe test: 4242 4242…)" required placeholder="4242 •••• •••• 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="ledger" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Expires (MM/YY)" required placeholder="12/28" value={cardExp} onChange={(e) => setCardExp(e.target.value)} className="text-center ledger" />
                    <Input label="CVC" required placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} className="text-center ledger" />
                  </div>
                  <p className="text-[11px] text-teal-950/45 flex items-center gap-1"><Lock className="w-3 h-3" /> Encrypted transaction processed by Stripe.</p>
                </div>
              )}

              {paymentProvider === "cash_on_arrival" && (
                <div className="bg-saffron-100 p-4 rounded-2xl border border-saffron-500/20 text-sm text-teal-950 space-y-1">
                  <p className="font-semibold flex items-center gap-2"><Wallet className="w-4 h-4" /> Pay on arrival</p>
                  <p className="text-teal-950/70">Your slot is guaranteed immediately. Pay {listing.currency} {totalPrice} directly to the vendor on arrival.</p>
                </div>
              )}

              <ErrorBanner>{error}</ErrorBanner>

              <Button type="submit" disabled={payBusy} variant="dark" size="lg" className="w-full">
                {payBusy ? "Processing payment…" : paymentProvider === "stripe" ? `Pay ${listing.currency} ${totalPrice} with Stripe` : `Confirm reservation (${listing.currency} ${totalPrice})`}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
