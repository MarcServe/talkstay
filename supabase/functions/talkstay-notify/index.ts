import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";
import { renderEmail, quoteBlock, escapeHtml } from "../_shared/email.ts";
import { authorizeRequestSideEffect } from "../_shared/talkstayAuth.ts";
import { formatRoomLabel } from "../_shared/roomLabel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DEPT_LABEL: Record<string, string> = {
  housekeeping: "Housekeeping", laundry: "Laundry", kitchen: "Kitchen", bar: "Bar",
  maintenance: "Maintenance", concierge: "Concierge", front_desk: "Front Desk", duty_manager: "Duty Manager",
};

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
  if (!key || !to) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "TalkStay <notifications@talkweb.io>", to, subject, html }),
    });
    return r.ok;
  } catch { return false; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { requestId, event, note: extraNote } = await req.json();
    if (!requestId) return json({ error: "requestId required" }, 400);
    const sideNote = typeof extraNote === "string" ? extraNote.trim().slice(0, 280) : "";
    // Close-loop + chase events. "new"/missing event = brand-new request alert.
    const EVENT_BANNER: Record<string, string> = {
      reopened: "The guest said this wasn't done yet. Please pick it back up.",
      escalated: "The guest is following up on this — please check on it now.",
      completed: "This request was marked complete.",
      cancelled: "This request was cancelled.",
      guest_confirmed: "The guest confirmed everything was received.",
      guest_cancelled: "The guest cancelled this request.",
      guest_updated: "The guest updated what they asked for — please re-check the order.",
      guest_reminded: "The guest reminded you they are still waiting.",
      payment_requested: "The guest wants to pay now — please collect payment in the room.",
      staff_note: "Team note — please read and action if needed.",
      forwarded: "This request was forwarded to your team.",
      assigned: "Someone has been marked as handling this request.",
    };
    const EVENT_LABEL: Record<string, string> = {
      reopened: "Reopened",
      escalated: "Follow-up",
      completed: "Completed",
      cancelled: "Cancelled",
      guest_confirmed: "Guest confirmed",
      guest_cancelled: "Guest cancelled",
      guest_updated: "Guest updated order",
      guest_reminded: "Guest reminded you",
      payment_requested: "Guest wants to pay now",
      staff_note: "Team note",
      forwarded: "Forwarded to you",
      assigned: "Handler set",
    };
    const banner = event ? (EVENT_BANNER[event] ?? null) : null;
    const isCloseEvent = ["completed", "cancelled", "guest_confirmed", "guest_cancelled"].includes(event);
    const urgentGuest = ["guest_updated", "guest_reminded", "payment_requested", "escalated", "reopened"].includes(event);

    const { data: r } = await admin
      .from("ts_service_requests")
      .select("id, hotel_id, room_id, department_key, summary, summary_staff, priority, is_complaint")
      .eq("id", requestId).maybeSingle();
    if (!r) return json({ error: "request not found" }, 404);

    const authz = await authorizeRequestSideEffect(req, admin, {
      hotelId: r.hotel_id,
      requestId: r.id,
      // Cron auto-escalate still posts with the anon key after writing a system event.
      allowCronEscalate: !event || event === "escalated",
    });
    if (!authz.ok) return json({ error: authz.error }, authz.status);

    // Staff read in the hotel's language when available (B4).
    const staffSummary = r.summary_staff || r.summary;

    const [{ data: hotel }, { data: room }, { data: dept }] = await Promise.all([
      admin.from("ts_hotels").select("name, user_id, branding").eq("id", r.hotel_id).maybeSingle(),
      r.room_id ? admin.from("ts_rooms").select("room_number").eq("id", r.room_id).maybeSingle() : Promise.resolve({ data: null }),
      admin.from("ts_departments").select("notify_email").eq("hotel_id", r.hotel_id).eq("key", r.department_key).maybeSingle(),
    ]);

    // Owner email (fallback recipient + complaint copy).
    let ownerEmail: string | null = null;
    if (hotel?.user_id) {
      const { data: u } = await admin.auth.admin.getUserById(hotel.user_id);
      ownerEmail = u?.user?.email ?? null;
    }

    const deptEmail = dept?.notify_email || null;
    const roomLabel = formatRoomLabel(room?.room_number, { fallback: "—" });
    const label = DEPT_LABEL[r.department_key] ?? r.department_key;
    // Reopen/escalation = guest unhappy → urgent. Close events stay informational.
    const urgent = (!isCloseEvent && !!banner) || urgentGuest || r.priority === "urgent" || r.is_complaint;

    const subject = banner
      ? `${urgent ? "🔴 " : ""}${EVENT_LABEL[event] ?? "Update"} · ${label} — ${roomLabel}`
      : `${urgent ? "🔴 URGENT · " : ""}New ${label} request — ${roomLabel}`;
    const html = renderEmail({
      hotelName: hotel?.name ?? "TalkStay",
      logoUrl: hotel?.branding?.logo_url,
      accentColor: hotel?.branding?.primary_color,
      heading: banner ? `${EVENT_LABEL[event]} — ${label}` : `${urgent ? "Urgent " : ""}${label} request`,
      bodyHtml: `
        ${banner ? `<p style="margin:0 0 12px;color:${isCloseEvent ? "#4c1d95" : "#b91c1c"};font-weight:600;">${escapeHtml(banner)}</p>` : ""}
        <p style="margin:0 0 10px;"><strong>${escapeHtml(roomLabel)}</strong></p>
        ${quoteBlock(staffSummary)}
        ${sideNote ? `<p style="margin:14px 0 0;"><strong>${event === "staff_note" ? "Note" : event === "forwarded" ? "Handoff" : "Reason"}:</strong> ${escapeHtml(sideNote)}</p>` : ""}
        ${r.is_complaint && !isCloseEvent ? `<p style="margin:14px 0 0;color:#b91c1c;font-weight:600;">This is a complaint — please handle promptly.</p>` : ""}`,
      cta: { label: "Open Operations dashboard", url: "https://talkstay.talkweb.io/app" },
    });

    const recipients = new Set<string>();
    if (deptEmail) recipients.add(deptEmail);

    // Staff assigned to this department also get the alert.
    const { data: assigned } = await admin
      .from("ts_staff").select("user_id")
      .eq("hotel_id", r.hotel_id).eq("department_key", r.department_key).eq("status", "active");
    const staffEmails = await Promise.all(
      (assigned ?? []).map(async (s) => {
        try {
          const { data: su } = await admin.auth.admin.getUserById(s.user_id);
          return su?.user?.email ?? null;
        } catch { return null; }
      }),
    );
    for (const email of staffEmails) if (email) recipients.add(email);

    // Fallback to owner if nobody else; always copy owner on complaints/urgent.
    if (recipients.size === 0 && ownerEmail) recipients.add(ownerEmail);
    if (urgent && ownerEmail) recipients.add(ownerEmail);

    const results: Record<string, boolean> = {};
    await Promise.all([...recipients].map(async (to) => {
      results[to] = await sendEmail(to, subject, html);
    }));

    // Web push to subscribed staff devices (department-scoped, or hotel-wide when
    // the subscription has no department). Best-effort; prunes dead subscriptions.
    let pushed = 0;
    const vapidPub = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
    const vapidPriv = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
    if (vapidPub && vapidPriv) {
      try {
        webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@talkweb.io", vapidPub, vapidPriv);
        const { data: subs } = await admin
          .from("ts_push_subscriptions").select("id, endpoint, p256dh, auth, department_key")
          .eq("hotel_id", r.hotel_id);
        const targets = (subs ?? []).filter((s) => !s.department_key || s.department_key === r.department_key);
        const pushResults = await Promise.all(targets.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: subject, body: `${roomLabel}: ${staffSummary}`, url: "https://talkstay.talkweb.io/app", urgent, tag: r.id })
            );
            return 1;
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await admin.from("ts_push_subscriptions").delete().eq("id", s.id);
            }
            return 0;
          }
        }));
        pushed = pushResults.reduce((a: number, b: number) => a + b, 0);
      } catch { /* push best-effort */ }
    }

    return json({ ok: true, emailed: Object.keys(results), results, pushed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
