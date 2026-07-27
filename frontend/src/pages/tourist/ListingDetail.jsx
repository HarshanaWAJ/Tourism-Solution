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

  // Payment Checkout Modal state
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
      const res = await api.createBooking({
        listingId: id,
        availabilitySlotId: selectedSlot,
        partySize: Number(partySize),
      });
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
      // Step 1: Create payment intent on backend (Stripe / Cash)
      const intentRes = await api.createPaymentIntent({
        bookingId: createdBooking._id,
        provider: paymentProvider,
      });

      // Step 2: Confirm payment and mark booking as confirmed
      const confirmRes = await api.pay({
        bookingId: createdBooking._id,
        provider: paymentProvider,
        paymentIntentId: intentRes.paymentIntentId,
      });

      setShowCheckout(false);
      navigate("/my-bookings", {
        state: { justBooked: confirmRes.booking?.confirmationCode || createdBooking.confirmationCode },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setPayBusy(false);
    }
  }

  if (error && !data) return <div className="max-w-4xl mx-auto px-6 py-16 text-red-600">{error}</div>;
  if (!data) return <div className="max-w-4xl mx-auto px-6 py-16 text-teal-950/50">Loading…</div>;

  const { listing, availability, reviews } = data;
  const slotObj = availability.find((s) => s._id === selectedSlot);
  const unitPrice = slotObj?.priceOverride ?? listing.basePrice;
  const totalPrice = unitPrice * Number(partySize || 1);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 relative">
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
              className="h-32 w-full object-cover rounded-xl shadow-2xs"
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

        <aside className="border border-teal-900/10 rounded-2xl p-5 h-fit bg-white shadow-xs">
          <p className="text-2xl font-semibold text-teal-900 mb-1">
            {listing.currency} {listing.basePrice}
            <span className="text-sm font-normal text-teal-950/50"> /{listing.priceUnit?.replace("per_", "")}</span>
          </p>

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

          {error && !showCheckout && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <button
            onClick={initiateBooking}
            disabled={!selectedSlot || status === "creating_booking"}
            className="w-full mt-5 bg-teal-900 text-sand-50 rounded-full py-3 font-medium hover:bg-teal-800 transition disabled:opacity-50 shadow-xs"
          >
            {status === "creating_booking" ? "Initializing..." : "Book now & Pay"}
          </button>
          <p className="text-xs text-teal-950/50 mt-3 text-center">
            Instant booking confirmation with Stripe Card or Pay on Arrival.
          </p>
        </aside>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-teal-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-teal-900/15 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-teal-900/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-teal-950">Complete Your Booking</h3>
                <p className="text-xs text-teal-950/60 font-medium">Confirmation Ref: {createdBooking?.confirmationCode}</p>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-teal-950/40 hover:text-teal-950 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-900/10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-teal-950/60 font-medium">Experience:</span>
                <span className="font-semibold text-teal-950 max-w-[200px] truncate">{listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-950/60 font-medium">Guests:</span>
                <span className="font-semibold text-teal-950">{partySize} {Number(partySize) === 1 ? "Guest" : "Guests"}</span>
              </div>
              <div className="flex justify-between border-t border-teal-900/10 pt-2 font-bold text-base text-teal-900">
                <span>Total Amount:</span>
                <span>{listing.currency} {totalPrice}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <form onSubmit={processPaymentAndConfirm} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-teal-950/60 block mb-2">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider("stripe")}
                    className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentProvider === "stripe"
                        ? "border-teal-900 bg-teal-900 text-white shadow-xs"
                        : "border-teal-900/15 bg-white text-teal-950 hover:bg-teal-50"
                    }`}
                  >
                    <span>💳 Credit Card (Stripe)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentProvider("cash_on_arrival")}
                    className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentProvider === "cash_on_arrival"
                        ? "border-teal-900 bg-teal-900 text-white shadow-xs"
                        : "border-teal-900/15 bg-white text-teal-950 hover:bg-teal-50"
                    }`}
                  >
                    <span>💵 Pay on Arrival</span>
                  </button>
                </div>
              </div>

              {/* Stripe Card Fields */}
              {paymentProvider === "stripe" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Cardholder Name</label>
                    <input
                      required
                      placeholder="e.g. John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Card Number (Stripe Test: 4242 4242...)</label>
                    <input
                      required
                      placeholder="4242 •••• •••• 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 font-medium block mb-1">Expires (MM/YY)</label>
                      <input
                        required
                        placeholder="12/28"
                        value={cardExp}
                        onChange={(e) => setCardExp(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-700 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-medium block mb-1">CVC</label>
                      <input
                        required
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-700 text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">🔒 Encrypted 256-bit SSL transaction processed by Stripe.</p>
                </div>
              )}

              {paymentProvider === "cash_on_arrival" && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">💵 Pay on Arrival / Cash at Venue</p>
                  <p className="text-amber-800/80">Your slot is guaranteed immediately. You can pay {listing.currency} {totalPrice} directly to the vendor when arriving.</p>
                </div>
              )}

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={payBusy}
                className="w-full bg-teal-900 text-sand-50 rounded-2xl py-3.5 font-semibold text-sm hover:bg-teal-800 transition disabled:opacity-50 shadow-md"
              >
                {payBusy
                  ? "Processing Payment..."
                  : paymentProvider === "stripe"
                  ? `Pay ${listing.currency} ${totalPrice} with Stripe`
                  : `Confirm Reservation (${listing.currency} ${totalPrice})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
