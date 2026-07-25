import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Save } from "lucide-react";
import type { Hotel } from "@/talkstay/lib/hotels";

interface Entry { id: string; title: string; content: string; }

const STARTERS = [
  "Breakfast times", "Wi-Fi", "Check-out policy", "Room service menu",
  "Pool & gym hours", "Parking", "Nearby attractions",
];

export default function KnowledgePanel({ hotel }: { hotel: Hotel }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    if (!hotel.assistant_id) { setEntries([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("assistants")
      .select("scraped_content")
      .eq("id", hotel.assistant_id)
      .maybeSingle();
    if (error) toast.error(error.message);
    const raw = (data?.scraped_content as any)?.manualEntries;
    setEntries(Array.isArray(raw) ? raw.filter((e: any) => e?.title || e?.content) : []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hotel.id]);

  const addEntry = (title = "") =>
    setEntries((p) => [...p, { id: `entry-${Date.now()}-${p.length}`, title, content: "" }]);
  const update = (id: string, patch: Partial<Entry>) =>
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => setEntries((p) => p.filter((e) => e.id !== id));

  const saveAndIndex = async () => {
    if (!hotel.assistant_id) { toast.error("Hotel has no assistant"); return; }
    const clean = entries
      .map((e) => ({ ...e, title: e.title.trim(), content: e.content.trim() }))
      .filter((e) => e.content.length > 2);
    setSaving(true);
    try {
      // 1. Persist entries onto the assistant (canonical, editable copy).
      const { data: cur } = await supabase
        .from("assistants").select("scraped_content").eq("id", hotel.assistant_id).maybeSingle();
      const merged = { ...((cur?.scraped_content as any) || {}), manualEntries: clean };
      const { error: upErr } = await supabase
        .from("assistants").update({ scraped_content: merged }).eq("id", hotel.assistant_id);
      if (upErr) throw upErr;

      // 2. Embed + index into knowledge_vectors via the shared knowledge-upsert fn.
      if (clean.length > 0) {
        const { error: idxErr } = await supabase.functions.invoke("knowledge-upsert", {
          body: {
            assistantId: hotel.assistant_id,
            websiteUrl: "https://talkstay.talkweb.io",
            pages: clean.map((e) => ({
              url: `manual://${e.id}`,
              title: e.title || "Hotel info",
              content: e.content,
            })),
            replace: false,
            tags: ["manual", "hotel"],
          },
        });
        if (idxErr) {
          toast.warning("Saved, but indexing had an issue — entries still available.");
        } else {
          toast.success(`Saved & indexed ${clean.length} entr${clean.length === 1 ? "y" : "ies"}.`);
        }
      } else {
        toast.success("Saved.");
      }
      setEntries(clean);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Add what your guests ask about — breakfast times, Wi-Fi, check-out, menus, policies.
        The assistant answers from this. One topic per entry works best.
      </p>

      {entries.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => addEntry(s)}>
              <Plus className="mr-1 h-3 w-3" /> {s}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {entries.map((e) => (
          <div key={e.id} className="rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <Input
                value={e.title}
                onChange={(ev) => update(e.id, { title: ev.target.value })}
                placeholder="Title (e.g. Breakfast times)"
                className="font-medium"
              />
              <Button size="sm" variant="ghost" onClick={() => remove(e.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea
              value={e.content}
              onChange={(ev) => update(e.id, { content: ev.target.value })}
              placeholder="Breakfast is served 7–10:30am in the ground-floor restaurant…"
              rows={3}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => addEntry()}>
          <Plus className="mr-1 h-4 w-4" /> Add entry
        </Button>
        <Button onClick={saveAndIndex} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save &amp; index
        </Button>
      </div>
    </div>
  );
}
