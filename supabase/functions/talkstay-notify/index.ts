import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";
import { renderEmail, quoteBlock, escapeHtml } from "../_shared/email.ts";

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
    const { requestId, event } = await req.json();
    if (!requestId) return json({ error: "requestId required" }, 400);
    // event === "reopened" → the guest said the completed work wasn't done.
    const reopened = event === "reopened";

    const { data: r } = await admin
      .from("ts_service_requests")
      .select("id, hotel_id, room_id, department_key, summary, summary_staff, priority, is_complaint")
      .eq("id", requestId).maybeSingle();
    if (!r) return json({ error: "request not found" }, 404);
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
    const roomNo = room?.room_number ?? "—";
    const label = DEPT_LABEL[r.department_key] ?? r.department_key;
    // A reopen means the guest wasn't satisfied — treat it as urgent so it copies
    // the owner and pushes with priority, same as a complaint.
    const urgent = reopened || r.priority === "urgent" || r.is_complaint;

    const subject = reopened
      ? `🔴 Reopened by guest · ${label} — Room ${roomNo}`
      : `${urgent ? "🔴 URGENT · " : ""}New ${label} request — Room ${roomNo}`;
    const html = renderEmail({
      hotelName: hotel?.name ?? "TalkStay",
      logoUrl: hotel?.branding?.logo_url,
      accentColor: hotel?.branding?.primary_color,
      heading: reopened ? `Reopened — ${label}` : `${urgent ? "Urgent " : ""}${label} request`,
      bodyHtml: `
        ${reopened ? `<p style="margin:0 0 12px;color:#b91c1c;font-weight:600;">The guest said this wasn't done yet. Please pick it back up.</p>` : ""}
        <p style="margin:0 0 10px;"><strong>Room:</strong> ${escapeHtml(roomNo)}</p>
        ${quoteBlock(staffSummary)}
        ${r.is_complaint ? `<p style="margin:14px 0 0;color:#b91c1c;font-weight:600;">This is a complaint — please handle promptly.</p>` : ""}`,
      cta: { label: "Open Operations dashboard", url: "https://talkstay.talkweb.io/app" },
    });

    const recipients = new Set<string>();
    if (deptEmail) recipients.add(deptEmail);

    // Staff assigned to this department also get the alert.
    const { data: assigned } = await admin
      .from("ts_staff").select("user_id")
      .eq("hotel_id", r.hotel_id).eq("department_key", r.department_key).eq("status", "active");
    for (const s of assigned ?? []) {
      const { data: su } = await admin.auth.admin.getUserById(s.user_id);
      if (su?.user?.email) recipients.add(su.user.email);
    }

    // Fallback to owner if nobody else; always copy owner on complaints/urgent.
    if (recipients.size === 0 && ownerEmail) recipients.add(ownerEmail);
    if (urgent && ownerEmail) recipients.add(ownerEmail);

    const results: Record<string, boolean> = {};
    for (const to of recipients) results[to] = await sendEmail(to, subject, html);

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
        for (const s of subs ?? []) {
          if (s.department_key && s.department_key !== r.department_key) continue;
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: subject, body: `Room ${roomNo}: ${staffSummary}`, url: "https://talkstay.talkweb.io/app", urgent, tag: r.id })
            );
            pushed++;
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await admin.from("ts_push_subscriptions").delete().eq("id", s.id);
            }
          }
        }
      } catch { /* push best-effort */ }
    }

    return json({ ok: true, emailed: Object.keys(results), results, pushed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
