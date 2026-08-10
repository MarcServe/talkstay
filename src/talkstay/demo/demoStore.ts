import type {
  InsightsData,
  OpsQueueData,
  OpsRequest,
  OpsTimeRange,
  RequestDetailData,
} from "@/talkstay/lib/data";
import type { Hotel } from "@/talkstay/lib/hotels";

export const DEMO_HOTEL_ID = "demo-hotel";
export const DEMO_ACTOR = "Alex Rivera · Front Desk";
export const DEMO_SESSION_KEY = "talkstay:demo-entered";

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const DEMO_HOTEL: Hotel = {
  id: DEMO_HOTEL_ID,
  user_id: "demo-user",
  assistant_id: null,
  name: "The Grand Hotel II (Demo)",
  slug: "grand-hotel-demo",
  timezone: "UTC",
  default_language: "English",
  whatsapp_number: null,
  whatsapp_enabled: false,
  is_active: true,
  branding: {
    primary_color: "#4c2bb8",
    tagline: "Rest easy. We're here for you.",
  },
};

type DemoDetail = RequestDetailData;

export type DemoState = {
  requests: OpsRequest[];
  ack: OpsQueueData["ack"];
  escalations: OpsQueueData["escalations"];
  escalationEvents: OpsQueueData["escalationEvents"];
  details: Record<string, DemoDetail>;
  insights: InsightsData;
  version: number;
};

function seedRequests(): OpsRequest[] {
  return [
    {
      id: "demo-req-1",
      room_id: "demo-room-412",
      department_key: "housekeeping",
      summary: "Extra towels and bath robes for room 412",
      summary_staff: "Guest asked for 2 towels + 1 bathrobe ASAP",
      status: "new",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(4),
      ts_rooms: { room_number: "412" },
    },
    {
      id: "demo-req-2",
      room_id: "demo-room-218",
      department_key: "maintenance",
      summary: "Air conditioning not cooling in room 218",
      summary_staff: "AC blowing warm air — guest uncomfortable",
      status: "accepted",
      priority: "urgent",
      is_complaint: true,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(38),
      ts_rooms: { room_number: "218" },
    },
    {
      id: "demo-req-3",
      room_id: "demo-room-507",
      department_key: "kitchen",
      summary: "Club sandwich and sparkling water to room 507",
      summary_staff: "Room service: club sandwich + San Pellegrino",
      status: "in_progress",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(22),
      ts_rooms: { room_number: "507" },
    },
    {
      id: "demo-req-4",
      room_id: "demo-room-105",
      department_key: "concierge",
      summary: "Taxi to the airport at 6:30am tomorrow",
      summary_staff: "Airport transfer request for 06:30",
      status: "on_the_way",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "fr",
      created_at: ago(95),
      ts_rooms: { room_number: "105" },
    },
    {
      id: "demo-req-5",
      room_id: "demo-room-330",
      department_key: "front_desk",
      summary: "What's the Wi-Fi password?",
      summary_staff: "FAQ answered — password sent to guest",
      status: "completed",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(180),
      ts_rooms: { room_number: "330" },
    },
    {
      id: "demo-req-6",
      room_id: "demo-room-612",
      department_key: "housekeeping",
      summary: "Room not cleaned after checkout time complaint",
      summary_staff: "Late clean — guest waiting to rest",
      status: "new",
      priority: "urgent",
      is_complaint: true,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(12),
      ts_rooms: { room_number: "612" },
    },
  ];
}

function seedDetail(r: OpsRequest): DemoDetail {
  const room = r.ts_rooms?.room_number ?? "—";
  const baseEvents = [
    {
      id: `${r.id}-ev-new`,
      request_id: r.id,
      status: "new",
      note: "Created from guest voice request",
      actor_type: "system",
      created_at: r.created_at,
    },
  ];
  if (r.status !== "new") {
    baseEvents.push({
      id: `${r.id}-ev-acc`,
      request_id: r.id,
      status: "accepted",
      note: DEMO_ACTOR,
      actor_type: "staff",
      created_at: ago(Math.max(1, (Date.now() - new Date(r.created_at).getTime()) / 60000 - 5)),
    });
  }
  if (["in_progress", "on_the_way", "completed", "guest_confirmed"].includes(r.status)) {
    baseEvents.push({
      id: `${r.id}-ev-ip`,
      request_id: r.id,
      status: "in_progress",
      note: DEMO_ACTOR,
      actor_type: "staff",
      created_at: ago(Math.max(1, (Date.now() - new Date(r.created_at).getTime()) / 60000 - 10)),
    });
  }
  if (["on_the_way", "completed", "guest_confirmed"].includes(r.status)) {
    baseEvents.push({
      id: `${r.id}-ev-otw`,
      request_id: r.id,
      status: "on_the_way",
      note: DEMO_ACTOR,
      actor_type: "staff",
      created_at: ago(Math.max(1, (Date.now() - new Date(r.created_at).getTime()) / 60000 - 15)),
    });
  }
  if (["completed", "guest_confirmed"].includes(r.status)) {
    baseEvents.push({
      id: `${r.id}-ev-done`,
      request_id: r.id,
      status: "completed",
      note: DEMO_ACTOR,
      actor_type: "staff",
      created_at: ago(Math.max(1, (Date.now() - new Date(r.created_at).getTime()) / 60000 - 20)),
    });
  }

  return {
    request: {
      ...r,
      hotel_id: DEMO_HOTEL_ID,
      intent: r.department_key,
      session_id: `demo-session-${r.id}`,
      conversation: null,
      updated_at: r.created_at,
    },
    events: baseEvents,
    messages: r.status === "completed"
      ? [{
          id: `${r.id}-msg-1`,
          sender: "staff",
          staff_label: DEMO_ACTOR,
          body: "Your Wi-Fi password is GrandGuest2026. Enjoy your stay!",
          body_guest: "Your Wi-Fi password is GrandGuest2026. Enjoy your stay!",
          created_at: ago(170),
        }]
      : [],
    chat: [
      {
        role: "user",
        content: r.summary,
        at: r.created_at,
      },
      {
        role: "assistant",
        content: `Got it — I've logged this for ${r.department_key.replace("_", " ")} in room ${room}. You'll get updates here.`,
        at: ago(Math.max(0.5, (Date.now() - new Date(r.created_at).getTime()) / 60000 - 0.5)),
      },
    ],
  };
}

