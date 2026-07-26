import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { DEPARTMENTS, type Hotel } from "@/talkstay/lib/hotels";

interface Req {
  id: string;
  room_id: string | null;
  department_key: string;
  summary: string;
  status: string;
  priority: string;
  is_complaint: boolean;
  guest_language: string | null;
  created_at: string;
  ts_rooms?: { room_number: string } | null;
}

// Next lifecycle action per status.
const NEXT: Record<string, { to: string; label: string } | null> = {
  new: { to: "accepted", label: "Accept" },
  accepted: { to: "in_progress", label: "Start" },
  in_progress: { to: "on_the_way", label: "On the way" },
  on_the_way: { to: "completed", label: "Complete" },
  completed: null,
  guest_confirmed: null,
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600",
  accepted: "bg-amber-500/15 text-amber-600",
  in_progress: "bg-amber-500/15 text-amber-600",
  on_the_way: "bg-violet-500/15 text-violet-600",
  completed: "bg-green-500/15 text-green-600",
  guest_confirmed: "bg-green-600/20 text-green-700",
  escalated: "bg-red-500/15 text-red-600",
  cancelled: "bg-muted text-muted-foreground",
};

const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;
const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

type Filter = "active" | "new" | "done" | "all";

const OVERDUE_MIN = 5; // a 'new' request older than this is flagged overdue
const minsSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60000;

export default function OperationsPanel({ hotel }: { hotel: Hotel }) {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [ack, setAck] = useState<Record<string, { by: string; at: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [dept, setDept] = useState<string>("all");

  const refresh = async () => {
    const { data, error } = await supabase
      .from("ts_service_requests")
      .select("id, room_id, department_key, summary, status, priority, is_complaint, guest_language, created_at, ts_rooms(room_number)")
      .eq("hotel_id", hotel.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    const list = (data as any as Req[]) ?? [];
    setReqs(list);
    setLoading(false);

    // Acknowledgement: who accepted each request, and when (latest 'accepted' event).
    const ids = list.map((r) => r.id);
    if (ids.length) {
      const { data: ev } = await supabase
        .from("ts_request_events")
        .select("request_id, note, created_at")
        .in("request_id", ids).eq("status", "accepted")
        .order("created_at", { ascending: false });
      const map: Record<string, { by: string; at: string }> = {};
      (ev ?? []).forEach((e: any) => {
        if (!map[e.request_id]) map[e.request_id] = { by: e.note || "staff", at: e.created_at };
      });
      setAck(map);
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    const channel = supabase
      .channel(`ts-ops-${hotel.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ts_service_requests", filter: `hotel_id=eq.${hotel.id}` },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [hotel.id]);

  // Resolve the current user's display identity for this hotel: "Name · Department".
  const actorLabel = async (userId?: string, email?: string | null): Promise<string> => {
    if (!userId) return email ?? "staff";
    const { data: s } = await supabase
      .from("ts_staff").select("name, department_key")
      .eq("hotel_id", hotel.id).eq("user_id", userId).limit(1).maybeSingle();
    const nm = s?.name || email || "staff";
    return s?.department_key ? `${nm} · ${deptLabel(s.department_key)}` : nm;
  };

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

  const filtered = useMemo(() => {
    return reqs.filter((r) => {
      if (dept !== "all" && r.department_key !== dept) return false;
      if (filter === "new") return r.status === "new";
      if (filter === "done") return ["completed", "guest_confirmed", "cancelled"].includes(r.status);
      if (filter === "active") return !["completed", "guest_confirmed", "cancelled"].includes(r.status);
      return true;
    });
  }, [reqs, filter, dept]);

  const newCount = reqs.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(["active", "new", "done", "all"] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)} className="capitalize">
              {f}{f === "new" && newCount ? ` (${newCount})` : ""}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.display_name}</option>)}
          </select>
          <Button size="sm" variant="ghost" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
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
            return (
              <div key={r.id} className={`rounded-xl border p-4 ${
                r.is_complaint || overdue ? "border-red-400/50 bg-red-500/5" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Room {r.ts_rooms?.room_number ?? "—"}</span>
                      <Badge variant="secondary">{deptLabel(r.department_key)}</Badge>
                      {r.is_complaint && (
                        <Badge className="bg-red-500/15 text-red-600"><AlertTriangle className="mr-1 h-3 w-3" />Complaint</Badge>
                      )}
                      {r.priority === "urgent" && <Badge className="bg-red-500/15 text-red-600">Urgent</Badge>}
                      {overdue && <Badge className="bg-red-500/15 text-red-600">Overdue</Badge>}
                    </div>
                    <p className="mt-1 text-sm">{r.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeAgo(r.created_at)}{r.guest_language ? ` · ${r.guest_language}` : ""}
                    </p>
                    {acked && (
                      <p className="mt-1 text-xs text-green-600">✓ Accepted by {acked.by} · {timeAgo(acked.at)}</p>
                    )}
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${STATUS_STYLE[r.status] ?? "bg-muted"}`}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {overdue && r.priority !== "urgent" && (
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => escalate(r)}>Escalate</Button>
                  )}
                  {next && r.status !== "new" && (
                    <Button size="sm" variant="ghost" onClick={() => advance(r, "cancelled")}>Cancel</Button>
                  )}
                  {next && <Button size="sm" onClick={() => advance(r, next.to)}>{next.label}</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
