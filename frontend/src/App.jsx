import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import Discover from "./pages/tourist/Discover.jsx";
import ListingDetail from "./pages/tourist/ListingDetail.jsx";
import Planner from "./pages/tourist/Planner.jsx";
import MyBookings from "./pages/tourist/MyBookings.jsx";
import Support from "./pages/tourist/Support.jsx";

import VendorDashboard from "./pages/vendor/Dashboard.jsx";
import AdminCenter from "./pages/admin/AdminCenter.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/discover" element={<Discover />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/planner" element={<ProtectedRoute role="tourist"><Planner /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute role="tourist"><MyBookings /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute role="tourist"><Support /></ProtectedRoute>} />

          <Route path="/vendor" element={<ProtectedRoute role="vendor"><VendorDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminCenter /></ProtectedRoute>} />

          <Route path="*" element={<div className="max-w-3xl mx-auto px-6 py-24 text-center text-teal-950/60">Page not found.</div>} />
        </Routes>
      </main>
      <footer className="border-t border-teal-900/10 py-8 text-center text-xs text-teal-950/40">
        Ceylon Way — a trusted booking and safety layer for Sri Lanka tourism.
      </footer>
    </div>
  );
}
