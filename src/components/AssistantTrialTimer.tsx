import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAssistantTrial } from '@/hooks/useAssistantTrial';
import { cn } from '@/lib/utils';

interface AssistantTrialTimerProps {
  createdAt: string | undefined | null;
  className?: string;
  variant?: 'badge' | 'compact' | 'full';
  is_trial?: boolean | null;
  trial_expires_at?: string | null;
}

export const AssistantTrialTimer: React.FC<AssistantTrialTimerProps> = ({
  createdAt,
  className = '',
  variant = 'badge',
  is_trial,
  trial_expires_at
}) => {
  const trialStatus = useAssistantTrial(createdAt, { is_trial, trial_expires_at });

  // If permanently active (admin activated), show active badge
  if (is_trial === false) {
    return (
      <Badge 
        variant="outline" 
        className={cn('flex items-center gap-1 text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700', className)}
      >
        <CheckCircle className="w-3 h-3" />
        Active
      </Badge>
    );
  }

  if (trialStatus.isExpired) {
    return (
      <Badge 
        variant="destructive" 
        className={cn('flex items-center gap-1', className)}
      >
        <AlertTriangle className="w-3 h-3" />
        Trial Expired
      </Badge>
    );
  }

  const isUrgent = trialStatus.hoursRemaining < 1;
  const isWarning = trialStatus.hoursRemaining < 6;

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-1.5 text-xs font-medium',
        isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600',
        className
      )}>
        <Clock className={cn('w-3 h-3', isUrgent && 'animate-pulse')} />
        <span>{trialStatus.formattedTimeRemaining}</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
        isUrgent 
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
          : isWarning 
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        className
      )}>
        <Clock className={cn('w-4 h-4', isUrgent && 'animate-pulse')} />
        <span>
          Free trial: <strong>{trialStatus.formattedTimeRemaining}</strong>
        </span>
      </div>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1 text-xs',
        isUrgent 
          ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700' 
          : isWarning 
            ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700'
            : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700',
        className
      )}
    >
      <Clock className={cn('w-3 h-3', isUrgent && 'animate-pulse')} />
      {trialStatus.formattedTimeRemaining}
    </Badge>
  );
};
