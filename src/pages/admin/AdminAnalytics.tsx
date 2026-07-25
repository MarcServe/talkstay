import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Activity, Users, MessageSquare, Calendar } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminAnalytics() {
  const { data: analytics, loading, error } = useAdminData('30d');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform performance and user engagement</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform performance and user engagement</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Failed to load analytics data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Monitor platform performance and user engagement</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.current.users}</div>
            <p className="text-xs text-muted-foreground">
              {calculateGrowth(analytics.current.users, analytics.previous.users) >= 0 ? '+' : ''}
              {calculateGrowth(analytics.current.users, analytics.previous.users)}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.current.conversations}</div>
            <p className="text-xs text-muted-foreground">
              {calculateGrowth(analytics.current.conversations, analytics.previous.conversations) >= 0 ? '+' : ''}
              {calculateGrowth(analytics.current.conversations, analytics.previous.conversations)}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bookingConversion.rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.bookingConversion.confirmed} of {analytics.bookingConversion.total} bookings confirmed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.avgResponseTime / 1000).toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              AI processing performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.subscriptionBreakdown.total}</div>
            <p className="text-xs text-muted-foreground">
              Professional: {analytics.subscriptionBreakdown.professional}, Starter: {analytics.subscriptionBreakdown.starter}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.systemHealth.errorRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Error rate - {analytics.systemHealth.aiProcessingHealth} status
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Assistants</CardTitle>
            <CardDescription>Most active assistants by conversation volume</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topAssistants.length > 0 ? (
              <div className="space-y-2">
                {analytics.topAssistants.slice(0, 5).map((assistant, index) => (
                  <div key={assistant.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{assistant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {assistant.conversations} conversations, {assistant.bookings} bookings
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">#{index + 1}</p>
                      {assistant.isTrial && (
                        <p className="text-xs text-orange-600">Trial</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No assistant data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Breakdown</CardTitle>
            <CardDescription>Current subscription distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Professional</span>
                <span className="font-medium">{analytics.subscriptionBreakdown.professional}</span>
              </div>
              <div className="flex justify-between">
                <span>Starter</span>
                <span className="font-medium">{analytics.subscriptionBreakdown.starter}</span>
              </div>
              <div className="flex justify-between">
                <span>Enterprise</span>
                <span className="font-medium">{analytics.subscriptionBreakdown.enterprise}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>{analytics.subscriptionBreakdown.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}