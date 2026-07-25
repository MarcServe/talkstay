// PHASE 3: Complete Voice → Transcript → Display Pipeline Tracker

export interface VoiceFlowEvent {
  id: string;
  timestamp: number;
  phase: 'AUDIO_INPUT' | 'WEBRTC_SEND' | 'OPENAI_PROCESS' | 'TRANSCRIPT_RECEIVE' | 'UI_RENDER';
  event: string;
  data: any;
  success: boolean;
  latency?: number;
}

export interface FlowState {
  isRecording: boolean;
  isStreaming: boolean;
  isProcessing: boolean;
  lastUserSpeech: number;
  lastTranscript: number;
  lastUIUpdate: number;
  connectionHealth: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  audioHealth: 'GOOD' | 'POOR' | 'SILENT';
}

class VoiceFlowTracker {
  private events: VoiceFlowEvent[] = [];
  private maxEvents = 200;
  private flowState: FlowState = {
    isRecording: false,
    isStreaming: false,
    isProcessing: false,
    lastUserSpeech: 0,
    lastTranscript: 0,
    lastUIUpdate: 0,
    connectionHealth: 'DISCONNECTED',
    audioHealth: 'SILENT'
  };
  private listeners: ((state: FlowState) => void)[] = [];
  
  // Performance monitoring
  private performanceMetrics = {
    audioToTranscript: [] as number[],
    transcriptToUI: [] as number[],
    totalLatency: [] as number[],
    audioChunks: 0,
    transcriptCount: 0,
    uiUpdates: 0
  };

