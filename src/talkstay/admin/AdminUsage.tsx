import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Loader2, QrCode, RefreshCw } from "lucide-react";
import { adminApi } from "@/talkstay/admin/adminApi";

type Charge = {
  primary_meter: string;
  units: number;
  rate: number;
  suggested: number;
  currency: string;
  breakdown: Record<string, number>;
};

type RoomUsage = {
  room_id: string;
  room_number: string;
  is_active: boolean;
  is_public?: boolean;
  has_qr_token: boolean;
  token_preview: string | null;
  guest_url: string | null;
  guest_turns: number;
  sessions: number;
  requests: number;
  engaged: boolean;
};

type HotelUsage = {
  hotel_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  billing_mode: string;
  billing_notes: string | null;
  rates: Record<string, unknown>;
  meters: { active_qr: number; sessions: number; guest_turns: number; requests: number };
  charge: Charge;
  room_count: number;
  rooms?: RoomUsage[];
};

type UsagePayload = {
  since: string;
  until: string;
  days: number;
  billing: Record<string, unknown>;
  totals: {
    active_qr: number;
    sessions: number;
    guest_turns: number;
    requests: number;
    suggested: number;
    currency: string;
    hotels: number;
  };
  hotels: HotelUsage[];
  hotel?: HotelUsage | null;
  rollup_ready?: boolean;
};

