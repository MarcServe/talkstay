import React from 'react';
import { History, Mic, Edit3, Shield, Clock, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MethodUsage {
  method: 'voice' | 'text' | 'secure';
  fieldName: string;
  timestamp: number;
  success: boolean;
  switches: number;
}

interface InputMethodHistoryProps {
  usage: MethodUsage[];
  className?: string;
  showTitle?: boolean;
}

export const InputMethodHistory: React.FC<InputMethodHistoryProps> = ({
  usage,
  className,
  showTitle = true
}) => {
  const getMethodIcon = (method: 'voice' | 'text' | 'secure') => {
    switch (method) {
      case 'voice':
        return <Mic className="h-3 w-3" />;
      case 'text':
        return <Edit3 className="h-3 w-3" />;
      case 'secure':
        return <Shield className="h-3 w-3" />;
    }
  };

  const getMethodColor = (method: 'voice' | 'text' | 'secure') => {
    switch (method) {
      case 'voice':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'text':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'secure':
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const getMethodStats = () => {
    const total = usage.length;
    if (total === 0) return null;

    const voiceCount = usage.filter(u => u.method === 'voice').length;
    const textCount = usage.filter(u => u.method === 'text').length;
    const secureCount = usage.filter(u => u.method === 'secure').length;
    const successRate = usage.filter(u => u.success).length / total;
    const avgSwitches = usage.reduce((acc, u) => acc + u.switches, 0) / total;

    return {
      voice: Math.round((voiceCount / total) * 100),
      text: Math.round((textCount / total) * 100),
      secure: Math.round((secureCount / total) * 100),
      successRate: Math.round(successRate * 100),
      avgSwitches: Math.round(avgSwitches * 10) / 10
    };
  };

  const stats = getMethodStats();

  if (usage.length === 0) return null;

  return (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Input Method Usage
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {/* Usage Statistics */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Success:</span>
              <Badge variant="outline" className="text-xs">
                {stats.successRate}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Avg switches:</span>
              <Badge variant="outline" className="text-xs">
                {stats.avgSwitches}
              </Badge>
            </div>
          </div>
        )}

        {/* Method Distribution */}
        {stats && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-1">Method preferences:</div>
            <div className="flex gap-1">
              {stats.voice > 0 && (
                <Badge className={cn("text-xs", getMethodColor('voice'))}>
                  {getMethodIcon('voice')}
                  <span className="ml-1">{stats.voice}%</span>
                </Badge>
              )}
              {stats.text > 0 && (
                <Badge className={cn("text-xs", getMethodColor('text'))}>
                  {getMethodIcon('text')}
                  <span className="ml-1">{stats.text}%</span>
                </Badge>
              )}
              {stats.secure > 0 && (
                <Badge className={cn("text-xs", getMethodColor('secure'))}>
                  {getMethodIcon('secure')}
                  <span className="ml-1">{stats.secure}%</span>
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Recent Usage */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Recent activity:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {usage.slice(0, 5).map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs px-1 py-0", getMethodColor(item.method))}>
                    {getMethodIcon(item.method)}
                  </Badge>
                  <span className="font-medium">{item.fieldName}</span>
                  {item.switches > 0 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {item.switches} switches
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-2 w-2" />
                  <span>{formatTimeAgo(item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};