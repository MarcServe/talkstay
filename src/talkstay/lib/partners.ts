import { MAILTO_SUPPORT, SUPPORT_EMAIL } from "@/config/contact";

/** Default partner share of a property's suggested usage charge. */
export const DEFAULT_PARTNER_COMMISSION_PCT = 20;

export type PartnerInfo = {
  name: string;
  email: string;
  /** Override of platform default; omit to use default_commission_pct. */
  commission_pct?: number | null;
};

/** Built-in marketing partners — code → support routing + commission. */
export const PARTNER_SUPPORT: Record<string, PartnerInfo> = {
  talkweb: { name: "TalkWeb", email: SUPPORT_EMAIL },
  hospitalityhq: { name: "Hospitality HQ", email: "partners+hospitalityhq@talkweb.io" },
  stayops: { name: "StayOps", email: "partners+stayops@talkweb.io" },
};

/** Admin-created partners from ts_platform_settings key `partners`. */
let dynamicPartners: Record<string, PartnerInfo> = {};
let defaultCommissionPct = DEFAULT_PARTNER_COMMISSION_PCT;

export type PartnersSettings = {
  default_commission_pct: number;
  codes: Record<string, PartnerInfo>;
};

export function emptyPartnersSettings(): PartnersSettings {
  return { default_commission_pct: DEFAULT_PARTNER_COMMISSION_PCT, codes: {} };
}

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return code || null;
}

export function clampCommissionPct(raw: unknown, fallback = DEFAULT_PARTNER_COMMISSION_PCT): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

/** Normalize admin JSON → settings (accepts `{ codes, default_commission_pct }` or flat code map). */
export function partnersSettingsFromRaw(raw: unknown): PartnersSettings {
  const out = emptyPartnersSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  if (obj.default_commission_pct != null) {
    out.default_commission_pct = clampCommissionPct(obj.default_commission_pct);
  }
  const nested = obj.codes;
  const source =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : obj;
  for (const [rawCode, info] of Object.entries(source)) {
    if (rawCode === "codes" || rawCode === "default_commission_pct") continue;
    const code = normalizeReferralCode(rawCode);
    if (!code || !info || typeof info !== "object") continue;
    const name = String((info as PartnerInfo).name ?? "").trim();
    const email = String((info as PartnerInfo).email ?? "").trim();
    if (!name || !email) continue;
    const pctRaw = (info as PartnerInfo).commission_pct;
    out.codes[code] = {
      name,
      email,
      commission_pct: pctRaw == null || pctRaw === ("" as unknown)
        ? null
        : clampCommissionPct(pctRaw, out.default_commission_pct),
    };
  }
  return out;
}

export function setDynamicPartners(
  map: Record<string, PartnerInfo> | null | undefined,
  defaultPct?: number,
) {
  dynamicPartners = {};
  if (defaultPct != null) defaultCommissionPct = clampCommissionPct(defaultPct);
  if (!map || typeof map !== "object") return;
  for (const [raw, info] of Object.entries(map)) {
    const code = normalizeReferralCode(raw);
    if (!code || !info || typeof info !== "object") continue;
    const name = String(info.name ?? "").trim();
    const email = String(info.email ?? "").trim();
    if (!name || !email) continue;
    dynamicPartners[code] = {
      name,
      email,
      commission_pct: info.commission_pct == null
        ? null
        : clampCommissionPct(info.commission_pct, defaultCommissionPct),
    };
  }
}

export function applyPartnersSettings(raw: unknown): PartnersSettings {
  const settings = partnersSettingsFromRaw(raw);
  setDynamicPartners(settings.codes, settings.default_commission_pct);
  return settings;
}

export function allPartners(): Record<string, PartnerInfo> {
  return { ...PARTNER_SUPPORT, ...dynamicPartners };
}

export function partnerForReferral(code: string | null | undefined): PartnerInfo | null {
  const key = normalizeReferralCode(code);
  if (!key) return null;
  return dynamicPartners[key] ?? PARTNER_SUPPORT[key] ?? null;
}

/** Effective commission % for a referral code (0 if not a known partner). */
export function partnerCommissionPct(
  code: string | null | undefined,
  settings?: PartnersSettings | null,
): number {
  if (settings) applyPartnersSettings(settings);
  const partner = partnerForReferral(code);
  if (!partner) return 0;
  if (partner.commission_pct != null && Number.isFinite(partner.commission_pct)) {
    return clampCommissionPct(partner.commission_pct, defaultCommissionPct);
  }
  return settings?.default_commission_pct ?? defaultCommissionPct;
}

export function partnerCommissionAmount(
  suggestedCharge: number,
  referralCode: string | null | undefined,
  settings?: PartnersSettings | null,
): { pct: number; amount: number; partner: PartnerInfo | null } {
  const partner = partnerForReferral(referralCode);
  const pct = partnerCommissionPct(referralCode, settings);
  const amount = partner
    ? Math.round(Math.max(0, Number(suggestedCharge) || 0) * (pct / 100) * 100) / 100
    : 0;
  return { pct, amount, partner };
}

export function partnerSignupPath(code: string): string {
  const c = normalizeReferralCode(code);
  return c ? `/app?ref=${encodeURIComponent(c)}` : "/app";
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
