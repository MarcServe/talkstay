import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InsightsTimeRange } from "@/talkstay/lib/data";
import { talkstayKeys } from "@/talkstay/lib/data";
import { useInsightsData } from "@/talkstay/hooks/useTalkStayQueries";
import {
  Loader2, MessageSquare, Users, HelpCircle, ClipboardList, CheckCircle2, Star, Timer,
  Heart, TrendingDown, TrendingUp, Minus, BellRing, X, Printer,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";
import RequestDetailSheet from "@/talkstay/components/RequestDetailSheet";
import ExportReportButton from "@/talkstay/components/ExportReportButton";
import { exportFilenameBase, type TalkStayExportPayload } from "@/talkstay/lib/exportReport";
import { INTENT_STYLE, statusBadge, statusLabel } from "@/talkstay/lib/statusStyles";

/** Recharts click payloads vary by chart type — normalise to the data row. */
function chartRow(entry: any): Record<string, any> | null {
  if (!entry) return null;
  if (entry.payload && typeof entry.payload === "object") return entry.payload;
  if (typeof entry === "object") return entry;
  return null;
}

const CHART_COLORS = ["#0ea5e9", "#14b8a6", "#10b981", "#f59e0b", "#f43f5e", "#64748b", "#0284c7", "#0d9488"];

type TimeRange = InsightsTimeRange;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const TIME_RANGES: { id: TimeRange; label: string; short: string; ms: number }[] = [
  { id: "24h", label: "24 hours", short: "24h", ms: 24 * HOUR_MS },
  { id: "3d", label: "3 days", short: "3d", ms: 3 * DAY_MS },
  { id: "7d", label: "7 days", short: "7d", ms: 7 * DAY_MS },
  { id: "30d", label: "30 days", short: "30d", ms: 30 * DAY_MS },
  { id: "90d", label: "90 days", short: "90d", ms: 90 * DAY_MS },
];

interface Interaction { session_id: string | null; role: string; content: string | null; intent: string | null; language: string | null; created_at: string; }
interface Req { id: string; room_id: string | null; department_key: string; summary: string; status: string; is_complaint: boolean; classification_method: string | null; session_id: string | null; created_at: string; updated_at: string; ts_rooms?: { room_number: string } | null; }
interface Ev { request_id: string; status: string; note: string | null; created_at: string; }
interface Pulse {
  id: string; body: string; rating: number | null; sentiment: string; severity: string;
  department_key: string | null; issue_key: string; issue_label: string | null;
  request_id: string | null; acknowledged_at: string | null; created_at: string;
  ts_rooms?: { room_number: string } | null;
}

const PERIOD_DAYS = 30;

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  neutral: "border border-slate-200 bg-slate-100 text-slate-600",
  negative: "border border-rose-200 bg-rose-100 text-rose-800",
};
const SEVERITY_STYLE: Record<string, string> = {
  high: "border border-rose-200 bg-rose-100 text-rose-800",
  medium: "border border-amber-200 bg-amber-100 text-amber-900",
  low: "border border-slate-200 bg-slate-100 text-slate-600",
};

const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;
const fmtDur = (min: number | null) => {
  if (min == null) return "—";
  if (min < 1) return "<1m";
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60); const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
};
const fmtWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

type Drill = "requests" | "completed" | "questions" | "conversations" | "ratings" | "pulse";

