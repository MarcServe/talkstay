import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, MessageSquare, Users, HelpCircle, ClipboardList, CheckCircle2, Star, Timer,
  Heart, TrendingDown, TrendingUp, Minus, BellRing,
} from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";

interface Interaction { session_id: string | null; role: string; content: string | null; intent: string | null; language: string | null; created_at: string; }
interface Req { id: string; room_id: string | null; department_key: string; summary: string; status: string; is_complaint: boolean; classification_method: string | null; created_at: string; updated_at: string; ts_rooms?: { room_number: string } | null; }
interface Ev { request_id: string; status: string; note: string | null; created_at: string; }
interface Pulse {
  id: string; body: string; rating: number | null; sentiment: string; severity: string;
  department_key: string | null; issue_key: string; issue_label: string | null;
  request_id: string | null; acknowledged_at: string | null; created_at: string;
  ts_rooms?: { room_number: string } | null;
}

const DAY_MS = 86_400_000;
const PERIOD_DAYS = 30;

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-green-500/15 text-green-600",
  neutral: "bg-muted text-muted-foreground",
  negative: "bg-red-500/15 text-red-600",
};
const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-red-500/15 text-red-600", medium: "bg-amber-500/15 text-amber-600", low: "bg-muted text-muted-foreground",
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

const INTENT_STYLE: Record<string, string> = {
  question: "bg-blue-500/15 text-blue-600", request: "bg-violet-500/15 text-violet-600",
  complaint: "bg-red-500/15 text-red-600", other: "bg-muted text-muted-foreground",
};
const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600", accepted: "bg-amber-500/15 text-amber-600",
  in_progress: "bg-amber-500/15 text-amber-600", on_the_way: "bg-violet-500/15 text-violet-600",
  completed: "bg-green-500/15 text-green-600", guest_confirmed: "bg-green-600/20 text-green-700",
  escalated: "bg-red-500/15 text-red-600", cancelled: "bg-muted text-muted-foreground",
};

type Drill = "requests" | "completed" | "questions" | "conversations" | "ratings" | "pulse";

function Stat({ icon: Icon, label, value, sub, active, onClick }: {
  icon: any; label: string; value: string | number; sub?: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-colors ${onClick ? "hover:border-primary/50 hover:bg-muted/40" : ""} ${active ? "border-primary bg-primary/5" : ""}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </button>
  );
}

