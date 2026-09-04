import { supabase } from "@/integrations/supabase/client";

export const DEPARTMENTS: { key: string; display_name: string }[] = [
  { key: "housekeeping", display_name: "Housekeeping" },
  { key: "laundry", display_name: "Laundry" },
  { key: "kitchen", display_name: "Kitchen" },
  { key: "bar", display_name: "Bar" },
  { key: "maintenance", display_name: "Maintenance" },
  { key: "concierge", display_name: "Concierge" },
  { key: "front_desk", display_name: "Front Desk" },
  { key: "duty_manager", display_name: "Duty Manager" },
];

/** Departments seeded for restaurant / café / bar properties (menus + table QRs). */
export const RESTAURANT_DEPARTMENTS: { key: string; display_name: string }[] = [
  { key: "restaurant", display_name: "Restaurant" },
  { key: "kitchen", display_name: "Kitchen" },
  { key: "bar", display_name: "Bar" },
  { key: "front_desk", display_name: "Host / front of house" },
  { key: "duty_manager", display_name: "Duty Manager" },
];

/** What kind of stay this property is — shapes Insights BI advice + onboarding. */
export type PropertyType =
  | "hotel"
  | "serviced_apartment"
  | "airbnb"
  | "bnb"
  | "hostel"
  | "restaurant"
  | "other";

export const PROPERTY_TYPES: { key: PropertyType; label: string }[] = [
  { key: "hotel", label: "Hotel" },
  { key: "serviced_apartment", label: "Serviced apartment / aparthotel" },
  { key: "airbnb", label: "Airbnb / short-let" },
  { key: "bnb", label: "B&B / guest house" },
  { key: "hostel", label: "Hostel" },
  { key: "restaurant", label: "Restaurant / café / bar" },
  { key: "other", label: "Other" },
];

export function isRestaurantProperty(type?: PropertyType | null): boolean {
  return type === "restaurant";
}

export function seedDepartmentsForProperty(type?: PropertyType | null) {
  return isRestaurantProperty(type) ? RESTAURANT_DEPARTMENTS : DEPARTMENTS;
}

/** Operator context so Insights can advise for a 10-room Airbnb vs a 200-room hotel. */
export interface PropertyProfile {
  type?: PropertyType | null;
  /** Full street address (used for local / market-aware advice). */
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postcode?: string | null;
  /** Units/rooms at THIS property (optional override; else we count QR rooms). */
  room_count?: number | null;
  /** How many properties this operator runs in total (portfolio size). */
  property_count?: number | null;
  notes?: string | null;
}

export interface HotelBranding {
  logo_url?: string | null;
  primary_color?: string | null;
  tagline?: string | null;
  /** Paid branding tier: hide TalkStay marks on posters and emails, and send
   *  from the property's name. Platform-admin controlled, not self-serve. */
  white_label?: boolean | null;
  poster?: PosterConfig | null;
  property?: PropertyProfile | null;
  /**
   * Guest UI light wash over the background photo (0 = photo sharp, 1 = fully veiled).
   * Default ~0.88 keeps text readable; lower to show more of the property image.
   */
  guest_bg_wash?: number | null;
  /**
   * Direct booking / booking-engine URL for post-stay “book your next stay with us”.
   * Shown on stay-ended screens and in the post-checkout retention email.
   */
  booking_url?: string | null;
  /** Optional return-guest offer line, e.g. “10% off your next direct stay — code RETURN”. */
  return_offer?: string | null;
}

/** Clamp guest background wash; higher = more transparent photo (heavier veil). */
export function clampGuestBgWash(raw?: number | null): number {
  if (raw == null || !Number.isFinite(raw)) return 0.88;
  return Math.min(0.96, Math.max(0.2, raw));
}

/** In-room printable QR poster. Every text field is editable; sensible defaults
 *  replicate the standard TalkStay poster layout. Stored inside branding jsonb. */
export interface PosterConfig {
  bg_color?: string;            // solid background colour
  bg_image_url?: string | null; // optional background photo (over the colour)
  bg_overlay?: number;          // 0..1 dark overlay for text legibility over a photo
  text_color?: string;          // primary text colour
  business_name?: string;       // bold property name on the poster; leave blank to hide
  eyebrow?: string;             // small line under the name (optional; blank to hide)
  headline?: string;            // the big prompt
  subheadline?: string;         // supporting line
  features?: string[];          // four "what you can do" labels (icons are fixed slots)
  qr_caption?: string;          // line beside the phone icon; {hotel} → hotel name
  badges?: string[];            // three trust badges (icons are fixed slots)
  footer_left?: string;         // footer band, left line
  footer_right?: string;        // footer band, right line
}

