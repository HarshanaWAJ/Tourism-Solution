import { useState } from "react";

const PROVIDERS = [
  { id: "google", label: "Google", mark: "G" },
  { id: "apple", label: "Apple", mark: "" },
  { id: "facebook", label: "Facebook", mark: "f" },
];

/**
 * Social sign-in entry points. The backend doesn't have OAuth wired up yet, so these
 * are honest about their state rather than pretending to authenticate — clicking one
 * surfaces a short note instead of silently failing.
 */
export default function SocialLoginRow() {
  const [notice, setNotice] = useState("");

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setNotice(`${p.label} sign-in is coming soon — use email for now.`)}
            className="flex items-center justify-center gap-2 rounded-xl border border-teal-900/15 py-2.5 text-sm font-medium text-teal-900/80 hover:bg-teal-50 transition"
            aria-label={`Continue with ${p.label}`}
          >
            <span className="font-display text-base leading-none">{p.mark}</span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>
      {notice && <p className="text-xs text-saffron-700 mt-2">{notice}</p>}
      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-teal-900/10 flex-1" />
        <span className="text-xs uppercase tracking-widest text-teal-950/40">or use email</span>
        <div className="h-px bg-teal-900/10 flex-1" />
      </div>
    </div>
  );
}
