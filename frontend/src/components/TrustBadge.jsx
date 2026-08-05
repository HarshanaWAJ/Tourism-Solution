import { ShieldCheck } from "lucide-react";
import { Badge } from "./ui.jsx";

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
      <Badge tone={verified ? "teal" : "outline"}>
        {verified && <ShieldCheck className="w-3.5 h-3.5" />}
        {verified ? "Verified vendor" : "Unverified vendor"}
      </Badge>
      {(vendor.verificationBadges || []).map((b) => (
        <Badge key={b} tone="saffronSoft">{BADGE_LABELS[b] || b}</Badge>
      ))}
    </div>
  );
}
