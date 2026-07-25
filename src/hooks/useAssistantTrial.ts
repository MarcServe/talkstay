import { useState, useEffect, useMemo } from 'react';

interface AssistantTrialStatus {
  isWithinTrialPeriod: boolean;
  isExpired: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  totalSecondsRemaining: number;
  formattedTimeRemaining: string;
  createdAt: Date | null;
  expiresAt: Date | null;
}

const TRIAL_HOURS = 168; // 7 days

interface UseAssistantTrialOptions {
  is_trial?: boolean | null;
  trial_expires_at?: string | null;
}

export const useAssistantTrial = (
  createdAt: string | undefined | null,
  options?: UseAssistantTrialOptions
): AssistantTrialStatus => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const trialStatus = useMemo((): AssistantTrialStatus => {
    // If admin has explicitly activated this assistant (is_trial = false),
    // it's permanently active - no expiry
    if (options?.is_trial === false) {
      return {
        isWithinTrialPeriod: false,
        isExpired: false,
        hoursRemaining: 999,
        minutesRemaining: 0,
        secondsRemaining: 0,
        totalSecondsRemaining: 999 * 3600,
        formattedTimeRemaining: 'Active',
        createdAt: createdAt ? new Date(createdAt) : null,
        expiresAt: null,
      };
    }

    // If admin has set a custom trial_expires_at, use that instead of created_at + 24h
    if (options?.trial_expires_at) {
      const expiresAt = new Date(options.trial_expires_at);
      const diffMs = expiresAt.getTime() - currentTime.getTime();

      if (diffMs <= 0) {
        return {
          isWithinTrialPeriod: false,
          isExpired: true,
          hoursRemaining: 0,
          minutesRemaining: 0,
          secondsRemaining: 0,
          totalSecondsRemaining: 0,
          formattedTimeRemaining: '00:00:00',
          createdAt: createdAt ? new Date(createdAt) : null,
          expiresAt,
        };
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        isWithinTrialPeriod: true,
        isExpired: false,
        hoursRemaining: hours,
        minutesRemaining: minutes,
        secondsRemaining: seconds,
        totalSecondsRemaining: totalSeconds,
        formattedTimeRemaining: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        createdAt: createdAt ? new Date(createdAt) : null,
        expiresAt,
      };
    }

    // Default: use created_at + 24h fallback
    if (!createdAt) {
      return {
        isWithinTrialPeriod: false,
        isExpired: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
        secondsRemaining: 0,
        totalSecondsRemaining: 0,
        formattedTimeRemaining: '00:00:00',
        createdAt: null,
        expiresAt: null,
      };
    }

    const createdDate = new Date(createdAt);
    const expiresAt = new Date(createdDate.getTime() + TRIAL_HOURS * 60 * 60 * 1000);
    const diffMs = expiresAt.getTime() - currentTime.getTime();

    if (diffMs <= 0) {
      return {
        isWithinTrialPeriod: false,
        isExpired: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
        secondsRemaining: 0,
        totalSecondsRemaining: 0,
        formattedTimeRemaining: '00:00:00',
        createdAt: createdDate,
        expiresAt,
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedTimeRemaining = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return {
      isWithinTrialPeriod: true,
      isExpired: false,
      hoursRemaining: hours,
      minutesRemaining: minutes,
      secondsRemaining: seconds,
      totalSecondsRemaining: totalSeconds,
      formattedTimeRemaining,
      createdAt: createdDate,
      expiresAt,
    };
  }, [createdAt, currentTime, options?.is_trial, options?.trial_expires_at]);

  return trialStatus;
};

// Helper to format remaining time in human readable format
export const formatTrialTimeRemaining = (status: AssistantTrialStatus): string => {
  if (status.isExpired) {
    return 'Trial expired';
  }

  const { hoursRemaining, minutesRemaining } = status;

  if (hoursRemaining > 0) {
    return `${hoursRemaining}h ${minutesRemaining}m remaining`;
  }

  if (minutesRemaining > 0) {
    return `${minutesRemaining}m remaining`;
  }

  return 'Less than a minute remaining';
};
