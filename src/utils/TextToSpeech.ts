import { supabase } from '@/integrations/supabase/client';

export class TextToSpeech {
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(private onSpeakingChange?: (isSpeaking: boolean) => void) {}

  async speak(text: string, voice: string = 'ballad'): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🔊 TTS: Converting text to speech:', text.substring(0, 50) + '...');
        console.log('🔊 TTS: Using voice:', voice);
        
        // Call text-to-speech edge function
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { text, voice }
        });

        if (error) {
          console.error('❌ TTS: Edge function error:', error);
          reject(error);
          return;
        }

        if (!data?.audioContent) {
          console.error('❌ TTS: No audio content received from edge function');
          reject(new Error('No audio content received'));
          return;
        }

        console.log('✅ TTS: Audio content received, length:', data.audioContent.length);

        // Create audio element from base64 data
        const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        console.log('🎵 TTS: Audio element created, adding to queue');
        
        // Set up promise resolution when this audio finishes
        audio.onended = () => {
          console.log('✅ TTS: Audio playback completed');
          URL.revokeObjectURL(audio.src);
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('❌ TTS: Audio playback error:', error);
          URL.revokeObjectURL(audio.src);
          reject(error);
        };
        
        // Add to queue and play
        this.audioQueue.push(audio);
        
        if (!this.isPlaying) {
          console.log('▶️ TTS: Starting playback');
          await this.playNext();
        } else {
          console.log('⏸️ TTS: Audio queued (currently playing)');
        }

      } catch (error) {
        console.error('❌ TTS: Fatal error:', error);
        reject(error);
      }
    });
  }

  private async playNext(): Promise<void> {
    if (this.audioQueue.length === 0) {
      console.log('🏁 TTS: Queue empty, stopping playback');
      this.isPlaying = false;
      this.onSpeakingChange?.(false);
      return;
    }

    this.isPlaying = true;
    this.onSpeakingChange?.(true);
    console.log('▶️ TTS: Playing next audio chunk, queue length:', this.audioQueue.length);
    
    const audio = this.audioQueue.shift()!;
    this.currentAudio = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        console.log('✅ TTS: Audio chunk completed');
        URL.revokeObjectURL(audio.src);
        this.currentAudio = null;
        resolve();
        this.playNext(); // Play next in queue
      };

      audio.onerror = (error) => {
        console.error('❌ TTS: Audio playback error:', error);
        URL.revokeObjectURL(audio.src);
        this.currentAudio = null;
        resolve();
        this.playNext(); // Continue with next audio
      };

      audio.play().catch(error => {
        console.error('❌ TTS: Failed to play audio:', error);
        this.currentAudio = null;
        resolve();
        this.playNext();
      });
    });
  }

  stop(): void {
    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }

    // Clear queue and revoke URLs
    this.audioQueue.forEach(audio => {
      URL.revokeObjectURL(audio.src);
    });
    this.audioQueue = [];
    
    this.isPlaying = false;
    this.onSpeakingChange?.(false);
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  isSpeaking(): boolean {
    return this.isPlaying;
  }
}
