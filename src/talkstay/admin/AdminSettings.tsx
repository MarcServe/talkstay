import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { loadPlatformSettings, savePlatformSetting } from "@/talkstay/admin/adminApi";

type BillingSettings = {
  currency: string;
  default_mode: string;
  primary_meter: string;
  rate_active_qr: number;
  rate_session: number;
  rate_guest_turn: number;
  rate_request: number;
  include_inactive_hotels: boolean;
};

type DefaultsSettings = {
  pulse_enabled: boolean;
  require_checkin_code: boolean;
  max_devices_per_room: number;
  default_language: string;
  timezone: string;
};

type FeaturesSettings = {
  guest_pulse: boolean;
  live_ops_share: boolean;
  portfolio_insights: boolean;
  location_orders: boolean;
};

type SupportSettings = {
  support_email: string;
  sales_email: string;
  public_base_url: string;
};

const BILLING_DEFAULT: BillingSettings = {
  currency: "GBP",
  default_mode: "pilot",
  primary_meter: "active_qr",
  rate_active_qr: 15,
  rate_session: 0.5,
  rate_guest_turn: 0.05,
  rate_request: 0.25,
  include_inactive_hotels: false,
};

const DEFAULTS_DEFAULT: DefaultsSettings = {
  pulse_enabled: true,
  require_checkin_code: false,
  max_devices_per_room: 8,
  default_language: "English",
  timezone: "Europe/London",
};

const FEATURES_DEFAULT: FeaturesSettings = {
  guest_pulse: true,
  live_ops_share: true,
  portfolio_insights: true,
  location_orders: true,
};

