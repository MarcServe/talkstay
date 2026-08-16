import { supabase } from "@/integrations/supabase/client";
import {
  applyPartnersSettings,
  partnerCommissionAmount,
} from "@/talkstay/lib/partners";

/** Invoke talkstay-admin and surface the function's JSON `error` when status is non-2xx. */
export async function adminApi<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("talkstay-admin", {
    body: { action, ...body },
  });

  if (data && typeof data === "object" && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }

  if (error) {
    let detail = error.message || "Admin request failed";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const clone = typeof ctx.clone === "function" ? ctx.clone() : ctx;
        const text = await clone.text();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string };
            if (parsed?.error) detail = parsed.error;
            else detail = text.slice(0, 400);
          } catch {
            detail = text.slice(0, 400);
          }
        }
      }
    } catch {
      /* keep generic message */
    }
    throw new Error(detail);
  }

  return data as T;
}

/** True when the deployed edge function doesn't know this action yet. */
export function isUnknownAdminAction(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /unknown action|non-2xx|failed to send|functions?\.invoke/i.test(msg);
}

async function tryAdminApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T | null> {
  try {
    return await adminApi<T>(action, body);
  } catch (e) {
    if (isUnknownAdminAction(e)) return null;
    // Table/column missing on edge path — let caller fall back
    const msg = e instanceof Error ? e.message : "";
    if (/does not exist|column|relation|schema cache/i.test(msg)) return null;
    throw e;
  }
}

// ── Settings (direct DB — platform admin RLS on ts_platform_settings) ────────

export async function loadPlatformSettings(): Promise<{
  settings: Record<string, unknown>;
  missingTable?: boolean;
  via: "edge" | "direct";
}> {
  const edge = await tryAdminApi<{ settings: Record<string, unknown>; missingTable?: boolean }>("get_settings");
  if (edge) return { ...edge, via: "edge" };

  const { data, error } = await supabase
    .from("ts_platform_settings")
    .select("key, value");
  if (error) {
    if (/does not exist|relation/i.test(error.message)) {
      return { settings: {}, missingTable: true, via: "direct" };
    }
    throw new Error(error.message);
  }
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return { settings, via: "direct" };
}

export async function savePlatformSetting(key: string, value: unknown): Promise<{ via: "edge" | "direct" }> {
  const edge = await tryAdminApi("update_settings", { key, value });
  if (edge) return { via: "edge" };

  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("ts_platform_settings").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id ?? null,
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  return { via: "direct" };
}

// ── Hotel patch (platform admin can update any hotel via RLS) ────────────────

