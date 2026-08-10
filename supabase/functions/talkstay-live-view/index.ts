import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PUBLIC_BASE_URL = "https://talkstay.talkweb.io";
const OPEN_STATUSES = ["new", "accepted", "in_progress", "on_the_way", "reopened"];

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

function liveUrl(token: string) {
  return `${PUBLIC_BASE_URL}/live/${encodeURIComponent(token)}`;
}

async function requireHotelManager(
  admin: ReturnType<typeof createClient>,
  jwt: string,
  hotelId: string,
) {
  if (!jwt) return { error: "Unauthorized", status: 401 as const };
  const { data: userData } = await admin.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (!uid) return { error: "Unauthorized", status: 401 as const };

  const { data: hotel } = await admin.from("ts_hotels")
    .select("id, name, slug, user_id, branding")
    .eq("id", hotelId)
    .maybeSingle();
  if (!hotel) return { error: "Hotel not found", status: 404 as const };

  if (hotel.user_id === uid) return { uid, hotel, role: "owner" as const };

  const { data: staff } = await admin.from("ts_staff")
    .select("role")
    .eq("hotel_id", hotelId)
    .eq("user_id", uid)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (staff?.role === "manager" || staff?.role === "owner") {
    return { uid, hotel, role: staff.role as string };
  }
  return { error: "Forbidden", status: 403 as const };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim();

    // ------- Public: poll read-only queue by share token -------
    if (action === "queue") {
      const token = String(body?.token ?? "").trim();
      if (!token || token.length < 20) return json({ error: "Invalid token" }, 400);

      const { data: row } = await admin.from("ts_hotel_view_tokens")
        .select("id, hotel_id, is_active, expires_at, label")
        .eq("token", token)
        .maybeSingle();

      if (!row || !row.is_active) return json({ error: "This live view link is inactive or invalid." }, 403);
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        return json({ error: "This live view link has expired." }, 403);
      }

      // Touch last_seen (best-effort; ignore failures)
      void admin.from("ts_hotel_view_tokens")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", row.id);

      const { data: hotel } = await admin.from("ts_hotels")
        .select("id, name, slug, branding")
        .eq("id", row.hotel_id)
        .maybeSingle();
      if (!hotel) return json({ error: "Property not found" }, 404);

      const sinceIso = new Date(Date.now() - 3 * 86_400_000).toISOString();
      const [openRes, closedRes] = await Promise.all([
        admin.from("ts_service_requests")
          .select("id, department_key, summary, summary_staff, status, priority, is_complaint, created_at, updated_at, ts_rooms(room_number)")
          .eq("hotel_id", hotel.id)
          .in("status", OPEN_STATUSES)
          .order("created_at", { ascending: false })
          .limit(80),
        admin.from("ts_service_requests")
          .select("id, department_key, summary, summary_staff, status, priority, is_complaint, created_at, updated_at, ts_rooms(room_number)")
          .eq("hotel_id", hotel.id)
          .not("status", "in", `(${OPEN_STATUSES.join(",")})`)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);

      if (openRes.error) return json({ error: openRes.error.message }, 500);
      if (closedRes.error) return json({ error: closedRes.error.message }, 500);

      const seen = new Set<string>();
      const requests = [];
      for (const r of [...(openRes.data ?? []), ...(closedRes.data ?? [])] as any[]) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        // Redact: no conversation, session, guest language, staff emails.
        requests.push({
          id: r.id,
          department_key: r.department_key,
          summary: r.summary_staff || r.summary,
          status: r.status,
          priority: r.priority,
          is_complaint: !!r.is_complaint,
          created_at: r.created_at,
          updated_at: r.updated_at,
          room_number: r.ts_rooms?.room_number ?? null,
        });
      }
      requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const branding = (hotel.branding ?? {}) as Record<string, unknown>;
      return json({
        hotel: {
          name: hotel.name,
          slug: hotel.slug,
          primaryColor: (branding.primary_color as string) || "#4c2bb8",
          logoUrl: (branding.logo_url as string) || null,
        },
        label: row.label,
        fetchedAt: Date.now(),
        requests,
      });
    }

    // ------- Authenticated owner/manager actions -------
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const hotelId = String(body?.hotelId ?? "").trim();
    if (!hotelId) return json({ error: "hotelId required" }, 400);

    const gate = await requireHotelManager(admin, jwt, hotelId);
    if ("error" in gate) return json({ error: gate.error }, gate.status);
    const { uid, hotel } = gate;

    if (action === "list") {
      const { data, error } = await admin.from("ts_hotel_view_tokens")
        .select("id, token, label, is_active, expires_at, last_seen_at, created_at")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return json({ error: error.message }, 500);
      return json({
        links: (data ?? []).map((t) => ({
          ...t,
          url: liveUrl(t.token),
        })),
      });
    }

    if (action === "create") {
      const label = String(body?.label ?? "Campaign live view").trim().slice(0, 80) || "Campaign live view";
      const days = Number(body?.expiresInDays);
      const expires_at = Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 86_400_000).toISOString()
        : null;

      // Deactivate previous active links so there's one clear campaign URL.
      await admin.from("ts_hotel_view_tokens")
        .update({ is_active: false })
        .eq("hotel_id", hotelId)
        .eq("is_active", true);

      const { data, error } = await admin.from("ts_hotel_view_tokens")
        .insert({
          hotel_id: hotelId,
          label,
          expires_at,
          created_by: uid,
          is_active: true,
        })
        .select("id, token, label, is_active, expires_at, created_at")
        .single();
      if (error) return json({ error: error.message }, 500);

      return json({
        link: { ...data, url: liveUrl(data.token) },
        hotel: { name: hotel.name, slug: hotel.slug },
      });
    }

    if (action === "revoke") {
      const tokenId = String(body?.tokenId ?? "").trim();
      if (!tokenId) return json({ error: "tokenId required" }, 400);
      const { error } = await admin.from("ts_hotel_view_tokens")
        .update({ is_active: false })
        .eq("id", tokenId)
        .eq("hotel_id", hotelId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