export const POSTER_DEFAULTS: Required<Omit<PosterConfig, "bg_image_url">> & { bg_image_url: string | null } = {
  bg_color: "#2e1065",
  bg_image_url: null,
  // Stronger wash by default so busy hotel photos don’t fight dark or light text.
  bg_overlay: 0.68,
  text_color: "#ffffff",
  // "" = fall back to the hotel's own name at render/merge time, not a fixed
  // static string (there's no sensible generic default for a business name).
  business_name: "",
  eyebrow: "Rest easy. We're here for you.",
  headline: "Need something?",
  subheadline: "Just speak. We're here to help.",
  features: ["Order Food & Drinks", "Request Housekeeping", "Report an Issue", "Get Hotel Information"],
  qr_caption: "Speak with our team instantly for {hotel}.",
  badges: ["Private & Secure", "Fast Response", "Available in Your Language"],
  footer_left: "We're here to make your stay more comfortable.",
  footer_right: "Thank you for staying with us.",
};

export interface Hotel {
  id: string;
  user_id: string;
  assistant_id: string | null;
  name: string;
  slug: string;
  timezone: string;
  default_language: string;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  is_active: boolean;
  branding?: HotelBranding | null;
  require_checkin_code?: boolean;
  max_devices_per_room?: number;
  /** Marketing partner / referral code from signup (?ref=). */
  referral_code?: string | null;
  /** Property contact / ops email — not the owner login. */
  contact_email?: string | null;
  /** Stripe Connect Express account (acct_…). */
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean;
  stripe_details_submitted?: boolean;
  stripe_connected_at?: string | null;
  created_at?: string;
}

/** Persist which property the dashboard is showing (per auth user). */
export function activeHotelStorageKey(userId: string) {
  return `talkstay:activeHotel:${userId}`;
}

export function readActiveHotelId(userId: string): string | null {
  try {
    return localStorage.getItem(activeHotelStorageKey(userId));
  } catch {
    return null;
  }
}

export function writeActiveHotelId(userId: string, hotelId: string) {
  try {
    localStorage.setItem(activeHotelStorageKey(userId), hotelId);
  } catch { /* ignore */ }
}

export function pickAccessibleProperty(
  hotels: AccessibleProperty[],
  preferredId?: string | null,
): AccessibleProperty | null {
  if (!hotels.length) return null;
  if (preferredId) {
    const hit = hotels.find((h) => h.hotel.id === preferredId);
    if (hit) return hit;
  }
  const owned = hotels.filter((h) => h.isOwner);
  return owned[0] ?? hotels[0];
}

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  floor: string | null;
  room_type: string | null;
  is_active: boolean;
  occupancy_status?: "occupied" | "vacant";
  last_guest_activity_at?: string | null;
  checkin_code?: string | null;
  /**
   * NULL = inherit hotel default; true = always require; false = never require.
   * Public QR areas should use is_public (which forces no code).
   */
  require_checkin_code?: boolean | null;
  /** Shared/public QR (lobby, bar, spa) — no code, reachable without check-in. */
  is_public?: boolean;
  /**
   * Department this Public QR venue belongs to (e.g. restaurant). Lets Main vs
   * Outdoor restaurant share one team while keeping separate menus / QRs.
   * Private rooms leave null.
   */
  department_key?: string | null;
}

/** Effective check-in code policy for a unit. */
export function roomRequiresCheckinCode(
  room: Pick<Room, "is_public" | "require_checkin_code">,
  hotelRequires: boolean,
): boolean {
  if (room.is_public) return false;
  if (room.require_checkin_code != null) return !!room.require_checkin_code;
  return hotelRequires;
}

/** For display only: turn an uploaded image's storage URL into something
 *  readable instead of the full Supabase URL. Our own uploads store the
 *  original filename after a "{timestamp}-" (or "poster-{timestamp}-")
 *  prefix in the path, so this recovers it; anything else falls back
 *  gracefully rather than showing a raw link. */
export function friendlyImageName(url: string): string {
  if (!url.trim()) return "";
  try {
    const last = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "");
    const stripped = last.replace(/^(poster-)?\d+-/, "");
    return stripped || "Uploaded image";
  } catch {
    return "Custom image URL";
  }
}

