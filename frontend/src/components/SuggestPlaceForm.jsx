import { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORIES = ["attraction", "restaurant", "activity", "hotel", "guide", "transport"];

export default function SuggestPlaceForm({ initialQuery = "", onSubmitted }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: initialQuery,
    category: "attraction",
    description: "",
    city: "",
    address: "",
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!user || user.role !== "tourist") return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let imageIds = [];
      if (files.length > 0) {
        const uploaded = await api.uploadImages(files, "place-submission");
        imageIds = uploaded.map((i) => i.id);
      }
      await api.submitPlace({
        title: form.title,
        category: form.category,
        description: form.description,
        searchQueryContext: initialQuery,
        location: { label: form.title, address: form.address, city: form.city },
        imageIds,
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-teal-900/10 bg-teal-50 p-6 text-sm text-teal-900">
        Thanks! Your suggestion for <strong>{form.title}</strong> has been sent to our team for review. Once
        approved, it'll appear in Discover with your photos.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-teal-900 border border-teal-900/20 rounded-full px-5 py-2.5 hover:bg-teal-900 hover:text-sand-50 transition"
      >
        Can't find it? Suggest this place
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-teal-900/10 bg-white p-5 space-y-3">
      <p className="text-sm text-teal-950/60">
        Tell us about the place — an admin will review it (with your photos) before it's added to the catalog.
      </p>
      <input
        required
        placeholder="Place name"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm"
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm capitalize"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          required
          placeholder="City (e.g. Ella)"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm"
        />
      </div>
      <input
        placeholder="Address / directions (optional)"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        className="w-full rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm"
      />
      <textarea
        placeholder="What makes this place worth visiting?"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={3}
        className="w-full rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm"
      />
      <div>
        <label className="text-sm font-medium text-teal-900 block mb-1">Photos</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="bg-saffron-500 text-teal-950 rounded-full px-5 py-2.5 text-sm font-medium hover:bg-saffron-400 transition disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-teal-900/70 px-4"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
