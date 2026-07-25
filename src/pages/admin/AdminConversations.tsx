import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, TrendingUp, Clock, Users, Bot, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationStats {
  totalConversations: number;
  recentConversations: number;
  avgResponseTime: number;
  successRate: number;
  topAssistants: Array<{
    id: string;
    business_name: string;
    conversationCount: number;
  }>;
}

export function AdminConversations() {
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversationStats = async () => {
      try {
        // Get total conversations
        const { count: totalConversations } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true });

        // Get recent conversations (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: recentConversations } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo);

        // Get average response time
        const { data: responseTimes } = await supabase
          .from('conversations')
          .select('response_time_ms')
          .not('response_time_ms', 'is', null);

        const avgResponseTime = responseTimes?.length > 0 
          ? responseTimes.reduce((sum, conv) => sum + (conv.response_time_ms || 0), 0) / responseTimes.length
          : 0;

        // Calculate success rate (conversations without error indicators)
        const { data: allConversations } = await supabase
          .from('conversations')
          .select('ai_response')
          .gte('created_at', sevenDaysAgo)
          .limit(500);

        const errorConversations = allConversations?.filter(conv => 
          conv.ai_response?.toLowerCase().includes('error') ||
          conv.ai_response?.toLowerCase().includes('sorry, i') ||
          conv.ai_response?.toLowerCase().includes('unable')
        ) || [];

        const successRate = allConversations?.length > 0 
          ? ((allConversations.length - errorConversations.length) / allConversations.length) * 100
          : 0;

        // Get top assistants by conversation count
        const { data: assistantStats } = await supabase
          .from('assistants')
          .select(`
            id,
            business_name,
            conversations:conversations(count)
          `);

        const topAssistants = assistantStats
          ?.map(assistant => ({
            id: assistant.id,
            business_name: assistant.business_name,
            conversationCount: assistant.conversations?.[0]?.count || 0
          }))
          .sort((a, b) => b.conversationCount - a.conversationCount)
          .slice(0, 5) || [];

        setStats({
          totalConversations: totalConversations || 0,
          recentConversations: recentConversations || 0,
          avgResponseTime,
          successRate,
          topAssistants
        });
      } catch (error) {
        console.error('Error fetching conversation stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversation Analytics</h1>
          <p className="text-muted-foreground">Monitor conversations and interaction patterns</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conversation Analytics</h1>
        <p className="text-muted-foreground">Monitor conversations and interaction patterns</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConversations}</div>
            <p className="text-xs text-muted-foreground">+{stats?.recentConversations} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgResponseTime ? (stats.avgResponseTime / 1000).toFixed(1) : '0'}s
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.avgResponseTime || 0) < 2000 ? 'Excellent' : (stats?.avgResponseTime || 0) < 5000 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {(stats?.successRate || 0) > 90 ? 'Excellent performance' : 'Room for improvement'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Assistants</CardTitle>
            <CardDescription>Assistants with the most conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topAssistants.length ? (
              <div className="space-y-3">
                {stats.topAssistants.map((assistant, index) => (
                  <div key={assistant.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{assistant.business_name}</p>
                        <p className="text-sm text-muted-foreground">#{index + 1} most active</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{assistant.conversationCount}</p>
                      <p className="text-xs text-muted-foreground">conversations</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No conversation data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Real-time conversation insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Average Processing Speed</span>
                </div>
                <span className="font-medium">
                  {stats?.avgResponseTime ? (stats.avgResponseTime / 1000).toFixed(1) : '0'}s
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Weekly Activity</span>
                </div>
                <span className="font-medium">{stats?.recentConversations} conversations</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Success Rate</span>
                </div>
                <span className="font-medium">{stats?.successRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}