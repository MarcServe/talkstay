import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DEPARTMENTS = [
  "housekeeping", "laundry", "kitchen", "bar", "maintenance",
  "concierge", "front_desk", "duty_manager",
];

// Rough ETA copy per department (human, not a progress bar).
const ETA: Record<string, string> = {
  housekeeping: "10–15 minutes",
  laundry: "we'll collect shortly",
  kitchen: "20–30 minutes",
  bar: "15–20 minutes",
  maintenance: "someone will attend shortly",
  concierge: "shortly",
  front_desk: "shortly",
  duty_manager: "the duty manager will contact you shortly",
};

interface RoomCtx {
  hotelId: string; hotelName: string; assistantId: string | null;
  roomId: string; roomNumber: string; language: string; slug: string;
  departments: string[];
  rules: { department_key: string; keywords: string[] }[];
  branding: Record<string, unknown>;
  pulseEnabled: boolean;
}

// Built-in deterministic keyword routing (safety net + works when OpenAI is down).
// Hotel-configured ts_routing_rules take precedence over these.
const DEFAULT_RULES: Record<string, string[]> = {
  housekeeping: ["towel", "towels", "clean", "cleaning", "bedding", "pillow", "pillows", "sheets", "blanket", "toiletries", "soap", "shampoo", "amenities", "make up the room", "tidy", "rubbish", "bin"],
  laundry: ["laundry", "dry clean", "dry-clean", "ironing", "iron my", "press my", "wash my clothes"],
  kitchen: ["food", "breakfast", "lunch", "dinner", "room service", "menu", "meal", "hungry", "snack", "sandwich", "burger", "pizza", "coffee", "tea", "order food"],
  bar: ["drink", "wine", "beer", "cocktail", "bottle", "champagne", "minibar", "whisky", "whiskey", "vodka", "gin", "spirits"],
  maintenance: ["broken", "not working", "doesn't work", "leak", "leaking", "ac ", "air con", "air-con", "air conditioning", "heating", "heater", "tv", "television", "light", "bulb", "toilet", "shower", "tap", "hot water", "wifi not", "internet not", "won't turn"],
  concierge: ["taxi", "cab", "uber", "recommend", "recommendation", "restaurant nearby", "directions", "luggage", "bags", "tour", "tickets", "attraction", "things to do"],
  front_desk: ["checkout", "check out", "check-out", "late checkout", "early check", "bill", "invoice", "charge", "receipt", "room key", "key card", "room access", "extend my stay"],
  duty_manager: ["complaint", "complain", "manager", "unacceptable", "terrible", "awful", "disgusting", "refund", "compensation", "safety", "emergency", "police", "dangerous", "threat", "harass", "discriminat"],
};

