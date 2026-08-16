import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { adminApi, updateHotelAdmin } from "@/talkstay/admin/adminApi";
import { supabase } from "@/integrations/supabase/client";

type Detail = {
  hotel: Record<string, any>;
  owner: { email: string | null; first_name: string | null; last_name: string | null; company_name: string | null } | null;
  rooms: { id: string; room_number: string; floor: string | null; occupancy_status?: string; is_active: boolean }[];
  staff: { id: string; name: string | null; email: string | null; department_key: string | null; role: string; status: string }[];
  liveLinks: { id: string; url: string; label: string | null; is_active: boolean; expires_at: string | null; last_seen_at: string | null }[];
  openRequests: number;
};

type RateDraft = {
  currency: string;
  rate_active_qr: string;
  rate_session: string;
  rate_guest_turn: string;
  rate_request: string;
  primary_meter: string;
  use_override: boolean;
};

export default function AdminHotelDetail() {
  const { hotelId = "" } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [billingMode, setBillingMode] = useState("subscription");
  const [billingNotes, setBillingNotes] = useState("");
  const [pulse, setPulse] = useState(true);
  const [requireCode, setRequireCode] = useState(false);
  const [maxDevices, setMaxDevices] = useState(8);
  const [timezone, setTimezone] = useState("Europe/London");
  const [language, setLanguage] = useState("English");
  const [escalationPhone, setEscalationPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [referral, setReferral] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [rates, setRates] = useState<RateDraft>({
    currency: "GBP",
    rate_active_qr: "",
    rate_session: "",
    rate_guest_turn: "",
    rate_request: "",
    primary_meter: "active_qr",
    use_override: false,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi<Detail>("hotel_detail", { hotelId });
      setData(res);
      const h = res.hotel;
      setName(h.name ?? "");
      setBillingMode(h.billing_mode ?? "subscription");
      setBillingNotes(h.billing_notes ?? "");
      setPulse(h.pulse_enabled !== false);
      setRequireCode(!!h.require_checkin_code);
      setMaxDevices(Number(h.max_devices_per_room) || 8);
      setTimezone(h.timezone ?? "Europe/London");
      setLanguage(h.default_language ?? "English");
      setEscalationPhone(h.escalation_phone ?? "");
      setWhatsapp(h.whatsapp_number ?? "");
      setWhatsappEnabled(!!h.whatsapp_enabled);
      setReferral(h.referral_code ?? "");
      setContactEmail(h.contact_email ?? "");
      const br = (h.billing_rates && typeof h.billing_rates === "object") ? h.billing_rates : null;
      setRates({
        currency: String(br?.currency ?? "GBP"),
        rate_active_qr: br?.rate_active_qr != null ? String(br.rate_active_qr) : "",
        rate_session: br?.rate_session != null ? String(br.rate_session) : "",
        rate_guest_turn: br?.rate_guest_turn != null ? String(br.rate_guest_turn) : "",
        rate_request: br?.rate_request != null ? String(br.rate_request) : "",
        primary_meter: String(br?.primary_meter ?? "active_qr"),
        use_override: !!br,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [hotelId]);

  const toggleActive = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const next = !data.hotel.is_active;
      await adminApi("set_hotel_active", { hotelId, is_active: next });
      setData({ ...data, hotel: { ...data.hotel, is_active: next } });
      toast.success(next ? "Hotel activated" : "Hotel deactivated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveControls = async () => {
    setSaving(true);
    try {
      let billing_rates: Record<string, unknown> | null = null;
      if (rates.use_override) {
        billing_rates = {
          currency: rates.currency || "GBP",
          primary_meter: rates.primary_meter || "active_qr",
        };
        if (rates.rate_active_qr !== "") billing_rates.rate_active_qr = Number(rates.rate_active_qr);
        if (rates.rate_session !== "") billing_rates.rate_session = Number(rates.rate_session);
        if (rates.rate_guest_turn !== "") billing_rates.rate_guest_turn = Number(rates.rate_guest_turn);
        if (rates.rate_request !== "") billing_rates.rate_request = Number(rates.rate_request);
      }

      const res = await updateHotelAdmin(hotelId, {
        name,
        billing_mode: billingMode,
        billing_notes: billingNotes || null,
        billing_rates,
        pulse_enabled: pulse,
        require_checkin_code: requireCode,
        max_devices_per_room: maxDevices,
        timezone,
        default_language: language,
        escalation_phone: escalationPhone || null,
        whatsapp_number: whatsapp || null,
        whatsapp_enabled: whatsappEnabled,
        referral_code: referral || null,
        contact_email: contactEmail || null,
      });
      setData((d) => d ? { ...d, hotel: res.hotel } : d);
      toast.success("Hotel settings saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const revokeLink = async (tokenId: string) => {
    try {
      await adminApi("revoke_live_link", { tokenId });
      setData((d) => d ? {
        ...d,
        liveLinks: d.liveLinks.map((l) => (l.id === tokenId ? { ...l, is_active: false } : l)),
      } : d);
      toast.message("Live link revoked");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const disableStaff = async (staffId: string) => {
    try {
      await adminApi("disable_staff", { staffId });
      setData((d) => d ? {
        ...d,
        staff: d.staff.map((s) => (s.id === staffId ? { ...s, status: "disabled" } : s)),
      } : d);
      toast.message("Staff disabled");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const rotateToken = async (roomId: string, roomNumber: string) => {
    if (!confirm(`Rotate QR token for room ${roomNumber}? The printed QR will stop working until reprinted.`)) return;
    setRotatingId(roomId);
    try {
      try {
        await adminApi("rotate_room_token", { roomId });
      } catch {
        // Direct fallback when edge function isn't redeployed yet
        const { data: room, error: roomErr } = await (await import("@/integrations/supabase/client")).supabase
          .from("ts_rooms").select("id, hotel_id").eq("id", roomId).maybeSingle();
        if (roomErr || !room) throw roomErr ?? new Error("Room not found");
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("ts_room_tokens")
          .update({ is_active: false, rotated_at: new Date().toISOString() })
          .eq("room_id", roomId)
          .eq("is_active", true);
        const { error: insErr } = await supabase.from("ts_room_tokens")
          .insert({ hotel_id: room.hotel_id, room_id: roomId });
        if (insErr) throw new Error(insErr.message);
      }
      toast.success(`QR rotated for ${roomNumber}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRotatingId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading hotel…
      </div>
    );
  }

  const h = data.hotel;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/hotels" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All hotels
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{h.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {h.slug} · owner {data.owner?.email ?? "—"} · {data.openRequests} open requests
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={h.is_active ? "border-emerald-300 text-emerald-700" : ""}>
              {h.is_active ? "Active" : "Inactive"}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/usage?hotel=${hotelId}`}>Usage / QR meters</Link>
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void toggleActive()}>
              {h.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Rooms" value={data.rooms.length} />
        <Stat label="Staff" value={data.staff.length} />
        <Stat label="Live links" value={data.liveLinks.filter((l) => l.is_active).length} />
      </section>

      {/* Full admin controls */}
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Property controls</h2>
            <p className="text-sm text-muted-foreground">
              Billing mode, ops toggles, and contact fields — editable here without a code change.
            </p>
          </div>
          <Button size="sm" disabled={saving} onClick={() => void saveControls()}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save controls
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Display name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Billing mode">
            <Select value={billingMode} onValueChange={setBillingMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pilot">Pilot (usage during trial)</SelectItem>
                <SelectItem value="usage">Usage (metered)</SelectItem>
                <SelectItem value="subscription">Subscription (bulk)</SelectItem>
                <SelectItem value="complimentary">Complimentary</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Language">
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </Field>
          <Field label="Timezone">
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </Field>
          <Field label="Max devices / room">
            <Input type="number" min={1} max={50} value={maxDevices}
              onChange={(e) => setMaxDevices(Number(e.target.value) || 8)} />
          </Field>
          <Field label="Escalation phone">
            <Input value={escalationPhone} onChange={(e) => setEscalationPhone(e.target.value)} placeholder="+44…" />
          </Field>
          <Field label="WhatsApp number">
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Field>
          <Field label="Property contact email">
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="ops@yourproperty.com"
            />
          </Field>
          <Field label="Referral code">
            <Input value={referral} onChange={(e) => setReferral(e.target.value)} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Billing notes (internal)">
              <Textarea value={billingNotes} onChange={(e) => setBillingNotes(e.target.value)} rows={2}
                placeholder="e.g. Pilot — charge active QRs only until May" />
            </Field>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Guest pulse enabled" checked={pulse} onChange={setPulse} />
          <Toggle label="Require check-in code" checked={requireCode} onChange={setRequireCode} />
          <Toggle label="WhatsApp enabled" checked={whatsappEnabled} onChange={setWhatsappEnabled} />
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Custom usage rates</div>
              <div className="text-xs text-muted-foreground">
                Off = use platform rates from System settings
              </div>
            </div>
            <Switch
              checked={rates.use_override}
              onCheckedChange={(v) => setRates({ ...rates, use_override: v })}
            />
          </div>
          {rates.use_override && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Currency">
                <Input value={rates.currency} onChange={(e) => setRates({ ...rates, currency: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Primary meter">
                <Select value={rates.primary_meter} onValueChange={(v) => setRates({ ...rates, primary_meter: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active_qr">Active QR</SelectItem>
                    <SelectItem value="session">Session</SelectItem>
                    <SelectItem value="guest_turn">Guest turn</SelectItem>
                    <SelectItem value="request">Request</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Rate / active QR">
                <Input value={rates.rate_active_qr} onChange={(e) => setRates({ ...rates, rate_active_qr: e.target.value })} />
              </Field>
              <Field label="Rate / session">
                <Input value={rates.rate_session} onChange={(e) => setRates({ ...rates, rate_session: e.target.value })} />
              </Field>
              <Field label="Rate / guest turn">
                <Input value={rates.rate_guest_turn} onChange={(e) => setRates({ ...rates, rate_guest_turn: e.target.value })} />
              </Field>
              <Field label="Rate / request">
                <Input value={rates.rate_request} onChange={(e) => setRates({ ...rates, rate_request: e.target.value })} />
              </Field>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rooms & QR tokens</h2>
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Room</th>
                <th className="px-4 py-2 font-medium">Floor</th>
                <th className="px-4 py-2 font-medium">Occupancy</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.rooms.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.room_number}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.floor ?? "—"}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">{r.occupancy_status ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={rotatingId === r.id}
                      onClick={() => void rotateToken(r.id, r.room_number)}
                      title="Rotate QR token"
                    >
                      {rotatingId === r.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
              {data.rooms.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No rooms</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Rotate invalidates the printed QR until the room poster is reprinted with the new token.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Staff</h2>
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.email ?? "—"}</td>
                  <td className="px-4 py-2 capitalize">{s.role}</td>
                  <td className="px-4 py-2">{s.status}</td>
                  <td className="px-4 py-2 text-right">
                    {s.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => void disableStaff(s.id)}>
                        Disable
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live campaign links</h2>
        <div className="space-y-2">
          {data.liveLinks.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <Badge variant="outline" className={l.is_active ? "border-emerald-300 text-emerald-700" : ""}>
                {l.is_active ? "Active" : "Revoked"}
              </Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{l.url}</span>
              <Button size="sm" variant="outline" onClick={async () => {
                try { await navigator.clipboard.writeText(l.url); toast.success("Copied"); } catch { /* ignore */ }
              }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {l.is_active && (
                <Button size="sm" variant="ghost" onClick={() => void revokeLink(l.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {data.liveLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No live view links for this hotel.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
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
