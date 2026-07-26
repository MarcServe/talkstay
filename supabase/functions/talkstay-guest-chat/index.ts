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
}

async function resolveRoom(
  admin: any, hotelSlug: string, roomId: string, token: string
): Promise<RoomCtx | null> {
  // Token must be active AND belong to this room.
  const { data: tok } = await admin
    .from("ts_room_tokens")
    .select("room_id, hotel_id, is_active")
    .eq("token", token).eq("room_id", roomId).eq("is_active", true).maybeSingle();
  if (!tok) return null;

  const { data: hotel } = await admin
    .from("ts_hotels")
    .select("id, name, slug, assistant_id, default_language")
    .eq("id", tok.hotel_id).maybeSingle();
  if (!hotel || hotel.slug !== hotelSlug) return null;

  const { data: room } = await admin
    .from("ts_rooms").select("id, room_number").eq("id", roomId).maybeSingle();
  if (!room) return null;

  const { data: depts } = await admin
    .from("ts_departments").select("key").eq("hotel_id", hotel.id).eq("is_active", true);

  return {
    hotelId: hotel.id, hotelName: hotel.name, assistantId: hotel.assistant_id,
    roomId: room.id, roomNumber: room.room_number,
    language: hotel.default_language || "English", slug: hotel.slug,
    departments: (depts ?? []).map((d: any) => d.key),
  };
}

async function searchKnowledge(admin: any, assistantId: string | null, query: string): Promise<string> {
  if (!assistantId) return "";
  try {
    const { data } = await admin.functions.invoke("enhanced-knowledge-search", {
      body: { query, assistantId, includePerplexity: false, maxResults: 6 },
    });
    const results = (data?.results ?? []) as any[];
    return results
      .filter((r) => (r.quality_score ?? 0) >= 0.1 || (r.score ?? 0) >= 0.1)
      .slice(0, 5)
      .map((r) => (r.title ? `[${r.title}]: ${r.content}` : r.content))
      .join("\n\n")
      .slice(0, 6000);
  } catch { return ""; }
}

const OPENAI = "https://api.openai.com/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").trim();

    const body = await req.json();
    const { action = "message", hotelSlug, roomId, token, message, sessionId, history = [] } = body;
    if (!hotelSlug || !roomId || !token) return json({ error: "Missing hotel/room/token" }, 400);

    const ctx = await resolveRoom(admin, hotelSlug, roomId, token);
    if (!ctx) return json({ error: "invalid_token" }, 403);

    // ---- context: greeting + room info ----
    if (action === "context") {
      return json({
        hotelName: ctx.hotelName, roomNumber: ctx.roomNumber, language: ctx.language,
        departments: ctx.departments,
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
              department: { type: "string", enum: DEPARTMENTS },
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

    // Up to 2 tool rounds.
    for (let round = 0; round < 3; round++) {
      const resp = await fetch(OPENAI, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, tools, tool_choice: "auto", temperature: 0.5, max_tokens: 500 }),
      });
      if (!resp.ok) return json({ error: `AI error ${resp.status}` }, 502);
      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) return json({ error: "No AI response" }, 502);

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return await logAndReturn(msg.content ?? "");
      }

      messages.push(msg);
      for (const tc of toolCalls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }

        if (tc.function.name === "answer_from_knowledge") {
          if (guestIntent === "other") guestIntent = "question";
          const kb = await searchKnowledge(admin, ctx.assistantId, String(args.query || message));
          messages.push({ role: "tool", tool_call_id: tc.id, content: kb || "No knowledge-base entries matched. Do not invent an answer." });
        } else if (tc.function.name === "create_service_request") {
          const dept = DEPARTMENTS.includes(args.department) ? args.department : "front_desk";
          const isComplaint = !!args.is_complaint || dept === "duty_manager";
          guestIntent = isComplaint ? "complaint" : "request";
          const { data: reqRow, error } = await admin
            .from("ts_service_requests")
            .insert({
              hotel_id: ctx.hotelId, room_id: ctx.roomId, department_key: dept,
              intent: message.slice(0, 200), summary: String(args.summary || message).slice(0, 500),
              priority: isComplaint ? "urgent" : (args.priority || "normal"),
              is_complaint: isComplaint, is_chargeable: !!args.is_chargeable,
              guest_language: ctx.language, session_id: sessionId || null,
              conversation: [...history.slice(-6), { role: "user", content: message }],
            })
            .select("id, department_key, summary, status, is_complaint")
            .single();
          if (!error && reqRow) {
            await admin.from("ts_request_events").insert({
              request_id: reqRow.id, status: "new", actor_type: "guest",
            });
            // Alert the department (email now; web push added alongside). Fire-and-forget.
            admin.functions.invoke("talkstay-notify", { body: { requestId: reqRow.id } }).catch(() => {});
            createdRequests.push(reqRow);
            messages.push({
              role: "tool", tool_call_id: tc.id,
              content: JSON.stringify({ ok: true, department: dept, eta: ETA[dept] || "shortly", is_complaint: isComplaint }),
            });
          } else {
            messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: false }) });
          }
        } else {
          messages.push({ role: "tool", tool_call_id: tc.id, content: "{}" });
        }
      }
    }

    // Fell through the tool loop — return a safe closing reply.
    return await logAndReturn(
      createdRequests.length
        ? "Done — I've passed that to the team. They'll be with you shortly."
        : "I've noted that. Is there anything else I can help with?"
    );
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
