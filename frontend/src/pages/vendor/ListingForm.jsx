import { useState } from "react";
import { api, imageUrl } from "../../api/client.js";

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
  const [existingImages, setExistingImages] = useState(listing?.images || []);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function addFiles(fileList) {
    const allowed = Array.from(fileList).filter((f) =>
      /^image\/(jpeg|png|webp|gif)$/.test(f.type)
    );
    if (allowed.length === 0) return;
    const combined = [...newFiles, ...allowed].slice(0, 6 - existingImages.length);
    setNewFiles(combined);
    const previews = combined.map((f) => URL.createObjectURL(f));
    setNewPreviews(previews);
  }

  function removeExisting(idx) {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeNew(idx) {
    const updated = newFiles.filter((_, i) => i !== idx);
    setNewFiles(updated);
    setNewPreviews(updated.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let images = existingImages;
      if (newFiles.length > 0) {
        const uploaded = await api.uploadImages(newFiles, "listing");
        images = [...existingImages, ...uploaded.map((i) => i.url)];
      }

      if (isEditing) {
        await api.updateListing(listing._id, {
          title: form.title,
          category: form.category,
          description: form.description,
          basePrice: Number(form.basePrice),
          currency: form.currency,
          priceUnit: form.priceUnit,
          tags,
          images,
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
          images,
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

  const totalImages = existingImages.length + newFiles.length;
  const canAddMore = totalImages < 6;

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

          {/* ── Photo Upload Section ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-teal-900">Photos</label>
              <span className="text-xs text-teal-950/40">{totalImages}/6 photos</span>
            </div>

            {/* Existing + New image previews grid */}
            {totalImages > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {existingImages.map((img, idx) => (
                  <div key={`ex-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-teal-900/10">
                    <img src={imageUrl(img)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExisting(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >✕</button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-teal-900/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">Cover</span>
                    )}
                  </div>
                ))}
                {newPreviews.map((src, idx) => (
                  <div key={`new-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-teal-600/30">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNew(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >✕</button>
                    <span className="absolute bottom-1 left-1 bg-teal-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">New</span>
                  </div>
                ))}
              </div>
            )}

            {/* Drag-and-drop upload zone */}
            {canAddMore && (
              <label
                className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-6 cursor-pointer transition-colors ${
                  dragOver
                    ? "border-teal-500 bg-teal-50"
                    : "border-teal-900/20 bg-white hover:border-teal-500 hover:bg-teal-50/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              >
                <div className="text-3xl">📷</div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-teal-800">
                    {dragOver ? "Drop photos here" : "Drag & drop photos here"}
                  </p>
                  <p className="text-xs text-teal-950/40 mt-0.5">or click to browse • JPEG, PNG, WEBP • max 5 MB each</p>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            )}
            {!canAddMore && (
              <p className="text-xs text-teal-950/40 text-center mt-1">Maximum 6 photos reached. Remove a photo to add more.</p>
            )}
          </div>

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
