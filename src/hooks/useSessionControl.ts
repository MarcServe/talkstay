import { useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface SessionControlConfig {
  idleTimeoutMinutes: number;
  autoStopAfterSilence: boolean;
  silenceTimeoutSeconds: number;
  sessionAutoResume: boolean;
  privacyMode: boolean;
}

interface SessionControlCallbacks {
  onIdleTimeout: () => void;
  onSilenceTimeout: () => void;
  onSessionWarning: (secondsRemaining: number, type: 'idle' | 'silence') => void;
  onAutoResume?: () => void;
}

export const useSessionControl = (
  config: SessionControlConfig,
  callbacks: SessionControlCallbacks,
  isActive: boolean = false
) => {
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const silenceStartRef = useRef<number | null>(null);
  
  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  // Reset idle timeout
  const resetIdleTimeout = useCallback(() => {
    if (!isActive) return;
    
    clearAllTimeouts();
    lastActivityRef.current = Date.now();
    
    const timeoutMs = config.idleTimeoutMinutes * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 30000, timeoutMs * 0.8); // Warning 30s before or at 80% of timeout
    
    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      const remaining = Math.ceil((timeoutMs - (Date.now() - lastActivityRef.current)) / 1000);
      if (remaining > 0) {
        callbacks.onSessionWarning(remaining, 'idle');
        
        if (config.privacyMode) {
          toast.warning(`Session will end in ${remaining} seconds due to inactivity`, {
            action: {
              label: "Stay Active",
              onClick: () => resetIdleTimeout()
            }
          });
        }
      }
    }, warningMs);
    
    // Set idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      console.log('Session idle timeout reached');
      callbacks.onIdleTimeout();
      
      if (config.privacyMode) {
        toast.info('Session ended due to inactivity for privacy protection');
      } else {
        toast.info('Session ended due to inactivity');
      }
    }, timeoutMs);
  }, [isActive, config.idleTimeoutMinutes, config.privacyMode, callbacks, clearAllTimeouts]);

  // Start silence tracking
  const startSilenceTracking = useCallback(() => {
    if (!isActive || !config.autoStopAfterSilence) return;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    silenceStartRef.current = Date.now();
    const timeoutMs = config.silenceTimeoutSeconds * 1000;
    const warningMs = Math.max(timeoutMs - 10000, timeoutMs * 0.7); // Warning 10s before or at 70%
    
    // Set silence warning timeout
    const silenceWarningTimeoutRef = setTimeout(() => {
      const remaining = Math.ceil((timeoutMs - (Date.now() - silenceStartRef.current!)) / 1000);
      if (remaining > 0) {
        callbacks.onSessionWarning(remaining, 'silence');
      }
    }, warningMs);
    
    silenceTimeoutRef.current = setTimeout(() => {
      console.log('Silence timeout reached');
      callbacks.onSilenceTimeout();
      
      if (config.privacyMode) {
        toast.info('Voice session paused due to extended silence for privacy protection', {
          action: config.sessionAutoResume ? {
            label: "Resume",
            onClick: () => callbacks.onAutoResume?.()
          } : undefined
        });
      } else {
        toast.info('Voice session paused due to extended silence');
      }
    }, timeoutMs);
  }, [isActive, config.autoStopAfterSilence, config.silenceTimeoutSeconds, config.privacyMode, config.sessionAutoResume, callbacks]);

  // Stop silence tracking
  const stopSilenceTracking = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    silenceStartRef.current = null;
  }, []);

  // Register activity (speech, interaction, etc.)
  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    resetIdleTimeout();
    stopSilenceTracking();
  }, [resetIdleTimeout, stopSilenceTracking]);

  // Register voice activity specifically
  const registerVoiceActivity = useCallback((isUserSpeaking: boolean) => {
    if (isUserSpeaking) {
      registerActivity();
      stopSilenceTracking();
    } else {
      // User stopped speaking, start silence tracking
      startSilenceTracking();
    }
  }, [registerActivity, startSilenceTracking, stopSilenceTracking]);

  // Pause session (manual or automatic)
  const pauseSession = useCallback(() => {
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  // Resume session
  const resumeSession = useCallback(() => {
    if (config.sessionAutoResume || !config.privacyMode) {
      resetIdleTimeout();
    }
  }, [config.sessionAutoResume, config.privacyMode, resetIdleTimeout]);

  // Get session statistics
  const getSessionStats = useCallback(() => {
    const now = Date.now();
    const idleTime = now - lastActivityRef.current;
    const silenceTime = silenceStartRef.current ? now - silenceStartRef.current : 0;
    
    return {
      lastActivityMs: idleTime,
      currentSilenceMs: silenceTime,
      timeUntilIdleTimeoutMs: Math.max(0, (config.idleTimeoutMinutes * 60 * 1000) - idleTime),
      timeUntilSilenceTimeoutMs: config.autoStopAfterSilence && silenceStartRef.current 
        ? Math.max(0, (config.silenceTimeoutSeconds * 1000) - silenceTime)
        : null
    };
  }, [config.idleTimeoutMinutes, config.autoStopAfterSilence, config.silenceTimeoutSeconds]);

  // Initialize session control when active
  useEffect(() => {
    if (isActive) {
      resetIdleTimeout();
    } else {
      clearAllTimeouts();
    }
    
    return () => {
      clearAllTimeouts();
    };
  }, [isActive, resetIdleTimeout, clearAllTimeouts]);

  return {
    registerActivity,
    registerVoiceActivity,
    pauseSession,
    resumeSession,
    resetIdleTimeout,
    startSilenceTracking,
    stopSilenceTracking,
    getSessionStats,
    clearAllTimeouts
  };
};