import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Globe, Wrench, Sparkles, NotebookPen, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface KnowledgeChangeLogProps {
  assistantId: string;
}

interface EventRow {
  id: string;
  change_type: "document" | "manual_entry" | "website_rescrape" | "services" | "prompt_publish";
  summary: string;
  actor_email: string | null;
  created_at: string;
}

const TYPE_META: Record<EventRow["change_type"], { label: string; Icon: any; color: string }> = {
  document: { label: "Document", Icon: FileText, color: "bg-blue-100 text-blue-700" },
  manual_entry: { label: "Manual entry", Icon: NotebookPen, color: "bg-amber-100 text-amber-700" },
  website_rescrape: { label: "Website re-index", Icon: Globe, color: "bg-emerald-100 text-emerald-700" },
  services: { label: "Services", Icon: Wrench, color: "bg-purple-100 text-purple-700" },
  prompt_publish: { label: "AI instructions", Icon: Sparkles, color: "bg-pink-100 text-pink-700" },
};

export const KnowledgeChangeLog = ({ assistantId }: KnowledgeChangeLogProps) => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("knowledge_change_events")
      .select("id, change_type, summary, actor_email, created_at")
      .eq("assistant_id", assistantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [assistantId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Knowledge change log</CardTitle>
            <CardDescription>
              Recent updates to content, knowledge, services and AI instructions. Workspace members with notifications enabled get a digest email.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground">No knowledge changes recorded yet.</div>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => {
              const meta = TYPE_META[ev.change_type] ?? TYPE_META.manual_entry;
              const Icon = meta.Icon;
              return (
                <li key={ev.id} className="flex items-start gap-3 rounded-md border p-3">
                  <div className={`shrink-0 rounded-md p-2 ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-sm mt-1">{ev.summary}</div>
                    {ev.actor_email && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">by {ev.actor_email}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default KnowledgeChangeLog;
