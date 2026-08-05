import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Input, ErrorBanner } from "../components/ui.jsx";
import SocialLoginRow from "../components/SocialLoginRow.jsx";

const CATEGORIES = ["hotel", "guide", "transport", "restaurant", "activity", "attraction"];
const LANGUAGES = ["English", "Sinhala", "Tamil", "German", "French", "Chinese", "Japanese", "Russian"];
const INTERESTS = ["Beaches", "Wildlife", "Culture & temples", "Hiking", "Food", "Surfing", "Tea country", "Wellness"];

export default function Register() {
  const [mode, setMode] = useState("tourist");
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    businessName: "", category: "hotel",
    preferredLanguage: "English", nationality: "", interests: [],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { loginWithResult } = useAuth();
  const navigate = useNavigate();

  function toggleInterest(i) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = mode === "tourist" ? await api.registerTourist(form) : await api.registerVendor(form);
      loginWithResult(result);
      navigate(mode === "tourist" ? "/discover" : "/vendor");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold mb-2">Join Ceylon Way</h1>
      <p className="text-teal-950/60 mb-6">Plan a trip, or list your business.</p>

      <div className="flex rounded-full bg-teal-50 p-1 mb-8">
        {["tourist", "vendor"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-2 text-sm font-medium capitalize transition ${
              mode === m ? "bg-teal-900 text-sand-50" : "text-teal-900/70"
            }`}
          >
            {m === "tourist" ? "I'm traveling" : "I run a business"}
          </button>
        ))}
      </div>

      <SocialLoginRow />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required minLength={8} hint="At least 8 characters." value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {mode === "tourist" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-teal-900 block mb-1.5">Preferred language</span>
                <select
                  value={form.preferredLanguage}
                  onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                  className="w-full rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm bg-white"
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <Input label="Nationality" placeholder="e.g. German" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            </div>

            <div>
              <span className="text-sm font-medium text-teal-900 block mb-1.5">Travel interests</span>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const active = form.interests.includes(i);
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => toggleInterest(i)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                        active ? "bg-teal-900 text-sand-50 border-teal-900" : "border-teal-900/15 text-teal-900/70 hover:bg-teal-50"
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />} {i}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-teal-950/45 mt-1.5">Used to tailor your AI trip planner recommendations.</p>
            </div>
          </>
        )}

        {mode === "vendor" && (
          <>
            <Input label="Business name" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            <label className="block">
              <span className="text-sm font-medium text-teal-900 block mb-1.5">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm capitalize bg-white"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <p className="text-xs text-teal-950/50">
              You'll be able to submit verification documents (business registration, SLTDA license) from your dashboard after signing up.
            </p>
          </>
        )}

        <ErrorBanner>{error}</ErrorBanner>
        <Button disabled={busy} className="w-full" size="lg">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-teal-950/60 mt-6">
        Already have an account? <Link to="/login" className="text-teal-800 font-semibold">Log in</Link>
      </p>
    </div>
  );
}