/** Short, human-readable stay code (no ambiguous chars). Read out / printed at
 *  check-in when a hotel requires a code. */
export function genCheckinCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  let s = "";
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 6; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
}

/**
 * Check a room in/out. The printed QR NEVER changes — access is gated on
 * occupancy, so checking out instantly kills any saved link/bookmark and
 * checking in revives the same QR for the next guest.
 */
export async function setRoomOccupancy(roomId: string, status: "occupied" | "vacant") {
  const patch = status === "occupied"
    // A fresh stay id + code on every check-in invalidates the previous guest's
    // device bindings, so their saved link can't be reused once the room is re-let.
    ? { occupancy_status: status, checked_in_at: new Date().toISOString(), checked_out_at: null, last_guest_activity_at: null, current_stay_id: crypto.randomUUID(), checkin_code: genCheckinCode() }
    : { occupancy_status: status, checked_out_at: new Date().toISOString() };
  const { error } = await supabase.from("ts_rooms").update(patch).eq("id", roomId);
  if (error) throw error;
  // Drop previous-stay device rows so the same phone can enrol in the new stay.
  if (status === "occupied") {
    await supabase.from("ts_stay_devices").delete().eq("room_id", roomId);
  }
}

/** Toggle the optional check-in-code requirement. When switching it ON, backfill a
 *  code for any already-occupied room that doesn't have one, so current guests
 *  aren't locked out. */
export async function setRequireCheckinCode(hotelId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("ts_hotels").update({ require_checkin_code: enabled }).eq("id", hotelId);
  if (error) throw error;
  if (enabled) {
    const { data: rooms } = await supabase
      .from("ts_rooms").select("id, checkin_code, occupancy_status")
      .eq("hotel_id", hotelId).eq("occupancy_status", "occupied");
    const missing = (rooms ?? []).filter((r: any) => !r.checkin_code);
    for (const r of missing) {
      await supabase.from("ts_rooms").update({ checkin_code: genCheckinCode() }).eq("id", (r as any).id);
    }
  }
}

/** Regenerate a single room's check-in code (e.g. staff wants a fresh one). */
export async function regenerateCheckinCode(roomId: string): Promise<string> {
  const code = genCheckinCode();
  const { error } = await supabase.from("ts_rooms").update({ checkin_code: code }).eq("id", roomId);
  if (error) throw error;
  return code;
}

/**
 * Mark a unit as a public/shared QR area (lobby, restaurant, spa) or a private room.
 * Public: no check-in code, reachable even when vacant.
 */
export async function setRoomPublicQr(roomId: string, isPublic: boolean): Promise<void> {
  const patch = isPublic
    ? { is_public: true, require_checkin_code: false }
    : { is_public: false, require_checkin_code: null };
  const { error } = await supabase.from("ts_rooms").update(patch).eq("id", roomId);
  if (error) throw error;
}

/**
 * Per-room override for check-in codes (ignored when is_public).
 * Pass null to inherit the hotel default again.
 */
export async function setRoomRequireCheckinCode(
  roomId: string,
  require: boolean | null,
): Promise<void> {
  const patch: Record<string, unknown> = { require_checkin_code: require };
  if (require === true) {
    patch.is_public = false;
    // Ensure a code exists if the room is occupied.
    const { data: room } = await supabase
      .from("ts_rooms")
      .select("checkin_code, occupancy_status")
      .eq("id", roomId)
      .maybeSingle();
    if (room?.occupancy_status === "occupied" && !room.checkin_code) {
      patch.checkin_code = genCheckinCode();
    }
  }
  const { error } = await supabase.from("ts_rooms").update(patch).eq("id", roomId);
  if (error) throw error;
}

/** Email a room's current check-in code + a direct link to its assistant,
 *  with instructions — for busy guests who'd rather not wait to be told the
 *  code at check-in. Staff-triggered (front desk types the guest's email). */