export default function InsightsPanel({ hotel }: { hotel: Hotel }) {
  const [rows, setRows] = useState<Interaction[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [ratings, setRatings] = useState<{ request_id: string; rating: number; comment: string | null }[]>([]);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<Drill>("completed");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ix }, { data: rq }, { data: rv }, { data: pl }] = await Promise.all([
        supabase.from("ts_interactions").select("session_id, role, content, intent, language, created_at")
          .eq("hotel_id", hotel.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("ts_service_requests")
          .select("id, room_id, department_key, summary, status, is_complaint, classification_method, created_at, updated_at, ts_rooms(room_number)")
          .eq("hotel_id", hotel.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("ts_request_reviews").select("request_id, rating, comment").eq("hotel_id", hotel.id).limit(1000),
        // Two full periods so "this month vs last month" is always computable.
        supabase.from("ts_guest_pulse")
          .select("id, body, rating, sentiment, severity, department_key, issue_key, issue_label, request_id, acknowledged_at, created_at, ts_rooms(room_number)")
          .eq("hotel_id", hotel.id)
          .gte("created_at", new Date(Date.now() - PERIOD_DAYS * 2 * DAY_MS).toISOString())
          .order("created_at", { ascending: false }).limit(1000),
      ]);
      const reqList = (rq as any as Req[]) ?? [];
      setRows((ix as Interaction[]) ?? []);
      setReqs(reqList);
      setRatings((rv as any[]) ?? []);
      setPulses((pl as any as Pulse[]) ?? []);
      const ids = reqList.map((r) => r.id);
      if (ids.length) {
        const { data: ev } = await supabase.from("ts_request_events")
          .select("request_id, status, note, created_at").in("request_id", ids).order("created_at", { ascending: true });
        setEvents((ev as Ev[]) ?? []);
      } else setEvents([]);
      setLoading(false);
    })();
  }, [hotel.id]);

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
      return {
        ...r,
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

  const m = useMemo(() => {
    const guestTurns = rows.filter((r) => r.role === "guest");
    const sessions = new Set(guestTurns.map((r) => r.session_id).filter(Boolean));
    const questions = guestTurns.filter((r) => r.intent === "question").length;
    const doneRows = audit.filter((a) => a.isDone);
    const completion = reqs.length ? Math.round((doneRows.length / reqs.length) * 100) : 0;
    const avg = ratings.length ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length : 0;
    const acceptTimes = audit.map((a) => a.toAcceptMin).filter((n): n is number => n != null && n >= 0);
    const completeTimes = doneRows.map((a) => a.toCompleteMin).filter((n): n is number => n != null && n >= 0);
    const avgAccept = acceptTimes.length ? acceptTimes.reduce((a, b) => a + b, 0) / acceptTimes.length : null;
    const avgComplete = completeTimes.length ? completeTimes.reduce((a, b) => a + b, 0) / completeTimes.length : null;
    return {
      guests: sessions.size, conversations: guestTurns.length, questions,
      requestsTotal: reqs.length, done: doneRows.length, completion, avg, avgAccept, avgComplete,
      feed: guestTurns,
    };
  }, [rows, audit, reqs, ratings]);

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
    setPulses((prev) => prev.map((p) => p.id === id ? { ...p, acknowledged_at: new Date().toISOString() } : p));
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading insights…</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Every interaction is measured here. Click any card to audit the underlying records — see who handled each request and exactly how long it took.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat icon={Users} label="Guests engaged" value={m.guests} sub="unique device sessions" active={drill === "conversations"} onClick={() => setDrill("conversations")} />
        <Stat icon={MessageSquare} label="Conversations" value={m.conversations} sub="guest messages" active={drill === "conversations"} onClick={() => setDrill("conversations")} />
        <Stat icon={HelpCircle} label="Questions answered" value={m.questions} active={drill === "questions"} onClick={() => setDrill("questions")} />
        <Stat icon={ClipboardList} label="Requests" value={m.requestsTotal} active={drill === "requests"} onClick={() => setDrill("requests")} />
        <Stat icon={CheckCircle2} label="Completed" value={`${m.done} · ${m.completion}%`} active={drill === "completed"} onClick={() => setDrill("completed")} />
        <Stat icon={Star} label="Avg rating" value={m.avg ? m.avg.toFixed(1) : "—"} sub={m.avg ? `${ratings.length} reviews` : "no reviews yet"} active={drill === "ratings"} onClick={() => setDrill("ratings")} />
        <Stat
          icon={Heart} label="Caught during the stay"
          value={pulse.caughtInStay}
          sub={`of ${pulse.current.length} pulse checks · last ${PERIOD_DAYS} days`}
          active={drill === "pulse"} onClick={() => setDrill("pulse")}
        />
      </div>

      {/* Headline comparison band */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Timer className="h-4 w-4" /> Avg time to accept</div>
          <div className="mt-1 text-2xl font-semibold">{fmtDur(m.avgAccept)}</div>
          <div className="text-xs text-muted-foreground">from request → staff accepted</div>
        </div>
        <div className="rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Avg time to complete</div>
          <div className="mt-1 text-2xl font-semibold">{fmtDur(m.avgComplete)}</div>
          <div className="text-xs text-muted-foreground">from request → completed</div>
        </div>
      </div>

      <ImprovementTracker pulse={pulse} />

      {/* Drill-down */}
      {(drill === "requests" || drill === "completed") ? (
        <AuditTable rows={drill === "completed" ? audit.filter((a) => a.isDone) : audit} />
      ) : drill === "ratings" ? (
        <ReviewsList audit={audit.filter((a) => a.rating != null)} />
      ) : drill === "pulse" ? (
        <PulseFeed pulses={pulse.all} onAcknowledge={acknowledge} />
      ) : (
        <ActivityFeed feed={drill === "questions" ? m.feed.filter((f) => f.intent === "question") : m.feed} />
      )}
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

function PulseFeed({ pulses, onAcknowledge }: { pulses: Pulse[]; onAcknowledge: (id: string) => void }) {
  if (pulses.length === 0) return <p className="text-sm text-muted-foreground">No pulse checks yet.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">What guests told us ({pulses.length})</h3>
      <div className="space-y-3">
        {pulses.slice(0, 60).map((p) => (
          <div key={p.id} className="rounded-2xl border p-4">
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
                  <BellRing className="h-3.5 w-3.5" /> Raised to a manager during the stay
                </span>
              )}
              {p.acknowledged_at ? (
                <span className="text-muted-foreground">Acknowledged</span>
              ) : (
                <button onClick={() => onAcknowledge(p.id)} className="text-muted-foreground underline hover:text-foreground">
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

function AuditTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No requests yet.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Request audit ({rows.length})</h3>
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
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{r.room}</td>
                <td className="px-3 py-2 text-muted-foreground">{deptLabel(r.department_key)}</td>
                <td className="px-3 py-2 max-w-[220px] truncate">{r.summary}{r.is_complaint ? " ⚠️" : ""}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[r.status] ?? "bg-muted"}`}>{r.status.replace(/_/g, " ")}</span></td>
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

function ReviewsList({ audit }: { audit: any[] }) {
  if (audit.length === 0) return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Reviews ({audit.length})</h3>
      <div className="divide-y rounded-2xl border">
        {audit.map((r) => (
          <div key={r.id} className="px-4 py-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="min-w-0 flex-1 truncate">Room {r.room} · {r.summary}</span>
              <span className="ml-3 whitespace-nowrap text-yellow-500">{"★".repeat(r.rating)}</span>
            </div>
            {r.comment && (
              <p className="mt-1 border-l-2 border-muted pl-2 text-xs italic text-muted-foreground">
                “{r.comment}”
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ feed }: { feed: Interaction[] }) {
  if (feed.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Conversations ({feed.length})</h3>
      <div className="divide-y rounded-2xl border">
        {feed.slice(0, 60).map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs ${INTENT_STYLE[r.intent ?? "other"] ?? INTENT_STYLE.other}`}>{r.intent ?? "other"}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.content}</span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtWhen(r.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
