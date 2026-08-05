import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, Star, Sparkles, ImageOff } from "lucide-react";
import { api, imageUrl } from "../../api/client.js";
import TrustBadge from "../../components/TrustBadge.jsx";
import SuggestPlaceForm from "../../components/SuggestPlaceForm.jsx";
import { Button, Card, EmptyState, Spinner, ErrorBanner } from "../../components/ui.jsx";

const CATEGORIES = ["", "hotel", "guide", "transport", "restaurant", "activity", "attraction"];

export default function Discover() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    query: searchParams.get("query") || "",
    category: searchParams.get("category") || "",
    city: searchParams.get("city") || "",
  });
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
      <h1 className="font-display text-3xl font-semibold mb-1">Discover locations &amp; activities</h1>
      <p className="text-teal-950/60 mb-8">Search verified hotels, guides, activities, and attractions across Sri Lanka.</p>

      <Card as="form" onSubmit={runSearch} className="grid sm:grid-cols-4 gap-3 mb-10 p-4 bg-teal-50 border-teal-900/8 shadow-none">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-900/40" />
          <input
            placeholder="Search (e.g. surfing, tuk-tuk, Sigiriya)"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="w-full rounded-xl border border-teal-900/15 pl-10 pr-4 py-2.5 focus:outline-none focus:border-teal-700 bg-white text-sm"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="rounded-xl border border-teal-900/15 px-4 py-2.5 capitalize bg-white text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative">
          <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-900/40" />
          <input
            placeholder="City (e.g. Ella)"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="w-full rounded-xl border border-teal-900/15 pl-10 pr-4 py-2.5 bg-white text-sm"
          />
        </div>
        <Button className="sm:col-span-4" variant="dark" size="lg">Search locations</Button>
      </Card>

      {loading && <Spinner label="Searching locations…" className="mb-6" />}
      <ErrorBanner>{error}</ErrorBanner>
      {!loading && results.length === 0 && (
        <EmptyState
          icon={Search}
          title="Nothing matched yet"
          body="Try broadening your search, or tell us what's missing below."
        />
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((listing) => (
          <Card
            key={listing._id}
            onClick={() => navigate(`/listing/${listing._id}`)}
            className="overflow-hidden hover:shadow-lift hover:-translate-y-0.5 transition flex flex-col justify-between cursor-pointer group"
          >
            <div>
              {listing.images?.[0] ? (
                <img src={imageUrl(listing.images[0])} alt={listing.title} className="h-44 w-full object-cover group-hover:scale-105 transition duration-500" />
              ) : (
                <div className="h-44 w-full bg-teal-50 flex flex-col items-center justify-center text-teal-900/30 gap-1.5">
                  <ImageOff className="w-5 h-5" />
                  <span className="text-xs">No photo yet</span>
                </div>
              )}
              <div className="p-5">
                <span className="text-xs uppercase tracking-widest text-saffron-600 font-semibold">{listing.category}</span>
                <h3 className="font-display text-xl mt-1 mb-1 font-semibold text-teal-950">{listing.title}</h3>
                <p className="text-xs text-teal-950/60 mb-3 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {listing.location?.city || "Sri Lanka"}{listing.location?.region ? `, ${listing.location.region}` : ""}
                </p>
                <p className="text-sm text-teal-950/70 mb-4 line-clamp-2 leading-relaxed">{listing.description}</p>

                <div className="flex items-center justify-between border-t border-teal-900/5 pt-3">
                  <span className="font-semibold text-teal-900 ledger">
                    {listing.currency} {listing.basePrice} <span className="text-xs font-normal text-teal-950/50 font-body">/{listing.priceUnit?.replace("per_", "")}</span>
                  </span>
                  {listing.ratingCount > 0 && (
                    <span className="text-xs font-medium text-teal-950/70 bg-saffron-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-saffron-600 text-saffron-600" /> {listing.ratingAverage.toFixed(1)} ({listing.ratingCount})
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
                <Sparkles className="w-3.5 h-3.5" /> Plan a trip around this
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-start gap-3">
        <p className="text-sm text-teal-950/60 font-medium">
          {results.length === 0 ? "Know a great spot that's missing?" : "Not what you were looking for?"}
        </p>
        <SuggestPlaceForm initialQuery={filters.query} onSubmitted={runSearch} />
      </div>
    </div>
  );
}