export async function sendCheckinCodeEmail(roomId: string, email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("talkstay-send-checkin-code", {
    body: { roomId, email },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "hotel";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export interface AccessibleProperty {
  hotel: Hotel;
  isOwner: boolean;
  role: "owner" | "manager" | "staff";
  /** null = all departments; otherwise this member only works one team. */
  departmentKey: string | null;
  name: string | null;
}

export interface HotelAccess {
  /** Active property (first owned / preferred). Prefer picking from `hotels` in the UI. */
  hotel: Hotel | null;
  /** Every property this user owns or staffs — for switcher + portfolio insights. */
  hotels: AccessibleProperty[];
  isOwner: boolean;
  role: "owner" | "manager" | "staff" | null;
  /** null = all departments; otherwise this member only works one team. */
  departmentKey: string | null;
  name: string | null;
}

/** Duty Manager: hotel-wide live queues for the shift — not property setup / Insights. */
export const DUTY_MANAGER_DEPT = "duty_manager";
/** Front Desk coordinates across teams on the live queue, but is not full property admin. */
export const FRONT_DESK_DEPT = "front_desk";

/** Departments that see every team's queue without getting property-admin tabs. */
export const QUEUE_COORDINATOR_DEPTS = new Set([FRONT_DESK_DEPT, DUTY_MANAGER_DEPT]);

type AccessMember = Pick<AccessibleProperty, "isOwner" | "role" | "departmentKey">;

/** Owner or property manager (Manager + All departments). Duty Manager is not included. */
export function isPropertyAdmin(m: AccessMember | null | undefined): boolean {
  if (!m) return false;
  if (m.isOwner || m.role === "owner") return true;
  // Manager scoped to Duty Manager is still a floor coordinator, not property admin.
  if (m.role === "manager" && !m.departmentKey) return true;
  return false;
}

/** Manager assigned to one operational department (e.g. Housekeeping manager). */
export function isDepartmentManager(m: AccessMember | null | undefined): boolean {
  if (!m) return false;
  if (m.role !== "manager" || !m.departmentKey) return false;
  if (QUEUE_COORDINATOR_DEPTS.has(m.departmentKey)) return false;
  return true;
}

/** Front Desk / Duty Manager — all queues, Operations + Log order only. */
export function isQueueCoordinator(m: AccessMember | null | undefined): boolean {
  if (!m?.departmentKey) return false;
  if (isPropertyAdmin(m)) return false;
  return QUEUE_COORDINATOR_DEPTS.has(m.departmentKey);
}

/**
 * Which department queue is hard-locked in Operations.
 * null = can see every team (owner / property manager / duty manager / front desk).
 */
export function resolveLockedDepartment(m: AccessMember | null | undefined): string | null {
  if (!m || isPropertyAdmin(m)) return null;
  if (isQueueCoordinator(m)) return null;
  return m.departmentKey;
}

/** Admin nav keys department managers may open (in addition to Operations / Log order). */
export const DEPT_MANAGER_ADMIN_NAV = new Set(["insights", "staff"]);

export function canSeeNavItem(
  m: AccessMember | null | undefined,
  opts: { admin?: boolean; key: string },
): boolean {
  if (!opts.admin) return true;
  if (isPropertyAdmin(m)) return true;
  if (isDepartmentManager(m) && DEPT_MANAGER_ADMIN_NAV.has(opts.key)) return true;
  return false;
}

export function membershipRoleLabel(m: AccessMember | null | undefined): string {
  if (!m) return "Staff";
  if (m.isOwner || m.role === "owner") return "Owner";
  if (m.role === "manager" && !m.departmentKey) return "Property manager";
  if (m.departmentKey === DUTY_MANAGER_DEPT) return "Duty Manager";
  if (m.role === "manager" && m.departmentKey) {
    const dept = DEPARTMENTS.find((d) => d.key === m.departmentKey)?.display_name
      ?? m.departmentKey.replace(/_/g, " ");
    return `${dept} manager`;
  }
  if (m.departmentKey === FRONT_DESK_DEPT) return "Front Desk";
  if (m.departmentKey) {
    const dept = DEPARTMENTS.find((d) => d.key === m.departmentKey)?.display_name
      ?? m.departmentKey.replace(/_/g, " ");
    return `${dept} team`;
  }
  return "Staff";
}

/**
 * Resolve the current user's hotels AND what they may see.
 * Owners + property managers (Manager + All departments) get full property access.
 * Department managers run one team; Duty Manager / Front Desk see all queues only.
 */
export async function getMyAccess(): Promise<HotelAccess> {
  const none: HotelAccess = {
    hotel: null, hotels: [], isOwner: false, role: null, departmentKey: null, name: null,
  };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return none;

  const byId = new Map<string, AccessibleProperty>();

  // 1. Owned properties (ts_hotels.user_id — Google vs email can be different auth rows).
  const { data: owned, error: ownedErr } = await supabase
    .from("ts_hotels").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (ownedErr) throw ownedErr;
  for (const row of (owned ?? []) as Hotel[]) {
    byId.set(row.id, {
      hotel: row,
      isOwner: true,
      role: "owner",
      departmentKey: null,
      name: null,
    });
  }

  // 2. Staff memberships (managers see everything; staff scoped to their team).
  const { data: memberships, error: staffErr } = await supabase
    .from("ts_staff")
    .select("hotel_id, role, department_key, name, status")
    .eq("user_id", user.id).eq("status", "active");
  if (staffErr) throw staffErr;
  const rows = (memberships ?? []) as Array<{
    hotel_id: string; role: string; department_key: string | null; name: string | null; status: string;
  }>;

  const staffHotelIds = [...new Set(rows.map((r) => r.hotel_id).filter((id) => !byId.has(id)))];
  if (staffHotelIds.length) {
    const { data: staffHotels, error: hotelErr } = await supabase
      .from("ts_hotels").select("*").in("id", staffHotelIds);
    if (hotelErr) throw hotelErr;
    const hotelMap = new Map((staffHotels ?? []).map((h) => [h.id, h as Hotel]));

    for (const hotelId of staffHotelIds) {
      const hotel = hotelMap.get(hotelId);
      const forHotel = rows.filter((r) => r.hotel_id === hotelId);
      // Prefer property manager, then department manager, then duty/front desk, then first row.
      const propertyManager = forHotel.find(
        (r) => (r.role === "manager" || r.role === "owner") && !r.department_key,
      );
      const deptManager = forHotel.find(
        (r) => (r.role === "manager" || r.role === "owner")
          && r.department_key
          && !QUEUE_COORDINATOR_DEPTS.has(r.department_key),
      );
      const duty = forHotel.find((r) => r.department_key === DUTY_MANAGER_DEPT);
      const frontDesk = forHotel.find((r) => r.department_key === FRONT_DESK_DEPT);
      const chosen = propertyManager ?? deptManager ?? duty ?? frontDesk ?? forHotel[0];
      if (!hotel || !chosen) {
        // Membership exists but the property row is missing — skip for switcher.
        continue;
      }
      const role = (chosen.role as AccessibleProperty["role"]) ?? "staff";
      // Preserve department for department managers / coordinators / staff.
      let departmentKey: string | null = chosen.department_key ?? null;
      if (!(role === "manager" || role === "owner") && forHotel.length !== 1) {
        const depts = forHotel.map((r) => r.department_key);
        departmentKey = depts.length === 1 ? depts[0] : chosen.department_key;
      }
      byId.set(hotelId, {
        hotel,
        isOwner: false,
        role,
        departmentKey,
        name: chosen.name ?? null,
      });
    }
  }

  const hotels = [...byId.values()].sort((a, b) => {
    // Owners first (creation order preserved via created_at), then staff A–Z.
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    if (a.isOwner && b.isOwner) {
      return String(a.hotel.created_at ?? "").localeCompare(String(b.hotel.created_at ?? ""));
    }
    return a.hotel.name.localeCompare(b.hotel.name, undefined, { sensitivity: "base" });
  });

  if (hotels.length === 0) {
    // Invited staff whose hotel row vanished — preserve role so UI shows NoAccess.
    if (rows.length) {
      const chosen = rows.find((r) => r.role === "manager" || r.role === "owner") ?? rows[0];
      return {
        hotel: null,
        hotels: [],
        isOwner: false,
        role: (chosen.role as HotelAccess["role"]) ?? "staff",
        departmentKey: chosen.department_key,
        name: chosen.name ?? null,
      };
    }
    return none;
  }

  const primary = hotels.find((h) => h.isOwner) ?? hotels[0];

  return {
    hotel: primary.hotel,
    hotels,
    isOwner: primary.isOwner,
    role: primary.role,
    departmentKey: primary.departmentKey,
    name: primary.name,
  };
}

/** Back-compat helper: just the hotel (owner or staff). */
export async function getMyHotel(): Promise<Hotel | null> {
  return (await getMyAccess()).hotel;
}

export function normalizeUrl(raw?: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { return new URL(withProto).toString().replace(/\/$/, ""); } catch { return null; }
}

/** assistants.website_url is NOT NULL, so a hotel created without a real site
 *  (e.g. an apartment/host with none) gets this placeholder instead of null.
 *  Treat it as "no website set" everywhere in the UI — never scrape/reindex it. */
export const PLACEHOLDER_WEBSITE = "https://talkstay.talkweb.io";
export function isPlaceholderWebsite(url?: string | null): boolean {
  return !url || url.replace(/\/$/, "") === PLACEHOLDER_WEBSITE;
}

/** Set (or change) the hotel's real website on its linked assistant. Does NOT
 *  scrape/index it — call ingestHotelWebsite() separately for that. */
export async function setHotelWebsite(assistantId: string, url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  if (!normalized) throw new Error("Enter a valid website address");
  const { error } = await supabase.from("assistants").update({ website_url: normalized }).eq("id", assistantId);
  if (error) throw error;
  return normalized;
}

export function propertyTypeLabel(t?: PropertyType | null): string {
  return PROPERTY_TYPES.find((p) => p.key === t)?.label ?? "Property";
}

/** Merge property profile into branding jsonb (preserves logo/poster/etc.). */
export async function updatePropertyProfile(
  hotelId: string,
  current: HotelBranding | null | undefined,
  profile: PropertyProfile,
): Promise<HotelBranding> {
  const branding: HotelBranding = {
    ...(current ?? {}),
    property: {
      ...(current?.property ?? {}),
      ...profile,
      type: profile.type || current?.property?.type || null,
      address: profile.address?.trim() || null,
      city: profile.city?.trim() || null,
      region: profile.region?.trim() || null,
      country: profile.country?.trim() || null,
      postcode: profile.postcode?.trim() || null,
      room_count: profile.room_count != null && profile.room_count > 0 ? Math.round(profile.room_count) : null,
      property_count: profile.property_count != null && profile.property_count > 0
        ? Math.round(profile.property_count) : null,
      notes: profile.notes?.trim() || null,
    },
  };
  const { error } = await supabase.from("ts_hotels").update({ branding }).eq("id", hotelId);
  if (error) throw error;
  return branding;
}

/**
 * Create a hotel + its linked assistant (for voice/KB reuse) + seed the 8
 * departments. All under the owner's session (RLS: user_id = auth.uid()).
 */
export async function createHotel(input: {
  name: string;
  website_url?: string;
  contact_email?: string | null;
  default_language?: string;
  timezone?: string;
  property?: PropertyProfile;
  referral_code?: string | null;
}): Promise<Hotel> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const websiteUrl = normalizeUrl(input.website_url);
  const contactEmail = normalizeContactEmail(input.contact_email);

  // 1. Linked assistant — reuses TalkWeb's voice + knowledge-base pipeline.
  const { data: assistant, error: aErr } = await supabase
    .from("assistants")
    .insert({
      user_id: user.id,
      business_name: input.name,
      // Real hotel website when given (enables TalkWeb's scraping/content infra);
      // the column is NOT NULL so fall back to a stable placeholder.
      website_url: websiteUrl ?? PLACEHOLDER_WEBSITE,
      language: input.default_language ?? "English",
      voice_type: "female",
      tone: "warm, professional",
      description: `Guest-service assistant for ${input.name} (TalkStay).`,
    })
    .select("id")
    .single();
  if (aErr) throw aErr;

  const branding: HotelBranding = input.property
    ? { property: input.property }
    : {};

  const referral =
    input.referral_code != null && String(input.referral_code).trim()
      ? String(input.referral_code).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || null
      : null;

  // 2. Hotel row.
  const baseRow: Record<string, unknown> = {
    user_id: user.id,
    assistant_id: assistant.id,
    name: input.name,
    slug: slugify(input.name),
    default_language: input.default_language ?? "English",
    timezone: input.timezone ?? "Europe/London",
    branding,
  };
  if (referral) baseRow.referral_code = referral;
  if (contactEmail) baseRow.contact_email = contactEmail;

  let { data: hotel, error: hErr } = await supabase
    .from("ts_hotels")
    .insert(baseRow)
    .select("*")
    .single();

  // Before optional columns land, retry without them.
  if (hErr?.message?.includes("referral_code") || hErr?.message?.includes("contact_email")) {
    const { referral_code: _r, contact_email: _c, ...withoutOptional } = baseRow;
    ({ data: hotel, error: hErr } = await supabase
      .from("ts_hotels")
      .insert(withoutOptional)
      .select("*")
      .single());
  }
  if (hErr) throw hErr;

  // 3. Seed departments — restaurant properties get F&B / host teams, not housekeeping.
  const depts = seedDepartmentsForProperty(input.property?.type ?? null);
  await supabase.from("ts_departments").insert(
    depts.map((d) => ({
      hotel_id: hotel.id,
      key: d.key,
      display_name: d.display_name,
    }))
  );

  return hotel as Hotel;
}

/** Normalize / validate optional property contact email (not login). */
export function normalizeContactEmail(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    throw new Error("Enter a valid property contact email, or leave it blank");
  }
  return v.slice(0, 254);
}

export async function updateHotelContactEmail(
  hotelId: string,
  contactEmail: string | null | undefined,
): Promise<string | null> {
  const normalized = normalizeContactEmail(contactEmail);
  const { error } = await supabase
    .from("ts_hotels")
    .update({ contact_email: normalized })
    .eq("id", hotelId);
  if (error) {
    if (/contact_email|does not exist|column/i.test(error.message)) {
      throw new Error("Property contact email isn’t available yet — apply the contact_email migration.");
    }
    throw error;
  }
  return normalized;
}

/**
 * Website → starter knowledge, using TalkWeb's exact ingest pipeline
 * (same sequence as TalkWeb's KnowledgeManager):
 *  1. scrape-website { url }                    → quick single-page content
 *  2. knowledge-upsert { pages }                → embed + index it now
 *  3. knowledge-upsert { useScraper:'firecrawl' } → full site crawl in background
 *     (firecrawl-webhook indexes every page as it completes)
 */
export async function ingestHotelWebsite(
  assistantId: string,
  websiteUrl: string
): Promise<{ chunks: number; crawlStarted: boolean }> {
  let chunks = 0;

  const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
    "scrape-website", { body: { url: websiteUrl } }
  );
  if (!scrapeError && scrapeData?.data?.content) {
    const pages = [{
      url: websiteUrl,
      title: scrapeData.data.title || "Website Content",
      content: scrapeData.data.content,
    }];
    const { data: up } = await supabase.functions.invoke("knowledge-upsert", {
      body: { assistantId, websiteUrl, pages, replace: false },
    });
    chunks = up?.chunks ?? 0;
  }

  // Full-site crawl (async; indexed by firecrawl-webhook as pages complete).
  let crawlStarted = false;
  try {
    const { error } = await supabase.functions.invoke("knowledge-upsert", {
      body: { assistantId, websiteUrl, useScraper: "firecrawl", crawlLimit: 60, crawlDepth: 3 },
    });
    crawlStarted = !error;
  } catch { /* non-blocking */ }

  return { chunks, crawlStarted };
}

