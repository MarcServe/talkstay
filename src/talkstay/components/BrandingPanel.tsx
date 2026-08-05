import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Mic, Palette, Printer, ImageIcon, X } from "lucide-react";
import { friendlyImageName, type Hotel, type HotelBranding } from "@/talkstay/lib/hotels";
import PosterPanel from "@/talkstay/components/PosterPanel";

const DEFAULT_COLOR = "#7c3aed";

/** Identity (logo/colour/tagline — used everywhere) and Poster (the printable
 *  in-room QR poster) share one brand colour + logo, so they live under one
 *  "Branding" tab instead of two disconnected nav items. */
export default function BrandingPanel({ hotel, onSaved }: { hotel: Hotel; onSaved?: (b: HotelBranding) => void }) {
  return (
    <Tabs defaultValue="identity" className="space-y-6">
      <TabsList>
        <TabsTrigger value="identity"><Palette className="mr-1.5 h-4 w-4" /> Identity</TabsTrigger>
        <TabsTrigger value="poster"><Printer className="mr-1.5 h-4 w-4" /> Poster</TabsTrigger>
      </TabsList>
      <TabsContent value="identity">
        <IdentityTab hotel={hotel} onSaved={onSaved} />
      </TabsContent>
      <TabsContent value="poster">
        <PosterPanel hotel={hotel} onSaved={onSaved} />
      </TabsContent>
    </Tabs>
  );
}

function IdentityTab({ hotel, onSaved }: { hotel: Hotel; onSaved?: (b: HotelBranding) => void }) {
  const [logo, setLogo] = useState(hotel.branding?.logo_url ?? "");
  const [color, setColor] = useState(hotel.branding?.primary_color ?? DEFAULT_COLOR);
  const [tagline, setTagline] = useState(hotel.branding?.tagline ?? "Scan. Speak. Consider it done.");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Separate from `logo` — a write-only field for pasting a URL manually, so
  // the current logo shows its filename (not the full Supabase link) instead.
  const [logoUrlDraft, setLogoUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const applyLogoDraft = () => {
    const v = logoUrlDraft.trim();
    if (v) { setLogo(v); setLogoUrlDraft(""); }
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const path = `talkstay/${hotel.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      setLogo(data.publicUrl);
      toast.success("Logo uploaded.");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed — you can paste a logo URL instead.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    // Preserve whatever's already in branding (e.g. the Poster tab's config) —
    // this used to be a full overwrite, which silently wiped the saved poster
    // every time Identity was saved.
    const branding: HotelBranding = {
      ...(hotel.branding ?? {}),
      logo_url: logo.trim() || null,
      primary_color: color || DEFAULT_COLOR,
      tagline: tagline.trim() || null,
    };
    const { error } = await supabase.from("ts_hotels").update({ branding }).eq("id", hotel.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved?.(branding);
    toast.success("Branding saved.");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Controls */}
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Your logo, brand colour and tagline appear on every room's assistant — and set the accent used on the printable Poster.
        </p>

        <div className="space-y-2">
          <Label>Hotel logo</Label>
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="logo" className="h-12 w-12 rounded-lg border object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">Logo</div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />} Upload
            </Button>
          </div>
          {logo && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{friendlyImageName(logo)}</span>
              <button type="button" onClick={() => setLogo("")} className="ml-auto shrink-0 text-muted-foreground hover:text-foreground" aria-label="Remove logo">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Input
            value={logoUrlDraft}
            onChange={(e) => setLogoUrlDraft(e.target.value)}
            onBlur={applyLogoDraft}
            onKeyDown={(e) => { if (e.key === "Enter") applyLogoDraft(); }}
            placeholder="…or paste a logo URL"
          />
        </div>

        <div className="space-y-2">
          <Label>Brand colour</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-32" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tagline</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Scan. Speak. Consider it done." />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save branding
        </Button>
      </div>

      {/* Live preview */}
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 text-center">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Guest screen preview</div>
          {logo && <img src={logo} alt="logo" className="mx-auto mb-2 h-14 w-14 rounded-xl object-cover" />}
          <div className="font-semibold">{hotel.name}</div>
          <div className="text-xs text-muted-foreground">{tagline}</div>
          <div
            className="mx-auto my-4 flex h-20 w-20 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            <Mic className="h-8 w-8" />
          </div>
          <div className="text-sm font-medium">Tap to talk</div>
        </div>
      </div>
    </div>
  );
}
