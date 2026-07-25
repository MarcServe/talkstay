// Audio feedback utility for voice interface interactions
export class AudioFeedback {
  private static instance: AudioFeedback;
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private constructor() {
    // Initialize audio context on first user interaction
    this.initializeAudioContext();
  }

  static getInstance(): AudioFeedback {
    if (!AudioFeedback.instance) {
      AudioFeedback.instance = new AudioFeedback();
    }
    return AudioFeedback.instance;
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context on user interaction if it's suspended
      if (this.audioContext.state === 'suspended') {
        document.addEventListener('click', () => {
          this.audioContext?.resume();
        }, { once: true });
      }
    } catch (error) {
      console.warn('Audio feedback not available:', error);
      this.enabled = false;
    }
  }

  private playTone(frequency: number, duration: number, volume: number = 0.1) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play audio feedback:', error);
    }
  }

  // Connection established
  playConnectedSound() {
    this.playTone(880, 0.2, 0.05); // High A note, brief
  }

  // Connection lost
  playDisconnectedSound() {
    this.playTone(220, 0.3, 0.05); // Low A note, longer
  }

  // Microphone activated
  playMicOnSound() {
    this.playTone(660, 0.15, 0.03); // E note, quick
  }

  // Microphone deactivated
  playMicOffSound() {
    this.playTone(440, 0.15, 0.03); // A note, quick
  }

  // Error occurred
  playErrorSound() {
    // Double beep for errors
    this.playTone(300, 0.1, 0.05);
    setTimeout(() => this.playTone(300, 0.1, 0.05), 150);
  }

  // Success/confirmation
  playSuccessSound() {
    // Rising tone for success
    this.playTone(523, 0.1, 0.04); // C
    setTimeout(() => this.playTone(659, 0.1, 0.04), 100); // E
    setTimeout(() => this.playTone(784, 0.15, 0.04), 200); // G
  }

  // Button interaction
  playClickSound() {
    this.playTone(800, 0.05, 0.02); // Very brief, subtle
  }

  // Speech detection started
  playSpeechDetectedSound() {
    this.playTone(1000, 0.1, 0.03); // Brief high tone
  }

  // Enable/disable audio feedback
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Test audio feedback
  playTestSound() {
    this.playSuccessSound();
  }
}

// Export singleton instance
export const audioFeedback = AudioFeedback.getInstance();