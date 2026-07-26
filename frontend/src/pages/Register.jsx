import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORIES = ["hotel", "guide", "transport", "restaurant", "activity", "attraction"];

export default function Register() {
  const [mode, setMode] = useState("tourist");
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", category: "hotel" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { loginWithResult } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "tourist" ? await api.registerTourist(form) : await api.registerVendor(form);
      loginWithResult(result);
      navigate(mode === "tourist" ? "/discover" : "/vendor");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-teal-900">Full name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700" />
        </div>
        <div>
          <label className="text-sm font-medium text-teal-900">Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700" />
        </div>
        <div>
          <label className="text-sm font-medium text-teal-900">Password</label>
          <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700" />
        </div>

        {mode === "vendor" && (
          <>
            <div>
              <label className="text-sm font-medium text-teal-900">Business name</label>
              <input required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700" />
            </div>
            <div>
              <label className="text-sm font-medium text-teal-900">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700 capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <p className="text-xs text-teal-950/50">
              You'll be able to submit verification documents (business registration, SLTDA license) from your dashboard after signing up.
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full bg-saffron-500 text-teal-950 rounded-full py-3 font-medium hover:bg-saffron-400 transition disabled:opacity-60">
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-teal-950/60 mt-6">
        Already have an account? <Link to="/login" className="text-teal-800 font-medium">Log in</Link>
      </p>
    </div>
  );
}
