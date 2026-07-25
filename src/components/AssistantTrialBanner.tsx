import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, X } from 'lucide-react';
import { useAssistantTrial, formatTrialTimeRemaining } from '@/hooks/useAssistantTrial';
import { cn } from '@/lib/utils';

interface AssistantTrialBannerProps {
  createdAt: string | undefined | null;
  businessName?: string;
  onDismiss?: () => void;
  onBookDemo?: () => void;
  className?: string;
  is_trial?: boolean | null;
  trial_expires_at?: string | null;
}

export const AssistantTrialBanner: React.FC<AssistantTrialBannerProps> = ({
  createdAt,
  businessName,
  onDismiss,
  onBookDemo,
  className = '',
  is_trial,
  trial_expires_at
}) => {
  const trialStatus = useAssistantTrial(createdAt, { is_trial, trial_expires_at });

  // Don't show banner if expired (the overlay will show instead)
  if (trialStatus.isExpired) {
    return null;
  }

  const isUrgent = trialStatus.hoursRemaining < 1;
  const isWarning = trialStatus.hoursRemaining < 6;

  const handleBookDemo = () => {
    if (onBookDemo) {
      onBookDemo();
    } else {
      window.open('https://calendar.app.google/cbkE71koNXVDvW2V8', '_blank');
    }
  };

  return (
    <div className={cn(
      'relative flex items-center justify-between gap-4 px-4 py-3 rounded-lg border',
      isUrgent 
        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
        : isWarning 
          ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
          : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      className
    )}>
      {/* Timer section */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full',
          isUrgent 
            ? 'bg-red-100 dark:bg-red-900/40' 
            : isWarning 
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : 'bg-green-100 dark:bg-green-900/40'
        )}>
          <Clock className={cn(
            'w-5 h-5',
            isUrgent 
              ? 'text-red-600 dark:text-red-400 animate-pulse' 
              : isWarning 
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-green-600 dark:text-green-400'
          )} />
        </div>
        
        <div>
          <p className={cn(
            'text-sm font-medium',
            isUrgent 
              ? 'text-red-700 dark:text-red-300' 
              : isWarning 
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-green-700 dark:text-green-300'
          )}>
            Free Trial: <span className="font-bold">{trialStatus.formattedTimeRemaining}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {isUrgent 
              ? 'Your trial is about to expire! Book a demo to continue.'
              : isWarning 
                ? 'Trial ending soon. Secure your custom plan today!'
                : `Enjoy your 24-hour free trial${businessName ? ` of ${businessName}` : ''}`
            }
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          onClick={handleBookDemo}
          className={cn(
            isUrgent 
              ? 'bg-red-600 hover:bg-red-700' 
              : isWarning 
                ? 'bg-amber-600 hover:bg-amber-700'
                : ''
          )}
        >
          <Calendar className="w-3 h-3 mr-1" />
          Book Demo
        </Button>
        
        {onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
