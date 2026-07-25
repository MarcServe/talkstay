import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Bot, MessageCircle, Calendar, AlertTriangle, CreditCard, Star, Bell, Activity, Shield, CheckCircle, TrendingUp, XCircle } from "lucide-react";
import { UsageStatsOverview } from "@/components/admin/UsageStatsOverview";

interface DashboardStats {
  total_users: number;
  total_assistants: number;
  total_conversations: number;
  total_bookings: number;
  active_trials: number;
  paid_subscribers: number;
  recent_reviews: number;
  unread_notifications: number;
}

interface SystemHealth {
  api_services: 'operational' | 'degraded' | 'down';
  database: 'operational' | 'degraded' | 'down';
  voice_services: 'operational' | 'degraded' | 'down';
  ai_processing: 'operational' | 'degraded' | 'down';
}

interface TrendData {
  users_trend: number;
  assistants_trend: number;
  conversations_trend: number;
  bookings_trend: number;
  subscribers_trend: number;
}

export function AdminOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('AdminOverview: Fetching dashboard data...');
      
      // Fetch dashboard stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_dashboard_stats');
      
      console.log('AdminOverview: Dashboard stats response:', { statsData, statsError });
      
      if (statsError) {
        console.error('Error fetching dashboard stats:', statsError);
        return;
      }

      setStats(statsData);

      // Fetch system health and trends
      console.log('AdminOverview: Calling admin-analytics function...');
      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke('admin-analytics', {
        body: { period: '30d' }
      });

      console.log('AdminOverview: Analytics response:', { analyticsData, analyticsError });

      if (!analyticsError && analyticsData) {
        // Calculate trends based on analytics data
        const calculatedTrends = calculateTrends(analyticsData);
        console.log('AdminOverview: Calculated trends:', calculatedTrends);
        setTrends(calculatedTrends);
        
        // Determine system health from analytics
        const healthStatus = determineSystemHealth(analyticsData);
        console.log('AdminOverview: System health:', healthStatus);
        setSystemHealth(healthStatus);
      } else {
        console.log('AdminOverview: Analytics failed, performing basic health check...');
        // Fallback system health check
        const healthStatus = await performBasicHealthCheck();
        setSystemHealth(healthStatus);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrends = (analyticsData: any): TrendData => {
    // Calculate month-over-month growth percentages from real data
    const currentData = analyticsData.current || {};
    const previousData = analyticsData.previous || {};
    
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };
    
    return {
      users_trend: calculatePercentageChange(currentData.users || 0, previousData.users || 0),
      assistants_trend: calculatePercentageChange(currentData.assistants || 0, previousData.assistants || 0),
      conversations_trend: calculatePercentageChange(currentData.conversations || 0, previousData.conversations || 0),
      bookings_trend: calculatePercentageChange(currentData.bookings || 0, previousData.bookings || 0),
      subscribers_trend: calculatePercentageChange(currentData.subscribers || 0, previousData.subscribers || 0)
    };
  };

  const determineSystemHealth = (analyticsData: any): SystemHealth => {
    // Analyze system metrics to determine health from real data
    const systemHealth = analyticsData.systemHealth || {};
    const avgResponseTime = systemHealth.avgResponseTime || 0;
    const errorRate = systemHealth.errorRate || 0;
    const voiceServiceHealth = systemHealth.voiceServiceHealth || 'operational';
    const aiProcessingHealth = systemHealth.aiProcessingHealth || 'operational';
    
    return {
      api_services: avgResponseTime < 1000 ? 'operational' : avgResponseTime < 3000 ? 'degraded' : 'down',
      database: errorRate < 5 ? 'operational' : errorRate < 15 ? 'degraded' : 'down',
      voice_services: voiceServiceHealth,
      ai_processing: aiProcessingHealth
    };
  };

  const performBasicHealthCheck = async (): Promise<SystemHealth> => {
    try {
      // Test database connection
      const { error: dbError } = await supabase.from('assistants').select('count').limit(1);
      
      return {
        api_services: 'operational',
        database: dbError ? 'down' : 'operational',
        voice_services: 'operational',
        ai_processing: 'operational'
      };
    } catch (error) {
      return {
        api_services: 'down',
        database: 'down',
        voice_services: 'unknown' as any,
        ai_processing: 'unknown' as any
      };
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    badge 
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    trend?: string;
    badge?: { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        {badge && (
          <Badge variant={badge.variant} className="mt-2">
            {badge.text}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Overview</h1>
          <p className="text-muted-foreground">Welcome to the TalkWeb administration dashboard</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Overview</h1>
          <p className="text-muted-foreground">Welcome to the TalkWeb administration dashboard</p>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            Failed to load dashboard statistics. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground">Welcome to the TalkWeb administration dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.total_users}
          icon={Users}
          trend={trends ? `${trends.users_trend > 0 ? '+' : ''}${trends.users_trend}% from last month` : undefined}
        />
        <StatCard
          title="Active Assistants"
          value={stats.total_assistants}
          icon={Bot}
          trend={trends ? `${trends.assistants_trend > 0 ? '+' : ''}${trends.assistants_trend}% from last month` : undefined}
        />
        <StatCard
          title="Conversations (30d)"
          value={stats.total_conversations}
          icon={MessageCircle}
          trend={trends ? `${trends.conversations_trend > 0 ? '+' : ''}${trends.conversations_trend}% from last month` : undefined}
        />
        <StatCard
          title="Bookings (30d)"
          value={stats.total_bookings}
          icon={Calendar}
          trend={trends ? `${trends.bookings_trend > 0 ? '+' : ''}${trends.bookings_trend}% from last month` : undefined}
        />
        <StatCard
          title="Active Trials"
          value={stats.active_trials}
          icon={Activity}
          badge={{ text: "Active", variant: "default" }}
        />
        <StatCard
          title="Paid Subscribers"
          value={stats.paid_subscribers}
          icon={CreditCard}
          trend={trends ? `${trends.subscribers_trend > 0 ? '+' : ''}${trends.subscribers_trend}% from last month` : undefined}
        />
        <StatCard
          title="Recent Reviews"
          value={stats.recent_reviews}
          icon={Star}
          trend="Last 7 days"
        />
        <StatCard
          title="Unread Notifications"
          value={stats.unread_notifications}
          icon={Bell}
          badge={stats.unread_notifications > 0 ? { text: "Action Required", variant: "destructive" } : { text: "All Clear", variant: "default" }}
        />
      </div>

      {/* Usage Stats Overview */}
      <UsageStatsOverview />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-col gap-2">
              <Link to="/admin/users" className="text-sm text-primary hover:underline">Manage Users</Link>
              <Link to="/admin/assistants" className="text-sm text-primary hover:underline">Review Assistants</Link>
              <Link to="/admin/analytics" className="text-sm text-primary hover:underline">View Analytics</Link>
              <Link to="/admin/system" className="text-sm text-primary hover:underline">System Health</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Platform operational status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemHealth ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Services</span>
                  <StatusBadge status={systemHealth.api_services} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <StatusBadge status={systemHealth.database} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Voice Services</span>
                  <StatusBadge status={systemHealth.voice_services} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Processing</span>
                  <StatusBadge status={systemHealth.ai_processing} />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const StatusBadge = ({ status }: { status: 'operational' | 'degraded' | 'down' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'operational':
        return {
          icon: CheckCircle,
          text: 'Operational',
          variant: 'default' as const,
          className: 'text-green-600'
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          text: 'Degraded',
          variant: 'destructive' as const,
          className: 'text-yellow-600'
        };
      case 'down':
        return {
          icon: XCircle,
          text: 'Down',
          variant: 'destructive' as const,
          className: 'text-red-600'
        };
      default:
        return {
          icon: AlertTriangle,
          text: 'Unknown',
          variant: 'secondary' as const,
          className: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={`h-3 w-3 ${config.className}`} />
      {config.text}
    </Badge>
  );
};