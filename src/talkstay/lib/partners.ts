import { MAILTO_SUPPORT, SUPPORT_EMAIL } from "@/config/contact";

/** Known marketing partners — code → support routing (v1, in-code map). */
export const PARTNER_SUPPORT: Record<string, { name: string; email: string }> = {
  talkweb: { name: "TalkWeb", email: SUPPORT_EMAIL },
  // Example partners for sales / pilot tracking — unknown codes still store on the hotel.
  hospitalityhq: { name: "Hospitality HQ", email: "partners+hospitalityhq@talkweb.io" },
  stayops: { name: "StayOps", email: "partners+stayops@talkweb.io" },
};

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return code || null;
}

export function partnerForReferral(code: string | null | undefined) {
  const key = normalizeReferralCode(code);
  if (!key) return null;
  return PARTNER_SUPPORT[key] ?? null;
}

/** mailto for property Support — partner when matched, else TalkStay. */
export function supportMailtoForHotel(referralCode?: string | null): string {
  const partner = partnerForReferral(referralCode);
  if (partner?.email) {
    return `mailto:${partner.email}?subject=${encodeURIComponent("TalkStay support")}`;
  }
  return MAILTO_SUPPORT;
}

/** Direct Support mailto with property context for authenticated Account. */
export function directSupportMailto(args: {
  referralCode?: string | null;
  hotelName: string;
  email?: string | null;
  roleLabel?: string;
  contactEmail?: string | null;
}): string {
  const partner = partnerForReferral(args.referralCode);
  const to = partner?.email ?? SUPPORT_EMAIL;
  const subject = encodeURIComponent(`TalkStay support · ${args.hotelName}`);
  const body = encodeURIComponent(
    [
      `Property: ${args.hotelName}`,
      args.email ? `Signed in as: ${args.email}` : null,
      args.contactEmail ? `Property contact: ${args.contactEmail}` : null,
      args.roleLabel ? `Role: ${args.roleLabel}` : null,
      args.referralCode ? `Referral: ${args.referralCode}` : null,
      "",
      "How can we help?",
      "",
    ]
      .filter((line) => line != null)
      .join("\n"),
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function supportLabelForHotel(referralCode?: string | null): string {
  const partner = partnerForReferral(referralCode);
  return partner ? `Support (${partner.name})` : "Support";
}
