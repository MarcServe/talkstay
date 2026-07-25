import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ShieldCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { format } from "date-fns";

type Category = "team" | "knowledge" | "ai" | "webhooks" | "notifications" | "booking" | "other";

interface Entry {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: any;
  created_at: string;
  category: Category;
}

const ACTION_LABELS: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline"; category: Category }> = {
  // Team
  "department.create": { label: "Created department", tone: "default", category: "team" },
  "department.update": { label: "Updated department", tone: "secondary", category: "team" },
  "department.delete": { label: "Deleted department", tone: "destructive", category: "team" },
  "member.invite": { label: "Invited teammate", tone: "default", category: "team" },
  "member.invite_resend": { label: "Re-sent invite", tone: "secondary", category: "team" },
  "member.role_change": { label: "Changed member role", tone: "secondary", category: "team" },
  "member.remove": { label: "Removed teammate", tone: "destructive", category: "team" },

  // AI / prompt drafts
  "prompt.draft_publish": { label: "Published draft instructions", tone: "default", category: "ai" },
  "prompt.draft_discard": { label: "Discarded draft instructions", tone: "destructive", category: "ai" },
  "prompt.draft_test": { label: "Opened draft test preview", tone: "outline", category: "ai" },

  // Webhooks
  "webhook.create": { label: "Added alert webhook", tone: "default", category: "webhooks" },
  "webhook.delete": { label: "Removed alert webhook", tone: "destructive", category: "webhooks" },
  "webhook.toggle": { label: "Toggled alert webhook", tone: "secondary", category: "webhooks" },
  "webhook.test": { label: "Tested alert webhook", tone: "outline", category: "webhooks" },

  // Notifications
  "member.notify_toggle": { label: "Member alert preference", tone: "secondary", category: "notifications" },
  "owner.notify_toggle": { label: "Owner alert preference", tone: "secondary", category: "notifications" },

  // Booking
  "booking.mode_change": { label: "Booking mode changed", tone: "secondary", category: "booking" },
  "booking.window_add": { label: "Added booking window", tone: "default", category: "booking" },
  "booking.window_remove": { label: "Removed booking window", tone: "destructive", category: "booking" },
};

const KNOWLEDGE_LABELS: Record<string, string> = {
  document: "Document change",
  manual_entry: "Knowledge entry change",
  website_rescrape: "Website re-indexed",
  services: "Services updated",
  prompt_publish: "AI instructions published",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  role: "Role",
  email: "Email",
  enabled: "Enabled",
  kind: "Kind",
  label: "Label",
  status: "Status",
  ok: "Success",
  use_booking_windows: "Custom booking windows",
  mode: "Mode",
  weekday: "Weekday",
  date: "Date",
  start: "Start",
  end: "End",
};

const FILTERS: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "team", label: "Team" },
  { id: "knowledge", label: "Knowledge" },
  { id: "ai", label: "AI" },
  { id: "webhooks", label: "Webhooks" },
  { id: "notifications", label: "Notifications" },
  { id: "booking", label: "Booking" },
];

function formatValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export const WorkspaceAuditLog: React.FC<{ assistantId: string }> = ({ assistantId }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const { toast } = useToast();
  const { canManage, loading: roleLoading } = useWorkspaceRole(assistantId);

  useEffect(() => {
    if (!assistantId || roleLoading) return;
    if (!canManage) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);

      const [auditRes, knowledgeRes] = await Promise.all([
        (supabase as any)
          .from("workspace_audit_log")
          .select("id,actor_user_id,action,target_type,target_id,metadata,created_at")
          .eq("assistant_id", assistantId)
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("knowledge_change_events")
          .select("id, change_type, summary, actor_user_id, actor_email, details, created_at")
          .eq("assistant_id", assistantId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (auditRes.error) {
        toast({ title: "Failed to load audit log", description: auditRes.error.message, variant: "destructive" });
      }

      const auditList: Entry[] = ((auditRes.data ?? []) as any[]).map((r) => {
        const meta = ACTION_LABELS[r.action];
        return {
          id: `a-${r.id}`,
          actor_user_id: r.actor_user_id,
          actor_email: null,
          action: r.action,
          target_type: r.target_type,
          target_id: r.target_id,
          metadata: r.metadata,
          created_at: r.created_at,
          category: meta?.category ?? "other",
        };
      });

      const knowledgeList: Entry[] = ((knowledgeRes.data ?? []) as any[]).map((r) => ({
        id: `k-${r.id}`,
        actor_user_id: r.actor_user_id ?? null,
        actor_email: r.actor_email ?? null,
        action: `knowledge.${r.change_type}`,
        target_type: "knowledge",
        target_id: null,
        metadata: { summary: r.summary, ...(r.details && typeof r.details === "object" ? r.details : {}) },
        created_at: r.created_at,
        category: r.change_type === "prompt_publish" ? "ai" : "knowledge",
      }));

      const merged = [...auditList, ...knowledgeList]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 150);

      setEntries(merged);

      const ids = Array.from(new Set(merged.map((e) => e.actor_user_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id,email")
          .in("user_id", ids);
        const map: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          if (p.user_id && p.email) map[p.user_id] = p.email;
        });
        setActors(map);
      }
      setLoading(false);
    })();
  }, [assistantId, canManage, roleLoading]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.category === filter);
  }, [entries, filter]);

  if (!roleLoading && !canManage) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          Audit log is only visible to workspace owners and managers.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Workspace Audit Log
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Timeline of changes to this assistant — team, content, knowledge, AI instructions, webhooks, notifications and booking.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions recorded for this filter yet.</p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto pr-2 -mr-2">
            <div className="space-y-2">
              {filtered.map((e) => {
                const labelMeta = ACTION_LABELS[e.action];
                const knowledgeLabel = e.action.startsWith("knowledge.")
                  ? KNOWLEDGE_LABELS[e.action.replace("knowledge.", "")] ?? "Knowledge change"
                  : null;
                const label = labelMeta?.label ?? knowledgeLabel ?? e.action;
                const tone = labelMeta?.tone ?? (knowledgeLabel ? "default" : "outline");
                const actorEmail = e.actor_email || (e.actor_user_id ? actors[e.actor_user_id] : null);
                const fields = e.metadata && typeof e.metadata === "object" ? Object.entries(e.metadata) : [];
                return (
                  <div key={e.id} className="p-3 border rounded-md text-sm space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={tone as any}>{label}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{e.category}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "PPpp")}
                      </span>
                    </div>
                    {actorEmail && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" /> {actorEmail}
                      </div>
                    )}
                    {fields.length > 0 && (
                      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs">
                        {fields.map(([k, v]) => (
                          <React.Fragment key={k}>
                            <dt className="text-muted-foreground">{FIELD_LABELS[k] ?? k}:</dt>
                            <dd className="font-medium break-words">{formatValue(v)}</dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkspaceAuditLog;

/** Helper for other components to write audit entries (best-effort). */
export async function logWorkspaceAction(params: {
  assistantId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("workspace_audit_log").insert({
      assistant_id: params.assistantId,
      actor_user_id: user?.id ?? null,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    /* non-fatal */
  }
}
