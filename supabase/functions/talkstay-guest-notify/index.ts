import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";
import { renderEmail, quoteBlock, escapeHtml } from "../_shared/email.ts";

// Tells the GUEST their request moved on (accepted / on the way / completed).
// Email and "notify this device" (web push) are independent opt-ins — a guest
// can have either, both, or neither; each is sent on its own and one failing
// never blocks the other.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LINE: Record<string, string> = {
  accepted: "is being prepared",
  on_the_way: "is on the way",
  completed: "is complete",
  cancelled: "has been cancelled",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { requestId, status } = await req.json();
    if (!requestId || !status) return json({ error: "requestId and status required" }, 400);
    if (!LINE[status]) return json({ ok: true, skipped: "status not guest-facing" });

    const { data: r } = await admin
      .from("ts_service_requests")
      .select("id, hotel_id, room_id, summary, session_id")
      .eq("id", requestId).maybeSingle();
    if (!r?.session_id) return json({ ok: true, skipped: "no guest session" });

    const [{ data: sess }, { data: hotel }, { data: room }, { data: pushSubs }] = await Promise.all([
      admin.from("ts_guest_sessions")
        .select("notify_channel, contact_email")
        .eq("hotel_id", r.hotel_id).eq("session_id", r.session_id).maybeSingle(),
      admin.from("ts_hotels").select("name, slug, branding").eq("id", r.hotel_id).maybeSingle(),
      r.room_id ? admin.from("ts_rooms").select("room_number").eq("id", r.room_id).maybeSingle()
                : Promise.resolve({ data: null }),
      admin.from("ts_guest_push_subscriptions").select("id, endpoint, p256dh, auth")
        .eq("hotel_id", r.hotel_id).eq("session_id", r.session_id),
    ]);

    const hotelName = hotel?.name ?? "Your hotel";
    const roomNo = room?.room_number ?? "";
    const heading = `Your request ${LINE[status]}`;

    // A direct link back into the guest's own room chat, for the push notification.
    let guestUrl = "https://talkstay.talkweb.io";
    if (hotel?.slug && r.room_id) {
      const { data: tok } = await admin.from("ts_room_tokens").select("token")
        .eq("room_id", r.room_id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (tok?.token) guestUrl = `https://talkstay.talkweb.io/h/${hotel.slug}/r/${r.room_id}?token=${tok.token}`;
    }

    const results: { emailed?: string; pushed?: number } = {};

    // ---- Email ----
    const email = sess?.contact_email;
    if (email && sess?.notify_channel !== "none") {
      const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
      if (key) {
        const html = renderEmail({
          hotelName,
          logoUrl: hotel?.branding?.logo_url,
          accentColor: hotel?.branding?.primary_color,
          heading,
          bodyHtml: `
            <p style="margin:0 0 10px;">${roomNo ? `Room ${escapeHtml(roomNo)} — ` : ""}here's the latest on what you asked for:</p>
            ${quoteBlock(r.summary)}
            ${status === "completed"
              ? `<p style="margin:14px 0 0;">If everything arrived, you can rate it from the assistant in your room.</p>`
              : status === "cancelled"
              ? `<p style="margin:14px 0 0;">If you still need help, scan the QR in your room and ask again.</p>`
              : ""}`,
          footerNote: "You asked for updates about this stay. Scan the QR code in your room to see your requests.",
        });
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "TalkStay <notifications@talkweb.io>", to: email, subject: `${hotelName}: your request ${LINE[status]}`, html }),
        });
        if (resp.ok) results.emailed = email;
      }
    }

    // ---- "Notify this device" (web push) ----
    if (pushSubs?.length) {
      const vapidPub = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
      const vapidPriv = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
      if (vapidPub && vapidPriv) {
        webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@talkweb.io", vapidPub, vapidPriv);
        let pushed = 0;
        for (const s of pushSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: `${hotelName}: ${heading}`, body: r.summary, url: guestUrl, tag: r.id })
            );
            pushed++;
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await admin.from("ts_guest_push_subscriptions").delete().eq("id", s.id);
            }
          }
        }
        results.pushed = pushed;
      }
    }

    return json({ ok: true, ...results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
