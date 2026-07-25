import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, MessageSquare, Calendar, UserPlus, MousePointerClick } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

type Range = "7" | "30" | "90";

interface Props {
  assistantId: string;
}

export const AdvancedAnalyticsDashboard: React.FC<Props> = ({ assistantId }) => {
  const [range, setRange] = useState<Range>("30");
  const [conv, setConv] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [topics, setTopics] = useState<{ topic: string; n: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const since = useMemo(
    () => startOfDay(subDays(new Date(), parseInt(range, 10))).toISOString(),
    [range]
  );

  useEffect(() => {
    if (!assistantId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [c, b, l, k] = await Promise.all([
        supabase.from("conversations").select("created_at,topics").eq("assistant_id", assistantId).gte("created_at", since).limit(1000),
        supabase.from("bookings").select("created_at").eq("assistant_id", assistantId).gte("created_at", since).limit(1000),
        (supabase as any).from("leads").select("created_at").eq("assistant_id", assistantId).gte("created_at", since).limit(1000),
        (supabase as any).from("link_clicks").select("created_at").eq("assistant_id", assistantId).gte("created_at", since).limit(1000),
      ]);
      if (cancelled) return;
      setConv(c.data || []);
      setBookings(b.data || []);
      setLeads(l.data || []);
      setClicks(k.data || []);

      // Topic frequency from conversations.topics (jsonb array if present)
      const counts = new Map<string, number>();
      (c.data || []).forEach((r: any) => {
        const t = r.topics;
        if (Array.isArray(t)) {
          t.forEach((x: any) => {
            const s = String(x).trim().toLowerCase();
            if (s) counts.set(s, (counts.get(s) || 0) + 1);
          });
        }
      });
      const top = Array.from(counts.entries())
        .map(([topic, n]) => ({ topic, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 10);
      setTopics(top);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [assistantId, since]);

  const trend = useMemo(() => {
    const days = parseInt(range, 10);
    const buckets: Record<string, any> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      buckets[d] = { day: d, conversations: 0, bookings: 0, leads: 0, clicks: 0 };
    }
    const add = (rows: any[], key: string) => {
      rows.forEach((r) => {
        const d = format(new Date(r.created_at), "MMM d");
        if (buckets[d]) buckets[d][key] += 1;
      });
    };
    add(conv, "conversations");
    add(bookings, "bookings");
    add(leads, "leads");
    add(clicks, "clicks");
    return Object.values(buckets);
  }, [conv, bookings, leads, clicks, range]);

  const stat = (icon: React.ReactNode, label: string, value: number) => (
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Advanced Analytics
        </h2>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat(<MessageSquare className="w-5 h-5" />, "Conversations", conv.length)}
        {stat(<Calendar className="w-5 h-5" />, "Bookings", bookings.length)}
        {stat(<UserPlus className="w-5 h-5" />, "Leads", leads.length)}
        {stat(<MousePointerClick className="w-5 h-5" />, "Link clicks", clicks.length)}
      </div>

      <Card>
        <CardHeader><CardTitle>Activity trend</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top topics</CardTitle></CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No topic data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, topics.length * 30)}>
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
  );
};

export default AdvancedAnalyticsDashboard;
