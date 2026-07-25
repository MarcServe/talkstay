import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MessageSquare,
  Calendar,
  Phone,
  RefreshCw,
  Download,
  Users,
  Mic,
  Link2,
  ExternalLink,
} from "lucide-react";
import { useUnifiedAnalytics } from "@/hooks/useUnifiedAnalytics";
import { RecentContactClicks } from "@/components/RecentContactClicks";
import { exportToCSV, formatOverviewDataForExport } from "@/utils/exportAnalytics";
import { useToast } from "@/hooks/use-toast";

// WhatsApp icon as inline SVG component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface UnifiedAnalyticsDashboardProps {
  assistantId: string;
}

export const UnifiedAnalyticsDashboard = ({ assistantId }: UnifiedAnalyticsDashboardProps) => {
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("bookings");
  const { analytics, loading, refresh } = useUnifiedAnalytics(assistantId, timeRange);
  const { toast } = useToast();

  const handleExport = () => {
    if (!analytics) {
      toast({
        title: "No data to export",
        description: "Please wait for analytics to load",
        variant: "destructive",
      });
      return;
    }

    const exportData = formatOverviewDataForExport(analytics);
    exportToCSV(exportData, `analytics_overview_${assistantId}`);
    
    toast({
      title: "Export successful",
      description: "Analytics data has been downloaded as CSV",
    });
  };

  if (!assistantId) {
    return (
      <Card variant="dashboardCard">
        <CardContent className="py-8 text-center text-muted-foreground">
          Please select an assistant to view analytics.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card variant="dashboardCard">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  const COLORS = {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    success: "hsl(142, 71%, 45%)",
    warning: "hsl(38, 92%, 50%)",
    info: "hsl(221, 83%, 53%)",
    muted: "hsl(var(--muted))",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of conversations, bookings, and engagement
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleExport} title="Export to CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Top-level metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card variant="aiCyan" className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("conversations")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.totalConversations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.engagement.uniqueSessions || 0} unique sessions
            </p>
          </CardContent>
        </Card>

        <Card variant="aiBlue" className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("bookings")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.totalBookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.overview.bookingCompletionRate || 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card variant="aiPrimary" className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("links")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.linkClicks?.totalClicks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tracked outbound clicks
            </p>
          </CardContent>
        </Card>

        <Card variant="dashboardCard" className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("engagement")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp Requests</CardTitle>
            <WhatsAppIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.whatsappRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users who requested WhatsApp
            </p>
          </CardContent>
        </Card>

        <Card variant="dashboardCard" className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("engagement")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Call Clicks</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.phoneCallClicks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users who clicked to call
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="dashboardCard">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Messages/Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.engagement.avgMessagesPerSession || 0}</div>
          </CardContent>
        </Card>

        <Card variant="dashboardCard">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unique Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.engagement.uniqueSessions || 0}</div>
          </CardContent>
        </Card>

        <Card variant="dashboardCard">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Voice Form Submissions</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.voiceFormSubmissions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - 2 tabs only */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-1">
          <TabsTrigger value="bookings" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />Bookings
          </TabsTrigger>
          <TabsTrigger value="engagement" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 data-[state=active]:border-b-2 data-[state=active]:border-violet-500">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-500" />Engagement
          </TabsTrigger>
          <TabsTrigger value="conversations" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400 data-[state=active]:border-b-2 data-[state=active]:border-sky-500">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-500" />Conversations
          </TabsTrigger>
          <TabsTrigger value="links" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-b-2 data-[state=active]:border-amber-500">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />Links
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 data-[state=active]:border-b-2 data-[state=active]:border-rose-500">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500" />Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Status Distribution</CardTitle>
              <CardDescription>Overview of booking statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { status: "Pending", count: analytics?.bookings.pending || 0 },
                    { status: "Confirmed", count: analytics?.bookings.confirmed || 0 },
                    { status: "Completed", count: analytics?.bookings.completed || 0 },
                    { status: "Cancelled", count: analytics?.bookings.cancelled || 0 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" tick={{ fill: "hsl(var(--foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.bookings.pending || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.bookings.confirmed || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.bookings.completed || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.bookings.completionRate || 0}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Conversations and bookings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={analytics?.monthlyTrends || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="conversations" stroke={COLORS.primary} strokeWidth={2} />
                  <Line type="monotone" dataKey="bookings" stroke={COLORS.info} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Keywords</CardTitle>
              <CardDescription>Most common topics in conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analytics?.engagement.topKeywords?.slice(0, 10).map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword.word.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ({keyword.count})
                  </Badge>
                ))}
                {(!analytics?.engagement.topKeywords || analytics.engagement.topKeywords.length === 0) && (
                  <p className="text-sm text-muted-foreground">No keyword data available yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW: Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Conversations</CardTitle>
              <CardDescription>Conversation volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.dailyConversations && analytics.dailyConversations.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analytics.dailyConversations}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" name="Conversations" fill={COLORS.info} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No conversation data available for this period</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.overview.totalConversations || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Response Length</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.avgResponseLength || 0}</div>
                <p className="text-xs text-muted-foreground">characters per response</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={analytics?.overview.conversationGrowth === 'growing' ? 'default' : 'secondary'}>
                  {analytics?.overview.conversationGrowth === 'growing' ? '↑ Growing' : analytics?.overview.conversationGrowth === 'declining' ? '↓ Declining' : '→ Stable'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NEW: Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>From conversations to completed bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const totalConv = analytics?.overview.totalConversations || 0;
                  const totalBook = analytics?.overview.totalBookings || 0;
                  const completed = analytics?.bookings.completed || 0;
                  const bookRate = totalConv > 0 ? Math.round((totalBook / totalConv) * 100) : 0;
                  const completeRate = totalBook > 0 ? Math.round((completed / totalBook) * 100) : 0;
                  return (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Conversations</span>
                          <span className="text-muted-foreground">{totalConv}</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Bookings</span>
                          <span className="text-muted-foreground">{totalBook} ({bookRate}%)</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(bookRate, 2)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Completed</span>
                          <span className="text-muted-foreground">{completed} ({completeRate}%)</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.max(totalConv > 0 ? Math.round((completed / totalConv) * 100) : 0, 2)}%` }} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Most Asked Topics - ranked list */}
          <Card>
            <CardHeader>
              <CardTitle>Most Asked Topics</CardTitle>
              <CardDescription>Common topics and phrases from user conversations</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.engagement.topKeywords && analytics.engagement.topKeywords.length > 0 ? (
                <div className="space-y-2">
                  {analytics.engagement.topKeywords.slice(0, 15).map((keyword, index) => {
                    const maxCount = analytics.engagement.topKeywords[0]?.count || 1;
                    const widthPercent = Math.max((keyword.count / maxCount) * 100, 8);
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5 text-right">{index + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="font-medium">{keyword.word.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                            <span className="text-muted-foreground">{keyword.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/70" style={{ width: `${widthPercent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No keyword data available yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings mini-table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Last 5 bookings received</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.recentBookings && analytics.recentBookings.length > 0 ? (
                <div className="space-y-2">
                  {analytics.recentBookings.map((booking, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{booking.name}</p>
                        <p className="text-xs text-muted-foreground">{booking.date}</p>
                      </div>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'completed' ? 'secondary' : 'outline'}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Link Analytics Tab */}
        <TabsContent value="links" className="space-y-4">
          {/* Total Clicks + Clicks by Source */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Total Link Clicks
                </CardTitle>
                <CardDescription>All tracked outbound link clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{analytics?.linkClicks?.totalClicks || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clicks by Source</CardTitle>
                <CardDescription>Where clicks originated</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.linkClicks?.bySource && analytics.linkClicks.bySource.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.linkClicks.bySource.map((item, index) => {
                      const maxCount = analytics.linkClicks.bySource[0]?.count || 1;
                      const widthPercent = Math.max((item.count / maxCount) * 100, 8);
                      const sourceLabels: Record<string, string> = {
                        voice_navigation: '🎤 Voice Navigation',
                        text_navigation: '💬 Text Navigation',
                        whatsapp_redirect: '💬 WhatsApp',
                        phone_redirect: '📞 Phone Call',
                      };
                      return (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{sourceLabels[item.source] || item.source}</span>
                            <span className="text-muted-foreground">{item.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/70" style={{ width: `${widthPercent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No click data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent contact clicks (WhatsApp + Phone) with follow-up details */}
          <RecentContactClicks assistantId={assistantId} timeRange={timeRange} />

          {/* Clicks Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Link Clicks Over Time</CardTitle>
              <CardDescription>Daily click volume</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.linkClicks?.dailyClicks && analytics.linkClicks.dailyClicks.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analytics.linkClicks.dailyClicks}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" name="Clicks" fill={COLORS.info} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No click data available for this period</p>
              )}
            </CardContent>
          </Card>

          {/* Top Clicked Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Top Clicked Links
              </CardTitle>
              <CardDescription>Most popular outbound links</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.linkClicks?.topLinks && analytics.linkClicks.topLinks.length > 0 ? (
                <div className="space-y-2">
                  {analytics.linkClicks.topLinks.slice(0, 15).map((link, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-medium truncate">{link.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <Badge variant="secondary">{link.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No link click data yet</p>
              )}
            </CardContent>
          </Card>

          {/* UTM Campaign Breakdown */}
          {analytics?.linkClicks?.utmCampaigns && analytics.linkClicks.utmCampaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>UTM Campaign Performance</CardTitle>
                <CardDescription>Clicks grouped by UTM campaign parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.linkClicks.utmCampaigns.map((utm, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{utm.campaign}</p>
                        <p className="text-xs text-muted-foreground">
                          {utm.source && `Source: ${utm.source}`}
                          {utm.medium && ` · Medium: ${utm.medium}`}
                        </p>
                      </div>
                      <Badge variant="default">{utm.count} clicks</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