  /**
   * PHASE 3: Track a complete voice flow event
   */
  trackEvent(phase: VoiceFlowEvent['phase'], event: string, data: any, success: boolean = true) {
    const timestamp = performance.now();
    const flowEvent: VoiceFlowEvent = {
      id: `${phase}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      phase,
      event,
      data,
      success
    };

    // Calculate latency for key transitions
    if (phase === 'TRANSCRIPT_RECEIVE' && this.flowState.lastUserSpeech > 0) {
      flowEvent.latency = timestamp - this.flowState.lastUserSpeech;
      this.performanceMetrics.audioToTranscript.push(flowEvent.latency);
    }

    if (phase === 'UI_RENDER' && this.flowState.lastTranscript > 0) {
      flowEvent.latency = timestamp - this.flowState.lastTranscript;
      this.performanceMetrics.transcriptToUI.push(flowEvent.latency);
    }

    this.events.push(flowEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update flow state
    this.updateFlowState(phase, event, data, timestamp);
    
    // Emit to listeners
    this.notifyListeners();

    // Console logging with enhanced formatting
    const emoji = this.getPhaseEmoji(phase);
    const status = success ? '✅' : '❌';
    console.log(
      `${emoji} PHASE 3 FLOW: ${phase} - ${event} ${status}`,
      { 
        data, 
        latency: flowEvent.latency ? `${flowEvent.latency.toFixed(2)}ms` : 'N/A',
        state: this.flowState 
      }
    );
  }

  /**
   * PHASE 3: Update internal flow state based on events
   */
  private updateFlowState(phase: VoiceFlowEvent['phase'], event: string, data: any, timestamp: number) {
    switch (phase) {
      case 'AUDIO_INPUT':
        if (event === 'speech_started') {
          this.flowState.isRecording = true;
          this.flowState.lastUserSpeech = timestamp;
          this.flowState.audioHealth = 'GOOD';
        } else if (event === 'speech_stopped') {
          this.flowState.isRecording = false;
          this.flowState.isProcessing = true;
        } else if (event === 'audio_chunk') {
          this.performanceMetrics.audioChunks++;
          this.flowState.isStreaming = true;
        }
        break;

      case 'WEBRTC_SEND':
        if (event === 'connected') {
          this.flowState.connectionHealth = 'HEALTHY';
        } else if (event === 'disconnected') {
          this.flowState.connectionHealth = 'DISCONNECTED';
          this.resetFlowState();
        } else if (event === 'error') {
          this.flowState.connectionHealth = 'DEGRADED';
        }
        break;

      case 'OPENAI_PROCESS':
        // Track OpenAI processing events
        break;

      case 'TRANSCRIPT_RECEIVE':
        this.flowState.isProcessing = false;
        this.flowState.lastTranscript = timestamp;
        this.performanceMetrics.transcriptCount++;
        break;

      case 'UI_RENDER':
        this.flowState.lastUIUpdate = timestamp;
        this.performanceMetrics.uiUpdates++;
        break;
    }
  }

  /**
   * PHASE 3: Reset flow state on disconnect
   */
  private resetFlowState() {
    this.flowState.isRecording = false;
    this.flowState.isStreaming = false;
    this.flowState.isProcessing = false;
    this.flowState.audioHealth = 'SILENT';
  }

  /**
   * PHASE 3: Get emoji for phase visualization
   */
  private getPhaseEmoji(phase: VoiceFlowEvent['phase']): string {
    const emojis = {
      AUDIO_INPUT: '🎤',
      WEBRTC_SEND: '📡',
      OPENAI_PROCESS: '🧠',
      TRANSCRIPT_RECEIVE: '📝',
      UI_RENDER: '🖥️'
    };
    return emojis[phase];
  }

  /**
   * PHASE 3: Subscribe to flow state changes
   */
  subscribe(listener: (state: FlowState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * PHASE 3: Notify all listeners of state change
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.flowState });
      } catch (error) {
        console.error('PHASE 3: Error in flow state listener:', error);
      }
    });
  }

  /**
   * PHASE 3: Get recent events by phase
   */
  getRecentEvents(phase?: VoiceFlowEvent['phase'], count: number = 20): VoiceFlowEvent[] {
    let filtered = this.events;
    if (phase) {
      filtered = this.events.filter(e => e.phase === phase);
    }
    return filtered.slice(-count).reverse();
  }

  /**
   * PHASE 3: Get current flow state
   */
  getFlowState(): FlowState {
    return { ...this.flowState };
  }

  /**
   * PHASE 3: Get performance metrics
   */
  getPerformanceMetrics() {
    const avgAudioToTranscript = this.performanceMetrics.audioToTranscript.length > 0
      ? this.performanceMetrics.audioToTranscript.reduce((a, b) => a + b, 0) / this.performanceMetrics.audioToTranscript.length
      : 0;

    const avgTranscriptToUI = this.performanceMetrics.transcriptToUI.length > 0
      ? this.performanceMetrics.transcriptToUI.reduce((a, b) => a + b, 0) / this.performanceMetrics.transcriptToUI.length
      : 0;

    return {
      avgAudioToTranscript: Math.round(avgAudioToTranscript),
      avgTranscriptToUI: Math.round(avgTranscriptToUI),
      totalAudioChunks: this.performanceMetrics.audioChunks,
      totalTranscripts: this.performanceMetrics.transcriptCount,
      totalUIUpdates: this.performanceMetrics.uiUpdates,
      successRate: this.events.length > 0 
        ? Math.round((this.events.filter(e => e.success).length / this.events.length) * 100)
        : 0
    };
  }

  /**
   * PHASE 3: Diagnose flow issues
   */
  diagnoseFlow(): string[] {
    const issues: string[] = [];
    const now = performance.now();

    // Check for stalled recording
    if (this.flowState.isRecording && (now - this.flowState.lastUserSpeech) > 10000) {
      issues.push('Recording stalled - no audio activity for 10+ seconds');
    }

    // Check for stalled processing
    if (this.flowState.isProcessing && (now - this.flowState.lastUserSpeech) > 15000) {
      issues.push('Transcript processing stalled - no response for 15+ seconds');
    }

    // Check connection health
    if (this.flowState.connectionHealth === 'DISCONNECTED') {
      issues.push('WebRTC connection is disconnected');
    } else if (this.flowState.connectionHealth === 'DEGRADED') {
      issues.push('WebRTC connection is degraded');
    }

    // Check for audio issues
    if (this.flowState.audioHealth === 'SILENT' && this.flowState.isRecording) {
      issues.push('No audio input detected while recording');
    }

    return issues;
  }

  /**
   * PHASE 3: Clear all events and reset
   */
  clear() {
    this.events = [];
    this.resetFlowState();
    this.performanceMetrics = {
      audioToTranscript: [],
      transcriptToUI: [],
      totalLatency: [],
      audioChunks: 0,
      transcriptCount: 0,
      uiUpdates: 0
    };
    this.notifyListeners();
    console.log('🧹 PHASE 3: Voice flow tracker cleared');
  }
}

// Export singleton instance
export const voiceFlowTracker = new VoiceFlowTracker();

// Make available globally for debugging
(window as any).voiceFlowTracker = voiceFlowTracker;