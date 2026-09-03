import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, escapeHtml, emailFrom, isWhiteLabel, sendViaResend } from "../_shared/email.ts";

/**
 * Guest communications — contact list + occasional manual campaigns.
 * No automatic newsletter cron. Recipients must have shared an email and
 * must not be on the marketing unsubscribe list.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBLIC_BASE = (Deno.env.get("PUBLIC_APP_URL") || "https://talkstay.talkweb.io").replace(/\/$/, "");
const MAX_RECIPIENTS = 200;

function normalizeEmail(raw: unknown): string | null {
  const e = String(raw ?? "").trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}

function normalizeHttpUrl(raw: unknown): string | null {
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

async function hmacUnsubscribeToken(hotelId: string, email: string): Promise<string> {
  const secret = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "talkstay").slice(0, 64);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = new TextEncoder().encode(`${hotelId}:${email}`);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function verifyUnsubscribeToken(hotelId: string, email: string, token: string): Promise<boolean> {
  const expected = await hmacUnsubscribeToken(hotelId, email);
  return !!token && token === expected;
}

function serviceAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function requireHotelAdmin(admin: ReturnType<typeof serviceAdmin>, req: Request, hotelId: string) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { error: "Unauthorized", status: 401 as const };
  const { data: userData } = await admin.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (!uid) return { error: "Unauthorized", status: 401 as const };

  const { data: hotel } = await admin
    .from("ts_hotels")
    .select("id, user_id, name, slug, branding")
    .eq("id", hotelId)
    .maybeSingle();
  if (!hotel) return { error: "Property not found", status: 404 as const };

  let ok = hotel.user_id === uid;
  if (!ok) {
    const { data: staff } = await admin
      .from("ts_staff")
      .select("role, department_key, status")
      .eq("hotel_id", hotelId)
      .eq("user_id", uid)
      .eq("status", "active")
      .maybeSingle();
    ok = !!staff && (staff.role === "owner" || (staff.role === "manager" && !staff.department_key));
  }
  if (!ok) return { error: "Only property admins can manage guest communications", status: 403 as const };
  return { hotel, uid };
}

type ContactRow = {
  email: string;
  firstName: string | null;
  roomLabel: string | null;
  lastSeenAt: string | null;
  source: "guest_opt_in" | "checkin_email";
  marketingOk: boolean;
};

async function loadContacts(admin: ReturnType<typeof serviceAdmin>, hotelId: string): Promise<ContactRow[]> {
  const [{ data: sessions }, { data: unsubs }, { data: rooms }] = await Promise.all([
    admin
      .from("ts_guest_sessions")
      .select("contact_email, notify_channel, guest_first_name, room_id, started_at, session_id")
      .eq("hotel_id", hotelId)
      .not("contact_email", "is", null)
      .order("started_at", { ascending: false })
      .limit(2000),
    admin.from("ts_guest_marketing_unsubscribes").select("email").eq("hotel_id", hotelId),
    admin.from("ts_rooms").select("id, room_number").eq("hotel_id", hotelId),
  ]);

  const unsub = new Set((unsubs ?? []).map((u: { email: string }) => String(u.email).toLowerCase()));
  const roomMap = new Map((rooms ?? []).map((r: { id: string; room_number: string }) => [r.id, r.room_number]));

  const byEmail = new Map<string, ContactRow>();
  for (const s of sessions ?? []) {
    const email = normalizeEmail(s.contact_email);
    if (!email) continue;
    if (s.notify_channel === "none") continue;

    const existing = byEmail.get(email);
    const source: ContactRow["source"] =
      String(s.session_id ?? "").startsWith("staff_email:") ? "checkin_email" : "guest_opt_in";
    const roomLabel = s.room_id ? (roomMap.get(s.room_id) ?? null) : null;
    const firstName = s.guest_first_name ? String(s.guest_first_name) : null;
    const lastSeenAt = s.started_at ? String(s.started_at) : null;

    if (!existing) {
      byEmail.set(email, {
        email,
        firstName,
        roomLabel,
        lastSeenAt,
        source,
        marketingOk: !unsub.has(email),
      });
    } else {
      // Keep newest name/room; prefer guest_opt_in over staff-only email.
      if (!existing.firstName && firstName) existing.firstName = firstName;
      if (!existing.roomLabel && roomLabel) existing.roomLabel = roomLabel;
      if (existing.source === "checkin_email" && source === "guest_opt_in") existing.source = "guest_opt_in";
      if (lastSeenAt && (!existing.lastSeenAt || lastSeenAt > existing.lastSeenAt)) {
        existing.lastSeenAt = lastSeenAt;
        if (roomLabel) existing.roomLabel = roomLabel;
      }
    }
  }

  return [...byEmail.values()].sort((a, b) =>
    (b.lastSeenAt || "").localeCompare(a.lastSeenAt || ""),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = serviceAdmin();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "").trim();

    // ---- Public unsubscribe (no JWT) ----
    if (action === "unsubscribe") {
      const hotelId = String(body.hotelId ?? "").trim();
      const email = normalizeEmail(body.email);
      const token = String(body.token ?? "").trim();
      if (!hotelId || !email || !token) return json({ error: "Invalid unsubscribe link" }, 400);
      if (!(await verifyUnsubscribeToken(hotelId, email, token))) {
        return json({ error: "Invalid or expired unsubscribe link" }, 403);
      }
      await admin.from("ts_guest_marketing_unsubscribes").upsert({
        hotel_id: hotelId,
        email,
        unsubscribed_at: new Date().toISOString(),
        source: "link",
      }, { onConflict: "hotel_id,email" });
      return json({ ok: true });
    }

    if (action === "unsubscribe_preview") {
      const hotelId = String(body.hotelId ?? "").trim();
      const email = normalizeEmail(body.email);
      const token = String(body.token ?? "").trim();
      if (!hotelId || !email || !token) return json({ error: "Invalid link" }, 400);
      if (!(await verifyUnsubscribeToken(hotelId, email, token))) {
        return json({ error: "Invalid link" }, 403);
      }
      const { data: hotel } = await admin.from("ts_hotels").select("name, branding").eq("id", hotelId).maybeSingle();
      return json({
        ok: true,
        hotelName: hotel?.name ?? "Property",
        email,
        already: !!(await admin.from("ts_guest_marketing_unsubscribes")
          .select("id").eq("hotel_id", hotelId).eq("email", email).maybeSingle()).data,
      });
    }

    // ---- Staff actions ----
    const hotelId = String(body.hotelId ?? "").trim();
    if (!hotelId) return json({ error: "hotelId required" }, 400);
    const auth = await requireHotelAdmin(admin, req, hotelId);
    if ("error" in auth) return json({ error: auth.error }, auth.status);
    const { hotel, uid } = auth;

    if (action === "list_contacts") {
      const contacts = await loadContacts(admin, hotelId);
      return json({
        contacts,
        eligibleCount: contacts.filter((c) => c.marketingOk).length,
        totalCount: contacts.length,
      });
    }

    if (action === "list_campaigns") {
      const { data } = await admin
        .from("ts_guest_campaigns")
        .select("id, subject, body_text, cta_label, cta_url, recipient_count, sent_count, created_at")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ campaigns: data ?? [] });
    }

    if (action === "staff_unsubscribe") {
      const email = normalizeEmail(body.email);
      if (!email) return json({ error: "Valid email required" }, 400);
      await admin.from("ts_guest_marketing_unsubscribes").upsert({
        hotel_id: hotelId,
        email,
        unsubscribed_at: new Date().toISOString(),
        source: "staff",
      }, { onConflict: "hotel_id,email" });
      return json({ ok: true });
    }

    if (action === "staff_resubscribe") {
      const email = normalizeEmail(body.email);
      if (!email) return json({ error: "Valid email required" }, 400);
      await admin.from("ts_guest_marketing_unsubscribes")
        .delete()
        .eq("hotel_id", hotelId)
        .eq("email", email);
      return json({ ok: true });
    }

    if (action === "send_campaign") {
      const subject = String(body.subject ?? "").trim().slice(0, 120);
      const bodyText = String(body.bodyText ?? body.body ?? "").trim().slice(0, 4000);
      const ctaLabel = String(body.ctaLabel ?? "").trim().slice(0, 60) || null;
      const ctaUrl = normalizeHttpUrl(body.ctaUrl);
      if (!subject || !bodyText) return json({ error: "Subject and message are required" }, 400);
      if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
        return json({ error: "Provide both a button label and URL, or neither" }, 400);
      }

      const contacts = await loadContacts(admin, hotelId);
      const requested = Array.isArray(body.emails)
        ? body.emails.map((e: unknown) => normalizeEmail(e)).filter(Boolean) as string[]
        : null;

      let recipients = contacts.filter((c) => c.marketingOk);
      if (requested?.length) {
        const want = new Set(requested);
        recipients = recipients.filter((c) => want.has(c.email));
      }
      if (!recipients.length) {
        return json({ error: "No eligible guests to email (need shared emails who haven’t unsubscribed)" }, 400);
      }
      if (recipients.length > MAX_RECIPIENTS) {
        return json({
          error: `Please send to at most ${MAX_RECIPIENTS} guests at a time (${recipients.length} selected)`,
        }, 400);
      }

      const branding = (hotel.branding ?? {}) as Record<string, unknown>;
      const hotelName = hotel.name ?? "Your hotel";

      const { data: campaign, error: campErr } = await admin.from("ts_guest_campaigns").insert({
        hotel_id: hotelId,
        subject,
        body_text: bodyText,
        cta_label: ctaLabel,
        cta_url: ctaUrl,
        recipient_count: recipients.length,
        sent_count: 0,
        created_by: uid,
      }).select("id").single();
      if (campErr || !campaign) return json({ error: campErr?.message ?? "Couldn't create campaign" }, 500);

      let sent = 0;
      const results: { email: string; ok: boolean; error?: string }[] = [];

      for (const contact of recipients) {
        const token = await hmacUnsubscribeToken(hotelId, contact.email);
        const unsubUrl = `${PUBLIC_BASE}/unsubscribe?hotel=${encodeURIComponent(hotelId)}&email=${encodeURIComponent(contact.email)}&t=${token}`;
        const hello = contact.firstName ? `Hi ${escapeHtml(contact.firstName)},` : "Hi,";
        const paragraphs = bodyText
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
          .join("");

        const html = renderEmail({
          hotelName,
          logoUrl: branding.logo_url as string | null | undefined,
          accentColor: branding.primary_color as string | null | undefined,
          whiteLabel: isWhiteLabel(branding),
          heading: subject,
          bodyHtml: `
            <p style="margin:0 0 12px;">${hello}</p>
            ${paragraphs}
          `,
          cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined,
          footerNote: `You're receiving this because you shared your email during a stay at ${escapeHtml(hotelName)}. <a href="${escapeHtml(unsubUrl)}" style="color:#6b7280;">Unsubscribe from offers</a>`,
        });

        const resp = await sendViaResend({
          from: emailFrom(hotelName, isWhiteLabel(branding), branding),
          to: contact.email,
          subject: `${hotelName}: ${subject}`,
          html,
        });

        await admin.from("ts_guest_campaign_sends").insert({
          campaign_id: campaign.id,
          hotel_id: hotelId,
          email: contact.email,
          status: resp.ok ? "sent" : "failed",
          error: resp.ok ? null : (resp.error ?? "send failed").slice(0, 300),
        });

        if (resp.ok) {
          sent += 1;
          results.push({ email: contact.email, ok: true });
        } else {
          results.push({ email: contact.email, ok: false, error: resp.error?.slice(0, 200) });
        }
      }

      await admin.from("ts_guest_campaigns").update({ sent_count: sent }).eq("id", campaign.id);

      return json({
        ok: true,
        campaignId: campaign.id,
        sent,
        attempted: recipients.length,
        results,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
