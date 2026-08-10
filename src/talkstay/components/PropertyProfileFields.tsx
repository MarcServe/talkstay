import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PROPERTY_TYPES, type PropertyProfile, type PropertyType } from "@/talkstay/lib/hotels";

/** Shared form fields for create-property + Branding → Property. */
export default function PropertyProfileFields({
  value,
  onChange,
  compact,
}: {
  value: PropertyProfile;
  onChange: (next: PropertyProfile) => void;
  compact?: boolean;
}) {
  const set = <K extends keyof PropertyProfile>(key: K, v: PropertyProfile[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="space-y-1.5">
        <Label>Property type</Label>
        <Select
          value={value.type || undefined}
          onValueChange={(v) => set("type", (v || null) as PropertyType | null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Hotel, Airbnb, B&B…" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prop-address">Street address</Label>
        <Input
          id="prop-address"
          value={value.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          placeholder="12 Harbour Road"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prop-city">City / town</Label>
          <Input id="prop-city" value={value.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Brighton" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prop-region">Region / state</Label>
          <Input id="prop-region" value={value.region ?? ""} onChange={(e) => set("region", e.target.value)} placeholder="East Sussex" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prop-country">Country</Label>
          <Input id="prop-country" value={value.country ?? ""} onChange={(e) => set("country", e.target.value)} placeholder="United Kingdom" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prop-postcode">Postcode</Label>
          <Input id="prop-postcode" value={value.postcode ?? ""} onChange={(e) => set("postcode", e.target.value)} placeholder="BN1 1AA" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prop-rooms">Rooms / units at this property</Label>
          <Input
            id="prop-rooms"
            type="number"
            min={1}
            inputMode="numeric"
            value={value.room_count ?? ""}
            onChange={(e) => {
              const n = e.target.value === "" ? null : Number(e.target.value);
              set("room_count", n != null && Number.isFinite(n) ? n : null);
            }}
            placeholder="e.g. 12"
          />
          <p className="text-xs text-muted-foreground">
            Hotel rooms, Airbnb bedrooms, or listed units — used for scale-aware Insights advice.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prop-count">Properties you operate</Label>
          <Input
            id="prop-count"
            type="number"
            min={1}
            inputMode="numeric"
            value={value.property_count ?? ""}
            onChange={(e) => {
              const n = e.target.value === "" ? null : Number(e.target.value);
              set("property_count", n != null && Number.isFinite(n) ? n : null);
            }}
            placeholder="1"
          />
          <p className="text-xs text-muted-foreground">
            Portfolio size (1 for a single listing, 10+ for multi-property hosts).
          </p>
        </div>
      </div>
    </div>
  );
}
