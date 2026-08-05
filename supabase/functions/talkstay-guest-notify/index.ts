import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, quoteBlock, escapeHtml } from "../_shared/email.ts";

// Tells the GUEST their request moved on (accepted / on the way / completed).
// Email first — lowest friction, no approvals, no per-message cost.
// (WhatsApp uses one shared TalkStay sender with the hotel named in the message;
//  per-hotel numbers are a later Pro-tier upgrade.)

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

    const [{ data: sess }, { data: hotel }, { data: room }] = await Promise.all([
      admin.from("ts_guest_sessions")
        .select("notify_channel, contact_email")
        .eq("hotel_id", r.hotel_id).eq("session_id", r.session_id).maybeSingle(),
      admin.from("ts_hotels").select("name, branding").eq("id", r.hotel_id).maybeSingle(),
      r.room_id ? admin.from("ts_rooms").select("room_number").eq("id", r.room_id).maybeSingle()
                : Promise.resolve({ data: null }),
    ]);

    const email = sess?.contact_email;
    if (!email || sess?.notify_channel === "none") return json({ ok: true, skipped: "no email opt-in" });

    const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
    if (!key) return json({ ok: false, reason: "resend_not_configured" });

    const hotelName = hotel?.name ?? "Your hotel";
    const roomNo = room?.room_number ?? "";
    // Privacy: keep the subject generic — details live behind the guest's own link.
    const subject = `${hotelName}: your request ${LINE[status]}`;
    const html = renderEmail({
      hotelName,
      logoUrl: hotel?.branding?.logo_url,
      accentColor: hotel?.branding?.primary_color,
      heading: `Your request ${LINE[status]}`,
      bodyHtml: `
        <p style="margin:0 0 10px;">${roomNo ? `Room ${escapeHtml(roomNo)} — ` : ""}here's the latest on what you asked for:</p>
        ${quoteBlock(r.summary)}
        ${status === "completed"
          ? `<p style="margin:14px 0 0;">If everything arrived, you can rate it from the assistant in your room.</p>`
          : ""}`,
      footerNote: "You asked for updates about this stay. Scan the QR code in your room to see your requests.",
    });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "TalkStay <notifications@talkweb.io>", to: email, subject, html }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ ok: false, status: resp.status, detail: detail.slice(0, 300) });
    }
    return json({ ok: true, emailed: email });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
