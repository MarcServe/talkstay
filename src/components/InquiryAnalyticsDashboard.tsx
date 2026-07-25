import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Target,
  Users,
  Calendar,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { InquiryKanbanBoard } from "./InquiryKanbanBoard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface InquiryAnalyticsDashboardProps {
  assistantId: string;
}

export const InquiryAnalyticsDashboard = ({ assistantId }: InquiryAnalyticsDashboardProps) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const { toast } = useToast();

  useEffect(() => {
    if (assistantId) {
      loadAnalytics();
    }
  }, [assistantId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      let dateFilter = new Date(0); // Default: all time
      const now = new Date();

      switch (timeRange) {
        case "7d":
          dateFilter = subDays(now, 7);
          break;
        case "30d":
          dateFilter = subDays(now, 30);
          break;
        case "90d":
          dateFilter = subDays(now, 90);
          break;
      }

      // Fetch all inquiries
      const { data: inquiries, error } = await supabase
        .from("project_inquiries")
        .select("*")
        .eq("assistant_id", assistantId)
        .gte("created_at", dateFilter.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Calculate analytics
      const total = inquiries?.length || 0;
      const won = inquiries?.filter((i) => i.status === "won").length || 0;
      const lost = inquiries?.filter((i) => i.status === "lost").length || 0;
      const pending = inquiries?.filter((i) => 
        ["new", "contacted", "quoted"].includes(i.status)
      ).length || 0;

      // Calculate total potential revenue
      const totalRevenue = inquiries?.reduce((sum, inquiry) => {
        if (inquiry.matched_services && Array.isArray(inquiry.matched_services)) {
          const inquiryValue = inquiry.matched_services.reduce(
            (serviceSum: number, service: any) => serviceSum + (service.base_price || 0),
            0
          );
          return sum + inquiryValue;
        }
        return sum;
      }, 0) || 0;

      // Calculate won revenue
      const wonRevenue = inquiries
        ?.filter((i) => i.status === "won")
        .reduce((sum, inquiry) => {
          if (inquiry.matched_services && Array.isArray(inquiry.matched_services)) {
            const inquiryValue = inquiry.matched_services.reduce(
              (serviceSum: number, service: any) => serviceSum + (service.base_price || 0),
              0
            );
            return sum + inquiryValue;
          }
          return sum;
        }, 0) || 0;

      // Calculate average response time
      const responseTimes = inquiries
        ?.filter((i) => i.status !== "new" && i.updated_at !== i.created_at)
        .map((i) => {
          const created = new Date(i.created_at).getTime();
          const updated = new Date(i.updated_at).getTime();
          return (updated - created) / (1000 * 60 * 60); // Convert to hours
        }) || [];

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      // Group by service category
      const byCategory: Record<string, { count: number; value: number; won: number }> = {};
      inquiries?.forEach((inquiry) => {
        if (inquiry.matched_services && Array.isArray(inquiry.matched_services)) {
          inquiry.matched_services.forEach((service: any) => {
            const category = service.service_category || "Uncategorized";
            if (!byCategory[category]) {
              byCategory[category] = { count: 0, value: 0, won: 0 };
            }
            byCategory[category].count++;
            byCategory[category].value += service.base_price || 0;
            if (inquiry.status === "won") {
              byCategory[category].won++;
            }
          });
        }
      });

      // Group by month for trend
      const byMonth: Record<string, number> = {};
      inquiries?.forEach((inquiry) => {
        const month = format(new Date(inquiry.created_at), "MMM yyyy");
        byMonth[month] = (byMonth[month] || 0) + 1;
      });

      // Conversion funnel
      const funnel = {
        total: total,
        new: inquiries?.filter((i) => i.status === "new").length || 0,
        contacted: inquiries?.filter((i) => i.status === "contacted").length || 0,
        quoted: inquiries?.filter((i) => i.status === "quoted").length || 0,
        won: won,
        lost: lost,
      };

      setAnalytics({
        total,
        won,
        lost,
        pending,
        conversionRate: total > 0 ? ((won / total) * 100).toFixed(1) : "0",
        totalRevenue,
        wonRevenue,
        avgResponseTime: avgResponseTime.toFixed(1),
        byCategory,
        byMonth,
        funnel,
        inquiries,
      });
    } catch (error: any) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!assistantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inquiry Analytics</CardTitle>
          <CardDescription>Please select an assistant to view analytics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  const getCurrency = () => {
    const firstInquiry = analytics?.inquiries?.find(
      (i: any) => i.matched_services?.[0]?.price_currency
    );
    return firstInquiry?.matched_services?.[0]?.price_currency || "GBP";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inquiry Analytics</h2>
          <p className="text-muted-foreground">
            Track performance and conversion metrics
          </p>
        </div>
        <Tabs value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Inquiries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics?.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.won || 0} won / {analytics?.lost || 0} lost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {getCurrency()} {(analytics?.wonRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {getCurrency()} {(analytics?.totalRevenue || 0).toLocaleString()} potential
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics?.avgResponseTime}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Time to first update
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
          <CardDescription>Visual breakdown of inquiries by stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { stage: "New", count: analytics?.funnel?.new || 0, color: "#eab308" },
                { stage: "Contacted", count: analytics?.funnel?.contacted || 0, color: "#a855f7" },
                { stage: "Quoted", count: analytics?.funnel?.quoted || 0, color: "#f97316" },
                { stage: "Won", count: analytics?.funnel?.won || 0, color: "#22c55e" },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="stage" 
                className="text-sm"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis 
                className="text-sm"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales Pipeline Kanban */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <CardDescription>Drag and drop inquiries to manage their status</CardDescription>
        </CardHeader>
        <CardContent>
          <InquiryKanbanBoard 
            inquiries={analytics?.inquiries || []} 
            onStatusChange={loadAnalytics}
          />
        </CardContent>
      </Card>

      {/* By Service Category */}
      {Object.keys(analytics?.byCategory || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Service Category</CardTitle>
            <CardDescription>Inquiries and revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics?.byCategory || {})
                .sort(([, a]: any, [, b]: any) => b.value - a.value)
                .map(([category, data]: any) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} inquiries • {data.won} won
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {getCurrency()} {data.value.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.count > 0
                            ? ((data.won / data.count) * 100).toFixed(0)
                            : 0}% conversion
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {Object.keys(analytics?.byMonth || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>Inquiry volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics?.byMonth || {}).map(([month, count]: any) => (
                <div key={month} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{month}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${(count / Math.max(...(Object.values(analytics.byMonth) as number[]))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
