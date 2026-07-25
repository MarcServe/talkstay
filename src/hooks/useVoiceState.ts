import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceState = 
  | 'idle'          // Connected but not active
  | 'listening'     // Actively listening for user input
  | 'processing'    // Processing user speech
  | 'speaking'      // AI is speaking
  | 'stopped'       // Manually stopped/paused
  | 'disconnected'  // Not connected
  | 'connecting';   // Establishing connection

export interface VoiceActivityState {
  state: VoiceState;
  speechDetected: boolean;
  isConnected: boolean;
  isMuted: boolean;
  isManuallyPaused: boolean;
  lastStateChange: number;
  stateHistory: Array<{ state: VoiceState; timestamp: number; duration?: number }>;
}

export const useVoiceState = () => {
  const [voiceState, setVoiceState] = useState<VoiceActivityState>({
    state: 'disconnected',
    speechDetected: false,
    isConnected: false,
    isMuted: false,
    isManuallyPaused: false,
    lastStateChange: Date.now(),
    stateHistory: []
  });
  
  const stateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onStateChangeRef = useRef<((state: VoiceActivityState) => void) | null>(null);

  // Clear any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (stateTimeoutRef.current) {
        clearTimeout(stateTimeoutRef.current);
      }
    };
  }, []);

  const updateState = useCallback((newState: Partial<VoiceActivityState>) => {
    setVoiceState(prev => {
      const now = Date.now();
      const updatedState = { 
        ...prev, 
        ...newState,
        lastStateChange: now
      };

      // Add to history if state actually changed
      if (newState.state && newState.state !== prev.state) {
        // Calculate duration of previous state
        const previousStateDuration = now - prev.lastStateChange;
        
        // Update the last entry in history with duration
        const updatedHistory = [...prev.stateHistory];
        if (updatedHistory.length > 0) {
          updatedHistory[updatedHistory.length - 1].duration = previousStateDuration;
        }
        
        // Add new state to history
        updatedHistory.push({
          state: newState.state,
          timestamp: now
        });

        // Keep only last 10 state changes
        updatedState.stateHistory = updatedHistory.slice(-10);
      }

      // Call state change callback
      if (onStateChangeRef.current) {
        onStateChangeRef.current(updatedState);
      }

      return updatedState;
    });
  }, []);

  const transitionToState = useCallback((
    newState: VoiceState,
    additionalUpdates?: Partial<VoiceActivityState>,
    delayMs?: number
  ) => {
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
    }

    const doTransition = () => {
      updateState({
        state: newState,
        ...additionalUpdates
      });
    };

    if (delayMs && delayMs > 0) {
      stateTimeoutRef.current = setTimeout(doTransition, delayMs);
    } else {
      doTransition();
    }
  }, [updateState]);

  // Convenience methods for common state transitions
  const connect = useCallback(() => {
    transitionToState('connecting');
  }, [transitionToState]);

  const connected = useCallback(() => {
    transitionToState('idle', { isConnected: true });
  }, [transitionToState]);

  const startListening = useCallback(() => {
    if (!voiceState.isManuallyPaused) {
      transitionToState('listening');
    }
  }, [transitionToState, voiceState.isManuallyPaused]);

  const speechDetected = useCallback((detected: boolean) => {
    updateState({ speechDetected: detected });
  }, [updateState]);

  const startProcessing = useCallback(() => {
    transitionToState('processing', { speechDetected: false });
  }, [transitionToState]);

  const startSpeaking = useCallback(() => {
    transitionToState('speaking');
  }, [transitionToState]);

  const stopSpeaking = useCallback(() => {
    if (!voiceState.isManuallyPaused) {
      transitionToState('listening');
    } else {
      transitionToState('stopped');
    }
  }, [transitionToState, voiceState.isManuallyPaused]);

  const pause = useCallback(() => {
    transitionToState('stopped', { isManuallyPaused: true });
  }, [transitionToState]);

  const resume = useCallback(() => {
    transitionToState('listening', { isManuallyPaused: false });
  }, [transitionToState]);

  const disconnect = useCallback(() => {
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
    }
    transitionToState('disconnected', { 
      isConnected: false, 
      speechDetected: false,
      isManuallyPaused: false,
      isMuted: false
    });
  }, [transitionToState]);

  const mute = useCallback(() => {
    updateState({ isMuted: true });
  }, [updateState]);

  const unmute = useCallback(() => {
    updateState({ isMuted: false });
  }, [updateState]);

  // Get human-readable state description
  const getStateDescription = useCallback(() => {
    const { state, speechDetected, isManuallyPaused, isMuted } = voiceState;
    
    if (isMuted) return "Microphone muted";
    if (isManuallyPaused) return "Session paused";
    
    switch (state) {
      case 'connecting':
        return "Establishing connection...";
      case 'disconnected':
        return "Not connected";
      case 'idle':
        return "Ready to assist";
      case 'listening':
        return speechDetected ? "Listening..." : "Ready to listen";
      case 'processing':
        return "Understanding your message...";
      case 'speaking':
        return "AI is responding...";
      case 'stopped':
        return "Session paused - click to resume";
      default:
        return "Unknown state";
    }
  }, [voiceState]);

  // Subscribe to state changes
  const onStateChange = useCallback((callback: (state: VoiceActivityState) => void) => {
    onStateChangeRef.current = callback;
    
    return () => {
      onStateChangeRef.current = null;
    };
  }, []);

  return {
    voiceState,
    actions: {
      connect,
      connected,
      startListening,
      speechDetected,
      startProcessing,
      startSpeaking,
      stopSpeaking,
      pause,
      resume,
      disconnect,
      mute,
      unmute,
      transitionToState,
      updateState
    },
    getStateDescription,
    onStateChange
  };
};
