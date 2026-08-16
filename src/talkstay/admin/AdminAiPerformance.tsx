import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { loadAiPerformance, type AiPerformance } from "@/talkstay/admin/adminApi";

const PERIODS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function methodLabel(m: string) {
  if (m === "llm") return "LLM";
  if (m === "rule") return "Hotel rule";
  if (m === "keyword") return "Keyword";
  if (m === "fallback") return "Fallback";
  return m;
}

export default function AdminAiPerformance() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<AiPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await loadAiPerformance({ days });
      setData(res);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [days]);

  const maxTurns = Math.max(1, ...(data?.daily.map((d) => d.guest_turns) ?? [1]));
  const methodEntries = Object.entries(data?.totals.by_method ?? {}).sort((a, b) => b[1] - a[1]);
  const intentEntries = Object.entries(data?.totals.by_intent ?? {}).sort((a, b) => b[1] - a[1]);
  const methodTotal = methodEntries.reduce((s, [, n]) => s + n, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily view of how the assistant routes and engages — use this to study quality before and while you scale.
            Built on TalkStay logs (no Langfuse required yet).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
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
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading AI metrics…
        </div>
      ) : data ? (
        <>
          {/* Scale readiness */}
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Scale readiness</h2>
                <p className="text-sm text-muted-foreground">
                  Heuristic checks from live routing + engagement — not a substitute for reading triage tickets.
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold tracking-tight">{data.scale_readiness.score}</div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {data.scale_readiness.checks.map((c) => (
                <li key={c.id} className="flex gap-3 rounded-xl border px-3 py-2 text-sm">
                  {c.ok
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                  <div>
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Guest turns" value={data.totals.guest_turns} />
            <Stat label="Sessions" value={data.totals.sessions} />
            <Stat label="Requests" value={data.totals.requests} />
            <Stat label="Triage rate" value={pct(data.totals.triage_rate)} hint={`${data.totals.triage} need re-route`} />
            <Stat label="Complaint rate" value={pct(data.totals.complaint_rate)} />
            <Stat label="KB questions" value={data.totals.questions} />
            <Stat
              label="Avg rating"
              value={data.totals.avg_rating == null ? "—" : data.totals.avg_rating.toFixed(2)}
              hint={data.totals.ratings_count ? `${data.totals.ratings_count} reviews` : "No reviews yet"}
            />
            <Stat
              label="LLM share of routes"
              value={pct((data.totals.by_method.llm ?? 0) / methodTotal)}
              hint="Of classified requests"
            />
          </div>

          {/* Daily bars */}
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Daily guest turns</h2>
            <p className="text-sm text-muted-foreground">Volume trend — watch for spikes after go-live or QR rollout.</p>
            <div className="mt-4 flex h-36 items-end gap-1">
              {data.daily.map((d) => (
                <div key={d.day} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-violet-500/80 transition group-hover:bg-violet-600"
                    style={{ height: `${Math.max(4, (d.guest_turns / maxTurns) * 100)}%` }}
                    title={`${d.day}: ${d.guest_turns} turns · ${d.requests} requests · ${d.triage} triage`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{data.daily[0]?.day}</span>
              <span>{data.daily[data.daily.length - 1]?.day}</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Day</th>
                    <th className="py-1 pr-3 font-medium">Turns</th>
                    <th className="py-1 pr-3 font-medium">Sessions</th>
                    <th className="py-1 pr-3 font-medium">Requests</th>
                    <th className="py-1 pr-3 font-medium">Triage</th>
                    <th className="py-1 font-medium">Top method</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().slice(0, 14).map((d) => {
                    const top = Object.entries(d.by_method).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <tr key={d.day} className="border-t">
                        <td className="py-1.5 pr-3 font-medium">{d.day}</td>
                        <td className="py-1.5 pr-3">{d.guest_turns}</td>
                        <td className="py-1.5 pr-3">{d.sessions}</td>
                        <td className="py-1.5 pr-3">{d.requests}</td>
                        <td className="py-1.5 pr-3">{d.triage}</td>
                        <td className="py-1.5 text-muted-foreground">
                          {top ? `${methodLabel(top[0])} (${top[1]})` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold">How requests were classified</h2>
              <p className="text-sm text-muted-foreground">
                Healthy mix: rules/keywords for clear intents, LLM for the rest, low fallback.
              </p>
              <ul className="mt-4 space-y-2">
                {methodEntries.length === 0 && (
                  <li className="text-sm text-muted-foreground">No requests in this period.</li>
                )}
                {methodEntries.map(([m, n]) => (
                  <li key={m}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{methodLabel(m)}</span>
                      <span className="text-muted-foreground">{n} · {pct(n / methodTotal)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${(n / methodTotal) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold">Guest intent mix</h2>
              <p className="text-sm text-muted-foreground">
                From interaction labels — questions answered from knowledge vs service requests.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {intentEntries.length === 0 && (
                  <span className="text-sm text-muted-foreground">No guest turns yet.</span>
                )}
                {intentEntries.map(([intent, n]) => (
                  <Badge key={intent} variant="outline" className="text-sm">
                    {intent}: {n}
                  </Badge>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Per-property AI health</h2>
            <p className="text-sm text-muted-foreground">
              High triage or fallback share → check department routing and knowledge for that hotel.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">Turns</th>
                    <th className="px-3 py-2 font-medium">Requests</th>
                    <th className="px-3 py-2 font-medium">Triage</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">LLM</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Fallback</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.hotels.slice(0, 40).map((h) => (
                    <tr key={h.hotel_id} className="border-t">
                      <td className="px-3 py-2 font-medium">{h.name}</td>
                      <td className="px-3 py-2">{h.guest_turns}</td>
                      <td className="px-3 py-2">{h.requests}</td>
                      <td className="px-3 py-2">
                        <span className={h.triage_rate > 0.15 ? "text-amber-700" : ""}>
                          {pct(h.triage_rate)}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">{pct(h.llm_share)}</td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <span className={h.fallback_share > 0.2 ? "text-amber-700" : ""}>
                          {pct(h.fallback_share)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/admin/usage?hotel=${h.hotel_id}`}>Usage</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data.hotels.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        No AI activity in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            When triage/fallback stay low and ratings hold as volume grows, you’re ready to scale properties and QR density.
            Add Langfuse later only if you need prompt-level traces and token cost attribution across models.
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
