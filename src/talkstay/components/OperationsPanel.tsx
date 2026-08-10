import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, AlertTriangle, RefreshCw, MessageCircle, Send,
  UtensilsCrossed, BedDouble, Wrench, Wine, Shirt, ConciergeBell, KeyRound, ShieldAlert,
  ArrowDownRight, ArrowUpRight, Clock3,
} from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";
import { playChime } from "@/talkstay/lib/chime";
import type { OpsRequest, OpsTimeRange } from "@/talkstay/lib/data";
import { OPEN_STATUSES } from "@/talkstay/lib/data";
import {
  invalidateOps, useOpsQueue, useOpsRealtime,
} from "@/talkstay/hooks/useTalkStayQueries";
import RequestDetailSheet from "@/talkstay/components/RequestDetailSheet";
import { statusBadge, statusCard, statusLabel } from "@/talkstay/lib/statusStyles";

type Req = OpsRequest;

// Each department gets a distinct icon + soft tint, so staff can scan the
// queue by shape/colour instead of reading every card's department label.
const DEPT_VISUAL: Record<string, { Icon: typeof Wrench; tint: string }> = {
  housekeeping: { Icon: BedDouble, tint: "bg-sky-100 text-sky-600" },
  laundry: { Icon: Shirt, tint: "bg-cyan-100 text-cyan-600" },
  kitchen: { Icon: UtensilsCrossed, tint: "bg-amber-100 text-amber-600" },
  bar: { Icon: Wine, tint: "bg-rose-100 text-rose-600" },
  maintenance: { Icon: Wrench, tint: "bg-slate-100 text-slate-600" },
  concierge: { Icon: ConciergeBell, tint: "bg-violet-100 text-violet-600" },
  front_desk: { Icon: KeyRound, tint: "bg-indigo-100 text-indigo-600" },
  duty_manager: { Icon: ShieldAlert, tint: "bg-red-100 text-red-600" },
};

// Next lifecycle action per status.
const NEXT: Record<string, { to: string; label: string } | null> = {
  new: { to: "accepted", label: "Accept" },
  accepted: { to: "in_progress", label: "Start" },
  in_progress: { to: "on_the_way", label: "On the way" },
  on_the_way: { to: "completed", label: "Complete" },
  completed: null,
  guest_confirmed: null,
  // Guest said the completed work wasn't done — let staff pick it back up.
  reopened: { to: "on_the_way", label: "Pick back up" },
};

const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;
const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

type Filter = "all" | "new" | "active" | "done" | "followup";

const FILTER_LABEL: Record<Filter, string> = {
  all: "All", new: "New", active: "Active", done: "Done", followup: "Follow-up",
};

type TimeRange = OpsTimeRange;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const TIME_RANGES: { id: TimeRange; short: string; ms: number | null }[] = [
  { id: "24h", short: "24h", ms: 24 * HOUR_MS },
  { id: "3d", short: "3d", ms: 3 * DAY_MS },
  { id: "7d", short: "7d", ms: 7 * DAY_MS },
  { id: "30d", short: "30d", ms: 30 * DAY_MS },
  { id: "all", short: "All", ms: null },
];

const OVERDUE_MIN = 5; // a 'new' request older than this is flagged overdue
const minsSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60000;

