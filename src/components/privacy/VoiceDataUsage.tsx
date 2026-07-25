import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, Mic, MessageCircle, Download, Trash2, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VoiceUsageData {
  totalSessions: number;
  totalDuration: number; // in minutes
  totalMessages: number;
  voiceMessages: number;
  textMessages: number;
  averageSessionDuration: number;
  lastSessionDate: Date | null;
  currentMonth: {
    sessions: number;
    duration: number;
    messages: number;
  };
  dailyUsage: Array<{
    date: string;
    sessions: number;
    duration: number;
    messages: number;
  }>;
}

export const VoiceDataUsage: React.FC = () => {
  const [usageData, setUsageData] = useState<VoiceUsageData | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, [timeframe]);

  const loadUsageData = async () => {
    setLoading(true);
    
    // Simulate API call - replace with actual data fetching
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockData: VoiceUsageData = {
      totalSessions: 23,
      totalDuration: 147, // minutes
      totalMessages: 156,
      voiceMessages: 89,
      textMessages: 67,
      averageSessionDuration: 6.4, // minutes
      lastSessionDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      currentMonth: {
        sessions: 15,
        duration: 98,
        messages: 102
      },
      dailyUsage: [
        { date: '2024-01-20', sessions: 2, duration: 12, messages: 8 },
        { date: '2024-01-21', sessions: 1, duration: 8, messages: 5 },
        { date: '2024-01-22', sessions: 3, duration: 18, messages: 12 },
        { date: '2024-01-23', sessions: 1, duration: 6, messages: 4 },
        { date: '2024-01-24', sessions: 2, duration: 15, messages: 9 },
        { date: '2024-01-25', sessions: 4, duration: 24, messages: 16 },
        { date: '2024-01-26', sessions: 2, duration: 14, messages: 10 }
      ]
    };

    setUsageData(mockData);
    setLoading(false);
  };

  const exportUsageData = () => {
    if (!usageData) return;

    const exportData = {
      exportDate: new Date().toISOString(),
      timeframe,
      ...usageData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-usage-data-${timeframe}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No usage data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voice Data Usage</h2>
          <p className="text-muted-foreground">Track your voice interaction statistics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={(value: '7d' | '30d' | 'all') => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportUsageData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Sessions</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{usageData.totalSessions}</span>
              <p className="text-xs text-muted-foreground">
                {usageData.currentMonth.sessions} this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Duration</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{formatDuration(usageData.totalDuration)}</span>
              <p className="text-xs text-muted-foreground">
                Avg: {formatDuration(usageData.averageSessionDuration)} per session
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Messages</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{usageData.totalMessages}</span>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {usageData.voiceMessages} voice
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {usageData.textMessages} text
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Last Session</span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold">
                {usageData.lastSessionDate ? formatRelativeTime(usageData.lastSessionDate) : 'Never'}
              </span>
              <p className="text-xs text-muted-foreground">
                Voice interaction
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice vs Text Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Method</CardTitle>
          <CardDescription>Distribution of voice vs text interactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Voice Messages</span>
              </div>
              <span className="text-sm font-bold">{usageData.voiceMessages}</span>
            </div>
            <Progress 
              value={(usageData.voiceMessages / usageData.totalMessages) * 100} 
              className="h-2"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Text Messages</span>
              </div>
              <span className="text-sm font-bold">{usageData.textMessages}</span>
            </div>
            <Progress 
              value={(usageData.textMessages / usageData.totalMessages) * 100} 
              className="h-2"
            />
          </div>
          
          <div className="flex justify-center pt-2">
            <span className="text-sm text-muted-foreground">
              {Math.round((usageData.voiceMessages / usageData.totalMessages) * 100)}% voice, {' '}
              {Math.round((usageData.textMessages / usageData.totalMessages) * 100)}% text
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
          <CardDescription>Your voice interaction patterns over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageData.dailyUsage.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-20 text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{day.sessions} sessions</span>
                    <span>{formatDuration(day.duration)}</span>
                  </div>
                  <Progress value={(day.duration / 30) * 100} className="h-1" />
                </div>
                <div className="w-16 text-sm text-muted-foreground text-right">
                  {day.messages} msgs
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};