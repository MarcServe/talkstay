import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, AlertTriangle, RefreshCw, MessageCircle, Send,
  UtensilsCrossed, BedDouble, Wrench, Wine, Shirt, ConciergeBell, KeyRound, ShieldAlert,
  ArrowDownRight, ArrowUpRight, Clock3, Phone,
} from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";
import type { OpsRequest, OpsTimeRange } from "@/talkstay/lib/data";
import { OPEN_STATUSES } from "@/talkstay/lib/data";
import {
  invalidateOps, useOpsQueue, useOpsRealtime,
} from "@/talkstay/hooks/useTalkStayQueries";
import RequestDetailSheet from "@/talkstay/components/RequestDetailSheet";
import ExportReportButton from "@/talkstay/components/ExportReportButton";
import LogOrderDialog from "@/talkstay/components/LogOrderDialog";
import { exportFilenameBase, type TalkStayExportPayload } from "@/talkstay/lib/exportReport";
import { statusBadge, statusCard, statusLabel } from "@/talkstay/lib/statusStyles";
import { useDemo } from "@/talkstay/demo/DemoContext";

function channelLabel(source?: string | null) {
  if (source === "phone") return "Phone";
  if (source === "walk_in") return "Walk-in";
  if (source === "front_desk") return "Front desk";
  if (source === "repeat") return "Ask again";
  if (source === "pulse") return "Stay feedback";
  return null; // guest_chat — default, no badge clutter
}

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
/** Drill from the BI cards into the queue below. */
type BoardFocus = "today" | "active" | "doneToday" | "acceptedToday" | null;

const FILTER_LABEL: Record<Filter, string> = {
  all: "All", new: "New", active: "Active", done: "Done", followup: "Follow-up",
};

