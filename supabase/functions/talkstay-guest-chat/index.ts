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
    .select("id, name, slug, assistant_id, default_language, branding")
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

const OPENAI = "https://api.openai.com/v1/chat/completions";

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
      return json({
        hotelName: ctx.hotelName, roomNumber: ctx.roomNumber, language: ctx.language,
        departments: ctx.departments, branding: ctx.branding,
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

    // ---- set_contact: where this device wants updates (email / whatsapp) ----
    if (action === "set_contact") {
      const { channel, contact } = body;
      if (!sessionId || !channel) return json({ error: "sessionId and channel required" }, 400);
      const isEmail = String(channel) === "email";
      const clean = String(contact ?? "").trim().slice(0, 200);
      const { error } = await admin.from("ts_guest_sessions").upsert({
        hotel_id: ctx.hotelId, room_id: ctx.roomId, session_id: sessionId,
        language: ctx.language, notify_channel: String(channel),
        contact_email: isEmail ? clean.toLowerCase() : null,
        contact_phone: isEmail ? null : (clean || null),
      }, { onConflict: "hotel_id,session_id" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
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
    const system = `You are the in-room guest assistant for ${ctx.hotelName}, Room ${ctx.roomNumber}.
Be warm, brief and natural — like a helpful concierge, not a form. The guest should feel they just ask and it's handled.

LANGUAGE: Reply in the same language the guest writes in (their hotel default is ${ctx.language}). The "summary" you pass to tools MUST be in English for staff.

WHAT TO DO:
- General questions about the hotel (breakfast, wifi, checkout, facilities, local tips): call answer_from_knowledge FIRST, then answer from what it returns. If it returns nothing useful, say you'll check with the team and offer to pass it on — never invent facts.
- A request for something (towels, food, drinks, laundry, a repair, taxi, late checkout, etc.): call create_service_request with the correct department. Confirm back conversationally with a rough ETA. Do NOT ask the guest to "track" anything.
- Complaints, safety issues, anything upsetting or urgent: do NOT try to resolve it yourself. Call create_service_request with department "duty_manager", priority "urgent", is_complaint true, and reassure them a manager will contact them shortly.

DEPARTMENTS available (use exactly these keys): ${activeDepts.join(", ")}.
Routing guide: towels/cleaning/bedding→housekeeping; laundry→laundry; food/breakfast/room service→kitchen; drinks/wine/cocktails→bar; TV/heating/AC/broken things→maintenance; taxi/recommendations/luggage→concierge; late checkout/billing/room access→front_desk; complaint/safety→duty_manager.
Mark is_chargeable true for room service food, drinks, laundry, minibar, late checkout, spa. Towels, cleaning, maintenance, wifi help and complaints are free.
Keep replies to 1–3 short sentences.`;

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
