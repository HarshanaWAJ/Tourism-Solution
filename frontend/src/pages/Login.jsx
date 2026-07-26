import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { loginWithResult } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api.login(form);
      loginWithResult(result);
      navigate(result.user.role === "vendor" ? "/vendor" : result.user.role === "admin" ? "/admin" : "/discover");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display text-3xl font-semibold mb-2">Welcome back</h1>
      <p className="text-teal-950/60 mb-8">Log in to your Ceylon Way account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-teal-900">Email</label>
          <input
            type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-teal-900">Password</label>
          <input
            type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full bg-teal-900 text-sand-50 rounded-full py-3 font-medium hover:bg-teal-800 transition disabled:opacity-60">
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-teal-950/60 mt-6">
        New here? <Link to="/register" className="text-teal-800 font-medium">Create an account</Link>
      </p>

      <div className="mt-10 text-xs text-teal-950/50 bg-teal-50 rounded-xl p-4">
        Demo accounts (after running the seed script): <br />
        admin@lankatourism.lk / Admin123! · tourist@example.com / Tourist123! · vendor@example.com / Vendor123!
      </div>
    </div>
  );
}