const SUPPORT_DEFAULT: SupportSettings = {
  support_email: "support@talkstay.talkweb.io",
  sales_email: "hello@talkstay.talkweb.io",
  public_base_url: "https://talkstay.talkweb.io",
};

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingSettings>(BILLING_DEFAULT);
  const [defaults, setDefaults] = useState<DefaultsSettings>(DEFAULTS_DEFAULT);
  const [features, setFeatures] = useState<FeaturesSettings>(FEATURES_DEFAULT);
  const [support, setSupport] = useState<SupportSettings>(SUPPORT_DEFAULT);
  const [saving, setSaving] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await loadPlatformSettings();
      setMissingTable(!!res.missingTable);
      const s = res.settings ?? {};
      setBilling({ ...BILLING_DEFAULT, ...(s.billing as object) });
      setDefaults({ ...DEFAULTS_DEFAULT, ...(s.defaults as object) });
      setFeatures({ ...FEATURES_DEFAULT, ...(s.features as object) });
      setSupport({ ...SUPPORT_DEFAULT, ...(s.support as object) });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async (key: string, value: unknown) => {
    setSaving(key);
    try {
      await savePlatformSetting(key, value);
      toast.success("Saved");
      setMissingTable(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide controls for pilot billing rates, property defaults, feature flags, and support contacts.
          Change these here instead of asking engineering to patch config.
        </p>
        {missingTable && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Settings table not found yet — apply migration{" "}
            <code className="text-xs">20260816000002_talkstay_admin_usage_settings.sql</code>
            {" "}and redeploy <code className="text-xs">talkstay-admin</code>. You can still edit values; save will create rows once the table exists.
          </p>
        )}
      </div>

      {/* Billing */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Pilot / usage billing</h2>
            <p className="text-sm text-muted-foreground">
              Default rates used on the Usage page for suggested charges. Hotels can override rates individually.
            </p>
          </div>
          <Button
            size="sm"
            disabled={saving === "billing"}
            onClick={() => void save("billing", billing)}
          >
            {saving === "billing" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save billing
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Currency">
            <Input value={billing.currency} onChange={(e) => setBilling({ ...billing, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Default billing mode">
            <Select value={billing.default_mode} onValueChange={(v) => setBilling({ ...billing, default_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pilot">Pilot (usage during trial)</SelectItem>
                <SelectItem value="usage">Usage (metered)</SelectItem>
                <SelectItem value="subscription">Subscription (bulk)</SelectItem>
                <SelectItem value="complimentary">Complimentary</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Primary meter (suggested charge)">
            <Select value={billing.primary_meter} onValueChange={(v) => setBilling({ ...billing, primary_meter: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active_qr">Active QR / room</SelectItem>
                <SelectItem value="session">Guest session</SelectItem>
                <SelectItem value="guest_turn">Guest message turn</SelectItem>
                <SelectItem value="request">Service request</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Rate per active QR">
            <Input type="number" min={0} step={0.01} value={billing.rate_active_qr}
              onChange={(e) => setBilling({ ...billing, rate_active_qr: Number(e.target.value) })} />
          </Field>
          <Field label="Rate per session">
            <Input type="number" min={0} step={0.01} value={billing.rate_session}
              onChange={(e) => setBilling({ ...billing, rate_session: Number(e.target.value) })} />
          </Field>
          <Field label="Rate per guest turn">
            <Input type="number" min={0} step={0.001} value={billing.rate_guest_turn}
              onChange={(e) => setBilling({ ...billing, rate_guest_turn: Number(e.target.value) })} />
          </Field>
          <Field label="Rate per request">
            <Input type="number" min={0} step={0.01} value={billing.rate_request}
              onChange={(e) => setBilling({ ...billing, rate_request: Number(e.target.value) })} />
          </Field>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2 sm:col-span-2">
            <div>
              <div className="text-sm font-medium">Include inactive hotels in usage</div>
              <div className="text-xs text-muted-foreground">Off = only active properties on the Usage board</div>
            </div>
            <Switch
              checked={billing.include_inactive_hotels}
              onCheckedChange={(v) => setBilling({ ...billing, include_inactive_hotels: v })}
            />
          </div>
        </div>
      </section>

      {/* Defaults */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Property defaults</h2>
            <p className="text-sm text-muted-foreground">
              Reference defaults for new properties and admin tooling. Per-hotel values still win on each property.
            </p>
          </div>
          <Button
            size="sm"
            disabled={saving === "defaults"}
            onClick={() => void save("defaults", defaults)}
          >
            {saving === "defaults" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save defaults
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Default language">
            <Input value={defaults.default_language} onChange={(e) => setDefaults({ ...defaults, default_language: e.target.value })} />
          </Field>
          <Field label="Default timezone">
            <Input value={defaults.timezone} onChange={(e) => setDefaults({ ...defaults, timezone: e.target.value })} />
          </Field>
          <Field label="Max devices per room">
            <Input type="number" min={1} max={50} value={defaults.max_devices_per_room}
              onChange={(e) => setDefaults({ ...defaults, max_devices_per_room: Number(e.target.value) })} />
          </Field>
          <Toggle
            label="Pulse enabled by default"
            checked={defaults.pulse_enabled}
            onChange={(v) => setDefaults({ ...defaults, pulse_enabled: v })}
          />
          <Toggle
            label="Require check-in code by default"
            checked={defaults.require_checkin_code}
            onChange={(v) => setDefaults({ ...defaults, require_checkin_code: v })}
          />
        </div>
      </section>

      {/* Features */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Feature flags</h2>
            <p className="text-sm text-muted-foreground">
              Platform capability switches for rollout control. Product surfaces can read these via admin later.
            </p>
          </div>
          <Button
            size="sm"
            disabled={saving === "features"}
            onClick={() => void save("features", features)}
          >
            {saving === "features" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save features
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Guest pulse" checked={features.guest_pulse} onChange={(v) => setFeatures({ ...features, guest_pulse: v })} />
          <Toggle label="Live ops share links" checked={features.live_ops_share} onChange={(v) => setFeatures({ ...features, live_ops_share: v })} />
          <Toggle label="Portfolio insights" checked={features.portfolio_insights} onChange={(v) => setFeatures({ ...features, portfolio_insights: v })} />
          <Toggle label="Location / public QR orders" checked={features.location_orders} onChange={(v) => setFeatures({ ...features, location_orders: v })} />
        </div>
      </section>

      {/* Support */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Support & URLs</h2>
            <p className="text-sm text-muted-foreground">Contact and public base URL used in admin tooling and copy.</p>
          </div>
          <Button
            size="sm"
            disabled={saving === "support"}
            onClick={() => void save("support", support)}
          >
            {saving === "support" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save support
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support email">
            <Input type="email" value={support.support_email} onChange={(e) => setSupport({ ...support, support_email: e.target.value })} />
          </Field>
          <Field label="Sales email">
            <Input type="email" value={support.sales_email} onChange={(e) => setSupport({ ...support, sales_email: e.target.value })} />
          </Field>
          <Field label="Public base URL">
            <Input value={support.public_base_url} onChange={(e) => setSupport({ ...support, public_base_url: e.target.value })} />
          </Field>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
