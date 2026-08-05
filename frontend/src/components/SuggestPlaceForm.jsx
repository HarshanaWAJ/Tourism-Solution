import { useState } from "react";
import { PlusCircle, ImagePlus } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Card, Input, ErrorBanner } from "./ui.jsx";

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
      <Card className="bg-teal-50 border-teal-900/10 p-6 text-sm text-teal-900">
        Thanks — <strong>{form.title}</strong> has been sent to our team for review. Once
        approved, it'll appear in Discover with your photos.
      </Card>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="w-4 h-4" /> Can't find it? Suggest this place
      </Button>
    );
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="p-5 space-y-3">
      <p className="text-sm text-teal-950/60">
        Tell us about the place — an admin will review it (with your photos) before it's added to the catalog.
      </p>
      <Input required placeholder="Place name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm capitalize bg-white"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input required placeholder="City (e.g. Ella)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <Input placeholder="Address / directions (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <textarea
        placeholder="What makes this place worth visiting?"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={3}
        className="w-full rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm"
      />
      <div>
        <label className="text-sm font-medium text-teal-900 flex items-center gap-1.5 mb-1.5"><ImagePlus className="w-4 h-4" /> Photos</label>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" />
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      <div className="flex gap-2 items-center">
        <Button disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </Card>
  );
}
