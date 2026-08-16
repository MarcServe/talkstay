import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Loader2, Trash2, Plus, Upload, Search, Pencil, X, ImageIcon, Link2, ChevronDown, Copy, Camera, Replace,
} from "lucide-react";
import { DEPARTMENTS, listRooms, friendlyImageName, type Hotel, type Room } from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import ContentPanel from "@/talkstay/components/ContentPanel";
import type { GuestCard } from "@/talkstay/lib/guest";
import { cn } from "@/lib/utils";
import { KB_SCOPE_CARD, KB_SCOPE_STYLE } from "@/talkstay/lib/statusStyles";
import { useDemo } from "@/talkstay/demo/DemoContext";
import { useHotelDepartments } from "@/talkstay/hooks/useHotelDepartments";

// "site" = the hotel's website & uploaded documents (TalkWeb Content section);
// the other three are TalkStay's layered, access-controlled entries.
type Scope = "site" | "general" | "department" | "room";
type Media = NonNullable<GuestCard> & { sections?: { title: string; items: string[] }[] };
interface Entry {
  id: string; title: string | null; content: string; scope: string;
  department_key: string | null; room_id: string | null; media?: Media | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const SCOPE_LABEL: Record<Scope, string> = {
  site: "Website & docs", general: "General", department: "Department", room: "Room",
};

type DayBucket = "today" | "yesterday" | "week" | "older" | "unknown";
const DAY_BUCKET_LABEL: Record<DayBucket, string> = {
  today: "Added today",
  yesterday: "Added yesterday",
  week: "Added this week",
  older: "Older",
  unknown: "Undated",
};
const DAY_BUCKET_ORDER: DayBucket[] = ["today", "yesterday", "week", "older", "unknown"];

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function knowledgeDayBucket(iso: string | null | undefined): DayBucket {
  if (!iso) return "unknown";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "unknown";
  const today = startOfLocalDay();
  const day = startOfLocalDay(new Date(t));
  const diffDays = Math.round((today - day) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return "week";
  return "older";
}

function formatAddedWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const emptyMedia = (): Media => ({ sections: [{ title: "", items: [] }], links: [], images: [] });

function stripCardMeta(content: string): string {
  return content.replace(/\n*\[\[ts-card\]\][\s\S]*?\[\[\/ts-card\]\]\s*$/i, "").trim();
}

function parseCardMeta(content: string): Media | null {
  const m = content.match(/\[\[ts-card\]\]([\s\S]*?)\[\[\/ts-card\]\]/i);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
      images: Array.isArray(parsed.images) ? parsed.images : [],
    };
  } catch {
    return null;
  }
}

function storedMedia(e: Entry): Media | null {
  const fromCol = e.media && typeof e.media === "object" ? e.media : null;
  const fromMeta = parseCardMeta(e.content);
  const m = (fromCol?.sections?.length || fromCol?.links?.length || fromCol?.images?.length)
    ? fromCol
    : fromMeta;
  if (!m || !(m.sections?.length || m.links?.length || m.images?.length)) return null;
  return {
    sections: Array.isArray(m.sections) && m.sections.length ? m.sections : [{ title: "", items: [] }],
    links: Array.isArray(m.links) ? m.links : [],
    images: Array.isArray(m.images) ? m.images : [],
  };
}

function mediaFromEntry(e: Entry): Media {
  return storedMedia(e) ?? {
    sections: [{ title: "", items: [] }],
    links: [],
    images: [],
  };
}

function mediaHasExtras(media: Media): boolean {
  const hasSection = (media.sections ?? []).some((s) => !!s.title?.trim() || (s.items?.length ?? 0) > 0);
  return hasSection || !!(media.links?.length) || !!(media.images?.length);
}

