// Simplified voice recorder using browser SpeechRecognition API
// Falls back to MediaRecorder + Whisper API when SpeechRecognition is unavailable
import { AudioRecorderFallback } from './AudioRecorderFallback';

export class SimplifiedVoiceRecorder {
  private recognition: SpeechRecognition | null = null;
  private fallbackRecorder: AudioRecorderFallback | null = null;
  private useFallback: boolean = false;
  private isListening: boolean = false;
  private shouldStop: boolean = false;
  private onResult: (text: string) => void;
  private onError: (error: string) => void;
  private onStart: () => void;
  private onEnd: () => void;

  constructor(callbacks: {
    onResult: (text: string) => void;
    onError: (error: string) => void;
    onStart: () => void;
    onEnd: () => void;
  }) {
    this.onResult = callbacks.onResult;
    this.onError = callbacks.onError;
    this.onStart = callbacks.onStart;
    this.onEnd = callbacks.onEnd;

    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.log('🎤 Speech Recognition not supported, using fallback recorder');
      this.useFallback = true;
      this.fallbackRecorder = new AudioRecorderFallback(callbacks);
      return;
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // Enable real-time continuous listening
    this.recognition.continuous = true; // Continuous listening for real-time experience
    this.recognition.interimResults = true; // Show interim results in real-time
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started (real-time mode)');
      
      // Check if we should stop immediately
      if (this.shouldStop) {
        console.log('🎤 Stopping immediately due to shouldStop flag');
        this.forceStop();
        return;
      }
      
      this.isListening = true;
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      console.log('🎤 Recognition result received, processing...');
      
      // Process the last result
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      
      if (lastResult.isFinal) {
        console.log('🎤 Final transcript:', transcript);
        if (transcript.trim()) {
          this.onResult(transcript.trim());
        }
      } else {
        console.log('🎤 Interim transcript:', transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('🎤 Speech recognition error:', {
        error: event.error,
        message: event.message
      });
      
      // Handle specific errors differently
      if (event.error === 'no-speech') {
        console.log('🎤 No speech detected, continuing to listen...');
        return; // Don't stop on no-speech
      }
      
      // Aborted is a normal stop, not an error
      if (event.error === 'aborted') {
        console.log('🎤 Speech recognition aborted (normal stop)');
        this.isListening = false;
        this.shouldStop = true;
        return;
      }
      
      if (event.error === 'audio-capture') {
        this.onError('Microphone access failed. Please check your permissions.');
      } else if (event.error === 'not-allowed') {
        this.onError('Microphone access denied. Please allow microphone access.');
      } else {
        this.onError(`Voice recognition error: ${event.error}`);
      }
      
      this.isListening = false;
      this.shouldStop = true;
    };

    this.recognition.onend = () => {
      console.log('🎤 Speech recognition ended, shouldStop:', this.shouldStop);
      this.isListening = false;
      
      // Auto-restart if not explicitly stopped (for continuous listening)
      if (!this.shouldStop) {
        console.log('🎤 Auto-restarting recognition for continuous listening...');
        setTimeout(() => {
          if (!this.shouldStop && this.recognition) {
            try {
              this.recognition.start();
            } catch (error) {
              console.error('🎤 Error restarting recognition:', error);
            }
          }
        }, 100);
      } else {
        this.onEnd();
      }
    };
  }

  start() {
    // Use fallback recorder if SpeechRecognition is not available
    if (this.useFallback && this.fallbackRecorder) {
      console.log('🎤 Using fallback audio recorder');
      this.fallbackRecorder.start();
      return;
    }

    if (!this.recognition) {
      console.error('🎤 Recognition not initialized');
      this.onError('Voice recognition not available');
      return;
    }
    
    if (this.isListening) {
      console.log('🎤 Already listening, stopping first');
      this.stop();
      return;
    }
    
    this.shouldStop = false;
    console.log('🎤 Starting speech recognition...');
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('🎤 Error starting recognition:', error);
      this.isListening = false;
      this.onError('Failed to start voice recognition');
    }
  }

  stop() {
    // Use fallback recorder if available
    if (this.useFallback && this.fallbackRecorder) {
      console.log('🎤 Stopping fallback audio recorder');
      this.fallbackRecorder.stop();
      return;
    }

    console.log('🎤 Stop called - shouldStop set to true');
    this.shouldStop = true;
    // PRIVACY FIX: Set isListening to false IMMEDIATELY before attempting to stop
    this.isListening = false;
    this.forceStop();
  }

  private forceStop() {
    if (!this.recognition) return;
    
    console.log('🎤 Force stopping speech recognition...');
    
    try {
      // Use abort() for immediate stop, not stop() which waits for processing
      this.recognition.abort();
      this.isListening = false;
    } catch (error) {
      console.error('🎤 Error force stopping recognition:', error);
    }
  }

  isActive() {
    if (this.useFallback && this.fallbackRecorder) {
      return this.fallbackRecorder.isActive();
    }
    return this.isListening && !this.shouldStop;
  }

  isSupported() {
    if (this.useFallback && this.fallbackRecorder) {
      return this.fallbackRecorder.isSupported();
    }
    return !!this.recognition;
  }

  cleanup() {
    console.log('🎤 Cleaning up voice recorder');
    
    if (this.useFallback && this.fallbackRecorder) {
      // Fallback recorder handles its own cleanup
      this.fallbackRecorder = null;
      return;
    }

    this.shouldStop = true;
    this.forceStop();
    this.recognition = null;
  }
}

// Global SpeechRecognition interface extension
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}