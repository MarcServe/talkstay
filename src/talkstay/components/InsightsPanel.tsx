import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, Users, HelpCircle, ClipboardList, CheckCircle2, Star } from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";

interface Interaction { session_id: string | null; role: string; content: string | null; intent: string | null; language: string | null; created_at: string; room_id: string | null; }
interface Req { status: string; department_key: string; }

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;

const INTENT_STYLE: Record<string, string> = {
  question: "bg-blue-500/15 text-blue-600",
  request: "bg-violet-500/15 text-violet-600",
  complaint: "bg-red-500/15 text-red-600",
  other: "bg-muted text-muted-foreground",
};

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function InsightsPanel({ hotel }: { hotel: Hotel }) {
  const [rows, setRows] = useState<Interaction[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [ratings, setRatings] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ix }, { data: rq }, { data: rv }] = await Promise.all([
        supabase.from("ts_interactions").select("session_id, role, content, intent, language, created_at, room_id")
          .eq("hotel_id", hotel.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("ts_service_requests").select("status, department_key").eq("hotel_id", hotel.id).limit(1000),
        supabase.from("ts_request_reviews").select("rating").eq("hotel_id", hotel.id).limit(1000),
      ]);
      setRows((ix as Interaction[]) ?? []);
      setReqs((rq as Req[]) ?? []);
      setRatings(((rv as any[]) ?? []).map((r) => r.rating));
      setLoading(false);
    })();
  }, [hotel.id]);

  const m = useMemo(() => {
    const guestTurns = rows.filter((r) => r.role === "guest");
    const sessions = new Set(guestTurns.map((r) => r.session_id).filter(Boolean));
    const questions = guestTurns.filter((r) => r.intent === "question").length;
    const requestsTotal = reqs.length;
    const done = reqs.filter((r) => ["completed", "guest_confirmed"].includes(r.status)).length;
    const completion = requestsTotal ? Math.round((done / requestsTotal) * 100) : 0;
    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
    // language + department breakdowns
    const langs: Record<string, number> = {};
    guestTurns.forEach((r) => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
    const deptCounts: Record<string, number> = {};
    reqs.forEach((r) => { deptCounts[r.department_key] = (deptCounts[r.department_key] || 0) + 1; });
    return {
      guests: sessions.size, conversations: guestTurns.length, questions,
      requestsTotal, completion, avg,
      langs: Object.entries(langs).sort((a, b) => b[1] - a[1]),
      depts: Object.entries(deptCounts).sort((a, b) => b[1] - a[1]),
      feed: guestTurns.slice(0, 25),
    };
  }, [rows, reqs, ratings]);

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading insights…</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Every guest interaction is counted here — including questions and chats that didn't become a request — so you can see real engagement and value.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat icon={Users} label="Guests engaged" value={m.guests} sub="unique device sessions" />
        <Stat icon={MessageSquare} label="Conversations" value={m.conversations} sub="guest messages" />
        <Stat icon={HelpCircle} label="Questions answered" value={m.questions} />
        <Stat icon={ClipboardList} label="Requests created" value={m.requestsTotal} />
        <Stat icon={CheckCircle2} label="Completion rate" value={`${m.completion}%`} />
        <Stat icon={Star} label="Avg rating" value={m.avg ? m.avg.toFixed(1) : "—"} sub={m.avg ? `${ratings.length} reviews` : "no reviews yet"} />
      </div>

      {(m.langs.length > 0 || m.depts.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {m.depts.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-medium">Requests by department</h3>
              <div className="space-y-1">
                {m.depts.map(([k, n]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-muted-foreground">{deptLabel(k)}</span><span>{n}</span></div>
                ))}
              </div>
            </div>
          )}
          {m.langs.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-medium">Guest languages</h3>
              <div className="space-y-1">
                {m.langs.map(([k, n]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-muted-foreground">{k}</span><span>{n}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium">Recent activity</h3>
        {m.feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="divide-y rounded-xl border">
            {m.feed.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs ${INTENT_STYLE[r.intent ?? "other"] ?? INTENT_STYLE.other}`}>
                  {r.intent ?? "other"}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.content}</span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
