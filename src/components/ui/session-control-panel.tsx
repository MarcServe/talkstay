import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Pause, 
  Play, 
  RefreshCw, 
  Power, 
  Timer, 
  Activity,
  Settings,
  Shield
} from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { Separator } from './separator';
import { Progress } from './progress';

interface SessionStats {
  lastActivityMs: number;
  currentSilenceMs: number;
  timeUntilIdleTimeoutMs: number;
  timeUntilSilenceTimeoutMs: number | null;
}

interface SessionControlPanelProps {
  isActive: boolean;
  isPaused: boolean;
  sessionStats: SessionStats | null;
  config: {
    idleTimeoutMinutes: number;
    autoStopAfterSilence: boolean;
    silenceTimeoutSeconds: number;
    privacyMode: boolean;
  };
  onExtendSession: () => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onEndSession: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export const SessionControlPanel: React.FC<SessionControlPanelProps> = ({
  isActive,
  isPaused,
  sessionStats,
  config,
  onExtendSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
  onOpenSettings,
  className = ''
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const getProgressPercentage = (remaining: number, total: number) => {
    return Math.max(0, (remaining / total) * 100);
  };

  const getStatusColor = () => {
    if (!isActive) return 'text-muted-foreground';
    if (isPaused) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (!isActive) return 'Disconnected';
    if (isPaused) return 'Paused';
    return 'Active';
  };

  const idleProgress = sessionStats 
    ? getProgressPercentage(sessionStats.timeUntilIdleTimeoutMs, config.idleTimeoutMinutes * 60 * 1000)
    : 100;

  const silenceProgress = sessionStats && sessionStats.timeUntilSilenceTimeoutMs !== null
    ? getProgressPercentage(sessionStats.timeUntilSilenceTimeoutMs, config.silenceTimeoutSeconds * 1000)
    : null;

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${getStatusColor()}`} />
          <span className="font-medium">Session Control</span>
          {config.privacyMode && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Shield className="h-3 w-3 mr-1" />
              Privacy Mode
            </Badge>
          )}
        </div>
        <Badge variant={isActive ? (isPaused ? 'secondary' : 'default') : 'outline'}>
          {getStatusText()}
        </Badge>
      </div>

      <Separator />

      {/* Session Statistics */}
      {sessionStats && isActive && (
        <div className="space-y-3">
          {/* Idle Timeout Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>Idle timeout</span>
              </div>
              <span className="font-medium">
                {formatDuration(sessionStats.timeUntilIdleTimeoutMs)}
              </span>
            </div>
            <Progress 
              value={idleProgress} 
              className="h-2"
              style={{
                '--progress-background': idleProgress < 20 ? '#ef4444' : idleProgress < 50 ? '#f97316' : '#3b82f6'
              } as React.CSSProperties}
            />
          </div>

          {/* Silence Timeout Progress (if enabled) */}
          {config.autoStopAfterSilence && silenceProgress !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Pause className="h-4 w-4 text-muted-foreground" />
                  <span>Silence timeout</span>
                </div>
                <span className="font-medium">
                  {formatDuration(sessionStats.timeUntilSilenceTimeoutMs || 0)}
                </span>
              </div>
              <Progress 
                value={silenceProgress} 
                className="h-2"
                style={{
                  '--progress-background': silenceProgress < 20 ? '#ef4444' : silenceProgress < 50 ? '#f97316' : '#8b5cf6'
                } as React.CSSProperties}
              />
            </div>
          )}

          {/* Last Activity */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Last activity</span>
            </div>
            <span>{formatDuration(sessionStats.lastActivityMs)} ago</span>
          </div>
        </div>
      )}

      <Separator />

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {!isActive ? (
          <>
            <Button
              size="sm"
              onClick={onResumeSession}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Connect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSettings}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </>
        ) : isPaused ? (
          <>
            <Button
              size="sm"
              onClick={onResumeSession}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEndSession}
              className="w-full"
            >
              <Power className="h-4 w-4 mr-2" />
              End
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onExtendSession}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Extend
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onPauseSession}
              className="w-full"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          </>
        )}
      </div>

      {/* Quick Settings */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Idle timeout:</span>
          <span>{config.idleTimeoutMinutes}m</span>
        </div>
        {config.autoStopAfterSilence && (
          <div className="flex justify-between">
            <span>Silence timeout:</span>
            <span>{config.silenceTimeoutSeconds}s</span>
          </div>
        )}
      </div>
    </Card>
  );
};