function seedInsights(requests: OpsRequest[]): InsightsData {
  const now = Date.now();
  const interactions: InsightsData["interactions"] = [];
  for (let i = 0; i < 28; i++) {
    interactions.push({
      session_id: `demo-sess-${i % 9}`,
      role: i % 3 === 0 ? "assistant" : "user",
      content: i % 3 === 0 ? "Happy to help with that." : "Can you help with my room?",
      intent: i % 2 === 0 ? "service_request" : "faq",
      language: i % 5 === 0 ? "fr" : "en",
      created_at: new Date(now - i * 3_600_000).toISOString(),
    });
  }

  const insightRequests = requests.map((r) => ({
    id: r.id,
    room_id: r.room_id,
    department_key: r.department_key,
    summary: r.summary,
    status: r.status,
    is_complaint: r.is_complaint,
    classification_method: "voice",
    session_id: `demo-session-${r.id}`,
    created_at: r.created_at,
    updated_at: r.created_at,
    ts_rooms: r.ts_rooms,
  }));

  // Extra historical completed volume so charts look alive.
  for (let i = 0; i < 14; i++) {
    insightRequests.push({
      id: `demo-hist-${i}`,
      room_id: `demo-room-${100 + i}`,
      department_key: ["housekeeping", "kitchen", "maintenance", "concierge"][i % 4],
      summary: "Historical demo request",
      status: "completed",
      is_complaint: i % 7 === 0,
      classification_method: "voice",
      session_id: `demo-hist-sess-${i}`,
      created_at: new Date(now - (i + 1) * 8 * 3_600_000).toISOString(),
      updated_at: new Date(now - (i + 1) * 7 * 3_600_000).toISOString(),
      ts_rooms: { room_number: String(100 + i) },
    });
  }

  return {
    interactions,
    requests: insightRequests,
    ratings: [
      { request_id: "demo-req-5", rating: 5, comment: "Super fast!" },
      { request_id: "demo-hist-1", rating: 4, comment: null },
      { request_id: "demo-hist-3", rating: 5, comment: "Loved speaking instead of calling reception." },
      { request_id: "demo-hist-6", rating: 3, comment: "Took a bit longer than expected." },
    ],
    pulses: [
      {
        id: "demo-pulse-1",
        body: "Stay has been lovely overall — breakfast was excellent.",
        rating: 5,
        sentiment: "positive",
        severity: "low",
        department_key: "kitchen",
        issue_key: "general",
        issue_label: "General stay",
        request_id: null,
        acknowledged_at: null,
        created_at: ago(50),
        ts_rooms: { room_number: "412" },
      },
      {
        id: "demo-pulse-2",
        body: "AC issue made the afternoon uncomfortable.",
        rating: 2,
        sentiment: "negative",
        severity: "high",
        department_key: "maintenance",
        issue_key: "hvac",
        issue_label: "Climate",
        request_id: "demo-req-2",
        acknowledged_at: null,
        created_at: ago(30),
        ts_rooms: { room_number: "218" },
      },
    ],
    events: requests.flatMap((r) => [
      { request_id: r.id, status: "new", note: null, created_at: r.created_at },
      ...(r.status !== "new"
        ? [{ request_id: r.id, status: "accepted", note: DEMO_ACTOR, created_at: ago(20) }]
        : []),
      ...(["completed", "guest_confirmed"].includes(r.status)
        ? [{ request_id: r.id, status: "completed", note: DEMO_ACTOR, created_at: ago(15) }]
        : []),
    ]),
  };
}

