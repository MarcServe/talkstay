import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";
import { renderEmail, quoteBlock, escapeHtml, emailFrom, isWhiteLabel, sendViaResend } from "../_shared/email.ts";

// A member of staff replies directly to a guest. The reply is translated into
// the guest's language, stored, and (if the guest opted in) emailed to them.
// The guest sees it in their in-room assistant chat.

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

const OPENAI = "https://api.openai.com/v1/chat/completions";
const isEnglish = (l?: string) => {
  const s = (l || "").trim().toLowerCase();
  return s === "" || s === "english" || s === "en" || s.startsWith("en-");
};

async function translate(apiKey: string, text: string, targetLang: string): Promise<string | null> {
  if (!apiKey || isEnglish(targetLang) || !text.trim()) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const resp = await fetch(OPENAI, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini", temperature: 0, max_tokens: 300,
        messages: [
          { role: "system", content: `Translate the hotel staff message below into ${targetLang}. Keep the tone warm and natural. Reply with ONLY the translation.` },
          { role: "user", content: text },
        ],
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    return String(data?.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").trim();

    // Identify the caller from their JWT.
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const caller = userData.user;

    const { requestId, body } = await req.json();
    if (!requestId || !String(body ?? "").trim()) return json({ error: "requestId and body required" }, 400);

    const { data: r } = await admin
      .from("ts_service_requests")
      .select("id, hotel_id, room_id, department_key, session_id, guest_language")
      .eq("id", requestId).maybeSingle();
    if (!r) return json({ error: "request not found" }, 404);

    // Authorize: hotel owner OR an active staff member of this hotel.
    const { data: hotel } = await admin.from("ts_hotels").select("id, user_id, name, slug, branding").eq("id", r.hotel_id).maybeSingle();
    if (!hotel) return json({ error: "not found" }, 404);
    const isOwner = hotel.user_id === caller.id;
    const { data: me } = await admin.from("ts_staff")
      .select("name, department_key, role, status")
      .eq("hotel_id", r.hotel_id).eq("user_id", caller.id).eq("status", "active").maybeSingle();
    if (!isOwner && !me) return json({ error: "Forbidden" }, 403);

    // "Front Desk · Jane" — a friendly attribution for the guest.
    const deptName = DEPT_LABEL[me?.department_key ?? r.department_key] ?? "Reception";
    const who = me?.name || (isOwner ? "Manager" : caller.email?.split("@")[0]) || "Team";
    const staffLabel = `${deptName} · ${who}`;

    const text = String(body).slice(0, 1000);
    const bodyGuest = await translate(OPENAI_API_KEY, text, r.guest_language || "");

    const { data: inserted, error: insErr } = await admin.from("ts_request_messages").insert({
      request_id: r.id, hotel_id: r.hotel_id, sender: "staff",
      staff_label: staffLabel, body: text, body_guest: bodyGuest,
    }).select("id, staff_label, body, body_guest, created_at").single();
    if (insErr) return json({ error: insErr.message }, 400);

    // Tell the guest their reply arrived — email and/or "notify this device"
    // (web push) are independent opt-ins, best-effort, one never blocks the other.
    if (r.session_id) {
      const shown = bodyGuest || text;

      const [{ data: sess }, { data: pushSubs }] = await Promise.all([
        admin.from("ts_guest_sessions")
          .select("notify_channel, contact_email").eq("hotel_id", r.hotel_id).eq("session_id", r.session_id).maybeSingle(),
        admin.from("ts_guest_push_subscriptions").select("id, endpoint, p256dh, auth")
          .eq("hotel_id", r.hotel_id).eq("session_id", r.session_id),
      ]);

      // Same deep link for email CTA and push — opens this room's chat with the QR token.
      let guestUrl = "https://talkstay.talkweb.io";
      if (hotel.slug && r.room_id) {
        const { data: tok } = await admin.from("ts_room_tokens").select("token")
          .eq("room_id", r.room_id).eq("is_active", true)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (tok?.token) guestUrl = `https://talkstay.talkweb.io/h/${hotel.slug}/r/${r.room_id}?token=${tok.token}`;
      }

      const email = sess?.contact_email;
      const key = (Deno.env.get("RESEND_API_KEY") || "").trim();
      if (email && sess?.notify_channel !== "none" && key) {
        const html = renderEmail({
          hotelName: hotel.name ?? "Your hotel",
          logoUrl: hotel.branding?.logo_url,
          accentColor: hotel.branding?.primary_color,
          whiteLabel: isWhiteLabel(hotel.branding),
          heading: "A message from the team",
          bodyHtml: `<p style="margin:0 0 10px;">From <strong>${escapeHtml(staffLabel)}</strong>:</p>${quoteBlock(shown)}`,
          cta: { label: "Continue chat", url: guestUrl },
          footerNote: "Opens your room assistant so you can reply. You can also scan the QR in your room.",
        });
        void sendViaResend({
          from: emailFrom(hotel.name ?? "", isWhiteLabel(hotel.branding), hotel.branding),
          to: email,
          subject: `${hotel.name ?? "Your hotel"}: a message from the team`,
          html,
        });
      }

      if (pushSubs?.length) {
        const vapidPub = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
        const vapidPriv = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
        if (vapidPub && vapidPriv) {
          webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@talkweb.io", vapidPub, vapidPriv);
          for (const s of pushSubs) {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                JSON.stringify({ title: `${hotel.name ?? "Your hotel"}: ${staffLabel}`, body: shown, url: guestUrl, tag: r.id })
              );
            } catch (err: any) {
              if (err?.statusCode === 404 || err?.statusCode === 410) {
                await admin.from("ts_guest_push_subscriptions").delete().eq("id", s.id);
              }
            }
          }
        }
      }
    }

    return json({ ok: true, message: inserted });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
