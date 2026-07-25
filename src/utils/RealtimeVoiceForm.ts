// Audio recorder for capturing microphone input
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onAudioLevel?: (level: number) => void;
  private started = false;

  constructor(
    private onAudioData: (audioData: Float32Array) => void,
    onAudioLevel?: (level: number) => void
  ) {
    this.onAudioLevel = onAudioLevel;
  }

  async start() {
    if (this.started) {
      console.log('🎤 Audio recorder already started');
      return;
    }

    try {
      console.log('🎤 Starting audio recorder...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,  // Enabled for background noise tolerance
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Stream raw mic frames continuously. Server-side VAD (in the edge function)
      // handles turn detection — it needs both speech AND trailing silence to fire
      // speech_stopped → transcription.completed. A local noise gate that drops
      // silence frames starves server VAD and prevents field capture.
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS for UI waveform + local barge-in interrupt detection
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const normalizedLevel = Math.min(1, rms * 3);

        if (this.onAudioLevel) {
          this.onAudioLevel(normalizedLevel);
        }

        // Always forward — browser-level echoCancellation/noiseSuppression/AGC
        // already clean the signal, and server VAD does the turn segmentation.
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.started = true;
      
      console.log('✅ Audio recorder started');
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    console.log('🛑 Stopping audio recorder...');
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.started = false;
  }
}

// Encode Float32Array audio to base64 PCM16
export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

// Create WAV file from PCM data (OpenAI sends little-endian PCM16)
const createWavFromPCM = (pcmData: Uint8Array): Uint8Array => {
  // OpenAI sends PCM16 in little-endian format, convert directly to Int16Array
  const int16Data = new Int16Array(pcmData.buffer.slice(pcmData.byteOffset, pcmData.byteOffset + pcmData.byteLength));
  
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  // WAV header (little-endian format)
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, int16Data.byteLength, true);

  // Combine header and PCM data
  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  console.log('🎵 Created WAV file:', wavArray.byteLength, 'bytes');
  return wavArray;
};

// Audio queue for sequential playback
class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    console.log('🎵 Audio chunk queued. Queue size:', this.queue.length);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      console.log('✅ Audio queue completed');
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      // Ensure AudioContext is running (browser may suspend it)
      if (this.audioContext.state === 'suspended') {
        console.log('▶️ Resuming AudioContext...');
        await this.audioContext.resume();
      }

      const wavData = createWavFromPCM(audioData);
      const buffer = wavData.buffer as ArrayBuffer;
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      this.currentSource = source;
      source.onended = () => {
        console.log('🔊 Audio chunk played');
        this.currentSource = null;
        this.playNext();
      };
      
      source.start(0);
      console.log('🔊 Playing audio chunk:', audioBuffer.duration.toFixed(2), 'seconds');
    } catch (error) {
      console.error('❌ Error playing audio:', error, 'Data length:', audioData.length);
      this.playNext(); // Continue with next chunk
    }
  }

  clear() {
    console.log('🧹🧹🧹 EMERGENCY: Clearing audio queue and stopping playback IMMEDIATELY');
    
    // CRITICAL: Stop current audio FIRST
    if (this.currentSource) {
      try {
        this.currentSource.stop(0); // Stop immediately at time 0
        this.currentSource.disconnect();
        console.log('✅ Stopped currently playing audio source');
      } catch (e) {
        // Already stopped, ignore
        console.log('⚠️ Audio source already stopped');
      }
      this.currentSource = null;
    }
    
    // Clear the entire queue
    const queueLength = this.queue.length;
    this.queue = [];
    this.isPlaying = false;
    
    console.log(`✅ Cleared ${queueLength} pending audio chunks, playback stopped`);
  }
}

// Main Realtime Voice Form class
export class RealtimeVoiceForm {
  private ws: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioQueue | null = null;
  private onMessage: (message: any) => void;
  private onSpeakingChange: (speaking: boolean) => void;
  private onInterrupt?: () => void;
  private onAudioLevel?: (level: number) => void;
  private onInactivityTimeout?: () => void;
  private isMuted: boolean = false;
  private aiSpeaking: boolean = false;
  private localInterruptArmed: boolean = false;
  private lastInterruptSentAt: number = 0;

  // Inactivity auto-disconnect (saves AI credits if user walks away).
  private inactivityTimer: number | null = null;
  private readonly INACTIVITY_MS = 30_000;

  constructor(
    onMessage: (message: any) => void,
    onSpeakingChange: (speaking: boolean) => void,
    onInterrupt?: () => void,
    onAudioLevel?: (level: number) => void,
    onInactivityTimeout?: () => void
  ) {
    this.onMessage = onMessage;
    this.onSpeakingChange = onSpeakingChange;
    this.onInterrupt = onInterrupt;
    this.onAudioLevel = onAudioLevel;
    this.onInactivityTimeout = onInactivityTimeout;
  }

  private resetInactivityTimer = () => {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = window.setTimeout(() => {
      console.log('⏱️ Voice form inactivity timeout — closing session to save credits');
      try { this.onInactivityTimeout?.(); } catch (e) { console.warn(e); }
      this.disconnect();
    }, this.INACTIVITY_MS);
  };