export function createInitialDemoState(): DemoState {
  const requests = seedRequests();
  const details: Record<string, DemoDetail> = {};
  for (const r of requests) details[r.id] = seedDetail(r);

  const ack: OpsQueueData["ack"] = {};
  for (const r of requests) {
    if (r.status !== "new") {
      ack[r.id] = { by: DEMO_ACTOR, at: ago(15) };
    }
  }

  const escalations: OpsQueueData["escalations"] = {
    "demo-req-2": { note: "Guest called twice — still warm in the room", at: ago(10) },
  };
  const escalationEvents = [
    { id: "demo-esc-1", request_id: "demo-req-2", note: "Guest called twice — still warm in the room" },
  ];

  return {
    requests,
    ack,
    escalations,
    escalationEvents,
    details,
    insights: seedInsights(requests),
    version: 1,
  };
}

const OPS_MS: Record<OpsTimeRange, number | null> = {
  "24h": 24 * 3_600_000,
  "3d": 3 * 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
  all: null,
};

export function getDemoOpsQueue(state: DemoState, _timeRange: OpsTimeRange): OpsQueueData {
  const ms = OPS_MS[_timeRange];
  const open = new Set(["new", "accepted", "in_progress", "on_the_way", "reopened"]);
  const requests = state.requests.filter((r) => {
    if (open.has(r.status)) return true;
    if (ms == null) return true;
    return Date.now() - new Date(r.created_at).getTime() <= ms;
  });
  return {
    requests,
    ack: state.ack,
    escalations: state.escalations,
    escalationEvents: state.escalationEvents,
    fetchedAt: Date.now(),
  };
}

export function getDemoRequestDetail(state: DemoState, requestId: string): RequestDetailData | null {
  return state.details[requestId] ?? null;
}

export function advanceDemoRequest(
  state: DemoState,
  requestId: string,
  to: string,
  opts?: { cancelReason?: string; note?: string },
): DemoState {
  const req = state.requests.find((r) => r.id === requestId);
  if (!req || req.status === to) return state;

  const note = opts?.note
    ?? (to === "cancelled" && opts?.cancelReason
      ? `${DEMO_ACTOR} — ${opts.cancelReason}`
      : DEMO_ACTOR);
  const at = new Date().toISOString();

  const requests = state.requests.map((r) =>
    r.id === requestId ? { ...r, status: to } : r,
  );

  const details = { ...state.details };
  const prev = details[requestId] ?? seedDetail(req);
  details[requestId] = {
    ...prev,
    request: { ...prev.request, status: to, updated_at: at },
    events: [
      ...prev.events,
      {
        id: `${requestId}-ev-${to}-${Date.now()}`,
        request_id: requestId,
        status: to,
        note,
        actor_type: "staff",
        created_at: at,
      },
    ],
  };

  const ack = { ...state.ack };
  if (to === "accepted" && !ack[requestId]) {
    ack[requestId] = { by: DEMO_ACTOR, at };
  }

  const insights: InsightsData = {
    ...state.insights,
    requests: state.insights.requests.map((r) =>
      r.id === requestId ? { ...r, status: to, updated_at: at } : r,
    ),
    events: [
      ...state.insights.events,
      { request_id: requestId, status: to, note, created_at: at },
    ],
  };

  return {
    ...state,
    requests,
    ack,
    details,
    insights,
    version: state.version + 1,
  };
}

export function escalateDemoRequest(state: DemoState, requestId: string): DemoState {
  const at = new Date().toISOString();
  const note = "Escalated in demo — marked urgent";
  const escId = `demo-esc-${Date.now()}`;
  const requests = state.requests.map((r) =>
    r.id === requestId ? { ...r, priority: "urgent" } : r,
  );
  const details = { ...state.details };
  const prev = details[requestId];
  if (prev) {
    details[requestId] = {
      ...prev,
      request: { ...prev.request, priority: "urgent", updated_at: at },
      events: [
        ...prev.events,
        {
          id: `${requestId}-ev-esc-${Date.now()}`,
          request_id: requestId,
          status: "escalated",
          note: DEMO_ACTOR,
          actor_type: "staff",
          created_at: at,
        },
      ],
    };
  }
  return {
    ...state,
    requests,
    escalations: {
      ...state.escalations,
      [requestId]: { note, at },
    },
    escalationEvents: [
      ...state.escalationEvents,
      { id: escId, request_id: requestId, note },
    ],
    details,
    version: state.version + 1,
  };
}

export function replyDemoRequest(state: DemoState, requestId: string, body: string): DemoState {
  const at = new Date().toISOString();
  const details = { ...state.details };
  const prev = details[requestId];
  if (!prev) return state;
  details[requestId] = {
    ...prev,
    messages: [
      ...prev.messages,
      {
        id: `${requestId}-msg-${Date.now()}`,
        sender: "staff",
        staff_label: DEMO_ACTOR,
        body,
        body_guest: body,
        created_at: at,
      },
    ],
    chat: [
      ...prev.chat,
      {
        role: "assistant",
        content: body,
        at,
      },
    ],
  };
  return { ...state, details, version: state.version + 1 };
}

export function ackDemoPulse(state: DemoState, pulseId: string): DemoState {
  const at = new Date().toISOString();
  return {
    ...state,
    insights: {
      ...state.insights,
      pulses: state.insights.pulses.map((p) =>
        p.id === pulseId ? { ...p, acknowledged_at: at } : p,
      ),
    },
    version: state.version + 1,
  };
}
