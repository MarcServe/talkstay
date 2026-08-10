import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// TalkStay's own realtime token minter.
// WHY THIS EXISTS (instead of calling TalkWeb's protected `realtime-token`):
//  1. The shared OPENAI_API_KEY secret has a trailing newline; realtime-token uses it
//     untrimmed, so building the Authorization header throws
//     ("'headers' … is not a valid ByteString") and voice never starts. We sanitize.
//  2. Security: the browser sends the ROOM QR TOKEN (not a raw assistantId) — we verify
//     it server-side before minting a key.
//  3. The session is hotel-aware: instructions include the hotel, room and its knowledge.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Strip whitespace/newlines — the shared secret has a trailing newline.
    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").replace(/[^\x21-\x7E]/g, "");
    if (!OPENAI_API_KEY) return json({ error: "OpenAI key not configured" }, 500);

    // Single source of truth for the realtime model: the ephemeral key is bound to
    // it, and the client's SDP handshake must request the exact same model.
    const MODEL = "gpt-realtime";

    const { hotelSlug, roomId, token, deviceId, code, sessionId } = await req.json();
    if (!hotelSlug || !roomId || !token) return json({ error: "Missing hotel/room/token" }, 400);

    // Verify the room QR token.
    const { data: tok } = await admin
      .from("ts_room_tokens").select("hotel_id")
      .eq("token", token).eq("room_id", roomId).eq("is_active", true).maybeSingle();
    if (!tok) return json({ error: "invalid_token" }, 403);

    const [{ data: hotel }, { data: room }] = await Promise.all([
      admin.from("ts_hotels").select("id, name, slug, assistant_id, default_language").eq("id", tok.hotel_id).maybeSingle(),
      admin.from("ts_rooms").select("room_number, occupancy_status").eq("id", roomId).maybeSingle(),
    ]);
    if (!hotel || hotel.slug !== hotelSlug) return json({ error: "invalid_token" }, 403);
    // Stay ended → no voice session from a saved link.
    if (room?.occupancy_status === "vacant") return json({ error: "checked_out" }, 403);
    // Same stay+device gate as the chat path (rejects a previous guest's device).
    // By the time voice starts, the device is normally enrolled via the chat
    // context call, so this returns 'ok'; the code branches are here for safety.
    if (!deviceId || !String(deviceId).trim()) {
      return json({ error: "checked_out" }, 403);
    }
    const { data: claim } = await admin.rpc("ts_claim_device", { p_room: roomId, p_device: String(deviceId).trim(), p_code: code ?? null });
    if (claim === "ended") return json({ error: "checked_out" }, 403);
    if (claim === "full") return json({ error: "room_full" }, 403);
    if (claim === "need_code" || claim === "bad_code") return json({ error: claim }, 403);

    const roomNo = room?.room_number ?? "";

    // Pull a little knowledge so the spoken answers are hotel-specific.
    let knowledge = "";
    try {
      const [{ data: kb }, siteRes] = await Promise.all([
        admin.from("ts_knowledge").select("title, content, scope, room_id, media")
          .eq("hotel_id", hotel.id).limit(40),
        hotel.assistant_id
          ? admin.from("knowledge_vectors").select("title, content").eq("assistant_id", hotel.assistant_id).limit(12)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const layered = (kb ?? [])
        .filter((k: any) => !k.room_id || k.room_id === roomId)
        .map((k: any) => {
          const title = k.title ? `${k.title}: ` : "";
          const body = String(k.content ?? "").trim();
          const images = Array.isArray(k.media?.images) ? k.media.images : [];
          const urls = images
            .map((img: any) => img?.url)
            .filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
            .slice(0, 3);
          const photoLine = urls.length
            ? `\n[Photo available on the guest screen — mention it and tell them to look at the chat for the image: ${urls.join(", ")}]`
            : "";
          return `${title}${body}${photoLine}`;
        });
      const site = ((siteRes as any).data ?? []).map((k: any) => `${k.title ? k.title + ": " : ""}${k.content}`);
      knowledge = [...layered, ...site].join("\n").slice(0, 10000);
    } catch { /* best-effort */ }

    // Same session memory the typed chat uses — open tickets + recent turns —
    // so switching from typing to speaking doesn't wipe "what did I ask for?".
    let openRequestsBlock = "(none yet)";
    let recentChatBlock = "(no earlier chat in this stay)";
    if (sessionId && typeof sessionId === "string") {
      try {
        const [{ data: openReqs }, { data: turns }] = await Promise.all([
          admin.from("ts_service_requests")
            .select("summary, status, department_key, created_at")
            .eq("hotel_id", hotel.id).eq("session_id", sessionId)
            .in("status", ["new", "accepted", "in_progress", "on_the_way", "reopened"])
            .order("created_at", { ascending: false }).limit(8),
          admin.from("ts_interactions")
            .select("role, content, created_at")
            .eq("hotel_id", hotel.id).eq("session_id", sessionId)
            .in("role", ["guest", "assistant", "user"])
            .order("created_at", { ascending: false }).limit(16),
        ]);
        if (openReqs?.length) {
          openRequestsBlock = openReqs.map((r: any, i: number) => {
            const mins = Math.max(0, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000));
            const when = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
            return `${i + 1}. "${r.summary}" — status: ${String(r.status).replace(/_/g, " ")} (${when})`;
          }).join("\n");
        }
        if (turns?.length) {
          recentChatBlock = [...turns].reverse().map((t: any) => {
            const who = t.role === "assistant" ? "Assistant" : "Guest";
            return `${who}: ${String(t.content || "").slice(0, 220)}`;
          }).join("\n");
        }
      } catch { /* best-effort */ }
    }

    const instructions = `You are the in-room voice assistant for ${hotel.name}${roomNo ? `, speaking with the guest in Room ${roomNo}` : ""}.

Be warm, brief and natural — like a great concierge. Keep answers to 1–3 short sentences.
Reply in whatever language the guest speaks (hotel default: ${hotel.default_language || "English"}).

WHAT YOU DO
- Answer questions about the hotel from the knowledge below (breakfast, wifi, checkout, facilities, local tips).
- When knowledge mentions a photo/menu image, tell the guest to glance at the chat screen — the image card appears there while you speak.
- When the guest ASKS FOR SOMETHING (towels, food, drinks, laundry, a repair, a taxi, late checkout),
  confirm it warmly and say you've passed it to the right team with a rough time —
  the request is logged automatically, so never ask them to call reception or repeat themselves.
- For complaints or anything upsetting: apologise sincerely, don't try to fix it yourself,
  and tell them the duty manager has been notified and will contact them shortly.
- Never invent facts that aren't in the knowledge below. If you don't know, say you'll check with the team.

THIS STAY'S MEMORY (shared with typed chat — use it; never pretend you forgot)
- If the guest asks what they requested, the status, or "do you remember", answer from OPEN REQUESTS and RECENT CHAT below.
- Do not ask them to repeat an open request you already have listed.
- Follow-ups like "is it coming?" or "make it white wine instead" refer to those open requests.

OPEN REQUESTS
${openRequestsBlock}

RECENT CHAT (typed or spoken earlier this stay)
${recentChatBlock}

CONVERSATION STYLE — this is a spoken conversation, not a Q&A form. Never just answer and go silent —
that feels like a machine that's done with you. Close each turn by keeping the conversation open:
a short warm check-in ("Anything else I can help with?"), or better, a natural, relevant next thought
that follows from what you just said (e.g. after breakfast hours, mention where it's served; after
logging a repair, ask if anything else in the room needs attention). Vary your phrasing — don't repeat
the same closing line every turn, or it starts to sound scripted instead of like a person paying attention.

HOTEL KNOWLEDGE
${knowledge || "(No knowledge indexed yet — be helpful and offer to pass questions to the team.)"}`;

    const resp = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: MODEL,
          instructions,
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              transcription: { model: "whisper-1" },
              // Suppress background/room noise (TV, corridor chatter, AC). "near_field"
              // is tuned for a phone held near the mouth, so it aggressively rejects
              // sound that isn't the person speaking into the device.
              noise_reduction: { type: "near_field" },
              // Higher threshold = the guest's own voice must clearly exceed ambient
              // noise before a turn starts, so a TV in the background won't trigger it.
              // Longer silence prevents cutting the guest off between sentences.
              turn_detection: {
                type: "server_vad", threshold: 0.8,
                prefix_padding_ms: 300, silence_duration_ms: 1100,
                interrupt_response: true, create_response: true,
              },
            },
            output: { format: { type: "audio/pcm", rate: 24000 }, voice: "shimmer" },
          },
        },
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ error: `OpenAI error ${resp.status}`, detail: detail.slice(0, 300) }, 502);
    }
    const data = await resp.json();
    const value = data?.value ?? data?.client_secret?.value ?? data?.client_secret;
    if (!value) return json({ error: "No ephemeral key returned" }, 502);

    // Same envelope RealtimeChat expects. `model` is returned explicitly so the
    // client's WebRTC/SDP handshake always uses the SAME model this ephemeral key
    // was minted for — a mismatch makes the SDP exchange fail ("voice can't start").
    return json({
      ...data,
      model: MODEL,
      client_secret: { value, expires_at: data?.expires_at },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
