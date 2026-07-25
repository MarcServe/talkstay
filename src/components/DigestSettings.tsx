import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

interface DigestSettingsProps {
  assistantId: string;
}

type Frequency = "off" | "daily" | "weekly";

interface Prefs {
  frequency: Frequency;
  recipient_email: string | null;
  recipient_emails: string[];
  include_team_managers: boolean;
  include_bookings: boolean;
  include_leads: boolean;
  include_topics: boolean;
  include_missed: boolean;
}

const DEFAULTS: Prefs = {
  frequency: "off",
  recipient_email: null,
  recipient_emails: [],
  include_team_managers: false,
  include_bookings: true,
  include_leads: true,
  include_topics: true,
  include_missed: true,
};

export const DigestSettings = ({ assistantId }: DigestSettingsProps) => {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("digest_preferences")
        .select("*")
        .eq("assistant_id", assistantId)
        .maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...(data as any) });
      setLoading(false);
    })();
  }, [assistantId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("digest_preferences").upsert(
      {
        assistant_id: assistantId,
        ...prefs,
      },
      { onConflict: "assistant_id" },
    );
    setSaving(false);
    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Digest preferences saved");
  };

  const sendTest = async () => {
    setTesting(true);
    const { error } = await supabase.functions.invoke("send-operational-digest", {
      body: {
        assistant_id: assistantId,
        period: prefs.frequency === "weekly" ? "weekly" : "daily",
        test: true,
      },
    });
    setTesting(false);
    if (error) toast.error("Test failed: " + error.message);
    else toast.success("Test digest sent");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Operational digest emails
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={prefs.frequency}
                onValueChange={(v) =>
                  setPrefs((p) => ({ ...p, frequency: v as Frequency }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recipients</Label>
              <Input
                type="text"
                placeholder="email1@example.com, email2@example.com"
                value={(prefs.recipient_emails ?? []).join(", ")}
                onChange={(e) => {
                  const list = e.target.value
                    .split(/[,\n;]/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  setPrefs((p) => ({ ...p, recipient_emails: list }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Leave empty to default to your account email.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="include_team_managers" className="text-sm">
                  Also send to team owners & managers
                </Label>
                <p className="text-xs text-muted-foreground">
                  Auto-includes active workspace members with manager/owner role.
                </p>
              </div>
              <Switch
                id="include_team_managers"
                checked={prefs.include_team_managers}
                onCheckedChange={(v) =>
                  setPrefs((p) => ({ ...p, include_team_managers: v }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["include_bookings", "Bookings"],
                ["include_leads", "Leads"],
                ["include_topics", "Top topics"],
                ["include_missed", "Escalated/missed"],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <Label htmlFor={key} className="text-sm">
                    {label}
                  </Label>
                  <Switch
                    id={key}
                    checked={(prefs as any)[key]}
                    onCheckedChange={(v) =>
                      setPrefs((p) => ({ ...p, [key]: v }) as Prefs)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save preferences"}
              </Button>
              <Button
                variant="outline"
                onClick={sendTest}
                disabled={testing}
              >
                {testing ? "Sending…" : "Send test now"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DigestSettings;