export async function updateHotelAdmin(
  hotelId: string,
  patch: Record<string, unknown>,
): Promise<{ hotel: Record<string, unknown>; via: "edge" | "direct" }> {
  const edge = await tryAdminApi<{ hotel: Record<string, unknown> }>("update_hotel", {
    hotelId,
    ...patch,
  });
  if (edge?.hotel) return { hotel: edge.hotel, via: "edge" };

  const { data, error } = await supabase
    .from("ts_hotels")
    .update(patch)
    .eq("id", hotelId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Hotel not found or you lack admin access");
  return { hotel: data as Record<string, unknown>, via: "direct" };
}

// ── Usage meters (direct aggregation — works without edge redeploy) ──────────

type BillingCfg = {
  currency: string;
  primary_meter: string;
  rate_active_qr: number;
  rate_session: number;
  rate_guest_turn: number;
  rate_request: number;
  include_inactive_hotels: boolean;
};

const DEFAULT_BILLING: BillingCfg = {
  currency: "GBP",
  primary_meter: "active_qr",
  rate_active_qr: 15,
  rate_session: 0.5,
  rate_guest_turn: 0.05,
  rate_request: 0.25,
  include_inactive_hotels: false,
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

type LlmCostAgg = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  calls: number;
};

async function loadLlmCostByHotelRoom(opts: {
  sinceIso: string;
  untilIso: string;
  hotelIds: string[];
}): Promise<{
  byHotel: Map<string, LlmCostAgg>;
  byRoom: Map<string, LlmCostAgg>; // hotelId::roomId
  missingTable?: boolean;
}> {
  const byHotel = new Map<string, LlmCostAgg>();
  const byRoom = new Map<string, LlmCostAgg>();
  const empty = (): LlmCostAgg => ({
    prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0, calls: 0,
  });
  const add = (map: Map<string, LlmCostAgg>, key: string, row: {
    prompt_tokens: number; completion_tokens: number; total_tokens: number; cost_usd: number;
  }) => {
    const cur = map.get(key) ?? empty();
    cur.prompt_tokens += row.prompt_tokens;
    cur.completion_tokens += row.completion_tokens;
    cur.total_tokens += row.total_tokens;
    cur.cost_usd += row.cost_usd;
    cur.calls += 1;
    map.set(key, cur);
  };

  if (!opts.hotelIds.length) return { byHotel, byRoom };

  const chunk = <T,>(arr: T[], n: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  for (const ids of chunk(opts.hotelIds, 80)) {
    const { data, error } = await supabase
      .from("ts_llm_calls")
      .select("hotel_id, room_id, prompt_tokens, completion_tokens, total_tokens, cost_usd")
      .in("hotel_id", ids)
      .gte("created_at", opts.sinceIso)
      .lt("created_at", opts.untilIso)
      .limit(50000);
    if (error) {
      if (/does not exist|relation|schema cache/i.test(error.message)) {
        return { byHotel, byRoom, missingTable: true };
      }
      // Non-fatal — usage page still works without COGS
      console.warn("ts_llm_calls:", error.message);
      return { byHotel, byRoom };
    }
    for (const r of data ?? []) {
      const prompt = Number(r.prompt_tokens) || 0;
      const completion = Number(r.completion_tokens) || 0;
      const total = Number(r.total_tokens) || prompt + completion;
      const cost = Number(r.cost_usd) || 0;
      const payload = { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total, cost_usd: cost };
      add(byHotel, r.hotel_id, payload);
      if (r.room_id) add(byRoom, `${r.hotel_id}::${r.room_id}`, payload);
    }
  }

  for (const v of byHotel.values()) v.cost_usd = Math.round(v.cost_usd * 1e6) / 1e6;
  for (const v of byRoom.values()) v.cost_usd = Math.round(v.cost_usd * 1e6) / 1e6;
  return { byHotel, byRoom };
}

function enrichUsageWithLlmCosts(
  payload: Record<string, unknown>,
  llm: Awaited<ReturnType<typeof loadLlmCostByHotelRoom>>,
): Record<string, unknown> {
  const hotels = Array.isArray(payload.hotels) ? payload.hotels as any[] : [];
  const enrichedHotels = hotels.map((h) => {
    const hotelCost = llm.byHotel.get(h.hotel_id) ?? {
      prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0, calls: 0,
    };
    const rooms = Array.isArray(h.rooms)
      ? h.rooms.map((r: any) => {
        const rc = llm.byRoom.get(`${h.hotel_id}::${r.room_id}`) ?? {
          prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0, calls: 0,
        };
        return {
          ...r,
          prompt_tokens: rc.prompt_tokens,
          completion_tokens: rc.completion_tokens,
          total_tokens: rc.total_tokens,
          ai_cost_usd: rc.cost_usd,
          ai_calls: rc.calls,
        };
      })
      : h.rooms;
    return {
      ...h,
      meters: {
        ...(h.meters ?? {}),
        prompt_tokens: hotelCost.prompt_tokens,
        completion_tokens: hotelCost.completion_tokens,
        total_tokens: hotelCost.total_tokens,
        ai_cost_usd: hotelCost.cost_usd,
        ai_calls: hotelCost.calls,
      },
      rooms,
    };
  });

  const totals = (payload.totals && typeof payload.totals === "object")
    ? { ...(payload.totals as object) as Record<string, unknown> }
    : {};
  let aiCost = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let aiCalls = 0;
  for (const h of enrichedHotels) {
    aiCost += Number(h.meters?.ai_cost_usd) || 0;
    promptTokens += Number(h.meters?.prompt_tokens) || 0;
    completionTokens += Number(h.meters?.completion_tokens) || 0;
    aiCalls += Number(h.meters?.ai_calls) || 0;
  }

  const hotelId = (payload as any).hotel?.hotel_id;
  const hotel = hotelId
    ? enrichedHotels.find((h) => h.hotel_id === hotelId) ?? (payload as any).hotel
    : (payload as any).hotel;

  return {
    ...payload,
    hotels: enrichedHotels,
    hotel,
    totals: {
      ...totals,
      ai_cost_usd: Math.round(aiCost * 1e6) / 1e6,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      ai_calls: aiCalls,
    },
    llm_cost_ready: !llm.missingTable,
    llm_cost_missing_table: !!llm.missingTable,
  };
}

function suggestCharge(
  rates: { currency: string; primary_meter: string; rate_active_qr: number; rate_session: number; rate_guest_turn: number; rate_request: number },
  m: { active_qr: number; sessions: number; guest_turns: number; requests: number },
) {
  let units = m.active_qr;
  let rate = rates.rate_active_qr;
  if (rates.primary_meter === "session") { units = m.sessions; rate = rates.rate_session; }
  else if (rates.primary_meter === "guest_turn") { units = m.guest_turns; rate = rates.rate_guest_turn; }
  else if (rates.primary_meter === "request") { units = m.requests; rate = rates.rate_request; }
  return {
    primary_meter: rates.primary_meter,
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
}

export async function loadUsageSummary(opts: {
  days?: number;
  hotelId?: string;
}): Promise<Record<string, unknown>> {
  const days = Math.max(1, Math.min(366, opts.days || 30));
  const hotelId = opts.hotelId?.trim() || "";
  const action = hotelId ? "usage_hotel" : "usage_summary";

  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();

  const edge = await tryAdminApi<Record<string, unknown>>(action, {
    days,
    ...(hotelId ? { hotelId } : {}),
  });

  let payload: Record<string, unknown>;
  if (edge) {
    payload = { ...edge, via: "edge" };
  } else {
    payload = await loadUsageSummaryDirect({ days, hotelId, sinceIso, untilIso });
  }

  const hotelList = Array.isArray(payload.hotels) ? (payload.hotels as any[]) : [];
  const hotelIds = hotelList.map((h) => h.hotel_id).filter(Boolean);
  const llm = await loadLlmCostByHotelRoom({ sinceIso: String(payload.since ?? sinceIso), untilIso: String(payload.until ?? untilIso), hotelIds });
  const withLlm = enrichUsageWithLlmCosts(payload, llm);
  return enrichUsageWithPartnerCommission(withLlm);
}

async function loadUsageSummaryDirect(opts: {
  days: number;
  hotelId: string;
  sinceIso: string;
  untilIso: string;
}): Promise<Record<string, unknown>> {
  const { days, hotelId, sinceIso, untilIso } = opts;

  const settingsRes = await loadPlatformSettings();
  const billing: BillingCfg = {
    ...DEFAULT_BILLING,
    ...((settingsRes.settings.billing as object) ?? {}),
  };

  let hotelQuery = supabase
    .from("ts_hotels")
    .select("id, name, slug, is_active, billing_mode, billing_notes, billing_rates, referral_code, created_at")
    .order("name")
    .limit(500);
  if (hotelId) hotelQuery = hotelQuery.eq("id", hotelId);
  else if (!billing.include_inactive_hotels) hotelQuery = hotelQuery.eq("is_active", true);

  let { data: hotels, error: hotelsErr } = await hotelQuery;
  if (hotelsErr) {
    let fb = supabase.from("ts_hotels").select("id, name, slug, is_active, created_at").order("name").limit(500);
    if (hotelId) fb = fb.eq("id", hotelId);
    else if (!billing.include_inactive_hotels) fb = fb.eq("is_active", true);
    const retry = await fb;
    if (retry.error) throw new Error(retry.error.message);
    hotels = retry.data as any;
  }

  const hotelList = hotels ?? [];
  const hotelIds = hotelList.map((h: any) => h.id);

  type Agg = { guest_turns: number; sessions: Set<string>; requests: number };
  const byKey = new Map<string, Agg>();

  const ensure = (hotel_id: string, room_id: string | null) => {
    const key = `${hotel_id}::${room_id ?? ""}`;
    let row = byKey.get(key);
    if (!row) {
      row = { guest_turns: 0, sessions: new Set(), requests: 0 };
      byKey.set(key, row);
    }
    return row;
  };

  const chunk = <T,>(arr: T[], n: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  if (hotelIds.length) {
    for (const ids of chunk(hotelIds, 80)) {
      const [{ data: ix }, { data: rq }] = await Promise.all([
        supabase.from("ts_interactions")
          .select("hotel_id, room_id, session_id, role")
          .in("hotel_id", ids)
          .eq("role", "guest")
          .gte("created_at", sinceIso)
          .lt("created_at", untilIso)
          .limit(20000),
        supabase.from("ts_service_requests")
          .select("hotel_id, room_id")
          .in("hotel_id", ids)
          .gte("created_at", sinceIso)
          .lt("created_at", untilIso)
          .limit(20000),
      ]);
      for (const r of ix ?? []) {
        const row = ensure(r.hotel_id, r.room_id ?? null);
        row.guest_turns += 1;
        if (r.session_id) row.sessions.add(r.session_id);
      }
      for (const r of rq ?? []) {
        ensure(r.hotel_id, r.room_id ?? null).requests += 1;
      }
    }
  }

  let rooms: any[] = [];
  let tokens: { room_id: string; token: string }[] = [];
  if (hotelIds.length) {
    for (const ids of chunk(hotelIds, 80)) {
      let roomRes = await supabase
        .from("ts_rooms")
        .select("id, hotel_id, room_number, is_active, is_public")
        .in("hotel_id", ids)
        .order("room_number");
      if (roomRes.error) {
        roomRes = await supabase
          .from("ts_rooms")
          .select("id, hotel_id, room_number, is_active")
          .in("hotel_id", ids)
          .order("room_number");
      }
      const tokRes = await supabase
        .from("ts_room_tokens")
        .select("room_id, token")
        .in("hotel_id", ids)
        .eq("is_active", true);
      rooms = rooms.concat(roomRes.data ?? []);
      tokens = tokens.concat((tokRes.data as any) ?? []);
    }
  }

  const tokenByRoom = new Map(tokens.map((t) => [t.room_id, t.token]));
  const roomsByHotel = new Map<string, any[]>();
  for (const r of rooms) {
    const list = roomsByHotel.get(r.hotel_id) ?? [];
    list.push(r);
    roomsByHotel.set(r.hotel_id, list);
  }

  const PUBLIC_BASE = "https://talkstay.talkweb.io";

  const hotelSummaries = hotelList.map((h: any) => {
    const o = (h.billing_rates && typeof h.billing_rates === "object") ? h.billing_rates : {};
    const rates = {
      currency: String(o.currency ?? billing.currency),
      primary_meter: String(o.primary_meter ?? billing.primary_meter),
      rate_active_qr: Number(o.rate_active_qr ?? billing.rate_active_qr) || 0,
      rate_session: Number(o.rate_session ?? billing.rate_session) || 0,
      rate_guest_turn: Number(o.rate_guest_turn ?? billing.rate_guest_turn) || 0,
      rate_request: Number(o.rate_request ?? billing.rate_request) || 0,
    };
    const hotelRooms = roomsByHotel.get(h.id) ?? [];
    const roomRows = hotelRooms.map((room: any) => {
      const key = `${h.id}::${room.id}`;
      const agg = byKey.get(key);
      const guest_turns = agg?.guest_turns ?? 0;
      const sessions = agg?.sessions.size ?? 0;
      const requests = agg?.requests ?? 0;
      const engaged = sessions > 0 || guest_turns > 0 || requests > 0;
      const token = tokenByRoom.get(room.id) ?? null;
      return {
        room_id: room.id,
        room_number: room.room_number,
        is_active: room.is_active,
        is_public: !!room.is_public,
        has_qr_token: !!token,
        token_preview: token ? `${token.slice(0, 8)}…` : null,
        guest_url: token
          ? `${PUBLIC_BASE}/h/${encodeURIComponent(h.slug)}/r/${room.id}?token=${encodeURIComponent(token)}`
          : null,
        guest_turns,
        sessions,
        requests,
        engaged,
      };
    });

    // Orphans
    let orphanTurns = 0, orphanSessions = 0, orphanRequests = 0;
    for (const [key, agg] of byKey) {
      if (!key.startsWith(`${h.id}::`)) continue;
      const rid = key.slice(h.id.length + 2);
      if (rid && hotelRooms.some((r: any) => r.id === rid)) continue;
      orphanTurns += agg.guest_turns;
      orphanSessions += agg.sessions.size;
      orphanRequests += agg.requests;
    }

    const guest_turns = roomRows.reduce((s: number, r: any) => s + r.guest_turns, 0) + orphanTurns;
    const sessions = roomRows.reduce((s: number, r: any) => s + r.sessions, 0) + orphanSessions;
    const requests = roomRows.reduce((s: number, r: any) => s + r.requests, 0) + orphanRequests;
    const active_qr = roomRows.filter((r: any) => r.engaged).length;
    const meters = { active_qr, sessions, guest_turns, requests };
    const charge = suggestCharge(rates, meters);

    return {
      hotel_id: h.id,
      name: h.name,
      slug: h.slug,
      is_active: h.is_active,
      billing_mode: h.billing_mode ?? "subscription",
      billing_notes: h.billing_notes ?? null,
      referral_code: h.referral_code ?? null,
      rates,
      meters,
      charge,
      room_count: hotelRooms.length,
      rooms: hotelId ? roomRows : undefined,
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

  return {
    since: sinceIso,
    until: untilIso,
    days,
    billing,
    totals: {
      ...totals,
      suggested: money(totals.suggested),
      currency: billing.currency,
      hotels: hotelSummaries.length,
    },
    hotels: hotelSummaries,
    hotel: hotelId ? hotelSummaries[0] ?? null : undefined,
    rollup_ready: false,
    via: "direct",
  };
}
