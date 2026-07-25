// Simplified transcript state management utility

export interface TranscriptState {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  isTranscribing?: boolean;
  source?: 'voice' | 'text';
  timestamp?: string;
}

export class TranscriptStateManager {
  /**
   * Create a new user transcript entry
   */
  static createUserTranscript(): TranscriptState {
    return {
      id: `user-temp-${Date.now()}`,
      text: '🎤 Speaking...',
      sender: 'user',
      isTranscribing: true,
      source: 'voice',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Complete transcript with final text
   */
  static completeTranscript(transcript: TranscriptState, finalText: string): TranscriptState {
    if (!finalText || finalText.trim().length === 0) {
      return {
        ...transcript,
        text: '🔇 No speech detected',
        isTranscribing: false
      };
    }
    
    return {
      ...transcript,
      text: finalText.trim(),
      isTranscribing: false,
      id: `user-voice-${Date.now()}`
    };
  }

  /**
   * Handle transcript failure
   */
  static failTranscript(transcript: TranscriptState): TranscriptState {
    return {
      ...transcript,
      text: '❌ Speech recognition failed',
      isTranscribing: false
    };
  }
}