export async function listRooms(hotelId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from("ts_rooms")
    .select("*")
    .eq("hotel_id", hotelId)
    .order("room_number", { ascending: true });
  if (error) throw error;
  return (data as Room[]) ?? [];
}

/** Add a room and mint its QR token in one go. Returns the new room. */
export async function addRoom(hotelId: string, room: {
  room_number: string;
  floor?: string;
  room_type?: string;
  /** Shared venue / table QR (lobby, bar, pool, restaurant) — no check-in code. */
  is_public?: boolean;
  /** Department key for Public QR outlets (Main / Outdoor under Restaurant). */
  department_key?: string | null;
}): Promise<Room> {
  const isPublic = !!room.is_public;
  const dept = room.department_key?.trim() || null;
  const { data, error } = await supabase
    .from("ts_rooms")
    .insert({
      hotel_id: hotelId,
      room_number: room.room_number,
      floor: room.floor || null,
      room_type: room.room_type || null,
      ...(isPublic ? { is_public: true, require_checkin_code: false } : {}),
      ...(isPublic && dept ? { department_key: dept } : {}),
    })
    .select("*")
    .single();
  if (error) throw error;

  // Mint the QR token (DB default generates the value).
  await supabase.from("ts_room_tokens").insert({ hotel_id: hotelId, room_id: data.id });

  return data as Room;
}

