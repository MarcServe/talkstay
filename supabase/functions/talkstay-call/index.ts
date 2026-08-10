import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authorizeRequestSideEffect } from "../_shared/talkstayAuth.ts";
import { formatRoomLabel } from "../_shared/roomLabel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DEPT_LABEL: Record<string, string> = {
  housekeeping: "Housekeeping", laundry: "Laundry", kitchen: "Kitchen", bar: "Bar",
  maintenance: "Maintenance", concierge: "Concierge", front_desk: "Front Desk", duty_manager: "Duty Manager",
};

// Places an outbound voice call telling a manager/front-desk that a guest is waiting.
// Requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_VOICE_FROM (a voice-capable
// Twilio number). Until those are set it returns { ok:false, reason:"twilio_not_configured" }
// so nothing breaks — the rest of escalation (urgent flag, email, push) still runs.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { requestId } = await req.json();
    if (!requestId) return json({ error: "requestId required" }, 400);

    const { data: r } = await admin
      .from("ts_service_requests").select("id, hotel_id, room_id, department_key, summary").eq("id", requestId).maybeSingle();
    if (!r) return json({ error: "request not found" }, 404);

    const authz = await authorizeRequestSideEffect(req, admin, {
      hotelId: r.hotel_id,
      requestId: r.id,
      allowCronEscalate: true,
    });
    if (!authz.ok) return json({ error: authz.error }, authz.status);

    const [{ data: hotel }, { data: room }] = await Promise.all([
      admin.from("ts_hotels").select("name, escalation_phone").eq("id", r.hotel_id).maybeSingle(),
      r.room_id ? admin.from("ts_rooms").select("room_number").eq("id", r.room_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const to = hotel?.escalation_phone?.trim();
    if (!to) return json({ ok: false, reason: "no_number" });

    const SID = (Deno.env.get("TWILIO_ACCOUNT_SID") || "").trim();
    const AUTH = (Deno.env.get("TWILIO_AUTH_TOKEN") || "").trim();
    const FROM = (Deno.env.get("TWILIO_VOICE_FROM") || "").trim();
    if (!SID || !AUTH || !FROM) return json({ ok: false, reason: "twilio_not_configured" });

    const roomLabel = formatRoomLabel(room?.room_number, { fallback: "a stay" });
    const label = DEPT_LABEL[r.department_key] ?? r.department_key;
    const twiml = `<Response><Say voice="Polly.Amy">This is TalkStay for ${hotel?.name ?? "your property"}. A guest in ${roomLabel} has been waiting for ${label}. Please open the TalkStay dashboard to respond.</Say></Response>`;

    const form = new URLSearchParams({ To: to, From: FROM, Twiml: twiml });
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${SID}:${AUTH}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!resp.ok) {
      const err = await resp.text();
      return json({ ok: false, reason: "twilio_error", status: resp.status, detail: err.slice(0, 300) });
    }
    const data = await resp.json();
    return json({ ok: true, sid: data.sid });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
