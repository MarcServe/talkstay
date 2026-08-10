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
      let query = admin.from("ts_hotels")
        .select("id, name, slug, is_active, user_id, created_at, branding, default_language, timezone, require_checkin_code, pulse_enabled")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
      const { data, error } = await query;
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
      const [{ data: profiles, error }, { data: adminRoles }] = await Promise.all([
        admin.from("profiles")
          .select("user_id, email, first_name, last_name, company_name, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        admin.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      if (error) return json({ error: error.message }, 500);
      const adminSet = new Set((adminRoles ?? []).map((r) => r.user_id));
      return json({
        users: (profiles ?? []).map((p) => ({
          ...p,
          is_platform_admin: adminSet.has(p.user_id),
        })),
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

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
