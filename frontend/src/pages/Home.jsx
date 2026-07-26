import Hero from "../components/Hero.jsx";

export default function Home() {
  return (
    <div>
      <Hero />

      <section className="bg-teal-950 text-sand-50">
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
    </div>
  );
}