const startOfTodayMs = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function OpsStat({
  label, value, sub, active, onClick, accent,
}: {
  label: string;
  value: string | number;
  sub?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border bg-card p-3 text-left shadow-sm transition-all sm:p-4 ${
        onClick
          ? "cursor-pointer hover:border-violet-400/70 hover:bg-white/60 hover:shadow-md active:scale-[0.99]"
          : "cursor-default"
      } ${active ? "border-violet-500 bg-violet-50/80 ring-2 ring-violet-500/20" : ""}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className={`mt-1 text-xs ${accent ?? "text-muted-foreground"}`}>{sub}</div>}
      <div className={`mt-2 text-[10px] font-medium uppercase tracking-wide ${
        active ? "text-violet-700" : "text-muted-foreground/80"
      }`}>
        {active ? "Showing below ↓" : "Click to explore"}
      </div>
    </button>
  );
}

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
  const demo = useDemo();
  const [filter, setFilter] = useState<Filter>("active");
  // Cap history so Done/All don't drown the board; open work always stays visible.
  const [timeRange, setTimeRange] = useState<TimeRange>("3d");
  // Department staff are hard-scoped to their own team's queue.
  const [dept, setDept] = useState<string>(lockedDepartment ?? "all");
  // BI card drill-down (today / active / completed today / accepted today).
  const [boardFocus, setBoardFocus] = useState<BoardFocus>(null);

  // Keep queue filter in sync when demo "View as" (or real staff lock) changes.
  useEffect(() => {
    setDept(lockedDepartment ?? "all");
    setBoardFocus(null);
  }, [lockedDepartment]);
  const queueRef = useRef<HTMLDivElement>(null);
  // Per-request "reply to guest" composer state.
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
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

  // New-request chimes + browser notifications live in StaffAlertsHost (app-wide)
  // so they still fire when the operator is on Insights / Staff / etc.

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

  const advance = async (r: Req, to: string, opts?: { cancelReason?: string }) => {
    let cancelReason = opts?.cancelReason?.trim() ?? "";
    if (to === "cancelled" && opts?.cancelReason === undefined) {
      // Optional — blank is fine; Cancel dismisses without changing anything.
      const typed = window.prompt("Optional: why are you cancelling this request?", "");
      if (typed === null) return;
      cancelReason = typed.trim().slice(0, 280);
    }
    if (demo) {
      demo.advance(r.id, to, cancelReason ? { cancelReason } : undefined);
      if (to === "completed") toast.success("Marked complete — guest can confirm in the Guest demo (same browser).");
      else if (to === "cancelled") toast.success("Cancelled — guest demo will update.");
      else toast.message("Status updated — guest demo stays in sync.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    // Optimistic lock — refuse if another staff/guest already moved the status.
    const { data: updated, error } = await supabase
      .from("ts_service_requests")
      .update({ status: to, assigned_staff_id: user?.id ?? null })
      .eq("id", r.id)
      .eq("status", r.status)
      .select("id")
      .maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!updated) {
      toast.message("That request just changed — refreshing the queue.");
      refresh();
      return;
    }
    // note = acting staff's "Name · Department" → powers the acknowledgement line.
    const label = await actorLabel(user?.id, user?.email);
    const eventNote = to === "cancelled" && cancelReason
      ? `${label} — ${cancelReason}`
      : label;
    await supabase.from("ts_request_events").insert({
      request_id: r.id, status: to, actor_type: "staff", actor_id: user?.id ?? null,
      note: eventNote,
    });
    // Close-loop: guest is notified via DB trigger; alert the rest of the team.
    if (to === "completed" || to === "cancelled") {
      supabase.functions.invoke("talkstay-notify", {
        body: {
          requestId: r.id,
          event: to,
          ...(to === "cancelled" && cancelReason ? { note: cancelReason } : {}),
        },
      }).then(() => {}, () => {});
    }
    refresh();
  };

  const escalate = async (r: Req) => {
    if (demo) {
      demo.escalate(r.id);
      toast.message("Escalated — marked urgent (demo).");
      return;
    }
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
    if (demo) {
      demo.reply(r.id, text);
      setReplyBusy((p) => ({ ...p, [r.id]: false }));
      setReplyText((p) => ({ ...p, [r.id]: "" }));
      setReplyOpen((p) => ({ ...p, [r.id]: false }));
      toast.success("Reply sent to the Guest demo (open /demo/guest in this browser).");
      return;
    }
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

  const inDept = (r: Req) => {
    const scope = lockedDepartment ?? dept;
    return scope === "all" || r.department_key === scope;
  };

  const inTime = (r: Req) => {
    const range = TIME_RANGES.find((t) => t.id === timeRange);
    if (!range?.ms) return true;
    if (OPEN_STATUSES.includes(r.status)) return true;
    return new Date(r.created_at).getTime() >= Date.now() - range.ms;
  };

  const matchesBoardFocus = (r: Req, focus: BoardFocus) => {
    if (!focus) return true;
    const todayStart = startOfTodayMs();
    const createdToday = new Date(r.created_at).getTime() >= todayStart;
    if (focus === "today") return createdToday;
    if (focus === "active") return matchesFilter(r, "active");
    if (focus === "doneToday") {
      return ["completed", "guest_confirmed"].includes(r.status) && createdToday;
    }
    if (focus === "acceptedToday") {
      return createdToday && !!ack[r.id];
    }
    return true;
  };

  const filtered = useMemo(
    () => reqs.filter((r) =>
      inDept(r) && inTime(r) && matchesFilter(r, filter) && matchesBoardFocus(r, boardFocus),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reqs, filter, dept, escalations, timeRange, boardFocus, ack]
  );

  const revealQueue = (note?: string) => {
    if (note) toast.message(note, { duration: 1800 });
    requestAnimationFrame(() => {
      queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const exploreBoard = (focus: BoardFocus, nextFilter: Filter, note: string) => {
    setBoardFocus(focus);
    setFilter(nextFilter);
    revealQueue(note);
  };

  const clearBoardFilters = (nextFilter: Filter = "active") => {
    setBoardFocus(null);
    setFilter(nextFilter);
    if (!lockedDepartment) setDept("all");
  };

  const exploreDept = (key: string) => {
    if (lockedDepartment) {
      // Department staff stay locked — still drill into today's work for their team.
      exploreBoard("today", "all", `${deptLabel(key)} · today`);
      return;
    }
    // Click the active team again to return to all departments.
    if (dept === key && boardFocus === "today") {
      clearBoardFilters("all");
      revealQueue("All departments");
      return;
    }
    setDept(key);
    setBoardFocus("today");
    setFilter("all");
    revealQueue(`${deptLabel(key)} · today`);
  };

  /** Full export scope: current department + time window (all statuses). */
  const exportScope = useMemo(
    () => reqs.filter((r) => inDept(r) && inTime(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reqs, dept, timeRange],
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

  const buildExportPayload = (): TalkStayExportPayload | null => {
    const range = TIME_RANGES.find((t) => t.id === timeRange);
    const deptName = dept === "all" ? "All departments" : deptLabel(dept);
    const open = exportScope.filter((r) =>
      (OPEN_STATUSES as readonly string[]).includes(r.status),
    );
    const done = exportScope.filter((r) =>
      ["completed", "guest_confirmed", "cancelled"].includes(r.status),
    );
    const urgent = exportScope.filter((r) => r.priority === "urgent" || r.is_complaint);
    const followups = exportScope.filter((r) => !!escalations[r.id]);
    return {
      propertyName: hotel.name,
      title: "Operations report",
      subtitle: `Department: ${deptName}`,
      rangeLabel: range?.short === "All"
        ? "All time (open always included)"
        : `Closed within ${range?.short ?? timeRange}; open always included`,
      filenameBase: exportFilenameBase(hotel.slug || hotel.name, "operations", timeRange),
      metrics: [
        { label: "Requests in export", value: exportScope.length },
        { label: "Open", value: open.length },
        { label: "Closed", value: done.length },
        { label: "Urgent / complaint", value: urgent.length },
        { label: "Guest follow-ups", value: followups.length },
        { label: "Avg time to accept (today)", value: bi.avgAcceptLabel },
        { label: "Total requests today", value: bi.totalToday },
        { label: "Completed today", value: bi.completedToday },
      ],
      tables: [
        {
          title: "Service requests",
          rows: exportScope.map((r) => ({
            Room: r.ts_rooms?.room_number ?? "—",
            Department: deptLabel(r.department_key),
            Request: r.summary_staff || r.summary,
            Status: statusLabel(r.status),
            Priority: r.priority,
            Complaint: r.is_complaint ? "yes" : "",
            Triage: r.needs_triage ? "yes" : "",
            Language: r.guest_language ?? "",
            Created: new Date(r.created_at).toLocaleString(),
            "Accepted by": ack[r.id]?.by ?? "",
            "Accepted at": ack[r.id] ? new Date(ack[r.id].at).toLocaleString() : "",
            "Follow-up": escalations[r.id]?.note ?? "",
          })),
        },
        {
          title: "Requests by department (today)",
          rows: bi.deptRows.map((d) => ({
            Department: d.label,
            Count: d.count,
            Share: `${Math.round((d.count / bi.deptTotal) * 100)}%`,
          })),
        },
      ],
    };
  };

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {/* BI strip — click a card to filter the queue below */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OpsStat
          label="Total requests today"
          value={bi.totalToday}
          active={boardFocus === "today" && filter === "all"}
          onClick={() => exploreBoard("today", "all", "Today's requests")}
          sub={(
            <span className="inline-flex min-w-0 items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              <span className="truncate">live queue scope</span>
            </span>
          )}
        />
        <OpsStat
          label="In progress"
          value={bi.inProgress}
          active={boardFocus === "active" || (boardFocus == null && filter === "active")}
          onClick={() => exploreBoard("active", "active", "Active queue")}
          accent="text-violet-600"
          sub="Active now"
        />
        <OpsStat
          label="Completed today"
          value={bi.completedToday}
          active={boardFocus === "doneToday"}
          onClick={() => exploreBoard("doneToday", "done", "Completed today")}
          accent="text-green-600"
          sub={(
            <span className="inline-flex min-w-0 items-center gap-1 text-green-600">
              <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">closed same day</span>
            </span>
          )}
        />
        <OpsStat
          label="Avg. time to accept"
          value={bi.avgAcceptLabel}
          active={boardFocus === "acceptedToday"}
          onClick={() => exploreBoard("acceptedToday", "all", "Accepted today · timing sample")}
          sub={(
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">request → staff accepted</span>
            </span>
          )}
        />
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        <div className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm lg:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium">Requests by department today</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {dept !== "all" && !lockedDepartment
                  ? `Showing ${deptLabel(dept)} — tap again or All teams to go back`
                  : "Click a team to open their queue"}
              </p>
            </div>
            {dept !== "all" && !lockedDepartment && (
              <button
                type="button"
                onClick={() => { clearBoardFilters("all"); revealQueue("All departments"); }}
                className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100"
              >
                ← All teams
              </button>
            )}
          </div>
          {bi.deptRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No requests yet today.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {bi.deptRows.slice(0, 6).map((d) => {
                const pct = Math.round((d.count / bi.deptTotal) * 100);
                const on = dept === d.key;
                return (
                  <li key={d.key} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => exploreDept(d.key)}
                      className={`w-full min-w-0 rounded-xl px-2 py-2 text-left transition-colors hover:bg-violet-50 ${
                        on ? "bg-violet-50 ring-1 ring-violet-300" : ""
                      }`}
                    >
                      <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate font-medium">{d.label}</span>
                        <span className="shrink-0 text-muted-foreground">{d.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full max-w-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-medium">Recent requests</h3>
            <button
              type="button"
              className="shrink-0 text-xs text-violet-600 hover:underline"
              onClick={() => exploreBoard(null, "all", "All requests")}
            >
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
            <button
              type="button"
              className="shrink-0 text-xs text-violet-600 hover:underline"
              onClick={() => exploreBoard("active", "active", "Active queue")}
            >
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
                    <p className="truncate text-sm font-medium">{formatRoomLabel(r.ts_rooms?.room_number)}</p>
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

      <div ref={queueRef} className="flex flex-wrap items-center justify-between gap-3 scroll-mt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "new", "active", "done", "followup"] as Filter[]).map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => { setBoardFocus(null); setFilter(f); }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  on ? "bg-violet-600 text-white" : "border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {FILTER_LABEL[f]}
                <span className={on ? "text-white/70" : "text-muted-foreground/70"}>{counts[f]}</span>
              </button>
            );
          })}
          {(boardFocus || (dept !== "all" && !lockedDepartment)) && (
            <button
              type="button"
              onClick={() => { clearBoardFilters("active"); revealQueue("Full queue"); }}
              className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
            >
              ← Clear filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-background p-0.5" title="How far back to show closed requests">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setTimeRange(r.id); setBoardFocus(null); }}
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
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              value={dept}
              onChange={(e) => { setDept(e.target.value); setBoardFocus(null); }}
            >
              <option value="all">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.display_name}</option>)}
            </select>
          )}
          {!demo && (
            <Button size="sm" onClick={() => setLogOpen(true)} title="Log a phone or walk-in order">
              <Phone className="mr-1.5 h-3.5 w-3.5" /> Log order
            </Button>
          )}
          <ExportReportButton
            buildPayload={buildExportPayload}
            disabled={loading || !exportScope.length}
            label="Export"
          />
          <Button size="sm" variant="ghost" onClick={refresh} disabled={isFetching} title="Refresh queue">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {logOpen && (
        <LogOrderDialog
          hotel={hotel}
          lockedDepartment={lockedDepartment}
          onClose={() => setLogOpen(false)}
          onCreated={() => refresh()}
        />
      )}

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
                      <span className="font-semibold">{formatRoomLabel(r.ts_rooms?.room_number)}</span>
                      <Badge variant="secondary">{deptLabel(r.department_key)}</Badge>
                      {channelLabel(r.source) && (
                        <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                          <Phone className="mr-1 h-3 w-3" />{channelLabel(r.source)}
                        </Badge>
                      )}
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
                  </div>
                  <span className={`max-w-[35%] shrink-0 truncate rounded-full px-2 py-1 text-xs sm:max-w-none sm:whitespace-nowrap ${statusBadge(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </button>
                {escalation && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("followup");
                      setBoardFocus(null);
                      setSelectedId(r.id);
                    }}
                    className="mt-2 block w-full break-words rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-left text-xs font-medium text-rose-800 transition-colors hover:bg-rose-100"
                  >
                    ⚠ Guest followed up{escalation.note ? ` — "${escalation.note}"` : ""} · {timeAgo(escalation.at)}
                    <span className="ml-1 font-semibold text-rose-700">· Open to respond</span>
                  </button>
                )}
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
