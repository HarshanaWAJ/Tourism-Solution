import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-full text-sm font-medium transition ${
    isActive ? "bg-teal-800 text-sand-50" : "text-teal-900 hover:bg-teal-50"
  }`;

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-teal-800/10 bg-sand-50/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold text-teal-900">Ceylon&nbsp;Way</span>
          <span className="text-xs uppercase tracking-widest text-saffron-600">Lanka Tourism Platform</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/discover" className={linkClass}>Discover</NavLink>
          {user?.role === "tourist" && (
            <>
              <NavLink to="/planner" className={linkClass}>AI Planner</NavLink>
              <NavLink to="/my-bookings" className={linkClass}>My Trips</NavLink>
              <NavLink to="/support" className={linkClass}>Support &amp; Safety</NavLink>
            </>
          )}
          {user?.role === "vendor" && <NavLink to="/vendor" className={linkClass}>Business Portal</NavLink>}
          {user?.role === "admin" && <NavLink to="/admin" className={linkClass}>Admin Center</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-teal-900/70 hidden sm:inline">
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
                className="text-sm font-medium bg-saffron-500 text-teal-950 rounded-full px-4 py-2 hover:bg-saffron-400 transition"
              >
                Join Ceylon Way
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
