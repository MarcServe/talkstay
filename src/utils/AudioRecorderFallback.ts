// Cross-browser audio recorder fallback for browsers without SpeechRecognition
// Uses MediaRecorder API + OpenAI Whisper for transcription
import { supabase } from '@/integrations/supabase/client';

export class AudioRecorderFallback {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
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
  }

  async start() {
    if (this.isRecording) {
      console.log('🎤 Already recording');
      return;
    }

    try {
      console.log('🎤 Starting MediaRecorder audio capture...');
      
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...');
        await this.processAudio();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('🎤 MediaRecorder error:', event);
        this.onError('Recording error occurred');
        this.cleanup();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.onStart();
      console.log('🎤 MediaRecorder started');

    } catch (error) {
      console.error('🎤 Error starting audio capture:', error);
      this.onError('Failed to access microphone');
      this.cleanup();
    }
  }

  stop() {
    console.log('🎤 Stop called on MediaRecorder');
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  private async processAudio() {
    if (this.audioChunks.length === 0) {
      console.log('🎤 No audio data recorded');
      this.onError('No audio was recorded');
      this.cleanup();
      return;
    }

    try {
      // Create blob from chunks
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      
      console.log('🎤 Audio blob created:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      // Convert to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      console.log('🎤 Sending audio to transcription service...');
      
      // Send to voice-to-text edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) {
        console.error('🎤 Transcription error:', error);
        throw error;
      }

      const transcript = data?.text?.trim();
      
      if (transcript) {
        console.log('🎤 Transcription result:', transcript);
        this.onResult(transcript);
      } else {
        console.log('🎤 No speech detected in audio');
        this.onError('No speech detected');
      }

    } catch (error) {
      console.error('🎤 Error processing audio:', error);
      this.onError('Failed to transcribe audio');
    } finally {
      this.cleanup();
      this.onEnd();
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
    this.mediaRecorder = null;
    this.isRecording = false;
  }

  isActive() {
    return this.isRecording;
  }

  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }
}