function Stat({ icon: Icon, label, value, sub, active, onClick }: {
  icon: any; label: string; value: string | number; sub?: string; active?: boolean; onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`rounded-2xl border p-4 text-left transition-all ${
        clickable
          ? "cursor-pointer hover:border-teal-400/70 hover:bg-white/50 hover:shadow-md active:scale-[0.99]"
          : "cursor-default"
      } ${active ? "border-teal-500 bg-teal-50/80 ring-2 ring-teal-500/20" : ""}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {clickable && (
        <div className={`mt-2 text-[10px] font-medium uppercase tracking-wide ${active ? "text-teal-700" : "text-muted-foreground/80"}`}>
          {active ? "Showing below ↓" : "Click to explore"}
        </div>
      )}
    </button>
  );
}

export default function InsightsPanel({ hotel }: { hotel: Hotel }) {
  const qc = useQueryClient();
  const drillRef = useRef<HTMLDivElement>(null);
  const [drill, setDrill] = useState<Drill>("requests");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  // Clickable chart filters — managers drill from a slice into the table below.
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const revealDrill = (next: Drill, note?: string) => {
    setDrill(next);
    if (note) toast.message(note, { duration: 1800 });
    requestAnimationFrame(() => {
      drillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const rangeMeta = TIME_RANGES.find((r) => r.id === timeRange) ?? TIME_RANGES[2];
  const sinceMs = Date.now() - rangeMeta.ms;

  const { data: insight, isPending, isError, error } = useInsightsData(hotel.id, timeRange);
  const rows = useMemo(
    () => (insight?.interactions as Interaction[] | undefined) ?? [],
    [insight?.interactions],
  );
  const reqs = useMemo(
    () => (insight?.requests as Req[] | undefined) ?? [],
    [insight?.requests],
  );
  const events = useMemo(
    () => (insight?.events as Ev[] | undefined) ?? [],
    [insight?.events],
  );
  const ratings = useMemo(() => insight?.ratings ?? [], [insight?.ratings]);
  const pulses = useMemo(
    () => (insight?.pulses as Pulse[] | undefined) ?? [],
    [insight?.pulses],
  );
  // Keep prior range on screen while the next range loads.
  const loading = isPending && !insight;

  useEffect(() => {
    if (isError && error) toast.error(error.message);
  }, [isError, error]);

  // Per-request audit model with timings.
  const audit = useMemo(() => {
    const ratingMap = new Map(ratings.map((r) => [r.request_id, r.rating]));
    const commentMap = new Map(ratings.map((r) => [r.request_id, r.comment]));
    const firstEvent = (rid: string, statuses: string[]) =>
      events.find((e) => e.request_id === rid && statuses.includes(e.status));
    return reqs.map((r) => {
      const created = new Date(r.created_at).getTime();
      const acc = firstEvent(r.id, ["accepted"]);
      const done = firstEvent(r.id, ["completed", "guest_confirmed"]);
      const doneAt = done ? new Date(done.created_at).getTime()
        : (["completed", "guest_confirmed"].includes(r.status) ? new Date(r.updated_at).getTime() : null);
      const dayKey = r.created_at.slice(0, 10);
      return {
        ...r,
        dayKey,
        room: r.ts_rooms?.room_number ?? "—",
        acceptedAt: acc?.created_at ?? null,
        acceptedBy: acc?.note ?? null,
        completedAt: doneAt ? new Date(doneAt).toISOString() : null,
        toAcceptMin: acc ? (new Date(acc.created_at).getTime() - created) / 60000 : null,
        toCompleteMin: doneAt ? (doneAt - created) / 60000 : null,
        rating: ratingMap.get(r.id) ?? null,
        comment: commentMap.get(r.id) ?? null,
        isDone: ["completed", "guest_confirmed"].includes(r.status),
      };
    });
  }, [reqs, events, ratings]);

  const rangedAudit = useMemo(
    () => audit.filter((a) => new Date(a.created_at).getTime() >= sinceMs),
    [audit, sinceMs],
  );
  const rangedRows = useMemo(
    () => rows.filter((r) => new Date(r.created_at).getTime() >= sinceMs),
    [rows, sinceMs],
  );
  const rangedRatings = useMemo(() => {
    const ids = new Set(rangedAudit.map((a) => a.id));
    return ratings.filter((r) => ids.has(r.request_id));
  }, [ratings, rangedAudit]);

  const m = useMemo(() => {
    const guestTurns = rangedRows.filter((r) => r.role === "guest");
    const sessions = new Set(guestTurns.map((r) => r.session_id).filter(Boolean));
    const questions = guestTurns.filter((r) => r.intent === "question").length;
    const doneRows = rangedAudit.filter((a) => a.isDone);
    const completion = rangedAudit.length ? Math.round((doneRows.length / rangedAudit.length) * 100) : 0;
    const avg = rangedRatings.length ? rangedRatings.reduce((a, b) => a + b.rating, 0) / rangedRatings.length : 0;
    const acceptTimes = rangedAudit.map((a) => a.toAcceptMin).filter((n): n is number => n != null && n >= 0);
    const completeTimes = doneRows.map((a) => a.toCompleteMin).filter((n): n is number => n != null && n >= 0);
    const avgAccept = acceptTimes.length ? acceptTimes.reduce((a, b) => a + b, 0) / acceptTimes.length : null;
    const avgComplete = completeTimes.length ? completeTimes.reduce((a, b) => a + b, 0) / completeTimes.length : null;
    return {
      guests: sessions.size, conversations: guestTurns.length, questions,
      requestsTotal: rangedAudit.length, done: doneRows.length, completion, avg, avgAccept, avgComplete,
      feed: guestTurns,
    };
  }, [rangedRows, rangedAudit, rangedRatings]);

  /** Chart series for the BI board — click any slice to filter the table. */
  const charts = useMemo(() => {
    const hourly = timeRange === "24h";
    const byBucket = new Map<string, { day: string; label: string; requests: number; completed: number }>();
    if (hourly) {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(Date.now() - i * HOUR_MS);
        const key = d.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        byBucket.set(key, {
          day: key,
          label: d.toLocaleTimeString(undefined, { hour: "numeric" }),
          requests: 0,
          completed: 0,
        });
      }
    } else {
      const days = Math.max(1, Math.round(rangeMeta.ms / DAY_MS));
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * DAY_MS);
        const key = d.toISOString().slice(0, 10);
        byBucket.set(key, {
          day: key,
          label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          requests: 0,
          completed: 0,
        });
      }
    }
    const byDept = new Map<string, number>();
    const byStatus = new Map<string, number>();
    for (const a of rangedAudit) {
      const key = hourly ? a.created_at.slice(0, 13) : a.dayKey;
      const bucket = byBucket.get(key);
      if (bucket) {
        bucket.requests += 1;
        if (a.isDone) bucket.completed += 1;
      }
      byDept.set(a.department_key, (byDept.get(a.department_key) ?? 0) + 1);
      byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);
    }
    const deptPie = [...byDept.entries()]
      .map(([key, value]) => ({ key, name: deptLabel(key), value }))
      .sort((a, b) => b.value - a.value);
    const statusBars = [...byStatus.entries()]
      .map(([key, value]) => ({ key, name: key.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);
    const ratingDist = [1, 2, 3, 4, 5].map((star) => ({
      star: `${star}★`,
      value: rangedRatings.filter((r) => r.rating === star).length,
    }));
    return {
      volume: [...byBucket.values()],
      deptPie,
      statusBars,
      ratingDist,
      hourly,
    };
  }, [rangedAudit, rangedRatings, timeRange, rangeMeta.ms]);

  const filteredAudit = useMemo(() => {
    let rows = rangedAudit;
    if (deptFilter) rows = rows.filter((r) => r.department_key === deptFilter);
    if (dayFilter) rows = rows.filter((r) => r.created_at.startsWith(dayFilter) || r.dayKey === dayFilter);
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (drill === "completed") rows = rows.filter((r) => r.isDone);
    return rows;
  }, [rangedAudit, deptFilter, dayFilter, statusFilter, drill]);

  const clearChartFilters = () => {
    setDeptFilter(null);
    setDayFilter(null);
    setStatusFilter(null);
  };

  const buildExportPayload = (): TalkStayExportPayload | null => {
    // Full report for the selected time range (chart filters only narrow the on-screen table).
    const requestRows = rangedAudit.map((a) => ({
      Room: a.room,
      Department: deptLabel(a.department_key),
      Request: a.summary,
      Status: statusLabel(a.status),
      Created: new Date(a.created_at).toLocaleString(),
      Accepted: a.acceptedAt ? new Date(a.acceptedAt).toLocaleString() : "",
      "To accept": fmtDur(a.toAcceptMin),
      Completed: a.completedAt ? new Date(a.completedAt).toLocaleString() : "",
      "To complete": fmtDur(a.toCompleteMin),
      "Handled by": a.acceptedBy ?? "",
      Rating: a.rating ?? "",
      Comment: a.comment ?? "",
      Complaint: a.is_complaint ? "yes" : "",
      "Classifier": a.classification_method ?? "",
    }));
    const pulseRows = pulses
      .filter((p) => new Date(p.created_at).getTime() >= sinceMs)
      .map((p) => ({
        When: new Date(p.created_at).toLocaleString(),
        Room: p.ts_rooms?.room_number ?? "—",
        Sentiment: p.sentiment,
        Severity: p.severity,
        Department: p.department_key ? deptLabel(p.department_key) : "",
        Issue: p.issue_label || p.issue_key,
        Rating: p.rating ?? "",
        Feedback: p.body,
        Acknowledged: p.acknowledged_at ? new Date(p.acknowledged_at).toLocaleString() : "",
      }));
    const ratingRows = rangedRatings.map((r) => ({
      "Request ID": r.request_id,
      Rating: r.rating,
      Comment: r.comment ?? "",
    }));
    return {
      propertyName: hotel.name,
      title: "Insights report",
      subtitle: "Full dashboard export for the selected range",
      rangeLabel: rangeMeta.label,
      filenameBase: exportFilenameBase(hotel.slug || hotel.name, "insights", timeRange),
      metrics: [
        { label: "Guests engaged", value: m.guests },
        { label: "Conversations (guest messages)", value: m.conversations },
        { label: "Questions answered", value: m.questions },
        { label: "Requests", value: m.requestsTotal },
        { label: "Completed", value: `${m.done} (${m.completion}%)` },
        { label: "Avg rating", value: m.avg ? m.avg.toFixed(1) : "—" },
        { label: "Avg time to accept", value: fmtDur(m.avgAccept) },
        { label: "Avg time to complete", value: fmtDur(m.avgComplete) },
        { label: "Guest pulse responses", value: pulseRows.length },
      ],
      tables: [
        { title: "Service requests", rows: requestRows },
        { title: "Guest pulse", rows: pulseRows },
        { title: "Ratings", rows: ratingRows },
        {
          title: "Volume by department",
          rows: charts.deptPie.map((d) => ({ Department: d.name, Requests: d.value })),
        },
        {
          title: "Status breakdown",
          rows: charts.statusBars.map((s) => ({ Status: s.name, Count: s.value })),
        },
      ],
    };
  };

  // Improvement tracking: the same issue, this period vs the one before it.
  // Counting complaints is easy; showing whether they went DOWN is the point.
  const pulse = useMemo(() => {
    const now = Date.now();
    const at = (p: Pulse) => new Date(p.created_at).getTime();
    const current = pulses.filter((p) => at(p) >= now - PERIOD_DAYS * DAY_MS);
    const previous = pulses.filter((p) => at(p) < now - PERIOD_DAYS * DAY_MS && at(p) >= now - PERIOD_DAYS * 2 * DAY_MS);

    const negCounts = (list: Pulse[]) => {
      const map = new Map<string, { count: number; label: string; dept: string | null }>();
      for (const p of list) {
        if (p.sentiment !== "negative") continue;
        const prev = map.get(p.issue_key);
        map.set(p.issue_key, {
          count: (prev?.count ?? 0) + 1,
          label: p.issue_label || prev?.label || p.issue_key,
          dept: prev?.dept ?? p.department_key,
        });
      }
      return map;
    };
    const curNeg = negCounts(current);
    const prevNeg = negCounts(previous);

    const issues = [...new Set([...curNeg.keys(), ...prevNeg.keys()])]
      .map((key) => {
        const c = curNeg.get(key);
        const p = prevNeg.get(key);
        return {
          key,
          label: c?.label ?? p?.label ?? key,
          dept: c?.dept ?? p?.dept ?? null,
          now: c?.count ?? 0,
          before: p?.count ?? 0,
        };
      })
      .sort((a, b) => b.now - a.now || b.before - a.before);

    const rate = (list: Pulse[]) =>
      list.length ? Math.round((list.filter((p) => p.sentiment === "negative").length / list.length) * 100) : null;

    return {
      all: pulses,
      current, previous, issues,
      negRateNow: rate(current),
      negRateBefore: rate(previous),
      positiveNow: current.filter((p) => p.sentiment === "positive").length,
      caughtInStay: current.filter((p) => p.request_id).length,
    };
  }, [pulses]);

  const acknowledge = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("ts_guest_pulse")
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: u?.user?.id ?? null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    void qc.invalidateQueries({ queryKey: talkstayKeys.insightsHotel(hotel.id) });
    toast.success("Marked as seen.");
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading insights…</div>;
  }

  const hasChartFilter = !!(deptFilter || dayFilter || statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Analytics board</h2>
          <p className="text-sm text-muted-foreground">
            Click any KPI, bar, or pie slice to filter the records below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex flex-wrap rounded-lg border bg-background p-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setTimeRange(r.id); clearChartFilters(); }}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === r.id ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.short}
              </button>
            ))}
          </div>
          <ExportReportButton
            buildPayload={buildExportPayload}
            disabled={loading}
            label="Export"
          />
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Stat icon={Users} label="Guests engaged" value={m.guests} sub={`last ${rangeMeta.label}`} active={drill === "conversations" && !hasChartFilter} onClick={() => { clearChartFilters(); revealDrill("conversations", "Guest conversations"); }} />
        <Stat icon={MessageSquare} label="Conversations" value={m.conversations} sub="guest messages" active={drill === "conversations" && !hasChartFilter} onClick={() => { clearChartFilters(); revealDrill("conversations", "Guest conversations"); }} />
        <Stat icon={HelpCircle} label="Questions answered" value={m.questions} active={drill === "questions"} onClick={() => { clearChartFilters(); revealDrill("questions", "Questions answered"); }} />
        <Stat icon={ClipboardList} label="Requests" value={m.requestsTotal} active={drill === "requests" && !hasChartFilter} onClick={() => { clearChartFilters(); revealDrill("requests", "All requests in this range"); }} />
        <Stat icon={CheckCircle2} label="Completed" value={`${m.done} · ${m.completion}%`} active={drill === "completed"} onClick={() => { clearChartFilters(); revealDrill("completed", "Completed requests"); }} />
        <Stat icon={Star} label="Avg rating" value={m.avg ? m.avg.toFixed(1) : "—"} sub={m.avg ? `${rangedRatings.length} reviews` : "no reviews yet"} active={drill === "ratings"} onClick={() => { clearChartFilters(); revealDrill("ratings", "Guest ratings"); }} />
        <Stat
          icon={Heart} label="Caught during the stay"
          value={pulse.caughtInStay}
          sub={`of ${pulse.current.length} pulse checks · last ${PERIOD_DAYS} days`}
          active={drill === "pulse"} onClick={() => { clearChartFilters(); revealDrill("pulse", "Pulse checks"); }}
        />
        <Stat
          icon={Timer} label="Avg accept / complete"
          value={`${fmtDur(m.avgAccept)} · ${fmtDur(m.avgComplete)}`}
          sub="request → accept → done"
          active={drill === "requests" && !hasChartFilter}
          onClick={() => { clearChartFilters(); revealDrill("requests", "Request timings — open any row for the full trail"); }}
        />
      </div>

      {/* Interactive BI charts — bars/slices are the hit targets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">Request volume</h3>
              <p className="text-xs text-muted-foreground">
                {charts.hourly ? "Click a bar (hour) to filter the table" : "Click a bar (day) to filter the table"}
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.volume}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="requests"
                  name="Requests"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: any) => {
                    const row = chartRow(entry);
                    const day = row?.day as string | undefined;
                    if (!day) return;
                    setDayFilter(day);
                    setDeptFilter(null);
                    setStatusFilter(null);
                    revealDrill("requests", charts.hourly ? `Filtered to ${row.label}` : `Filtered to ${row.label}`);
                  }}
                >
                  {charts.volume.map((v) => (
                    <Cell
                      key={v.day}
                      fill="#0ea5e9"
                      opacity={!dayFilter || v.day === dayFilter ? 1 : 0.28}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: any) => {
                    const row = chartRow(entry);
                    const day = row?.day as string | undefined;
                    if (!day) return;
                    setDayFilter(day);
                    setDeptFilter(null);
                    setStatusFilter(null);
                    revealDrill("completed", `Completed on ${row.label}`);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-medium">By department</h3>
            <p className="text-xs text-muted-foreground">Click a slice or legend name to open that team’s requests</p>
          </div>
          <div className="h-56">
            {charts.deptPie.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No requests in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.deptPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    cursor="pointer"
                    onClick={(entry: any) => {
                      const row = chartRow(entry);
                      const key = (row?.key ?? entry?.key) as string | undefined;
                      if (!key) return;
                      setDeptFilter(key);
                      setDayFilter(null);
                      setStatusFilter(null);
                      revealDrill("requests", `${deptLabel(key)} requests`);
                    }}
                  >
                    {charts.deptPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                        opacity={!deptFilter || charts.deptPie[i].key === deptFilter ? 1 : 0.35} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                    onClick={(e: any) => {
                      const name = e?.value as string | undefined;
                      const hit = charts.deptPie.find((d) => d.name === name);
                      if (!hit) return;
                      setDeptFilter(hit.key);
                      setDayFilter(null);
                      setStatusFilter(null);
                      revealDrill("requests", `${hit.name} requests`);
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-medium">Status mix</h3>
            <p className="text-xs text-muted-foreground">Click a bar to filter by status</p>
          </div>
          <div className="h-56">
            {charts.statusBars.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No status data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.statusBars} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="value" name="Requests" radius={[0, 6, 6, 0]} cursor="pointer"
                    onClick={(entry: any) => {
                      const row = chartRow(entry);
                      const key = (row?.key ?? entry?.key) as string | undefined;
                      if (!key) return;
                      setStatusFilter(key);
                      setDeptFilter(null);
                      setDayFilter(null);
                      revealDrill("requests", `Status: ${key.replace(/_/g, " ")}`);
                    }}
                  >
                    {charts.statusBars.map((s, i) => (
                      <Cell key={s.key} fill={CHART_COLORS[i % CHART_COLORS.length]}
                        opacity={!statusFilter || s.key === statusFilter ? 1 : 0.35} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-medium">Guest ratings</h3>
            <p className="text-xs text-muted-foreground">Click a star bar to open reviews</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.ratingDist} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="star" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="value" name="Reviews" fill="#f59e0b" radius={[6, 6, 0, 0]} cursor="pointer"
                  onClick={() => { clearChartFilters(); revealDrill("ratings", "Guest ratings"); }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Drill-down sits directly under charts so clicks feel instant */}
      <div ref={drillRef} className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">
            {drill === "requests" && "Requests"}
            {drill === "completed" && "Completed requests"}
            {drill === "ratings" && "Guest ratings"}
            {drill === "pulse" && "Pulse checks"}
            {drill === "questions" && "Questions"}
            {drill === "conversations" && "Conversations"}
          </h3>
          {(hasChartFilter || drill !== "requests") && (
            <button
              type="button"
              onClick={() => { clearChartFilters(); revealDrill("requests"); }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Reset view
            </button>
          )}
        </div>

        {(hasChartFilter || drill === "requests" || drill === "completed") && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Showing:</span>
            {dayFilter && (
              <button type="button" onClick={() => setDayFilter(null)}
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 font-medium text-sky-800">
                {charts.hourly
                  ? charts.volume.find((v) => v.day === dayFilter)?.label ?? dayFilter
                  : new Date(dayFilter.length <= 10 ? `${dayFilter}T12:00:00` : dayFilter).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                <X className="h-3 w-3" />
              </button>
            )}
            {deptFilter && (
              <button type="button" onClick={() => setDeptFilter(null)}
                className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-100 px-2.5 py-1 font-medium text-teal-900">
                {deptLabel(deptFilter)}
                <X className="h-3 w-3" />
              </button>
            )}
            {statusFilter && (
              <button type="button" onClick={() => setStatusFilter(null)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 font-medium text-amber-900">
                {statusFilter.replace(/_/g, " ")}
                <X className="h-3 w-3" />
              </button>
            )}
            {hasChartFilter && (
              <button type="button" onClick={clearChartFilters} className="text-muted-foreground underline hover:text-foreground">
                Clear filters
              </button>
            )}
            <span className="text-muted-foreground">
              · {filteredAudit.length} row{filteredAudit.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {(drill === "requests" || drill === "completed") ? (
          <AuditTable
            rows={filteredAudit}
            onOpen={(id) => setSelectedId(id)}
          />
        ) : drill === "ratings" ? (
          <ReviewsList
            audit={rangedAudit.filter((a) => a.rating != null)}
            onOpen={(id) => setSelectedId(id)}
          />
        ) : drill === "pulse" ? (
          <PulseFeed
            pulses={pulse.all}
            onAcknowledge={acknowledge}
            onOpenRequest={(id) => setSelectedId(id)}
          />
        ) : (
          <ActivityFeed
            feed={drill === "questions" ? m.feed.filter((f) => f.intent === "question") : m.feed}
            requests={reqs}
            onOpen={(id) => setSelectedId(id)}
          />
        )}
      </div>

      <ImprovementTracker pulse={pulse} />

      <RequestDetailSheet
        requestId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => { if (!o) setSelectedId(null); }}
      />
    </div>
  );
}

/** Did the property actually get better? Same issue, this period vs the last. */
function ImprovementTracker({ pulse }: { pulse: any }) {
  const { issues, negRateNow, negRateBefore } = pulse;
  const delta = negRateNow != null && negRateBefore != null ? negRateNow - negRateBefore : null;

  return (
    <div className="rounded-2xl border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">Guest experience — are we improving?</h3>
        <span className="text-xs text-muted-foreground">last {PERIOD_DAYS} days vs the {PERIOD_DAYS} before</span>
      </div>

      {pulse.all.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No pulse checks yet. Guests are asked how their stay is going once they've used the assistant —
          answers, and whether the same complaints keep coming back, appear here.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Unhappy guests</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{negRateNow != null ? `${negRateNow}%` : "—"}</span>
                {delta != null && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${delta < 0 ? "text-green-600" : delta > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                    {delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    {delta === 0 ? "no change" : `${Math.abs(delta)} pts vs last period`}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Happy guests</div>
              <div className="text-2xl font-semibold">{pulse.positiveNow}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Raised to a manager mid-stay</div>
              <div className="text-2xl font-semibold">{pulse.caughtInStay}</div>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="mt-5 divide-y rounded-xl border">
              {issues.slice(0, 8).map((i: any) => {
                const diff = i.now - i.before;
                return (
                  <div key={i.key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {i.label}
                      {i.dept && <span className="text-muted-foreground"> · {deptLabel(i.dept)}</span>}
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {i.before} → <span className="font-medium text-foreground">{i.now}</span>
                    </span>
                    <span className={`inline-flex w-24 shrink-0 items-center justify-end gap-1 text-xs font-medium ${diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {diff < 0 ? <><TrendingDown className="h-3.5 w-3.5" /> improving</>
                        : diff > 0 ? <><TrendingUp className="h-3.5 w-3.5" /> worsening</>
                        : <><Minus className="h-3.5 w-3.5" /> steady</>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PulseFeed({ pulses, onAcknowledge, onOpenRequest }: {
  pulses: Pulse[];
  onAcknowledge: (id: string) => void;
  onOpenRequest: (requestId: string) => void;
}) {
  if (pulses.length === 0) return <p className="text-sm text-muted-foreground">No pulse checks yet.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">What guests told us ({pulses.length})</h3>
      <div className="space-y-3">
        {pulses.slice(0, 60).map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-4 ${p.request_id ? "cursor-pointer transition-colors hover:border-violet-300 hover:bg-muted/30" : ""}`}
            onClick={() => { if (p.request_id) onOpenRequest(p.request_id); }}
            role={p.request_id ? "button" : undefined}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${SENTIMENT_STYLE[p.sentiment] ?? SENTIMENT_STYLE.neutral}`}>{p.sentiment}</span>
              {p.sentiment === "negative" && (
                <span className={`rounded-full px-2 py-0.5 ${SEVERITY_STYLE[p.severity] ?? SEVERITY_STYLE.low}`}>{p.severity} severity</span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{p.issue_label || p.issue_key}</span>
              {p.department_key && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{deptLabel(p.department_key)}</span>}
              <span className="ml-auto whitespace-nowrap text-muted-foreground">Room {p.ts_rooms?.room_number ?? "—"} · {fmtWhen(p.created_at)}</span>
            </div>
            <p className="mt-2 text-sm">{p.body}</p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              {p.request_id && (
                <span className="inline-flex items-center gap-1 text-violet-600">
                  <BellRing className="h-3.5 w-3.5" /> Raised to a manager — click to open
                </span>
              )}
              {p.acknowledged_at ? (
                <span className="text-muted-foreground">Acknowledged</span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAcknowledge(p.id); }}
                  className="text-muted-foreground underline hover:text-foreground"
                >
                  Mark as seen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTable({ rows, onOpen }: { rows: any[]; onOpen: (id: string) => void }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No requests match this view — try clearing filters.</p>;
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">Click any row for the full chat and timeline.</p>
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Room</th><th className="px-3 py-2">Dept</th><th className="px-3 py-2">Request</th>
              <th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">To accept</th><th className="px-3 py-2">To complete</th>
              <th className="px-3 py-2">Handled by</th><th className="px-3 py-2">★</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-t align-top transition-colors hover:bg-sky-50/80"
                onClick={() => onOpen(r.id)}
              >
                <td className="px-3 py-2 font-medium">{r.room}</td>
                <td className="px-3 py-2 text-muted-foreground">{deptLabel(r.department_key)}</td>
                <td className="px-3 py-2 max-w-[220px] truncate font-medium text-teal-800">{r.summary}{r.is_complaint ? " ⚠️" : ""}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span></td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{fmtWhen(r.created_at)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDur(r.toAcceptMin)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDur(r.toCompleteMin)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.acceptedBy ?? "—"}</td>
                <td className="px-3 py-2">{r.rating ? "★".repeat(r.rating) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsList({ audit, onOpen }: { audit: any[]; onOpen: (id: string) => void }) {
  if (audit.length === 0) return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Reviews ({audit.length})</h3>
      <div className="divide-y rounded-2xl border">
        {audit.map((r) => (
          <button
            type="button"
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <span className="min-w-0 flex-1 truncate">Room {r.room} · {r.summary}</span>
              <span className="ml-3 whitespace-nowrap text-yellow-500">{"★".repeat(r.rating)}</span>
            </div>
            {r.comment && (
              <p className="mt-1 border-l-2 border-muted pl-2 text-xs italic text-muted-foreground">
                “{r.comment}”
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ feed, requests, onOpen }: {
  feed: Interaction[];
  requests: Req[];
  onOpen: (id: string) => void;
}) {
  if (feed.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  // Newest request wins for a given guest session.
  const bySession = new Map<string, string>();
  for (const r of requests) {
    if (r.session_id && !bySession.has(r.session_id)) bySession.set(r.session_id, r.id);
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Conversations ({feed.length})</h3>
      <p className="mb-2 text-xs text-muted-foreground">Click a message that became a request to open the full dossier.</p>
      <div className="divide-y rounded-2xl border">
        {feed.slice(0, 60).map((r, i) => {
          const rid = r.session_id ? bySession.get(r.session_id) ?? null : null;
          return (
            <button
              type="button"
              key={i}
              disabled={!rid}
              onClick={() => { if (rid) onOpen(rid); }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                rid ? "cursor-pointer transition-colors hover:bg-muted/40" : "cursor-default opacity-90"
              }`}
            >
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTENT_STYLE[r.intent ?? "other"] ?? INTENT_STYLE.other}`}>{r.intent ?? "other"}</span>
              <span className={`min-w-0 flex-1 truncate ${rid ? "text-violet-700" : "text-muted-foreground"}`}>{r.content}</span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtWhen(r.created_at)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
