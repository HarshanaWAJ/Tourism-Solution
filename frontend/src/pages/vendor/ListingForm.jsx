import { useState } from "react";
import { api } from "../../api/client.js";

const CATEGORIES = ["hotel", "guide", "transport", "restaurant", "activity", "attraction", "package"];
const PRICE_UNITS = ["per_night", "per_person", "per_trip", "per_hour", "flat"];
const CURRENCIES = ["USD", "LKR", "EUR", "GBP"];

function toFormState(listing) {
  if (!listing) {
    return {
      title: "", category: "hotel", description: "", basePrice: "", currency: "USD",
      priceUnit: "per_night", city: "", region: "", tags: "", isActive: true,
    };
  }
  return {
    title: listing.title || "",
    category: listing.category || "hotel",
    description: listing.description || "",
    basePrice: listing.basePrice ?? "",
    currency: listing.currency || "USD",
    priceUnit: listing.priceUnit || "per_night",
    city: listing.location?.city || "",
    region: listing.location?.region || "",
    tags: (listing.tags || []).join(", "),
    isActive: listing.isActive ?? true,
  };
}

export default function ListingForm({ listing, onClose, onSaved }) {
  const isEditing = Boolean(listing);
  const [form, setForm] = useState(() => toFormState(listing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (isEditing) {
        await api.updateListing(listing._id, {
          title: form.title,
          category: form.category,
          description: form.description,
          basePrice: Number(form.basePrice),
          currency: form.currency,
          priceUnit: form.priceUnit,
          tags,
          isActive: form.isActive,
        });
      } else {
        const res = await api.createListing({
          title: form.title,
          category: form.category,
          description: form.description,
          basePrice: Number(form.basePrice),
          currency: form.currency,
          priceUnit: form.priceUnit,
          tags,
          location: { label: form.title, city: form.city, region: form.region },
        });

        // Seed 14 days of availability so it's immediately bookable
        const today = new Date();
        const slots = Array.from({ length: 14 }).map((_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() + i + 1);
          return { date: d, capacityTotal: 5 };
        });
        await api.addAvailability(res.listing._id, slots);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-teal-950/40 flex items-center justify-center p-6 z-50">
      <div className="bg-sand-50 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-2xl">{isEditing ? "Edit listing" : "New listing"}</h2>
          <button onClick={onClose} className="text-teal-950/50 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm">
              {PRICE_UNITS.map((u) => <option key={u} value={u}>{u.replace("_", " ")}</option>)}
            </select>
          </div>
          <textarea placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />

          {!isEditing && (
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
              <input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
            </div>
          )}

          <input placeholder="Tags (comma separated, e.g. beach, family-friendly)" value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />

          <div className="grid grid-cols-2 gap-3">
            <input required type="number" placeholder="Base price" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm" />
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="rounded-xl border border-teal-900/15 px-3 py-2 text-sm">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm text-teal-950/70">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Published (visible to tourists)
            </label>
          )}

          {!isEditing && (
            <p className="text-xs text-teal-950/40">
              City and region can't be changed after creation yet — edit availability and pricing any time.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="w-full bg-teal-900 text-sand-50 rounded-full py-2.5 text-sm font-medium hover:bg-teal-800 transition disabled:opacity-60">
            {busy ? "Saving…" : isEditing ? "Save changes" : "Create listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
