import { MAILTO_SUPPORT, SUPPORT_EMAIL } from "@/config/contact";
import { supabase } from "@/integrations/supabase/client";

export type PartnerInfo = { name: string; email: string };

/** Platform settings shape for admin-managed partner codes. */
export type PartnersSettings = {
  codes: Record<string, PartnerInfo>;
};

export function emptyPartnersSettings(): PartnersSettings {
  return { codes: {} };
}

/** Normalize admin JSON → codes map (accepts `{ codes }` or a flat code map). */
export function partnersCodesFromSettings(raw: unknown): Record<string, PartnerInfo> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const nested = obj.codes;
  const source =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : obj;
  const out: Record<string, PartnerInfo> = {};
  for (const [rawCode, info] of Object.entries(source)) {
    if (rawCode === "codes") continue;
    const code = normalizeReferralCode(rawCode);
    if (!code || !info || typeof info !== "object") continue;
    const name = String((info as PartnerInfo).name ?? "").trim();
    const email = String((info as PartnerInfo).email ?? "").trim();
    if (!name || !email) continue;
    out[code] = { name, email };
  }
  return out;
}

let partnersLoadPromise: Promise<void> | null = null;

/** Force next ensurePartnersLoaded() to refetch (after admin save). */
export function invalidatePartnersCache() {
  partnersLoadPromise = null;
}

/** Load admin-created partners (public read of `partners` settings key). */
export function ensurePartnersLoaded(): Promise<void> {
  if (partnersLoadPromise) return partnersLoadPromise;
  partnersLoadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("ts_platform_settings")
        .select("value")
        .eq("key", "partners")
        .maybeSingle();
      if (error || !data?.value) return;
      setDynamicPartners(partnersCodesFromSettings(data.value));
    } catch {
      /* ignore — built-ins still work */
    }
  })();
  return partnersLoadPromise;
}

/** Built-in marketing partners — code → support routing. */
export const PARTNER_SUPPORT: Record<string, PartnerInfo> = {
  talkweb: { name: "TalkWeb", email: SUPPORT_EMAIL },
  hospitalityhq: { name: "Hospitality HQ", email: "partners+hospitalityhq@talkweb.io" },
  stayops: { name: "StayOps", email: "partners+stayops@talkweb.io" },
};

/** Admin-created partners from ts_platform_settings (merged at runtime). */
let dynamicPartners: Record<string, PartnerInfo> = {};

export function setDynamicPartners(map: Record<string, PartnerInfo> | null | undefined) {
  dynamicPartners = {};
  if (!map || typeof map !== "object") return;
  for (const [raw, info] of Object.entries(map)) {
    const code = normalizeReferralCode(raw);
    if (!code || !info || typeof info !== "object") continue;
    const name = String((info as PartnerInfo).name ?? "").trim();
    const email = String((info as PartnerInfo).email ?? "").trim();
    if (!name || !email) continue;
    dynamicPartners[code] = { name, email };
  }
}

export function allPartners(): Record<string, PartnerInfo> {
  return { ...PARTNER_SUPPORT, ...dynamicPartners };
}

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return code || null;
}

export function partnerForReferral(code: string | null | undefined): PartnerInfo | null {
  const key = normalizeReferralCode(code);
  if (!key) return null;
  return dynamicPartners[key] ?? PARTNER_SUPPORT[key] ?? null;
}

const REF_STORAGE_KEY = "talkstay_partner_ref";

/** Persist ?ref= so it survives auth redirects to /app. */
export function captureReferralFromSearch(search: string | URLSearchParams | null | undefined): string | null {
  let raw: string | null = null;
  if (typeof search === "string") {
    raw = new URLSearchParams(search.startsWith("?") ? search : `?${search}`).get("ref");
  } else if (search && typeof (search as URLSearchParams).get === "function") {
    raw = (search as URLSearchParams).get("ref");
  }
  const code = normalizeReferralCode(raw);
  if (code && typeof window !== "undefined") {
    try { localStorage.setItem(REF_STORAGE_KEY, code); } catch { /* ignore */ }
  }
  return code;
}

export function readStoredReferral(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeReferralCode(localStorage.getItem(REF_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(REF_STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Resolve referral for hotel signup:
 * URL ?ref= → stored partner ref → optional inherit from another owned hotel.
 */
export function resolveSignupReferral(opts?: {
  searchParams?: URLSearchParams | null;
  inheritFrom?: string | null;
}): { code: string | null; partner: PartnerInfo | null; source: "url" | "stored" | "inherit" | null } {
  const fromUrl = opts?.searchParams
    ? normalizeReferralCode(opts.searchParams.get("ref"))
    : null;
  if (fromUrl) {
    captureReferralFromSearch(opts?.searchParams ?? null);
    return { code: fromUrl, partner: partnerForReferral(fromUrl), source: "url" };
  }
  const stored = readStoredReferral();
  if (stored) {
    return { code: stored, partner: partnerForReferral(stored), source: "stored" };
  }
  const inherit = normalizeReferralCode(opts?.inheritFrom);
  if (inherit) {
    return { code: inherit, partner: partnerForReferral(inherit), source: "inherit" };
  }
  return { code: null, partner: null, source: null };
}

/** Public signup link for a partner code. */
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
