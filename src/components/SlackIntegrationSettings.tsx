import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Slack } from "lucide-react";
import { toast } from "sonner";

interface SlackPrefs {
  webhook_url: string;
  enabled: boolean;
  notify_bookings: boolean;
  notify_demo_requests: boolean;
  notify_lifecycle: boolean;
  notify_digests: boolean;
  notify_crawl_complete: boolean;
  notify_inquiries: boolean;
}

const DEFAULTS: SlackPrefs = {
  webhook_url: "",
  enabled: true,
  notify_bookings: true,
  notify_demo_requests: true,
  notify_lifecycle: true,
  notify_digests: true,
  notify_crawl_complete: true,
  notify_inquiries: true,
};

export const SlackIntegrationSettings = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<SlackPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("slack_integrations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...data });
      setLoading(false);
    })();
  }, [user]);

  const update = (patch: Partial<SlackPrefs>) => setPrefs((p) => ({ ...p, ...patch }));

  const save = async () => {
    if (!user) return;
    if (prefs.webhook_url && !prefs.webhook_url.startsWith("https://hooks.slack.com/")) {
      toast.error("Webhook URL must start with https://hooks.slack.com/");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("slack_integrations")
      .upsert({ user_id: user.id, ...prefs });
    setSaving(false);
    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Slack settings saved");
  };

  const test = async () => {
    if (!prefs.webhook_url) { toast.error("Enter a webhook URL first"); return; }
    setTesting(true);
    try {
      const res = await fetch(prefs.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "✅ TalkWeb Slack test",
          attachments: [{ color: "#10b981", text: "If you can see this, your webhook is working." }],
        }),
      });
      if (res.ok) toast.success("Test message sent");
      else toast.error("Slack rejected the request: " + res.status);
    } catch (e: any) {
      toast.error("Test failed: " + e.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return null;

  const toggles: Array<[keyof SlackPrefs, string, string]> = [
    ["notify_bookings", "Bookings", "New bookings, status changes"],
    ["notify_inquiries", "Project inquiries", "Lead capture from your assistant"],
    ["notify_demo_requests", "Demo requests", "Visitors asking for a demo"],
    ["notify_crawl_complete", "Crawl complete", "When a website index finishes"],
    ["notify_lifecycle", "Lifecycle alerts", "Welcome, trial reminders, deployments"],
    ["notify_digests", "Operational digests", "Daily/weekly digest summaries"],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Slack className="w-5 h-5" /> Slack Notifications
        </CardTitle>
        <CardDescription>
          Receive bookings, inquiries, demo requests, lifecycle alerts and digests in Slack via an Incoming Webhook.{" "}
          <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="underline">
            How to create one
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Enable Slack notifications</Label>
            <p className="text-xs text-muted-foreground">Master switch — disable to pause all Slack delivery.</p>
          </div>
          <Switch checked={prefs.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>

        <div>
          <Label htmlFor="slack-url" className="text-sm">Slack webhook URL</Label>
          <Input
            id="slack-url"
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={prefs.webhook_url}
            onChange={(e) => update({ webhook_url: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {toggles.map(([key, title, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div className="pr-3">
                <Label className="text-sm font-medium">{title}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={prefs[key] as boolean}
                onCheckedChange={(v) => update({ [key]: v } as Partial<SlackPrefs>)}
                disabled={!prefs.enabled}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} size="sm">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save settings
          </Button>
          <Button onClick={test} disabled={testing || !prefs.webhook_url} size="sm" variant="outline">
            {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send test message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlackIntegrationSettings;
