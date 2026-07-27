import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, MessageSquare, Users, HelpCircle, ClipboardList, CheckCircle2, Star, Timer,
} from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";

interface Interaction { session_id: string | null; role: string; content: string | null; intent: string | null; language: string | null; created_at: string; }
interface Req { id: string; room_id: string | null; department_key: string; summary: string; status: string; is_complaint: boolean; classification_method: string | null; created_at: string; updated_at: string; ts_rooms?: { room_number: string } | null; }
interface Ev { request_id: string; status: string; note: string | null; created_at: string; }

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

type Drill = "requests" | "completed" | "questions" | "conversations" | "ratings";

function Stat({ icon: Icon, label, value, sub, active, onClick }: {
  icon: any; label: string; value: string | number; sub?: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors ${onClick ? "hover:border-primary/50 hover:bg-muted/40" : ""} ${active ? "border-primary bg-primary/5" : ""}`}
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
  const [ratings, setRatings] = useState<{ request_id: string; rating: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<Drill>("completed");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ix }, { data: rq }, { data: rv }] = await Promise.all([
        supabase.from("ts_interactions").select("session_id, role, content, intent, language, created_at")
          .eq("hotel_id", hotel.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("ts_service_requests")
          .select("id, room_id, department_key, summary, status, is_complaint, classification_method, created_at, updated_at, ts_rooms(room_number)")
          .eq("hotel_id", hotel.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("ts_request_reviews").select("request_id, rating").eq("hotel_id", hotel.id).limit(1000),
      ]);
      const reqList = (rq as any as Req[]) ?? [];
      setRows((ix as Interaction[]) ?? []);
      setReqs(reqList);
      setRatings((rv as any[]) ?? []);
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
      </div>

      {/* Headline comparison band */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Timer className="h-4 w-4" /> Avg time to accept</div>
          <div className="mt-1 text-2xl font-semibold">{fmtDur(m.avgAccept)}</div>
          <div className="text-xs text-muted-foreground">from request → staff accepted</div>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Avg time to complete</div>
          <div className="mt-1 text-2xl font-semibold">{fmtDur(m.avgComplete)}</div>
          <div className="text-xs text-muted-foreground">from request → completed</div>
        </div>
      </div>

      {/* Drill-down */}
      {(drill === "requests" || drill === "completed") ? (
        <AuditTable rows={drill === "completed" ? audit.filter((a) => a.isDone) : audit} />
      ) : drill === "ratings" ? (
        <ReviewsList audit={audit.filter((a) => a.rating != null)} />
      ) : (
        <ActivityFeed feed={drill === "questions" ? m.feed.filter((f) => f.intent === "question") : m.feed} />
      )}
    </div>
  );
}

function AuditTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No requests yet.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Request audit ({rows.length})</h3>
      <div className="overflow-x-auto rounded-xl border">
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
      <div className="divide-y rounded-xl border">
        {audit.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate">Room {r.room} · {r.summary}</span>
            <span className="ml-3 text-yellow-500">{"★".repeat(r.rating)}</span>
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
      <div className="divide-y rounded-xl border">
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
