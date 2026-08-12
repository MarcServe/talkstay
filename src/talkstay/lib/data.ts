import { supabase } from "@/integrations/supabase/client";
import { getMyAccess, type HotelAccess } from "@/talkstay/lib/hotels";

/** Still-open statuses — never hidden by the operations time window. */
export const OPEN_STATUSES = [
  "new", "accepted", "in_progress", "on_the_way", "reopened", "escalated",
] as const;

export type OpsTimeRange = "24h" | "3d" | "7d" | "30d" | "all";
export type InsightsTimeRange = "24h" | "3d" | "7d" | "30d" | "90d";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export const OPS_TIME_MS: Record<OpsTimeRange, number | null> = {
  "24h": 24 * HOUR_MS,
  "3d": 3 * DAY_MS,
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
  all: null,
};

export const INSIGHTS_TIME_MS: Record<InsightsTimeRange, number> = {
  "24h": 24 * HOUR_MS,
  "3d": 3 * DAY_MS,
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
  "90d": 90 * DAY_MS,
};

export const talkstayKeys = {
  all: ["talkstay"] as const,
  access: (userId = "") => [...talkstayKeys.all, "access", userId] as const,
  ops: (hotelId: string, timeRange: OpsTimeRange) =>
    [...talkstayKeys.all, "ops", hotelId, timeRange] as const,
  opsHotel: (hotelId: string) => [...talkstayKeys.all, "ops", hotelId] as const,
  request: (id: string) => [...talkstayKeys.all, "request", id] as const,
  insights: (hotelId: string, timeRange: InsightsTimeRange) =>
    [...talkstayKeys.all, "insights", hotelId, timeRange] as const,
  insightsHotel: (hotelId: string) => [...talkstayKeys.all, "insights", hotelId] as const,
  rooms: (hotelId: string) => [...talkstayKeys.all, "rooms", hotelId] as const,
};

/** PostgREST `.in()` URLs blow up past ~100 uuids — chunk them (in parallel). */
async function selectInChunks<T>(
  table: string,
  select: string,
  column: string,
  ids: string[],
  order?: { column: string; ascending: boolean },
  // Deno/PostgREST builder typing is loose across table names — keep refine untyped.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refine?: (q: any) => any,
): Promise<T[]> {
  if (!ids.length) return [];
  const chunkSize = 80;
  const slices: string[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) slices.push(ids.slice(i, i + chunkSize));
  const parts = await Promise.all(slices.map(async (slice) => {
    let q = supabase.from(table).select(select).in(column, slice);
    if (refine) q = refine(q);
    if (order) q = q.order(order.column, { ascending: order.ascending });
    const { data, error } = await q;
    if (error) throw error;
    return (data as T[]) ?? [];
  }));
  return parts.flat();
}

// ─── Ops queue ───────────────────────────────────────────────────────────────

export type PaymentStatus = "unpaid" | "paid" | "waived";

export interface OpsRequest {
  id: string;
  room_id: string | null;
  department_key: string;
  summary: string;
  summary_staff: string | null;
  status: string;
  priority: string;
  is_complaint: boolean;
  needs_triage: boolean;
  guest_language: string | null;
  /** guest_chat | phone | walk_in | front_desk | repeat | pulse */
  source?: string | null;
  is_chargeable?: boolean | null;
  price?: number | null;
  currency?: string | null;
  /** unpaid | paid | waived — only meaningful when is_chargeable */
  payment_status?: PaymentStatus | null;
  created_at: string;
  ts_rooms?: { room_number: string } | null;
}

export interface OpsQueueData {
  requests: OpsRequest[];
  ack: Record<string, { by: string; at: string }>;
  escalations: Record<string, { note: string | null; at: string; kind?: GuestSignalKind }>;
  /** Latest "who's handling" mark from assigned events. */
  handlers: Record<string, { by: string; at: string }>;
  /** Latest internal team note preview. */
  notes: Record<string, { note: string; at: string }>;
  /** Escalation events (for chime dedupe by event id). */
  escalationEvents: { id: string; request_id: string; note: string | null; kind?: GuestSignalKind }[];
  fetchedAt: number;
}

export type GuestSignalKind = "remind" | "update" | "cancel" | "followup";

function guestSignalKind(status: string, note: string | null): GuestSignalKind {
  if (status === "guest_updated" || status === "updated") return "update";
  if (status === "guest_reminded") return "remind";
  if (status === "guest_cancelled") return "cancel";
  const n = (note ?? "").toLowerCase();
  if (n.includes("updated")) return "update";
  if (n.includes("remind") || n.includes("still waiting")) return "remind";
  if (n.includes("cancel")) return "cancel";
  return "followup";
}

