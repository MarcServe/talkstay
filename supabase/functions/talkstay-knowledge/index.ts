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

/** Keep only guest-safe structured display fields for rich cards. */
function sanitizeMedia(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const m = raw as any;
  const sections = Array.isArray(m.sections)
    ? m.sections.slice(0, 12).map((s: any) => ({
      title: String(s?.title ?? "").trim().slice(0, 80),
      items: Array.isArray(s?.items)
        ? s.items.map((i: any) => String(i ?? "").trim().slice(0, 160)).filter(Boolean).slice(0, 40)
        : [],
    })).filter((s: any) => s.title || s.items.length)
    : [];
  const links = Array.isArray(m.links)
    ? m.links.slice(0, 12).map((l: any) => ({
      label: String(l?.label ?? "Open").trim().slice(0, 80),
      url: String(l?.url ?? "").trim().slice(0, 500),
    })).filter((l: any) => /^https?:\/\//i.test(l.url))
    : [];
  const images = Array.isArray(m.images)
    ? m.images.slice(0, 8).map((img: any) => ({
      url: String(img?.url ?? "").trim().slice(0, 500),
      alt: String(img?.alt ?? "").trim().slice(0, 120) || undefined,
    })).filter((img: any) => /^https?:\/\//i.test(img.url))
    : [];
  const out: Record<string, unknown> = {};
  if (sections.length) out.sections = sections;
  if (links.length) out.links = links;
  if (images.length) out.images = images;
  return out;
}

function mediaIsEmpty(media: Record<string, unknown>): boolean {
  return !Object.keys(media).length;
}

/** Fallback when DB has no media column yet — guest-chat can parse this marker. */
function appendCardMeta(content: string, media: Record<string, unknown>): string {
  const base = content.replace(/\n*\[\[ts-card\]\][\s\S]*?\[\[\/ts-card\]\]\s*$/i, "").trimEnd();
  if (mediaIsEmpty(media)) return base;
  return `${base}\n\n[[ts-card]]${JSON.stringify(media)}[[/ts-card]]`;
}

function isMissingMediaColumn(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return m.includes("media") && (
    m.includes("column") || m.includes("schema cache") || m.includes("could not find") || m.includes("does not exist")
  );
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

/** Read a menu / info photo and return a guest card structure. */

/** Read a menu (photo or pasted text) into priced line items for the tap-to-log
 *  catalogue. Deliberately conservative: an item with no clearly printed price
 *  comes back with price null rather than a guess, because a wrong price is
 *  worse than a blank one — staff can see a gap, they can't see a silent error. */
async function extractMenuItems(
  apiKey: string,
  input: { imageUrl?: string; text?: string },
): Promise<{ items: { name: string; price: number | null }[]; currencyHint: string | null }> {
  const clean = apiKey.replace(/[^\x21-\x7E]/g, "");
  const system =
    "You extract orderable line items and prices from a hospitality menu or service list. " +
    "Return JSON only: { currency, items: [{ name, price }] }. " +
    "name: the item as printed, without the price, max 80 chars, no leading bullets or numbers. " +
    "price: the number only (14.5 not '£14.50'). If no price is clearly printed for that item, use null. " +
    "NEVER invent, infer or average a price. Skip section headings, descriptions, allergen notes and prose. " +
    "currency: ISO code if identifiable from symbols (GBP, EUR, USD), else null. " +
    "Max 120 items.";

  const userContent = input.imageUrl
    ? [
        { type: "text", text: "Extract the orderable items and prices from this menu." },
        { type: "image_url", image_url: { url: input.imageUrl, detail: "high" } },
      ]
    : `Extract the orderable items and prices from this menu:\n\n${String(input.text ?? "").slice(0, 12000)}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clean}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Menu scan failed (${r.status})`);
  const data = await r.json();
  const parsed = JSON.parse(String(data?.choices?.[0]?.message?.content ?? "{}"));

  // Must match menuItemKey() on the client — the two guard different moments
  // (within one scan here, against the saved menu there) and disagreeing would
  // let an item through both.
  const key = (n: string) => n
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim().replace(/\s+/g, " ");

  const seen = new Set<string>();
  const items: { name: string; price: number | null }[] = [];
  for (const raw of Array.isArray(parsed.items) ? parsed.items : []) {
    const name = String(raw?.name ?? "").trim().replace(/^[-•*\d.)\s]+/, "").slice(0, 80);
    if (!name) continue;
    const k = key(name);
    if (!k || seen.has(k)) continue;   // same dish printed twice on the page
    seen.add(k);
    const n = Number(raw?.price);
    items.push({
      name,
      price: Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n * 100) / 100 : null,
    });
    if (items.length >= 120) break;
  }
  const cur = String(parsed.currency ?? "").trim().toUpperCase();
  return { items, currencyHint: /^[A-Z]{3}$/.test(cur) ? cur : null };
}