export default function OperationsPanel({ hotel, lockedDepartment = null }: {
  hotel: Hotel; lockedDepartment?: string | null;
}) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("active");
  // Cap history so Done/All don't drown the board; open work always stays visible.
  const [timeRange, setTimeRange] = useState<TimeRange>("3d");
  // Department staff are hard-scoped to their own team's queue.
  const [dept, setDept] = useState<string>(lockedDepartment ?? "all");
  // Per-request "reply to guest" composer state.
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<Record<string, boolean>>({});
  const seenIds = useRef<Set<string> | null>(null);
  // Escalation EVENT ids already seen — separate from seenIds (row ids), since
  // escalate_request updates an EXISTING row rather than creating a new one,
  // so it needs its own "is this genuinely new" tracking for the chime.
  const seenEscalations = useRef<Set<string> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The queue this operator actually watches (locked team, or the dropdown).
  const watchedDept = lockedDepartment ?? dept;
  const watchedRef = useRef(watchedDept);
  watchedRef.current = watchedDept;

  const { data: queue, isPending, isFetching, isError, error } = useOpsQueue(hotel.id, timeRange);
  useOpsRealtime(hotel.id);

  const reqs = queue?.requests ?? [];
  const ack = queue?.ack ?? {};
  const escalations = queue?.escalations ?? {};
  // Only block the first paint when we have nothing cached yet.
  const loading = isPending && !queue;

  useEffect(() => {
    if (isError && error) toast.error(error.message);
  }, [isError, error]);

  // Chime on genuinely new / escalated items (cache updates from realtime or refetch).
  useEffect(() => {
    if (!queue) return;
    const list = queue.requests;

    if (seenIds.current) {
      const fresh = list.filter(
        (r) => !seenIds.current!.has(r.id) && r.status === "new" &&
          (watchedRef.current === "all" || r.department_key === watchedRef.current),
      );
      if (fresh.length) {
        playChime();
        const r = fresh[0];
        toast.message(
          fresh.length === 1
            ? `New request · Room ${r.ts_rooms?.room_number ?? "—"}`
            : `${fresh.length} new requests`,
          { description: fresh.length === 1 ? (r.summary_staff || r.summary) : undefined },
        );
      }
    }
    seenIds.current = new Set(list.map((r) => r.id));

    if (seenEscalations.current) {
      const fresh = queue.escalationEvents.filter((e) => {
        if (seenEscalations.current!.has(e.id)) return false;
        const dept = list.find((r) => r.id === e.request_id)?.department_key;
        return watchedRef.current === "all" || dept === watchedRef.current;
      });
      if (fresh.length) {
        playChime();
        const e0 = fresh[0];
        const r0 = list.find((r) => r.id === e0.request_id);
        toast.message(`Guest followed up · Room ${r0?.ts_rooms?.room_number ?? "—"}`, {
          description: e0.note || r0?.summary_staff || r0?.summary,
        });
      }
    }
    seenEscalations.current = new Set(queue.escalationEvents.map((e) => e.id));
  }, [queue]);

  const refresh = () => { void invalidateOps(qc, hotel.id); };

  // Resolve the current user's display identity for this hotel: "Name · Department".
  const actorLabel = async (userId?: string, email?: string | null): Promise<string> => {
    if (!userId) return email ?? "staff";
    const { data: s } = await supabase
      .from("ts_staff").select("name, department_key")
      .eq("hotel_id", hotel.id).eq("user_id", userId).limit(1).maybeSingle();
    const nm = s?.name || email || "staff";
    return s?.department_key ? `${nm} · ${deptLabel(s.department_key)}` : nm;
  };

  const TERMINAL = ["completed", "guest_confirmed", "cancelled"];

  const advance = async (r: Req, to: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("ts_service_requests")
      .update({ status: to, assigned_staff_id: user?.id ?? null })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    // note = acting staff's "Name · Department" → powers the acknowledgement line.
    const label = await actorLabel(user?.id, user?.email);
    await supabase.from("ts_request_events").insert({
      request_id: r.id, status: to, actor_type: "staff", actor_id: user?.id ?? null,
      note: label,
    });
    // Close-loop: guest is notified via DB trigger; alert the rest of the team.
    if (to === "completed" || to === "cancelled") {
      supabase.functions.invoke("talkstay-notify", {
        body: { requestId: r.id, event: to },
      }).then(() => {}, () => {});
    }
    refresh();
  };

  const escalate = async (r: Req) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("ts_service_requests").update({ priority: "urgent" }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("ts_request_events").insert({
      request_id: r.id, status: "escalated", actor_type: "staff", actor_id: user?.id ?? null, note: user?.email ?? null,
    });
    toast.message("Escalated — marked urgent for supervisors.");
    refresh();
  };

  // Send a human reply into the guest's chat (translated to their language server-side).
  const sendReply = async (r: Req) => {
    const text = (replyText[r.id] ?? "").trim();
    if (!text) return;
    setReplyBusy((p) => ({ ...p, [r.id]: true }));
    const { data, error } = await supabase.functions.invoke("talkstay-reply", { body: { requestId: r.id, body: text } });
    setReplyBusy((p) => ({ ...p, [r.id]: false }));
    const invokeErr = (data as { error?: string } | null)?.error;
    if (error || invokeErr) { toast.error(invokeErr ?? error?.message ?? "Couldn't send"); return; }
    setReplyText((p) => ({ ...p, [r.id]: "" }));
    setReplyOpen((p) => ({ ...p, [r.id]: false }));
    toast.success("Reply sent to the guest.");
  };

  const matchesFilter = (r: Req, f: Filter) => {
    if (f === "new") return r.status === "new";
    if (f === "done") return ["completed", "guest_confirmed", "cancelled"].includes(r.status);
    if (f === "active") return !["completed", "guest_confirmed", "cancelled"].includes(r.status);
    if (f === "followup") return !!escalations[r.id];
    return true;
  };

  const inDept = (r: Req) => dept === "all" || r.department_key === dept;

  const inTime = (r: Req) => {
    const range = TIME_RANGES.find((t) => t.id === timeRange);
    if (!range?.ms) return true;
    if (OPEN_STATUSES.includes(r.status)) return true;
    return new Date(r.created_at).getTime() >= Date.now() - range.ms;
  };

  const filtered = useMemo(
    () => reqs.filter((r) => inDept(r) && inTime(r) && matchesFilter(r, filter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reqs, filter, dept, escalations, timeRange]
  );

  // Counts shown on each pill reflect the current department + time scope.
  const counts = useMemo(() => {
    const scoped = reqs.filter((r) => inDept(r) && inTime(r));
    return {
      all: scoped.length,
      new: scoped.filter((r) => matchesFilter(r, "new")).length,
      active: scoped.filter((r) => matchesFilter(r, "active")).length,
      done: scoped.filter((r) => matchesFilter(r, "done")).length,
      followup: scoped.filter((r) => matchesFilter(r, "followup")).length,
    } as Record<Filter, number>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqs, dept, escalations, timeRange]);

  // Day-of BI for the ops board — scoped to the watched department.
  const bi = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    const scoped = reqs.filter(inDept);
    const today = scoped.filter((r) => new Date(r.created_at).getTime() >= startMs);
    const active = scoped.filter((r) => !["completed", "guest_confirmed", "cancelled"].includes(r.status));
    const completedToday = scoped.filter(
      (r) => ["completed", "guest_confirmed"].includes(r.status) && new Date(r.created_at).getTime() >= startMs,
    );
    const acceptMins = today
      .map((r) => {
        const a = ack[r.id];
        if (!a) return null;
        return (new Date(a.at).getTime() - new Date(r.created_at).getTime()) / 60000;
      })
      .filter((n): n is number => n != null && n >= 0);
    const avgAccept = acceptMins.length
      ? acceptMins.reduce((a, b) => a + b, 0) / acceptMins.length
      : null;
    const byDept = new Map<string, number>();
    for (const r of today) byDept.set(r.department_key, (byDept.get(r.department_key) ?? 0) + 1);
    const deptRows = [...byDept.entries()]
      .map(([key, count]) => ({ key, count, label: deptLabel(key) }))
      .sort((a, b) => b.count - a.count);
    const deptTotal = today.length || 1;
    const fmtAvg = (min: number | null) => {
      if (min == null) return "—";
      if (min < 1) return "<1m";
      if (min < 60) return `${Math.round(min)}m`;
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      return m ? `${h}h ${m}m` : `${h}h`;
    };
    return {
      totalToday: today.length,
      inProgress: active.length,
      completedToday: completedToday.length,
      avgAcceptLabel: fmtAvg(avgAccept),
      deptRows,
      deptTotal,
      live: active.slice(0, 6),
      recent: scoped.slice(0, 6),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqs, dept, ack]);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {/* BI strip — today's pulse for the watched queue */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="text-xs text-muted-foreground">Total requests today</div>
          <div className="mt-1 text-2xl font-semibold">{bi.totalToday}</div>
          <div className="mt-1 inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-violet-600" />
            <span className="truncate">live queue scope</span>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="text-xs text-muted-foreground">In progress</div>
          <div className="mt-1 text-2xl font-semibold">{bi.inProgress}</div>
          <div className="mt-1 text-xs text-violet-600">Active now</div>
        </div>
        <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="text-xs text-muted-foreground">Completed today</div>
          <div className="mt-1 text-2xl font-semibold">{bi.completedToday}</div>
          <div className="mt-1 inline-flex min-w-0 items-center gap-1 text-xs text-green-600">
            <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">closed same day</span>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="text-xs text-muted-foreground">Avg. time to accept</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Clock3 className="h-5 w-5 shrink-0 text-muted-foreground" />
            {bi.avgAcceptLabel}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">request → staff accepted</div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        <div className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm lg:col-span-1">
          <h3 className="text-sm font-medium">Requests by department today</h3>
          {bi.deptRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No requests yet today.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {bi.deptRows.slice(0, 6).map((d) => {
                const pct = Math.round((d.count / bi.deptTotal) * 100);
                return (
                  <li key={d.key} className="min-w-0">
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium">{d.label}</span>
                      <span className="shrink-0 text-muted-foreground">{d.count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full max-w-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-medium">Recent requests</h3>
            <button type="button" className="shrink-0 text-xs text-violet-600 hover:underline" onClick={() => setFilter("all")}>
              View all
            </button>
          </div>
          <ul className="mt-3 divide-y">
            {bi.recent.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">Nothing yet.</li>
            ) : bi.recent.map((r) => (
              <li key={r.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="flex w-full min-w-0 items-start gap-2 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">{r.summary_staff || r.summary}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {deptLabel(r.department_key)} · {timeAgo(r.created_at)}
                    </p>
                  </div>
                  <span className={`max-w-[40%] shrink-0 truncate rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-medium">Live requests</h3>
            <button type="button" className="shrink-0 text-xs text-violet-600 hover:underline" onClick={() => setFilter("active")}>
              View all
            </button>
          </div>
          <ul className="mt-3 divide-y">
            {bi.live.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">Queue is clear.</li>
            ) : bi.live.map((r) => (
              <li key={r.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="flex w-full min-w-0 items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-semibold text-violet-700">
                    {r.ts_rooms?.room_number ?? "—"}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">Room {r.ts_rooms?.room_number ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {deptLabel(r.department_key)} · {timeAgo(r.created_at)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "new", "active", "done", "followup"] as Filter[]).map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  on ? "bg-violet-600 text-white" : "border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {FILTER_LABEL[f]}
                <span className={on ? "text-white/70" : "text-muted-foreground/70"}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-background p-0.5" title="How far back to show closed requests">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  timeRange === r.id ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.short}
              </button>
            ))}
          </div>
          {lockedDepartment ? (
            <Badge variant="secondary" className="px-2 py-1">{deptLabel(lockedDepartment)}</Badge>
          ) : (
            <select className="rounded-md border bg-background px-2 py-1.5 text-sm"
              value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="all">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.display_name}</option>)}
            </select>
          )}
          <Button size="sm" variant="ghost" onClick={refresh} disabled={isFetching} title="Refresh queue">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading queue…</div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing here right now.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const next = NEXT[r.status];
            const overdue = r.status === "new" && minsSince(r.created_at) > OVERDUE_MIN;
            const acked = ack[r.id];
            const escalation = escalations[r.id];
            const visual = DEPT_VISUAL[r.department_key] ?? { Icon: ConciergeBell, tint: "bg-muted text-muted-foreground" };
            const DeptIcon = visual.Icon;
            return (
              <div key={r.id} className={`min-w-0 overflow-hidden rounded-2xl border p-4 shadow-sm ${
                r.is_complaint || overdue
                  ? "border-rose-300/50 bg-rose-100/35 border-l-[3px] border-l-rose-500"
                  : statusCard(r.status)
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="flex w-full min-w-0 items-start justify-between gap-2 rounded-xl text-left transition-colors hover:bg-white/40 sm:gap-3"
                >
                  <div className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex ${visual.tint}`}>
                    <DeptIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Room {r.ts_rooms?.room_number ?? "—"}</span>
                      <Badge variant="secondary">{deptLabel(r.department_key)}</Badge>
                      {r.is_complaint && (
                        <Badge className="border border-rose-200 bg-rose-100 text-rose-800"><AlertTriangle className="mr-1 h-3 w-3" />Complaint</Badge>
                      )}
                      {r.priority === "urgent" && <Badge className="border border-rose-200 bg-rose-100 text-rose-800">Urgent</Badge>}
                      {overdue && <Badge className="border border-rose-200 bg-rose-100 text-rose-800">Overdue</Badge>}
                      {r.needs_triage && <Badge className="border border-amber-200 bg-amber-100 text-amber-900">Check routing</Badge>}
                      {escalation && (
                        <Badge className="border border-rose-200 bg-rose-100 text-rose-800"><MessageCircle className="mr-1 h-3 w-3" />Follow-up</Badge>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm">{r.summary_staff || r.summary}</p>
                    {r.summary_staff && r.summary_staff !== r.summary && (
                      <p className="mt-0.5 break-words text-xs text-muted-foreground italic">{r.summary}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeAgo(r.created_at)}{r.guest_language ? ` · ${r.guest_language}` : ""}
                      <span className="ml-2 font-medium text-teal-700">View details</span>
                    </p>
                    {acked && (
                      <p className="mt-1 text-xs text-emerald-700">✓ Accepted by {acked.by} · {timeAgo(acked.at)}</p>
                    )}
                    {escalation && (
                      <p className="mt-1 break-words text-xs text-rose-700">
                        ⚠ Guest followed up{escalation.note ? ` — "${escalation.note}"` : ""} · {timeAgo(escalation.at)}
                      </p>
                    )}
                  </div>
                  <span className={`max-w-[35%] shrink-0 truncate rounded-full px-2 py-1 text-xs sm:max-w-none sm:whitespace-nowrap ${statusBadge(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </button>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedId(r.id)}>
                    <MessageCircle className="mr-1 h-4 w-4" /> Open
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReplyOpen((p) => ({ ...p, [r.id]: !p[r.id] }))}>
                    <MessageCircle className="mr-1 h-4 w-4" /> Reply
                  </Button>
                  {overdue && r.priority !== "urgent" && (
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => escalate(r)}>Escalate</Button>
                  )}
                  {!TERMINAL.includes(r.status) && (
                    <Button size="sm" variant="ghost" onClick={() => advance(r, "cancelled")}>Cancel</Button>
                  )}
                  {!TERMINAL.includes(r.status) && r.status !== "on_the_way" && (
                    <Button size="sm" variant="outline" onClick={() => advance(r, "completed")}>Mark complete</Button>
                  )}
                  {next && <Button size="sm" onClick={() => advance(r, next.to)}>{next.label}</Button>}
                </div>
                {replyOpen[r.id] && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      autoFocus
                      value={replyText[r.id] ?? ""}
                      onChange={(e) => setReplyText((p) => ({ ...p, [r.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") sendReply(r); }}
                      placeholder="Message the guest — e.g. “No red wine tonight, but we have a lovely white.”"
                      className="h-9"
                    />
                    <Button size="sm" disabled={replyBusy[r.id] || !(replyText[r.id] ?? "").trim()} onClick={() => sendReply(r)}>
                      {replyBusy[r.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RequestDetailSheet
        requestId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => { if (!o) setSelectedId(null); }}
        onChanged={refresh}
      />
    </div>
  );
}
