import { Loader2 } from "lucide-react";

/** Small uppercase label that precedes a heading — used sparingly, only where it names a real section. */
export function Eyebrow({ children, tone = "saffron" }) {
  const tones = {
    saffron: "text-saffron-600",
    teal: "text-teal-700",
    ruby: "text-ruby-600",
    sand: "text-sand-50/70",
  };
  return (
    <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${tones[tone]} mb-2`}>
      {children}
    </div>
  );
}

export function Button({ as: As = "button", variant = "primary", size = "md", className = "", children, ...props }) {
  const sizes = { sm: "px-4 py-2 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-6 py-3.5 text-base" };
  const variants = {
    primary: "bg-saffron-500 text-teal-950 hover:bg-saffron-400 shadow-card",
    dark: "bg-teal-900 text-sand-50 hover:bg-teal-800",
    outline: "border border-teal-900/20 text-teal-900 hover:bg-teal-900 hover:text-sand-50",
    ghost: "text-teal-900 hover:bg-teal-50",
    danger: "bg-ruby-600 text-sand-50 hover:bg-ruby-700",
    "outline-light": "border border-white/25 text-sand-50 hover:bg-white/10",
  };
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}

export function Spinner({ label = "Loading…", className = "" }) {
  return (
    <div className={`flex items-center gap-2 text-teal-900/60 text-sm ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin" />
      {label}
    </div>
  );
}

export function Card({ className = "", children, as: As = "div", ...props }) {
  return (
    <As className={`bg-white rounded-2xl border border-teal-950/8 shadow-card ${className}`} {...props}>
      {children}
    </As>
  );
}

/** Rotated dashed-ring stamp — the app's signature verification mark. */
export function Stamp({ children, tone = "teal", size = "md" }) {
  const tones = {
    teal: "border-teal-700 text-teal-800",
    saffron: "border-saffron-600 text-saffron-700",
    ruby: "border-ruby-600 text-ruby-700",
  };
  const sizes = { sm: "w-16 h-16 text-[9px]", md: "w-20 h-20 text-[10px]" };
  return (
    <span className={`stamp animate-stamp-in ${tones[tone]} ${sizes[size]} font-semibold uppercase tracking-wider text-center leading-tight p-1`}>
      {children}
    </span>
  );
}

export function Badge({ children, tone = "teal", className = "" }) {
  const tones = {
    teal: "bg-teal-800 text-sand-50",
    saffronSoft: "bg-saffron-100 text-saffron-700",
    tealSoft: "bg-teal-50 text-teal-800",
    rubySoft: "bg-ruby-100 text-ruby-700",
    ruby: "bg-ruby-600 text-sand-50",
    outline: "border border-teal-900/15 text-teal-900/70",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Input({ label, hint, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="text-sm font-medium text-teal-900 block mb-1.5">{label}</span>}
      <input
        className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white transition placeholder:text-teal-950/35 ${
          error ? "border-ruby-500" : "border-teal-900/15 focus:border-teal-700"
        } ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-teal-950/50 mt-1 block">{hint}</span>}
      {error && <span className="text-xs text-ruby-600 mt-1 block">{error}</span>}
    </label>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-teal-900/15 bg-white/60">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="font-display text-lg text-teal-950 mb-1">{title}</p>
      {body && <p className="text-sm text-teal-950/55 max-w-sm mx-auto mb-5">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-xl bg-ruby-100 text-ruby-700 text-sm px-4 py-3 border border-ruby-500/20">
      {children}
    </div>
  );
}
