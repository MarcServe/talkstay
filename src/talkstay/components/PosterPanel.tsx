import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, Upload, Printer, Trash2,
  UtensilsCrossed, BedDouble, Wrench, Info,
  ShieldCheck, Zap, Globe, Building2, Smartphone,
} from "lucide-react";
import { getPublicBaseUrl } from "@/config/environment";
import { listRooms, getRoomToken, POSTER_DEFAULTS, type Hotel, type HotelBranding, type PosterConfig, type Room } from "@/talkstay/lib/hotels";

const FEATURE_ICONS = [UtensilsCrossed, BedDouble, Wrench, Info];
const BADGE_ICONS = [ShieldCheck, Zap, Globe];

/** The poster itself — used for both the on-screen preview and the print output.
 *  All sizing is in `cqw` (container-query width) units so it scales identically
 *  whether shown at 420px in the panel or at 190mm on the printed page. */
function PosterView({ p, hotelName, logo, qrUrl, accent }: {
  p: Required<PosterConfig>; hotelName: string; logo?: string; qrUrl: string; accent: string;
}) {
  const caption = p.qr_caption.replace(/\{hotel\}/gi, hotelName);
  return (
    <div className="ts-poster-wrap" id="ts-poster-print">
      <div className="ts-poster" style={{ ["--txt" as any]: p.text_color, background: p.bg_color }}>
        {p.bg_image_url && <div className="ts-poster-bg" style={{ backgroundImage: `url(${p.bg_image_url})` }} />}
        <div className="ts-poster-overlay" style={{ background: `linear-gradient(180deg, ${hexA(p.bg_color, p.bg_overlay)}, ${hexA(p.bg_color, Math.min(1, p.bg_overlay + 0.15))})` }} />
        <div className="ts-poster-body">
          {logo
            ? <img src={logo} alt="" className="ts-poster-logo" />
            : <div className="ts-poster-name">{hotelName}</div>}
          {p.eyebrow && <div className="ts-poster-eyebrow" style={{ color: accent }}>{p.eyebrow}</div>}

          <h1 className="ts-poster-headline">{p.headline}</h1>
          <p className="ts-poster-sub" style={{ color: accent }}>{p.subheadline}</p>

          <div className="ts-poster-features">
            {p.features.slice(0, 4).map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Info;
              return (
                <div key={i} className="ts-poster-feat">
                  <Icon className="ts-poster-feat-icon" style={{ color: accent }} />
                  <span>{f}</span>
                </div>
              );
            })}
          </div>

          <div className="ts-poster-qrcard" style={{ borderColor: hexA(p.text_color, 0.25) }}>
            <div className="ts-poster-qr">
              <QRCodeCanvas value={qrUrl} size={360} level="H" includeMargin />
              <div className="ts-poster-qr-badge" style={{ background: accent }}>
                <Building2 className="ts-poster-qr-badge-icon" />
              </div>
            </div>
            <div className="ts-poster-caption">
              <Smartphone className="ts-poster-caption-icon" />
              <span dangerouslySetInnerHTML={{ __html: escapeAccent(caption, hotelName, accent) }} />
            </div>
          </div>

          <div className="ts-poster-badges">
            {p.badges.slice(0, 3).map((b, i) => {
              const Icon = BADGE_ICONS[i] ?? ShieldCheck;
              return (
                <div key={i} className="ts-poster-badge">
                  <Icon className="ts-poster-badge-icon" style={{ color: accent }} />
                  <span>{b}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ts-poster-footer">
          <span>{p.footer_left}</span>
          <span className="ts-poster-footer-right">
            {p.footer_right}
            <em className="ts-poster-powered">Powered by TalkStay</em>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PosterPanel({ hotel, onSaved }: { hotel: Hotel; onSaved?: (b: HotelBranding) => void }) {
  const merged = { ...POSTER_DEFAULTS, ...(hotel.branding?.poster ?? {}) } as Required<PosterConfig>;
  const accent = hotel.branding?.primary_color || "#a78bfa";
  const logo = hotel.branding?.logo_url || undefined;

  const [cfg, setCfg] = useState<Required<PosterConfig>>(merged);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>(`${getPublicBaseUrl()}/h/${hotel.slug}/r/preview?token=preview`);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRooms(hotel.id).then((rs) => {
      setRooms(rs);
      if (rs.length) setRoomId(rs[0].id);
    }).catch(() => {});
  }, [hotel.id]);

  // Resolve the selected room's live QR URL (real token) for an accurate printout.
  useEffect(() => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    getRoomToken(room.id).then((token) => {
      if (token) setQrUrl(`${getPublicBaseUrl()}/h/${hotel.slug}/r/${room.id}?token=${token}`);
    }).catch(() => {});
  }, [roomId, rooms, hotel.slug]);

  const set = <K extends keyof PosterConfig>(k: K, v: Required<PosterConfig>[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const setFeature = (i: number, v: string) => setCfg((c) => ({ ...c, features: c.features.map((f, j) => (j === i ? v : f)) }));
  const setBadge = (i: number, v: string) => setCfg((c) => ({ ...c, badges: c.badges.map((b, j) => (j === i ? v : b)) }));

  const uploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
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
    const { error } = await supabase.from("ts_hotels").update({ branding }).eq("id", hotel.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved?.(branding);
    toast.success("Poster saved.");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <style>{POSTER_CSS}</style>

      {/* Controls */}
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Design the in-room poster guests scan. Every line is editable; the defaults below replicate the standard TalkStay layout. Pick a room to embed its live QR, then <strong>Print</strong> to save a print-ready PDF.
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
            {cfg.bg_image_url && (
              <Button size="sm" variant="ghost" onClick={() => set("bg_image_url", null)}>
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </Button>
            )}
          </div>
          <Input value={cfg.bg_image_url ?? ""} onChange={(e) => set("bg_image_url", e.target.value || null)} placeholder="…or paste an image URL" />
          {cfg.bg_image_url && (
            <div className="space-y-1 pt-1">
              <Label className="text-xs text-muted-foreground">Image darkness (keeps text readable): {Math.round(cfg.bg_overlay * 100)}%</Label>
              <input type="range" min={0} max={0.9} step={0.05} value={cfg.bg_overlay} onChange={(e) => set("bg_overlay", Number(e.target.value))} className="w-full" />
            </div>
          )}
        </div>

        <Field label="Eyebrow line" value={cfg.eyebrow} onChange={(v) => set("eyebrow", v)} placeholder={POSTER_DEFAULTS.eyebrow} />
        <Field label="Headline" value={cfg.headline} onChange={(v) => set("headline", v)} placeholder={POSTER_DEFAULTS.headline} />
        <Field label="Subheadline" value={cfg.subheadline} onChange={(v) => set("subheadline", v)} placeholder={POSTER_DEFAULTS.subheadline} />

        <div className="space-y-2">
          <Label>What guests can do (four)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {cfg.features.slice(0, 4).map((f, i) => (
              <Input key={i} value={f} onChange={(e) => setFeature(i, e.target.value)} placeholder={POSTER_DEFAULTS.features[i]} />
            ))}
          </div>
        </div>

        <Field label="QR caption ( {hotel} inserts the hotel name )" value={cfg.qr_caption} onChange={(v) => set("qr_caption", v)} placeholder={POSTER_DEFAULTS.qr_caption} />

        <div className="space-y-2">
          <Label>Trust badges (three)</Label>
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
          <Button variant="outline" onClick={() => setCfg({ ...POSTER_DEFAULTS })}>Reset to default</Button>
        </div>
      </div>

      {/* Live preview + print */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Label className="text-xs text-muted-foreground">QR for room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="h-9"><SelectValue placeholder={rooms.length ? "Select a room" : "No rooms yet (sample QR)"} /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="mt-4" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>

        <div className="rounded-2xl border bg-muted/40 p-4">
          <PosterView p={cfg} hotelName={hotel.name} logo={logo} qrUrl={qrUrl} accent={accent} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: in the print dialog choose <strong>Save as PDF</strong>, paper size A4, and enable “Background graphics” so the colours print.
        </p>
      </div>
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

const POSTER_CSS = `
.ts-poster-wrap { container-type: inline-size; width: 100%; }
.ts-poster { position: relative; width: 100%; aspect-ratio: 1024 / 1536; overflow: hidden; border-radius: 2.2cqw;
  font-family: system-ui, -apple-system, sans-serif; color: var(--txt, #fff); }
.ts-poster-bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.ts-poster-overlay { position: absolute; inset: 0; }
.ts-poster-body { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 8cqw 7cqw 4cqw; gap: 2cqw; }
.ts-poster-logo { height: 12cqw; max-width: 60cqw; object-fit: contain; margin-bottom: 1cqw; }
.ts-poster-name { font-size: 6cqw; font-weight: 800; letter-spacing: -0.02em; }
.ts-poster-eyebrow { font-size: 2.6cqw; font-weight: 600; opacity: 0.95; }
.ts-poster-headline { font-size: 10cqw; font-weight: 800; line-height: 1.02; letter-spacing: -0.02em; margin: 1cqw 0 0; }
.ts-poster-sub { font-size: 4.2cqw; font-weight: 600; margin: 0 0 1cqw; }
.ts-poster-features { display: flex; align-items: flex-start; justify-content: center; gap: 2cqw; width: 100%; margin: 1.5cqw 0; }
.ts-poster-feat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1.4cqw; font-size: 2.5cqw;
  font-weight: 600; line-height: 1.15; padding: 0 1cqw; }
.ts-poster-feat + .ts-poster-feat { border-left: 0.2cqw solid rgba(255,255,255,0.18); }
.ts-poster-feat-icon { width: 7cqw; height: 7cqw; }
.ts-poster-qrcard { width: 100%; border: 0.35cqw solid; border-radius: 4cqw; padding: 4cqw; margin: 1.5cqw 0;
  background: rgba(255,255,255,0.06); backdrop-filter: blur(2px); }
.ts-poster-qr { position: relative; width: 62cqw; margin: 0 auto 3cqw; background: #fff; border-radius: 3cqw; padding: 3cqw; }
.ts-poster-qr canvas { width: 100% !important; height: auto !important; display: block; }
.ts-poster-qr-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 11cqw; height: 11cqw; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ts-poster-qr-badge-icon { width: 6cqw; height: 6cqw; color: #fff; }
.ts-poster-caption { display: flex; align-items: center; justify-content: center; gap: 2cqw; font-size: 3.6cqw; font-weight: 600; }
.ts-poster-caption-icon { width: 5cqw; height: 5cqw; opacity: 0.9; }
.ts-poster-badges { display: flex; align-items: center; justify-content: center; gap: 3cqw; width: 100%; margin-top: 1cqw; }
.ts-poster-badge { display: flex; align-items: center; gap: 1.4cqw; font-size: 2.6cqw; font-weight: 600; }
.ts-poster-badge + .ts-poster-badge { border-left: 0.2cqw solid rgba(255,255,255,0.18); padding-left: 3cqw; }
.ts-poster-badge-icon { width: 5cqw; height: 5cqw; }
.ts-poster-footer { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 3cqw;
  background: rgba(255,255,255,0.86); color: #3b0764; padding: 3.5cqw 7cqw; font-size: 2.7cqw; font-weight: 600; }
.ts-poster-footer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.6cqw; }
.ts-poster-powered { font-style: normal; font-size: 2.3cqw; opacity: 0.7; }

@media print {
  body * { visibility: hidden !important; }
  #ts-poster-print, #ts-poster-print * { visibility: visible !important; }
  #ts-poster-print { position: fixed; inset: 0; margin: 0 auto; width: 190mm; }
  @page { size: A4 portrait; margin: 8mm; }
}
`;
