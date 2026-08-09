import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Upload, Search, Pencil, X } from "lucide-react";
import { DEPARTMENTS, listRooms, type Hotel, type Room } from "@/talkstay/lib/hotels";
import ContentPanel from "@/talkstay/components/ContentPanel";

// "site" = the hotel's website & uploaded documents (TalkWeb Content section);
// the other three are TalkStay's layered, access-controlled entries.
type Scope = "site" | "general" | "department" | "room";
interface Entry { id: string; title: string | null; content: string; scope: string; department_key: string | null; room_id: string | null; }

const SCOPE_LABEL: Record<Scope, string> = {
  site: "Website & docs", general: "General", department: "Department", room: "Room",
};

export default function KnowledgePanel({ hotel }: { hotel: Hotel }) {
  const [scope, setScope] = useState<Scope>("site");
  const [dept, setDept] = useState(DEPARTMENTS[0].key);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { listRooms(hotel.id).then((r) => { setRooms(r); if (r[0]) setRoomId(r[0].id); }); }, [hotel.id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ts_knowledge")
      .select("id, title, content, scope, department_key, room_id")
      .eq("hotel_id", hotel.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setEntries((data as Entry[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hotel.id]);

  const visible = useMemo(() => entries.filter((e) => {
    if (e.scope !== scope) return false;
    if (scope === "department") return e.department_key === dept;
    if (scope === "room") return e.room_id === roomId;
    return true;
  }), [entries, scope, dept, roomId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((e) => (e.title ?? "").toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
  }, [visible, search]);

  const targetPayload = () => ({
    hotelId: hotel.id, scope,
    departmentKey: scope === "department" ? dept : null,
    roomId: scope === "room" ? roomId : null,
  });

  const addEntry = async () => {
    if (!content.trim()) return;
    if (scope === "room" && !roomId) { toast.error("Add a room first."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: { action: "upsert", title: title.trim() || null, content: content.trim(), ...targetPayload() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTitle(""); setContent("");
      await load();
      toast.success("Saved & indexed.");
    } catch (e: any) { toast.error(e?.message ?? "Failed to save"); }
    finally { setBusy(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (scope === "room" && !roomId) { toast.error("Add a room first."); return; }
    setBusy(true);
    try {
      let text: string;
      if (file.name.toLowerCase().endsWith(".pdf")) {
        // PDFs parse entirely in the browser via TalkWeb's own pdf.js pipeline
        // (already used for large files in DocumentUploadSection) — avoids
        // parse-document, which was unreliable for PDFs uploaded here.
        const { parseClientPDF } = await import("@/utils/clientPDFParser");
        const result = await parseClientPDF(file, file.name);
        text = result.pages.map((p) => p.content).join("\n\n").trim();
      } else {
        // Reuse TalkWeb's parse-document for DOCX/TXT/etc.
        const fd = new FormData();
        fd.append("file", file);
        fd.append("fileName", file.name);
        const { data: parsed, error: pErr } = await supabase.functions.invoke("parse-document", { body: fd });
        if (pErr) throw new Error(`Couldn't read the document: ${pErr.message}`);
        text = ((parsed?.pages ?? []) as any[]).map((p) => p.content || "").join("\n\n").trim();
      }
      if (text.length < 20) throw new Error("No readable text found in that file.");
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: { action: "upsert", title: file.name.replace(/\.[^.]+$/, ""), content: text, ...targetPayload() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await load();
      toast.success(`Indexed “${file.name}”.`);
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("talkstay-knowledge", { body: { action: "delete", id } });
    if (error || (data as any)?.error) { toast.error(error?.message ?? (data as any)?.error); return; }
    load();
  };

  const startEdit = (e: Entry) => {
    setEditingId(e.id); setEditTitle(e.title ?? ""); setEditContent(e.content);
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    setEditBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: { action: "update", id: editingId, title: editTitle.trim() || null, content: editContent.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setEditingId(null);
      await load();
      toast.success("Updated & re-indexed.");
    } catch (e: any) { toast.error(e?.message ?? "Failed to update"); }
    finally { setEditBusy(false); }
  };

  return (
    <div className="space-y-5">
      {/* Scope selector — one place for ALL knowledge: website/docs + layered entries */}
      <div className="flex flex-wrap items-center gap-2">
        {(["site", "general", "department", "room"] as Scope[]).map((s) => (
          <Button key={s} size="sm" variant={scope === s ? "default" : "outline"} onClick={() => setScope(s)}>
            {SCOPE_LABEL[s]}
          </Button>
        ))}
        {scope === "department" && (
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {scope === "room" && (
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select room" /></SelectTrigger>
            <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {scope === "site" ? (
        <ContentPanel hotel={hotel} />
      ) : (
      <>
      <p className="text-xs text-muted-foreground">
        {scope === "general" && "Property-wide info every guest can ask about (breakfast, wifi, checkout, policies)."}
        {scope === "department" && "Guest-facing info for a team (menus, spa treatments, opening hours)."}
        {scope === "room" && "Info shown only to this room's guest (appliance guide, balcony access, quirks)."}
      </p>

      {/* Add */}
      <div className="rounded-2xl border p-4 space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type the information…" rows={3} />
        <div className="flex items-center justify-between">
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.md,.docx,.json,.csv" onChange={onFile} />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Upload document
          </Button>
          <Button size="sm" disabled={busy || !content.trim()} onClick={addEntry}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Add
          </Button>
        </div>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries in this scope yet.</p>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder={`Search ${visible.length} ${visible.length === 1 ? "entry" : "entries"}…`}
              className="pl-9"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries match "{search}".</p>
          ) : (
            <div className="divide-y rounded-2xl border">
              {filtered.map((e) => (
                <div key={e.id} className="px-4 py-3">
                  {editingId === e.id ? (
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={(ev) => setEditTitle(ev.target.value)} placeholder="Title (optional)" />
                      <Textarea value={editContent} onChange={(ev) => setEditContent(ev.target.value)} rows={4} />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" disabled={editBusy} onClick={cancelEdit}>
                          <X className="mr-1 h-4 w-4" /> Cancel
                        </Button>
                        <Button size="sm" disabled={editBusy || !editContent.trim()} onClick={saveEdit}>
                          {editBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <button className="min-w-0 flex-1 text-left" onClick={() => startEdit(e)} title="Click to edit">
                        {e.title && <div className="text-sm font-medium">{e.title}</div>}
                        <div className="line-clamp-2 text-sm text-muted-foreground">{e.content}</div>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => startEdit(e)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => del(e.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}