const OPS_SELECT_FULL =
  "id, room_id, department_key, summary, summary_staff, status, priority, is_complaint, needs_triage, guest_language, source, is_chargeable, price, currency, payment_status, created_at, ts_rooms(room_number)";
const OPS_SELECT_NO_PAYMENT =
  "id, room_id, department_key, summary, summary_staff, status, priority, is_complaint, needs_triage, guest_language, source, is_chargeable, price, currency, created_at, ts_rooms(room_number)";
const OPS_SELECT_LEGACY =
  "id, room_id, department_key, summary, summary_staff, status, priority, is_complaint, needs_triage, guest_language, created_at, ts_rooms(room_number)";

export async function fetchOpsQueue(hotelId: string, timeRange: OpsTimeRange): Promise<OpsQueueData> {
  const ms = OPS_TIME_MS[timeRange];
  // Split open vs closed: a single `.limit(200)` on mixed rows hides older open
  // tickets once a busy property has more than 200 matching rows.
  const load = async (select: string) => {
    const openQ = supabase
      .from("ts_service_requests")
      .select(select)
      .eq("hotel_id", hotelId)
      .in("status", [...OPEN_STATUSES])
      .order("created_at", { ascending: false })
      .limit(500);

    let closedQ = supabase
      .from("ts_service_requests")
      .select(select)
      .eq("hotel_id", hotelId)
      .not("status", "in", `(${OPEN_STATUSES.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(150);
    if (ms != null) {
      closedQ = closedQ.gte("created_at", new Date(Date.now() - ms).toISOString());
    }
    return Promise.all([openQ, closedQ]);
  };

  let [openRes, closedRes] = await load(OPS_SELECT_FULL);
  // Before payment_status migration lands, fall back without that column.
  if (
    openRes.error?.message?.includes("payment_status") ||
    closedRes.error?.message?.includes("payment_status")
  ) {
    [openRes, closedRes] = await load(OPS_SELECT_NO_PAYMENT);
  }
  // Before migration 20260810000006 lands, `source` isn't selectable yet.
  if (
    openRes.error?.message?.includes("source") ||
    closedRes.error?.message?.includes("source")
  ) {
    [openRes, closedRes] = await load(OPS_SELECT_LEGACY);
  }
  if (openRes.error) throw openRes.error;
  if (closedRes.error) throw closedRes.error;

  const seen = new Set<string>();
  const requests: OpsRequest[] = [];
  for (const row of [...(openRes.data ?? []), ...(closedRes.data ?? [])] as unknown as OpsRequest[]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    requests.push(row);
  }
  requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const ids = requests.map((r) => r.id);
  // Only ack + escalation events — keeps the second hop small as the queue grows.
  const events = await selectInChunks<{
    id: string; request_id: string; status: string; note: string | null; created_at: string;
  }>(
    "ts_request_events",
    "id, request_id, status, note, created_at",
    "request_id",
    ids,
    { column: "created_at", ascending: false },
    (q) => q.in("status", [
      "accepted", "escalated", "assigned", "staff_note", "forwarded",
      "guest_updated", "guest_reminded", "guest_cancelled", "updated",
    ]),
  );

  const ack: OpsQueueData["ack"] = {};
  const escalations: OpsQueueData["escalations"] = {};
  const handlers: OpsQueueData["handlers"] = {};
  const notes: OpsQueueData["notes"] = {};
  const escalationEvents: OpsQueueData["escalationEvents"] = [];
  for (const e of events) {
    if (e.status === "accepted" && !ack[e.request_id]) {
      ack[e.request_id] = { by: e.note || "staff", at: e.created_at };
    }
    if (
      e.status === "escalated"
      || e.status === "guest_updated"
      || e.status === "guest_reminded"
      || e.status === "guest_cancelled"
      || e.status === "updated"
    ) {
      const kind = guestSignalKind(e.status, e.note);
      escalationEvents.push({ id: e.id, request_id: e.request_id, note: e.note, kind });
      if (!escalations[e.request_id]) {
        escalations[e.request_id] = { note: e.note, at: e.created_at, kind };
      }
    }
    if (e.status === "assigned" && !handlers[e.request_id]) {
      handlers[e.request_id] = { by: e.note || "staff", at: e.created_at };
    }
    if (e.status === "staff_note" && !notes[e.request_id]) {
      notes[e.request_id] = { note: e.note || "", at: e.created_at };
    }
  }

  return { requests, ack, escalations, handlers, notes, escalationEvents, fetchedAt: Date.now() };
}

// ─── Request detail (batched) ────────────────────────────────────────────────

export interface RequestDetailRow {
  id: string;
  hotel_id: string;
  room_id: string | null;
  department_key: string;
  intent: string | null;
  summary: string;
  summary_staff: string | null;
  status: string;
  priority: string;
  is_complaint: boolean;
  needs_triage: boolean;
  guest_language: string | null;
  session_id: string | null;
  conversation: unknown;
  is_chargeable?: boolean | null;
  price?: number | null;
  currency?: string | null;
  payment_status?: PaymentStatus | null;
  created_at: string;
  updated_at: string;
  ts_rooms?: { room_number: string } | null;
}

export interface RequestDetailData {
  request: RequestDetailRow;
  events: { id: string; status: string; actor_type: string | null; note: string | null; created_at: string }[];
  messages: {
    id: string; sender: string; staff_label: string | null;
    body: string; body_guest: string | null; created_at: string;
  }[];
  chat: { role: string; content: string; at?: string; intent?: string | null }[];
}

const DETAIL_SELECT =
  "id, hotel_id, room_id, department_key, intent, summary, summary_staff, status, priority, is_complaint, needs_triage, guest_language, session_id, conversation, is_chargeable, price, currency, payment_status, created_at, updated_at, ts_rooms(room_number)";
const DETAIL_SELECT_NO_PAYMENT =
  "id, hotel_id, room_id, department_key, intent, summary, summary_staff, status, priority, is_complaint, needs_triage, guest_language, session_id, conversation, is_chargeable, price, currency, created_at, updated_at, ts_rooms(room_number)";
const DETAIL_SELECT_LEGACY =
  "id, hotel_id, room_id, department_key, intent, summary, summary_staff, status, priority, is_complaint, needs_triage, guest_language, session_id, conversation, created_at, updated_at, ts_rooms(room_number)";

export async function fetchRequestDetail(requestId: string): Promise<RequestDetailData> {
  // Kick request + events + messages in parallel; chat needs session siblings after.
  let rowRes = await supabase.from("ts_service_requests").select(DETAIL_SELECT).eq("id", requestId).maybeSingle();
  if (rowRes.error?.message?.includes("payment_status")) {
    rowRes = await supabase.from("ts_service_requests").select(DETAIL_SELECT_NO_PAYMENT).eq("id", requestId).maybeSingle();
  }
  if (rowRes.error?.message?.includes("is_chargeable") || rowRes.error?.message?.includes("price")) {
    rowRes = await supabase.from("ts_service_requests").select(DETAIL_SELECT_LEGACY).eq("id", requestId).maybeSingle();
  }
  const [evRes, msgRes] = await Promise.all([
    supabase.from("ts_request_events")
      .select("id, status, actor_type, note, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
    supabase.from("ts_request_messages")
      .select("id, sender, staff_label, body, body_guest, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
  ]);

  if (rowRes.error || !rowRes.data) {
    throw new Error(rowRes.error?.message ?? "Couldn't load that request.");
  }
  const request = rowRes.data as unknown as RequestDetailRow;
  const events = (evRes.data as RequestDetailData["events"]) ?? [];
  const messages = (msgRes.data as RequestDetailData["messages"]) ?? [];

  let chat: RequestDetailData["chat"] = [];
  if (request.session_id) {
    const { data: siblings } = await supabase
      .from("ts_service_requests")
      .select("id, created_at")
      .eq("hotel_id", request.hotel_id)
      .eq("session_id", request.session_id)
      .order("created_at", { ascending: true });

    const list = siblings ?? [];
    const idx = list.findIndex((s) => s.id === request.id);
    const createdMs = new Date(request.created_at).getTime();
    const prevEnd = idx > 0 ? new Date(list[idx - 1].created_at).getTime() : 0;
    const windowStartIso = new Date(Math.max(prevEnd, createdMs - 20 * 60_000)).toISOString();
    const windowEndIso = idx >= 0 && idx < list.length - 1
      ? list[idx + 1].created_at
      : new Date(createdMs + 2 * 60 * 60_000).toISOString();

    const { data: ix } = await supabase
      .from("ts_interactions")
      .select("role, content, intent, created_at")
      .eq("hotel_id", request.hotel_id)
      .eq("session_id", request.session_id)
      .gte("created_at", windowStartIso)
      .lt("created_at", windowEndIso)
      .order("created_at", { ascending: true })
      .limit(100);

    if (ix?.length) {
      chat = ix
        .filter((t) => !!t.content)
        .map((t) => ({
          role: t.role, content: t.content as string,
          at: t.created_at, intent: t.intent,
        }));
    }
  }

  if (!chat.length && Array.isArray(request.conversation)) {
    chat = (request.conversation as Array<{ role?: string; content?: string; text?: string; at?: string; created_at?: string }>)
      .filter((t) => t?.content || t?.text)
      .map((t) => ({
        role: String(t.role === "user" ? "guest" : (t.role ?? "guest")),
        content: String(t.content ?? t.text ?? ""),
        at: t.at ?? t.created_at,
      }));
  }

  return { request, events, messages, chat };
}

// ─── Insights (one batched round-trip) ───────────────────────────────────────

export interface InsightsData {
  interactions: {
    session_id: string | null; role: string; content: string | null;
    intent: string | null; language: string | null; created_at: string;
  }[];
  requests: {
    id: string; room_id: string | null; department_key: string; summary: string;
    status: string; is_complaint: boolean; is_chargeable?: boolean | null;
    price?: number | null; payment_status?: PaymentStatus | null;
    classification_method: string | null;
    session_id: string | null; created_at: string; updated_at: string;
    ts_rooms?: { room_number: string } | null;
  }[];
  ratings: {
    request_id: string; rating: number; comment: string | null; created_at: string;
    ts_service_requests?: {
      summary: string; room_id: string | null;
      ts_rooms?: { room_number: string } | null;
    } | null;
  }[];
  pulses: {
    id: string; body: string; rating: number | null; sentiment: string; severity: string;
    department_key: string | null; issue_key: string; issue_label: string | null;
    request_id: string | null; acknowledged_at: string | null; created_at: string;
    ts_rooms?: { room_number: string } | null;
  }[];
  events: { request_id: string; status: string; note: string | null; created_at: string }[];
}

const PERIOD_DAYS = 30;

export async function fetchInsights(hotelId: string, timeRange: InsightsTimeRange): Promise<InsightsData> {
  const sinceIso = new Date(Date.now() - INSIGHTS_TIME_MS[timeRange]).toISOString();
  // Pulses need a longer window for “are we improving?” (current 30d vs prior 30d).
  const pulseSince = new Date(Date.now() - PERIOD_DAYS * 2 * DAY_MS).toISOString();

  const [{ data: ix }, { data: rq }, { data: rv }, { data: pl }] = await Promise.all([
    supabase.from("ts_interactions").select("session_id, role, content, intent, language, created_at")
      .eq("hotel_id", hotelId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false }).limit(1000),
    supabase.from("ts_service_requests")
      .select("id, room_id, department_key, summary, status, is_complaint, is_chargeable, price, payment_status, classification_method, session_id, created_at, updated_at, ts_rooms(room_number)")
      .eq("hotel_id", hotelId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false }).limit(500),
    // Reviews by when the guest rated — not when the request was opened.
    supabase.from("ts_request_reviews")
      .select("request_id, rating, comment, created_at, ts_service_requests(summary, room_id, ts_rooms(room_number))")
      .eq("hotel_id", hotelId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("ts_guest_pulse")
      .select("id, body, rating, sentiment, severity, department_key, issue_key, issue_label, request_id, acknowledged_at, created_at, ts_rooms(room_number)")
      .eq("hotel_id", hotelId)
      .gte("created_at", pulseSince)
      .order("created_at", { ascending: false }).limit(1000),
  ]);

  const requests = (rq as unknown as InsightsData["requests"]) ?? [];
  const ids = requests.map((r) => r.id);
  // Only lifecycle events Insights needs — not every note/status ping.
  const events = await selectInChunks<InsightsData["events"][number]>(
    "ts_request_events",
    "request_id, status, note, created_at",
    "request_id",
    ids,
    { column: "created_at", ascending: true },
    (q) => q.in("status", ["accepted", "completed", "guest_confirmed", "reopened", "escalated", "cancelled"]),
  );

  return {
    interactions: (ix as unknown as InsightsData["interactions"]) ?? [],
    requests,
    ratings: (rv as unknown as InsightsData["ratings"]) ?? [],
    pulses: (pl as unknown as InsightsData["pulses"]) ?? [],
    events,
  };
}

export async function fetchAccess(): Promise<HotelAccess> {
  return getMyAccess();
}
