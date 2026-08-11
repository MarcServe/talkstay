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
  require_checkin_code: false,
  branding: {
    primary_color: "#4c2bb8",
    tagline: "Rest easy. We're here for you.",
    guest_bg_wash: 0.78,
    poster: {
      bg_image_url: "/marketing/guest-square.jpg",
    },
    property: {
      type: "hotel",
      address: "18 Pier Parade",
      city: "Brighton",
      region: "East Sussex",
      country: "United Kingdom",
      postcode: "BN2 1TL",
      room_count: 48,
      property_count: 1,
    },
  },
};

export type DemoRoom = {
  id: string;
  room_number: string;
  floor: string | null;
  occupancy_status: "occupied" | "vacant";
  checkin_code: string | null;
  token: string;
  /** Lobby / bar / shared space — no check-in code required. */
  is_public?: boolean;
};

export type DemoStaff = {
  id: string;
  name: string;
  email: string;
  department_key: string | null;
  role: string;
  status: string;
};

export type DemoDepartment = {
  id: string;
  key: string;
  display_name: string;
  is_active: boolean;
  notify_email: string | null;
  escalate_after_minutes: number;
};

export type DemoKnowledge = {
  id: string;
  title: string;
  kind: string;
  preview: string;
  /** Mirrors real knowledge scopes: site | general | department | room */
  scope: "site" | "general" | "department" | "room";
  department_key: string | null;
};

type DemoDetail = RequestDetailData;

