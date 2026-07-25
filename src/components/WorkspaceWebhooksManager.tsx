import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Send, Webhook } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { logWorkspaceAction } from "@/components/WorkspaceAuditLog";

interface Props { assistantId: string; }

interface Hook {
  id: string;
  kind: "slack" | "teams";
  webhook_url: string;
  label: string | null;
  enabled: boolean;
}

function detectKind(url: string): "slack" | "teams" | null {
  if (/hooks\.slack\.com\/services\//i.test(url)) return "slack";
  if (/webhook\.office\.com\//i.test(url) || /\.logic\.azure\.com:443\//i.test(url)) return "teams";
  return null;
}

function maskUrl(u: string) {
  if (!u) return "";
  return u.length <= 36 ? u : u.slice(0, 28) + "…" + u.slice(-6);
}

export const WorkspaceWebhooksManager = ({ assistantId }: Props) => {
  const { user } = useAuth();
  const { canManage } = useWorkspaceRole(assistantId);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("workspace_notification_webhooks")
      .select("id, kind, webhook_url, label, enabled")
      .eq("assistant_id", assistantId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    else setHooks((data ?? []) as Hook[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [assistantId]);

  const add = async () => {
    if (!url.trim()) return toast.error("Paste a webhook URL");
    const kind = detectKind(url.trim());
    if (!kind) return toast.error("URL doesn't look like a Slack or Teams Incoming Webhook");
    setAdding(true);
    const { error } = await (supabase as any)
      .from("workspace_notification_webhooks")
      .insert({
        assistant_id: assistantId,
        kind,
        webhook_url: url.trim(),
        label: label.trim() || null,
        created_by: user?.id ?? null,
        enabled: true,
      });
    setAdding(false);
    if (error) return toast.error(error.message);
    setUrl(""); setLabel("");
    toast.success(`${kind === "slack" ? "Slack" : "Teams"} webhook added`);
    logWorkspaceAction({ assistantId, action: "webhook.create", metadata: { kind, label: label.trim() || null } });
    load();
  };

  const toggle = async (id: string, value: boolean) => {
    const target = hooks.find((h) => h.id === id);
    setHooks((cur) => cur.map((h) => (h.id === id ? { ...h, enabled: value } : h)));
    const { error } = await (supabase as any)
      .from("workspace_notification_webhooks").update({ enabled: value }).eq("id", id);
    if (error) { toast.error(error.message); load(); return; }
    logWorkspaceAction({ assistantId, action: "webhook.toggle", targetId: id, metadata: { kind: target?.kind, label: target?.label, enabled: value } });
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this webhook?")) return;
    const target = hooks.find((h) => h.id === id);
    const { error } = await (supabase as any)
      .from("workspace_notification_webhooks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Webhook removed");
    logWorkspaceAction({ assistantId, action: "webhook.delete", targetId: id, metadata: { kind: target?.kind, label: target?.label } });
    load();
  };

  const test = async (h: Hook) => {
    setTestingId(h.id);
    try {
      const { data, error } = await supabase.functions.invoke("notify-knowledge-update", {
        body: {
          test: true,
          assistant_id: assistantId,
          webhook_url: h.webhook_url,
          kind: h.kind,
          send_email: false,
          summary: "This is a test alert. If you see this, your webhook is working.",
          actor_email: user?.email ?? null,
        },
      });
      if (error) throw error;
      const status = (data as any)?.webhooks?.[0]?.status;
      const ok = status && status >= 200 && status < 300;
      if (ok) toast.success("Test sent successfully");
      else toast.error(`Webhook responded with ${status ?? "no status"}`);
      logWorkspaceAction({ assistantId, action: "webhook.test", targetId: h.id, metadata: { kind: h.kind, label: h.label, status: status ?? null, ok: !!ok } });
    } catch (e: any) {
      toast.error(e?.message ?? "Test failed");
      logWorkspaceAction({ assistantId, action: "webhook.test", targetId: h.id, metadata: { kind: h.kind, label: h.label, ok: false, error: e?.message } });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4" /> Slack & Teams alerts</CardTitle>
        <CardDescription>
          Send instant knowledge / content change alerts to Slack or Microsoft Teams using an Incoming Webhook URL. Treat the URL as a secret.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
            <div>
              <Label className="text-xs">Webhook URL</Label>
              <Input
                placeholder="https://hooks.slack.com/services/... or https://*.webhook.office.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Label (optional)</Label>
              <Input placeholder="e.g. #content-team" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={add} disabled={adding || !url.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : hooks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No webhooks yet. {canManage ? "Paste a Slack or Teams Incoming Webhook URL above." : "Ask an owner or manager to add one."}
          </div>
        ) : (
          <div className="space-y-2">
            {hooks.map((h) => (
              <div key={h.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline" className="uppercase text-[10px]">{h.kind}</Badge>
                    {h.label || (h.kind === "slack" ? "Slack" : "Teams")}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate font-mono">{maskUrl(h.webhook_url)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Switch checked={h.enabled} onCheckedChange={(v) => toggle(h.id, v)} disabled={!canManage} />
                    {h.enabled ? "Enabled" : "Off"}
                  </label>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => test(h)} disabled={testingId === h.id}>
                    {testingId === h.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Test</>}
                  </Button>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(h.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkspaceWebhooksManager;
