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

export interface HotelBranding {
  logo_url?: string | null;
  primary_color?: string | null;
  tagline?: string | null;
  poster?: PosterConfig | null;
}

/** In-room printable QR poster. Every text field is editable; sensible defaults
 *  replicate the standard TalkStay poster layout. Stored inside branding jsonb. */
export interface PosterConfig {
  bg_color?: string;            // solid background colour
  bg_image_url?: string | null; // optional background photo (over the colour)
  bg_overlay?: number;          // 0..1 dark overlay for text legibility over a photo
  text_color?: string;          // primary text colour
  eyebrow?: string;             // small line under the logo
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
  bg_overlay: 0.55,
  text_color: "#ffffff",
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

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "hotel";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export interface HotelAccess {
  hotel: Hotel | null;
  isOwner: boolean;
  role: "owner" | "manager" | "staff" | null;
  /** null = all departments; otherwise this member only works one team. */
  departmentKey: string | null;
  name: string | null;
}

/**
 * Resolve the current user's hotel AND what they may see.
 * Owners get their own hotel; DEPARTMENT STAFF resolve theirs via ts_staff
 * membership (previously they saw the "create your hotel" screen and were
 * locked out entirely).
 */
export async function getMyAccess(): Promise<HotelAccess> {
  const none: HotelAccess = { hotel: null, isOwner: false, role: null, departmentKey: null, name: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return none;

  // 1. Owner?
  const { data: owned } = await supabase
    .from("ts_hotels").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (owned) return { hotel: owned as Hotel, isOwner: true, role: "owner", departmentKey: null, name: null };

  // 2. Staff member? (managers see everything; staff are scoped to their team)
  const { data: memberships } = await supabase
    .from("ts_staff")
    .select("hotel_id, role, department_key, name, status")
    .eq("user_id", user.id).eq("status", "active");
  const rows = (memberships ?? []) as any[];
  if (rows.length === 0) return none;

  const manager = rows.find((r) => r.role === "manager" || r.role === "owner");
  const chosen = manager ?? rows[0];
  const { data: hotel } = await supabase
    .from("ts_hotels").select("*").eq("id", chosen.hotel_id).maybeSingle();
  if (!hotel) return none;

  // A member listed under several departments works across them → treat as all.
  const depts = rows.filter((r) => r.hotel_id === chosen.hotel_id).map((r) => r.department_key);
  const departmentKey = manager || depts.length !== 1 ? null : depts[0];

  return {
    hotel: hotel as Hotel,
    isOwner: false,
    role: (chosen.role as any) ?? "staff",
    departmentKey,
    name: chosen.name ?? null,
  };
}

/** Back-compat helper: just the hotel (owner or staff). */
export async function getMyHotel(): Promise<Hotel | null> {
  return (await getMyAccess()).hotel;
}

function normalizeUrl(raw?: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { return new URL(withProto).toString().replace(/\/$/, ""); } catch { return null; }
}

/**
 * Create a hotel + its linked assistant (for voice/KB reuse) + seed the 8
 * departments. All under the owner's session (RLS: user_id = auth.uid()).
 */
export async function createHotel(input: {
  name: string;
  website_url?: string;
  default_language?: string;
  timezone?: string;
}): Promise<Hotel> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const websiteUrl = normalizeUrl(input.website_url);

  // 1. Linked assistant — reuses TalkWeb's voice + knowledge-base pipeline.
  const { data: assistant, error: aErr } = await supabase
    .from("assistants")
    .insert({
      user_id: user.id,
      business_name: input.name,
      // Real hotel website when given (enables TalkWeb's scraping/content infra);
      // the column is NOT NULL so fall back to a stable placeholder.
      website_url: websiteUrl ?? "https://talkstay.talkweb.io",
      language: input.default_language ?? "English",
      voice_type: "female",
      tone: "warm, professional",
      description: `Guest-service assistant for ${input.name} (TalkStay).`,
    })
    .select("id")
    .single();
  if (aErr) throw aErr;

  // 2. Hotel row.
  const { data: hotel, error: hErr } = await supabase
    .from("ts_hotels")
    .insert({
      user_id: user.id,
      assistant_id: assistant.id,
      name: input.name,
      slug: slugify(input.name),
      default_language: input.default_language ?? "English",
      timezone: input.timezone ?? "Europe/London",
    })
    .select("*")
    .single();
  if (hErr) throw hErr;

  // 3. Seed departments.
  await supabase.from("ts_departments").insert(
    DEPARTMENTS.map((d) => ({
      hotel_id: hotel.id,
      key: d.key,
      display_name: d.display_name,
    }))
  );

  return hotel as Hotel;
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
}): Promise<Room> {
  const { data, error } = await supabase
    .from("ts_rooms")
    .insert({
      hotel_id: hotelId,
      room_number: room.room_number,
      floor: room.floor || null,
      room_type: room.room_type || null,
    })
    .select("*")
    .single();
  if (error) throw error;

  // Mint the QR token (DB default generates the value).
  await supabase.from("ts_room_tokens").insert({ hotel_id: hotelId, room_id: data.id });

  return data as Room;
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
