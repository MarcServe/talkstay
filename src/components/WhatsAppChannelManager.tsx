import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Trash2, Copy, ExternalLink } from "lucide-react";

interface Channel {
  id: string;
  assistant_id: string;
  twilio_number: string;
  display_name: string | null;
  voice_replies_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

interface Props {
  assistantId: string;
  userId: string;
}

const PROJECT_REF = "oujqkygfmyapmrgxmhvt";
const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/whatsapp-inbound`;

function normalizeWhatsAppNumber(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const stripped = trimmed.toLowerCase().startsWith("whatsapp:")
    ? trimmed.slice("whatsapp:".length)
    : trimmed;
  const digits = stripped.replace(/[^\d+]/g, "");
  if (!digits) return "";
  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return `whatsapp:${e164}`;
}

function isValidE164(normalized: string): boolean {
  // expects "whatsapp:+15558228498" — 8 to 15 digits after +
  return /^whatsapp:\+\d{8,15}$/.test(normalized);
}

export function WhatsAppChannelManager({ assistantId, userId }: Props) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [number, setNumber] = useState("");
  const [displayName, setDisplayName] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_channels" as any)
      .select("*")
      .eq("assistant_id", assistantId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load channels", description: error.message, variant: "destructive" });
    } else {
      setChannels((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (assistantId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId]);

  const handleAdd = async () => {
    const normalized = normalizeWhatsAppNumber(number);
    if (!normalized || !isValidE164(normalized)) {
      toast({
        title: "Invalid number",
        description: "Use international E.164 format, e.g. +15558228498",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("whatsapp_channels" as any)
      .insert({
        assistant_id: assistantId,
        user_id: userId,
        twilio_number: normalized,
        display_name: displayName || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Could not add channel", description: error.message, variant: "destructive" });
      return;
    }
    setNumber("");
    setDisplayName("");
    toast({
      title: "WhatsApp channel connected",
      description: `${(data as any)?.twilio_number || normalized} is now linked to this assistant.`,
    });
    load();
  };

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("whatsapp_channels" as any).update({ is_active: value }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this WhatsApp channel?")) return;
    const { error } = await supabase.from("whatsapp_channels" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            WhatsApp Channel
            <Badge variant="secondary">Beta</Badge>
          </CardTitle>
          <CardDescription>
            Let customers chat with this assistant on WhatsApp. Uses the same knowledge base and tools as your website widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wa-number">Twilio WhatsApp number</Label>
              <Input
                id="wa-number"
                placeholder="+14155552671"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">E.164 format. We'll prefix it with <code>whatsapp:</code>.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-name">Display name (optional)</Label>
              <Input
                id="wa-name"
                placeholder="Sales Line"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "Adding…" : "Add WhatsApp number"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Twilio webhook setup</CardTitle>
          <CardDescription>
            In Twilio Console → Messaging → your WhatsApp sender → "When a message comes in", paste this URL (HTTP POST):
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
            <code className="text-xs flex-1 break-all">{WEBHOOK_URL}</code>
            <Button size="sm" variant="ghost" onClick={() => copy(WEBHOOK_URL)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected numbers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WhatsApp numbers connected yet.</p>
          ) : (
            <div className="space-y-3">
              {channels.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.display_name || c.twilio_number}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.twilio_number}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${c.id}`} className="text-xs">Active</Label>
                      <Switch
                        id={`active-${c.id}`}
                        checked={c.is_active}
                        onCheckedChange={(v) => toggleActive(c.id, v)}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default WhatsAppChannelManager;
