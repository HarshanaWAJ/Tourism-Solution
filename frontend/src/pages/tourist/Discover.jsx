import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import TrustBadge from "../../components/TrustBadge.jsx";

const CATEGORIES = ["", "hotel", "guide", "transport", "restaurant", "activity", "attraction"];

export default function Discover() {
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold mb-1">Discover</h1>
      <p className="text-teal-950/60 mb-8">Hotels, guides, transport, restaurants, and activities — all verified before they're listed.</p>

      <form onSubmit={runSearch} className="grid sm:grid-cols-4 gap-3 mb-10 bg-teal-50 p-4 rounded-2xl">
        <input
          placeholder="Search (e.g. surfing, tuk-tuk, Sigiriya)"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          className="sm:col-span-2 rounded-xl border border-teal-900/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5 capitalize"
        >
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          placeholder="City (e.g. Ella)"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5"
        />
        <button className="sm:col-span-4 bg-teal-900 text-sand-50 rounded-xl py-2.5 font-medium hover:bg-teal-800 transition">
          Search
        </button>
      </form>

      {loading && <p className="text-teal-950/50">Searching…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && results.length === 0 && <p className="text-teal-950/50">No listings matched — try broadening your search.</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((listing) => (
          <Link
            to={`/listing/${listing._id}`}
            key={listing._id}
            className="rounded-2xl border border-teal-900/10 p-5 hover:shadow-lg transition bg-white"
          >
            <span className="text-xs uppercase tracking-widest text-saffron-600 font-semibold">{listing.category}</span>
            <h3 className="font-display text-xl mt-1 mb-2">{listing.title}</h3>
            <p className="text-sm text-teal-950/60 mb-3">{listing.location?.city}, {listing.location?.region}</p>
            <p className="text-sm text-teal-950/70 mb-4 line-clamp-2">{listing.description}</p>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-teal-900">
                {listing.currency} {listing.basePrice} <span className="text-xs font-normal text-teal-950/50">/{listing.priceUnit?.replace("per_", "")}</span>
              </span>
              {listing.ratingCount > 0 && (
                <span className="text-sm text-teal-950/60">★ {listing.ratingAverage.toFixed(1)} ({listing.ratingCount})</span>
              )}
            </div>
            <div className="mt-3"><TrustBadge vendor={listing.vendor} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
