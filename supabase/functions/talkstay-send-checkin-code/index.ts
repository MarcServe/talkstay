import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, escapeHtml, emailFrom, isWhiteLabel, sendViaResend } from "../_shared/email.ts";
import { formatRoomLabel } from "../_shared/roomLabel.ts";

// Staff-triggered: front desk types a busy guest's email and this sends the
// room's current check-in code, a direct link to the room's assistant, and
// short instructions — so the guest doesn't have to wait to be told the code.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PUBLIC_BASE_URL = "https://talkstay.talkweb.io";
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Identify the caller from their JWT.
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const caller = userData.user;

    const { roomId, email } = await req.json();
    if (!roomId || !email || !isEmail(String(email))) return json({ error: "roomId and a valid email are required" }, 400);

    const { data: room } = await admin
      .from("ts_rooms")
      .select("id, hotel_id, room_number, occupancy_status, checkin_code")
      .eq("id", roomId).maybeSingle();
    if (!room) return json({ error: "room not found" }, 404);
    if (room.occupancy_status !== "occupied" || !room.checkin_code) {
      return json({ error: "This room has no active check-in code right now." }, 400);
    }

    // Authorize: hotel owner OR an active staff member of this hotel.
    const { data: hotel } = await admin.from("ts_hotels").select("id, user_id, name, slug, branding").eq("id", room.hotel_id).maybeSingle();
    if (!hotel) return json({ error: "not found" }, 404);
    const isOwner = hotel.user_id === caller.id;
    if (!isOwner) {
      const { data: me } = await admin.from("ts_staff")
        .select("status").eq("hotel_id", room.hotel_id).eq("user_id", caller.id).eq("status", "active").maybeSingle();
      if (!me) return json({ error: "Forbidden" }, 403);
    }

    const { data: tokenRow } = await admin
      .from("ts_room_tokens").select("token")
      .eq("room_id", room.id).eq("is_active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!tokenRow?.token) return json({ error: "No active QR link for this room" }, 400);

    const guestUrl = `${PUBLIC_BASE_URL}/h/${hotel.slug}/r/${room.id}?token=${tokenRow.token}`;

    const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
    if (!key) return json({ error: "resend_not_configured" }, 500);

    const roomLabel = formatRoomLabel(room.room_number);
    const html = renderEmail({
      hotelName: hotel.name ?? "Your hotel",
      logoUrl: hotel.branding?.logo_url,
      accentColor: hotel.branding?.primary_color,
      whiteLabel: isWhiteLabel(hotel.branding),
      heading: `Your check-in code — ${roomLabel}`,
      bodyHtml: `
        <p style="margin:0 0 14px;">Here's everything you need to reach us from your stay:</p>
        <div style="text-align:center;padding:16px;background:#f9fafb;border-radius:10px;margin:0 0 16px;">
          <div style="font-size:28px;font-weight:800;letter-spacing:0.15em;color:#111827;">${escapeHtml(room.checkin_code)}</div>
        </div>
        <p style="margin:0 0 6px;"><strong>How to connect:</strong></p>
        <ol style="margin:0;padding-left:20px;">
          <li style="margin-bottom:4px;">Tap the button below on your phone (or scan the QR code in your room).</li>
          <li>If you're asked for a code, enter the one above.</li>
        </ol>`,
      cta: { label: "Open your stay assistant", url: guestUrl },
      footerNote: "This code is unique to your stay — please don't share it with anyone outside your party.",
    });

    const resp = await sendViaResend({
      from: emailFrom(hotel.name ?? "", isWhiteLabel(hotel.branding), hotel.branding),
      to: String(email),
      subject: `${hotel.name ?? "Your hotel"}: your check-in code (${roomLabel})`,
      html,
    });
    if (!resp.ok) {
      return json({ error: `Email send failed: ${(resp.error ?? "").slice(0, 200)}` }, 502);
    }

    return json({ ok: true, emailed: email });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
