import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function chunk(text: string, size = 1200, overlap = 150): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= size) return [t];
  const out: string[] = [];
  let i = 0;
  while (i < t.length) { out.push(t.slice(i, i + size)); i += size - overlap; }
  return out;
}

async function embed(texts: string[], apiKey: string): Promise<number[][]> {
  const clean = apiKey.replace(/[^\x21-\x7E]/g, "");
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${clean}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!r.ok) throw new Error(`embedding error ${r.status}`);
  const d = await r.json();
  return d.data.map((x: any) => x.embedding);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").trim();

    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const uid = u.user.id;

    const body = await req.json();
    const { action } = body;

    // -------- delete --------
    if (action === "delete") {
      const { id } = body;
      const { data: row } = await admin.from("ts_knowledge")
        .select("hotel_id, scope, department_key").eq("id", id).maybeSingle();
      if (!row) return json({ error: "not found" }, 404);
      const { data: can } = await admin.rpc("ts_kb_can_write", {
        _hotel_id: row.hotel_id, _scope: row.scope, _department_key: row.department_key, _user_id: uid,
      });
      if (!can) return json({ error: "Forbidden" }, 403);
      await admin.from("ts_knowledge").delete().eq("id", id);
      return json({ ok: true });
    }

    // -------- update (edit an existing entry) --------
    if (action === "update") {
      const { id, title, content } = body;
      if (!id || !content) return json({ error: "id and content required" }, 400);
      const { data: row } = await admin.from("ts_knowledge")
        .select("hotel_id, scope, department_key, room_id").eq("id", id).maybeSingle();
      if (!row) return json({ error: "not found" }, 404);
      const { data: can } = await admin.rpc("ts_kb_can_write", {
        _hotel_id: row.hotel_id, _scope: row.scope, _department_key: row.department_key, _user_id: uid,
      });
      if (!can) return json({ error: "Forbidden" }, 403);
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);

      const chunks = chunk(String(content));
      const vecs = await embed(chunks, OPENAI_API_KEY);

      if (chunks.length === 1) {
        // Fits in one entry — edit this row in place, id stays stable.
        const { error } = await admin.from("ts_knowledge").update({
          title: title?.trim() || null, content: chunks[0], embedding: `[${vecs[0].join(",")}]`,
        }).eq("id", id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, updated: 1 });
      }

      // Grew past one chunk — replace the single row with the new set,
      // same numbered-title convention as a fresh multi-chunk upload.
      const rows = chunks.map((c, i) => ({
        hotel_id: row.hotel_id, scope: row.scope, department_key: row.department_key, room_id: row.room_id,
        title: `${title?.trim() || "Entry"} (${i + 1}/${chunks.length})`,
        content: c, embedding: `[${vecs[i].join(",")}]`, created_by: uid,
      }));
      const { error: insErr } = await admin.from("ts_knowledge").insert(rows);
      if (insErr) return json({ error: insErr.message }, 400);
      await admin.from("ts_knowledge").delete().eq("id", id);
      return json({ ok: true, updated: rows.length });
    }

    // -------- upsert (create one or more rows) --------
    if (action === "upsert") {
      const { hotelId, scope, departmentKey = null, roomId = null, title, content } = body;
      if (!hotelId || !scope || !content) return json({ error: "hotelId, scope, content required" }, 400);
      if (scope === "department" && !departmentKey) return json({ error: "departmentKey required for department scope" }, 400);
      if (scope === "room" && !roomId) return json({ error: "roomId required for room scope" }, 400);

      const { data: can } = await admin.rpc("ts_kb_can_write", {
        _hotel_id: hotelId, _scope: scope, _department_key: departmentKey, _user_id: uid,
      });
      if (!can) return json({ error: "You don't have permission to add this knowledge." }, 403);
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);

      const chunks = chunk(String(content));
      const vecs = await embed(chunks, OPENAI_API_KEY);
      const rows = chunks.map((c, i) => ({
        hotel_id: hotelId, scope, department_key: scope === "department" ? departmentKey : null,
        room_id: scope === "room" ? roomId : null,
        title: chunks.length > 1 ? `${title || "Entry"} (${i + 1}/${chunks.length})` : (title || null),
        content: c, embedding: `[${vecs[i].join(",")}]`, created_by: uid,
      }));
      const { error } = await admin.from("ts_knowledge").insert(rows);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, inserted: rows.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