const PERIODS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "365 days", days: 365 },
];

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([rows.map((r) => r.map(csvEscape).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminUsage() {
  const [params, setParams] = useSearchParams();
  const hotelId = params.get("hotel") ?? "";
  const [days, setDays] = useState(Number(params.get("days")) || 30);
  const [data, setData] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const action = hotelId ? "usage_hotel" : "usage_summary";
      const res = await adminApi<UsagePayload>(action, {
        days,
        ...(hotelId ? { hotelId } : {}),
      });
      setData(res);
      if (res.rollup_ready === false) {
        toast.message("Usage rollup pending — apply the admin usage migration, then redeploy talkstay-admin.");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [hotelId, days]);

  const hotels = useMemo(() => {
    const list = data?.hotels ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((h) =>
      h.name.toLowerCase().includes(needle) || h.slug.toLowerCase().includes(needle),
    );
  }, [data, q]);

  const detail = hotelId ? (data?.hotel ?? data?.hotels?.[0] ?? null) : null;

  const exportHotels = () => {
    if (!data) return;
    const currency = data.totals.currency;
    const rows: string[][] = [
      ["hotel", "slug", "billing_mode", "active_qr", "sessions", "guest_turns", "requests", "suggested_charge", "currency", "period_start", "period_end"],
      ...data.hotels.map((h) => [
        h.name, h.slug, h.billing_mode,
        h.meters.active_qr, h.meters.sessions, h.meters.guest_turns, h.meters.requests,
        h.charge.suggested, currency, data.since, data.until,
      ].map(String)),
    ];
    downloadCsv(`talkstay-usage-hotels-${days}d.csv`, rows);
  };

  const exportRooms = () => {
    if (!detail?.rooms) return;
    const rows: string[][] = [
      ["hotel", "room", "public", "engaged", "sessions", "guest_turns", "requests", "token_preview", "period_start", "period_end"],
      ...detail.rooms.map((r) => [
        detail.name, r.room_number, r.is_public ? "yes" : "no", r.engaged ? "yes" : "no",
        r.sessions, r.guest_turns, r.requests, r.token_preview ?? "", data!.since, data!.until,
      ].map(String)),
    ];
    downloadCsv(`talkstay-usage-${detail.slug}-rooms-${days}d.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage & pilot billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-property and per-QR engagement meters for usage-based or pilot charges — instead of bulk subscription.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(days)}
            onValueChange={(v) => {
              const d = Number(v);
              setDays(d);
              const next = new URLSearchParams(params);
              next.set("days", String(d));
              setParams(next, { replace: true });
            }}
          >
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.days} value={String(p.days)}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportHotels} disabled={!data?.hotels?.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV hotels
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading usage…
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Properties" value={data.totals.hotels} />
            <Stat label="Active QRs" value={data.totals.active_qr} hint="Rooms with ≥1 interaction" />
            <Stat label="Guest sessions" value={data.totals.sessions} />
            <Stat label="Guest turns" value={data.totals.guest_turns} />
            <Stat
              label="Suggested total"
              value={money(data.totals.suggested, data.totals.currency)}
              hint={`Primary meter: ${String(data.billing.primary_meter ?? "active_qr")}`}
            />
          </div>

          {!hotelId && (
            <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-violet-950">Invoice draft (pilot / usage)</h2>
                  <p className="mt-1 text-sm text-violet-900/80">
                    Line items for properties on <span className="font-medium">pilot</span> or{" "}
                    <span className="font-medium">usage</span> billing. Export CSV to invoice offline — Stripe auto-invoice can plug in later.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-violet-300 bg-white"
                  onClick={() => {
                    const billable = data.hotels.filter((h) =>
                      h.billing_mode === "pilot" || h.billing_mode === "usage",
                    );
                    if (!billable.length) {
                      toast.message("No pilot/usage hotels yet — set billing mode on each hotel.");
                      return;
                    }
                    const currency = data.totals.currency;
                    const rows: string[][] = [
                      ["invoice_line", "hotel", "slug", "billing_mode", "meter", "units", "rate", "amount", "currency", "period_start", "period_end"],
                      ...billable.map((h, i) => [
                        String(i + 1),
                        h.name,
                        h.slug,
                        h.billing_mode,
                        h.charge.primary_meter,
                        String(h.charge.units),
                        String(h.charge.rate),
                        String(h.charge.suggested),
                        currency,
                        data.since,
                        data.until,
                      ]),
                    ];
                    downloadCsv(`talkstay-invoice-draft-${days}d.csv`, rows);
                    toast.success(`Exported ${billable.length} invoice line${billable.length === 1 ? "" : "s"}`);
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export invoice CSV
                </Button>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Customer / property</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Meter</th>
                      <th className="px-3 py-2 font-medium">Units</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hotels
                      .filter((h) => h.billing_mode === "pilot" || h.billing_mode === "usage")
                      .map((h) => (
                        <tr key={h.hotel_id} className="border-t">
                          <td className="px-3 py-2 font-medium">{h.name}</td>
                          <td className="px-3 py-2 capitalize">{h.billing_mode}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {h.charge.primary_meter.replace(/_/g, " ")}
                          </td>
                          <td className="px-3 py-2">{h.charge.units}</td>
                          <td className="px-3 py-2 font-medium">
                            {money(h.charge.suggested, h.charge.currency)}
                          </td>
                        </tr>
                      ))}
                    {data.hotels.filter((h) => h.billing_mode === "pilot" || h.billing_mode === "usage").length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                          No pilot/usage properties yet. Open a hotel → set billing mode to{" "}
                          <strong>pilot</strong> or <strong>usage</strong>, then refresh.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {hotelId && detail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link to="/admin/usage" className="text-sm text-muted-foreground hover:text-foreground">
                    ← All properties
                  </Link>
                  <h2 className="mt-1 text-lg font-semibold">{detail.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {detail.slug} · {detail.billing_mode} · {money(detail.charge.suggested, detail.charge.currency)} suggested
                    {" "}({detail.charge.units} × {detail.charge.rate} {detail.charge.primary_meter.replace(/_/g, " ")})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/hotels/${detail.hotel_id}`}>Hotel controls</Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportRooms} disabled={!detail.rooms?.length}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> CSV rooms
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Room / QR</th>
                      <th className="px-4 py-2 font-medium">Token</th>
                      <th className="px-4 py-2 font-medium">Sessions</th>
                      <th className="px-4 py-2 font-medium">Turns</th>
                      <th className="px-4 py-2 font-medium">Requests</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.rooms ?? []).map((r) => (
                      <tr key={r.room_id} className="border-t">
                        <td className="px-4 py-2 font-medium">
                          {r.room_number}
                          {r.is_public && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">public</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {r.token_preview ?? "—"}
                        </td>
                        <td className="px-4 py-2">{r.sessions}</td>
                        <td className="px-4 py-2">{r.guest_turns}</td>
                        <td className="px-4 py-2">{r.requests}</td>
                        <td className="px-4 py-2">
                          {r.engaged ? (
                            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800">Engaged</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Idle</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(detail.rooms ?? []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No rooms</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div className="relative max-w-md">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter properties…"
                  className="pl-3"
                />
              </div>
              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Property</th>
                      <th className="px-4 py-3 font-medium">Mode</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Active QR</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Sessions</th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">Turns</th>
                      <th className="px-4 py-3 font-medium">Suggested</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {hotels.map((h) => (
                      <tr key={h.hotel_id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{h.name}</div>
                          <div className="text-xs text-muted-foreground">{h.slug} · {h.room_count} rooms</div>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <Badge variant="outline">{h.billing_mode}</Badge>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">{h.meters.active_qr}</td>
                        <td className="hidden px-4 py-3 md:table-cell">{h.meters.sessions}</td>
                        <td className="hidden px-4 py-3 lg:table-cell">{h.meters.guest_turns}</td>
                        <td className="px-4 py-3 font-medium">
                          {money(h.charge.suggested, h.charge.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const next = new URLSearchParams(params);
                              next.set("hotel", h.hotel_id);
                              next.set("days", String(days));
                              setParams(next);
                            }}
                          >
                            <QrCode className="mr-1.5 h-3.5 w-3.5" /> Per QR
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {hotels.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                          No usage in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Period {new Date(data.since).toLocaleString()} → {new Date(data.until).toLocaleString()}.
            Rates come from{" "}
            <Link to="/admin/settings" className="underline hover:text-foreground">System settings</Link>
            {" "}(or per-hotel overrides on the hotel page). Suggested charge uses the primary meter only.
          </p>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
