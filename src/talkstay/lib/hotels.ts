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
}

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
}

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  floor: string | null;
  room_type: string | null;
  is_active: boolean;
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

/** The hotel owned by the current user (MVP: one hotel per owner). */
export async function getMyHotel(): Promise<Hotel | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("ts_hotels")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Hotel) ?? null;
}

/**
 * Create a hotel + its linked assistant (for voice/KB reuse) + seed the 8
 * departments. All under the owner's session (RLS: user_id = auth.uid()).
 */
export async function createHotel(input: {
  name: string;
  default_language?: string;
  timezone?: string;
}): Promise<Hotel> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // 1. Linked assistant — reuses TalkWeb's voice + knowledge-base pipeline.
  const { data: assistant, error: aErr } = await supabase
    .from("assistants")
    .insert({
      user_id: user.id,
      business_name: input.name,
      // Hotels typically have no scrapable website; KB is entered manually. The
      // column is NOT NULL, so store a stable placeholder.
      website_url: "https://talkstay.talkweb.io",
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
