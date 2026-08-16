import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

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
      const selectFull =
        "id, name, slug, is_active, user_id, created_at, branding, default_language, timezone, require_checkin_code, pulse_enabled, billing_mode, billing_notes, billing_rates, max_devices_per_room";
      const selectBase =
        "id, name, slug, is_active, user_id, created_at, branding, default_language, timezone, require_checkin_code, pulse_enabled";
      let query = admin.from("ts_hotels")
        .select(selectFull)
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
      let { data, error } = await query;
      if (error && /billing_mode|billing_rates|max_devices/i.test(error.message)) {
        let fallback = admin.from("ts_hotels")
          .select(selectBase)
          .order("created_at", { ascending: false })
          .limit(200);
        if (q) fallback = fallback.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
        const retry = await fallback;
        data = retry.data;
        error = retry.error;
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
      return json({ hotels });
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
      const { data, error } = await admin.from("ts_hotel_view_tokens")
        .select("id, hotel_id, token, label, is_active, expires_at, last_seen_at, created_at, ts_hotels(name, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({
        links: (data ?? []).map((t: any) => ({
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
        })),
      });
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

      const [{ data: profiles, error }, { data: adminRoles }] = await Promise.all([
        admin.from("profiles")
          .select("user_id, email, first_name, last_name, company_name, website_url, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        admin.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      if (error) return json({ error: error.message }, 500);
      const adminSet = new Set((adminRoles ?? []).map((r) => r.user_id));
      const userIds = (profiles ?? []).map((p) => p.user_id).filter(Boolean);

      // TalkStay: owned hotels + staff memberships
      const hotelsByOwner = new Map<string, { id: string; name: string; slug: string; is_active: boolean }[]>();
      const staffByUser = new Map<string, { hotel_id: string; role: string; status: string; name: string | null; slug: string | null }[]>();
      // TalkWeb: assistants owned by user (shared DB parent product)
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

      // Hotels already linked via TalkStay assistant_id — avoid double-counting
      // pure TalkStay assistants as "TalkWeb only" when they only exist for a hotel.
      const talkstayAssistantIds = new Set<string>();
      {
        const { data: linked } = await admin.from("ts_hotels")
          .select("assistant_id")
          .not("assistant_id", "is", null)
          .limit(5000);
        for (const row of linked ?? []) {
          if (row.assistant_id) talkstayAssistantIds.add(row.assistant_id);
        }
      }

      const users = (profiles ?? []).map((p) => {
        const owned = hotelsByOwner.get(p.user_id) ?? [];
        const staffed = staffByUser.get(p.user_id) ?? [];
        const allAssistants = assistantsByUser.get(p.user_id) ?? [];
        const talkwebAssistants = allAssistants.filter((a) => !talkstayAssistantIds.has(a.id));
        // Assistants that power a TalkStay hotel still show as TalkStay context.
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
        // Staff memberships on hotels they don't own
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

      return json({
        users,
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
      const ALLOWED = new Set(["billing", "defaults", "features", "support"]);
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

      const { data: settingsRows } = await admin.from("ts_platform_settings")
        .select("key, value")
        .eq("key", "billing")
        .maybeSingle();
      const billing = {
        currency: "GBP",
        default_mode: "pilot",
        primary_meter: "active_qr",
        rate_active_qr: 15,
        rate_session: 0.5,
        rate_guest_turn: 0.05,
        rate_request: 0.25,
        include_inactive_hotels: false,
        ...((settingsRows?.value as Record<string, unknown>) ?? {}),
      };

      let hotelQuery = admin.from("ts_hotels")
        .select("id, name, slug, is_active, billing_mode, billing_notes, billing_rates, created_at")
        .order("name");
      if (hotelIdFilter) hotelQuery = hotelQuery.eq("id", hotelIdFilter);
      else if (!billing.include_inactive_hotels) hotelQuery = hotelQuery.eq("is_active", true);

      let { data: hotels, error: hotelsErr } = await hotelQuery.limit(500);
      if (hotelsErr && /billing_mode|billing_rates/i.test(hotelsErr.message)) {
        let fb = admin.from("ts_hotels")
          .select("id, name, slug, is_active, created_at")
          .order("name");
        if (hotelIdFilter) fb = fb.eq("id", hotelIdFilter);
        else if (!billing.include_inactive_hotels) fb = fb.eq("is_active", true);
        const retry = await fb.limit(500);
        hotels = retry.data;
        hotelsErr = retry.error;
      }
      if (hotelsErr) return json({ error: hotelsErr.message }, 500);

      const { data: rollup, error: rollupErr } = await admin.rpc("ts_usage_rollup", {
        _since: since.toISOString(),
        _until: until.toISOString(),
        _hotel_id: hotelIdFilter || null,
      });
      if (rollupErr) {
        // Fall back: empty meters if migration not applied yet.
        if (!/does not exist|function/i.test(rollupErr.message)) {
          return json({ error: rollupErr.message }, 500);
        }
      }

      const rows = (rollup ?? []) as {
        hotel_id: string;
        room_id: string | null;
        guest_turns: number;
        sessions: number;
        requests: number;
      }[];

      // Room labels + QR tokens for detail view
      const hotelIds = (hotels ?? []).map((h) => h.id);
      let rooms: { id: string; hotel_id: string; room_number: string; is_active: boolean; is_public?: boolean }[] = [];
      let tokens: { room_id: string; token: string; is_active: boolean }[] = [];
      if (hotelIds.length) {
        const [{ data: roomRows }, { data: tokenRows }] = await Promise.all([
          admin.from("ts_rooms")
            .select("id, hotel_id, room_number, is_active, is_public")
            .in("hotel_id", hotelIds)
            .order("room_number"),
          admin.from("ts_room_tokens")
            .select("room_id, token, is_active")
            .in("hotel_id", hotelIds)
            .eq("is_active", true),
        ]);
        rooms = (roomRows as any) ?? [];
        tokens = (tokenRows as any) ?? [];
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

      const money = (n: number, currency: string) =>
        Math.round(n * 100) / 100;

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
          suggested: money(units * rate, rates.currency),
          currency: rates.currency,
          breakdown: {
            active_qr: money(m.active_qr * rates.rate_active_qr, rates.currency),
            sessions: money(m.sessions * rates.rate_session, rates.currency),
            guest_turns: money(m.guest_turns * rates.rate_guest_turn, rates.currency),
            requests: money(m.requests * rates.rate_request, rates.currency),
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

        const roomRows = hotelRooms.map((room) => {
          const m = byRoom.get(room.id) ?? { guest_turns: 0, sessions: 0, requests: 0 };
          const active = m.sessions > 0 || m.guest_turns > 0 || m.requests > 0;
          const token = tokenByRoom.get(room.id) ?? null;
          const slugHotel = (hotels ?? []).find((x) => x.id === h.id)?.slug;
          return {
            room_id: room.id,
            room_number: room.room_number,
            is_active: room.is_active,
            is_public: !!(room as any).is_public,
            has_qr_token: !!token,
            token_preview: token ? `${token.slice(0, 8)}…` : null,
            guest_url: token && slugHotel
              ? `${PUBLIC_BASE_URL}/h/${encodeURIComponent(slugHotel)}/r/${room.id}?token=${encodeURIComponent(token)}`
              : null,
            guest_turns: m.guest_turns,
            sessions: m.sessions,
            requests: m.requests,
            engaged: active,
          };
        });

        // Orphan rollup rows (room deleted) still count toward hotel totals
        let orphanTurns = 0, orphanSessions = 0, orphanRequests = 0;
        for (const [rid, m] of byRoom) {
          if (rid && hotelRooms.some((r) => r.id === rid)) continue;
          orphanTurns += m.guest_turns;
          orphanSessions += m.sessions;
          orphanRequests += m.requests;
        }

        const guest_turns = roomRows.reduce((s, r) => s + r.guest_turns, 0) + orphanTurns;
        const sessions = roomRows.reduce((s, r) => s + r.sessions, 0) + orphanSessions;
        const requests = roomRows.reduce((s, r) => s + r.requests, 0) + orphanRequests;
        const active_qr = roomRows.filter((r) => r.engaged).length;
        const meters = { active_qr, sessions, guest_turns, requests };
        const charge = suggestCharge(rates, meters);

        return {
          hotel_id: h.id,
          name: h.name,
          slug: h.slug,
          is_active: h.is_active,
          billing_mode: (h as any).billing_mode ?? "subscription",
          billing_notes: (h as any).billing_notes ?? null,
          rates,
          meters,
          charge,
          room_count: hotelRooms.length,
          rooms: action === "usage_hotel" || hotelIdFilter ? roomRows : undefined,
        };
      });

      const totals = hotelSummaries.reduce(
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

      return json({
        since: since.toISOString(),
        until: until.toISOString(),
        days,
        billing,
        totals: {
          ...totals,
          suggested: money(totals.suggested, String(billing.currency)),
          currency: String(billing.currency ?? "GBP"),
          hotels: hotelSummaries.length,
        },
        hotels: hotelSummaries,
        hotel: action === "usage_hotel" ? hotelSummaries[0] ?? null : undefined,
        rollup_ready: !rollupErr,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