/** Deterministic route. Returns {dept, source} or null. Hotel rules are authoritative. */
function classifyDeterministic(message: string, ctx: RoomCtx): { dept: string; source: "rule" | "keyword" } | null {
  const m = ` ${message.toLowerCase()} `;
  // 1) hotel-configured rules first (authoritative)
  for (const r of ctx.rules) {
    if (!ctx.departments.includes(r.department_key)) continue;
    if ((r.keywords || []).some((k) => k && m.includes(k.toLowerCase()))) {
      return { dept: r.department_key, source: "rule" };
    }
  }
  // 2) built-in defaults — pick the department with the most keyword hits
  let best: { dept: string; hits: number } | null = null;
  for (const [dept, kws] of Object.entries(DEFAULT_RULES)) {
    if (!ctx.departments.includes(dept)) continue;
    const hits = kws.filter((k) => m.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { dept, hits };
  }
  return best ? { dept: best.dept, source: "keyword" } : null;
}

// Returns the room context, null (bad token/room), or "checked_out" (valid room,
// but the stay has ended — saved links must stop working).
async function resolveRoom(
  admin: any, hotelSlug: string, roomId: string, token: string
): Promise<RoomCtx | null | "checked_out"> {
  // Token must be active AND belong to this room.
  const { data: tok } = await admin
    .from("ts_room_tokens")
    .select("room_id, hotel_id, is_active")
    .eq("token", token).eq("room_id", roomId).eq("is_active", true).maybeSingle();
  if (!tok) return null;

  const { data: hotel } = await admin
    .from("ts_hotels")
    .select("id, name, slug, assistant_id, default_language, branding, pulse_enabled")
    .eq("id", tok.hotel_id).maybeSingle();
  if (!hotel || hotel.slug !== hotelSlug) return null;

  const { data: room } = await admin
    .from("ts_rooms").select("id, room_number, occupancy_status").eq("id", roomId).maybeSingle();
  if (!room) return null;
  // Checked out → every saved link/bookmark stops working immediately, anywhere.
  // The printed QR is unchanged and revives when the next guest is checked in.
  if (room.occupancy_status === "vacant") return "checked_out";

  const [{ data: depts }, { data: rules }] = await Promise.all([
    admin.from("ts_departments").select("key").eq("hotel_id", hotel.id).eq("is_active", true),
    admin.from("ts_routing_rules").select("department_key, keywords").eq("hotel_id", hotel.id).eq("is_active", true),
  ]);

  return {
    hotelId: hotel.id, hotelName: hotel.name, assistantId: hotel.assistant_id,
    roomId: room.id, roomNumber: room.room_number,
    language: hotel.default_language || "English", slug: hotel.slug,
    departments: (depts ?? []).map((d: any) => d.key),
    rules: (rules ?? []) as any,
    branding: (hotel as any).branding || {},
    pulseEnabled: (hotel as any).pulse_enabled !== false,
  };
}

async function embedQuery(query: string, apiKey: string): Promise<number[] | null> {
  try {
    const clean = apiKey.replace(/[^\x21-\x7E]/g, "");
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${clean}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query.slice(0, 4000) }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

// Merged retrieval:
//  (a) room/department/general entries from ts_knowledge (room-scoped, never other rooms)
//  (b) the hotel WEBSITE + documents knowledge from TalkWeb's knowledge_vectors
//      (via enhanced-knowledge-search on the hotel's linked assistant)
// Room/department info first, then site content.
async function searchKnowledge(
  admin: any, hotelId: string, roomId: string, assistantId: string | null,
  query: string, apiKey: string
): Promise<string> {
  const parts: string[] = [];

  // (a) TalkStay layered KB
  if (apiKey) {
    try {
      const emb = await embedQuery(query, apiKey);
      if (emb) {
        const { data } = await admin.rpc("ts_search_knowledge", {
          query_embedding: `[${emb.join(",")}]`, p_hotel_id: hotelId, p_room_id: roomId, match_count: 5,
        });
        for (const r of ((data ?? []) as any[]).filter((r) => (r.similarity ?? 0) > 0.1).slice(0, 4)) {
          const tag = r.scope === "room" ? "[Room info] " : r.scope === "department" ? `[${r.department_key}] ` : "";
          parts.push(r.title ? `${tag}[${r.title}]: ${r.content}` : `${tag}${r.content}`);
        }
      }
    } catch { /* best-effort */ }
  }

  // (b) TalkWeb website/document knowledge (assistant-scoped)
  if (assistantId) {
    try {
      const { data } = await admin.functions.invoke("enhanced-knowledge-search", {
        body: { query, assistantId, includePerplexity: false, maxResults: 6 },
      });
      for (const r of ((data?.results ?? []) as any[])
        .filter((r) => (r.quality_score ?? 0) >= 0.1 || (r.score ?? 0) >= 0.1)
        .slice(0, 4)) {
        parts.push(r.title ? `[${r.title}]: ${r.content}` : String(r.content ?? ""));
      }
    } catch { /* best-effort */ }
  }

  return parts.join("\n\n").slice(0, 6000);
}

// ---- Mid-stay pulse check ---------------------------------------------------
// Fixed taxonomy: free text can't be aggregated, and the point of asking during
// the stay is to trend the SAME issue over weeks and show whether it improved.
const PULSE_ISSUES = [
  "cleanliness", "staff_attitude", "response_time", "noise", "maintenance",
  "food_quality", "wifi", "checkin_checkout", "amenities", "comfort", "value", "other",
] as const;

const PULSE_ISSUE_LABEL: Record<string, string> = {
  cleanliness: "Cleanliness", staff_attitude: "Staff attitude", response_time: "Response time",
  noise: "Noise", maintenance: "Something broken", food_quality: "Food & drink",
  wifi: "Wi-Fi & tech", checkin_checkout: "Check-in / check-out", amenities: "Amenities",
  comfort: "Room comfort", value: "Value for money", other: "General",
};

// Safety net when OpenAI is unavailable — a guest's complaint must never be lost
// just because the classifier is down.
const PULSE_KEYWORDS: Record<string, string[]> = {
  cleanliness: ["dirty", "unclean", "not clean", "stain", "smell", "dusty", "mould", "mold", "hair in"],
  staff_attitude: ["rude", "dismissive", "unfriendly", "unhelpful", "ignored", "attitude", "impolite", "arrogant"],
  response_time: ["slow", "waiting", "waited", "took too long", "no one came", "still waiting", "ages"],
  noise: ["noisy", "loud", "noise", "can't sleep", "cant sleep", "banging", "music"],
  maintenance: ["broken", "not working", "doesn't work", "leak", "no hot water", "air con", "heating", "aircon"],
  food_quality: ["food", "breakfast", "cold meal", "tasteless", "undercooked", "menu", "coffee"],
  wifi: ["wifi", "wi-fi", "internet", "signal", "connection"],
  checkin_checkout: ["check in", "check-in", "checkout", "check out", "queue at reception", "front desk"],
  amenities: ["towel", "toiletries", "pool", "gym", "spa", "parking"],
  comfort: ["bed", "mattress", "pillow", "uncomfortable", "small room", "hot room", "cold room"],
};
const NEGATIVE_WORDS = ["not", "bad", "poor", "terrible", "awful", "worst", "disappointing", "unacceptable", "rude", "dirty", "slow", "broken", "never", "no one", "annoyed", "frustrat", "complain"];
const POSITIVE_WORDS = ["great", "lovely", "excellent", "perfect", "amazing", "wonderful", "beautiful", "friendly", "helpful", "clean", "comfortable", "enjoy", "thank"];

interface PulseVerdict {
  sentiment: "positive" | "neutral" | "negative";
  severity: "low" | "medium" | "high";
  issueKey: string;
  departmentKey: string | null;
  method: "llm" | "keyword" | "rating";
  reply: string | null; // warm acknowledgement, in the guest's own language
}

/** Deterministic pulse read — keyword hits + a star rating when one was tapped. */
function classifyPulseDeterministic(text: string, rating: number | null, ctx: RoomCtx): PulseVerdict {
  const m = ` ${(text || "").toLowerCase()} `;
  let issueKey = "other";
  let bestHits = 0;
  for (const [key, words] of Object.entries(PULSE_KEYWORDS)) {
    const hits = words.filter((w) => m.includes(w)).length;
    if (hits > bestHits) { bestHits = hits; issueKey = key; }
  }

  let sentiment: PulseVerdict["sentiment"];
  if (rating != null) {
    sentiment = rating <= 2 ? "negative" : rating >= 4 ? "positive" : "neutral";
  } else {
    const neg = NEGATIVE_WORDS.filter((w) => m.includes(w)).length;
    const pos = POSITIVE_WORDS.filter((w) => m.includes(w)).length;
    sentiment = neg > pos ? "negative" : pos > neg ? "positive" : "neutral";
  }

  // A 1-star or an explicit safety/abuse word is high; anything else negative is
  // medium, because "medium" is still worth waking a manager during the stay.
  const severe = ["unsafe", "dangerous", "threat", "harass", "discriminat", "police", "injur", "assault", "refund"].some((w) => m.includes(w));
  const severity: PulseVerdict["severity"] =
    sentiment !== "negative" ? "low" : severe || rating === 1 ? "high" : "medium";

  const deptGuess = classifyDeterministic(text || "", ctx);
  return {
    sentiment, severity, issueKey,
    departmentKey: deptGuess?.dept ?? null,
    method: text?.trim() ? "keyword" : "rating",
    reply: null,
  };
}

const OPENAI = "https://api.openai.com/v1/chat/completions";

/** Classify what the guest said about their stay. Falls back to keywords on any failure. */
async function classifyPulse(
  apiKey: string, text: string, rating: number | null, ctx: RoomCtx
): Promise<PulseVerdict> {
  const fallback = classifyPulseDeterministic(text, rating, ctx);
  if (!apiKey || !text.trim()) return fallback;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(OPENAI, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Classify one piece of mid-stay guest feedback for a hospitality property. Reply with ONLY JSON:
{"sentiment":"positive|neutral|negative","severity":"low|medium|high","issue_key":"<one of: ${PULSE_ISSUES.join(", ")}>","department":"<one of: ${ctx.departments.join(", ") || "front_desk"} or null>","reply":"<one warm sentence back to the guest, IN THE GUEST'S OWN LANGUAGE>"}
- department = the team the feedback is ABOUT, not who should fix it.
- severity: low = a passing remark; medium = a real problem worth a manager acting on today; high = safety, discrimination, abuse, or a stay-ruining failure.
- Positive or neutral feedback is always severity "low".
- reply: thank them and acknowledge specifically what they said. If it is a negative issue, say a manager has been told and will follow up before they leave. Never promise refunds or compensation.`,
          },
          { role: "user", content: rating != null ? `Guest rated the stay ${rating}/5. They said: ${text}` : text },
        ],
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) return fallback;
    const data = await resp.json();
    const parsed = JSON.parse(String(data?.choices?.[0]?.message?.content ?? "{}"));

    const sentiment = ["positive", "neutral", "negative"].includes(parsed.sentiment) ? parsed.sentiment : fallback.sentiment;
    let severity = ["low", "medium", "high"].includes(parsed.severity) ? parsed.severity : fallback.severity;
    if (sentiment !== "negative") severity = "low";
    const dept = typeof parsed.department === "string" && ctx.departments.includes(parsed.department) ? parsed.department : fallback.departmentKey;

    return {
      sentiment, severity,
      issueKey: (PULSE_ISSUES as readonly string[]).includes(parsed.issue_key) ? parsed.issue_key : fallback.issueKey,
      departmentKey: dept,
      method: "llm",
      reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim().slice(0, 400) : null,
    };
  } catch { return fallback; }
}

const isEnglish = (lang?: string) => {
  const l = (lang || "").trim().toLowerCase();
  return l === "" || l === "english" || l === "en" || l.startsWith("en-");
};

/** Translate the English staff summary into the hotel's language (B4) so staff
 *  read requests in their own language. Best-effort: returns null on any failure
 *  (missing key, timeout, error) and the caller falls back to the English summary. */
async function translateForStaff(apiKey: string, text: string, targetLang: string): Promise<string | null> {
  if (!apiKey || isEnglish(targetLang) || !text.trim()) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const resp = await fetch(OPENAI, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 200,
        messages: [
          { role: "system", content: `Translate the hotel staff task below into ${targetLang}. Keep it short and literal. Reply with ONLY the translation — no quotes, no notes.` },
          { role: "user", content: text },
        ],
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    const out = String(data?.choices?.[0]?.message?.content ?? "").trim();
    return out || null;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").trim();

    const body = await req.json();
    const { action = "message", hotelSlug, roomId, token, message, sessionId, history = [], deviceId, code } = body;
    if (!hotelSlug || !roomId || !token) return json({ error: "Missing hotel/room/token" }, 400);

    const ctx = await resolveRoom(admin, hotelSlug, roomId, token);
    if (ctx === "checked_out") return json({ error: "checked_out" }, 403);
    if (!ctx) return json({ error: "invalid_token" }, 403);

    // Bind this device to the current stay. A device from a previous stay (the
    // ex-guest refreshing a saved link after the room was re-let) is rejected;
    // brand-new devices enrol up to the hotel's per-room cap. When the hotel
    // requires a check-in code, a new device must supply the current stay's code.
    const { data: claim } = await admin.rpc("ts_claim_device", { p_room: ctx.roomId, p_device: deviceId ?? null, p_code: code ?? null });
    if (claim === "ended") return json({ error: "checked_out" }, 403);
    if (claim === "full") return json({ error: "room_full" }, 403);
    if (claim === "need_code") return json({ error: "need_code" }, 403);
    if (claim === "bad_code") return json({ error: "bad_code" }, 403);

    // Track guest activity — powers auto-checkout after the hotel's inactivity window.
    admin.from("ts_rooms").update({ last_guest_activity_at: new Date().toISOString() })
      .eq("id", ctx.roomId).then(() => {}, () => {});

    // ---- context: greeting + room info ----
    if (action === "context") {
      // Only offer the pulse check when the property wants it and this stay
      // hasn't answered yet — asking twice is worse than not asking.
      let pulseAsk = ctx.pulseEnabled;
      if (pulseAsk && sessionId) {
        const { count } = await admin
          .from("ts_guest_pulse").select("id", { count: "exact", head: true })
          .eq("hotel_id", ctx.hotelId).eq("session_id", sessionId);
        pulseAsk = (count ?? 0) === 0;
      }
      return json({
        hotelName: ctx.hotelName, roomNumber: ctx.roomNumber, language: ctx.language,
        departments: ctx.departments, branding: ctx.branding, pulseAsk,
        // Assistant id powers the voice session (TalkWeb realtime stack); assistant
        // ids are public by design in TalkWeb's widget embeds.
        assistantId: ctx.assistantId,
        greeting: `Hi! You're in Room ${ctx.roomNumber} at ${ctx.hotelName}. How can I help — anything you need, or a question about the hotel?`,
      });
    }

    // ---- my_requests: this device/session's requests ----
    if (action === "my_requests") {
      const { data } = await admin
        .from("ts_service_requests")
        .select("id, department_key, summary, status, is_complaint, created_at")
        .eq("hotel_id", ctx.hotelId).eq("session_id", sessionId || "")
        .order("created_at", { ascending: false }).limit(50);
      return json({ requests: data ?? [] });
    }

    // ---- staff_messages: human replies from staff for this session's requests ----
    if (action === "staff_messages") {
      if (!sessionId) return json({ messages: [] });
      const since = typeof body.since === "string" ? body.since : null;
      // Only this session's own requests, so a device can't read another room's thread.
      const { data: myReqs } = await admin
        .from("ts_service_requests").select("id")
        .eq("hotel_id", ctx.hotelId).eq("session_id", sessionId).limit(100);
      const ids = (myReqs ?? []).map((r: any) => r.id);
      if (!ids.length) return json({ messages: [] });
      let q = admin.from("ts_request_messages")
        .select("id, request_id, staff_label, body, body_guest, created_at")
        .in("request_id", ids).eq("sender", "staff")
        .order("created_at", { ascending: true }).limit(100);
      if (since) q = q.gt("created_at", since);
      const { data } = await q;
      const messages = (data ?? []).map((m: any) => ({
        id: m.id, request_id: m.request_id, staff_label: m.staff_label,
        content: m.body_guest || m.body, created_at: m.created_at,
      }));
      return json({ messages });
    }

    // ---- set_contact: guest wants email updates for this stay ----
    if (action === "set_contact") {
      const { channel, contact } = body;
      if (!sessionId || !channel) return json({ error: "sessionId and channel required" }, 400);
      const clean = String(contact ?? "").trim().slice(0, 200).toLowerCase();
      const { error } = await admin.from("ts_guest_sessions").upsert({
        hotel_id: ctx.hotelId, room_id: ctx.roomId, session_id: sessionId,
        language: ctx.language, notify_channel: String(channel),
        contact_email: clean || null,
      }, { onConflict: "hotel_id,session_id" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---- set_push: this device wants push notifications for this stay ----
    // Independent of set_contact — a guest can have email AND device push
    // both on at once, no exclusive "channel" choice.
    if (action === "set_push") {
      const { endpoint, p256dh, auth } = body;
      if (!sessionId || !endpoint || !p256dh || !auth) return json({ error: "sessionId and push keys required" }, 400);
      const { error } = await admin.from("ts_guest_push_subscriptions").upsert({
        hotel_id: ctx.hotelId, room_id: ctx.roomId, session_id: sessionId,
        endpoint: String(endpoint), p256dh: String(p256dh), auth: String(auth),
      }, { onConflict: "endpoint" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---- remove_push: guest turned device notifications off ----
    if (action === "remove_push") {
      const { endpoint } = body;
      if (!endpoint) return json({ error: "endpoint required" }, 400);
      await admin.from("ts_guest_push_subscriptions")
        .delete().eq("endpoint", String(endpoint)).eq("hotel_id", ctx.hotelId);
      return json({ ok: true });
    }

    // ---- pulse: "How has your stay been?", asked DURING the stay ----
    // The point is to hear it while the guest is still in the building, not two
    // weeks later on Booking.com.
    if (action === "pulse") {
      if (!sessionId) return json({ error: "sessionId required" }, 400);
      const rating = body.rating != null ? Math.max(1, Math.min(5, Math.round(Number(body.rating)))) : null;
      const text = String(body.text ?? "").trim().slice(0, 2000);
      if (rating == null && !text) return json({ error: "rating or text required" }, 400);

      // One stay can't flood the manager with alerts.
      const { count } = await admin
        .from("ts_guest_pulse").select("id", { count: "exact", head: true })
        .eq("hotel_id", ctx.hotelId).eq("session_id", sessionId);
      if ((count ?? 0) >= 5) return json({ error: "too_many" }, 429);

      const v = await classifyPulse(OPENAI_API_KEY, text, rating, ctx);
      const issueLabel = PULSE_ISSUE_LABEL[v.issueKey] ?? "General";
      const actionable = v.sentiment === "negative" && v.severity !== "low";

      // An actionable pulse becomes a real service request, so it inherits
      // everything already built: staff alerting, the reply-to-guest thread,
      // escalation and the Operations queue. It routes to the duty manager, NOT
      // to the team it's about — "the front desk were dismissive" must never
      // land in the front desk's own queue.
      let requestId: string | null = null;
      if (actionable) {
        const routeTo = ["duty_manager", "front_desk"].find((d) => ctx.departments.includes(d))
          ?? ctx.departments[0] ?? "front_desk";
        const about = v.departmentKey && v.departmentKey !== routeTo ? ` · about ${v.departmentKey.replace(/_/g, " ")}` : "";
        const summary = `Guest feedback during stay — ${issueLabel}${about}: ${text || `rated the stay ${rating}/5`}`.slice(0, 500);
        const summaryStaff = await translateForStaff(OPENAI_API_KEY, summary, ctx.language);
        const { data: reqRow } = await admin.from("ts_service_requests").insert({
          hotel_id: ctx.hotelId, room_id: ctx.roomId, department_key: routeTo,
          intent: "pulse_check", summary, summary_staff: summaryStaff,
          priority: v.severity === "high" ? "urgent" : "high",
          is_complaint: true, is_chargeable: false,
          guest_language: ctx.language, session_id: sessionId,
          classification_method: v.method, needs_triage: false,
        }).select("id").single();
        if (reqRow) {
          requestId = reqRow.id;
          await admin.from("ts_request_events").insert({ request_id: reqRow.id, status: "new", actor_type: "guest" });
          admin.functions.invoke("talkstay-notify", { body: { requestId: reqRow.id } }).catch(() => {});
        }
      }

      const { error: pErr } = await admin.from("ts_guest_pulse").insert({
        hotel_id: ctx.hotelId, room_id: ctx.roomId, session_id: sessionId,
        body: text || `Rated the stay ${rating}/5`, language: ctx.language, rating,
        sentiment: v.sentiment, severity: v.severity,
        department_key: v.departmentKey, issue_key: v.issueKey, issue_label: issueLabel,
        request_id: requestId, classified_by: v.method,
      });
      if (pErr) return json({ error: pErr.message }, 400);

      const fallbackReply = actionable
        ? "Thank you for telling us while you're still here — a manager has been notified and will follow up with you before you leave."
        : v.sentiment === "positive"
          ? "That's lovely to hear — thank you. I'll pass it on to the team."
          : "Thank you for the feedback — it's been shared with the team.";

      return json({
        ok: true,
        reply: v.reply || fallbackReply,
        notifiedManager: !!requestId,
        classification: { sentiment: v.sentiment, severity: v.severity, issue: issueLabel, department: v.departmentKey },
      });
    }

    // ---- review: rate a completed request from this session ----
    if (action === "review") {
      const { requestId, rating, comment } = body;
      if (!requestId || !rating) return json({ error: "requestId and rating required" }, 400);
      const { data: reqRow } = await admin
        .from("ts_service_requests")
        .select("id, session_id")
        .eq("id", requestId).eq("hotel_id", ctx.hotelId).maybeSingle();
      if (!reqRow || (sessionId && reqRow.session_id && reqRow.session_id !== sessionId))
        return json({ error: "not_found" }, 404);
      const { error } = await admin.from("ts_request_reviews").upsert(
        { request_id: requestId, hotel_id: ctx.hotelId, rating: Math.max(1, Math.min(5, Number(rating))), comment: comment || null },
        { onConflict: "request_id" }
      );
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---- confirm / reopen: guest closes the loop on a completed request ----
    // Staff marking "completed" is a claim, not proof. The guest gets the final
    // say: "Yes, all good" → guest_confirmed (then they can rate); "Not yet" →
    // reopened, and the team is alerted to pick it back up.
    if (action === "confirm" || action === "reopen") {
      const { requestId } = body;
      if (!requestId) return json({ error: "requestId required" }, 400);
      const { data: reqRow } = await admin
        .from("ts_service_requests")
        .select("id, session_id, status")
        .eq("id", requestId).eq("hotel_id", ctx.hotelId).maybeSingle();
      if (!reqRow || (sessionId && reqRow.session_id && reqRow.session_id !== sessionId))
        return json({ error: "not_found" }, 404);
      // Only a completed request can be confirmed or reopened by the guest.
      if (reqRow.status !== "completed")
        return json({ error: "not_completed", status: reqRow.status }, 409);

      const next = action === "confirm" ? "guest_confirmed" : "reopened";
      const { error } = await admin.from("ts_service_requests")
        .update({ status: next }).eq("id", requestId);
      if (error) return json({ error: error.message }, 400);
      await admin.from("ts_request_events").insert({
        request_id: requestId, status: next, actor_type: "guest",
      });

      // On reopen, alert the department (email + push) so someone picks it up.
      if (action === "reopen") {
        admin.functions.invoke("talkstay-notify", {
          body: { requestId, event: "reopened" },
        }).then(() => {}, () => {});
      }
      return json({ ok: true, status: next });
    }

    // ---- message: the AI brain ----
    if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);
    if (!message) return json({ error: "message required" }, 400);

    const activeDepts = ctx.departments.length ? ctx.departments : DEPARTMENTS;

    // This guest's currently-open requests for this stay — so a follow-up
    // ("is it coming?", "it's been a while") isn't misread as a brand new ask
    // and doesn't spawn a duplicate ticket. Terminal statuses are excluded.
    const { data: openReqs } = sessionId
      ? await admin.from("ts_service_requests")
          .select("id, department_key, summary, created_at")
          .eq("hotel_id", ctx.hotelId).eq("session_id", sessionId)
          .in("status", ["new", "accepted", "in_progress", "on_the_way", "reopened"])
          .order("created_at", { ascending: false }).limit(10)
      : { data: [] as any[] };
    const openRequests = openReqs ?? [];
    const openList = openRequests.map((r: any) => {
      const mins = Math.max(0, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000));
      return `- [${r.id}] ${r.department_key} · ${r.summary} · asked ${mins} min ago`;
    }).join("\n");

    const system = `You are the in-room guest assistant for ${ctx.hotelName}, Room ${ctx.roomNumber}.
Be warm, brief and natural — like a helpful concierge, not a form. The guest should feel they just ask and it's handled.

LANGUAGE: Reply in the same language the guest writes in (their hotel default is ${ctx.language}). The "summary" you pass to tools MUST be in English for staff.

WHAT TO DO:
- General questions about the hotel (breakfast, wifi, checkout, facilities, local tips): call answer_from_knowledge FIRST, then answer from what it returns. If it returns nothing useful, say you'll check with the team and offer to pass it on — never invent facts.
- A request for something (towels, food, drinks, laundry, a repair, taxi, late checkout, etc.): call create_service_request with the correct department. Confirm back conversationally with a rough ETA. Do NOT ask the guest to "track" anything.
- Complaints, safety issues, anything upsetting or urgent: do NOT try to resolve it yourself. Call create_service_request with department "duty_manager", priority "urgent", is_complaint true, and reassure them a manager will contact them shortly.

CURRENTLY OPEN REQUESTS FOR THIS STAY (id · department · summary · time since asked):
${openList || "(none yet)"}

FOLLOW-UPS vs NEW REQUESTS — check the list above BEFORE calling create_service_request. If the guest's
message is chasing, checking on, or complaining about something already listed (e.g. "is it coming",
"it's been a while", "still waiting", "where's my..."), that is a FOLLOW-UP, not a new request:
- Do NOT create a duplicate request for it.
- If they're just checking in, reassure them conversationally with an approximate wait and move on.
- If they sound frustrated, or the time-since-asked is notably long for that kind of task, call
  escalate_request with that request's id (copied exactly from the list) so staff are alerted now.
Only call create_service_request for something genuinely new that isn't already on the list.

DEPARTMENTS available (use exactly these keys): ${activeDepts.join(", ")}.
Routing guide: towels/cleaning/bedding→housekeeping; laundry→laundry; food/breakfast/room service→kitchen; drinks/wine/cocktails→bar; TV/heating/AC/broken things→maintenance; taxi/recommendations/luggage→concierge; late checkout/billing/room access→front_desk; complaint/safety→duty_manager.
Mark is_chargeable true for room service food, drinks, laundry, minibar, late checkout, spa. Towels, cleaning, maintenance, wifi help and complaints are free.
Keep replies to 1–3 short sentences.

CONVERSATION STYLE: don't just answer and stop — that reads as cold. Close each reply by keeping things
open: a brief warm check-in ("Anything else?"), or a natural, relevant next thought that follows from
what you just said. Vary your phrasing so it doesn't sound like a scripted closing line every time.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "answer_from_knowledge",
          description: "Search the hotel's knowledge base to answer a guest question (breakfast times, wifi, checkout, facilities, policies, local info).",
          parameters: {
            type: "object",
            properties: { query: { type: "string", description: "What to look up" } },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_service_request",
          description: "Create a service request routed to a hotel department when the guest wants something done or reports a problem/complaint.",
          parameters: {
            type: "object",
            properties: {
              department: { type: "string", enum: activeDepts },
              summary: { type: "string", description: "Short task description in ENGLISH for staff, incl. quantities (e.g. 'Deliver 3 extra towels to Room 214')." },
              priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
              is_complaint: { type: "boolean" },
              is_chargeable: { type: "boolean" },
            },
            required: ["department", "summary"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "escalate_request",
          description: "Flag an EXISTING open request (from CURRENTLY OPEN REQUESTS) as needing attention now, because the guest followed up, sounds frustrated, or it's overdue. Never use this to create something new — use create_service_request for that.",
          parameters: {
            type: "object",
            properties: {
              requestId: { type: "string", description: "The id of the existing request, copied exactly from the CURRENTLY OPEN REQUESTS list." },
              note: { type: "string", description: "Short context for staff, e.g. 'guest says it has been 30+ minutes'." },
            },
            required: ["requestId"],
          },
        },
      },
    ];

    const messages: any[] = [
      { role: "system", content: system },
      ...(Array.isArray(history) ? history.slice(-8).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? m.text ?? ""),
      })) : []),
      { role: "user", content: String(message) },
    ];

    const createdRequests: any[] = [];
    let guestIntent = "other"; // question | request | complaint | other

    // Log the interaction (both guest turn + assistant reply) for engagement analytics.
    const logAndReturn = async (reply: string) => {
      try {
        await admin.from("ts_interactions").insert([
          { hotel_id: ctx.hotelId, room_id: ctx.roomId, session_id: sessionId || null,
            role: "guest", content: String(message).slice(0, 1000), intent: guestIntent, language: ctx.language },
          { hotel_id: ctx.hotelId, room_id: ctx.roomId, session_id: sessionId || null,
            role: "assistant", content: String(reply).slice(0, 1000), intent: "reply", language: ctx.language },
        ]);
      } catch { /* analytics must never block the guest */ }
      return json({ reply, requests: createdRequests, language: ctx.language });
    };

    // Shared request-creation (used by both the LLM path and the deterministic
    // fallback), records HOW it was classified for observability + triage.
    const createRequest = async (
      dept0: string, summary: string,
      o: { isComplaint?: boolean; isChargeable?: boolean; priority?: string; method: string; needsTriage?: boolean }
    ) => {
      const dept = ctx.departments.includes(dept0) ? dept0 : (DEPARTMENTS.includes(dept0) ? dept0 : "front_desk");
      const isComplaint = o.isComplaint ?? (dept === "duty_manager");
      const enSummary = summary.slice(0, 500);
      // B4: give staff the request in the hotel's language (falls back to English).
      const summaryStaff = await translateForStaff(OPENAI_API_KEY, enSummary, ctx.language);
      const { data: reqRow } = await admin.from("ts_service_requests").insert({
        hotel_id: ctx.hotelId, room_id: ctx.roomId, department_key: dept,
        intent: message.slice(0, 200), summary: enSummary, summary_staff: summaryStaff,
        priority: isComplaint ? "urgent" : (o.priority || "normal"),
        is_complaint: isComplaint, is_chargeable: !!o.isChargeable,
        guest_language: ctx.language, session_id: sessionId || null,
        classification_method: o.method, needs_triage: !!o.needsTriage,
        conversation: [...history.slice(-6), { role: "user", content: message }],
      }).select("id, department_key, summary, summary_staff, status, is_complaint").single();
      if (reqRow) {
        await admin.from("ts_request_events").insert({ request_id: reqRow.id, status: "new", actor_type: "guest" });
        admin.functions.invoke("talkstay-notify", { body: { requestId: reqRow.id } }).catch(() => {});
        createdRequests.push(reqRow);
      }
      return reqRow;
    };

    // LLM call with timeout + one retry (handles OpenAI slowness/rate limits at scale).
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const callLLM = async (): Promise<any> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 15000);
          const resp = await fetch(OPENAI, {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-4o-mini", messages, tools, tool_choice: "auto", temperature: 0.4, max_tokens: 500 }),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (!resp.ok) {
            if (attempt === 0 && (resp.status === 429 || resp.status >= 500)) { await sleep(700); continue; }
            throw new Error(`status ${resp.status}`);
          }
          return await resp.json();
        } catch (e) {
          if (attempt === 0) { await sleep(700); continue; }
          throw e;
        }
      }
    };

    try {
      for (let round = 0; round < 3; round++) {
        const data = await callLLM();
        const msg = data?.choices?.[0]?.message;
        if (!msg) throw new Error("no message");

        const toolCalls = msg.tool_calls ?? [];
        if (toolCalls.length === 0) return await logAndReturn(msg.content ?? "");

        messages.push(msg);
        for (const tc of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }

          if (tc.function.name === "answer_from_knowledge") {
            if (guestIntent === "other") guestIntent = "question";
            const kb = await searchKnowledge(admin, ctx.hotelId, ctx.roomId, ctx.assistantId, String(args.query || message), OPENAI_API_KEY);
            messages.push({ role: "tool", tool_call_id: tc.id, content: kb || "No knowledge-base entries matched. Do not invent an answer." });
          } else if (tc.function.name === "create_service_request") {
            // HYBRID ROUTING: hotel keyword rule (authoritative) > LLM dept > built-in
            // keyword default > front-desk fallback (flagged for human triage).
            const det = classifyDeterministic(message, ctx);
            const llmValid = ctx.departments.includes(args.department);
            let dept: string, method: string, needsTriage = false;
            if (det?.source === "rule") { dept = det.dept; method = "rule"; }
            else if (llmValid) { dept = args.department; method = "llm"; }
            else if (det) { dept = det.dept; method = "keyword"; }
            else { dept = "front_desk"; method = "fallback"; needsTriage = true; }

            const isComplaint = !!args.is_complaint || dept === "duty_manager";
            guestIntent = isComplaint ? "complaint" : "request";
            const reqRow = await createRequest(dept, String(args.summary || message),
              { isComplaint, isChargeable: !!args.is_chargeable, priority: args.priority, method, needsTriage });
            messages.push({
              role: "tool", tool_call_id: tc.id,
              content: JSON.stringify(reqRow ? { ok: true, department: dept, eta: ETA[dept] || "shortly", is_complaint: isComplaint } : { ok: false }),
            });
          } else if (tc.function.name === "escalate_request") {
            // Follow-up on something already open — bump it to urgent and alert
            // staff, instead of the model creating a confusing duplicate ticket.
            const reqId = String(args.requestId || "");
            const match = openRequests.find((r: any) => r.id === reqId);
            if (!match) {
              messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: false, error: "not_found" }) });
            } else {
              await admin.from("ts_service_requests").update({ priority: "urgent" }).eq("id", reqId);
              await admin.from("ts_request_events").insert({
                request_id: reqId, status: "escalated", actor_type: "guest",
                note: args.note ? String(args.note).slice(0, 200) : null,
              });
              admin.functions.invoke("talkstay-notify", { body: { requestId: reqId, event: "escalated" } }).catch(() => {});
              guestIntent = "complaint";
              messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: true }) });
            }
          } else {
            messages.push({ role: "tool", tool_call_id: tc.id, content: "{}" });
          }
        }
      }
      return await logAndReturn(createdRequests.length
        ? "Done — I've passed that to the team. They'll be with you shortly."
        : "I've noted that. Is there anything else I can help with?");
    } catch (_llmErr) {
      // ⛑️ DETERMINISTIC FALLBACK — OpenAI failed/timed out. NEVER lose the request.
      const det = classifyDeterministic(message, ctx);
      if (det) {
        const isComplaint = det.dept === "duty_manager";
        guestIntent = isComplaint ? "complaint" : "request";
        await createRequest(det.dept, message, { isComplaint, method: det.source, needsTriage: det.source === "keyword" });
        return await logAndReturn("Thanks — I've passed your request to the team. They'll be with you shortly.");
      }
      // No clear intent — still don't drop it: send to front desk for human triage.
      guestIntent = "other";
      await createRequest("front_desk", message, { method: "fallback", needsTriage: true });
      return await logAndReturn("Thanks for your message — reception has it and will follow up with you shortly.");
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
