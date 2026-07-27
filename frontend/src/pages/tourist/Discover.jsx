import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, imageUrl } from "../../api/client.js";
import TrustBadge from "../../components/TrustBadge.jsx";
import SuggestPlaceForm from "../../components/SuggestPlaceForm.jsx";

const CATEGORIES = ["", "hotel", "guide", "transport", "restaurant", "activity", "attraction"];

export default function Discover() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ query: "", category: "", city: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function runSearch(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await api.searchListings(clean);
      setResults(res.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runSearch(); }, []); // eslint-disable-line

  function planTripWithListing(e, listing) {
    e.preventDefault();
    e.stopPropagation();
    const city = listing.location?.city || "";
    navigate(`/planner?city=${encodeURIComponent(city)}&listingId=${listing._id}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-1">Discover Locations & Activities</h1>
      <p className="text-teal-950/60 mb-8">Search verified hotels, guides, activities, and attractions across Sri Lanka.</p>

      <form onSubmit={runSearch} className="grid sm:grid-cols-4 gap-3 mb-10 bg-teal-50 p-4 rounded-2xl">
        <input
          placeholder="Search (e.g. surfing, tuk-tuk, Sigiriya)"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          className="sm:col-span-2 rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700 bg-white text-sm"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5 capitalize bg-white text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          placeholder="City (e.g. Ella)"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5 bg-white text-sm"
        />
        <button className="sm:col-span-4 bg-teal-900 text-sand-50 rounded-xl py-2.5 font-medium hover:bg-teal-800 transition shadow-xs">
          Search Locations
        </button>
      </form>

      {loading && <p className="text-teal-950/50">Searching locations…</p>}
      {error && <p className="text-red-600 font-medium">{error}</p>}
      {!loading && results.length === 0 && <p className="text-teal-950/50">No listings matched — try broadening your search.</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((listing) => (
          <div
            key={listing._id}
            onClick={() => navigate(`/listing/${listing._id}`)}
            className="rounded-2xl border border-teal-900/10 overflow-hidden hover:shadow-lg transition bg-white flex flex-col justify-between cursor-pointer group"
          >
            <div>
              {listing.images?.[0] ? (
                <img
                  src={imageUrl(listing.images[0])}
                  alt={listing.title}
                  className="h-44 w-full object-cover group-hover:scale-102 transition duration-300"
                />
              ) : (
                <div className="h-44 w-full bg-teal-50 flex items-center justify-center text-teal-900/30 text-sm">
                  No photo available
                </div>
              )}
              <div className="p-5">
                <span className="text-xs uppercase tracking-widest text-saffron-600 font-semibold">{listing.category}</span>
                <h3 className="font-display text-xl mt-1 mb-1 font-semibold text-teal-950">{listing.title}</h3>
                <p className="text-xs text-teal-950/60 mb-3 font-medium">📍 {listing.location?.city || "Sri Lanka"}{listing.location?.region ? `, ${listing.location.region}` : ""}</p>
                <p className="text-sm text-teal-950/70 mb-4 line-clamp-2 leading-relaxed">{listing.description}</p>

                <div className="flex items-center justify-between border-t border-teal-900/5 pt-3">
                  <span className="font-semibold text-teal-900">
                    {listing.currency} {listing.basePrice} <span className="text-xs font-normal text-teal-950/50">/{listing.priceUnit?.replace("per_", "")}</span>
                  </span>
                  {listing.ratingCount > 0 && (
                    <span className="text-xs font-medium text-teal-950/70 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                      ★ {listing.ratingAverage.toFixed(1)} ({listing.ratingCount})
                    </span>
                  )}
                </div>
                <div className="mt-3"><TrustBadge vendor={listing.vendor} /></div>
              </div>
            </div>

            <div className="p-5 pt-0">
              <button
                onClick={(e) => planTripWithListing(e, listing)}
                className="w-full bg-teal-50 hover:bg-teal-100/70 text-teal-900 border border-teal-900/15 rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <span>⚡ Plan Trip with this Location</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-start gap-3">
        <p className="text-sm text-teal-950/60 font-medium">
          {results.length === 0
            ? "Know a great spot that's missing?"
            : "Not what you were looking for?"}
        </p>
        <SuggestPlaceForm initialQuery={filters.query} onSubmitted={runSearch} />
      </div>
    </div>
  );
}