export type DemoState = {
  hotel: Hotel;
  rooms: DemoRoom[];
  departments: DemoDepartment[];
  staff: DemoStaff[];
  knowledge: DemoKnowledge[];
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
    {
      id: "demo-req-7",
      room_id: "demo-room-306",
      department_key: "bar",
      summary: "Two espresso martinis to room 306",
      summary_staff: "Bar: 2× espresso martini — charge to room",
      status: "new",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(8),
      ts_rooms: { room_number: "306" },
    },
    {
      id: "demo-req-8",
      room_id: "demo-room-412",
      department_key: "laundry",
      summary: "Express laundry — shirt and trousers by 6pm",
      summary_staff: "Laundry express: 1 shirt + 1 trousers",
      status: "accepted",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(45),
      ts_rooms: { room_number: "412" },
    },
    {
      id: "demo-req-9",
      room_id: "demo-room-306",
      department_key: "concierge",
      summary: "Restaurant booking for two at 8pm tonight",
      summary_staff: "Book table for 2 · 20:00 — guest open to recommendations",
      status: "new",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(6),
      ts_rooms: { room_number: "306" },
    },
    {
      id: "demo-req-10",
      room_id: "demo-room-218",
      department_key: "front_desk",
      summary: "Print boarding passes for morning flight",
      summary_staff: "Front desk: print 2 boarding passes",
      status: "new",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(18),
      ts_rooms: { room_number: "218" },
    },
    {
      id: "demo-req-11",
      room_id: "demo-room-507",
      department_key: "bar",
      summary: "Bottle of champagne and two glasses",
      summary_staff: "Bar: champagne + flutes to 507",
      status: "in_progress",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(28),
      ts_rooms: { room_number: "507" },
    },
    {
      id: "demo-req-12",
      room_id: "demo-room-105",
      department_key: "laundry",
      summary: "Press a suit jacket for tonight",
      summary_staff: "Laundry: press suit jacket",
      status: "new",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(14),
      ts_rooms: { room_number: "105" },
    },
    {
      id: "demo-req-13",
      room_id: "demo-room-612",
      department_key: "kitchen",
      summary: "Kids meal and fruit platter",
      summary_staff: "Kitchen: kids meal + fruit platter",
      status: "new",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(9),
      ts_rooms: { room_number: "612" },
    },
    {
      id: "demo-req-14",
      room_id: "demo-room-306",
      department_key: "maintenance",
      summary: "Bathroom light flickering",
      summary_staff: "Maintenance: flickering bathroom light",
      status: "new",
      priority: "normal",
      is_complaint: false,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(11),
      ts_rooms: { room_number: "306" },
    },
    {
      id: "demo-req-15",
      room_id: "demo-room-412",
      department_key: "duty_manager",
      summary: "Noise complaint from neighbouring room",
      summary_staff: "Duty manager: noise complaint — room 412",
      status: "accepted",
      priority: "urgent",
      is_complaint: true,
      needs_triage: false,
      guest_language: "en",
      created_at: ago(25),
      ts_rooms: { room_number: "412" },
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
      role: i % 3 === 0 ? "assistant" : "guest",
      content: i % 3 === 0 ? "Happy to help with that." : "Can you help with my room?",
      intent: i % 2 === 0 ? "service_request" : "question",
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
    is_chargeable: ["kitchen", "bar", "laundry"].includes(r.department_key),
    price: ["kitchen", "bar", "laundry"].includes(r.department_key) ? 18 + (r.id.length % 40) : null,
    classification_method: "voice",
    session_id: `demo-session-${r.id}`,
    created_at: r.created_at,
    updated_at: r.created_at,
    ts_rooms: r.ts_rooms,
  }));

  // Extra historical completed volume so charts look alive.
  for (let i = 0; i < 14; i++) {
    const dept = ["housekeeping", "kitchen", "bar", "maintenance", "concierge"][i % 5];
    const paid = dept === "kitchen" || dept === "bar";
    insightRequests.push({
      id: `demo-hist-${i}`,
      room_id: `demo-room-${100 + i}`,
      department_key: dept,
      summary: paid ? (dept === "bar" ? "Two cocktails to room" : "Club sandwich and fries") : "Historical demo request",
      status: "completed",
      is_complaint: i % 7 === 0,
      is_chargeable: paid,
      price: paid ? 22 + i * 3 : null,
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

  const rooms: DemoRoom[] = [
    { id: "demo-room-lobby", room_number: "Lobby", floor: "Ground", occupancy_status: "vacant", checkin_code: null, token: "demo-tok-lobby", is_public: true },
    { id: "demo-room-105", room_number: "105", floor: "1", occupancy_status: "occupied", checkin_code: "K7M2PQ", token: "demo-tok-105" },
    { id: "demo-room-218", room_number: "218", floor: "2", occupancy_status: "occupied", checkin_code: "H4N9XR", token: "demo-tok-218" },
    { id: "demo-room-306", room_number: "306", floor: "3", occupancy_status: "occupied", checkin_code: "R3K8NW", token: "demo-tok-306" },
    { id: "demo-room-330", room_number: "330", floor: "3", occupancy_status: "vacant", checkin_code: null, token: "demo-tok-330" },
    { id: "demo-room-412", room_number: "412", floor: "4", occupancy_status: "occupied", checkin_code: "B2W8LT", token: "demo-tok-412" },
    { id: "demo-room-507", room_number: "507", floor: "5", occupancy_status: "occupied", checkin_code: "Q9C3VZ", token: "demo-tok-507" },
    { id: "demo-room-612", room_number: "612", floor: "6", occupancy_status: "occupied", checkin_code: "F6J1YD", token: "demo-tok-612" },
  ];

  const departments: DemoDepartment[] = [
    { id: "demo-dept-hk", key: "housekeeping", display_name: "Housekeeping", is_active: true, notify_email: "hk@grandhotel-demo.com", escalate_after_minutes: 15 },
    { id: "demo-dept-laundry", key: "laundry", display_name: "Laundry", is_active: true, notify_email: "laundry@grandhotel-demo.com", escalate_after_minutes: 30 },
    { id: "demo-dept-kitchen", key: "kitchen", display_name: "Kitchen", is_active: true, notify_email: "kitchen@grandhotel-demo.com", escalate_after_minutes: 20 },
    { id: "demo-dept-bar", key: "bar", display_name: "Bar", is_active: true, notify_email: "bar@grandhotel-demo.com", escalate_after_minutes: 10 },
    { id: "demo-dept-maint", key: "maintenance", display_name: "Maintenance", is_active: true, notify_email: "maint@grandhotel-demo.com", escalate_after_minutes: 10 },
    { id: "demo-dept-conc", key: "concierge", display_name: "Concierge", is_active: true, notify_email: null, escalate_after_minutes: 20 },
    { id: "demo-dept-fd", key: "front_desk", display_name: "Front Desk", is_active: true, notify_email: "desk@grandhotel-demo.com", escalate_after_minutes: 5 },
    { id: "demo-dept-dm", key: "duty_manager", display_name: "Duty Manager", is_active: true, notify_email: "duty@grandhotel-demo.com", escalate_after_minutes: 5 },
  ];

  const staff: DemoStaff[] = [
    { id: "demo-staff-1", name: "Alex Rivera", email: "alex@grandhotel-demo.com", department_key: null, role: "manager", status: "active" },
    { id: "demo-staff-2", name: "Helen Park", email: "helen@grandhotel-demo.com", department_key: "housekeeping", role: "staff", status: "active" },
    { id: "demo-staff-3", name: "James Wright", email: "james@grandhotel-demo.com", department_key: "front_desk", role: "staff", status: "active" },
    { id: "demo-staff-4", name: "Sara Campbell", email: "sara@grandhotel-demo.com", department_key: "kitchen", role: "staff", status: "active" },
    { id: "demo-staff-5", name: "Omar Hassan", email: "omar@grandhotel-demo.com", department_key: "maintenance", role: "staff", status: "active" },
    { id: "demo-staff-6", name: "Mia Chen", email: "mia@grandhotel-demo.com", department_key: "laundry", role: "staff", status: "active" },
    { id: "demo-staff-7", name: "Tom Bradley", email: "tom@grandhotel-demo.com", department_key: "bar", role: "staff", status: "active" },
    { id: "demo-staff-8", name: "Priya Shah", email: "priya@grandhotel-demo.com", department_key: "concierge", role: "staff", status: "active" },
  ];

  const knowledge: DemoKnowledge[] = [
    { id: "demo-kb-1", title: "Wi‑Fi password", kind: "FAQ", preview: "Network: GrandGuest · Password: GrandGuest2026", scope: "general", department_key: null },
    { id: "demo-kb-2", title: "Breakfast hours", kind: "FAQ", preview: "Breakfast is served daily from 7:00–10:30 in the Garden Restaurant.", scope: "general", department_key: null },
    { id: "demo-kb-3", title: "Checkout time", kind: "FAQ", preview: "Checkout is at 11:00. Late checkout can be requested via TalkStay.", scope: "general", department_key: null },
    { id: "demo-kb-4", title: "Property website", kind: "Website", preview: "Indexed pages: rooms, dining, spa, and contact details.", scope: "site", department_key: null },
    { id: "demo-kb-5", title: "Room service menu", kind: "Document", preview: "PDF menu uploaded — sandwiches, salads, late-night bites (demo file).", scope: "department", department_key: "kitchen" },
    { id: "demo-kb-6", title: "Spa hours", kind: "FAQ", preview: "Spa open 9:00–20:00 · book via Concierge.", scope: "department", department_key: "concierge" },
    { id: "demo-kb-7", title: "Room 306 — connecting door", kind: "FAQ", preview: "Connecting door to 308 is locked; ask Front Desk if needed.", scope: "room", department_key: null },
  ];

  return {
    hotel: { ...DEMO_HOTEL, branding: { ...DEMO_HOTEL.branding } },
    rooms,
    departments,
    staff,
    knowledge,
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
  const text = body.trim();
  if (!text) return state;
  const req = state.requests.find((r) => r.id === requestId);
  if (!req) return state;
  const details = { ...state.details };
  const prev = details[requestId] ?? seedDetail(req);
  details[requestId] = {
    ...prev,
    messages: [
      ...prev.messages,
      {
        id: `${requestId}-msg-${Date.now()}`,
        sender: "staff",
        staff_label: DEMO_ACTOR,
        body: text,
        body_guest: text,
        created_at: at,
      },
    ],
    chat: [
      ...prev.chat,
      {
        role: "assistant",
        content: text,
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

export function updateDemoBranding(
  state: DemoState,
  patch: NonNullable<Hotel["branding"]>,
): DemoState {
  const prev = state.hotel.branding ?? {};
  return {
    ...state,
    hotel: {
      ...state.hotel,
      branding: {
        ...prev,
        ...patch,
        property: patch.property
          ? { ...(prev.property ?? {}), ...patch.property }
          : prev.property,
        poster: patch.poster !== undefined ? patch.poster : prev.poster,
      },
    },
    version: state.version + 1,
  };
}

export function setDemoRequireCheckinCode(state: DemoState, require: boolean): DemoState {
  return {
    ...state,
    hotel: { ...state.hotel, require_checkin_code: require },
    version: state.version + 1,
  };
}

export function regenerateDemoCheckinCode(state: DemoState, roomId: string): DemoState {
  const code = `D${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return {
    ...state,
    rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, checkin_code: code } : r)),
    version: state.version + 1,
  };
}

export function patchDemoDepartment(
  state: DemoState,
  deptId: string,
  patch: Partial<Pick<DemoDepartment, "display_name" | "is_active" | "notify_email" | "escalate_after_minutes">>,
): DemoState {
  return {
    ...state,
    departments: state.departments.map((d) => (d.id === deptId ? { ...d, ...patch } : d)),
    version: state.version + 1,
  };
}

export function assignDemoStaffDepartment(
  state: DemoState,
  staffId: string,
  department_key: string | null,
): DemoState {
  return {
    ...state,
    staff: state.staff.map((s) => (s.id === staffId ? { ...s, department_key } : s)),
    version: state.version + 1,
  };
}

export function addDemoRoom(state: DemoState, room_number: string, floor: string | null): DemoState {
  const id = `demo-room-${room_number}-${Date.now()}`;
  const room: DemoRoom = {
    id,
    room_number,
    floor,
    occupancy_status: "vacant",
    checkin_code: null,
    token: `demo-tok-${room_number}-${Date.now()}`,
    is_public: false,
  };
  return { ...state, rooms: [...state.rooms, room], version: state.version + 1 };
}

export function setDemoRoomPublic(state: DemoState, roomId: string, isPublic: boolean): DemoState {
  return {
    ...state,
    rooms: state.rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        is_public: isPublic,
        // Public areas don't use check-in codes.
        checkin_code: isPublic ? null : r.checkin_code,
        occupancy_status: isPublic ? "vacant" : r.occupancy_status,
      };
    }),
    version: state.version + 1,
  };
}

export function removeDemoRoom(state: DemoState, roomId: string): DemoState {
  return {
    ...state,
    rooms: state.rooms.filter((r) => r.id !== roomId),
    version: state.version + 1,
  };
}

export function toggleDemoRoomOccupancy(state: DemoState, roomId: string): DemoState {
  return {
    ...state,
    rooms: state.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const next = r.occupancy_status === "occupied" ? "vacant" : "occupied";
      return {
        ...r,
        occupancy_status: next,
        checkin_code: next === "occupied" ? (r.checkin_code || "DEMO01") : null,
      };
    }),
    version: state.version + 1,
  };
}

export function addDemoStaff(
  state: DemoState,
  row: { name: string; email: string; department_key: string | null; role: string },
): DemoState {
  const staff: DemoStaff = {
    id: `demo-staff-${Date.now()}`,
    name: row.name,
    email: row.email,
    department_key: row.department_key,
    role: row.role,
    status: "active",
  };
  return { ...state, staff: [...state.staff, staff], version: state.version + 1 };
}

export function removeDemoStaff(state: DemoState, staffId: string): DemoState {
  return {
    ...state,
    staff: state.staff.filter((s) => s.id !== staffId),
    version: state.version + 1,
  };
}

export function toggleDemoDepartment(state: DemoState, deptId: string): DemoState {
  return {
    ...state,
    departments: state.departments.map((d) =>
      d.id === deptId ? { ...d, is_active: !d.is_active } : d,
    ),
    version: state.version + 1,
  };
}

export function addDemoKnowledge(
  state: DemoState,
  title: string,
  preview: string,
  opts?: { scope?: DemoKnowledge["scope"]; department_key?: string | null; kind?: string },
): DemoState {
  const item: DemoKnowledge = {
    id: `demo-kb-${Date.now()}`,
    title,
    kind: opts?.kind ?? "FAQ",
    preview,
    scope: opts?.scope ?? "general",
    department_key: opts?.department_key ?? null,
  };
  return { ...state, knowledge: [item, ...state.knowledge], version: state.version + 1 };
}

export function removeDemoKnowledge(state: DemoState, id: string): DemoState {
  return {
    ...state,
    knowledge: state.knowledge.filter((k) => k.id !== id),
    version: state.version + 1,
  };
}

export function updateDemoKnowledge(
  state: DemoState,
  id: string,
  patch: Partial<Pick<DemoKnowledge, "title" | "preview" | "scope" | "department_key" | "kind">>,
): DemoState {
  return {
    ...state,
    knowledge: state.knowledge.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    version: state.version + 1,
  };
}

const GUEST_DEMO_ROOM = { id: "demo-room-306", room_number: "306" };

/** Map guest-demo phrasing → department for the shared ops queue. */
export function inferDemoDepartment(summary: string): string {
  const t = summary.toLowerCase();
  if (/towel|clean|maid|housekeep|bathrobe|linen|turndown/.test(t)) return "housekeeping";
  if (/laundry|press|suit|shirt|dry.?clean/.test(t)) return "laundry";
  // Drinks before food — "bottle of wine" must not fall through to kitchen.
  if (/cocktail|martini|champagne|wine|beer|lager|vodka|gin|whisky|whiskey|spirits|minibar|\bbar\b|\bdrink/.test(t)) {
    return "bar";
  }
  if (/sandwich|breakfast|dinner|lunch|food|kitchen|meal|fries|burger|pizza|salad|coffee|tea/.test(t)) {
    return "kitchen";
  }
  if (/ac|air.?con|light|plumb|leak|broken|wifi|maintenance|not working/.test(t)) return "maintenance";
  if (/taxi|restaurant|book|ticket|tour|concierge|reservation/.test(t)) return "concierge";
  if (/noise|complaint|manager|urgent|emergency/.test(t)) return "duty_manager";
  if (/wifi|password|check.?out|boarding|front.?desk|key/.test(t)) return "front_desk";
  return "concierge";
}

/** Prefer keyword truth over a wrong LLM department (e.g. wine → kitchen). */
export function resolveDemoDepartment(summary: string, hinted?: string | null): string {
  const inferred = inferDemoDepartment(summary);
  const hint = (hinted || "").trim();
  if (!hint) return inferred;
  if (inferred === "bar" && hint === "kitchen") return "bar";
  if (/cocktail|martini|champagne|wine|beer|lager|vodka|gin|whisky|whiskey|spirits|minibar/.test(summary.toLowerCase())) {
    return "bar";
  }
  return hint;
}

/** Guest Experience demo → shared Operations queue (Room 306). */
export function addDemoGuestRequest(
  state: DemoState,
  input: { summary: string; department?: string },
): { state: DemoState; requestId: string } {
  const id = `demo-guest-${Date.now()}`;
  const summary = input.summary.trim().slice(0, 160) || "Guest request";
  const department_key = resolveDemoDepartment(summary, input.department);
  const req: OpsRequest = {
    id,
    room_id: GUEST_DEMO_ROOM.id,
    department_key,
    summary,
    summary_staff: `Guest demo · Room 306 · ${summary}`,
    status: "new",
    priority: /ac|broken|noise|complaint|urgent/i.test(summary) ? "urgent" : "normal",
    is_complaint: /complaint|broken|not working|noise/i.test(summary),
    needs_triage: false,
    guest_language: "en",
    created_at: new Date().toISOString(),
    ts_rooms: { room_number: GUEST_DEMO_ROOM.room_number },
  };
  const detail = seedDetail(req);
  const next: DemoState = {
    ...state,
    requests: [req, ...state.requests],
    details: { ...state.details, [id]: detail },
    insights: {
      ...state.insights,
      requests: [
        {
          id: req.id,
          room_id: req.room_id,
          department_key: req.department_key,
          summary: req.summary,
          status: req.status,
          is_complaint: req.is_complaint,
          is_chargeable: ["kitchen", "bar", "laundry"].includes(req.department_key),
          price: null,
          classification_method: "demo_guest",
          session_id: `demo-session-${id}`,
          created_at: req.created_at,
          updated_at: req.created_at,
          ts_rooms: req.ts_rooms,
        },
        ...state.insights.requests,
      ],
    },
    version: state.version + 1,
  };
  return { state: next, requestId: id };
}

/** Guest confirms staff marked a request complete. */
export function guestConfirmDemoRequest(state: DemoState, requestId: string): DemoState {
  return advanceDemoRequest(state, requestId, "guest_confirmed", { note: "Guest confirmed — all good" });
}

/** Guest says not done yet after staff completed. */
export function guestReopenDemoRequest(state: DemoState, requestId: string): DemoState {
  return advanceDemoRequest(state, requestId, "reopened", { note: "Guest: not received yet" });
}

/** Guest cancels an open request. */
export function guestCancelDemoRequest(state: DemoState, requestId: string, reason?: string): DemoState {
  return advanceDemoRequest(state, requestId, "cancelled", {
    cancelReason: reason?.trim() || "Cancelled by guest",
  });
}

/** Guest nudges waiting staff (surfaces as follow-up / escalation). */
export function guestNudgeDemoRequest(state: DemoState, requestId: string): DemoState {
  const req = state.requests.find((r) => r.id === requestId);
  if (!req) return state;
  const at = new Date().toISOString();
  const note = "Guest reminded the team they are still waiting";
  const details = { ...state.details };
  const prev = details[requestId] ?? seedDetail(req);
  details[requestId] = {
    ...prev,
    events: [
      ...prev.events,
      {
        id: `${requestId}-nudge-${Date.now()}`,
        request_id: requestId,
        status: "escalated",
        note,
        actor_type: "guest",
        created_at: at,
      },
    ],
  };
  return {
    ...state,
    details,
    escalations: { ...state.escalations, [requestId]: { note, at } },
    escalationEvents: [
      ...state.escalationEvents,
      { id: `${requestId}-esc-nudge-${Date.now()}`, request_id: requestId, note },
    ],
    version: state.version + 1,
  };
}

/** Guest edits an open request and alerts staff. */
export function guestUpdateDemoRequest(state: DemoState, requestId: string, note: string): DemoState {
  const text = note.trim().slice(0, 160);
  if (!text) return state;
  const req = state.requests.find((r) => r.id === requestId);
  if (!req) return state;
  const at = new Date().toISOString();
  const requests = state.requests.map((r) =>
    r.id === requestId
      ? { ...r, summary: text, summary_staff: `Guest demo · Room 306 · ${text}` }
      : r,
  );
  const details = { ...state.details };
  const prev = details[requestId] ?? seedDetail(req);
  details[requestId] = {
    ...prev,
    request: { ...prev.request, summary: text, summary_staff: `Guest demo · Room 306 · ${text}`, updated_at: at },
    events: [
      ...prev.events,
      {
        id: `${requestId}-upd-${Date.now()}`,
        request_id: requestId,
        status: "updated",
        note: `Guest updated: ${text}`,
        actor_type: "guest",
        created_at: at,
      },
    ],
  };
  const nudged = guestNudgeDemoRequest(
    { ...state, requests, details, version: state.version },
    requestId,
  );
  return {
    ...nudged,
    insights: {
      ...nudged.insights,
      requests: nudged.insights.requests.map((r) =>
        r.id === requestId ? { ...r, summary: text, updated_at: at } : r,
      ),
    },
  };
}

/** Star rating after guest confirms — feeds Insights. */
export function guestRateDemoRequest(
  state: DemoState,
  requestId: string,
  rating: number,
  comment?: string,
): DemoState {
  const cleaned = Math.min(5, Math.max(1, Math.round(rating)));
  const ratings = [
    { request_id: requestId, rating: cleaned, comment: comment?.trim() || null },
    ...state.insights.ratings.filter((r) => r.request_id !== requestId),
  ];
  return {
    ...state,
    insights: { ...state.insights, ratings },
    version: state.version + 1,
  };
}

/** Mid-stay pulse from the guest demo — shows on Insights. */
export function addDemoGuestPulse(
  state: DemoState,
  input: { rating: number; text?: string },
): DemoState {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const body = (input.text || "").trim() || (
    rating >= 4 ? "Stay is going well." : "Something could be better during this stay."
  );
  const pulse = {
    id: `demo-pulse-guest-${Date.now()}`,
    body,
    rating,
    sentiment: rating >= 4 ? "positive" : rating >= 3 ? "neutral" : "negative",
    severity: rating <= 2 ? "high" : rating === 3 ? "medium" : "low",
    department_key: rating <= 2 ? "duty_manager" : "front_desk",
    issue_key: "general",
    issue_label: "General stay",
    request_id: null as string | null,
    acknowledged_at: null as string | null,
    created_at: new Date().toISOString(),
    ts_rooms: { room_number: GUEST_DEMO_ROOM.room_number },
  };
  return {
    ...state,
    insights: {
      ...state.insights,
      pulses: [pulse, ...state.insights.pulses],
    },
    version: state.version + 1,
  };
}

/** Staff messages for Room 306 — Guest demo polls these. */
export function listDemoStaffMessagesForGuest(state: DemoState): Array<{
  id: string;
  request_id: string;
  staff_label: string | null;
  content: string;
  created_at: string;
}> {
  const out: Array<{
    id: string;
    request_id: string;
    staff_label: string | null;
    content: string;
    created_at: string;
  }> = [];
  for (const r of state.requests) {
    if (r.room_id !== GUEST_DEMO_ROOM.id && r.ts_rooms?.room_number !== GUEST_DEMO_ROOM.room_number) {
      continue;
    }
    const msgs = state.details[r.id]?.messages ?? [];
    for (const m of msgs) {
      if (m.sender !== "staff") continue;
      out.push({
        id: m.id,
        request_id: r.id,
        staff_label: m.staff_label ?? DEMO_ACTOR,
        content: m.body_guest || m.body,
        created_at: m.created_at,
      });
    }
  }
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Persist demo sandbox across /demo/guest ↔ /demo/operations (shared across tabs). */
export const DEMO_STATE_KEY = "talkstay:demo-state-v3";

export function loadPersistedDemoState(): DemoState | null {
  try {
    // localStorage syncs across tabs (sessionStorage does not — that broke staff replies).
    const raw = localStorage.getItem(DEMO_STATE_KEY) ?? sessionStorage.getItem(DEMO_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed?.hotel?.id || !Array.isArray(parsed.requests)) return null;
    // Soft-migrate older in-session shapes (missing dept notify / kb scope).
    parsed.departments = (parsed.departments ?? []).map((d: any) => ({
      ...d,
      notify_email: d.notify_email ?? null,
      escalate_after_minutes: d.escalate_after_minutes ?? 15,
    }));
    parsed.knowledge = (parsed.knowledge ?? []).map((k: any) => ({
      ...k,
      scope: k.scope ?? (k.kind === "Website" ? "site" : "general"),
      department_key: k.department_key ?? null,
    }));
    parsed.rooms = (parsed.rooms ?? []).map((r: any) => ({
      ...r,
      is_public: !!r.is_public,
    }));
    return parsed;
  } catch {
    return null;
  }
}

export function persistDemoState(state: DemoState) {
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(DEMO_STATE_KEY, raw);
    // Clear legacy key so an old tab doesn't resurrect stale session-only state.
    sessionStorage.removeItem(DEMO_STATE_KEY);
  } catch { /* private browsing / quota */ }
}

export function clearPersistedDemoState() {
  try {
    localStorage.removeItem(DEMO_STATE_KEY);
    sessionStorage.removeItem(DEMO_STATE_KEY);
  } catch { /* ignore */ }
}
