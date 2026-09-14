import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, AlertTriangle, RefreshCw, MessageCircle, Send, Search,
  UtensilsCrossed, BedDouble, Wrench, Wine, Shirt, ConciergeBell, KeyRound, ShieldAlert,
  ArrowDownRight, ArrowUpRight, Clock3, Phone, Bot, SlidersHorizontal, MoreHorizontal, X,
  FileSpreadsheet, FileText, ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";
import { formatRoomLabel, guestStayLabel } from "@/talkstay/lib/roomLabel";
import type { OpsRequest, OpsTimeRange } from "@/talkstay/lib/data";
import { OPEN_STATUSES } from "@/talkstay/lib/data";
import {
  invalidateOps, useOpsQueue, useOpsRealtime,
} from "@/talkstay/hooks/useTalkStayQueries";
import { useHotelDepartments } from "@/talkstay/hooks/useHotelDepartments";
import RequestDetailSheet from "@/talkstay/components/RequestDetailSheet";
import { useReportExport } from "@/talkstay/components/ExportReportButton";
import LogOrderDialog from "@/talkstay/components/LogOrderDialog";
import { exportFilenameBase, type TalkStayExportPayload } from "@/talkstay/lib/exportReport";
import { statusBadge, statusCard, statusLabel, formatMoney, PAYMENT_STYLE, paymentLabel } from "@/talkstay/lib/statusStyles";
import { useDemo } from "@/talkstay/demo/DemoContext";
import GuestAccessTip from "@/talkstay/components/GuestAccessTip";

function channelLabel(source?: string | null) {
  if (source === "phone") return "Phone";
  if (source === "walk_in") return "Walk-in";
  if (source === "front_desk") return "Front desk";
  if (source === "repeat") return "Ask again";
  if (source === "pulse") return "Stay feedback";
  return null; // guest_chat / guest_app / null — guest badge below
}

const STAFF_LOG_SOURCES = new Set(["phone", "walk_in", "front_desk"]);

/** Staff-logged phone / walk-in / front-desk orders. */
function isStaffLogged(source?: string | null) {
  return !!source && STAFF_LOG_SOURCES.has(source);
}

/** Guest room-assistant / chat / pulse / follow-up (everything that isn’t a staff log). */
function isGuestOrigin(source?: string | null) {
  return !isStaffLogged(source);
}

type OriginFilter = "all" | "guest" | "logged";
type LocationFilter = "all" | "rooms" | "public";
type PaymentFilter = "all" | "unpaid" | "paid" | "waived" | "charge_to_room" | "pay_at_counter";

const ORIGIN_LABEL: Record<OriginFilter, string> = {
  all: "All origins",
  guest: "Guest assistant",
  logged: "Staff logged",
};

const LOCATION_LABEL: Record<LocationFilter, string> = {
  all: "All locations",
  rooms: "Rooms",
  public: "Public areas",
};

const PAYMENT_FILTER_LABEL: Record<PaymentFilter, string> = {
  all: "All payments",
  unpaid: "Unpaid",
  paid: "Paid",
  waived: "Waived",
  charge_to_room: "Charge to room",
  pay_at_counter: "Pay at counter",
};

type Req = OpsRequest;

