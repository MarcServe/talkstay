import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, Users, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UsageStats {
  total_users: number;
  total_conversations_used: number;
  total_conversations_limit: number;
  users_approaching_limit: number;
  users_at_limit: number;
  average_usage_percentage: number;
}

interface TopUser {
  email: string;
  conversations_used: number;
  conversations_limit: number;
  plan_type: string;
  usage_percentage: number;
}

export function UsageStatsOverview() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      // Fetch all usage data
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*');

      if (usageError) throw usageError;

      if (usageData && usageData.length > 0) {
        // Calculate overall stats
        const totalUsers = usageData.length;
        const totalConversationsUsed = usageData.reduce((sum, u) => sum + u.conversations_used, 0);
        const totalConversationsLimit = usageData.reduce((sum, u) => sum + u.conversations_limit, 0);
        
        const usersApproachingLimit = usageData.filter(
          u => (u.conversations_used / u.conversations_limit) >= 0.8 && 
               (u.conversations_used / u.conversations_limit) < 1
        ).length;
        
        const usersAtLimit = usageData.filter(
          u => u.conversations_used >= u.conversations_limit
        ).length;

        const averageUsagePercentage = usageData.reduce(
          (sum, u) => sum + (u.conversations_used / u.conversations_limit) * 100, 
          0
        ) / totalUsers;

        setStats({
          total_users: totalUsers,
          total_conversations_used: totalConversationsUsed,
          total_conversations_limit: totalConversationsLimit,
          users_approaching_limit: usersApproachingLimit,
          users_at_limit: usersAtLimit,
          average_usage_percentage: Math.round(averageUsagePercentage),
        });

        // Get top 5 users by usage percentage
        const sortedUsers = usageData
          .map(u => ({
            email: u.email,
            conversations_used: u.conversations_used,
            conversations_limit: u.conversations_limit,
            plan_type: u.plan_type,
            usage_percentage: Math.round((u.conversations_used / u.conversations_limit) * 100),
          }))
          .sort((a, b) => b.usage_percentage - a.usage_percentage)
          .slice(0, 5);

        setTopUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No usage data available yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversation Usage Overview
          </CardTitle>
          <CardDescription>
            Platform-wide conversation limits and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.total_users}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Conversations Used</p>
              <p className="text-2xl font-bold">{stats.total_conversations_used.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                of {stats.total_conversations_limit.toLocaleString()} total
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Average Usage</p>
              <p className="text-2xl font-bold">{stats.average_usage_percentage}%</p>
              <Progress value={stats.average_usage_percentage} className="h-2" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Limit Alerts</p>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{stats.users_at_limit} at limit</Badge>
                <Badge variant="secondary">{stats.users_approaching_limit} near limit</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Users by Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Users by Usage
          </CardTitle>
          <CardDescription>
            Users with highest conversation usage this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsers.map((user, index) => (
              <div key={user.email} className="flex items-center justify-between space-x-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.conversations_used} / {user.conversations_limit} conversations
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user.plan_type === 'enterprise' ? 'default' : 'secondary'}>
                    {user.plan_type}
                  </Badge>
                  <div className="w-24">
                    <Progress value={user.usage_percentage} className="h-2" />
                  </div>
                  <span className={`text-sm font-medium w-12 text-right ${
                    user.usage_percentage >= 100 ? 'text-destructive' :
                    user.usage_percentage >= 80 ? 'text-yellow-600' :
                    'text-muted-foreground'
                  }`}>
                    {user.usage_percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
