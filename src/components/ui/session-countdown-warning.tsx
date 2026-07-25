import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, X, Pause } from 'lucide-react';
import { Card } from './card';
import { Button } from './button';
import { Progress } from './progress';

interface SessionCountdownWarningProps {
  isVisible: boolean;
  type: 'idle' | 'silence';
  initialSeconds: number;
  title?: string;
  message?: string;
  onExtendSession: () => void;
  onPauseSession: () => void;
  onEndSession: () => void;
  className?: string;
}

export const SessionCountdownWarning: React.FC<SessionCountdownWarningProps> = ({
  isVisible,
  type,
  initialSeconds,
  title,
  message,
  onExtendSession,
  onPauseSession,
  onEndSession,
  className = ''
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    setSecondsRemaining(initialSeconds);
    setIsAnimating(true);

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onEndSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, initialSeconds, onEndSession]);

  if (!isVisible) return null;

  const progressPercentage = (secondsRemaining / initialSeconds) * 100;
  const isUrgent = secondsRemaining <= 10;
  const isWarning = secondsRemaining <= 20;

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const getWarningColor = () => {
    if (isUrgent) return 'bg-red-500';
    if (isWarning) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getTextColor = () => {
    if (isUrgent) return 'text-red-600';
    if (isWarning) return 'text-orange-600';
    return 'text-blue-600';
  };

  const getBgColor = () => {
    if (isUrgent) return 'border-red-200 bg-red-50';
    if (isWarning) return 'border-orange-200 bg-orange-50';
    return 'border-blue-200 bg-blue-50';
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in ${className}`}>
      <Card className={`p-4 shadow-lg border-2 ${getBgColor()} ${isAnimating ? 'animate-scale-in' : ''}`}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${getTextColor()} ${isUrgent ? 'animate-pulse' : ''}`} />
              <h3 className={`font-medium ${getTextColor()}`}>
                {title || (type === 'idle' ? 'Session Timeout Warning' : 'Silence Timeout Warning')}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEndSession}
              className="h-6 w-6 p-0 hover:bg-white/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Countdown Display */}
          <div className="text-center space-y-2">
            <div className={`text-2xl font-bold ${getTextColor()} ${isUrgent ? 'animate-pulse' : ''}`}>
              {formatTime(secondsRemaining)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full">
              <Progress 
                value={progressPercentage} 
                className="h-2"
                style={{
                  '--progress-background': getWarningColor()
                } as React.CSSProperties}
              />
            </div>
            
            <p className={`text-sm ${getTextColor()}`}>
              {message || (
                type === 'idle' 
                  ? 'Session will end due to inactivity'
                  : 'Session will pause due to extended silence'
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              onClick={onExtendSession}
              className={`${
                isUrgent 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : isWarning 
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {type === 'idle' ? 'Stay Active' : 'Continue Session'}
            </Button>
            
            {type === 'idle' && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPauseSession}
                className="border-current hover:bg-white/50"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause Instead
              </Button>
            )}
          </div>

          {/* Additional Info */}
          <div className="text-xs text-center text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            {type === 'idle' ? 'Due to no interaction' : 'Due to extended silence'}
          </div>
        </div>
      </Card>
    </div>
  );
};