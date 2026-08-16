import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Mic, Palette, Printer, ImageIcon, X, Building2 } from "lucide-react";
import {
  clampGuestBgWash, friendlyImageName, updatePropertyProfile, updateHotelContactEmail,
  type Hotel, type HotelBranding, type PropertyProfile,
} from "@/talkstay/lib/hotels";
import PosterPanel from "@/talkstay/components/PosterPanel";
import PropertyProfileFields from "@/talkstay/components/PropertyProfileFields";
import { useDemo } from "@/talkstay/demo/DemoContext";

const DEFAULT_COLOR = "#7c3aed";
const DEFAULT_GUEST_WASH = 0.88;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read file"));
    reader.readAsDataURL(file);
  });
}

/** Identity (logo/colour/tagline — used everywhere) and Poster (the printable
 *  in-room QR poster) share one brand colour + logo, so they live under one
 *  "Branding" tab instead of two disconnected nav items. */
export default function BrandingPanel({
  hotel,
  onSaved,
  onHotel,
}: {
  hotel: Hotel;
  onSaved?: (b: HotelBranding) => void;
  onHotel?: (h: Hotel) => void;
}) {
  return (
    <Tabs defaultValue="identity" className="space-y-6">
      <TabsList>
        <TabsTrigger value="identity"><Palette className="mr-1.5 h-4 w-4" /> Identity</TabsTrigger>
        <TabsTrigger value="property"><Building2 className="mr-1.5 h-4 w-4" /> Property</TabsTrigger>
        <TabsTrigger value="poster"><Printer className="mr-1.5 h-4 w-4" /> Poster</TabsTrigger>
      </TabsList>
      <TabsContent value="identity">
        <IdentityTab hotel={hotel} onSaved={onSaved} />
      </TabsContent>
      <TabsContent value="property">
        <PropertyTab hotel={hotel} onSaved={onSaved} onHotel={onHotel} />
      </TabsContent>
      <TabsContent value="poster">
        <PosterPanel hotel={hotel} onSaved={onSaved} />
      </TabsContent>
    </Tabs>
  );
}

function PropertyTab({
  hotel,
  onSaved,
  onHotel,
}: {
  hotel: Hotel;
  onSaved?: (b: HotelBranding) => void;
  onHotel?: (h: Hotel) => void;
}) {
  const demo = useDemo();
  const [profile, setProfile] = useState<PropertyProfile>(() => ({ ...(hotel.branding?.property ?? {}) }));
  const [contactEmail, setContactEmail] = useState(hotel.contact_email ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (demo) {
        const branding: HotelBranding = {
          ...(hotel.branding ?? {}),
          property: profile,
        };
        const email = contactEmail.trim().toLowerCase() || null;
        demo.updateBranding(branding);
        onSaved?.(branding);
        onHotel?.({ ...hotel, branding, contact_email: email });
        toast.success("Property profile saved (demo).");
        return;
      }
      const branding = await updatePropertyProfile(hotel.id, hotel.branding, profile);
      const email = await updateHotelContactEmail(hotel.id, contactEmail);
      onSaved?.(branding);
      onHotel?.({ ...hotel, branding, contact_email: email });
      toast.success("Property profile saved — Insights will use this for smarter advice.");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't save property profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h3 className="text-sm font-medium">Property profile</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell TalkStay whether this is a hotel, Airbnb, or B&amp;B — and how many rooms/properties you run.
          Insights uses this (plus your address) for business intelligence that fits your scale and location.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="property-contact-email">Property contact email</Label>
        <Input
          id="property-contact-email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="ops@yourproperty.com"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Ops / guest contact for this property. Login stays on your owner account (one email for the whole portfolio).
        </p>
      </div>
      <PropertyProfileFields value={profile} onChange={setProfile} />
      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save property profile
      </Button>
    </div>
  );
}

function IdentityTab({ hotel, onSaved }: { hotel: Hotel; onSaved?: (b: HotelBranding) => void }) {
  const demo = useDemo();
  const [logo, setLogo] = useState(hotel.branding?.logo_url ?? "");
  const [color, setColor] = useState(hotel.branding?.primary_color ?? DEFAULT_COLOR);
  const [tagline, setTagline] = useState(hotel.branding?.tagline ?? "Scan. Speak. Consider it done.");
  const [guestWash, setGuestWash] = useState(
    clampGuestBgWash(hotel.branding?.guest_bg_wash ?? DEFAULT_GUEST_WASH),
  );
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
  const bgPhoto = hotel.branding?.poster?.bg_image_url || logo || "";
  const photoVisiblePct = Math.round((1 - guestWash) * 100);

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      if (demo) {
        const dataUrl = await readFileAsDataUrl(file);
        setLogo(dataUrl);
        toast.success("Logo uploaded (demo).");
        return;
      }
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
      guest_bg_wash: clampGuestBgWash(guestWash),
    };
    if (demo) {
      demo.updateBranding(branding);
      setSaving(false);
      onSaved?.(branding);
      toast.success("Branding saved (demo).");
      return;
    }
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
          <Label>Property logo</Label>
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

        <div className="space-y-2">
          <Label>Guest screen background</Label>
          <p className="text-xs text-muted-foreground">
            How strongly the room photo shows through behind chat (uses your Poster background, or logo).
            Lower veil = more of the photo; higher keeps text easier to read.
          </p>
          <div className="rounded-xl border bg-muted/30 px-3 py-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium">Photo visibility {photoVisiblePct}%</span>
              <span className="text-muted-foreground">Veil {Math.round(guestWash * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.96}
              step={0.02}
              value={guestWash}
              onChange={(e) => setGuestWash(Number(e.target.value))}
              className="w-full"
              aria-label="Guest background photo veil"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Photo clearer</span>
              <span>More veil</span>
            </div>
            {!bgPhoto && (
              <p className="mt-2 text-[11px] text-amber-800">
                Add a Poster background image (or logo) to see this on the guest screen.
              </p>
            )}
          </div>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save branding
        </Button>
      </div>

      {/* Live preview */}
      <div className="space-y-4">
        <div
          className="rounded-2xl border p-5 text-center shadow-sm"
          style={bgPhoto ? {
            backgroundImage: `linear-gradient(hsla(38,26%,97%,${Math.min(0.97, guestWash + 0.04)}), hsla(210,20%,94%,${Math.min(0.97, guestWash + 0.06)})), url(${bgPhoto})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : undefined}
        >
          <div className="mb-1 text-xs font-medium text-muted-foreground">Guest screen preview</div>
          {logo && <img src={logo} alt="logo" className="mx-auto mb-2 h-14 w-14 rounded-xl object-cover" />}
          <div className="font-semibold">{hotel.name}</div>
          <div className="text-xs text-muted-foreground">{tagline}</div>
          <div
            className="mx-auto my-4 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md"
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
