import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, quoteBlock, escapeHtml, sendViaResend, DEFAULT_FROM } from "../_shared/email.ts";

const PUBLIC_BASE_URL = "https://talkstay.talkweb.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Page params for admin list endpoints (1-based). Default 50, max 100. */
function parsePage(body: Record<string, unknown> | null | undefined) {
  const page = Math.max(1, Math.floor(Number(body?.page) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(body?.pageSize) || 50)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ------- submit_demo_request (NO auth) -------
    // The marketing site posts here. Runs BEFORE the admin gate; it can only
    // insert a lead, never read one back.
    {
      const early = await req.clone().json().catch(() => ({} as Record<string, unknown>));
      if (String((early as any)?.action ?? "") === "submit_demo_request") {
        const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
        const name = str((early as any).name, 120);
        const email = str((early as any).email, 200).toLowerCase();
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return json({ error: "Name and a valid email are required" }, 400);
        }
        // One pending request per email — a double-tapped submit button
        // shouldn't create two leads to chase.
        const { data: dupe } = await admin.from("ts_demo_requests")
          .select("id").eq("email", email).eq("status", "new").limit(1);
        if (dupe?.length) return json({ ok: true, deduped: true });

        const { error: insErr } = await admin.from("ts_demo_requests").insert({
          name, email,
          company: str((early as any).company, 160) || null,
          phone: str((early as any).phone, 40) || null,
          property_count: str((early as any).propertyCount, 40) || null,
          preferred_time: str((early as any).preferredTime, 160) || null,
          message: str((early as any).message, 1000) || null,
          source: str((early as any).source, 64) || null,
        });
        if (insErr) return json({ error: insErr.message }, 400);

        // Tell the platform admin, or a lead sits unseen until someone opens
        // the dashboard.
        const { data: setting } = await admin.from("ts_platform_settings")
          .select("value").eq("key", "demo").maybeSingle();
        const notifyTo = String((setting?.value as any)?.notify_email ?? "").trim();
        if (notifyTo) {
          const html = renderEmail({
            hotelName: "TalkStay",
            heading: "New demo request",
            bodyHtml: `
              <p style="margin:0 0 10px;"><strong>${escapeHtml(name)}</strong> — ${escapeHtml(email)}</p>
              ${(early as any).company ? `<p style="margin:0 0 6px;">Property: ${escapeHtml(str((early as any).company, 160))}</p>` : ""}
              ${(early as any).phone ? `<p style="margin:0 0 6px;">Phone: ${escapeHtml(str((early as any).phone, 40))}</p>` : ""}
              ${(early as any).preferredTime ? `<p style="margin:0 0 6px;">Prefers: ${escapeHtml(str((early as any).preferredTime, 160))}</p>` : ""}
              ${(early as any).message ? quoteBlock(str((early as any).message, 1000)) : ""}`,
            cta: { label: "Open demo requests", url: "https://talkstay.talkweb.io/admin/demos" },
          });
          void sendViaResend({ from: DEFAULT_FROM, to: notifyTo, subject: `New demo request — ${name}`, html });
        }
        return json({ ok: true });
      }
    }

    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const { data: userData } = await admin.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin, error: adminErr } = await admin.rpc("is_admin", { _user_id: uid });
    if (adminErr) return json({ error: adminErr.message }, 500);
    if (!isAdmin) return json({ error: "Forbidden — platform admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim();

    // ------- demo requests (admin) -------
    if (action === "demo_requests") {
      const { data, error } = await admin.from("ts_demo_requests")
        .select("id, name, email, company, phone, property_count, preferred_time, message, status, meeting_url, confirmed_at, created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) {
        if (/does not exist|relation/i.test(error.message)) return json({ requests: [], missingTable: true });
        return json({ error: error.message }, 500);
      }
      return json({ requests: data ?? [] });
    }

    if (action === "confirm_demo_request") {
      const id = String(body?.id ?? "").trim();
      if (!id) return json({ error: "id required" }, 400);
      const { data: reqRow } = await admin.from("ts_demo_requests")
        .select("id, name, email, status").eq("id", id).maybeSingle();
      if (!reqRow) return json({ error: "Not found" }, 404);

      const { data: setting } = await admin.from("ts_platform_settings")
        .select("value").eq("key", "demo").maybeSingle();
      const meetingUrl = String(body?.meetingUrl ?? (setting?.value as any)?.meeting_url ?? "").trim();
      if (!/^https?:\/\//i.test(meetingUrl)) {
        return json({ error: "Add your meeting link in Settings → Demo first" }, 400);
      }
      const whenText = String(body?.when ?? "").trim().slice(0, 160);

      const html = renderEmail({
        hotelName: "TalkStay",
        heading: "Your TalkStay demo is confirmed",
        bodyHtml: `
          <p style="margin:0 0 10px;">Hi ${escapeHtml(reqRow.name)},</p>
          <p style="margin:0 0 10px;">Thanks for your interest — your live demo is confirmed${whenText ? ` for <strong>${escapeHtml(whenText)}</strong>` : ""}. Use the button below to join at that time.</p>
          <p style="margin:0;color:#6b7280;font-size:13px;">If the time doesn't suit, just reply to this email.</p>`,
        cta: { label: "Join the demo", url: meetingUrl },
      });
      const sent = await sendViaResend({
        from: DEFAULT_FROM, to: reqRow.email,
        subject: "Your TalkStay demo is confirmed", html,
      });
      if (!sent.ok) return json({ error: `Couldn't email them: ${(sent.error ?? "").slice(0, 200)}` }, 502);

      const { error: upErr } = await admin.from("ts_demo_requests").update({
        status: "confirmed", meeting_url: meetingUrl,
        confirmed_at: new Date().toISOString(), handled_by: uid,
      }).eq("id", id);
      if (upErr) return json({ error: upErr.message }, 400);
      return json({ ok: true, emailed: reqRow.email });
    }

    if (action === "set_demo_status") {
      const id = String(body?.id ?? "").trim();
      const status = String(body?.status ?? "").trim();
      if (!id || !["new", "declined", "done"].includes(status)) {
        return json({ error: "id and a valid status required" }, 400);
      }
      const { error } = await admin.from("ts_demo_requests").update({ status }).eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "overview") {
      const [
        { count: hotels },
        { count: activeHotels },
        { count: staff },
        { count: openRequests },
        { count: liveLinks },
        { count: rooms },
      ] = await Promise.all([
        admin.from("ts_hotels").select("*", { count: "exact", head: true }),
        admin.from("ts_hotels").select("*", { count: "exact", head: true }).eq("is_active", true),
        admin.from("ts_staff").select("*", { count: "exact", head: true }).eq("status", "active"),
        admin.from("ts_service_requests").select("*", { count: "exact", head: true })
          .in("status", ["new", "accepted", "in_progress", "on_the_way", "reopened"]),
        admin.from("ts_hotel_view_tokens").select("*", { count: "exact", head: true }).eq("is_active", true),
        admin.from("ts_rooms").select("*", { count: "exact", head: true }),
      ]);
      return json({
        hotels: hotels ?? 0,
        activeHotels: activeHotels ?? 0,
        staff: staff ?? 0,
        openRequests: openRequests ?? 0,
        liveLinks: liveLinks ?? 0,
        rooms: rooms ?? 0,
      });
    }

    if (action === "list_hotels") {
      const q = String(body?.q ?? "").trim().toLowerCase();
      const { page, pageSize, from, to } = parsePage(body);
      const selectFull =
        "id, name, slug, is_active, user_id, created_at, branding, default_language, timezone, require_checkin_code, pulse_enabled, billing_mode, billing_notes, billing_rates, max_devices_per_room";
      const selectBase =
        "id, name, slug, is_active, user_id, created_at, branding, default_language, timezone, require_checkin_code, pulse_enabled";
      let query = admin.from("ts_hotels")
        .select(selectFull, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
      let { data, error, count } = await query;
      if (error && /billing_mode|billing_rates|max_devices/i.test(error.message)) {
        let fallback = admin.from("ts_hotels")
          .select(selectBase, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
        if (q) fallback = fallback.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
        const retry = await fallback;
        data = retry.data;
        error = retry.error;
        count = retry.count;
      }
      if (error) return json({ error: error.message }, 500);

      const ownerIds = [...new Set((data ?? []).map((h) => h.user_id).filter(Boolean))];
      const profiles: Record<string, { email: string | null; first_name: string | null; last_name: string | null }> = {};
      if (ownerIds.length) {
        const { data: ps } = await admin.from("profiles")
          .select("user_id, email, first_name, last_name")
          .in("user_id", ownerIds);
        for (const p of ps ?? []) {
          profiles[p.user_id] = {
            email: p.email ?? null,
            first_name: p.first_name ?? null,
            last_name: p.last_name ?? null,
          };
        }
      }

      const hotels = (data ?? []).map((h) => ({
        ...h,
        owner: profiles[h.user_id] ?? null,
      }));
      return json({ hotels, page, pageSize, total: count ?? hotels.length });
    }

    if (action === "hotel_detail") {
      const hotelId = String(body?.hotelId ?? "").trim();
      if (!hotelId) return json({ error: "hotelId required" }, 400);

      const { data: hotel, error } = await admin.from("ts_hotels")
        .select("*")
        .eq("id", hotelId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!hotel) return json({ error: "Hotel not found" }, 404);

      const [
        { data: rooms },
        { data: staff },
        { data: tokens },
        { count: openRequests },
        { data: owner },
      ] = await Promise.all([
        admin.from("ts_rooms").select("id, room_number, floor, is_active, occupancy_status").eq("hotel_id", hotelId).order("room_number"),
        admin.from("ts_staff").select("id, name, department_key, role, status, user_id").eq("hotel_id", hotelId),
        admin.from("ts_hotel_view_tokens").select("id, token, label, is_active, expires_at, last_seen_at, created_at").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
        admin.from("ts_service_requests").select("*", { count: "exact", head: true })
          .eq("hotel_id", hotelId)
          .in("status", ["new", "accepted", "in_progress", "on_the_way", "reopened"]),
        admin.from("profiles").select("user_id, email, first_name, last_name, company_name").eq("user_id", hotel.user_id).maybeSingle(),
      ]);

      // Enrich staff with emails from profiles
      const staffIds = [...new Set((staff ?? []).map((s: any) => s.user_id).filter(Boolean))];
      const staffProfiles: Record<string, string | null> = {};
      if (staffIds.length) {
        const { data: ps } = await admin.from("profiles").select("user_id, email").in("user_id", staffIds);
        for (const p of ps ?? []) staffProfiles[p.user_id] = p.email ?? null;
      }

      return json({
        hotel,
        owner: owner ?? null,
        rooms: rooms ?? [],
        staff: (staff ?? []).map((s: any) => ({
          ...s,
          email: staffProfiles[s.user_id] ?? null,
        })),
        liveLinks: (tokens ?? []).map((t) => ({
          ...t,
          url: `${PUBLIC_BASE_URL}/live/${encodeURIComponent(t.token)}`,
        })),
        openRequests: openRequests ?? 0,
      });
    }

    if (action === "set_hotel_active") {
      const hotelId = String(body?.hotelId ?? "").trim();
      const is_active = !!body?.is_active;
      if (!hotelId) return json({ error: "hotelId required" }, 400);
      const { error } = await admin.from("ts_hotels").update({ is_active }).eq("id", hotelId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, is_active });
    }

    if (action === "list_live_links") {
      const { page, pageSize, from, to } = parsePage(body);
      const { data, error, count } = await admin.from("ts_hotel_view_tokens")
        .select("id, hotel_id, token, label, is_active, expires_at, last_seen_at, created_at, ts_hotels(name, slug)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) return json({ error: error.message }, 500);
      const links = (data ?? []).map((t: any) => ({
        id: t.id,
        hotel_id: t.hotel_id,
        hotel_name: t.ts_hotels?.name ?? "—",
        hotel_slug: t.ts_hotels?.slug ?? null,
        label: t.label,
        is_active: t.is_active,
        expires_at: t.expires_at,
        last_seen_at: t.last_seen_at,
        created_at: t.created_at,
        url: `${PUBLIC_BASE_URL}/live/${encodeURIComponent(t.token)}`,
      }));
      return json({ links, page, pageSize, total: count ?? links.length });
    }

    if (action === "revoke_live_link") {
      const tokenId = String(body?.tokenId ?? "").trim();
      if (!tokenId) return json({ error: "tokenId required" }, 400);
      const { error } = await admin.from("ts_hotel_view_tokens")
        .update({ is_active: false })
        .eq("id", tokenId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "list_users") {
      const TALKSTAY_BASE = "https://talkstay.talkweb.io";
      const TALKWEB_BASE = "https://talkweb.io";
      const { page, pageSize, from, to } = parsePage(body);
      const q = String(body?.q ?? "").trim();
      const product = String(body?.product ?? "all").trim().toLowerCase();

      const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      const adminSet = new Set((adminRoles ?? []).map((r) => r.user_id));
      const adminIds = [...adminSet];

      // Optional product pre-filter (ids only — keeps enrichment scoped to the page)
      let productUserIds: string[] | null = null;
      if (product === "admin") {
        productUserIds = adminIds;
      } else if (product === "talkstay") {
        const [{ data: owners }, { data: staff }] = await Promise.all([
          admin.from("ts_hotels").select("user_id").limit(5000),
          admin.from("ts_staff").select("user_id").eq("status", "active").limit(8000),
        ]);
        productUserIds = [...new Set([
          ...(owners ?? []).map((r) => r.user_id).filter(Boolean),
          ...(staff ?? []).map((r) => r.user_id).filter(Boolean),
        ])];
      } else if (product === "talkweb") {
        const { data: assistants } = await admin.from("assistants")
          .select("user_id")
          .not("user_id", "is", null)
          .limit(8000);
        productUserIds = [...new Set((assistants ?? []).map((a) => a.user_id).filter(Boolean))];
      } else if (product === "none") {
        // Profiles with no hotels, staff, or assistants — filter after page enrichment.
        productUserIds = null;
      }

      let profileQuery = admin.from("profiles")
        .select("user_id, email, first_name, last_name, company_name, website_url, created_at", { count: "exact" })
        .order("created_at", { ascending: false });

      if (q) {
        profileQuery = profileQuery.or(
          `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%`,
        );
      }
      if (productUserIds) {
        if (!productUserIds.length) {
          return json({ users: [], page, pageSize, total: 0, bases: { talkstay: TALKSTAY_BASE, talkweb: TALKWEB_BASE } });
        }
        // PostgREST .in() with huge arrays can fail — chunk filter only when small enough
        if (productUserIds.length <= 200) {
          profileQuery = profileQuery.in("user_id", productUserIds);
        } else {
          // Large sets: fetch page first without product filter, then filter in memory
          // (product filter accuracy degrades — prefer admin/talkstay with smaller sets).
          productUserIds = null;
        }
      }

      const { data: profiles, error, count } = await profileQuery.range(from, to);
      if (error) return json({ error: error.message }, 500);
      const userIds = (profiles ?? []).map((p) => p.user_id).filter(Boolean);

      const hotelsByOwner = new Map<string, { id: string; name: string; slug: string; is_active: boolean }[]>();
      const staffByUser = new Map<string, { hotel_id: string; role: string; status: string; name: string | null; slug: string | null }[]>();
      const assistantsByUser = new Map<string, {
        id: string; business_name: string; preview_slug: string | null;
        preview_url: string | null; website_url: string | null;
      }[]>();

      if (userIds.length) {
        const [{ data: ownedHotels }, { data: staffRows }, { data: assistants }] = await Promise.all([
          admin.from("ts_hotels")
            .select("id, name, slug, is_active, user_id")
            .in("user_id", userIds)
            .limit(2000),
          admin.from("ts_staff")
            .select("user_id, hotel_id, role, status, ts_hotels(name, slug)")
            .in("user_id", userIds)
            .limit(3000),
          admin.from("assistants")
            .select("id, user_id, business_name, preview_slug, preview_url, website_url")
            .in("user_id", userIds)
            .limit(3000),
        ]);

        for (const h of ownedHotels ?? []) {
          const list = hotelsByOwner.get(h.user_id) ?? [];
          list.push({ id: h.id, name: h.name, slug: h.slug, is_active: !!h.is_active });
          hotelsByOwner.set(h.user_id, list);
        }
        for (const s of staffRows ?? []) {
          const hotel = (s as any).ts_hotels;
          const list = staffByUser.get(s.user_id) ?? [];
          list.push({
            hotel_id: s.hotel_id,
            role: s.role,
            status: s.status,
            name: hotel?.name ?? null,
            slug: hotel?.slug ?? null,
          });
          staffByUser.set(s.user_id, list);
        }
        for (const a of assistants ?? []) {
          if (!a.user_id) continue;
          const list = assistantsByUser.get(a.user_id) ?? [];
          list.push({
            id: a.id,
            business_name: a.business_name,
            preview_slug: a.preview_slug,
            preview_url: a.preview_url,
            website_url: a.website_url,
          });
          assistantsByUser.set(a.user_id, list);
        }
      }

      // Only resolve TalkStay-linked assistants for this page (not a global 5k scan)
      const talkstayAssistantIds = new Set<string>();
      const pageAssistantIds = [...assistantsByUser.values()].flat().map((a) => a.id);
      if (pageAssistantIds.length) {
        const { data: linked } = await admin.from("ts_hotels")
          .select("assistant_id")
          .in("assistant_id", pageAssistantIds)
          .limit(2000);
        for (const row of linked ?? []) {
          if (row.assistant_id) talkstayAssistantIds.add(row.assistant_id);
        }
      }

      let users = (profiles ?? []).map((p) => {
        const owned = hotelsByOwner.get(p.user_id) ?? [];
        const staffed = staffByUser.get(p.user_id) ?? [];
        const allAssistants = assistantsByUser.get(p.user_id) ?? [];
        const talkwebAssistants = allAssistants.filter((a) => !talkstayAssistantIds.has(a.id));
        const talkstayAssistants = allAssistants.filter((a) => talkstayAssistantIds.has(a.id));

        const products: string[] = [];
        if (owned.length || staffed.length || talkstayAssistants.length) products.push("talkstay");
        if (talkwebAssistants.length) products.push("talkweb");
        if (!products.length) products.push("none");

        const links: {
          product: "talkstay" | "talkweb";
          label: string;
          href: string;
          role?: string;
        }[] = [];

        for (const h of owned) {
          links.push({
            product: "talkstay",
            label: `${h.name} (owner)`,
            href: `${TALKSTAY_BASE}/admin/hotels/${h.id}`,
            role: "owner",
          });
          links.push({
            product: "talkstay",
            label: `${h.name} dashboard`,
            href: `${TALKSTAY_BASE}/app`,
            role: "dashboard",
          });
        }
        const ownedIds = new Set(owned.map((h) => h.id));
        for (const s of staffed) {
          if (ownedIds.has(s.hotel_id)) continue;
          if (s.status !== "active") continue;
          links.push({
            product: "talkstay",
            label: `${s.name ?? "Property"} (${s.role})`,
            href: s.hotel_id
              ? `${TALKSTAY_BASE}/admin/hotels/${s.hotel_id}`
              : `${TALKSTAY_BASE}/app`,
            role: s.role,
          });
        }
        for (const a of talkwebAssistants) {
          const href = a.preview_url
            || `${TALKWEB_BASE}/preview/${a.id}?mode=widget-only`;
          links.push({
            product: "talkweb",
            label: a.business_name || "Assistant",
            href,
            role: "owner",
          });
        }

        return {
          ...p,
          is_platform_admin: adminSet.has(p.user_id),
          products,
          links,
          talkstay: {
            owned_hotels: owned.length,
            staff_roles: staffed.filter((s) => s.status === "active").length,
          },
          talkweb: {
            assistants: talkwebAssistants.length,
          },
        };
      });

      // Post-filter for "none" / "talkweb" when we couldn't pre-filter cheaply
      if (product === "none") {
        users = users.filter((u) => (u.products ?? []).includes("none"));
      } else if (product === "talkweb") {
        users = users.filter((u) => (u.products ?? []).includes("talkweb"));
      }

      return json({
        users,
        page,
        pageSize,
        total: count ?? users.length,
        bases: { talkstay: TALKSTAY_BASE, talkweb: TALKWEB_BASE },
      });
    }

    if (action === "set_platform_admin") {
      const userId = String(body?.userId ?? "").trim();
      const makeAdmin = !!body?.is_admin;
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === uid && !makeAdmin) {
        return json({ error: "You can't remove your own admin role." }, 400);
      }
      if (makeAdmin) {
        const { error } = await admin.from("user_roles").upsert(
          { user_id: userId, role: "admin" },
          { onConflict: "user_id,role" },
        );
        if (error) return json({ error: error.message }, 500);
      } else {
        const { error } = await admin.from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) return json({ error: error.message }, 500);
      }
      return json({ ok: true });
    }

    if (action === "disable_staff") {
      const staffId = String(body?.staffId ?? "").trim();
      if (!staffId) return json({ error: "staffId required" }, 400);
      const { error } = await admin.from("ts_staff")
        .update({ status: "disabled" })
        .eq("id", staffId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ── Platform settings (TalkStay control plane) ─────────────────────────
    if (action === "get_settings") {
      const { data, error } = await admin.from("ts_platform_settings")
        .select("key, value, updated_at, updated_by");
      if (error) {
        // Migration not applied yet — return empty so UI still loads.
        if (/does not exist|relation/i.test(error.message)) {
          return json({ settings: {}, missingTable: true });
        }
        return json({ error: error.message }, 500);
      }
      const settings: Record<string, unknown> = {};
      for (const row of data ?? []) settings[row.key] = row.value;
      return json({
        settings,
        updated: Object.fromEntries((data ?? []).map((r) => [r.key, r.updated_at])),
      });
    }

    if (action === "update_settings") {
      const key = String(body?.key ?? "").trim();
      const value = body?.value;
      const ALLOWED = new Set(["billing", "defaults", "features", "support", "partners", "demo"]);
      if (!ALLOWED.has(key)) return json({ error: "Invalid settings key" }, 400);
      if (value == null || typeof value !== "object" || Array.isArray(value)) {
        return json({ error: "value must be a JSON object" }, 400);
      }
      const { error } = await admin.from("ts_platform_settings").upsert(
        { key, value, updated_at: new Date().toISOString(), updated_by: uid },
        { onConflict: "key" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, key, value });
    }

    // ── Hotel commercial / ops controls ───────────────────────────────────
    if (action === "update_hotel") {
      const hotelId = String(body?.hotelId ?? "").trim();
      if (!hotelId) return json({ error: "hotelId required" }, 400);
      const patch: Record<string, unknown> = {};

      if (body?.is_active !== undefined) patch.is_active = !!body.is_active;
      if (body?.pulse_enabled !== undefined) patch.pulse_enabled = !!body.pulse_enabled;
      if (body?.require_checkin_code !== undefined) patch.require_checkin_code = !!body.require_checkin_code;
      if (body?.whatsapp_enabled !== undefined) patch.whatsapp_enabled = !!body.whatsapp_enabled;
      if (body?.card_payments_enabled !== undefined) {
        patch.card_payments_enabled = !!body.card_payments_enabled;
      }
      // null clears the override so the property falls back to the platform
      // default; 0 is a real value meaning "this property pays no fee", so the
      // two must not collapse into each other. Clamped to the same 0-3000 range
      // the charge path enforces, rather than trusting the input.
      if (body?.stripe_platform_fee_bps !== undefined) {
        const raw = body.stripe_platform_fee_bps;
        patch.stripe_platform_fee_bps = raw === null || raw === ""
          ? null
          : Math.max(0, Math.min(3000, Math.round(Number(raw)) || 0));
      }

      // Paid branding tier. Lives in the branding jsonb (no schema change), and
      // is platform-admin only on purpose — a property must not be able to
      // switch off our marks for itself. Merged, never overwritten, so this
      // can't wipe the logo/colour/poster config sitting in the same object.
      // from_email only works once the property has verified that domain in
      // Resend; until then sends fall back to ours rather than failing.
      if (body?.white_label !== undefined || body?.from_email !== undefined) {
        const { data: cur } = await admin
          .from("ts_hotels").select("branding").eq("id", hotelId).maybeSingle();
        const branding = { ...((cur?.branding ?? {}) as Record<string, unknown>) };
        if (body?.white_label !== undefined) {
          if (body.white_label) branding.white_label = true;
          else delete branding.white_label;
        }
        if (body?.from_email !== undefined) {
          const addr = String(body.from_email ?? "").trim().toLowerCase();
          if (!addr) delete branding.from_email;
          else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) branding.from_email = addr;
          else return json({ error: "from_email must be a valid email address" }, 400);
        }
        patch.branding = branding;
      }

      if (body?.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return json({ error: "name cannot be empty" }, 400);
        patch.name = name;
      }
      if (body?.default_language !== undefined) {
        patch.default_language = String(body.default_language).trim() || "English";
      }
      if (body?.timezone !== undefined) {
        patch.timezone = String(body.timezone).trim() || "Europe/London";
      }
      if (body?.escalation_phone !== undefined) {
        const v = String(body.escalation_phone).trim();
        patch.escalation_phone = v || null;
      }
      if (body?.whatsapp_number !== undefined) {
        const v = String(body.whatsapp_number).trim();
        patch.whatsapp_number = v || null;
      }
      if (body?.max_devices_per_room !== undefined) {
        const n = Math.max(1, Math.min(50, Number(body.max_devices_per_room) || 8));
        patch.max_devices_per_room = n;
      }
      if (body?.billing_mode !== undefined) {
        const mode = String(body.billing_mode).trim();
        if (!["subscription", "usage", "pilot", "complimentary"].includes(mode)) {
          return json({ error: "Invalid billing_mode" }, 400);
        }
        patch.billing_mode = mode;
      }
      if (body?.billing_notes !== undefined) {
        const v = String(body.billing_notes).trim();
        patch.billing_notes = v || null;
      }
      if (body?.billing_rates !== undefined) {
        if (body.billing_rates === null) {
          patch.billing_rates = null;
        } else if (typeof body.billing_rates === "object" && !Array.isArray(body.billing_rates)) {
          patch.billing_rates = body.billing_rates;
        } else {
          return json({ error: "billing_rates must be an object or null" }, 400);
        }
      }
      if (body?.referral_code !== undefined) {
        const v = String(body.referral_code).trim();
        patch.referral_code = v || null;
      }
      if (body?.contact_email !== undefined) {
        const v = String(body.contact_email ?? "").trim().toLowerCase();
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          return json({ error: "Invalid contact_email" }, 400);
        }
        patch.contact_email = v || null;
      }

      if (!Object.keys(patch).length) return json({ error: "No fields to update" }, 400);

      const { data, error } = await admin.from("ts_hotels")
        .update(patch)
        .eq("id", hotelId)
        .select("*")
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Hotel not found" }, 404);
      return json({ ok: true, hotel: data });
    }

    if (action === "rotate_room_token") {
      const roomId = String(body?.roomId ?? "").trim();
      if (!roomId) return json({ error: "roomId required" }, 400);
      const { data: room } = await admin.from("ts_rooms")
        .select("id, hotel_id, room_number")
        .eq("id", roomId)
        .maybeSingle();
      if (!room) return json({ error: "Room not found" }, 404);

      // Deactivate current active tokens, then mint a fresh one.
      await admin.from("ts_room_tokens")
        .update({ is_active: false, rotated_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("is_active", true);

      const { data: tok, error } = await admin.from("ts_room_tokens")
        .insert({ hotel_id: room.hotel_id, room_id: roomId })
        .select("id, token, is_active, created_at")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({
        ok: true,
        token: tok,
        room: { id: room.id, room_number: room.room_number },
      });
    }

    // ── Usage / pilot billing meters ──────────────────────────────────────
    if (action === "usage_summary" || action === "usage_hotel") {
      try {
        const days = Math.max(1, Math.min(366, Number(body?.days) || 30));
        const until = body?.until ? new Date(String(body.until)) : new Date();
        const since = body?.since
          ? new Date(String(body.since))
          : new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
        if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
          return json({ error: "Invalid since/until" }, 400);
        }

        const hotelIdFilter = action === "usage_hotel"
          ? String(body?.hotelId ?? "").trim()
          : (body?.hotelId ? String(body.hotelId).trim() : "");
        if (action === "usage_hotel" && !hotelIdFilter) {
          return json({ error: "hotelId required" }, 400);
        }

        const sinceIso = since.toISOString();
        const untilIso = until.toISOString();

        // Platform billing rates (optional table)
        let billing: Record<string, unknown> = {
          currency: "GBP",
          default_mode: "pilot",
          primary_meter: "active_qr",
          rate_active_qr: 15,
          rate_session: 0.5,
          rate_guest_turn: 0.05,
          rate_request: 0.25,
          include_inactive_hotels: false,
        };
        {
          const { data: settingsRows } = await admin.from("ts_platform_settings")
            .select("key, value")
            .eq("key", "billing")
            .maybeSingle();
          if (settingsRows?.value && typeof settingsRows.value === "object") {
            billing = { ...billing, ...(settingsRows.value as Record<string, unknown>) };
          }
        }

        // Hotels — paginate platform summary; full detail only for usage_hotel
        const { page, pageSize, from, to } = parsePage(body);
        let hotels: any[] | null = null;
        let hotelsTotal = 0;
        {
          let q = admin.from("ts_hotels")
            .select("id, name, slug, is_active, billing_mode, billing_notes, billing_rates, created_at", { count: "exact" })
            .order("name");
          if (hotelIdFilter) q = q.eq("id", hotelIdFilter);
          else {
            if (!billing.include_inactive_hotels) q = q.eq("is_active", true);
            q = q.range(from, to);
          }
          let res = await q;
          if (res.error) {
            let q2 = admin.from("ts_hotels")
              .select("id, name, slug, is_active, created_at", { count: "exact" })
              .order("name");
            if (hotelIdFilter) q2 = q2.eq("id", hotelIdFilter);
            else {
              if (!billing.include_inactive_hotels) q2 = q2.eq("is_active", true);
              q2 = q2.range(from, to);
            }
            res = await q2;
          }
          if (res.error) return json({ error: res.error.message }, 500);
          hotels = res.data ?? [];
          hotelsTotal = res.count ?? hotels.length;
        }

        type RollRow = {
          hotel_id: string;
          room_id: string | null;
          guest_turns: number;
          sessions: number;
          requests: number;
        };

        let rows: RollRow[] = [];
        let rollupReady = false;

        // Prefer SQL rollup when migration is applied
        {
          const rpcArgs: Record<string, unknown> = {
            _since: sinceIso,
            _until: untilIso,
          };
          if (hotelIdFilter) rpcArgs._hotel_id = hotelIdFilter;
          const { data: rollup, error: rollupErr } = await admin.rpc("ts_usage_rollup", rpcArgs);
          if (!rollupErr && Array.isArray(rollup)) {
            rows = rollup.map((r: any) => ({
              hotel_id: r.hotel_id,
              room_id: r.room_id ?? null,
              guest_turns: Number(r.guest_turns) || 0,
              sessions: Number(r.sessions) || 0,
              requests: Number(r.requests) || 0,
            }));
            rollupReady = true;
          }
        }

        // JS fallback — works without RPC / before migration
        if (!rollupReady) {
          const hotelIdsForScan = hotelIdFilter
            ? [hotelIdFilter]
            : (hotels ?? []).map((h) => h.id);

          const ixByKey = new Map<string, { guest_turns: number; sessions: Set<string> }>();
          const rqByKey = new Map<string, number>();

          const bumpIx = (hotel_id: string, room_id: string | null, session_id: string | null) => {
            const key = `${hotel_id}::${room_id ?? ""}`;
            let row = ixByKey.get(key);
            if (!row) {
              row = { guest_turns: 0, sessions: new Set() };
              ixByKey.set(key, row);
            }
            row.guest_turns += 1;
            if (session_id) row.sessions.add(session_id);
          };

          // Chunk .in() to avoid URL limits
          const chunk = <T,>(arr: T[], size: number) => {
            const out: T[][] = [];
            for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
            return out;
          };

          if (hotelIdsForScan.length) {
            for (const ids of chunk(hotelIdsForScan, 80)) {
              const [{ data: ix }, { data: rq }] = await Promise.all([
                admin.from("ts_interactions")
                  .select("hotel_id, room_id, session_id, role")
                  .in("hotel_id", ids)
                  .eq("role", "guest")
                  .gte("created_at", sinceIso)
                  .lt("created_at", untilIso)
                  .limit(20000),
                admin.from("ts_service_requests")
                  .select("hotel_id, room_id")
                  .in("hotel_id", ids)
                  .gte("created_at", sinceIso)
                  .lt("created_at", untilIso)
                  .limit(20000),
              ]);
              for (const r of ix ?? []) {
                bumpIx(r.hotel_id, r.room_id ?? null, r.session_id ?? null);
              }
              for (const r of rq ?? []) {
                const key = `${r.hotel_id}::${r.room_id ?? ""}`;
                rqByKey.set(key, (rqByKey.get(key) ?? 0) + 1);
              }
            }
          }

          const keys = new Set([...ixByKey.keys(), ...rqByKey.keys()]);
          rows = [...keys].map((key) => {
            const [hotel_id, roomPart] = key.split("::");
            const room_id = roomPart ? roomPart : null;
            const ix = ixByKey.get(key);
            return {
              hotel_id,
              room_id,
              guest_turns: ix?.guest_turns ?? 0,
              sessions: ix?.sessions.size ?? 0,
              requests: rqByKey.get(key) ?? 0,
            };
          });
        }

        // Room + token metadata only for single-hotel detail (platform list uses rollup only)
        const needRoomDetail = action === "usage_hotel" || !!hotelIdFilter;
        const hotelIds = (hotels ?? []).map((h) => h.id);
        let rooms: { id: string; hotel_id: string; room_number: string; is_active: boolean; is_public?: boolean }[] = [];
        let tokens: { room_id: string; token: string; is_active: boolean }[] = [];
        const roomCountByHotel = new Map<string, number>();

        if (hotelIds.length && needRoomDetail) {
          const chunk = <T,>(arr: T[], size: number) => {
            const out: T[][] = [];
            for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
            return out;
          };
          for (const ids of chunk(hotelIds, 80)) {
            let roomRes = await admin.from("ts_rooms")
              .select("id, hotel_id, room_number, is_active, is_public")
              .in("hotel_id", ids)
              .order("room_number");
            if (roomRes.error) {
              roomRes = await admin.from("ts_rooms")
                .select("id, hotel_id, room_number, is_active")
                .in("hotel_id", ids)
                .order("room_number");
            }
            const tokenRes = await admin.from("ts_room_tokens")
              .select("room_id, token, is_active")
              .in("hotel_id", ids)
              .eq("is_active", true);
            rooms = rooms.concat((roomRes.data as any) ?? []);
            tokens = tokens.concat((tokenRes.data as any) ?? []);
          }
        } else if (hotelIds.length) {
          // Lightweight room counts for the list page only
          const chunk = <T,>(arr: T[], size: number) => {
            const out: T[][] = [];
            for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
            return out;
          };
          for (const ids of chunk(hotelIds, 80)) {
            const { data: roomIds } = await admin.from("ts_rooms")
              .select("hotel_id")
              .in("hotel_id", ids);
            for (const r of roomIds ?? []) {
              roomCountByHotel.set(r.hotel_id, (roomCountByHotel.get(r.hotel_id) ?? 0) + 1);
            }
          }
        }

        const tokenByRoom = new Map(tokens.map((t) => [t.room_id, t.token]));
        const roomsByHotel = new Map<string, typeof rooms>();
        for (const r of rooms) {
          const list = roomsByHotel.get(r.hotel_id) ?? [];
          list.push(r);
          roomsByHotel.set(r.hotel_id, list);
        }

        const rollupByHotel = new Map<string, typeof rows>();
        for (const r of rows) {
          const list = rollupByHotel.get(r.hotel_id) ?? [];
          list.push(r);
          rollupByHotel.set(r.hotel_id, list);
        }

        const money = (n: number) => Math.round(n * 100) / 100;

        const resolveRates = (hotel: any) => {
          const o = (hotel.billing_rates && typeof hotel.billing_rates === "object")
            ? hotel.billing_rates as Record<string, unknown>
            : {};
          return {
            currency: String(o.currency ?? billing.currency ?? "GBP"),
            rate_active_qr: Number(o.rate_active_qr ?? billing.rate_active_qr) || 0,
            rate_session: Number(o.rate_session ?? billing.rate_session) || 0,
            rate_guest_turn: Number(o.rate_guest_turn ?? billing.rate_guest_turn) || 0,
            rate_request: Number(o.rate_request ?? billing.rate_request) || 0,
            primary_meter: String(o.primary_meter ?? billing.primary_meter ?? "active_qr"),
          };
        };

        const suggestCharge = (rates: ReturnType<typeof resolveRates>, m: {
          active_qr: number; sessions: number; guest_turns: number; requests: number;
        }) => {
          const primary = rates.primary_meter;
          let units = m.active_qr;
          let rate = rates.rate_active_qr;
          if (primary === "session") { units = m.sessions; rate = rates.rate_session; }
          else if (primary === "guest_turn") { units = m.guest_turns; rate = rates.rate_guest_turn; }
          else if (primary === "request") { units = m.requests; rate = rates.rate_request; }
          return {
            primary_meter: primary,
            units,
            rate,
            suggested: money(units * rate),
            currency: rates.currency,
            breakdown: {
              active_qr: money(m.active_qr * rates.rate_active_qr),
              sessions: money(m.sessions * rates.rate_session),
              guest_turns: money(m.guest_turns * rates.rate_guest_turn),
              requests: money(m.requests * rates.rate_request),
            },
          };
        };

        const hotelSummaries = (hotels ?? []).map((h) => {
          const rates = resolveRates(h);
          const hotelRooms = roomsByHotel.get(h.id) ?? [];
          const hotelRollup = rollupByHotel.get(h.id) ?? [];
          const byRoom = new Map<string | null, { guest_turns: number; sessions: number; requests: number }>();
          for (const r of hotelRollup) {
            byRoom.set(r.room_id, {
              guest_turns: Number(r.guest_turns) || 0,
              sessions: Number(r.sessions) || 0,
              requests: Number(r.requests) || 0,
            });
          }

          if (needRoomDetail) {
            const roomRowsOut = hotelRooms.map((room) => {
              const m = byRoom.get(room.id) ?? { guest_turns: 0, sessions: 0, requests: 0 };
              const active = m.sessions > 0 || m.guest_turns > 0 || m.requests > 0;
              const token = tokenByRoom.get(room.id) ?? null;
              return {
                room_id: room.id,
                room_number: room.room_number,
                is_active: room.is_active,
                is_public: !!room.is_public,
                has_qr_token: !!token,
                token_preview: token ? `${token.slice(0, 8)}…` : null,
                guest_url: token
                  ? `${PUBLIC_BASE_URL}/h/${encodeURIComponent(h.slug)}/r/${room.id}?token=${encodeURIComponent(token)}`
                  : null,
                guest_turns: m.guest_turns,
                sessions: m.sessions,
                requests: m.requests,
                engaged: active,
              };
            });

            let orphanTurns = 0, orphanSessions = 0, orphanRequests = 0;
            for (const [rid, m] of byRoom) {
              if (rid && hotelRooms.some((r) => r.id === rid)) continue;
              orphanTurns += m.guest_turns;
              orphanSessions += m.sessions;
              orphanRequests += m.requests;
            }

            const guest_turns = roomRowsOut.reduce((s, r) => s + r.guest_turns, 0) + orphanTurns;
            const sessions = roomRowsOut.reduce((s, r) => s + r.sessions, 0) + orphanSessions;
            const requests = roomRowsOut.reduce((s, r) => s + r.requests, 0) + orphanRequests;
            const active_qr = roomRowsOut.filter((r) => r.engaged).length;
            const meters = { active_qr, sessions, guest_turns, requests };
            const charge = suggestCharge(rates, meters);

            return {
              hotel_id: h.id,
              name: h.name,
              slug: h.slug,
              is_active: h.is_active,
              billing_mode: h.billing_mode ?? "subscription",
              billing_notes: h.billing_notes ?? null,
              rates,
              meters,
              charge,
              room_count: hotelRooms.length,
              rooms: roomRowsOut,
            };
          }

          // Platform list: meters from rollup only — no room/token payload
          let guest_turns = 0, sessions = 0, requests = 0, active_qr = 0;
          for (const [, m] of byRoom) {
            guest_turns += m.guest_turns;
            sessions += m.sessions;
            requests += m.requests;
            if (m.sessions > 0 || m.guest_turns > 0 || m.requests > 0) active_qr += 1;
          }
          const meters = { active_qr, sessions, guest_turns, requests };
          const charge = suggestCharge(rates, meters);
          return {
            hotel_id: h.id,
            name: h.name,
            slug: h.slug,
            is_active: h.is_active,
            billing_mode: h.billing_mode ?? "subscription",
            billing_notes: h.billing_notes ?? null,
            rates,
            meters,
            charge,
            room_count: roomCountByHotel.get(h.id) ?? 0,
            rooms: undefined,
          };
        });

        // Page totals from visible hotels; when rollup covers the whole platform,
        // also expose platform_totals for the header cards.
        const pageTotals = hotelSummaries.reduce(
          (acc, h) => {
            acc.active_qr += h.meters.active_qr;
            acc.sessions += h.meters.sessions;
            acc.guest_turns += h.meters.guest_turns;
            acc.requests += h.meters.requests;
            acc.suggested += h.charge.suggested;
            return acc;
          },
          { active_qr: 0, sessions: 0, guest_turns: 0, requests: 0, suggested: 0 },
        );

        let totals = pageTotals;
        let totalsScope: "page" | "platform" = hotelIdFilter ? "platform" : "page";
        if (!hotelIdFilter && rollupReady && rows.length) {
          // Approximate platform active_qr / sessions / turns / requests from full rollup
          const platform = { active_qr: 0, sessions: 0, guest_turns: 0, requests: 0, suggested: 0 };
          const byHotelMeters = new Map<string, { active_qr: number; sessions: number; guest_turns: number; requests: number }>();
          for (const r of rows) {
            let m = byHotelMeters.get(r.hotel_id);
            if (!m) {
              m = { active_qr: 0, sessions: 0, guest_turns: 0, requests: 0 };
              byHotelMeters.set(r.hotel_id, m);
            }
            m.guest_turns += r.guest_turns;
            m.sessions += r.sessions;
            m.requests += r.requests;
            if (r.sessions > 0 || r.guest_turns > 0 || r.requests > 0) m.active_qr += 1;
          }
          for (const m of byHotelMeters.values()) {
            platform.active_qr += m.active_qr;
            platform.sessions += m.sessions;
            platform.guest_turns += m.guest_turns;
            platform.requests += m.requests;
          }
          // Suggested uses default billing rates (hotel overrides ignored on platform card)
          const defRates = {
            currency: String(billing.currency ?? "GBP"),
            rate_active_qr: Number(billing.rate_active_qr) || 0,
            rate_session: Number(billing.rate_session) || 0,
            rate_guest_turn: Number(billing.rate_guest_turn) || 0,
            rate_request: Number(billing.rate_request) || 0,
            primary_meter: String(billing.primary_meter ?? "active_qr"),
          };
          platform.suggested = suggestCharge(defRates, platform).suggested;
          totals = platform;
          totalsScope = "platform";
        }

        return json({
          since: sinceIso,
          until: untilIso,
          days,
          billing,
          page: hotelIdFilter ? 1 : page,
          pageSize: hotelIdFilter ? 1 : pageSize,
          total: hotelIdFilter ? hotelSummaries.length : hotelsTotal,
          totals_scope: totalsScope,
          totals: {
            ...totals,
            suggested: money(totals.suggested),
            currency: String(billing.currency ?? "GBP"),
            hotels: hotelIdFilter ? hotelSummaries.length : hotelsTotal,
          },
          hotels: hotelSummaries,
          hotel: action === "usage_hotel" ? hotelSummaries[0] ?? null : undefined,
          rollup_ready: rollupReady,
        });
      } catch (usageErr) {
        return json({
          error: usageErr instanceof Error ? usageErr.message : "Usage calculation failed",
        }, 500);
      }
    }

    return json({ error: "Unknown action — redeploy talkstay-admin to pick up usage/settings endpoints" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