async function scanPhotoToCard(imageUrl: string, apiKey: string): Promise<{
  title: string; summary: string; media: Record<string, unknown>;
}> {
  const clean = apiKey.replace(/[^\x21-\x7E]/g, "");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clean}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You turn hotel photos (menus, hours, notices, room guides) into structured guest knowledge. " +
            "Read all readable text. Organise into clear sections with short item lines. " +
            "Return JSON only: { title, summary, imageCaption, sections:[{title, items:string[]}] }. " +
            "title: short card title. summary: 1-3 sentences for search. imageCaption: what the photo shows. " +
            "sections: 1-8 groups (e.g. Cooked breakfast, Drinks, Hours). items: one dish/fact per string, include prices if visible. " +
            "If the image is not useful hotel info, still return best-effort title/summary and empty sections.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract guest-facing knowledge from this photo." },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`Couldn't read that photo (${r.status}). ${errText.slice(0, 120)}`);
  }
  const d = await r.json();
  let parsed: any = {};
  try {
    parsed = JSON.parse(d.choices?.[0]?.message?.content ?? "{}");
  } catch {
    parsed = {};
  }
  const title = String(parsed.title ?? "").trim().slice(0, 120) || "From photo";
  const summary = String(parsed.summary ?? "").trim().slice(0, 800);
  const imageCaption = String(parsed.imageCaption ?? parsed.title ?? "").trim().slice(0, 120);
  const media = sanitizeMedia({
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    images: [{ url: imageUrl, alt: imageCaption || title }],
    links: [],
  });
  return { title, summary, media };
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

    // -------- scan_photo (camera / upload → structured card fields) --------
    // -------- scan_menu: photo or pasted text -> priced catalogue items --------
    // Returns candidates only. Nothing is written here — the caller reviews and
    // confirms, because these are prices that end up on a guest's bill.
    if (action === "scan_menu") {
      const { hotelId, departmentKey = null, imageUrl, text } = body;
      if (!hotelId) return json({ error: "hotelId required" }, 400);
      if (!imageUrl && !String(text ?? "").trim()) {
        return json({ error: "imageUrl or text required" }, 400);
      }
      if (imageUrl && !/^https?:\/\//i.test(String(imageUrl))) {
        return json({ error: "imageUrl must be http(s)" }, 400);
      }
      const { data: can } = await admin.rpc("ts_kb_can_write", {
        _hotel_id: hotelId, _scope: departmentKey ? "department" : "general",
        _department_key: departmentKey, _user_id: uid,
      });
      if (!can) return json({ error: "You don't have permission to edit this menu." }, 403);
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);
      try {
        const out = await extractMenuItems(OPENAI_API_KEY, {
          imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
          text: text ? String(text) : undefined,
        });
        return json({ ok: true, ...out });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "Menu scan failed" }, 502);
      }
    }

    if (action === "scan_photo") {
      const { hotelId, scope = "general", departmentKey = null, imageUrl } = body;
      if (!hotelId || !imageUrl) return json({ error: "hotelId and imageUrl required" }, 400);
      if (!/^https?:\/\//i.test(String(imageUrl))) return json({ error: "imageUrl must be http(s)" }, 400);
      const { data: can } = await admin.rpc("ts_kb_can_write", {
        _hotel_id: hotelId, _scope: scope, _department_key: departmentKey, _user_id: uid,
      });
      if (!can) return json({ error: "You don't have permission to add this knowledge." }, 403);
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);
      const scanned = await scanPhotoToCard(String(imageUrl).trim(), OPENAI_API_KEY);
      return json({ ok: true, ...scanned });
    }

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
      const { id, title, content, media } = body;
      if (!id || !content) return json({ error: "id and content required" }, 400);
      const { data: row } = await admin.from("ts_knowledge")
        .select("hotel_id, scope, department_key, room_id").eq("id", id).maybeSingle();
      if (!row) return json({ error: "not found" }, 404);
      const { data: can } = await admin.rpc("ts_kb_can_write", {
        _hotel_id: row.hotel_id, _scope: row.scope, _department_key: row.department_key, _user_id: uid,
      });
      if (!can) return json({ error: "Forbidden" }, 403);
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);

      const mediaJson = sanitizeMedia(media);
      const chunks = chunk(String(content));
      const vecs = await embed(chunks, OPENAI_API_KEY);

      if (chunks.length === 1) {
        // Fits in one entry — edit this row in place, id stays stable.
        let { error } = await admin.from("ts_knowledge").update({
          title: title?.trim() || null, content: chunks[0], embedding: `[${vecs[0].join(",")}]`,
          media: mediaJson,
        }).eq("id", id);
        if (error && isMissingMediaColumn(error)) {
          ({ error } = await admin.from("ts_knowledge").update({
            title: title?.trim() || null,
            content: appendCardMeta(chunks[0], mediaJson),
            embedding: `[${vecs[0].join(",")}]`,
          }).eq("id", id));
        }
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, updated: 1 });
      }

      // Grew past one chunk — replace the single row with the new set,
      // same numbered-title convention as a fresh multi-chunk upload.
      const rows = chunks.map((c, i) => ({
        hotel_id: row.hotel_id, scope: row.scope, department_key: row.department_key, room_id: row.room_id,
        title: `${title?.trim() || "Entry"} (${i + 1}/${chunks.length})`,
        content: c, embedding: `[${vecs[i].join(",")}]`, created_by: uid,
        media: i === 0 ? mediaJson : {},
      }));
      let { error: insErr } = await admin.from("ts_knowledge").insert(rows);
      if (insErr && isMissingMediaColumn(insErr)) {
        const stripped = rows.map((r, i) => {
          const { media: _m, ...rest } = r as any;
          return {
            ...rest,
            content: i === 0 ? appendCardMeta(r.content, mediaJson) : r.content,
          };
        });
        ({ error: insErr } = await admin.from("ts_knowledge").insert(stripped));
      }
      if (insErr) return json({ error: insErr.message }, 400);
      await admin.from("ts_knowledge").delete().eq("id", id);
      return json({ ok: true, updated: rows.length });
    }

    // -------- upsert (create one or more rows) --------
    if (action === "upsert") {
      const { hotelId, scope, departmentKey = null, roomId = null, title, content, media } = body;
      if (!hotelId || !scope || !content) return json({ error: "hotelId, scope, content required" }, 400);
      if (scope === "department" && !departmentKey) return json({ error: "departmentKey required for department scope" }, 400);
      if (scope === "room" && !roomId) return json({ error: "roomId required for room scope" }, 400);

      const { data: can } = await admin.rpc("ts_kb_can_write", {
        _hotel_id: hotelId, _scope: scope, _department_key: departmentKey, _user_id: uid,
      });
      if (!can) return json({ error: "You don't have permission to add this knowledge." }, 403);
      if (!OPENAI_API_KEY) return json({ error: "AI not configured" }, 500);

      const mediaJson = sanitizeMedia(media);
      const chunks = chunk(String(content));
      const vecs = await embed(chunks, OPENAI_API_KEY);
      const rows = chunks.map((c, i) => ({
        hotel_id: hotelId, scope, department_key: scope === "department" ? departmentKey : null,
        room_id: scope === "room" ? roomId : null,
        title: chunks.length > 1 ? `${title || "Entry"} (${i + 1}/${chunks.length})` : (title || null),
        content: c, embedding: `[${vecs[i].join(",")}]`, created_by: uid,
        media: i === 0 ? mediaJson : {},
      }));
      let { error } = await admin.from("ts_knowledge").insert(rows);
      if (error && isMissingMediaColumn(error)) {
        const stripped = rows.map((r, i) => {
          const { media: _m, ...rest } = r as any;
          return {
            ...rest,
            content: i === 0 ? appendCardMeta(r.content, mediaJson) : r.content,
          };
        });
        ({ error } = await admin.from("ts_knowledge").insert(stripped));
      }
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, inserted: rows.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
