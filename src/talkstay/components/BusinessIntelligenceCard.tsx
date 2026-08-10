import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Brain, Loader2, Sparkles, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import type { BiSnapshot } from "@/talkstay/lib/businessIntelligence";
import { useIsDemo } from "@/talkstay/demo/DemoContext";

const TONE_PILL: Record<BiSnapshot["tone"], string> = {
  strong: "bg-emerald-100 text-emerald-800",
  steady: "bg-sky-100 text-sky-800",
  watch: "bg-amber-100 text-amber-900",
  thin: "bg-slate-100 text-slate-600",
};

type MetricAccent = "teal" | "sky" | "emerald" | "amber" | "rose" | "slate";

const ACCENT: Record<MetricAccent, { bar: string; label: string; value: string; bg: string }> = {
  teal: { bar: "bg-teal-500", label: "text-teal-700", value: "text-teal-950", bg: "bg-teal-50/80" },
  sky: { bar: "bg-sky-500", label: "text-sky-700", value: "text-sky-950", bg: "bg-sky-50/80" },
  emerald: { bar: "bg-emerald-500", label: "text-emerald-700", value: "text-emerald-950", bg: "bg-emerald-50/80" },
  amber: { bar: "bg-amber-500", label: "text-amber-800", value: "text-amber-950", bg: "bg-amber-50/90" },
  rose: { bar: "bg-rose-500", label: "text-rose-700", value: "text-rose-950", bg: "bg-rose-50/90" },
  slate: { bar: "bg-slate-400", label: "text-slate-600", value: "text-slate-900", bg: "bg-slate-50/80" },
};

function MetricCell({
  accent,
  label,
  value,
  hint,
}: {
  accent: MetricAccent;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  const c = ACCENT[accent];
  return (
    <div className={`relative min-w-[6.5rem] flex-1 px-3 py-2.5 ${c.bg}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${c.bar}`} aria-hidden />
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${c.label}`}>{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums leading-snug ${c.value}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</div>}
    </div>
  );
}

function completionAccent(pct: number): MetricAccent {
  if (pct >= 80) return "emerald";
  if (pct >= 65) return "amber";
  return "rose";
}

export default function BusinessIntelligenceCard({
  hotelId,
  snapshot,
  missingProfile,
}: {
  hotelId: string;
  snapshot: BiSnapshot;
  missingProfile: boolean;
}) {
  const demo = useIsDemo();
  const [open, setOpen] = useState(true);
  const [ai, setAi] = useState<{ headline: string; summary: string; actions: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAi(null);
  }, [snapshot.headline, snapshot.summary, snapshot.stats.requests, snapshot.periodLabel, snapshot.propertyContext]);

  const headline = ai?.headline || snapshot.headline;
  const summary = ai?.summary || snapshot.summary;
  const actions = (ai?.actions?.length ? ai.actions : snapshot.actions).slice(0, 3);
  const lead = snapshot.topDepts[0];
  const second = snapshot.topDepts[1];
  const { stats } = snapshot;

  const polish = async () => {
    if (demo) {
      toast.message("AI polish is available on a live property.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("talkstay-staff", {
        body: {
          hotelId,
          action: "bi_brief",
          snapshot: {
            periodLabel: snapshot.periodLabel,
            tone: snapshot.tone,
            headline: snapshot.headline,
            summary: snapshot.summary,
            highlights: snapshot.highlights,
            risks: snapshot.risks,
            actions: snapshot.actions,
            stats: snapshot.stats,
            topDepts: snapshot.topDepts,
            propertyContext: snapshot.propertyContext,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.headline && !data?.summary) throw new Error("No brief returned");
      setAi({
        headline: data.headline || snapshot.headline,
        summary: data.summary || snapshot.summary,
        actions: Array.isArray(data.actions) && data.actions.length ? data.actions : snapshot.actions,
      });
      setOpen(true);
      toast.success("Brief refreshed.");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't polish the brief");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Brain className="h-4 w-4 shrink-0 text-teal-700" />
            <span className="text-xs font-medium text-muted-foreground">
              Business intel · {snapshot.periodLabel}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_PILL[snapshot.tone]}`}>
              {snapshot.tone}
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold tracking-tight">{headline}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-8 px-2" disabled={busy} onClick={polish} title="AI polish">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ai ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          </Button>
          {actions.length > 0 && (
            <Button size="sm" variant="outline" className="h-8" onClick={() => setOpen((v) => !v)}>
              {open ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
              {open ? "Hide advice" : "Show advice"}
            </Button>
          )}
        </div>
      </div>

      {/* Colour-coded metric strip */}
      <div className="mt-3 rounded-xl border border-border/80">
        <div className="flex flex-wrap divide-x divide-border/80 overflow-hidden rounded-t-xl">
          {lead && (
            <MetricCell
              accent="teal"
              label="Top earner"
              value={lead.name}
              hint={`${lead.count} req · ${lead.chargeable} paid`}
            />
          )}
          {second && (
            <MetricCell
              accent="sky"
              label="Next"
              value={second.name}
              hint={`${second.count} requests`}
            />
          )}
          {stats.chargeable > 0 && (
            <MetricCell
              accent="emerald"
              label="Chargeable"
              value={
                stats.revenueProxy != null
                  ? `≈${stats.revenueProxy.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : stats.chargeable
              }
              hint={stats.revenueProxy != null ? `${stats.chargeable} paid orders` : "paid orders"}
            />
          )}
          {stats.requests > 0 && (
            <MetricCell
              accent={completionAccent(stats.completionPct)}
              label="Completed"
              value={`${stats.completionPct}%`}
              hint={`${stats.completed}/${stats.requests}`}
            />
          )}
        </div>

        {(snapshot.risks.length > 0 || missingProfile) && (
          <div className="space-y-1.5 border-t border-amber-200/80 bg-amber-50/90 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">Watch</div>
            <ul className="space-y-1.5 text-sm font-medium leading-relaxed text-amber-950">
              {snapshot.risks.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  <span className="min-w-0 flex-1 break-words">{r}</span>
                </li>
              ))}
              {missingProfile && (
                <li className="flex gap-2 text-amber-900/85">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1 break-words">
                    Set Branding → Property for sharper advice.
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {open && actions.length > 0 && (
        <ol className="mt-3 space-y-2 border-t pt-3 text-sm leading-relaxed text-foreground/90">
          {actions.map((a, i) => (
            <li key={a} className="flex gap-2">
              <span className="shrink-0 font-medium text-teal-700">{i + 1}.</span>
              <span className="min-w-0 flex-1 break-words">{a}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
