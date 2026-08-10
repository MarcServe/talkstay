import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Authorize talkstay-notify / talkstay-call / talkstay-guest-notify.
 *
 * Allowed:
 *  - service_role JWT (guest-chat, other edge functions)
 *  - authenticated hotel owner / active staff for the request's hotel
 *  - DB triggers / cron that still send the anon key, but only when the
 *    request has a matching recent system event (escalation / status change)
 */
export async function authorizeRequestSideEffect(
  req: Request,
  admin: SupabaseClient,
  opts: {
    hotelId: string;
    requestId: string;
    /** Cron escalate path: recent system "escalated" event. */
    allowCronEscalate?: boolean;
    /** Guest-notify trigger path: request status changed recently. */
    allowRecentStatusChange?: boolean;
  },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (serviceKey && jwt === serviceKey) return { ok: true };

  if (jwt) {
    const { data: userData } = await admin.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (uid) {
      const { data: hotel } = await admin.from("ts_hotels").select("user_id").eq("id", opts.hotelId).maybeSingle();
      if (hotel?.user_id === uid) return { ok: true };
      const { data: staff } = await admin.from("ts_staff")
        .select("id")
        .eq("hotel_id", opts.hotelId)
        .eq("user_id", uid)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (staff) return { ok: true };
      return { ok: false, status: 403, error: "forbidden" };
    }
  }

  // Legacy anon callers (pg_net triggers / cron). Narrow blast radius.
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  if (opts.allowCronEscalate) {
    const { data: ev } = await admin.from("ts_request_events")
      .select("id")
      .eq("request_id", opts.requestId)
      .eq("status", "escalated")
      .eq("actor_type", "system")
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (ev) return { ok: true };
  }
  if (opts.allowRecentStatusChange) {
    const { data: r } = await admin.from("ts_service_requests")
      .select("updated_at")
      .eq("id", opts.requestId)
      .maybeSingle();
    if (r?.updated_at && new Date(r.updated_at).getTime() >= Date.now() - 10 * 60_000) {
      return { ok: true };
    }
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}

export function serviceAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
