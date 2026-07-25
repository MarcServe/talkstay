import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Send, Trash2, Copy, RefreshCw, Inbox, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const INBOUND_DOMAIN = "inbound.talkweb.io";

interface Props { assistantId: string }

interface Thread {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  last_message_at: string;
  status: string;
  unread_count: number;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  subject: string | null;
  body_text: string | null;
  status: string;
  confidence_score: number | null;
  top_sources: any;
  created_at: string;
  sent_at: string | null;
  to_email: string | null;
  from_email: string | null;
  error_message: string | null;
}

interface AssistantSettings {
  business_name: string;
  preview_slug: string;
  email_autoresponder_enabled: boolean;
  email_inbound_slug: string | null;
  email_send_mode: string;
  email_confidence_threshold: number;
}

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "sent") return "default";
  if (status === "draft") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
};

export const EmailInbox = ({ assistantId }: Props) => {
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftBody, setDraftBody] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const inboundAddress = settings
    ? `${settings.email_inbound_slug || settings.preview_slug}@${INBOUND_DOMAIN}`
    : "";

  const loadSettings = async () => {
    const { data } = await supabase
      .from("assistants")
      .select("business_name, preview_slug, email_autoresponder_enabled, email_inbound_slug, email_send_mode, email_confidence_threshold")
      .eq("id", assistantId)
      .maybeSingle();
    if (data) setSettings(data as AssistantSettings);
  };

  const loadThreads = async () => {
    const { data } = await supabase
      .from("email_threads")
      .select("*")
      .eq("assistant_id", assistantId)
      .order("last_message_at", { ascending: false })
      .limit(100);
    setThreads((data || []) as Thread[]);
  };

  const loadMessages = async (threadId: string) => {
    const { data } = await supabase
      .from("email_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages((data || []) as Message[]);
    const draft = (data || []).slice().reverse().find((m: any) => m.direction === "outbound" && m.status === "draft");
    setDraftBody(draft?.body_text || "");
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadSettings(), loadThreads()]);
      setLoading(false);
    })();
    // realtime subscription
    const channel = supabase
      .channel(`email-threads-${assistantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_threads", filter: `assistant_id=eq.${assistantId}` }, () => loadThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "email_messages", filter: `assistant_id=eq.${assistantId}` }, () => {
        if (activeThreadId) loadMessages(activeThreadId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId]);

  useEffect(() => {
    if (activeThreadId) loadMessages(activeThreadId);
  }, [activeThreadId]);

  const saveSettings = async (patch: Partial<AssistantSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...patch };
    setSettings(newSettings);
    const { error } = await supabase
      .from("assistants")
      .update(patch)
      .eq("id", assistantId);
    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Saved");
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(inboundAddress);
    toast.success("Inbound address copied");
  };

  const sendDraft = async (messageId: string) => {
    setSendingId(messageId);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-reply", {
        body: { messageId, body: draftBody },
      });
      if (error || (data && data.error)) throw new Error(error?.message || data?.error);
      toast.success("Reply sent");
      if (activeThreadId) loadMessages(activeThreadId);
    } catch (e: any) {
      toast.error("Send failed: " + e.message);
    } finally {
      setSendingId(null);
    }
  };

  const discardDraft = async (messageId: string) => {
    const { error } = await supabase.from("email_messages").delete().eq("id", messageId);
    if (error) toast.error(error.message);
    else {
      toast.success("Draft discarded");
      if (activeThreadId) loadMessages(activeThreadId);
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const draftMsg = messages.slice().reverse().find(m => m.direction === "outbound" && m.status === "draft");

  return (
    <Tabs defaultValue="inbox" className="w-full">
      <TabsList>
        <TabsTrigger value="inbox"><Inbox className="h-4 w-4 mr-2" />Inbox</TabsTrigger>
        <TabsTrigger value="settings"><Mail className="h-4 w-4 mr-2" />Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="inbox" className="mt-4">
        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
            <Card className="md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Threads
                  <Button variant="ghost" size="icon" onClick={loadThreads}><RefreshCw className="h-3 w-3" /></Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {threads.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 pb-4">No email threads yet. Forward customer emails to your inbound address.</p>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {threads.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveThreadId(t.id)}
                        className={`w-full text-left p-3 hover:bg-muted/50 transition ${activeThreadId === t.id ? "bg-muted" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{t.from_name || t.from_email}</span>
                          {t.unread_count > 0 && <Badge variant="default" className="ml-2 text-[10px]">{t.unread_count}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{t.subject || "(no subject)"}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              {!activeThread ? (
                <CardContent className="py-16 text-center text-muted-foreground text-sm">Select a thread to view the conversation.</CardContent>
              ) : (
                <>
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base">{activeThread.subject || "(no subject)"}</CardTitle>
                    <CardDescription>{activeThread.from_name ? `${activeThread.from_name} <${activeThread.from_email}>` : activeThread.from_email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[500px] overflow-y-auto py-4">
                    {messages.map(m => (
                      <div key={m.id} className={`rounded-lg border p-3 ${m.direction === "outbound" ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>{m.direction === "inbound" ? `From: ${m.from_email}` : `Reply → ${m.to_email}`}</span>
                          <div className="flex items-center gap-2">
                            {typeof m.confidence_score === "number" && (
                              <Badge variant="outline" className="text-[10px]">
                                {Math.round(m.confidence_score * 100)}% confident
                              </Badge>
                            )}
                            <Badge variant={statusVariant(m.status)} className="text-[10px]">{m.status}</Badge>
                          </div>
                        </div>
                        {m.status === "draft" && draftMsg?.id === m.id ? (
                          <div className="space-y-2">
                            <Textarea value={draftBody} onChange={e => setDraftBody(e.target.value)} rows={10} className="text-sm" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => sendDraft(m.id)} disabled={sendingId === m.id}>
                                {sendingId === m.id ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />}
                                Send Reply
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => discardDraft(m.id)}>
                                <Trash2 className="h-3 w-3 mr-2" />Discard
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <pre className="text-sm whitespace-pre-wrap font-sans">{m.body_text}</pre>
                        )}
                        {m.error_message && <p className="text-xs text-destructive mt-2">{m.error_message}</p>}
                        {Array.isArray(m.top_sources) && m.top_sources.length > 0 && m.direction === "outbound" && (
                          <p className="text-[10px] text-muted-foreground mt-2">Sources: {m.top_sources.map((s: any) => s.title || s.url || "match").join(" · ")}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        )}
      </TabsContent>

      <TabsContent value="settings" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Autoresponder</CardTitle>
            <CardDescription>
              Let TalkWeb answer customer emails using this assistant's knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <Label>Your inbound address</Label>
              <div className="flex items-center gap-2">
                <Input value={inboundAddress} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyAddress}><Copy className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Set up a forwarding rule in your support inbox (e.g. <code>support@yourbusiness.com</code>) to forward to this address.
                Once Resend Inbound is activated for <code>{INBOUND_DOMAIN}</code>, incoming emails will be answered automatically.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable autoresponder</Label>
                <p className="text-xs text-muted-foreground">Turn on automatic AI replies for this assistant.</p>
              </div>
              <Switch
                checked={settings?.email_autoresponder_enabled || false}
                onCheckedChange={(v) => saveSettings({ email_autoresponder_enabled: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reply mode</Label>
              <Select
                value={settings?.email_send_mode || "auto_if_confident"}
                onValueChange={(v) => saveSettings({ email_send_mode: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_if_confident">Auto-send only if confidence is high (recommended)</SelectItem>
                  <SelectItem value="auto">Auto-send every reply</SelectItem>
                  <SelectItem value="draft_only">Always save as draft for me to review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Confidence threshold: {Math.round((settings?.email_confidence_threshold || 0.72) * 100)}%</Label>
              <Slider
                min={0.3}
                max={0.95}
                step={0.05}
                value={[settings?.email_confidence_threshold || 0.72]}
                onValueChange={([v]) => setSettings(s => s ? { ...s, email_confidence_threshold: v } : s)}
                onValueCommit={([v]) => saveSettings({ email_confidence_threshold: v })}
              />
              <p className="text-xs text-muted-foreground">Replies below this score are saved as drafts instead of auto-sent.</p>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <strong>Setup checklist (admin):</strong>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Add an MX record for <code>{INBOUND_DOMAIN}</code> pointing to Resend.</li>
                <li>Enable Resend Inbound and add the catch-all route.</li>
                <li>Point the inbound webhook at the <code>inbound-email-handler</code> edge function.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default EmailInbox;