  private clearInactivityTimer() {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private processAudioLevel = (level: number) => {
    this.onAudioLevel?.(level);

    if (this.isMuted) {
      return;
    }

    // Any meaningful speech-level input counts as activity → reset idle timer.
    if (level > 0.02) {
      this.resetInactivityTimer();
    }

    // Reset interrupt arm when the user is quiet again
    if (level < 0.02) {
      this.localInterruptArmed = false;
    }


    if (!this.aiSpeaking) {
      return;
    }

    // User started speaking loudly while AI is talking
    if (level > 0.08) {
      const now = Date.now();
      if (!this.localInterruptArmed || now - this.lastInterruptSentAt > 1200) {
        this.localInterruptArmed = true;
        this.lastInterruptSentAt = now;

        // Stop any audio playback immediately
        this.audioQueue?.clear();
        this.aiSpeaking = false;
        this.onSpeakingChange(false);

        // Tell backend/OpenAI to halt the response right away. Do not clear the
        // input buffer here; doing so can erase the user's interruption/confirmation
        // audio before the server transcribes it.
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'response.cancel' }));
        }

        this.onInterrupt?.();
      }
    }
  };

  async connect(formId: string) {
    try {
      console.log('🔌 Connecting to Realtime Voice Form for formId:', formId);
      
      // Initialize audio context with proper settings
      this.audioContext = new AudioContext({ 
        sampleRate: 24000,
        latencyHint: 'interactive' 
      });
      
      // Resume AudioContext immediately (browsers may suspend it)
      if (this.audioContext.state === 'suspended') {
        console.log('▶️ Resuming AudioContext...');
        await this.audioContext.resume();
      }
      
      this.audioQueue = new AudioQueue(this.audioContext);
      console.log('🎵 Audio system initialized');

      this.recorder = new AudioRecorder(
        (audioData) => {
          if (this.ws?.readyState === WebSocket.OPEN && !this.isMuted) {
            const base64Audio = encodeAudioForAPI(audioData);
            this.ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio
            }));
          }
        },
        this.processAudioLevel
      );

      await this.recorder.start();
      console.log('✅ Microphone capture armed before websocket connection');

      // Connect to WebSocket — include anon key as query param because browsers
      // cannot set custom headers on WebSocket connections and Supabase gateway
      // requires the apikey for edge function routing.
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg";
      const wsUrl = `wss://oujqkygfmyapmrgxmhvt.supabase.co/functions/v1/realtime-voice-form?formId=${formId}&apikey=${SUPABASE_ANON_KEY}`;
      console.log('🔌 Connecting to voice-form edge function...');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('✅ WebSocket connected successfully');
        console.log('✅ Voice form websocket ready; microphone already streaming');
        this.resetInactivityTimer();
      };

      this.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Received event:', data.type);

        // Any meaningful realtime event keeps the session alive.
        if (
          data.type === 'input_audio_buffer.speech_started' ||
          data.type === 'conversation.item.input_audio_transcription.completed' ||
          data.type === 'response.audio.delta' ||
          data.type === 'response.output_audio.delta' ||
          data.type === 'response.done'
        ) {
          this.resetInactivityTimer();
        }


        // Handle audio deltas from AI (support both old and new GA event names)
        if (data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') {
          try {
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            await this.audioQueue!.addToQueue(bytes);
          } catch (err) {
            console.error('❌ Error processing audio delta:', err);
          }
        }

        // Handle user interruption - IMMEDIATE STOP
        if (data.type === 'user_interrupted') {
          console.log('⚠️⚠️⚠️ User interrupted - IMMEDIATELY stopping AI');
          
          // CRITICAL: Clear audio queue FIRST and FAST
          this.audioQueue?.clear();
          
          // Force speaking state to false immediately
          this.onSpeakingChange(false);
          this.aiSpeaking = false;
          this.localInterruptArmed = false;
          
          // Resume AudioContext if suspended (ensures immediate response)
          if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
          }
          
          // Call interrupt callback
          this.onInterrupt?.();
          
          console.log('✅ Audio queue cleared, AI stopped speaking');
        }

        // Handle speaking state changes (support both old and new GA event names)
        if (data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') {
          this.aiSpeaking = true;
          this.onSpeakingChange(true);
        } else if (data.type === 'response.audio.done' || data.type === 'response.output_audio.done') {
          this.aiSpeaking = false;
          this.localInterruptArmed = false;
          this.onSpeakingChange(false);
          console.log('✅ AI finished speaking');
        }

        // Forward all messages to handler for transcript display
        this.onMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.cleanup();
      };

    } catch (error) {
      console.error('❌ Error connecting:', error);
      this.cleanup();
      throw error;
    }
  }

  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending text:', text);
      this.ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text
          }]
        }
      }));
      this.ws.send(JSON.stringify({ type: 'response.create' }));
      this.resetInactivityTimer();
    }
  }


  mute() {
    console.log('🔇 Muting microphone');
    this.isMuted = true;
  }

  unmute() {
    console.log('🔊 Unmuting microphone');
    this.isMuted = false;
  }

  getMuteStatus(): boolean {
    return this.isMuted;
  }

  clearAudioQueue() {
    console.log('🧹 Clearing audio queue due to user interruption');
    this.audioQueue?.clear();
    this.aiSpeaking = false;
    this.localInterruptArmed = false;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'response.cancel' }));
    }
    this.onSpeakingChange(false);
  }

  updateVADThreshold(threshold: number) {
    console.log('🎚️ Updating VAD threshold to:', threshold);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'update_vad_threshold',
        threshold: threshold
      }));
    } else {
      console.error('❌ Cannot update threshold - WebSocket not open');
    }
  }

  disconnect() {
    console.log('👋 Disconnecting...');
    this.cleanup();
  }

  private cleanup() {
    this.clearInactivityTimer();
    this.recorder?.stop();
    this.recorder = null;

    
    this.audioQueue?.clear();
    this.audioQueue = null;
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
