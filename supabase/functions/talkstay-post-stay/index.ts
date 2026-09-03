import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, escapeHtml, emailFrom, isWhiteLabel, sendViaResend } from "../_shared/email.ts";
import { formatRoomLabel } from "../_shared/roomLabel.ts";

/**
 * Post-stay direct rebooking — emailed when a private room becomes vacant.
 * Triggered by ts_rooms_post_stay_notify (staff check-out or auto-checkout).
 * No-ops when the hotel has not set branding.booking_url.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isHttpUrl = (s: string) => /^https?:\/\//i.test(s);

function normalizeBookingUrl(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const roomId = String(body.roomId ?? "").trim();
    if (!roomId) return json({ error: "roomId required" }, 400);

    const { data: room } = await admin
      .from("ts_rooms")
      .select("id, hotel_id, room_number, occupancy_status, is_public, checked_in_at, checked_out_at")
      .eq("id", roomId)
      .maybeSingle();
    if (!room) return json({ error: "room not found" }, 404);
    if (room.is_public) return json({ ok: true, skipped: "public_qr" });
    if (room.occupancy_status !== "vacant") return json({ ok: true, skipped: "still_occupied" });

    // Narrow blast radius for anon/pg_net callers: only recent check-outs.
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
    const isService = !!(serviceKey && jwt === serviceKey);
    if (!isService) {
      const outAt = room.checked_out_at ? new Date(room.checked_out_at).getTime() : 0;
      if (!outAt || Date.now() - outAt > 15 * 60_000) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const { data: hotel } = await admin
      .from("ts_hotels")
      .select("id, name, slug, branding")
      .eq("id", room.hotel_id)
      .maybeSingle();
    if (!hotel) return json({ error: "hotel not found" }, 404);

    const branding = (hotel.branding ?? {}) as {
      logo_url?: string | null;
      primary_color?: string | null;
      booking_url?: string | null;
      return_offer?: string | null;
      white_label?: boolean | null;
      from_email?: string | null;
      property?: { type?: string | null } | null;
    };

    // Restaurants / cafés don't run a hotel rebooking journey.
    if (branding.property?.type === "restaurant") {
      return json({ ok: true, skipped: "restaurant" });
    }

    const bookingUrl = normalizeBookingUrl(branding.booking_url);
    if (!bookingUrl || !isHttpUrl(bookingUrl)) {
      return json({ ok: true, skipped: "no_booking_url" });
    }

    const returnOffer = String(branding.return_offer ?? "").trim().slice(0, 280) || null;
    const stayStart = room.checked_in_at || null;

    let sessQ = admin
      .from("ts_guest_sessions")
      .select("id, session_id, contact_email, notify_channel, guest_first_name, post_stay_email_sent_at, started_at")
      .eq("hotel_id", hotel.id)
      .eq("room_id", room.id)
      .not("contact_email", "is", null);
    if (stayStart) sessQ = sessQ.gte("started_at", stayStart);

    const { data: sessions } = await sessQ;
    const byEmail = new Map<string, { id: string; firstName: string | null }>();
    for (const s of sessions ?? []) {
      if (s.post_stay_email_sent_at) continue;
      if (s.notify_channel === "none") continue;
      const email = String(s.contact_email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) continue;
      if (!byEmail.has(email)) {
        byEmail.set(email, {
          id: s.id,
          firstName: s.guest_first_name ? String(s.guest_first_name) : null,
        });
      }
    }

    if (!byEmail.size) return json({ ok: true, emailed: 0 });

    const roomLabel = formatRoomLabel(room.room_number);
    const hotelName = hotel.name ?? "Your hotel";
    const results: { email: string; ok: boolean; error?: string }[] = [];

    for (const [email, meta] of byEmail) {
      const hello = meta.firstName
        ? `Hi ${escapeHtml(meta.firstName)},`
        : "Hi,";
      const offerBlock = returnOffer
        ? `<p style="margin:16px 0;padding:12px 14px;background:#f9fafb;border-radius:10px;font-size:14px;line-height:1.45;">
            <strong>Return guest offer:</strong> ${escapeHtml(returnOffer)}
          </p>`
        : "";

      const html = renderEmail({
        hotelName,
        logoUrl: branding.logo_url,
        accentColor: branding.primary_color,
        whiteLabel: isWhiteLabel(branding),
        heading: "We'd love to welcome you back",
        bodyHtml: `
          <p style="margin:0 0 12px;">${hello}</p>
          <p style="margin:0 0 12px;">
            Thank you for staying with us${roomLabel ? ` in ${escapeHtml(roomLabel)}` : ""}.
            We hope everything went smoothly — it was a pleasure hosting you.
          </p>
          <p style="margin:0 0 12px;">
            Book your next stay <strong>directly with us</strong> for the best rate and a smoother arrival.
          </p>
          ${offerBlock}
        `,
        cta: { label: "Book your next stay", url: bookingUrl },
        footerNote: "You're receiving this because you shared your email during your stay.",
      });

      const resp = await sendViaResend({
        from: emailFrom(hotelName, isWhiteLabel(branding), branding),
        to: email,
        subject: `${hotelName}: book your next stay with us`,
        html,
      });

      if (resp.ok) {
        const now = new Date().toISOString();
        // Mark every session row for this email+room so we don't re-send.
        await admin
          .from("ts_guest_sessions")
          .update({ post_stay_email_sent_at: now })
          .eq("hotel_id", hotel.id)
          .eq("room_id", room.id)
          .ilike("contact_email", email);
        results.push({ email, ok: true });
      } else {
        results.push({ email, ok: false, error: resp.error?.slice(0, 200) });
      }
    }

    return json({
      ok: true,
      emailed: results.filter((r) => r.ok).length,
      results,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
