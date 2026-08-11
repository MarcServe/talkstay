import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, RefreshCw, AlertTriangle, UtensilsCrossed, BedDouble, Wrench,
  Wine, Shirt, ConciergeBell, KeyRound, ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";
import { statusBadge, statusCard, statusLabel } from "@/talkstay/lib/statusStyles";
import { formatRoomLabel } from "@/talkstay/lib/roomLabel";

type LiveRequest = {
  id: string;
  department_key: string;
  summary: string;
  status: string;
  priority: string;
  is_complaint: boolean;
  created_at: string;
  updated_at: string;
  room_number: string | null;
};

type LivePayload = {
  hotel: { name: string; slug: string; primaryColor: string; logoUrl: string | null };
  label: string | null;
  fetchedAt: number;
  requests: LiveRequest[];
};

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

const deptLabel = (k: string) => DEPARTMENTS.find((d) => d.key === k)?.display_name ?? k;
const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const OPEN = new Set(["new", "accepted", "in_progress", "on_the_way", "reopened"]);

async function fetchLiveQueue(token: string): Promise<LivePayload> {
  const { data, error } = await supabase.functions.invoke("talkstay-live-view", {
    body: { action: "queue", token },
  });
  if (error) throw new Error(error.message || "Couldn't load live view");
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as LivePayload;
}

/** Public read-only ops board — no auth, no mutations. Polls every few seconds. */
export default function LiveView() {
  const { token = "" } = useParams<{ token: string }>();
  const [data, setData] = useState<LivePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (!token) {
      setError("Missing live view token.");
      setLoading(false);
      return;
    }
    if (soft) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await fetchLiveQueue(token);
      setData(next);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load live view");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load(false);
    const id = window.setInterval(() => void load(true), 6_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <NoIndexMeta />
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading live view…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div data-talkstay className="ts-atmosphere flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <NoIndexMeta />
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h1 className="text-xl font-semibold">Live view unavailable</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        <Button asChild variant="outline"><Link to="/">Back to TalkStay</Link></Button>
        <Button asChild><Link to="/demo">Try the interactive demo</Link></Button>
      </div>
    );
  }

  const requests = data?.requests ?? [];
  const open = requests.filter((r) => OPEN.has(r.status));
  const done = requests.filter((r) => !OPEN.has(r.status));
  const accent = data?.hotel.primaryColor || "#4c2bb8";

  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <NoIndexMeta />
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {data?.hotel.logoUrl ? (
              <img src={data.hotel.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <TalkStayLogo size={30} />
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold tracking-tight">{data?.hotel.name}</div>
              <div className="text-xs text-muted-foreground">Live operations · read-only</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
            <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={refreshing}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div
          className="rounded-2xl px-5 py-4 text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, #2e1065)` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
            {data?.label || "Campaign live view"}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            Watch real guest requests move through the property.
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/80">
            This board updates automatically. You can look — actions stay with the hotel team.
            No signup required.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Open now" value={open.length} />
          <Stat label="New" value={open.filter((r) => r.status === "new").length} />
          <Stat label="In progress" value={open.filter((r) => ["accepted", "in_progress", "on_the_way"].includes(r.status)).length} />
          <Stat label="Done (3d)" value={done.length} />
        </div>

        {error && (
          <p className="text-sm text-amber-700">Refresh issue: {error}</p>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active queue
          </h2>
          {open.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No open requests right now — completed work appears below as the team finishes.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {open.map((r) => <LiveCard key={r.id} r={r} />)}
            </div>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recently completed
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {done.slice(0, 12).map((r) => <LiveCard key={r.id} r={r} />)}
            </div>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground">
          <span>Powered by TalkStay · read-only share link</span>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/demo">Try interactive demo</Link></Button>
            <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700"><Link to="/app">Get started</Link></Button>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function LiveCard({ r }: { r: LiveRequest }) {
  const vis = DEPT_VISUAL[r.department_key] ?? DEPT_VISUAL.concierge;
  const Icon = vis.Icon;
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${statusCard(r.status)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${vis.tint}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{formatRoomLabel(r.room_number)}</div>
            <div className="text-xs text-muted-foreground">{deptLabel(r.department_key)}</div>
          </div>
        </div>
        <Badge className={statusBadge(r.status)}>{statusLabel(r.status)}</Badge>
      </div>
      <p className="mt-3 text-sm leading-snug">{r.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{timeAgo(r.created_at)}</span>
        {r.priority === "urgent" && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">Urgent</span>
        )}
        {r.is_complaint && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Complaint</span>
        )}
      </div>
    </div>
  );
}
