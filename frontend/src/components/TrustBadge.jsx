const BADGE_LABELS = {
  business_registration: "Registered Business",
  sltda_license: "SLTDA Licensed",
  guide_certification: "Certified Guide",
  tax_registration: "Tax Registered",
};

export default function TrustBadge({ vendor }) {
  if (!vendor) return null;
  const verified = vendor.verificationStatus === "verified";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
          verified ? "bg-teal-800 text-sand-50" : "bg-teal-950/10 text-teal-900/70"
        }`}
      >
        {verified ? "✓ Verified vendor" : "Unverified vendor"}
      </span>
      {(vendor.verificationBadges || []).map((b) => (
        <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-saffron-100 text-saffron-600 font-medium">
          {BADGE_LABELS[b] || b}
        </span>
      ))}
    </div>
  );
}
