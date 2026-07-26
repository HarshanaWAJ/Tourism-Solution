const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("lt_token");
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  registerTourist: (payload) => apiFetch("/auth/register/tourist", { method: "POST", body: payload, auth: false }),
  registerVendor: (payload) => apiFetch("/auth/register/vendor", { method: "POST", body: payload, auth: false }),
  login: (payload) => apiFetch("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => apiFetch("/auth/me"),

  searchListings: (params) => apiFetch(`/listings?${new URLSearchParams(params).toString()}`, { auth: false }),
  getListing: (id) => apiFetch(`/listings/${id}`, { auth: false }),
  createListing: (payload) => apiFetch("/listings", { method: "POST", body: payload }),
  updateListing: (id, payload) => apiFetch(`/listings/${id}`, { method: "PATCH", body: payload }),
  vendorListings: () => apiFetch("/listings/vendor/mine"),
  addAvailability: (id, slots) => apiFetch(`/listings/${id}/availability`, { method: "POST", body: { slots } }),

  createBooking: (payload) => apiFetch("/bookings", { method: "POST", body: payload }),
  requestQuote: (payload) => apiFetch("/bookings/quotes", { method: "POST", body: payload }),
  myBookings: () => apiFetch("/bookings/mine"),
  vendorBookings: () => apiFetch("/bookings/vendor/mine"),
  updateBookingStatus: (id, payload) => apiFetch(`/bookings/${id}`, { method: "PATCH", body: payload }),

  vendorDashboard: () => apiFetch("/vendors/me/dashboard"),
  vendorProfile: () => apiFetch("/vendors/me/profile"),
  submitVerificationDoc: (payload) => apiFetch("/vendors/me/verification-documents", { method: "POST", body: payload }),

  createReview: (payload) => apiFetch("/reviews", { method: "POST", body: payload }),

  planTrip: (payload) => apiFetch("/ai/plan-trip", { method: "POST", body: payload }),
  chat: (payload) => apiFetch("/ai/chat", { method: "POST", body: payload }),
  myItineraries: () => apiFetch("/ai/itineraries/mine"),

  alerts: (params = {}) => apiFetch(`/support/alerts?${new URLSearchParams(params).toString()}`, { auth: false }),
  createTicket: (payload) => apiFetch("/support/tickets", { method: "POST", body: payload }),
  myTickets: () => apiFetch("/support/tickets/mine"),

  pay: (payload) => apiFetch("/payments", { method: "POST", body: payload }),

  adminOverview: () => apiFetch("/admin/analytics/overview"),
  adminVerificationQueue: () => apiFetch("/admin/verification-queue"),
  adminReviewDoc: (id, payload) => apiFetch(`/admin/verification-documents/${id}`, { method: "PATCH", body: payload }),
  adminDisputes: (params = {}) => apiFetch(`/admin/disputes?${new URLSearchParams(params).toString()}`),
  adminResolveDispute: (id, payload) => apiFetch(`/admin/disputes/${id}`, { method: "PATCH", body: payload }),
  adminModerationQueue: () => apiFetch("/reviews/moderation-queue"),
  adminModerateReview: (id, payload) => apiFetch(`/reviews/${id}/moderate`, { method: "PATCH", body: payload }),

  // Taxi fleet — admin "manage all"
  adminDriverVerificationQueue: () => apiFetch("/admin/driver-verification-queue"),
  adminTaxiDrivers: () => apiFetch("/admin/taxi/drivers"),
  adminSetDriverVerification: (id, status) =>
    apiFetch(`/admin/taxi/drivers/${id}/verification`, { method: "PATCH", body: { status } }),
  adminSuspendDriver: (id, isSuspended) =>
    apiFetch(`/admin/taxi/drivers/${id}/suspend`, { method: "PATCH", body: { isSuspended } }),
  adminTaxiRides: (params = {}) => apiFetch(`/admin/taxi/rides?${new URLSearchParams(params).toString()}`),
};

export { getToken };