/** Link (or clear) a Public QR venue to a department. */
export async function setVenueDepartment(roomId: string, departmentKey: string | null): Promise<void> {
  const { error } = await supabase
    .from("ts_rooms")
    .update({ department_key: departmentKey?.trim() || null })
    .eq("id", roomId);
  if (error) throw error;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const { error } = await supabase.from("ts_rooms").delete().eq("id", roomId);
  if (error) throw error;
}

/** The active QR token for a room (used to build the QR URL). */
export async function getRoomToken(roomId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ts_room_tokens")
    .select("token")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.token ?? null;
}

// ── Department item catalogue (menu / services) ──────────────────────────────
// Structured counterpart to the prose menus in Knowledge: what staff tap when
// logging a phone or walk-in order, so nobody retypes "2 club sandwiches" at
// the height of service or forgets the price.

export interface CatalogItem {
  id: string;
  department_key: string;
  name: string;
  price: number | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
  /** Venue/outlet this item belongs to; null = shared across the department. */
  outlet_room_id?: string | null;
}

const CATALOG_SELECT = "id, department_key, name, price, currency, is_active, sort_order, outlet_room_id";

/** Comparison key for menu items. A menu photographed twice, or a second page
 *  overlapping the first, yields the same dish typed slightly differently:
 *  "Club Sandwich.", "club  sandwich", "Crème brûlée" vs "Creme brulee". Match
 *  on the shape of the words, not the exact characters. Used for both
 *  within-scan dedupe and matching against what's already on the menu — the
 *  two must agree, or an item slips through one and is caught by the other. */
