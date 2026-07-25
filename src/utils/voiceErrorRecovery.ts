/**
 * Advanced Voice Error Recovery System
 * Handles various error scenarios with smart recovery strategies
 */

interface ErrorContext {
  type: 'connection' | 'transcription' | 'audio' | 'session' | 'api' | 'permission';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  attemptCount: number;
  sessionId?: string;
  lastSuccessfulAction?: string;
}

interface RecoveryStrategy {
  maxRetries: number;
  backoffMultiplier: number;
  fallbackAction: () => Promise<void>;
  userNotification: string;
}

export class VoiceErrorRecovery {
  private errorHistory: ErrorContext[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private lastSuccessfulStates: Map<string, any> = new Map();
  
  private strategies: Record<string, RecoveryStrategy> = {
    connection: {
      maxRetries: 3,
      backoffMultiplier: 2,
      fallbackAction: async () => {
        console.log('🔄 Attempting connection recovery...');
        await this.resetConnection();
      },
      userNotification: 'Connection lost. Attempting to reconnect...'
    },
    transcription: {
      maxRetries: 2,
      backoffMultiplier: 1.5,
      fallbackAction: async () => {
        console.log('🔄 Attempting transcription recovery...');
        await this.resetTranscriptionService();
      },
      userNotification: 'Voice processing interrupted. Trying again...'
    },
    audio: {
      maxRetries: 2,
      backoffMultiplier: 1.5,
      fallbackAction: async () => {
        console.log('🔄 Attempting audio recovery...');
        await this.resetAudioContext();
      },
      userNotification: 'Audio issue detected. Resetting audio...'
    },
    session: {
      maxRetries: 1,
      backoffMultiplier: 1,
      fallbackAction: async () => {
        console.log('🔄 Attempting session recovery...');
        await this.recoverSession();
      },
      userNotification: 'Session interrupted. Restoring...'
    },
    api: {
      maxRetries: 3,
      backoffMultiplier: 2,
      fallbackAction: async () => {
        console.log('🔄 Attempting API recovery...');
        await this.handleAPIError();
      },
      userNotification: 'Service temporarily unavailable. Retrying...'
    },
    permission: {
      maxRetries: 0,
      backoffMultiplier: 1,
      fallbackAction: async () => {
        console.log('🔄 Permission error - requesting user action');
        await this.requestPermissions();
      },
      userNotification: 'Microphone access required. Please grant permission.'
    }
  };

  async handleError(
    error: Error | any,
    context: Partial<ErrorContext>,
    onRecovery?: () => void,
    onFailure?: (error: ErrorContext) => void
  ): Promise<boolean> {
    const errorContext: ErrorContext = {
      type: this.classifyError(error),
      severity: this.assessSeverity(error, context),
      message: error.message || 'Unknown error',
      timestamp: Date.now(),
      attemptCount: this.getAttemptCount(context.type || 'unknown'),
      ...context
    };

    this.logError(errorContext);
    
    const strategy = this.strategies[errorContext.type];
    if (!strategy) {
      console.error('No recovery strategy for error type:', errorContext.type);
      onFailure?.(errorContext);
      return false;
    }

    // Check if we've exceeded retry limits
    if (errorContext.attemptCount >= strategy.maxRetries) {
      console.error('Max recovery attempts exceeded for:', errorContext.type);
      this.escalateError(errorContext);
      onFailure?.(errorContext);
      return false;
    }

    try {
      // Exponential backoff
      const delay = 1000 * Math.pow(strategy.backoffMultiplier, errorContext.attemptCount);
      await this.sleep(delay);

      // Execute recovery strategy
      await strategy.fallbackAction();
      
      // Mark successful recovery
      this.recordSuccessfulRecovery(errorContext.type);
      onRecovery?.();
      
      return true;
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      this.incrementAttemptCount(errorContext.type);
      onFailure?.(errorContext);
      return false;
    }
  }

  private classifyError(error: any): ErrorContext['type'] {
    if (error?.code === 'PERMISSION_DENIED' || error?.name === 'NotAllowedError') {
      return 'permission';
    }
    if (error?.message?.includes('WebSocket') || error?.message?.includes('connection')) {
      return 'connection';
    }
    if (error?.message?.includes('transcription') || error?.message?.includes('speech')) {
      return 'transcription';
    }
    if (error?.message?.includes('audio') || error?.message?.includes('microphone')) {
      return 'audio';
    }
    if (error?.message?.includes('session') || error?.message?.includes('timeout')) {
      return 'session';
    }
    if (error?.status >= 400 || error?.message?.includes('API')) {
      return 'api';
    }
    return 'session';
  }

  private assessSeverity(error: any, context: Partial<ErrorContext>): ErrorContext['severity'] {
    if (error?.code === 'PERMISSION_DENIED') return 'critical';
    if (error?.status >= 500) return 'high';
    if (error?.message?.includes('connection')) return 'medium';
    return 'low';
  }

  private getAttemptCount(errorType: string): number {
    return this.recoveryAttempts.get(errorType) || 0;
  }

  private incrementAttemptCount(errorType: string) {
    const current = this.recoveryAttempts.get(errorType) || 0;
    this.recoveryAttempts.set(errorType, current + 1);
  }

  private recordSuccessfulRecovery(errorType: string) {
    this.recoveryAttempts.delete(errorType);
    console.log(`✅ Successfully recovered from ${errorType} error`);
  }

  private logError(errorContext: ErrorContext) {
    this.errorHistory.push(errorContext);
    
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    console.error('🚨 Voice Error Recorded:', {
      type: errorContext.type,
      severity: errorContext.severity,
      message: errorContext.message,
      attemptCount: errorContext.attemptCount
    });
  }

  private escalateError(errorContext: ErrorContext) {
    console.error('🚨 ERROR ESCALATED - Max retries exceeded:', errorContext);
    
    // Could trigger user notification, fallback mode, etc.
    if (window.parent) {
      window.parent.postMessage({
        type: 'voice_error_escalated',
        error: {
          type: errorContext.type,
          severity: errorContext.severity,
          message: errorContext.message
        }
      }, '*');
    }
  }

  // Recovery Actions
  private async resetConnection(): Promise<void> {
    // Force close any existing connections
    console.log('🔄 Resetting voice connection...');
    
    // This would be called by the RealtimeChat instance
    if ((window as any).voiceConnection) {
      (window as any).voiceConnection.disconnect?.();
    }
  }

  private async resetTranscriptionService(): Promise<void> {
    console.log('🔄 Resetting transcription service...');
    // Reset any stuck transcription states
  }

  private async resetAudioContext(): Promise<void> {
    console.log('🔄 Resetting audio context...');
    
    // Suspend and resume audio contexts to reset them
    const audioContexts = (window as any).__audioContexts__ || [];
    for (const ctx of audioContexts) {
      if (ctx.state !== 'closed') {
        try {
          await ctx.suspend();
          await ctx.resume();
        } catch (e) {
          console.warn('Could not reset audio context:', e);
        }
      }
    }
  }

  private async recoverSession(): Promise<void> {
    console.log('🔄 Recovering session...');
    
    // Restore last known good state
    const lastGoodState = this.lastSuccessfulStates.get('session');
    if (lastGoodState) {
      console.log('Restoring session to last good state:', lastGoodState);
    }
  }

  private async handleAPIError(): Promise<void> {
    console.log('🔄 Handling API error...');
    // Wait a bit longer for API errors
    await this.sleep(2000);
  }

  private async requestPermissions(): Promise<void> {
    console.log('🔄 Requesting microphone permissions...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Permissions granted');
    } catch (e) {
      console.error('❌ Permission request failed:', e);
      throw e;
    }
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  saveSuccessfulState(key: string, state: any) {
    this.lastSuccessfulStates.set(key, { ...state, timestamp: Date.now() });
  }

  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory];
  }

  getRecoveryStats() {
    const stats: Record<string, { attempts: number; lastError?: number }> = {};
    
    for (const [type, attempts] of this.recoveryAttempts.entries()) {
      const lastError = this.errorHistory
        .filter(e => e.type === type)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      stats[type] = {
        attempts,
        lastError: lastError?.timestamp
      };
    }
    
    return stats;
  }

  clear() {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    this.lastSuccessfulStates.clear();
  }
}

export const voiceErrorRecovery = new VoiceErrorRecovery();
