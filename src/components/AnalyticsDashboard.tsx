import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Clock,
  BarChart3,
  RefreshCw,
  Calendar
} from "lucide-react";

interface AnalyticsData {
  metrics: {
    totalConversations: number;
    uniqueSessions: number;
    avgMessagesPerSession: number;
    avgResponseLength: number;
  };
  trends: {
    conversationsByDate: Record<string, number>;
    topKeywords: Array<{ word: string; count: number }>;
  };
  assistantComparison: Array<{
    assistant_id: string;
    business_name: string;
    conversation_count: number;
  }>;
}

interface AnalyticsDashboardProps {
  assistantId?: string;
}

export const AnalyticsDashboard = ({ assistantId }: AnalyticsDashboardProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('7d');

  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analytics', {
        body: { assistantId: assistantId || 'all', period }
      });

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, period, assistantId]);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Analytics Dashboard
                {assistantId && <Badge variant="secondary" className="ml-3">Selected Assistant</Badge>}
              </h2>
              <p className="text-muted-foreground">
                {assistantId 
                  ? "Monitor this assistant's performance and engagement"
                  : "Monitor your voice assistants' performance and engagement"
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                      <p className="text-2xl font-bold">{analytics.metrics.totalConversations}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unique Sessions</p>
                      <p className="text-2xl font-bold">{analytics.metrics.uniqueSessions}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Messages/Session</p>
                      <p className="text-2xl font-bold">{analytics.metrics.avgMessagesPerSession}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Response Length</p>
                      <p className="text-2xl font-bold">{analytics.metrics.avgResponseLength}</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                </Card>
              </div>

              {/* Assistant Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {!assistantId && analytics.assistantComparison?.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Assistant Performance
                    </h3>
                    <div className="space-y-4">
                      {analytics.assistantComparison.slice(0, 5).map((assistant, index) => (
                        <div key={assistant.assistant_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="font-medium truncate max-w-[200px]">
                              {assistant.business_name}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{assistant.conversation_count}</p>
                            <p className="text-xs text-muted-foreground">conversations</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Popular Topics
                  </h3>
                  <div className="space-y-3">
                    {analytics.trends.topKeywords?.length > 0 ? (
                      analytics.trends.topKeywords.slice(0, 8).map((keyword, index) => (
                        <div key={keyword.word} className="flex items-center justify-between">
                          <span className="font-medium">{keyword.word.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                          <Badge variant="secondary" className="text-xs">
                            {keyword.count}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No conversation topics yet</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Conversation Trends */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Conversation Trends
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(analytics.trends.conversationsByDate).map(([date, count]) => (
                    <div key={date} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="h-16 bg-primary/10 rounded flex items-end justify-center">
                        <div 
                          className="bg-primary rounded-t w-full transition-all duration-300"
                          style={{ 
                            height: `${Math.max(10, (count / Math.max(...Object.values(analytics.trends.conversationsByDate))) * 100)}%` 
                          }}
                        />
                      </div>
                      <div className="text-xs font-semibold mt-1">{count}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground">
                Start getting conversations with your assistants to see analytics data here.
              </p>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};