import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Phone, TrendingUp, MousePointer, Copy, AlertCircle, Calendar } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: {
    assistantId?: string;
    phoneNumber?: string;
    source?: string;
    timestamp?: number;
  };
  created_at: string;
}

interface PhoneMetrics {
  totalDisplays: number;
  totalClicks: number;
  totalCopies: number;
  totalAISuggestions: number;
  clickRate: number;
  copyRate: number;
  eventsByDay: { [key: string]: number };
  eventsByAssistant: { [key: string]: number };
}

export default function AdminCallAnalytics() {
  const [metrics, setMetrics] = useState<PhoneMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7'); // days
  const [assistants, setAssistants] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Load events
      const { data: events, error } = await supabase
        .from('user_analytics')
        .select('*')
        .in('event_type', [
          'phone_number_displayed',
          'phone_number_clicked',
          'phone_number_copied',
          'ai_call_suggested'
        ])
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load assistant names
      const { data: assistantData } = await supabase
        .from('assistants')
        .select('id, business_name');

      const assistantMap: { [key: string]: string } = {};
      assistantData?.forEach(a => {
        assistantMap[a.id] = a.business_name;
      });
      setAssistants(assistantMap);

      // Calculate metrics
      const phoneMetrics = calculateMetrics(events || []);
      setMetrics(phoneMetrics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (events: AnalyticsEvent[]): PhoneMetrics => {
    const displays = events.filter(e => e.event_type === 'phone_number_displayed').length;
    const clicks = events.filter(e => e.event_type === 'phone_number_clicked').length;
    const copies = events.filter(e => e.event_type === 'phone_number_copied').length;
    const suggestions = events.filter(e => e.event_type === 'ai_call_suggested').length;

    const eventsByDay: { [key: string]: number } = {};
    const eventsByAssistant: { [key: string]: number } = {};

    events.forEach(event => {
      // By day
      const day = new Date(event.created_at).toLocaleDateString();
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;

      // By assistant
      const assistantId = event.event_data?.assistantId;
      if (assistantId) {
        eventsByAssistant[assistantId] = (eventsByAssistant[assistantId] || 0) + 1;
      }
    });

    return {
      totalDisplays: displays,
      totalClicks: clicks,
      totalCopies: copies,
      totalAISuggestions: suggestions,
      clickRate: displays > 0 ? (clicks / displays) * 100 : 0,
      copyRate: displays > 0 ? (copies / displays) * 100 : 0,
      eventsByDay,
      eventsByAssistant
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const topAssistants = Object.entries(metrics?.eventsByAssistant || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Call Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Phone number interaction metrics and insights
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Phone Displays</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalDisplays || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total phone number displays
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.clickRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.totalClicks || 0} clicks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Copy Rate</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.copyRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.totalCopies || 0} copies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">AI Suggestions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalAISuggestions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Proactive call suggestions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Activity by Day</CardTitle>
            <CardDescription>Daily phone interaction events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics?.eventsByDay || {})
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 10)
                .map(([day, count]) => (
                  <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">{day}</span>
                    <Badge variant="secondary">{count} events</Badge>
                  </div>
                ))}
              {Object.keys(metrics?.eventsByDay || {}).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No activity data available for this time range
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Assistants */}
        <Card>
          <CardHeader>
            <CardTitle>Top Assistants</CardTitle>
            <CardDescription>Assistants with most phone interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topAssistants.map(([assistantId, count], index) => (
                <div key={assistantId} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {assistants[assistantId] || assistantId}
                    </div>
                    <div className="text-sm text-muted-foreground">{count} interactions</div>
                  </div>
                </div>
              ))}
              {topAssistants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No assistant data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Performance Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics && metrics.clickRate < 10 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Low Click Rate ({metrics.clickRate.toFixed(1)}%)
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  Consider making phone numbers more prominent or improving call-to-action messaging.
                </p>
              </div>
            )}
            {metrics && metrics.totalDisplays > 50 && metrics.clickRate > 20 && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  High Engagement ({metrics.clickRate.toFixed(1)}% click rate)
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Phone feature is performing well! Users are actively clicking to call.
                </p>
              </div>
            )}
            {metrics && metrics.totalAISuggestions > metrics.totalClicks * 2 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  AI Working Hard
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  AI is proactively suggesting calls. Users may need more explicit guidance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
