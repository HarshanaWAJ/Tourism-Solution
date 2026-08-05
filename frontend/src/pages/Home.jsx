import { Link } from "react-router-dom";
import { Sparkles, ShieldAlert, MapPin, Wallet, Hotel, Compass, Utensils, Car, ArrowRight } from "lucide-react";
import Hero from "../components/Hero.jsx";
import { Card, Eyebrow, Stamp } from "../components/ui.jsx";

const CATEGORIES = [
  { label: "Stays", icon: Hotel, category: "hotel" },
  { label: "Guides", icon: Compass, category: "guide" },
  { label: "Transport", icon: Car, category: "transport" },
  { label: "Food", icon: Utensils, category: "restaurant" },
  { label: "Attractions", icon: MapPin, category: "attraction" },
];

const PILLARS = [
  { icon: Sparkles, title: "AI trip planner", body: "Tell it your dates, budget and interests — it drafts a day-by-day route across the island, weather-aware." },
  { icon: ShieldAlert, title: "Safety net", body: "Live scam and weather alerts, an SOS line with location sharing, and a support ticket for anything that felt wrong." },
  { icon: Wallet, title: "Transparent pricing", body: "Instant booking or a quote request for custom guide days — you always see the total before you pay." },
];

export default function Home() {
  return (
    <div>
      <Hero />

      {/* Category quick-jump — real navigation, not decoration */}
      <section className="max-w-6xl mx-auto px-6 -mt-10 relative z-10">
        <Card className="p-3 flex flex-wrap justify-center gap-2 shadow-lift">
          {CATEGORIES.map(({ label, icon: Icon, category }) => (
            <Link
              key={category}
              to={`/discover?category=${category}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-teal-900 hover:bg-teal-50 transition"
            >
              <Icon className="w-4 h-4 text-saffron-600" /> {label}
            </Link>
          ))}
        </Card>
      </section>

      <section className="bg-teal-950 text-sand-50 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-10">
          {[
            { title: "Plan", body: "Tell the AI planner your interests, dates, and budget — get a route across the island in minutes." },
            { title: "Book", body: "Reserve instantly or request a quote for custom guide days and multi-stop packages." },
            { title: "Travel", body: "Live alerts, an emergency line, and receipts for every booking, wherever you are." },
          ].map((s, i) => (
            <div key={s.title}>
              <div className="text-saffron-400 font-display text-3xl mb-3">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="font-display text-xl mb-2">{s.title}</h3>
              <p className="text-sand-50/70 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <Eyebrow>Built for the whole trip</Eyebrow>
        <h2 className="font-display text-3xl font-semibold mb-10 max-w-xl">Not just a listings page.</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-teal-950/65 leading-relaxed">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 flex flex-col sm:flex-row items-center justify-between gap-8 bg-teal-50 rounded-4xl p-10">
        <div className="flex items-center gap-5">
          <Stamp tone="teal" size="sm">Docs<br />Checked</Stamp>
          <div>
            <h3 className="font-display text-2xl font-semibold text-teal-950">Run a stay, guide service, or ride?</h3>
            <p className="text-teal-950/60 text-sm mt-1">List your business — get verified and start taking bookings.</p>
          </div>
        </div>
        <Link to="/register" className="inline-flex items-center gap-2 bg-teal-900 text-sand-50 rounded-full px-6 py-3 font-medium hover:bg-teal-800 transition shrink-0">
          List your business <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
