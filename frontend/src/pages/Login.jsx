import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Card, Input, ErrorBanner, Stamp } from "../components/ui.jsx";
import SocialLoginRow from "../components/SocialLoginRow.jsx";

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
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-b from-teal-950 to-teal-900 text-sand-50 px-12 py-16 relative overflow-hidden">
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-saffron-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <Link to="/" className="font-display text-2xl font-semibold">Ceylon Way</Link>
        </div>
        <div className="relative flex items-center gap-5">
          <Stamp tone="saffron">Trip<br />Passport</Stamp>
          <p className="font-display text-2xl leading-snug max-w-xs">
            One login. Every stay, guide, and ride you've booked across the island.
          </p>
        </div>
        <p className="relative text-sm text-sand-50/50">Verified vendors · AI trip planning · 24/7 safety line</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 text-teal-800">
            <Compass className="w-5 h-5" /> <span className="font-display text-xl">Ceylon Way</span>
          </div>
          <h1 className="font-display text-3xl font-semibold mb-2">Welcome back</h1>
          <p className="text-teal-950/60 mb-8">Log in to your Ceylon Way account.</p>

          <SocialLoginRow />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <ErrorBanner>{error}</ErrorBanner>
            <Button disabled={busy} className="w-full" size="lg" variant="dark">
              {busy ? "Logging in…" : "Log in"} {!busy && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <p className="text-sm text-teal-950/60 mt-6">
            New here? <Link to="/register" className="text-teal-800 font-semibold">Create an account</Link>
          </p>

          <Card className="mt-10 text-xs text-teal-950/60 p-4 leading-relaxed bg-teal-50 border-none shadow-none">
            <span className="font-semibold text-teal-900 block mb-1">Demo accounts</span>
            <span className="ledger block">admin@lankatourism.lk / Admin123!</span>
            <span className="ledger block">tourist@example.com / Tourist123!</span>
            <span className="ledger block">vendor@example.com / Vendor123!</span>
          </Card>
        </div>
      </div>
    </div>
  );
}