export function menuItemKey(name: string): string {
  return String(name ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")                       // punctuation → space
    .trim()
    .replace(/\s+/g, " ");
}

/** Items offered at `outletRoomId`: that outlet's own list plus the
 *  department-wide ones. Pass `outletOnly` to edit one outlet's list alone. */
export async function listCatalogItems(
  hotelId: string,
  departmentKey?: string,
  opts?: { outletRoomId?: string | null; outletOnly?: boolean },
): Promise<CatalogItem[]> {
  let q = supabase
    .from("ts_catalog_items")
    .select(CATALOG_SELECT)
    .eq("hotel_id", hotelId)
    .eq("is_active", true);
  if (departmentKey) q = q.eq("department_key", departmentKey);
  if (opts?.outletOnly) {
    q = opts.outletRoomId
      ? q.eq("outlet_room_id", opts.outletRoomId)
      : q.is("outlet_room_id", null);
  } else if (opts?.outletRoomId) {
    q = q.or(`outlet_room_id.is.null,outlet_room_id.eq.${opts.outletRoomId}`);
  }
  const { data, error } = await q.order("sort_order").order("name");
  // The picker is a convenience — a missing table (migration not applied yet)
  // must never stop someone logging an order by hand.
  if (error) {
    if (/outlet_room_id/i.test(error.message)) {
      let q2 = supabase
        .from("ts_catalog_items")
        .select("id, department_key, name, price, currency, is_active, sort_order")
        .eq("hotel_id", hotelId)
        .eq("is_active", true);
      if (departmentKey) q2 = q2.eq("department_key", departmentKey);
      const retry = await q2.order("sort_order").order("name");
      if (retry.error) return [];
      return (retry.data ?? []) as CatalogItem[];
    }
    return [];
  }
  return (data ?? []) as CatalogItem[];
}

export async function addCatalogItem(input: {
  hotelId: string;
  departmentKey: string;
  name: string;
  price: number | null;
  /** Optional Public QR venue this menu part belongs to. */
  outletRoomId?: string | null;
}): Promise<CatalogItem> {
  const row: Record<string, unknown> = {
    hotel_id: input.hotelId,
    department_key: input.departmentKey,
    name: input.name.trim().slice(0, 120),
    price: input.price,
  };
  if (input.outletRoomId) row.outlet_room_id = input.outletRoomId;

  const { data, error } = await supabase
    .from("ts_catalog_items")
    .insert(row)
    .select(CATALOG_SELECT)
    .single();
  if (error) {
    if (/outlet_room_id/i.test(error.message) && input.outletRoomId) {
      const fallback = await supabase
        .from("ts_catalog_items")
        .insert({
          hotel_id: input.hotelId,
          department_key: input.departmentKey,
          name: input.name.trim().slice(0, 120),
          price: input.price,
        })
        .select("id, department_key, name, price, currency, is_active, sort_order")
        .single();
      if (fallback.error) {
        if (/duplicate|unique/i.test(fallback.error.message)) {
          throw new Error("That item is already on this menu.");
        }
        throw new Error(fallback.error.message);
      }
      return fallback.data as CatalogItem;
    }
    if (/duplicate|unique/i.test(error.message)) throw new Error("That item is already on this menu.");
    throw new Error(error.message);
  }
  return data as CatalogItem;
}

export async function updateCatalogItem(id: string, patch: Partial<Pick<CatalogItem, "name" | "price" | "is_active" | "sort_order">>) {
  const { error } = await supabase.from("ts_catalog_items").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCatalogItem(id: string) {
  const { error } = await supabase.from("ts_catalog_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