function flattenMediaToContent(title: string, media: Media, fallback: string): string {
  const parts: string[] = [];
  if (title.trim()) parts.push(title.trim());
  for (const s of media.sections ?? []) {
    if (s.title.trim()) parts.push(s.title.trim());
    for (const item of s.items ?? []) if (item.trim()) parts.push(item.trim());
  }
  for (const l of media.links ?? []) {
    if (l.url.trim()) parts.push(`${l.label || "Link"}: ${l.url.trim()}`);
  }
  for (const img of media.images ?? []) {
    if (!img.url.trim()) continue;
    const caption = (img.alt ?? "").trim();
    parts.push(caption ? `Photo (${caption}): ${img.url.trim()}` : `Photo: ${img.url.trim()}`);
  }
  const built = parts.join("\n").trim();
  return built || fallback.trim();
}

async function invokeErrorMessage(error: any, data?: any): Promise<string> {
  if (data?.error) return String(data.error);
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch { /* ignore */ }
  return error?.message ?? "Something went wrong";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(text: string, find: string): number {
  if (!find || !text) return 0;
  return (text.match(new RegExp(escapeRegExp(find), "gi")) ?? []).length;
}

function replaceAllText(text: string, find: string, replacement: string): string {
  if (!find) return text;
  return text.replace(new RegExp(escapeRegExp(find), "gi"), replacement);
}

/** Highlight every case-insensitive match of `query` in plain text. */
function highlightText(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q || !text) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  const lower = q.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === lower ? (
      <mark key={i} className="rounded bg-amber-200 px-0.5 text-foreground dark:bg-amber-500/40">{part}</mark>
    ) : (
      part
    )
  );
}

function entrySearchBlob(e: Entry): string {
  const m = storedMedia(e);
  const parts = [e.title ?? "", stripCardMeta(e.content)];
  if (m) {
    for (const s of m.sections ?? []) {
      parts.push(s.title, ...(s.items ?? []));
    }
    for (const l of m.links ?? []) parts.push(l.label, l.url);
    for (const img of m.images ?? []) parts.push(img.alt ?? "", img.url);
  }
  return parts.join("\n");
}

function replaceInMedia(media: Media, find: string, replacement: string): Media {
  return {
    sections: (media.sections ?? []).map((s) => ({
      title: replaceAllText(s.title, find, replacement),
      items: (s.items ?? []).map((item) => replaceAllText(item, find, replacement)),
    })),
    links: (media.links ?? []).map((l) => ({
      label: replaceAllText(l.label, find, replacement),
      url: replaceAllText(l.url, find, replacement),
    })),
    images: (media.images ?? []).map((img) => ({
      url: replaceAllText(img.url, find, replacement),
      alt: img.alt != null ? replaceAllText(img.alt, find, replacement) : img.alt,
    })),
  };
}

