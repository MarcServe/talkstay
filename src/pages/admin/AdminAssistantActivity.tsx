import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, Calendar, UserPlus, MousePointerClick, FileText, Sparkles, RefreshCw, ExternalLink } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

type Range = "7" | "30" | "90";

interface Payload {
  assistant: any;
  range_days: number;
  counts: { conversations: number; bookings: number; leads: number; clicks: number; voice_forms: number; knowledge_events: number };
  series: { conversations: any[]; bookings: any[]; leads: any[]; clicks: any[] };
  recent: { conversations: any[]; bookings: any[]; leads: any[]; clicks: any[]; voice_forms: any[]; knowledge_events: any[] };
}

export function AdminAssistantActivity() {
  const { id } = useParams<{ id: string }>();
  const [range, setRange] = useState<Range>("30");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data: res, error } = await supabase.functions.invoke('admin-assistant-activity', {
        body: { assistantId: id, days: parseInt(range, 10) },
        headers: session.session ? { Authorization: `Bearer ${session.session.access_token}` } : {},
      });
      if (error) throw error;
      setData(res as Payload);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, range]);

  const trend = useMemo(() => {
    if (!data) return [];
    const days = parseInt(range, 10);
    const buckets: Record<string, any> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      buckets[d] = { day: d, conversations: 0, bookings: 0, leads: 0, clicks: 0 };
    }
    const add = (rows: any[], key: string) => rows.forEach(r => {
      const d = format(new Date(r.created_at), "MMM d");
      if (buckets[d]) buckets[d][key] += 1;
    });
    add(data.series.conversations, 'conversations');
    add(data.series.bookings, 'bookings');
    add(data.series.leads, 'leads');
    add(data.series.clicks, 'clicks');
    return Object.values(buckets);
  }, [data, range]);

  const topics = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    data.series.conversations.forEach((r: any) => {
      if (Array.isArray(r.topics)) r.topics.forEach((t: any) => {
        const s = String(t).trim().toLowerCase();
        if (s) counts.set(s, (counts.get(s) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).map(([topic, n]) => ({ topic, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [data]);

  const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading && !data) return <div className="p-8 text-muted-foreground">Loading activity…</div>;
  if (!data) return <div className="p-8 text-muted-foreground">No data.</div>;

  const a = data.assistant;
  const status = !a.is_trial ? 'Active' : (a.trial_expires_at && new Date(a.trial_expires_at) > new Date() ? 'Trial' : 'Expired');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/assistants" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to assistants
          </Link>
          <h1 className="text-3xl font-bold mt-1">{a.business_name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{a.owner_email ?? 'No owner'}</span>
            <span>·</span>
            <a href={a.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary inline-flex items-center gap-1">
              {a.website_url?.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
            </a>
            <Badge variant={status === 'Active' ? 'default' : status === 'Trial' ? 'secondary' : 'destructive'}>{status}</Badge>
            {a.embed_code && <Badge variant="outline">Embedded</Badge>}
            {a.crawl_status && a.crawl_status !== 'idle' && <Badge variant="outline">Crawl: {a.crawl_status}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} className="gap-1"><RefreshCw className="h-3 w-3" /> Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={<MessageSquare className="h-5 w-5" />} label="Conversations" value={data.counts.conversations} />
        <Stat icon={<Calendar className="h-5 w-5" />} label="Bookings" value={data.counts.bookings} />
        <Stat icon={<UserPlus className="h-5 w-5" />} label="Leads" value={data.counts.leads} />
        <Stat icon={<MousePointerClick className="h-5 w-5" />} label="Link clicks" value={data.counts.clicks} />
        <Stat icon={<FileText className="h-5 w-5" />} label="Form submissions" value={data.counts.voice_forms} />
        <Stat icon={<Sparkles className="h-5 w-5" />} label="Knowledge edits" value={data.counts.knowledge_events} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Activity trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="conversations" stroke="hsl(var(--primary))" />
                <Line type="monotone" dataKey="bookings" stroke="hsl(var(--accent))" />
                <Line type="monotone" dataKey="leads" stroke="#10b981" />
                <Line type="monotone" dataKey="clicks" stroke="#f59e0b" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top topics</CardTitle></CardHeader>
          <CardContent>
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No topic data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, topics.length * 26)}>
                <BarChart data={topics} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="topic" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="n" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conversations">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="clicks">Link clicks</TabsTrigger>
          <TabsTrigger value="voice_forms">Voice forms</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge log</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Session</TableHead><TableHead>User</TableHead><TableHead>AI response</TableHead><TableHead className="text-right">Latency</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.recent.conversations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No conversations.</TableCell></TableRow>
              ) : data.recent.conversations.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-mono">{String(r.session_id).slice(0, 12)}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-sm">{r.user_message}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-sm">{r.ai_response}</TableCell>
                  <TableCell className="text-right text-xs">{r.response_time_ms ? `${r.response_time_ms} ms` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Date / time</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.recent.bookings.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No bookings.</TableCell></TableRow>
              ) : data.recent.bookings.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>{r.user_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.user_email}</TableCell>
                  <TableCell className="text-xs">{r.preferred_date} {r.preferred_time ?? ''}</TableCell>
                  <TableCell><Badge variant="outline">{r.booking_method ?? '—'}</Badge></TableCell>
                  <TableCell><Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Summary</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.recent.leads.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No leads.</TableCell></TableRow>
              ) : data.recent.leads.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>{r.user_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.user_email ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.user_phone ?? '—'}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-sm">{r.problem_summary ?? ''}</TableCell>
                  <TableCell><Badge variant="outline">{r.status ?? '—'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="clicks">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Label</TableHead><TableHead>URL</TableHead><TableHead>Source</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.recent.clicks.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No clicks.</TableCell></TableRow>
              ) : data.recent.clicks.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>{r.link_label ?? '—'}</TableCell>
                  <TableCell className="max-w-[400px] truncate text-xs"><a href={r.clicked_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{r.clicked_url}</a></TableCell>
                  <TableCell><Badge variant="outline">{r.source ?? '—'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="voice_forms">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Form</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.recent.voice_forms.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No submissions.</TableCell></TableRow>
              ) : data.recent.voice_forms.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-mono">{String(r.form_id).slice(0, 8)}</TableCell>
                  <TableCell>{r.user_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.user_email ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline">{r.completion_status ?? '—'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Knowledge change log</CardTitle>
              <CardDescription>Most recent updates to content, documents, services, and AI instructions.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recent.knowledge_events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent changes.</p>
              ) : (
                <ul className="space-y-2">
                  {data.recent.knowledge_events.map((ev: any) => (
                    <li key={ev.id} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{ev.change_type}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm mt-1">{ev.summary}</div>
                      {ev.actor_email && <div className="text-[11px] text-muted-foreground mt-0.5">by {ev.actor_email}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminAssistantActivity;
