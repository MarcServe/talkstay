import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, ExternalLink, Loader2, QrCode, RefreshCw } from "lucide-react";
import { loadUsageSummary } from "@/talkstay/admin/adminApi";

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
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  ai_cost_usd?: number;
  ai_calls?: number;
};

type HotelUsage = {
  hotel_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  billing_mode: string;
  billing_notes: string | null;
  referral_code?: string | null;
  rates: Record<string, unknown>;
  meters: {
    active_qr: number;
    sessions: number;
    guest_turns: number;
    requests: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    ai_cost_usd?: number;
    ai_calls?: number;
  };
  charge: Charge;
  partner?: { code: string; name: string; email: string; commission_pct: number } | null;
  partner_commission?: { pct: number; amount: number; currency: string };
  room_count: number;
  rooms?: RoomUsage[];
};

type UsagePayload = {
  since: string;
  until: string;
  days: number;
  billing: Record<string, unknown>;
  partners?: { default_commission_pct: number };
  totals: {
    active_qr: number;
    sessions: number;
    guest_turns: number;
    requests: number;
    suggested: number;
    currency: string;
    hotels: number;
    ai_cost_usd?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    ai_calls?: number;
    partner_commission?: number;
    referred_hotels?: number;
  };
  hotels: HotelUsage[];
  hotel?: HotelUsage | null;
  rollup_ready?: boolean;
  llm_cost_ready?: boolean;
  llm_cost_missing_table?: boolean;
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

function moneyUsd(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

/** Per-room suggested charge using the hotel's primary meter + rate. */
function roomCharge(
  hotel: HotelUsage,
  room: RoomUsage,
): { units: number; rate: number; suggested: number; meter: string } {
  const meter = hotel.charge.primary_meter || "active_qr";
  const rate = Number(hotel.charge.rate) || 0;
  let units = 0;
  if (meter === "session") units = room.sessions;
  else if (meter === "guest_turn") units = room.guest_turns;
  else if (meter === "request") units = room.requests;
  else units = room.engaged ? 1 : 0; // active_qr
  return {
    units,
    rate,
    suggested: Math.round(units * rate * 100) / 100,
    meter,
  };
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
      const res = await loadUsageSummary({
        days,
        ...(hotelId ? { hotelId } : {}),
      }) as UsagePayload & { via?: string };
      setData(res);
      if (res.rollup_ready === false && res.via === "direct") {
        /* direct path is fine — no toast needed */
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

  const roomRows = useMemo(() => {
    if (!detail?.rooms?.length) return [];
    return detail.rooms.map((r) => ({
      room: r,
      charge: roomCharge(detail, r),
    }));
  }, [detail]);

  const roomsSuggestedTotal = useMemo(
    () => Math.round(roomRows.reduce((s, r) => s + r.charge.suggested, 0) * 100) / 100,
    [roomRows],
  );

  const exportHotels = () => {
    if (!data) return;
    const currency = data.totals.currency;
    const rows: string[][] = [
      ["hotel", "slug", "billing_mode", "referral", "partner", "active_qr", "sessions", "guest_turns", "requests", "suggested_charge", "partner_commission_pct", "partner_commission", "ai_cost_usd", "prompt_tokens", "completion_tokens", "currency", "period_start", "period_end"],
      ...data.hotels.map((h) => [
        h.name, h.slug, h.billing_mode,
        h.referral_code ?? "", h.partner?.name ?? "",
        h.meters.active_qr, h.meters.sessions, h.meters.guest_turns, h.meters.requests,
        h.charge.suggested,
        h.partner_commission?.pct ?? "",
        h.partner_commission?.amount ?? 0,
        h.meters.ai_cost_usd ?? 0, h.meters.prompt_tokens ?? 0, h.meters.completion_tokens ?? 0,
        currency, data.since, data.until,
      ].map(String)),
    ];
    downloadCsv(`talkstay-usage-hotels-${days}d.csv`, rows);
  };

  const exportRooms = () => {
    if (!detail || !roomRows.length) return;
    const currency = detail.charge.currency;
    const meter = detail.charge.primary_meter;
    const rows: string[][] = [
      ["hotel", "room", "public", "engaged", "sessions", "guest_turns", "requests", "meter", "units", "rate", "suggested", "currency", "ai_cost_usd", "prompt_tokens", "completion_tokens", "token_preview", "period_start", "period_end"],
      ...roomRows.map(({ room: r, charge: c }) => [
        detail.name, r.room_number, r.is_public ? "yes" : "no", r.engaged ? "yes" : "no",
        r.sessions, r.guest_turns, r.requests, meter, c.units, c.rate, c.suggested, currency,
        r.ai_cost_usd ?? 0, r.prompt_tokens ?? 0, r.completion_tokens ?? 0,
        r.token_preview ?? "", data!.since, data!.until,
      ].map(String)),
      ["TOTAL", "", "", "", "", "", "", meter, roomRows.reduce((s, r) => s + r.charge.units, 0), detail.charge.rate, roomsSuggestedTotal, currency, "", "", "", "", data!.since, data!.until].map(String),
    ];
    downloadCsv(`talkstay-usage-${detail.slug}-rooms-${days}d.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage & pilot billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Engagement meters for customer charges, plus estimated OpenAI cost per property / QR
            (OpenAI’s dashboard cannot split spend by room — we attribute it on each call).
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Properties" value={data.totals.hotels} />
            <Stat label="Active QRs" value={data.totals.active_qr} hint="Rooms with ≥1 interaction" />
            <Stat label="Guest sessions" value={data.totals.sessions} />
            <Stat label="Guest turns" value={data.totals.guest_turns} />
            <Stat
              label="Suggested charge"
              value={money(data.totals.suggested, data.totals.currency)}
              hint={`Customer draft · ${String(data.billing.primary_meter ?? "active_qr")}`}
            />
            <Stat
              label="Est. AI cost"
              value={moneyUsd(Number(data.totals.ai_cost_usd) || 0)}
              hint={
                data.llm_cost_missing_table
                  ? "Apply ts_llm_calls migration"
                  : `${Number(data.totals.ai_calls) || 0} calls · OpenAI USD`
              }
            />
            <Stat
              label="Partner commission"
              value={money(Number(data.totals.partner_commission) || 0, data.totals.currency)}
              hint={`${Number(data.totals.referred_hotels) || 0} referred · default ${data.partners?.default_commission_pct ?? 20}%`}
            />
          </div>

          {data.llm_cost_missing_table && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Per-QR AI cost needs migration{" "}
              <code className="text-xs">20260816000004_talkstay_llm_calls.sql</code>
              {" "}and a redeploy of <code className="text-xs">talkstay-guest-chat</code>.
              Engagement meters above still work.
            </p>
          )}

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
                      ["invoice_line", "hotel", "slug", "billing_mode", "meter", "units", "rate", "amount", "partner", "partner_pct", "partner_commission", "currency", "period_start", "period_end"],
                      ...billable.map((h, i) => [
                        String(i + 1),
                        h.name,
                        h.slug,
                        h.billing_mode,
                        h.charge.primary_meter,
                        String(h.charge.units),
                        String(h.charge.rate),
                        String(h.charge.suggested),
                        h.partner?.name ?? "",
                        String(h.partner_commission?.pct ?? ""),
                        String(h.partner_commission?.amount ?? 0),
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
                      <th className="px-3 py-2 font-medium">Partner</th>
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
                          <td className="px-3 py-2 text-sm">
                            {h.partner ? (
                              <>
                                <div className="font-medium">{h.partner.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {h.partner_commission?.pct}% · {money(h.partner_commission?.amount ?? 0, h.charge.currency)}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {data.hotels.filter((h) => h.billing_mode === "pilot" || h.billing_mode === "usage").length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
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
                    {detail.slug} · {detail.billing_mode} ·                     {money(detail.charge.suggested, detail.charge.currency)} suggested
                    {" "}({detail.charge.units} × {detail.charge.rate} {detail.charge.primary_meter.replace(/_/g, " ")})
                    {" · "}
                    {moneyUsd(Number(detail.meters.ai_cost_usd) || 0)} est. AI
                    {" "}({Number(detail.meters.prompt_tokens) || 0} in / {Number(detail.meters.completion_tokens) || 0} out tokens)
                    {detail.partner && (
                      <>
                        {" · "}
                        <span className="text-violet-800">
                          {detail.partner.name} {detail.partner_commission?.pct}%
                          {" = "}
                          {money(detail.partner_commission?.amount ?? 0, detail.charge.currency)}
                        </span>
                      </>
                    )}
                    {!detail.partner && detail.referral_code && (
                      <span className="text-amber-800">
                        {" · "}referral <code className="text-xs">{detail.referral_code}</code> (not a known partner — no commission)
                      </span>
                    )}
                    {roomRows.length > 0 && roomsSuggestedTotal !== detail.charge.suggested && (
                      <span>
                        {" · "}room lines sum {money(roomsSuggestedTotal, detail.charge.currency)}
                        {" "}(orphans / unassigned may explain the gap)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/hotels/${detail.hotel_id}`}>Hotel controls</Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportRooms} disabled={!roomRows.length}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> CSV rooms
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Room / QR</th>
                      <th className="px-4 py-2 font-medium">Token / guest link</th>
                      <th className="px-4 py-2 font-medium">Sessions</th>
                      <th className="px-4 py-2 font-medium">Turns</th>
                      <th className="px-4 py-2 font-medium">Requests</th>
                      <th className="px-4 py-2 font-medium">AI cost</th>
                      <th className="px-4 py-2 font-medium">Suggested</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRows.map(({ room: r, charge: c }) => (
                      <tr key={r.room_id} className="border-t">
                        <td className="px-4 py-2 font-medium">
                          {r.guest_url ? (
                            <a
                              href={r.guest_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-700 underline-offset-2 hover:underline"
                              title="Open guest QR link"
                            >
                              {r.room_number}
                            </a>
                          ) : (
                            r.room_number
                          )}
                          {r.is_public && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">public</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {r.guest_url && r.token_preview ? (
                            <a
                              href={r.guest_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-violet-700 underline-offset-2 hover:underline"
                              title="Open guest QR link"
                            >
                              {r.token_preview}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                            </a>
                          ) : (
                            r.token_preview ?? "—"
                          )}
                        </td>
                        <td className="px-4 py-2">{r.sessions}</td>
                        <td className="px-4 py-2">{r.guest_turns}</td>
                        <td className="px-4 py-2">{r.requests}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {moneyUsd(Number(r.ai_cost_usd) || 0)}
                          <div className="text-[10px] text-muted-foreground">
                            {(Number(r.prompt_tokens) || 0) + (Number(r.completion_tokens) || 0)} tok
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-medium tabular-nums">
                            {money(c.suggested, detail.charge.currency)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.units} × {c.rate} {c.meter.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {r.engaged ? (
                            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800">Engaged</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Idle</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {roomRows.length > 0 && (
                      <tr className="border-t bg-muted/30">
                        <td className="px-4 py-2 font-semibold" colSpan={2}>
                          Room total
                        </td>
                        <td className="px-4 py-2 font-semibold tabular-nums">
                          {roomRows.reduce((s, r) => s + r.room.sessions, 0)}
                        </td>
                        <td className="px-4 py-2 font-semibold tabular-nums">
                          {roomRows.reduce((s, r) => s + r.room.guest_turns, 0)}
                        </td>
                        <td className="px-4 py-2 font-semibold tabular-nums">
                          {roomRows.reduce((s, r) => s + r.room.requests, 0)}
                        </td>
                        <td className="px-4 py-2 font-semibold tabular-nums">
                          {moneyUsd(roomRows.reduce((s, r) => s + (Number(r.room.ai_cost_usd) || 0), 0))}
                        </td>
                        <td className="px-4 py-2 font-semibold tabular-nums">
                          {money(roomsSuggestedTotal, detail.charge.currency)}
                          <div className="text-[10px] font-normal text-muted-foreground">
                            Property suggested {money(detail.charge.suggested, detail.charge.currency)}
                          </div>
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    )}
                    {roomRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No rooms</td>
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
                      <th className="px-4 py-3 font-medium">AI cost</th>
                      <th className="px-4 py-3 font-medium">Partner</th>
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
                        <td className="px-4 py-3 tabular-nums">
                          {moneyUsd(Number(h.meters.ai_cost_usd) || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {h.partner ? (
                            <>
                              <div className="font-medium">{h.partner.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {h.partner_commission?.pct}% · {money(h.partner_commission?.amount ?? 0, h.charge.currency)}
                              </div>
                            </>
                          ) : h.referral_code ? (
                            <span className="text-xs text-muted-foreground font-mono">{h.referral_code}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
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
                        <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
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
            {" "}(or per-hotel overrides). Suggested charge = customer draft (primary meter; room Suggested breaks it down per QR). Est. AI cost = attributed OpenAI USD from guest QR calls (not PostHog).
            Partner commission = suggested × partner % (default {data.partners?.default_commission_pct ?? 20}%) for hotels with a known referral code — manage codes under Settings.
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
