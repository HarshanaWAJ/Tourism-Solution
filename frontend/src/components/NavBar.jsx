import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, MapPin, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-full text-sm font-medium transition ${
    isActive ? "bg-teal-800 text-sand-50" : "text-teal-900/80 hover:bg-teal-50 hover:text-teal-900"
  }`;

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <NavLink to="/discover" className={linkClass} onClick={() => setOpen(false)}>Discover</NavLink>
      {user?.role === "tourist" && (
        <>
          <NavLink to="/planner" className={linkClass} onClick={() => setOpen(false)}>AI Planner</NavLink>
          <NavLink to="/my-bookings" className={linkClass} onClick={() => setOpen(false)}>My Trips</NavLink>
          <NavLink to="/support" className={linkClass} onClick={() => setOpen(false)}>Support &amp; Safety</NavLink>
        </>
      )}
      {user?.role === "vendor" && <NavLink to="/vendor" className={linkClass} onClick={() => setOpen(false)}>Business Portal</NavLink>}
      {user?.role === "admin" && <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>Admin Center</NavLink>}
    </>
  );

  return (
    <header className="border-b border-teal-900/8 bg-sand-50/90 backdrop-blur sticky top-0 z-40">
      {/* Utility strip — mirrors a boarding-pass header, not decoration: always-on safety access */}
      <div className="hidden sm:flex items-center justify-between bg-teal-950 text-sand-50/70 text-xs px-6 py-1.5">
        <span className="inline-flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Sri Lanka</span>
        <Link to="/support" className="inline-flex items-center gap-1.5 hover:text-ruby-400 transition">
          <ShieldAlert className="w-3 h-3" /> Emergency &amp; safety line
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-baseline gap-2 shrink-0" onClick={() => setOpen(false)}>
          <span className="font-display text-2xl font-semibold text-teal-900">Ceylon Way</span>
          <span className="hidden md:inline text-xs uppercase tracking-widest text-saffron-600">Trip Layer</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">{links}</nav>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-teal-900/60">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-sm font-medium text-teal-900 border border-teal-900/20 rounded-full px-4 py-2 hover:bg-teal-900 hover:text-sand-50 transition"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium px-3 py-2 text-teal-900">Log in</Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-saffron-500 text-teal-950 rounded-full px-4 py-2 hover:bg-saffron-400 transition shadow-card"
              >
                Join Ceylon Way
              </Link>
            </>
          )}
        </div>

        <button className="lg:hidden text-teal-900" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-teal-900/8 px-6 py-4 flex flex-col gap-1 bg-sand-50">
          {links}
          <div className="h-px bg-teal-900/8 my-2" />
          {user ? (
            <button
              onClick={() => { logout(); navigate("/"); setOpen(false); }}
              className="text-left text-sm font-medium text-teal-900 px-3 py-2"
            >
              Log out ({user.name})
            </button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium px-3 py-2 text-teal-900" onClick={() => setOpen(false)}>Log in</Link>
              <Link to="/register" className="text-sm font-medium px-3 py-2 text-saffron-700" onClick={() => setOpen(false)}>Join Ceylon Way</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
