import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, Upload, Printer, Trash2, ImageIcon,
  UtensilsCrossed, BedDouble, Wrench, Info,
  ShieldCheck, Zap, Globe, Building2, Smartphone, CheckSquare, Square,
} from "lucide-react";
import { getPublicBaseUrl } from "@/config/environment";
import { listRooms, getRoomToken, friendlyImageName, POSTER_DEFAULTS, type Hotel, type HotelBranding, type PosterConfig, type Room } from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import { useDemo } from "@/talkstay/demo/DemoContext";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read file"));
    reader.readAsDataURL(file);
  });
}

const FEATURE_ICONS = [UtensilsCrossed, BedDouble, Wrench, Info];
const BADGE_ICONS = [ShieldCheck, Zap, Globe];

/** The poster itself — used for both the on-screen preview and the print output.
 *  All sizing is in `cqw` (container-query width) units so it scales identically
 *  whether shown at 420px in the panel or at 190mm on the printed page. */
function PosterView({ p, hotelName, logo, qrUrl, accent, wrapId, whiteLabel = false, roomLabel }: {
  p: Required<PosterConfig>; hotelName: string; logo?: string; qrUrl: string; accent: string;
  /** Optional id for the outer wrap (preview uses ts-poster-print). */
  wrapId?: string;
  /** Paid branding tier — the poster carries only the property's own marks. */
  whiteLabel?: boolean;
  /** Which room this sheet is for. Printed small in the corner so a bulk run
   *  can be sorted without scanning every code. */
  roomLabel?: string;
}) {
  // Property name is optional — blank hides it. When set, it's always bold
  // (above the eyebrow), whether or not a logo is uploaded.
  const displayName = p.business_name.trim();
  const nameForCaption = displayName || hotelName;
  const caption = p.qr_caption.replace(/\{hotel\}/gi, nameForCaption);
  const features = p.features.slice(0, 4).map((f, i) => ({ text: f.trim(), i })).filter((f) => f.text);
  const badges = p.badges.slice(0, 3).map((b, i) => ({ text: b.trim(), i })).filter((b) => b.text);
  return (
    <div className="ts-poster-wrap ts-poster-page" id={wrapId}>
      <div
        className="ts-poster"
        style={{
          ["--txt" as any]: p.text_color,
          ["--poster-bg" as any]: p.bg_color,
          backgroundColor: p.bg_color,
          color: p.text_color,
        }}
      >
        {/* Real <img> prints more reliably than CSS background-image.
            Opacity fades the photo so brand text stays readable on any image. */}
        {p.bg_image_url && (
          <img
            src={p.bg_image_url}
            alt=""
            className="ts-poster-bg-img"
            style={{ opacity: Math.max(0.12, Math.min(0.85, 1 - p.bg_overlay * 0.85)) }}
          />
        )}
        <div
          className="ts-poster-overlay"
          style={{
            background: `linear-gradient(180deg, ${hexA(p.bg_color, Math.min(0.95, p.bg_overlay + 0.08))}, ${hexA(p.bg_color, Math.min(0.98, p.bg_overlay + 0.22))})`,
          }}
        />
        {roomLabel && (
          <span className="ts-poster-roomtag" aria-hidden>{roomLabel}</span>
        )}
        <div className="ts-poster-body">
          {logo && <img src={logo} alt="" className="ts-poster-logo" />}
          {displayName && <div className="ts-poster-name">{displayName}</div>}
          {p.eyebrow.trim() && (
            <div className="ts-poster-eyebrow" style={{ color: accent }}>{p.eyebrow}</div>
          )}

          {p.headline.trim() && <h1 className="ts-poster-headline">{p.headline}</h1>}
          {p.subheadline.trim() && (
            <p className="ts-poster-sub" style={{ color: accent }}>{p.subheadline}</p>
          )}

          {features.length > 0 && (
            <div className="ts-poster-features">
              {features.map(({ text, i }) => {
                const Icon = FEATURE_ICONS[i] ?? Info;
                return (
                  <div key={i} className="ts-poster-feat">
                    <Icon className="ts-poster-feat-icon" style={{ color: accent }} />
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="ts-poster-qrcard" style={{ borderColor: hexA(p.text_color, 0.25) }}>
            <div className="ts-poster-qr">
              <QRCodeCanvas value={qrUrl} size={360} level="H" includeMargin />
              <div className="ts-poster-qr-badge" style={{ background: accent }}>
                <Building2 className="ts-poster-qr-badge-icon" />
              </div>
            </div>
            {p.qr_caption.trim() && (
              <div className="ts-poster-caption">
                <Smartphone className="ts-poster-caption-icon" />
                <span dangerouslySetInnerHTML={{ __html: escapeAccent(caption, nameForCaption, accent) }} />
              </div>
            )}
          </div>

          {badges.length > 0 && (
            <div className="ts-poster-badges">
              {badges.map(({ text, i }) => {
                const Icon = BADGE_ICONS[i] ?? ShieldCheck;
                return (
                  <div key={i} className="ts-poster-badge">
                    <Icon className="ts-poster-badge-icon" style={{ color: accent }} />
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(p.footer_left.trim() || p.footer_right.trim()) && (
          <div className="ts-poster-footer">
            <span>{p.footer_left}</span>
            <span className="ts-poster-footer-right">
              {p.footer_right}
              {!whiteLabel && <em className="ts-poster-powered">Powered by TalkStay</em>}
            </span>
          </div>
        )}
        {!whiteLabel && !p.footer_left.trim() && !p.footer_right.trim() && (
          <div className="ts-poster-footer ts-poster-footer-powered-only">
            <span />
            <em className="ts-poster-powered">Powered by TalkStay</em>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PosterPanel({ hotel, onSaved }: { hotel: Hotel; onSaved?: (b: HotelBranding) => void }) {
  const demo = useDemo();
  // Seed business_name from the hotel's own name so it's a sensible starting
  // point in the field; an explicitly saved value (even "") overrides it.
  const merged = { ...POSTER_DEFAULTS, business_name: hotel.name, ...(hotel.branding?.poster ?? {}) } as Required<PosterConfig>;
  const accent = hotel.branding?.primary_color || "#a78bfa";
  // Paid branding tier, set by platform admin — not something a property
  // switches on for itself.
  const whiteLabel = !!(hotel.branding as { white_label?: boolean } | null)?.white_label;
  const logo = hotel.branding?.logo_url || undefined;

  const [cfg, setCfg] = useState<Required<PosterConfig>>(merged);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");

  // Declared after rooms/roomId on purpose: this runs during render, so
  // reading those consts above their declaration is a temporal-dead-zone
  // ReferenceError — which renders as a blank page, not an error.
  const selectedRoomLabel = (() => {
    const r = rooms.find((x) => x.id === roomId);
    return r ? formatRoomLabel(r.room_number) : undefined;
  })();
  const [qrUrl, setQrUrl] = useState<string>(`${getPublicBaseUrl()}/h/${hotel.slug}/r/preview?token=preview`);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const [printBatch, setPrintBatch] = useState<{ id: string; label: string; qrUrl: string }[] | null>(null);
  const bulkRootRef = useRef<HTMLDivElement>(null);
  // Separate from cfg.bg_image_url — a write-only field for pasting a URL
  // manually, so the current image shows its filename, not the full link.
  const [bgUrlDraft, setBgUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const applyBgDraft = () => {
    const v = bgUrlDraft.trim();
    if (v) { set("bg_image_url", v); setBgUrlDraft(""); }
  };

  useEffect(() => {
    if (demo) {
      const rs = demo.state.rooms as unknown as Room[];
      setRooms(rs);
      if (rs.length) setRoomId((prev) => prev || rs[0].id);
      return;
    }
    listRooms(hotel.id).then((rs) => {
      setRooms(rs);
      if (rs.length) setRoomId(rs[0].id);
    }).catch(() => {});
  }, [hotel.id, demo, demo?.state.rooms, demo?.version]);

  // Keep poster CSS in <head> so print can hide #root without killing the stylesheet.
  useEffect(() => {
    const id = "ts-poster-print-css";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = POSTER_CSS;
  }, []);

  // Resolve the selected room's live QR URL (real token) for an accurate printout.
  useEffect(() => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    if (demo) {
      setQrUrl(`${getPublicBaseUrl()}/demo/guest?room=${encodeURIComponent(room.room_number)}`);
      return;
    }
    getRoomToken(room.id).then((token) => {
      if (token) setQrUrl(`${getPublicBaseUrl()}/h/${hotel.slug}/r/${room.id}?token=${token}`);
    }).catch(() => {});
  }, [roomId, rooms, hotel.slug, demo]);

  // When a bulk print batch is ready in the DOM, fire the print dialog once.
  useEffect(() => {
    if (!printBatch?.length) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      const root = bulkRootRef.current;
      if (!root) {
        setPrintBatch(null);
        setBulkPrinting(false);
        toast.error("Couldn't prepare posters for printing.");
        return;
      }
      runPrintFromSource(root, () => {
        setPrintBatch(null);
        setBulkPrinting(false);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [printBatch]);

  const set = <K extends keyof PosterConfig>(k: K, v: Required<PosterConfig>[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const setFeature = (i: number, v: string) => setCfg((c) => ({ ...c, features: c.features.map((f, j) => (j === i ? v : f)) }));
  const setBadge = (i: number, v: string) => setCfg((c) => ({ ...c, badges: c.badges.map((b, j) => (j === i ? v : b)) }));

  const toggleRoom = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllRooms = () => setSelectedIds(new Set(rooms.map((r) => r.id)));
  const clearRoomSelection = () => setSelectedIds(new Set());

  const printSelected = async () => {
    const picks = rooms.filter((r) => selectedIds.has(r.id));
    if (!picks.length) {
      toast.error("Select at least one room to print.");
      return;
    }
    setBulkPrinting(true);
    try {
      const batch: { id: string; label: string; qrUrl: string }[] = [];
      for (const room of picks) {
        if (demo) {
          batch.push({
            id: room.id,
            label: formatRoomLabel(room.room_number),
            qrUrl: `${getPublicBaseUrl()}/demo/guest?room=${encodeURIComponent(room.room_number)}`,
          });
          continue;
        }
        const token = await getRoomToken(room.id);
        if (!token) {
          toast.warning(`No QR token for ${formatRoomLabel(room.room_number)} — skipped.`);
          continue;
        }
        batch.push({
          id: room.id,
          label: formatRoomLabel(room.room_number),
          qrUrl: `${getPublicBaseUrl()}/h/${hotel.slug}/r/${room.id}?token=${token}`,
        });
      }
      if (!batch.length) {
        toast.error("None of the selected rooms have an active QR yet.");
        setBulkPrinting(false);
        return;
      }
      setPrintBatch(batch);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't prepare bulk print.");
      setBulkPrinting(false);
    }
  };

  const uploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      if (demo) {
        const dataUrl = await readFileAsDataUrl(file);
        set("bg_image_url", dataUrl);
        toast.success("Background image uploaded (demo).");
        return;
      }
      const path = `talkstay/${hotel.id}/poster-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      set("bg_image_url", data.publicUrl);
      toast.success("Background image uploaded.");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed — you can paste an image URL instead.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const branding: HotelBranding = { ...(hotel.branding ?? {}), poster: cfg };
    if (demo) {
      demo.updateBranding(branding);
      setSaving(false);
      onSaved?.(branding);
      toast.success("Poster saved (demo).");
      return;
    }
    const { error } = await supabase.from("ts_hotels").update({ branding }).eq("id", hotel.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved?.(branding);
    toast.success("Poster saved.");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      {/* Controls */}
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Design the in-room poster guests scan. Every line is editable; the defaults below replicate the standard TalkStay layout. Preview any room’s QR, print one, or use <strong>Print many</strong> to select rooms for a multi-page PDF.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Background colour</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={cfg.bg_color} onChange={(e) => set("bg_color", e.target.value)} className="h-10 w-14 cursor-pointer rounded border" />
              <Input value={cfg.bg_color} onChange={(e) => set("bg_color", e.target.value)} className="w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Text colour</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={cfg.text_color} onChange={(e) => set("text_color", e.target.value)} className="h-10 w-14 cursor-pointer rounded border" />
              <Input value={cfg.text_color} onChange={(e) => set("text_color", e.target.value)} className="w-32" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Background image (optional)</Label>
          <div className="flex flex-wrap items-center gap-3">
            {cfg.bg_image_url
              ? <img src={cfg.bg_image_url} alt="" className="h-12 w-20 rounded-lg border object-cover" />
              : <div className="flex h-12 w-20 items-center justify-center rounded-lg border bg-muted text-[10px] text-muted-foreground">No image</div>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadBg} />
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />} Upload
            </Button>
          </div>
          {cfg.bg_image_url && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{friendlyImageName(cfg.bg_image_url)}</span>
              <button type="button" onClick={() => set("bg_image_url", null)} className="ml-auto shrink-0 text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Input
            value={bgUrlDraft}
            onChange={(e) => setBgUrlDraft(e.target.value)}
            onBlur={applyBgDraft}
            onKeyDown={(e) => { if (e.key === "Enter") applyBgDraft(); }}
            placeholder="…or paste an image URL"
          />
          {cfg.bg_image_url && (
            <div className="space-y-1 pt-1">
              <Label className="text-xs text-muted-foreground">
                Background image strength: {Math.round((1 - cfg.bg_overlay) * 100)}% visible
                {" · "}
                wash {Math.round(cfg.bg_overlay * 100)}% (keeps text readable)
              </Label>
              <input
                type="range"
                min={0.35}
                max={0.92}
                step={0.05}
                value={cfg.bg_overlay}
                onChange={(e) => set("bg_overlay", Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[11px] text-muted-foreground">
                Drag right for a stronger wash if your photo fights black or light text.
              </p>
            </div>
          )}
        </div>

        <Field
          label="Property name (bold)"
          value={cfg.business_name}
          onChange={(v) => set("business_name", v)}
          placeholder={hotel.name}
        />
        <p className="-mt-4 text-xs text-muted-foreground">
          Shown boldly above the eyebrow (with or without a logo). Clear the field to hide it.
        </p>

        <p className="text-xs text-muted-foreground">
          Tip: leave any line blank to hide that part on the poster.
        </p>

        <Field label="Eyebrow line" value={cfg.eyebrow} onChange={(v) => set("eyebrow", v)} placeholder={POSTER_DEFAULTS.eyebrow} />
        <Field label="Headline" value={cfg.headline} onChange={(v) => set("headline", v)} placeholder={POSTER_DEFAULTS.headline} />
        <Field label="Subheadline" value={cfg.subheadline} onChange={(v) => set("subheadline", v)} placeholder={POSTER_DEFAULTS.subheadline} />

        <div className="space-y-2">
          <Label>What guests can do (four — blank to hide a slot)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {cfg.features.slice(0, 4).map((f, i) => (
              <Input key={i} value={f} onChange={(e) => setFeature(i, e.target.value)} placeholder={POSTER_DEFAULTS.features[i]} />
            ))}
          </div>
        </div>

        <Field label="QR caption ( {hotel} inserts the property name — blank to hide )" value={cfg.qr_caption} onChange={(v) => set("qr_caption", v)} placeholder={POSTER_DEFAULTS.qr_caption} />

        <div className="space-y-2">
          <Label>Trust badges (three — blank to hide)</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {cfg.badges.slice(0, 3).map((b, i) => (
              <Input key={i} value={b} onChange={(e) => setBadge(i, e.target.value)} placeholder={POSTER_DEFAULTS.badges[i]} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Footer — left line" value={cfg.footer_left} onChange={(v) => set("footer_left", v)} placeholder={POSTER_DEFAULTS.footer_left} />
          <Field label="Footer — right line" value={cfg.footer_right} onChange={(v) => set("footer_right", v)} placeholder={POSTER_DEFAULTS.footer_right} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save poster
          </Button>
          <Button variant="outline" onClick={() => setCfg({ ...POSTER_DEFAULTS, business_name: hotel.name })}>Reset to default</Button>
        </div>
      </div>

      {/* Live preview + print */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Label className="text-xs text-muted-foreground">QR for room (preview)</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="h-9"><SelectValue placeholder={rooms.length ? "Select a room" : "No rooms yet (sample QR)"} /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{formatRoomLabel(r.room_number)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="mt-4" variant="outline" onClick={() => printPoster()} disabled={bulkPrinting}>
              <Printer className="mr-1 h-4 w-4" /> Print this room
            </Button>
            <Button
              className="mt-4"
              variant={bulkOpen ? "default" : "outline"}
              onClick={() => {
                setBulkOpen((o) => {
                  if (!o && selectedIds.size === 0 && rooms.length) {
                    setSelectedIds(new Set(rooms.map((r) => r.id)));
                  }
                  return !o;
                });
              }}
              disabled={!rooms.length || bulkPrinting}
            >
              <CheckSquare className="mr-1 h-4 w-4" /> Print many…
            </Button>
          </div>
        </div>

        {bulkOpen && rooms.length > 0 && (
          <div className="rounded-xl border bg-card p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Bulk print — {selectedIds.size} of {rooms.length} selected
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={selectAllRooms}>Select all</Button>
                <Button type="button" size="sm" variant="ghost" onClick={clearRoomSelection}>Clear</Button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/20 p-2">
              <div className="grid gap-1 sm:grid-cols-2">
                {rooms.map((r) => {
                  const on = selectedIds.has(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRoom(r.id)}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        on ? "bg-primary/10 text-foreground" : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {on
                        ? <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                        : <Square className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{formatRoomLabel(r.room_number)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Button className="w-full" onClick={printSelected} disabled={bulkPrinting || selectedIds.size === 0}>
              {bulkPrinting
                ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Preparing {selectedIds.size} posters…</>
                : <><Printer className="mr-1.5 h-4 w-4" /> Print {selectedIds.size || ""} poster{selectedIds.size === 1 ? "" : "s"}</>}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Each selected room becomes its own A4 page with that room’s live QR. Use Save as PDF for a multi-page file.
            </p>
          </div>
        )}

        <div className="rounded-2xl border bg-muted/40 p-4">
          <PosterView wrapId="ts-poster-print" p={cfg} hotelName={hotel.name} logo={logo} qrUrl={qrUrl} accent={accent} whiteLabel={whiteLabel} roomLabel={selectedRoomLabel} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: choose <strong>Save as PDF</strong>, A4, and margins <strong>None</strong> (or Default). Colours and the photo are forced in the print stylesheet.
        </p>
      </div>

      {/* Off-screen batch used only for multi-room print */}
      {printBatch && (
        <div
          ref={bulkRootRef}
          id="ts-poster-bulk-source"
          aria-hidden
          className="pointer-events-none fixed left-[-10000px] top-0 w-[210mm]"
        >
          {printBatch.map((item) => (
            <PosterView
              key={item.id}
              p={cfg}
              hotelName={hotel.name}
              logo={logo}
              qrUrl={item.qrUrl}
              accent={accent}
              whiteLabel={whiteLabel}
              roomLabel={item.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/** #rrggbb + alpha (0..1) → rgba string. Falls back gracefully on bad input. */
function hexA(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(0,0,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Highlight the hotel name inside the caption with the accent colour. */
function escapeAccent(text: string, hotelName: string, accent: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const safe = esc(text);
  const name = esc(hotelName);
  if (!hotelName) return safe;
  return safe.replace(name, `<b style="color:${accent}">${name}</b>`);
}

/**
 * Print one or more A4 pages with colours/photo intact.
 * Clones the poster source onto <body> so we can hide the rest of the app without
 * `display:none` on ancestors (which would hide the poster too). Canvas QR
 * pixels are copied to an <img> because cloneNode does not keep canvas bits.
 */
function printPoster() {
  const src = document.getElementById("ts-poster-print");
  if (!src) {
    window.print();
    return;
  }
  runPrintFromSource(src);
}

function runPrintFromSource(src: HTMLElement, onDone?: () => void) {
  const clone = src.cloneNode(true) as HTMLElement;
  clone.id = "ts-poster-print-clone";
  clone.removeAttribute("aria-hidden");
  clone.classList.remove("pointer-events-none");
  clone.style.cssText = "";

  const srcCanvases = src.querySelectorAll("canvas");
  const cloneCanvases = clone.querySelectorAll("canvas");
  srcCanvases.forEach((canvas, i) => {
    const target = cloneCanvases[i];
    if (!target) return;
    try {
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      img.alt = "";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      target.replaceWith(img);
    } catch {
      /* tainted canvas — leave as-is */
    }
  });

  // Ensure each poster is a page wrapper for multi-room jobs.
  clone.querySelectorAll(".ts-poster-wrap").forEach((el) => {
    el.classList.add("ts-poster-page");
  });

  // Prefer the first poster's brand colour so scaled pages never flash white.
  const firstPoster = clone.querySelector(".ts-poster") as HTMLElement | null;
  const pageBg =
    firstPoster?.style.getPropertyValue("--poster-bg")?.trim()
    || firstPoster?.style.backgroundColor
    || "#2e1065";
  clone.style.setProperty("--ts-print-page-bg", pageBg);

  document.body.appendChild(clone);
  document.documentElement.classList.add("ts-printing-poster");

  // Scale each A4 sheet so QR + copy fit one page (no second blank page).
  const fitPages = () => {
    const mmToPx = 96 / 25.4;
    const pageH = 296.5 * mmToPx;
    clone.querySelectorAll<HTMLElement>(".ts-poster-page").forEach((page) => {
      page.style.height = "296.5mm";
      page.style.width = "210mm";
      page.style.overflow = "hidden";
      page.style.backgroundColor = pageBg;
      const poster = page.querySelector<HTMLElement>(".ts-poster");
      if (!poster) return;
      poster.style.transformOrigin = "top center";
      poster.style.transform = "none";
      poster.style.width = "210mm";
      // Measure natural height after layout.
      const natural = poster.scrollHeight;
      if (natural > pageH + 2) {
        const scale = Math.max(0.55, Math.min(1, pageH / natural));
        poster.style.transform = `scale(${scale})`;
        // Deliberately NOT widening to compensate. The poster sizes everything
        // in cqw against .ts-poster-wrap, so growing the width grows every font,
        // icon and gap with it — which grows the natural height, which defeats
        // the scale we just measured. That feedback loop is what tore the layout
        // apart at anything under 100%. Scaling alone keeps every proportion
        // intact; the slimmer sheet edges are painted in the poster's own
        // colour, so they read as margin rather than as a fault.
      }
    });
  };

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clone.remove();
    document.documentElement.classList.remove("ts-printing-poster");
    window.removeEventListener("afterprint", cleanup);
    onDone?.();
  };
  window.addEventListener("afterprint", cleanup);

  // Let the clone paint (and QR data-URL decode) before the dialog opens.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fitPages();
      window.print();
      // Fallback if afterprint never fires (some mobile browsers).
      window.setTimeout(cleanup, 60_000);
    });
  });
}

const POSTER_CSS = `
.ts-poster-wrap { container-type: inline-size; width: 100%; }
.ts-poster {
  position: relative; width: 100%; overflow: hidden; border-radius: 2.2cqw;
  font-family: system-ui, -apple-system, sans-serif; color: var(--txt, #fff);
  background-color: var(--poster-bg, #2e1065);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.ts-poster-bg-img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center;
  z-index: 0; pointer-events: none;
}
.ts-poster-roomtag {
  position: absolute; top: 2.6cqw; right: 3.2cqw; z-index: 3;
  padding: 0.9cqw 2.2cqw; border-radius: 99cqw;
  background: rgba(255,255,255,0.9); color: #3b0764;
  font-size: 2.4cqw; font-weight: 700; letter-spacing: 0.01em; line-height: 1;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.ts-poster-overlay { position: absolute; inset: 0; z-index: 1;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.ts-poster-body { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 5cqw 7cqw 2.5cqw; gap: 1.2cqw; }
.ts-poster-logo { height: 10cqw; max-width: 55cqw; object-fit: contain; margin-bottom: 0.5cqw; }
.ts-poster-name { font-size: 6.2cqw; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin: 0.2cqw 0 0.4cqw; }
.ts-poster-eyebrow { font-size: 2.4cqw; font-weight: 600; opacity: 0.95; }
.ts-poster-footer-powered-only { justify-content: flex-end; }
.ts-poster-headline { font-size: 8cqw; font-weight: 800; line-height: 1.05; letter-spacing: -0.02em; margin: 0.6cqw 0 0; }
.ts-poster-sub { font-size: 3.6cqw; font-weight: 600; margin: 0; }
.ts-poster-features { display: flex; align-items: flex-start; justify-content: center; gap: 1.6cqw; width: 100%; margin: 0.6cqw 0; }
.ts-poster-feat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.9cqw; font-size: 2.2cqw;
  font-weight: 600; line-height: 1.15; padding: 0 0.8cqw; }
.ts-poster-feat + .ts-poster-feat { border-left: 0.2cqw solid rgba(255,255,255,0.18); }
.ts-poster-feat-icon { width: 5.2cqw; height: 5.2cqw; }
.ts-poster-qrcard { width: 100%; border: 0.35cqw solid; border-radius: 3.5cqw; padding: 2.4cqw; margin: 0.6cqw 0;
  background: rgba(255,255,255,0.08); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.ts-poster-qr { position: relative; width: 38cqw; margin: 0 auto 1.6cqw; background: #fff; border-radius: 2.4cqw; padding: 2cqw;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.ts-poster-qr canvas,
.ts-poster-qr img { width: 100% !important; height: auto !important; display: block; }
.ts-poster-qr-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 7cqw; height: 7cqw; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.ts-poster-qr-badge-icon { width: 3.8cqw; height: 3.8cqw; color: #fff; }
.ts-poster-caption { display: flex; align-items: center; justify-content: center; gap: 1.4cqw; font-size: 2.9cqw; font-weight: 600; }
.ts-poster-caption-icon { width: 3.8cqw; height: 3.8cqw; opacity: 0.9; flex-shrink: 0; }
.ts-poster-badges { display: flex; align-items: center; justify-content: center; gap: 2cqw; width: 100%; margin-top: 0.4cqw; }
.ts-poster-badge { display: flex; align-items: center; gap: 1cqw; font-size: 2.2cqw; font-weight: 600; }
.ts-poster-badge + .ts-poster-badge { border-left: 0.2cqw solid rgba(255,255,255,0.18); padding-left: 2cqw; }
.ts-poster-badge-icon { width: 3.6cqw; height: 3.6cqw; }
.ts-poster-footer { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 2.5cqw;
  background: rgba(255,255,255,0.92); color: #3b0764; padding: 2.4cqw 6cqw; font-size: 2.3cqw; font-weight: 600;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.ts-poster-footer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4cqw; }
.ts-poster-powered { font-style: normal; font-size: 2.1cqw; opacity: 0.7; }

/* Screen-only: keep the print clone out of the live layout */
#ts-poster-print-clone { display: none !important; }

/* A4 sheet(s): print only the body-level clone (see runPrintFromSource()). */
@media print {
  @page { size: A4 portrait; margin: 0; }
  html.ts-printing-poster,
  html.ts-printing-poster body {
    width: 210mm !important;
    height: auto !important;
    margin: 0 !important; padding: 0 !important;
    background: var(--ts-print-page-bg, #2e1065) !important;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
  html.ts-printing-poster body > *:not(#ts-poster-print-clone) {
    display: none !important;
  }
  html.ts-printing-poster #ts-poster-print-clone {
    display: block !important;
    position: static !important;
    width: 210mm !important;
    margin: 0 !important; padding: 0 !important;
    overflow: visible !important;
    background: var(--ts-print-page-bg, #2e1065) !important;
    z-index: 99999 !important;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-page {
    display: block !important;
    box-sizing: border-box !important;
    width: 210mm !important;
    /* A hair under A4. At exactly 297mm, sub-pixel rounding in the print
       engine tips the sheet over and emits a blank/overflow second page —
       the page background matches the poster, so the 0.5mm is invisible. */
    height: 296.5mm !important;
    max-height: 296.5mm !important;
    margin: 0 !important; padding: 0 !important;
    overflow: hidden !important;
    background: var(--ts-print-page-bg, #2e1065) !important;
    break-after: page;
    page-break-after: always;
    break-inside: avoid;
    page-break-inside: avoid;
    container-type: inline-size;
  }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster {
    width: 210mm !important;
    /* height, not min-height: min-height let the content push the poster past
       the sheet, and everything below the fold became page 2. Now it fills the
       page exactly and anything that would overflow is clipped. */
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
    border-radius: 0 !important;
    display: flex !important; flex-direction: column !important;
    background-color: var(--poster-bg, var(--ts-print-page-bg, #2e1065)) !important;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-body {
    display: flex !important; flex-direction: column !important; align-items: center !important;
    flex: 1 1 auto; justify-content: center; min-height: 0;
  }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-features,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-feat,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-caption,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-badges,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-badge,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-footer,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-footer-right,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-qr-badge {
    display: flex !important;
  }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-feat,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-footer-right {
    flex-direction: column !important;
  }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-footer { flex: 0 0 auto; }
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-bg-img,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-roomtag,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-overlay,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-qrcard,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-qr,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-qr-badge,
  html.ts-printing-poster #ts-poster-print-clone .ts-poster-footer {
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
  html.ts-printing-poster #ts-poster-print-clone img,
  html.ts-printing-poster #ts-poster-print-clone svg {
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
}
`;