// Each department gets a distinct icon + soft tint, so staff can scan the
// queue by shape/colour instead of reading every card's department label.
const DEPT_VISUAL: Record<string, { Icon: typeof Wrench; tint: string }> = {
  housekeeping: { Icon: BedDouble, tint: "bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300" },
  laundry: { Icon: Shirt, tint: "bg-cyan-100 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-300" },
  kitchen: { Icon: UtensilsCrossed, tint: "bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300" },
  bar: { Icon: Wine, tint: "bg-rose-100 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300" },
  maintenance: { Icon: Wrench, tint: "bg-slate-100 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300" },
  concierge: { Icon: ConciergeBell, tint: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300" },
  front_desk: { Icon: KeyRound, tint: "bg-indigo-100 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300" },
  duty_manager: { Icon: ShieldAlert, tint: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300" },
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

const FILTER_GROUP_LABEL =
  "mb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

const optionClass = (on: boolean) =>
  `rounded-md px-2 py-1 text-xs font-medium transition-colors ${
    on ? "bg-violet-600 text-white" : "border bg-background text-muted-foreground hover:bg-muted"
  }`;

/** A filter narrowing the queue, shown as a dismissible chip under the bar. */
type ActiveFilter = { key: string; label: string; clear: () => void };

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
          ? "cursor-pointer hover:border-violet-400/70 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-md active:scale-[0.99]"
          : "cursor-default"
      } ${active ? "border-violet-500 bg-violet-50/80 dark:bg-violet-400/15 ring-2 ring-violet-500/20" : ""}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className={`mt-1 text-xs ${accent ?? "text-muted-foreground"}`}>{sub}</div>}
      <div className={`mt-2 text-[10px] font-medium uppercase tracking-wide ${
        active ? "text-violet-700 dark:text-violet-200" : "text-muted-foreground/80"
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

/** Who settles this ticket — the key a running tab is grouped under. */
function tabKeyFor(r: {
  billing_room_id?: string | null;
  room_id?: string | null;
  session_id?: string | null;
  ts_rooms?: { is_public?: boolean | null } | null;
}): string | null {
  if (r.billing_room_id) return `room:${r.billing_room_id}`;
  if (!r.ts_rooms?.is_public && r.room_id) return `room:${r.room_id}`;
  return r.session_id ? `sess:${r.session_id}` : null;
}

export default function OperationsPanel({ hotel, lockedDepartment = null, onClearDepartmentLock, focusRequestId = null }: {
  hotel: Hotel;
  lockedDepartment?: string | null;
  /** Demo-only: leave a staff "View as" lock and return to all departments. */
  onClearDepartmentLock?: () => void;
  /** Open this ticket when set (e.g. jumped from Log order). */
  focusRequestId?: string | null;
}) {
  const qc = useQueryClient();
  const demo = useDemo();
  const { departments: hotelDepts, deptLabel } = useHotelDepartments(hotel.id);
  const [filter, setFilter] = useState<Filter>("active");
  // Cap history so Done/All don't drown the board; open work always stays visible.
  const [timeRange, setTimeRange] = useState<TimeRange>("3d");
  // Department staff are hard-scoped to their own team's queue.
  const [dept, setDept] = useState<string>(lockedDepartment ?? "all");
  // BI card drill-down (today / active / completed today / accepted today).
  const [boardFocus, setBoardFocus] = useState<BoardFocus>(null);
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(() => {
    try {
      return localStorage.getItem("talkstay.ops.summaryOpen") !== "0";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("talkstay.ops.summaryOpen", summaryOpen ? "1" : "0");
    } catch {
      // Private browsing — the preference just won't survive a reload.
    }
  }, [summaryOpen]);
  const { busy: exportBusy, run: runExport } = useReportExport(() => buildExportPayload());

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
  const [roomQuery, setRoomQuery] = useState("");
  const { data: queue, isPending, isFetching, isError, error } = useOpsQueue(hotel.id, timeRange);
  useOpsRealtime(hotel.id);

  useEffect(() => {
    if (!focusRequestId) return;
    setSelectedId(focusRequestId);
    setFilter("all");
    setBoardFocus(null);
  }, [focusRequestId]);

  const reqs = queue?.requests ?? [];

  // Running tab per payer, so staff see one number instead of adding line items
  // in their head at the counter. Built from the FULL queue, never the filtered
  // view — a total that changes when you flip a filter is worse than none.
  //
  // Grouped by who actually settles it: a verified charge-to-room or a private
  // room bills to the room (that IS the hotel folio, even across guests in it);
  // a public-area session pays for itself.
  const tabs = useMemo(() => {
    const map = new Map<string, { total: number; count: number; currency: string | null; roomNumber: string | null }>();
    for (const r of reqs) {
      if (!r.is_chargeable) continue;
      if ((r.payment_status ?? "unpaid") !== "unpaid") continue;
      if (r.status === "cancelled") continue;
      const price = typeof r.price === "number" ? r.price : 0;
      const key = tabKeyFor(r);
      if (!key) continue;
      const cur = map.get(key) ?? { total: 0, count: 0, currency: r.currency ?? null, roomNumber: null };
      cur.total += price;
      cur.count += 1;
      cur.currency = cur.currency ?? r.currency ?? null;
      cur.roomNumber = cur.roomNumber
        ?? r.billing_room_number
        ?? (r.ts_rooms?.is_public ? null : r.ts_rooms?.room_number ?? null);
      map.set(key, cur);
    }
    return map;
  }, [reqs]);

  const ack = queue?.ack ?? {};
  const escalations = queue?.escalations ?? {};
  const handlers = queue?.handlers ?? {};
  const notes = queue?.notes ?? {};
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
    if ((OPEN_STATUSES as readonly string[]).includes(r.status)) return true;
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

  const roomQ = roomQuery.trim().toLowerCase();

  const matchesRoomSearch = (r: Req) => {
    if (!roomQ) return true;
    const num = (r.ts_rooms?.room_number ?? "").toLowerCase();
    const label = formatRoomLabel(r.ts_rooms?.room_number).toLowerCase();
    const guest = (r.guest_first_name ?? "").toLowerCase();
    const summary = `${r.summary ?? ""} ${r.summary_staff ?? ""}`.toLowerCase();
    return num.includes(roomQ) || label.includes(roomQ) || guest.includes(roomQ) || summary.includes(roomQ);
  };

  const matchesOrigin = (r: Req, o: OriginFilter) => {
    if (o === "all") return true;
    if (o === "logged") return isStaffLogged(r.source);
    return isGuestOrigin(r.source);
  };

  const matchesLocation = (r: Req, loc: LocationFilter) => {
    if (loc === "all") return true;
    const isPublic = !!r.ts_rooms?.is_public;
    if (loc === "public") return isPublic;
    return !isPublic;
  };

  const matchesPayment = (r: Req, pay: PaymentFilter) => {
    if (pay === "all") return true;
    if (!r.is_chargeable) return false;
    const status = r.payment_status ?? "unpaid";
    const isPublic = !!r.ts_rooms?.is_public;
    if (pay === "unpaid") return status === "unpaid";
    if (pay === "paid") return status === "paid";
    if (pay === "waived") return status === "waived";
    if (pay === "charge_to_room") {
      return status === "unpaid" && (!isPublic || !!r.billing_room_id || r.payment_timing === "charge_to_room");
    }
    if (pay === "pay_at_counter") {
      return status === "unpaid" && isPublic && !r.billing_room_id && r.payment_timing !== "charge_to_room";
    }
    return true;
  };

  const filtered = useMemo(
    () => reqs.filter((r) =>
      inDept(r)
      && inTime(r)
      && matchesFilter(r, filter)
      && matchesBoardFocus(r, boardFocus)
      && matchesOrigin(r, origin)
      && matchesLocation(r, locationFilter)
      && matchesPayment(r, paymentFilter)
      && matchesRoomSearch(r),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reqs, filter, dept, escalations, timeRange, boardFocus, ack, roomQuery, origin, locationFilter, paymentFilter]
  );

  /** Room lookup ignores status pills so staff can find any open/closed ticket fast. */
  const roomHits = useMemo(() => {
    if (!roomQ) return [] as typeof reqs;
    return reqs
      .filter((r) => inDept(r) && inTime(r) && matchesRoomSearch(r))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqs, dept, timeRange, roomQuery, lockedDepartment]);

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
    setOrigin("all");
    setLocationFilter("all");
    setPaymentFilter("all");
    if (!lockedDepartment) setDept("all");
  };

  // Status lives on the bar and speaks for itself; these are the ones now
  // behind the Filters button, so each has to announce itself out here.
  const activeFilters: ActiveFilter[] = [
    ...(timeRange !== "3d"
      ? [{
          key: "time",
          label: timeRange === "all" ? "Any age" : `Last ${TIME_RANGES.find((t) => t.id === timeRange)?.short}`,
          clear: () => { setTimeRange("3d"); setBoardFocus(null); },
        }]
      : []),
    ...(origin !== "all"
      ? [{ key: "origin", label: ORIGIN_LABEL[origin], clear: () => { setOrigin("all"); setBoardFocus(null); } }]
      : []),
    ...(locationFilter !== "all"
      ? [{ key: "location", label: LOCATION_LABEL[locationFilter], clear: () => { setLocationFilter("all"); setBoardFocus(null); } }]
      : []),
    ...(paymentFilter !== "all"
      ? [{ key: "payment", label: PAYMENT_FILTER_LABEL[paymentFilter], clear: () => { setPaymentFilter("all"); setBoardFocus(null); } }]
      : []),
    ...(dept !== "all" && !lockedDepartment
      ? [{ key: "dept", label: deptLabel(dept), clear: () => { setDept("all"); setBoardFocus(null); } }]
      : []),
  ];

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
    const scoped = reqs.filter((r) => inDept(r) && inTime(r) && matchesOrigin(r, origin));
    return {
      all: scoped.length,
      new: scoped.filter((r) => matchesFilter(r, "new")).length,
      active: scoped.filter((r) => matchesFilter(r, "active")).length,
      done: scoped.filter((r) => matchesFilter(r, "done")).length,
      followup: scoped.filter((r) => matchesFilter(r, "followup")).length,
    } as Record<Filter, number>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqs, dept, escalations, timeRange, origin]);

  const originCounts = useMemo(() => {
    const scoped = reqs.filter((r) => inDept(r) && inTime(r) && matchesFilter(r, filter) && matchesBoardFocus(r, boardFocus));
    return {
      all: scoped.length,
      guest: scoped.filter((r) => isGuestOrigin(r.source)).length,
      logged: scoped.filter((r) => isStaffLogged(r.source)).length,
    } as Record<OriginFilter, number>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqs, dept, filter, boardFocus, escalations, timeRange, ack]);

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
      // "Recent" and "Live" were two widgets over the same rows — the open
      // ones showed up in both. One list: everything still open, then the
      // most recent closed rows to fill, so nothing that was visible is lost.
      queue: (() => {
        const openIds = new Set(active.map((r) => r.id));
        return [...active, ...scoped.filter((r) => !openIds.has(r.id))].slice(0, 6);
      })(),
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
            Channel: isStaffLogged(r.source)
              ? (channelLabel(r.source) ?? "Staff logged")
              : (channelLabel(r.source) ?? "Guest app"),
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
      <GuestAccessTip compact dismissKey="ops-guest-access" />

          {roomQ && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                {roomHits.length === 0
                  ? `No tickets match “${roomQuery.trim()}”`
                  : `${roomHits.length} ticket${roomHits.length === 1 ? "" : "s"} for “${roomQuery.trim()}”`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {roomHits.length === 0
                  ? "If this came in by phone or walk-in and isn’t on the board yet, log it below."
                  : "Open a ticket to see status, who’s handling it, and the guest thread — don’t log a duplicate."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setRoomQuery("")}>Clear search</Button>
              {roomHits.length === 0 && (
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => setLogOpen(true)}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Log order
                </Button>
              )}
            </div>
          </div>
          {(() => {
            const unpaid = roomHits.filter((r) => r.is_chargeable && (r.payment_status ?? "unpaid") === "unpaid");
            if (!unpaid.length) return null;
            const priced = unpaid.filter((r) => typeof r.price === "number" && r.price > 0);
            const total = priced.reduce((sum, r) => sum + Number(r.price), 0);
            const currency = unpaid.find((r) => r.currency)?.currency ?? "GBP";
            return (
              <div className="mt-3 rounded-xl border border-amber-300 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/15 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-200">
                <p className="font-semibold">
                  {unpaid.length} unpaid chargeable item{unpaid.length === 1 ? "" : "s"}
                  {priced.length
                    ? ` · ${formatMoney(total, currency)}`
                    : " · add amounts on each ticket"}
                </p>
                <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-200">
                  Collect before checkout. Open a ticket to mark paid or waive.
                </p>
              </div>
            );
          })()}
          {roomHits.length > 0 && (
            <ul className="mt-3 divide-y rounded-xl border">
              {roomHits.slice(0, 12).map((r) => {
                const acked = ack[r.id];
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{guestStayLabel(r.guest_first_name, r.ts_rooms?.room_number, { locator: r.guest_locator })}</span>
                          <Badge variant="outline" className={`capitalize ${statusBadge(r.status)}`}>
                            {statusLabel(r.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{deptLabel(r.department_key)}</span>
                          {isStaffLogged(r.source) ? (
                            <Badge variant="outline" className="border-sky-200 dark:border-sky-400/30 bg-sky-50 dark:bg-sky-400/15 text-sky-800 dark:text-sky-200">
                              <Phone className="mr-1 h-3 w-3" />{channelLabel(r.source) ?? "Staff logged"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/15 text-emerald-800 dark:text-emerald-200">
                              <Bot className="mr-1 h-3 w-3" />
                              {channelLabel(r.source) ?? "Guest app"}
                            </Badge>
                          )}
                          {r.is_chargeable && (
                            <Badge className={PAYMENT_STYLE[r.payment_status ?? "unpaid"] ?? PAYMENT_STYLE.unpaid}>
                              {paymentLabel(r.payment_status ?? "unpaid")}
                              {r.price != null ? ` · ${formatMoney(r.price, r.currency)}` : ""}
                            </Badge>
                          )}
                          {(() => {
                            // Only worth showing once there is arithmetic to do.
                            const tab = tabs.get(tabKeyFor(r) ?? "");
                            if (!tab || tab.count < 2) return null;
                            return (
                              <Badge
                                variant="outline"
                                className="border-amber-300 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/15 text-amber-900 dark:text-amber-200"
                                title={`${tab.count} unpaid items on this tab`}
                              >
                                {tab.roomNumber ? `Room ${tab.roomNumber} tab` : "Tab"}
                                {` · ${formatMoney(tab.total, tab.currency)} · ${tab.count} items`}
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.summary_staff || r.summary}
                          {acked?.by ? ` · Accepted by ${acked.by}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-violet-700 dark:text-violet-200">Open</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Today's numbers are worth a look at the start of a shift, not on every
          load — the queue is what people came for, so this folds away and
          remembers that it was folded. */}
      <button
        type="button"
        onClick={() => setSummaryOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={summaryOpen}
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${summaryOpen ? "rotate-90" : ""}`} />
        Today
        {!summaryOpen && (
          <span className="font-normal normal-case tracking-normal text-muted-foreground/80">
            · {bi.totalToday} in · {bi.inProgress} active · {bi.completedToday} done · {bi.avgAcceptLabel} to accept
          </span>
        )}
      </button>

      {summaryOpen && (
      <>
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

      <div className="grid min-w-0 gap-3">
        <div className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium">Requests by department today</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {lockedDepartment && onClearDepartmentLock
                  ? `Viewing as ${deptLabel(lockedDepartment)} staff — back to all teams anytime`
                  : dept !== "all" && !lockedDepartment
                    ? `Showing ${deptLabel(dept)} — tap again or All teams to go back`
                    : "Click a team to open their queue"}
              </p>
            </div>
            {((dept !== "all" && !lockedDepartment) || (!!lockedDepartment && !!onClearDepartmentLock)) && (
              <button
                type="button"
                onClick={() => {
                  if (lockedDepartment && onClearDepartmentLock) {
                    onClearDepartmentLock();
                    return;
                  }
                  clearBoardFilters("all");
                  revealQueue("All departments");
                }}
                className="shrink-0 rounded-lg border border-violet-200 dark:border-violet-400/30 bg-violet-50 dark:bg-violet-400/15 px-2 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-400/25"
              >
                ← All departments
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
                      className={`w-full min-w-0 rounded-xl px-2 py-2 text-left transition-colors hover:bg-violet-50 dark:hover:bg-violet-400/25 ${
                        on ? "bg-violet-50 dark:bg-violet-400/15 ring-1 ring-violet-300 dark:ring-violet-400/40" : ""
                      }`}
                    >
                      <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate font-medium">{d.label}</span>
                        <span className="shrink-0 text-muted-foreground">{d.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full max-w-full rounded-full bg-violet-500 dark:bg-violet-400" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      </>
      )}

      <div ref={queueRef} className="scroll-mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[7rem] flex-1 sm:max-w-[13rem]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={roomQuery}
                onChange={(e) => {
                  setRoomQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setBoardFocus(null);
                    setFilter("all");
                  }
                }}
                placeholder="Search a room…"
                className="h-9 pl-8"
                aria-label="Search tickets by room"
              />
            </div>
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={activeFilters.length ? "border-violet-300 dark:border-violet-400/30 text-violet-800 dark:border-violet-500/60 dark:text-violet-200" : ""}
                >
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  Filters
                  {activeFilters.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-violet-600 px-1.5 text-[10px] font-semibold text-white">
                      {activeFilters.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[19rem] space-y-3.5 p-3.5">
                <div>
                  <p className={FILTER_GROUP_LABEL}>Closed requests from</p>
                  <div className="flex flex-wrap gap-1">
                    {TIME_RANGES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setTimeRange(r.id); setBoardFocus(null); }}
                        className={optionClass(timeRange === r.id)}
                      >
                        {r.short}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Open tickets always show, however old.
                  </p>
                </div>

                <div>
                  <p className={FILTER_GROUP_LABEL}>Raised by</p>
                  <div className="flex flex-wrap gap-1">
                    {(["all", "guest", "logged"] as OriginFilter[]).map((o) => {
                      const on = origin === o;
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => { setOrigin(o); setBoardFocus(null); }}
                          className={`${optionClass(on)} inline-flex items-center gap-1`}
                        >
                          {o === "guest" && <Bot className="h-3 w-3" />}
                          {o === "logged" && <Phone className="h-3 w-3" />}
                          {o === "all" ? "Anyone" : ORIGIN_LABEL[o]}
                          <span className={on ? "text-white/70" : "text-muted-foreground/70"}>{originCounts[o]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className={FILTER_GROUP_LABEL}>Location</p>
                  <div className="flex flex-wrap gap-1">
                    {(["all", "rooms", "public"] as LocationFilter[]).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => { setLocationFilter(loc); setBoardFocus(null); }}
                        className={optionClass(locationFilter === loc)}
                      >
                        {loc === "all" ? "Anywhere" : LOCATION_LABEL[loc]}
                      </button>
                    ))}
                  </div>
                </div>

                {!lockedDepartment && (
                  <div>
                    <p className={FILTER_GROUP_LABEL}>Department</p>
                    <select
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      value={dept}
                      onChange={(e) => { setDept(e.target.value); setBoardFocus(null); }}
                      aria-label="Filter by department"
                    >
                      <option value="all">All departments</option>
                      {hotelDepts.map((d) => <option key={d.key} value={d.key}>{d.display_name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <p className={FILTER_GROUP_LABEL}>Payment</p>
                  <select
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                    value={paymentFilter}
                    aria-label="Filter by payment settlement"
                    onChange={(e) => {
                      setPaymentFilter(e.target.value as PaymentFilter);
                      setBoardFocus(null);
                    }}
                  >
                    {(Object.keys(PAYMENT_FILTER_LABEL) as PaymentFilter[]).map((p) => (
                      <option key={p} value={p}>{PAYMENT_FILTER_LABEL[p]}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <button
                    type="button"
                    disabled={!activeFilters.length}
                    onClick={() => { clearBoardFilters(filter); setTimeRange("3d"); }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Clear all
                  </button>
                  <Button size="sm" onClick={() => setFiltersOpen(false)}>Done</Button>
                </div>
              </PopoverContent>
            </Popover>

            {lockedDepartment && (
              onClearDepartmentLock ? (
                <button
                  type="button"
                  onClick={onClearDepartmentLock}
                  className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 dark:border-violet-400/30 bg-violet-50 dark:bg-violet-400/15 px-2 py-1 text-sm font-medium text-violet-800 hover:bg-violet-100 dark:hover:bg-violet-400/25 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25"
                  title="Return to owner view — all departments"
                >
                  {deptLabel(lockedDepartment)}
                  <span className="text-[11px] font-normal text-violet-600 dark:text-violet-300">· All departments</span>
                </button>
              ) : (
                <Badge variant="secondary" className="px-2 py-1">{deptLabel(lockedDepartment)}</Badge>
              )
            )}

            <Button
              size="sm"
              variant="outline"
              className="border-violet-300 dark:border-violet-400/30 text-violet-800 hover:bg-violet-50 dark:hover:bg-violet-400/25 dark:border-violet-500/60 dark:text-violet-200 dark:hover:bg-violet-500/15"
              onClick={() => setLogOpen(true)}
              title="Only for phone, walk-in, or front-desk — search the room above first"
            >
              <Phone className="mr-1.5 h-3.5 w-3.5" /> Log phone / walk-in
            </Button>

            {/* Export and Refresh were sitting in a row of filters looking like
                filters — neither one narrows the queue. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" title="More actions" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export full report</DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={exportBusy || loading || !exportScope.length}
                  onClick={() => void runExport("csv")}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportBusy || loading || !exportScope.length}
                  onClick={() => void runExport("pdf")}
                >
                  <FileText className="mr-2 h-4 w-4 text-rose-600" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isFetching} onClick={refresh}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh queue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Every narrowing filter names itself and carries its own dismiss, so
            what is hiding rows is visible without opening the popover. */}
        {(activeFilters.length > 0 || boardFocus || (!!lockedDepartment && !!onClearDepartmentLock)) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.clear}
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-400/15 px-2.5 py-1 text-xs font-medium text-violet-800 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-400/25 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30"
                title={`Remove ${f.label} filter`}
              >
                {f.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (lockedDepartment && onClearDepartmentLock) {
                  onClearDepartmentLock();
                  return;
                }
                clearBoardFilters("active");
                setTimeRange("3d");
                revealQueue("Full queue");
              }}
              className="px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {lockedDepartment && onClearDepartmentLock ? "← All departments" : "Clear all"}
            </button>
          </div>
        )}
      </div>

      {logOpen && (
        <LogOrderDialog
          hotel={hotel}
          lockedDepartment={lockedDepartment}
          onClose={() => setLogOpen(false)}
          onCreated={() => refresh()}
          onOpenRequest={(id) => setSelectedId(id)}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading queue…</div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {roomQ
            ? "No matching tickets in the filtered queue — see room results above, or clear search."
            : origin !== "all"
              ? `No ${ORIGIN_LABEL[origin].toLowerCase()} tickets here — try All origins or another department.`
              : "Nothing here right now."}
        </p>
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
                  ? "border-rose-300/50 dark:border-rose-400/30 bg-rose-100/35 dark:bg-rose-400/15 border-l-[3px] border-l-rose-500 dark:border-l-rose-400"
                  : statusCard(r.status)
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="flex w-full min-w-0 items-start justify-between gap-2 rounded-xl text-left transition-colors hover:bg-white/40 dark:hover:bg-white/10 sm:gap-3"
                >
                  <div className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex ${visual.tint}`}>
                    <DeptIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{guestStayLabel(r.guest_first_name, r.ts_rooms?.room_number, { locator: r.guest_locator })}</span>
                      {r.ts_rooms?.is_public ? (
                        <Badge variant="outline" className="border-sky-300 dark:border-sky-400/30 bg-sky-50 dark:bg-sky-400/15 text-sky-800 dark:text-sky-200">Public</Badge>
                      ) : null}
                      {r.billing_room_number ? (
                        <Badge variant="outline" className="border-amber-300 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/15 text-amber-950 dark:text-amber-200">
                          Bill → {formatRoomLabel(r.billing_room_number)}
                        </Badge>
                      ) : null}
                      <Badge variant="secondary">{deptLabel(r.department_key)}</Badge>
                      {isStaffLogged(r.source) ? (
                        <Badge variant="outline" className="border-sky-200 dark:border-sky-400/30 bg-sky-50 dark:bg-sky-400/15 text-sky-800 dark:text-sky-200">
                          <Phone className="mr-1 h-3 w-3" />{channelLabel(r.source) ?? "Staff logged"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/15 text-emerald-800 dark:text-emerald-200">
                          <Bot className="mr-1 h-3 w-3" />
                          {channelLabel(r.source) ?? "Guest app"}
                        </Badge>
                      )}
                      {r.is_complaint && (
                        <Badge className="border border-rose-200 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-400/15 text-rose-800 dark:text-rose-200"><AlertTriangle className="mr-1 h-3 w-3" />Complaint</Badge>
                      )}
                      {r.priority === "urgent" && <Badge className="border border-rose-200 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-400/15 text-rose-800 dark:text-rose-200">Urgent</Badge>}
                      {overdue && <Badge className="border border-rose-200 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-400/15 text-rose-800 dark:text-rose-200">Overdue</Badge>}
                      {r.needs_triage && <Badge className="border border-amber-200 dark:border-amber-400/30 bg-amber-100 dark:bg-amber-400/15 text-amber-900 dark:text-amber-200">Check routing</Badge>}
                      {escalation && (
                        <Badge className={`border ${
                          escalation.kind === "update"
                            ? "border-amber-200 dark:border-amber-400/30 bg-amber-100 dark:bg-amber-400/15 text-amber-950 dark:text-amber-200"
                            : escalation.kind === "cancel"
                              ? "border-slate-300 dark:border-slate-400/30 bg-slate-100 dark:bg-slate-400/15 text-slate-800 dark:text-slate-200"
                              : escalation.kind === "payment"
                                ? "border-amber-300 dark:border-amber-400/30 bg-amber-100 dark:bg-amber-400/15 text-amber-950 dark:text-amber-200"
                                : "border-rose-200 dark:border-rose-400/30 bg-rose-100 dark:bg-rose-400/15 text-rose-800 dark:text-rose-200"
                        }`}
                        >
                          <MessageCircle className="mr-1 h-3 w-3" />
                          {escalation.kind === "update"
                            ? "Guest updated"
                            : escalation.kind === "remind"
                              ? "Guest reminded"
                              : escalation.kind === "cancel"
                                ? "Guest cancelled"
                                : escalation.kind === "payment"
                                  ? "Pay now"
                                  : "Follow-up"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm">{r.summary_staff || r.summary}</p>
                    {r.summary_staff && r.summary_staff !== r.summary && (
                      <p className="mt-0.5 break-words text-xs text-muted-foreground italic">{r.summary}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeAgo(r.created_at)}{r.guest_language ? ` · ${r.guest_language}` : ""}
                      <span className="ml-2 font-medium text-teal-700 dark:text-teal-200">View details</span>
                    </p>
                    {acked && (
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-200">✓ Accepted by {acked.by} · {timeAgo(acked.at)}</p>
                    )}
                    {handlers[r.id] && (
                      <p className="mt-1 text-xs text-teal-800 dark:text-teal-200">Handling · {handlers[r.id].by}</p>
                    )}
                    {notes[r.id]?.note && (
                      <p className="mt-1 line-clamp-2 text-xs text-violet-800 dark:text-violet-200">Note · {notes[r.id].note}</p>
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
                    className={`mt-2 block w-full break-words rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      escalation.kind === "update"
                        ? "border-amber-300 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/15 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-400/25"
                        : escalation.kind === "cancel"
                          ? "border-slate-300 dark:border-slate-400/30 bg-slate-50 dark:bg-slate-400/15 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-400/25"
                          : escalation.kind === "payment"
                            ? "border-amber-400 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/15 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-400/25"
                            : "border-rose-200 dark:border-rose-400/30 bg-rose-50/80 dark:bg-rose-400/15 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-400/25"
                    }`}
                  >
                    {escalation.kind === "update"
                      ? "✏️ Guest updated their order"
                      : escalation.kind === "remind"
                        ? "⏰ Guest reminded you — still waiting"
                        : escalation.kind === "cancel"
                          ? "✕ Guest cancelled this order"
                          : escalation.kind === "payment"
                            ? "💷 Guest wants to pay now — collect in the room"
                            : "⚠ Guest followed up"}
                    {escalation.note ? ` — "${escalation.note}"` : ""}
                    {" · "}
                    {timeAgo(escalation.at)}
                    <span className="ml-1 font-semibold opacity-90">· Open to respond</span>
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