function sanitizeClientMedia(raw: any, imageUrl: string, fallbackCaption: string): Media {
  const sections = Array.isArray(raw?.sections)
    ? raw.sections.map((s: any) => ({
      title: String(s?.title ?? "").trim(),
      items: Array.isArray(s?.items)
        ? s.items.map((i: any) => String(i ?? "").trim()).filter(Boolean)
        : [],
    })).filter((s: any) => s.title || s.items.length)
    : [];
  const images = Array.isArray(raw?.images) && raw.images.length
    ? raw.images.map((img: any) => ({
      url: String(img?.url ?? imageUrl).trim(),
      alt: String(img?.alt ?? fallbackCaption).trim(),
    })).filter((img: any) => /^https?:\/\//i.test(img.url))
    : [{ url: imageUrl, alt: fallbackCaption }];
  return {
    sections: sections.length ? sections : [{ title: "", items: [] }],
    links: Array.isArray(raw?.links) ? raw.links : [],
    images,
  };
}

function MediaEditor({
  media, onChange, hotelId, uploading, onUpload, defaultOpen = false,
}: {
  media: Media;
  onChange: (m: Media) => void;
  hotelId: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  defaultOpen?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(defaultOpen || mediaHasExtras(media));
  const sections = (media.sections?.length ? media.sections : [{ title: "", items: [] as string[] }]);
  const linksText = (media.links ?? []).map((l) => `${l.label || "View"} | ${l.url}`).join("\n");

  useEffect(() => {
    if (mediaHasExtras(media)) setOpen(true);
  }, [media.images?.length, media.links?.length, media.sections?.length]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Image link copied");
    } catch {
      toast.message(url);
    }
  };

  const setSection = (index: number, next: { title: string; items: string[] }) => {
    const copy = [...sections];
    copy[index] = next;
    onChange({ ...media, sections: copy });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-muted/20">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">Guest card extras (optional)</p>
            <p className="text-[11px] text-muted-foreground">
              Photos, View buttons, and menu sections — leave closed for a simple text card.
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t px-3 pb-3 pt-3">
        <div className="rounded-lg bg-background/80 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">How this works for staff</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>Prefer <span className="font-medium text-foreground">Scan a photo</span> above for menus — or type sections here.</li>
            <li>Upload extra photos and add captions. Optional View buttons: <span className="font-medium text-foreground">Label | https://…</span></li>
          </ol>
        </div>

        <div className="space-y-3">
          {sections.map((section, si) => (
            <div key={si} className="space-y-1.5 rounded-lg border bg-background/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Section {si + 1}
                </p>
                {sections.length > 1 && (
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => onChange({ ...media, sections: sections.filter((_, j) => j !== si) })}
                  >
                    Remove
                  </button>
                )}
              </div>
              <Input
                value={section.title}
                onChange={(e) => setSection(si, { title: e.target.value, items: section.items })}
                placeholder="Section title (e.g. Unlimited cooked options)"
              />
              <Textarea
                value={(section.items ?? []).join("\n")}
                onChange={(e) => setSection(si, {
                  title: section.title,
                  items: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                })}
                placeholder={"One item per line\nEggs (scrambled, fried…)\nBack bacon\n…"}
                rows={si === 0 ? 4 : 3}
              />
            </div>
          ))}
          {sections.length < 8 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => onChange({ ...media, sections: [...sections, { title: "", items: [] }] })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add section
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" /> View links — Label | url
          </div>
          <Textarea
            value={linksText}
            onChange={(e) => {
              const links = e.target.value.split("\n").map((line) => {
                const [label, ...rest] = line.split("|");
                const url = rest.join("|").trim() || label.trim();
                return { label: (rest.length ? label.trim() : "View") || "View", url };
              }).filter((l) => l.url);
              onChange({ ...media, links });
            }}
            placeholder={"Full breakfast menu | https://…\nOrder online | https://…"}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> Photos
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onUpload(f);
              }}
            />
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
              Upload image
            </Button>
          </div>

          {(media.images?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {media.images!.map((img, i) => (
                <div key={`${img.url}-${i}`} className="flex gap-2 rounded-lg border bg-background p-2">
                  <img src={img.url} alt={img.alt || ""} className="h-16 w-20 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Input
                      value={img.alt ?? ""}
                      onChange={(e) => {
                        const images = [...(media.images ?? [])];
                        images[i] = { ...images[i], alt: e.target.value };
                        onChange({ ...media, images });
                      }}
                      placeholder="Caption / description (e.g. Full cooked breakfast)"
                      className="h-8 text-xs"
                    />
                    <div className="flex items-center gap-1">
                      <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground" title={img.url}>
                        {img.url}
                      </p>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyUrl(img.url)} title="Copy image link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        title="Remove"
                        onClick={() => onChange({ ...media, images: media.images!.filter((_, j) => j !== i) })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        const label = (img.alt || "View photo").trim();
                        const exists = (media.links ?? []).some((l) => l.url === img.url);
                        if (exists) { toast.message("Already in View links"); return; }
                        onChange({
                          ...media,
                          links: [...(media.links ?? []), { label, url: img.url }],
                        });
                        toast.success("Added as a View button");
                      }}
                    >
                      Add as View button
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Input
            placeholder="Or paste image URL https://… then press Enter"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const url = (e.target as HTMLInputElement).value.trim();
              if (!/^https?:\/\//i.test(url)) {
                toast.error("Paste a full https:// image link");
                return;
              }
              onChange({ ...media, images: [...(media.images ?? []), { url, alt: "" }] });
              (e.target as HTMLInputElement).value = "";
              toast.success("Image link added — add a caption below");
            }}
          />
          <p className="text-[10px] text-muted-foreground">
            Images are saved to this property’s library (hotel {hotelId.slice(0, 8)}…). Guests see the photo on the card; captions help the assistant describe it.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function KnowledgePanel({ hotel }: { hotel: Hotel }) {
  const demo = useDemo();
  const { departments: hotelDepts } = useHotelDepartments(hotel.id);
  const [scope, setScope] = useState<Scope>("site");
  const [dept, setDept] = useState(DEPARTMENTS[0].key);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<Media>(emptyMedia());
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMedia, setEditMedia] = useState<Media>(emptyMedia());
  const [editBusy, setEditBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [replaceWith, setReplaceWith] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const scanGalleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (demo) {
      const rs = demo.state.rooms as unknown as Room[];
      setRooms(rs);
      if (rs[0]) setRoomId((prev) => prev || rs[0].id);
      return;
    }
    listRooms(hotel.id).then((r) => { setRooms(r); if (r[0]) setRoomId(r[0].id); });
  }, [hotel.id, demo, demo?.state.rooms, demo?.version]);

  const load = async () => {
    if (demo) {
      setEntries(
        demo.state.knowledge.map((k) => ({
          id: k.id,
          title: k.title,
          content: k.preview,
          scope: k.scope,
          department_key: k.department_key,
          room_id: null,
          media: null,
          created_at: (k as { created_at?: string }).created_at ?? null,
          updated_at: null,
        })),
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ts_knowledge")
      .select("id, title, content, scope, department_key, room_id, media, created_at, updated_at")
      .eq("hotel_id", hotel.id)
      .order("created_at", { ascending: false });
    if (error) {
      // Older DBs without media column — fall back.
      const retry = await supabase
        .from("ts_knowledge")
        .select("id, title, content, scope, department_key, room_id, created_at, updated_at")
        .eq("hotel_id", hotel.id)
        .order("created_at", { ascending: false });
      if (retry.error) toast.error(retry.error.message);
      setEntries((retry.data as Entry[]) ?? []);
    } else {
      setEntries((data as Entry[]) ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hotel.id, demo?.version]);

  const visible = useMemo(() => entries.filter((e) => {
    if (e.scope !== scope) return false;
    if (scope === "department") return e.department_key === dept;
    if (scope === "room") return e.room_id === roomId;
    return true;
  }), [entries, scope, dept, roomId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((e) => entrySearchBlob(e).toLowerCase().includes(q));
  }, [visible, search]);

  const matchCount = useMemo(() => {
    const q = search.trim();
    if (!q) return 0;
    return filtered.reduce((n, e) => n + countOccurrences(entrySearchBlob(e), q), 0);
  }, [filtered, search]);

  const groupedFiltered = useMemo(() => {
    const buckets: Record<DayBucket, Entry[]> = {
      today: [], yesterday: [], week: [], older: [], unknown: [],
    };
    for (const e of filtered) {
      buckets[knowledgeDayBucket(e.created_at)].push(e);
    }
    return DAY_BUCKET_ORDER
      .map((key) => ({ key, label: DAY_BUCKET_LABEL[key], entries: buckets[key] }))
      .filter((g) => g.entries.length > 0);
  }, [filtered]);

  const targetPayload = () => ({
    hotelId: hotel.id, scope,
    departmentKey: scope === "department" ? dept : null,
    roomId: scope === "room" ? roomId : null,
  });

  const uploadToLibrary = async (file: File): Promise<string> => {
    if (demo) {
      return URL.createObjectURL(file);
    }
    const path = `talkstay/${hotel.id}/kb-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadImage = async (file: File, apply: (url: string) => void) => {
    setImgBusy(true);
    try {
      const url = await uploadToLibrary(file);
      apply(url);
      toast.success(`Uploaded — link ready. Add a caption for “${friendlyImageName(file.name)}”.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't upload image");
    } finally {
      setImgBusy(false);
    }
  };

  /** Camera / gallery → OCR → draft for review (does not save until Add card). */
  const scanAndDraft = async (file: File) => {
    if (scope === "room" && !roomId) { toast.error("Add a room first."); return; }
    if (demo) {
      setScanBusy(true);
      const label = file.name.replace(/\.[^.]+$/, "") || "From photo";
      setTitle(label);
      setContent(`Photo scan draft (demo) — “${file.name}”. OCR runs on live accounts.`);
      setMedia(emptyMedia());
      setPendingReview(true);
      setScanBusy(false);
      toast.message("Review the draft below, then tap Add card.");
      return;
    }
    setScanBusy(true);
    try {
      const imageUrl = await uploadToLibrary(file);
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: {
          action: "scan_photo",
          imageUrl,
          ...targetPayload(),
        },
      });
      if (error) throw new Error(await invokeErrorMessage(error, data));
      if ((data as any)?.error) throw new Error((data as any).error);

      const scannedTitle = String((data as any)?.title ?? "").trim() || "From photo";
      const scannedSummary = String((data as any)?.summary ?? "").trim();
      const scannedMedia = sanitizeClientMedia((data as any)?.media, imageUrl, scannedTitle);
      const bodyContent = flattenMediaToContent(scannedTitle, scannedMedia, scannedSummary);
      if (!bodyContent) throw new Error("Couldn't read useful text from that photo — try a clearer shot.");

      setTitle(scannedTitle);
      setContent(scannedSummary || stripCardMeta(bodyContent));
      setMedia(scannedMedia);
      setPendingReview(true);
      toast.message("Review the extracted card below, then tap Add card to publish.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't scan that photo");
    } finally {
      setScanBusy(false);
    }
  };

  const discardDraft = () => {
    setTitle("");
    setContent("");
    setMedia(emptyMedia());
    setPendingReview(false);
  };

  const addEntry = async () => {
    const bodyContent = flattenMediaToContent(title, media, content);
    if (!bodyContent) return;
    if (scope === "room" && !roomId) { toast.error("Add a room first."); return; }
    if (demo) {
      setBusy(true);
      demo.addKnowledge(title.trim() || "Untitled", bodyContent, {
        scope: scope === "site" ? "general" : scope,
        department_key: scope === "department" ? dept : null,
        kind: "FAQ",
      });
      setTitle(""); setContent(""); setMedia(emptyMedia());
      setPendingReview(false);
      setBusy(false);
      toast.success("Saved (demo).");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: {
          action: "upsert",
          title: title.trim() || null,
          content: bodyContent,
          media: {
            sections: (media.sections ?? []).filter((s) => s.title.trim() || s.items.length),
            links: media.links ?? [],
            images: media.images ?? [],
          },
          ...targetPayload(),
        },
      });
      if (error) throw new Error(await invokeErrorMessage(error, data));
      if ((data as any)?.error) throw new Error((data as any).error);
      setTitle(""); setContent(""); setMedia(emptyMedia());
      setPendingReview(false);
      await load();
      toast.success("Saved — guests will see this as an organised card.");
    } catch (e: any) { toast.error(e?.message ?? "Failed to save"); }
    finally { setBusy(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (scope === "room" && !roomId) { toast.error("Add a room first."); return; }
    if (demo) {
      setBusy(true);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setContent(`Document draft (demo) — “${file.name}”. Full parsing runs on live accounts.`);
      setMedia(emptyMedia());
      setPendingReview(true);
      setBusy(false);
      toast.message("Review the draft below, then tap Add card.");
      return;
    }
    setBusy(true);
    try {
      let text: string;
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const { parseClientPDF } = await import("@/utils/clientPDFParser");
        const result = await parseClientPDF(file, file.name);
        text = result.pages.map((p) => p.content).join("\n\n").trim();
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("fileName", file.name);
        const { data: parsed, error: pErr } = await supabase.functions.invoke("parse-document", { body: fd });
        if (pErr) throw new Error(`Couldn't read the document: ${await invokeErrorMessage(pErr, parsed)}`);
        text = ((parsed?.pages ?? []) as any[]).map((p) => p.content || "").join("\n\n").trim();
      }
      if (text.length < 20) throw new Error("No readable text found in that file.");
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setContent(text);
      setMedia(emptyMedia());
      setPendingReview(true);
      toast.message("Review the extracted text below, then tap Add card to publish.");
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (demo) {
      demo.removeKnowledge(id);
      return;
    }
    const { data, error } = await supabase.functions.invoke("talkstay-knowledge", { body: { action: "delete", id } });
    if (error || (data as any)?.error) {
      toast.error(error ? await invokeErrorMessage(error, data) : (data as any)?.error);
      return;
    }
    load();
  };

  const startEdit = (e: Entry) => {
    setEditingId(e.id);
    setEditTitle(e.title ?? "");
    setEditContent(stripCardMeta(e.content));
    setEditMedia(mediaFromEntry(e));
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId) return;
    const bodyContent = flattenMediaToContent(editTitle, editMedia, editContent);
    if (!bodyContent.trim()) return;
    setEditBusy(true);
    try {
      if (demo) {
        demo.updateKnowledge(editingId, {
          title: editTitle.trim() || "Untitled",
          preview: bodyContent,
        });
        setEditingId(null);
        toast.success("Updated (demo).");
        return;
      }
      const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
        body: {
          action: "update",
          id: editingId,
          title: editTitle.trim() || null,
          content: bodyContent,
          media: {
            sections: (editMedia.sections ?? []).filter((s) => s.title.trim() || s.items.length),
            links: editMedia.links ?? [],
            images: editMedia.images ?? [],
          },
        },
      });
      if (error) throw new Error(await invokeErrorMessage(error, data));
      if ((data as any)?.error) throw new Error((data as any).error);
      setEditingId(null);
      await load();
      toast.success("Updated — guests see the organised card.");
    } catch (e: any) { toast.error(e?.message ?? "Failed to update"); }
    finally { setEditBusy(false); }
  };

  /** Find & replace across currently filtered cards (title, body, sections, links, captions). */
  const replaceInFiltered = async () => {
    const find = search.trim();
    if (!find || matchCount === 0) return;
    if (demo) {
      toast.message("Find & replace across cards runs on live Knowledge.");
      return;
    }
    const label = replaceWith
      ? `Replace ${matchCount} match${matchCount === 1 ? "" : "es"} of “${find}” with “${replaceWith}” in ${filtered.length} card${filtered.length === 1 ? "" : "s"}?`
      : `Remove ${matchCount} match${matchCount === 1 ? "" : "es"} of “${find}” from ${filtered.length} card${filtered.length === 1 ? "" : "s"}?`;
    if (!confirm(label)) return;

    setReplaceBusy(true);
    let updated = 0;
    let failed = 0;
    try {
      for (const e of filtered) {
        if (!countOccurrences(entrySearchBlob(e), find)) continue;
        const nextTitle = replaceAllText(e.title ?? "", find, replaceWith);
        const nextContent = replaceAllText(stripCardMeta(e.content), find, replaceWith);
        const nextMedia = replaceInMedia(mediaFromEntry(e), find, replaceWith);
        const bodyContent = flattenMediaToContent(nextTitle, nextMedia, nextContent);
        if (!bodyContent.trim()) continue;
        const { data, error } = await supabase.functions.invoke("talkstay-knowledge", {
          body: {
            action: "update",
            id: e.id,
            title: nextTitle.trim() || null,
            content: bodyContent,
            media: {
              sections: (nextMedia.sections ?? []).filter((s) => s.title.trim() || s.items.length),
              links: nextMedia.links ?? [],
              images: nextMedia.images ?? [],
            },
          },
        });
        if (error || (data as any)?.error) {
          failed += 1;
          continue;
        }
        updated += 1;
      }
      await load();
      if (updated) {
        toast.success(
          failed
            ? `Updated ${updated} card${updated === 1 ? "" : "s"} (${failed} failed).`
            : `Replaced in ${updated} card${updated === 1 ? "" : "s"}.`,
        );
        setSearch(replaceWith || find);
      } else {
        toast.error(failed ? "Couldn't save replacements." : "Nothing to replace.");
      }
    } finally {
      setReplaceBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["site", "general", "department", "room"] as Scope[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant="outline"
            onClick={() => setScope(s)}
            className={cn(
              "border",
              scope === s
                ? KB_SCOPE_STYLE[s]
                : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50",
            )}
          >
            {SCOPE_LABEL[s]}
          </Button>
        ))}
        {scope === "department" && (
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{hotelDepts.map((d) => <SelectItem key={d.key} value={d.key}>{d.display_name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {scope === "room" && (
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select room" /></SelectTrigger>
            <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{formatRoomLabel(r.room_number)}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {scope === "site" ? (
        <ContentPanel hotel={hotel} />
      ) : (
      <>
      <p className="text-xs text-muted-foreground">
        {scope === "general" && "Easiest: photograph a menu or notice — we read it and save a guest card. Or type below."}
        {scope === "department" && "Photograph a department menu or board, or type it in below."}
        {scope === "room" && "Info only for this room's guest — photo scan or type."}
      </p>

      <div className={`space-y-3 rounded-2xl border p-4 ${KB_SCOPE_CARD[scope] ?? ""}`}>
        <input
          ref={scanCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void scanAndDraft(f);
          }}
        />
        <input
          ref={scanGalleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void scanAndDraft(f);
          }}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy || scanBusy || imgBusy}
            onClick={() => scanCameraRef.current?.click()}
            className="flex items-center gap-3 rounded-xl border border-dashed bg-white/50 px-4 py-3 text-left transition hover:bg-white/80 disabled:opacity-60"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
              {scanBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{scanBusy ? "Reading your photo…" : "Take photo"}</p>
              <p className="text-[11px] text-muted-foreground">Opens the camera on phones — review draft before indexing</p>
            </div>
          </button>
          <button
            type="button"
            disabled={busy || scanBusy || imgBusy}
            onClick={() => scanGalleryRef.current?.click()}
            className="flex items-center gap-3 rounded-xl border border-dashed bg-white/50 px-4 py-3 text-left transition hover:bg-white/80 disabled:opacity-60"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
              {scanBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{scanBusy ? "Reading your photo…" : "Choose from device"}</p>
              <p className="text-[11px] text-muted-foreground">Pick a photo — review text, then Add card</p>
            </div>
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Point at a menu, hours board, or notice — we extract the text into a draft for review before it goes live.
        </p>

        <div className="relative py-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="relative z-10 bg-card px-2">or type it yourself</span>
          <span className="absolute inset-x-0 top-1/2 border-t" />
        </div>

        {pendingReview && (
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">
            <div className="min-w-0">
              <p className="font-medium">Review before publishing</p>
              <p className="text-xs text-amber-900/80">
                Edit the title or text if needed, then tap Add card. Nothing is live for guests until you confirm.
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" className="shrink-0 text-amber-900" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        )}

        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Card title (e.g. Breakfast menu)" />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Main info guests should hear (hours, what’s included…). One idea per line is fine."
          rows={pendingReview ? 8 : 4}
        />
        <MediaEditor
          media={media}
          onChange={setMedia}
          hotelId={hotel.id}
          uploading={imgBusy}
          onUpload={(f) => uploadImage(f, (url) => setMedia((m) => ({ ...m, images: [...(m.images ?? []), { url, alt: "" }] })))}
        />
        <div className="flex items-center justify-between">
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.md,.docx,.json,.csv" onChange={onFile} />
          <Button size="sm" variant="outline" disabled={busy || scanBusy} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Upload document
          </Button>
          <Button
            size="sm"
            disabled={busy || scanBusy || !flattenMediaToContent(title, media, content)}
            onClick={addEntry}
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            {pendingReview ? "Confirm & add card" : "Add card"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cards in this scope yet.</p>
      ) : (
        <>
          <div className="space-y-2 rounded-xl border bg-muted/20 p-2">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(ev) => setSearch(ev.target.value)}
                  placeholder={`Search ${visible.length} ${visible.length === 1 ? "card" : "cards"}…`}
                  className="pl-9 pr-3 md:pl-9 md:pr-3"
                />
              </div>
              {!!search.trim() && (
                <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  {matchCount > 0
                    ? `${matchCount} match${matchCount === 1 ? "" : "es"} · ${filtered.length} card${filtered.length === 1 ? "" : "s"}`
                    : "No matches"}
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant={replaceOpen ? "secondary" : "outline"}
                className="shrink-0"
                disabled={!search.trim()}
                onClick={() => setReplaceOpen((o) => !o)}
                title="Find and replace"
              >
                <Replace className="mr-1 h-3.5 w-3.5" />
                Replace
              </Button>
            </div>
            {replaceOpen && !!search.trim() && (
              <div className="flex flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center">
                <Input
                  value={replaceWith}
                  onChange={(ev) => setReplaceWith(ev.target.value)}
                  placeholder={`Replace “${search.trim()}” with…`}
                  className="flex-1"
                  disabled={replaceBusy}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={replaceBusy || matchCount === 0}
                  onClick={() => void replaceInFiltered()}
                >
                  {replaceBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Replace className="mr-1 h-3.5 w-3.5" />}
                  Replace all in results
                </Button>
              </div>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards match "{search}".</p>
          ) : (
            <div className="space-y-4">
              {groupedFiltered.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 px-0.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {group.entries.length} card{group.entries.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className={`divide-y rounded-2xl border ${KB_SCOPE_CARD[scope] ?? ""}`}>
                    {group.entries.map((e) => {
                      const extras = storedMedia(e);
                      const preview = stripCardMeta(e.content);
                      const q = search.trim();
                      const when = formatAddedWhen(e.created_at);
                      return (
                      <div key={e.id} className="px-4 py-3">
                        {editingId === e.id ? (
                          <div className="space-y-2">
                            <Input value={editTitle} onChange={(ev) => setEditTitle(ev.target.value)} placeholder="Title" />
                            <Textarea value={editContent} onChange={(ev) => setEditContent(ev.target.value)} rows={3} placeholder="Main info" />
                            <MediaEditor
                              media={editMedia}
                              onChange={setEditMedia}
                              hotelId={hotel.id}
                              uploading={imgBusy}
                              defaultOpen={mediaHasExtras(editMedia)}
                              onUpload={(f) => uploadImage(f, (url) => setEditMedia((m) => ({ ...m, images: [...(m.images ?? []), { url, alt: "" }] })))}
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" disabled={editBusy} onClick={cancelEdit}>
                                <X className="mr-1 h-4 w-4" /> Cancel
                              </Button>
                              <Button size="sm" disabled={editBusy || !flattenMediaToContent(editTitle, editMedia, editContent)} onClick={saveEdit}>
                                {editBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save card
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <button className="min-w-0 flex-1 text-left" onClick={() => startEdit(e)} title="Click to edit">
                              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${KB_SCOPE_STYLE[e.scope] ?? KB_SCOPE_STYLE.general}`}>
                                  {SCOPE_LABEL[e.scope as Scope] ?? e.scope}
                                </span>
                                {when && (
                                  <span className="text-[10px] text-muted-foreground">{when}</span>
                                )}
                              </div>
                              {e.title && (
                                <div className="text-sm font-medium">{highlightText(e.title, q)}</div>
                              )}
                              <div className="line-clamp-2 text-sm text-muted-foreground">{highlightText(preview, q)}</div>
                              {extras ? (
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                                  {extras.sections?.some((s) => s.title || s.items.length) && <span className="rounded bg-white/70 px-1.5 py-0.5">sections</span>}
                                  {!!extras.images?.length && <span className="rounded bg-white/70 px-1.5 py-0.5">{extras.images.length} photo{extras.images.length === 1 ? "" : "s"}</span>}
                                  {!!extras.links?.length && <span className="rounded bg-white/70 px-1.5 py-0.5">{extras.links.length} link{extras.links.length === 1 ? "" : "s"}</span>}
                                </div>
                              ) : null}
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
                      );
                    })}
                  </div>
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
