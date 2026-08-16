import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";
import { renderEmail, quoteBlock, escapeHtml } from "../_shared/email.ts";
import { authorizeRequestSideEffect } from "../_shared/talkstayAuth.ts";
import { formatRoomLabel } from "../_shared/roomLabel.ts";

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

    let r: any = null;
    {
      const full = await admin
        .from("ts_service_requests")
        .select("id, hotel_id, room_id, summary, session_id, is_chargeable, price, currency, payment_status")
        .eq("id", requestId).maybeSingle();
      if (full.error?.message?.includes("payment_status") || full.error?.message?.includes("is_chargeable")) {
        const legacy = await admin
          .from("ts_service_requests")
          .select("id, hotel_id, room_id, summary, session_id")
          .eq("id", requestId).maybeSingle();
        r = legacy.data;
      } else {
        r = full.data;
      }
    }
    if (!r?.session_id) return json({ ok: true, skipped: "no guest session" });

    const authz = await authorizeRequestSideEffect(req, admin, {
      hotelId: r.hotel_id,
      requestId: r.id,
      // Status trigger posts with anon immediately after the row update.
      allowRecentStatusChange: true,
    });
    if (!authz.ok) return json({ error: authz.error }, authz.status);

    let sess: { notify_channel?: string | null; contact_email?: string | null; payment_timing?: string | null } | null = null;
    {
      const full = await admin.from("ts_guest_sessions")
        .select("notify_channel, contact_email, payment_timing")
        .eq("hotel_id", r.hotel_id).eq("session_id", r.session_id).maybeSingle();
      if (full.error?.message?.includes("payment_timing")) {
        const legacy = await admin.from("ts_guest_sessions")
          .select("notify_channel, contact_email")
          .eq("hotel_id", r.hotel_id).eq("session_id", r.session_id).maybeSingle();
        sess = legacy.data;
      } else {
        sess = full.data;
      }
    }

    const [{ data: hotel }, roomRes, { data: pushSubs }] = await Promise.all([
      admin.from("ts_hotels").select("name, slug, branding").eq("id", r.hotel_id).maybeSingle(),
      r.room_id ? admin.from("ts_rooms").select("room_number, is_public").eq("id", r.room_id).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
      admin.from("ts_guest_push_subscriptions").select("id, endpoint, p256dh, auth")
        .eq("hotel_id", r.hotel_id).eq("session_id", r.session_id),
    ]);
    let room = roomRes.data as { room_number?: string; is_public?: boolean } | null;
    if ((roomRes as any)?.error?.message?.includes("is_public") && r.room_id) {
      const legacy = await admin.from("ts_rooms").select("room_number").eq("id", r.room_id).maybeSingle();
      room = legacy.data;
    }

    let unpaid: any[] = [];
    {
      const bill = await admin.from("ts_service_requests")
        .select("id, price, currency, payment_status, is_chargeable")
        .eq("hotel_id", r.hotel_id)
        .eq("session_id", r.session_id)
        .eq("is_chargeable", true)
        .neq("status", "cancelled")
        .limit(40);
      if (!bill.error) unpaid = ((bill.data ?? []) as any[]).filter((row) => (row.payment_status ?? "unpaid") === "unpaid");
    }

    const priced = unpaid.filter((row) => typeof row.price === "number" && Number(row.price) > 0);
    const owedTotal = priced.length ? priced.reduce((sum, row) => sum + Number(row.price), 0) : null;
    const currency = (unpaid.find((row) => row.currency)?.currency || "GBP").toUpperCase();
    const timing = sess?.payment_timing;
    let balanceHtml = "";
    if (unpaid.length) {
      const amountLine = owedTotal != null
        ? `${owedTotal.toFixed(2)} ${currency}`
        : `${unpaid.length} item${unpaid.length === 1 ? "" : "s"} (amounts confirmed at the desk)`;
      const timingLine = timing === "charge_to_room"
        ? "You've chosen to charge these items to your room."
        : timing === "at_checkout"
        ? (room?.is_public
          ? "You've chosen to settle at the counter."
          : "You've chosen to settle at checkout / charge to room.")
        : timing === "pay_now"
          ? (room?.is_public
            ? "You've asked the team to collect payment at your location."
            : "You've asked the team to collect payment in your room.")
          : (room?.is_public
            ? "Open My requests to pay now, pay at the counter, or charge to your room with your check-in code."
            : "Open My requests in chat to pay now (someone collects in your room) or settle at checkout.");
      balanceHtml = `
            <div style="margin:14px 0 0;padding:12px 14px;border-radius:10px;background:#fffbeb;border:1px solid #fcd34d;">
              <p style="margin:0 0 4px;font-weight:600;color:#92400e;">Current balance</p>
              <p style="margin:0;color:#78350f;">${escapeHtml(amountLine)}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#92400e;">${escapeHtml(timingLine)}</p>
            </div>`;
    }

    const hotelName = hotel?.name ?? "Your hotel";
    const roomLabel = room?.room_number ? formatRoomLabel(room.room_number) : "";
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
            <p style="margin:0 0 10px;">${roomLabel ? `${escapeHtml(roomLabel)} — ` : ""}here's the latest on what you asked for:</p>
            ${quoteBlock(r.summary)}
            ${balanceHtml}
            ${status === "cancelled"
              ? `<p style="margin:14px 0 0;">If you still need help, open the chat below or scan the QR in your room and ask again.</p>`
              : status === "completed"
              ? `<p style="margin:14px 0 0;">If everything arrived, open the chat to confirm — you can also leave a quick rating for this request there.</p>`
              : ""}`,
          cta: { label: "Open chat", url: guestUrl },
          footerNote: "You asked for updates about this stay. The button opens your room assistant.",
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
        const pushBody = unpaid.length && owedTotal != null
          ? `${r.summary} · Balance ${owedTotal.toFixed(2)} ${currency}`
          : r.summary;
        for (const s of pushSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: `${hotelName}: ${heading}`, body: pushBody, url: guestUrl, tag: r.id })
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
