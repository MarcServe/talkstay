import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Wifi, 
  Zap, 
  HardDrive, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Monitor
} from 'lucide-react';
import { voicePerformanceMonitor } from '@/utils/voicePerformanceMonitor';
import { cn } from '@/lib/utils';

interface PerformanceMonitorProps {
  className?: string;
  compact?: boolean;
  showRecommendations?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className,
  compact = false,
  showRecommendations = true
}) => {
  const [metrics, setMetrics] = useState(voicePerformanceMonitor.getMetrics());
  const [report, setReport] = useState(voicePerformanceMonitor.getPerformanceReport());
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    const unsubscribe = voicePerformanceMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      setReport(voicePerformanceMonitor.getPerformanceReport());
    });

    return unsubscribe;
  }, []);

  const getStatusColor = (value: number, threshold: number, reversed = false) => {
    const isGood = reversed ? value < threshold : value > threshold;
    if (isGood) return 'text-emerald-600';
    if (Math.abs(value - threshold) < threshold * 0.2) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusIcon = (value: number, threshold: number, reversed = false) => {
    const isGood = reversed ? value < threshold : value > threshold;
    if (isGood) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (Math.abs(value - threshold) < threshold * 0.2) return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  if (compact && !isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn("gap-2", className)}
      >
        <Monitor className="w-4 h-4" />
        Performance: {report.healthScore}%
        {report.healthScore > 80 ? (
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
      </Button>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Voice Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={report.healthScore > 80 ? 'default' : report.healthScore > 60 ? 'secondary' : 'destructive'}
              className="px-3 py-1"
            >
              Health Score: {report.healthScore}%
            </Badge>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="p-1"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Connection Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wifi className="w-4 h-4" />
              Connection
            </div>
            <div className={cn("text-lg font-bold", getStatusColor(metrics.connectionTime, 5000, true))}>
              {formatDuration(metrics.connectionTime)}
            </div>
            <div className="flex items-center gap-1">
              {getStatusIcon(metrics.connectionTime, 5000, true)}
              <span className="text-xs text-muted-foreground">&lt; 5s target</span>
            </div>
          </div>

          {/* Transcription Latency */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="w-4 h-4" />
              Transcription
            </div>
            <div className={cn("text-lg font-bold", getStatusColor(metrics.transcriptionLatency, 2000, true))}>
              {formatDuration(metrics.transcriptionLatency)}
            </div>
            <div className="flex items-center gap-1">
              {getStatusIcon(metrics.transcriptionLatency, 2000, true)}
              <span className="text-xs text-muted-foreground">&lt; 2s target</span>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="w-4 h-4" />
              Memory
            </div>
            <div className={cn("text-lg font-bold", getStatusColor(metrics.memoryUsage, 100, true))}>
              {metrics.memoryUsage}MB
            </div>
            <div className="flex items-center gap-1">
              {getStatusIcon(metrics.memoryUsage, 100, true)}
              <span className="text-xs text-muted-foreground">&lt; 100MB target</span>
            </div>
          </div>

          {/* Session Duration */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Session
            </div>
            <div className="text-lg font-bold">
              {formatDuration(metrics.sessionDuration)}
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Audio Buffer Health</span>
              <span className={cn("font-medium", getStatusColor(metrics.audioBufferHealth, 50))}>
                {metrics.audioBufferHealth}%
              </span>
            </div>
            <Progress value={metrics.audioBufferHealth} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Network Quality</span>
              <span className={cn("font-medium", getStatusColor(metrics.networkQuality, 70))}>
                {metrics.networkQuality}%
              </span>
            </div>
            <Progress value={metrics.networkQuality} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Error Rate</span>
              <span className={cn("font-medium", getStatusColor(metrics.errorRate, 10, true))}>
                {metrics.errorRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(metrics.errorRate, 20) * 5} className="h-2" />
          </div>
        </div>

        {/* Recommendations */}
        {showRecommendations && report.recommendations.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Optimization Recommendations
            </h4>
            <div className="space-y-1">
              {report.recommendations.slice(0, 3).map((recommendation, index) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Events */}
        {report.recentEvents.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Recent Events</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {report.recentEvents.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {event.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDuration(Date.now() - event.timestamp)} ago
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};