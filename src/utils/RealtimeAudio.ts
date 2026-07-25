import { supabase } from "@/integrations/supabase/client";
import { voiceFlowTracker } from './VoiceFlowTracker';

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isListening: boolean = false;
  private isPaused: boolean = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      voiceFlowTracker.trackEvent('AUDIO_INPUT', 'microphone_request', { sampleRate: 24000 });
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      voiceFlowTracker.trackEvent('AUDIO_INPUT', 'microphone_granted', { 
        tracks: this.stream.getTracks().length 
      }, true);
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Noise gate: track consecutive frames above speech threshold
      let sustainedSpeechFrames = 0;
      const SPEECH_THRESHOLD = 0.04; // RMS gate — higher to ignore TV/background chatter
      const MIN_SPEECH_FRAMES = 3; // Require ~3 consecutive frames to confirm speech

      this.processor.onaudioprocess = (e) => {
        if (this.isListening && !this.isPaused) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate RMS audio level for noise gate
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);

          // Noise gate: only send audio if sustained speech is detected
          if (rms >= SPEECH_THRESHOLD) {
            sustainedSpeechFrames++;
          } else {
            if (sustainedSpeechFrames > 0 && rms < SPEECH_THRESHOLD * 0.5) {
              sustainedSpeechFrames = Math.max(0, sustainedSpeechFrames - 1);
            }
          }

          if (sustainedSpeechFrames < MIN_SPEECH_FRAMES) {
            return; // Below noise floor, don't send
          }
          
          voiceFlowTracker.trackEvent('AUDIO_INPUT', 'audio_chunk', {
            bufferSize: inputData.length,
            sampleRate: this.audioContext?.sampleRate,
            isActive: this.isListening && !this.isPaused
          });
          
          this.onAudioData(new Float32Array(inputData));
        }
      };
      
      this.source.connect(this.processor);
      console.log('AudioRecorder started');
      
      voiceFlowTracker.trackEvent('AUDIO_INPUT', 'recorder_ready', {
        contextState: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      }, true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      voiceFlowTracker.trackEvent('AUDIO_INPUT', 'microphone_error', { 
        error: error.message 
      }, false);
      throw error;
    }
  }

  startListening() {
    console.log('AudioRecorder: Starting to listen');
    this.isListening = true;
    this.isPaused = false;
  }

  pauseListening() {
    console.log('AudioRecorder: Pausing listening');
    this.isPaused = true;
  }

  resumeListening() {
    console.log('AudioRecorder: Resuming listening');
    this.isPaused = false;
  }

  mute() {
    console.log('AudioRecorder: Muting (stopping audio data)');
    this.isListening = false;
  }

  unmute() {
    console.log('AudioRecorder: Unmuting (starting audio data)');
    this.isListening = true;
    this.isPaused = false;
  }

  getState() {
    return {
      isListening: this.isListening,
      isPaused: this.isPaused,
      isActive: this.isListening && !this.isPaused
    };
  }

  forceStop() {
    console.log('Emergency microphone shutdown');
    
    try {
      if (this.stream) {
        console.log('Stopping microphone tracks...');
        this.stream.getTracks().forEach(track => {
          track.enabled = false;
          track.stop();
        });
        this.stream = null;
      }

      // CRITICAL: Try to stop ANY other active streams globally
      if (navigator.mediaDevices?.getUserMedia) {
        // Create a new stream and immediately stop it to force release of browser mic access
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(newStream => {
            console.log('🔇 EMERGENCY: Stopping any remaining browser audio streams...');
            newStream.getTracks().forEach(track => {
              track.enabled = false;
              track.stop();
            });
          })
          .catch(() => console.log('🔇 EMERGENCY: No additional streams found'));
      }

      // CRITICAL: Immediately suspend audio context 
      if (this.audioContext && this.audioContext.state !== 'closed') {
        console.log('🔊 EMERGENCY: Immediately suspending AudioContext...');
        this.audioContext.suspend();
        
        // Force close after short delay
        setTimeout(() => {
          if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
              this.audioContext.close();
            } catch (e) {}
          }
        }, 10);
        
        this.audioContext = null;
      }
      
      // CRITICAL: Disconnect all audio nodes immediately
      if (this.source) {
        console.log('🔌 EMERGENCY: Disconnecting audio source...');
        try {
          this.source.disconnect();
        } catch (e) {}
        this.source = null;
      }
      
      if (this.processor) {
        console.log('🔌 EMERGENCY: Disconnecting audio processor...');
        try {
          this.processor.onaudioprocess = null;
          this.processor.disconnect();
        } catch (e) {}
        this.processor = null;
      }
      
      // Reset all flags immediately
      this.isListening = false;
      this.isPaused = false;
      
      console.log('✅ EMERGENCY: Complete microphone access terminated');
      
    } catch (error) {
      console.error('EMERGENCY: Error during microphone shutdown:', error);
      // Always clear references even on error
      this.stream = null;
      this.audioContext = null;
      this.source = null;
      this.processor = null;
      this.isListening = false;
      this.isPaused = false;
    }
  }

  stop() {
    console.log('AudioRecorder: ⛔ PHASE 1 ENHANCED MICROPHONE CLEANUP STARTING');
    console.log('AudioRecorder: Stop called with state:', {
      isListening: this.isListening,
      isPaused: this.isPaused,
      hasStream: !!this.stream,
      hasContext: !!this.audioContext
    });
    
    this.isListening = false;
    this.isPaused = false;
    
    // Track cleanup progress for verification
    const cleanupSteps = {
      sourceDisconnected: false,
      processorDisconnected: false,
      tracksStoppedCount: 0,
      contextClosed: false
    };
    
    // Comprehensive audio cleanup with verification
    if (this.source) {
      console.log('AudioRecorder: 🔌 Disconnecting audio source');
      try {
        this.source.disconnect();
        cleanupSteps.sourceDisconnected = true;
        console.log('AudioRecorder: ✅ Audio source disconnected successfully');
      } catch (error) {
        console.warn('AudioRecorder: ⚠️ Error disconnecting audio source:', error);
      }
      this.source = null;
    }
    
    if (this.processor) {
      console.log('AudioRecorder: ⚙️ Disconnecting audio processor');
      try {
        this.processor.onaudioprocess = null; // Clear event handler
        this.processor.disconnect();
        cleanupSteps.processorDisconnected = true;
        console.log('AudioRecorder: ✅ Audio processor disconnected successfully');
      } catch (error) {
        console.warn('AudioRecorder: ⚠️ Error disconnecting audio processor:', error);
      }
      this.processor = null;
    }
    
    // CRITICAL: Enhanced media stream track cleanup
    if (this.stream) {
      console.log('AudioRecorder: 🎤 ENHANCED: Stopping all media stream tracks');
      console.log('AudioRecorder: Track count:', this.stream.getTracks().length);
      
      this.stream.getTracks().forEach((track, index) => {
        const initialState = track.readyState;
        console.log(`AudioRecorder: Stopping track ${index}: ${track.kind}, state: ${initialState}`);
        
        try {
          track.stop();
          cleanupSteps.tracksStoppedCount++;
          
          // Verify track is actually stopped
          setTimeout(() => {
            console.log(`AudioRecorder: Track ${index} final state: ${track.readyState} (was: ${initialState})`);
          }, 100);
          
        } catch (error) {
          console.warn(`AudioRecorder: ⚠️ Error stopping track ${index}:`, error);
        }
      });
      this.stream = null;
    }
    
    // Enhanced audio context cleanup with timeout
    if (this.audioContext) {
      console.log('AudioRecorder: 🔊 Enhanced audio context cleanup');
      const contextState = this.audioContext.state;
      console.log('AudioRecorder: Context state:', contextState, 'Sample rate:', this.audioContext.sampleRate);
      
      // Set timeout to force context closure if it hangs
      const contextTimeout = setTimeout(() => {
        console.warn('AudioRecorder: ⚠️ Audio context close timeout - forcing null');
        this.audioContext = null;
      }, 3000);
      
      this.audioContext.close().then(() => {
        clearTimeout(contextTimeout);
        cleanupSteps.contextClosed = true;
        console.log(`AudioRecorder: ✅ Audio context closed successfully (was: ${contextState})`);
      }).catch(err => {
        clearTimeout(contextTimeout);
        console.warn('AudioRecorder: ⚠️ Error closing audio context:', err);
      });
      this.audioContext = null;
    }
    
    // PHASE 1: Verification and logging
    setTimeout(() => {
      console.log('AudioRecorder: 📊 PHASE 1 CLEANUP VERIFICATION:', cleanupSteps);
      
      if (cleanupSteps.sourceDisconnected && cleanupSteps.processorDisconnected && 
          cleanupSteps.tracksStoppedCount > 0) {
        console.log('AudioRecorder: ✅ PHASE 1 ENHANCED CLEANUP VERIFIED SUCCESSFUL');
      } else {
        console.warn('AudioRecorder: ⚠️ PHASE 1 CLEANUP VERIFICATION FAILED:', cleanupSteps);
      }
    }, 500);
    
    console.log('AudioRecorder: ⛔ PHASE 1 ENHANCED CLEANUP COMPLETED');
  }
}

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private webrtcStream: MediaStream | null = null;
  private isResponseActive: boolean = false;
  private userSpeechActive: boolean = false;
  private conversationState: 'idle' | 'listening' | 'transcribing' | 'processing' | 'responding' = 'idle';
  private currentTranscriptId: string | null = null;
  private transcriptConfidence: number = 0;
  
  // Enhanced connection management
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastAssistantId: string = '';
  private lastLanguage: string = '';

  // Performance optimization properties
  private performanceMetrics = {
    messageLatency: 0,
    audioLatency: 0,
    bufferHealth: 100,
    messageQueue: 0,
    cpuUsage: 0,
    lastMessageTime: 0,
    responseStartTime: 0
  };
  private messageQueue: Array<{ message: any; priority: number; timestamp: number }> = [];
  private isProcessingQueue = false;
  private maxQueueSize = 50;
  private audioBufferSize = 4096;
  private audioPerformanceMonitor: {
    chunks: number;
    totalLatency: number;
    avgLatency: number;
  } = { chunks: 0, totalLatency: 0, avgLatency: 0 };

  private audioRecorder: AudioRecorder | null = null;
  private isListening: boolean = false;
  private isMuted: boolean = false;
  private sessionEstablished: boolean = false;

  // Inactivity auto-disconnect (saves AI credits if user walks away).
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_MS = 30_000;

  constructor(
    private onMessage: (message: any) => void,
    private onConnectionChange?: (connected: boolean, error?: string) => void,
    private onReconnecting?: (attempt: number) => void,
    private onInactivityTimeout?: () => void
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    console.log('RealtimeChat initialized');
  }

  private resetInactivityTimer = () => {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      console.log('⏱️ Voice chat inactivity timeout — closing session to save credits');
      try { this.onInactivityTimeout?.(); } catch (e) { console.warn(e); }
      this.disconnect();
    }, this.INACTIVITY_MS);
  };

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }


  async init(assistantId: string, language?: string, websiteUrl?: string, preparedMicStream?: MediaStream) {
    console.log('RealtimeChat init:', { assistantId, language, websiteUrl });
    
    if (this.isConnecting) {
      console.log('Already connecting, skipping duplicate init');
      return;
    }

    this.isConnecting = true;
    this.lastAssistantId = assistantId;
    this.lastLanguage = language || '';

    try {
      console.log('Voice init started:', {
        assistantId,
        language,
        websiteUrl,
        attempt: this.reconnectAttempts + 1,
        timestamp: new Date().toISOString()
      });
      
      if (!assistantId || assistantId === 'undefined' || assistantId === 'null') {
        console.error('Invalid assistant ID:', assistantId);
        throw new Error('Invalid assistant ID provided');
      }

      // Set connection timeout
      console.log('Setting connection timeout: 30000ms');
      this.connectionTimeout = setTimeout(() => {
        console.error('Connection timeout for assistantId:', assistantId);
        throw new Error('Connection timeout - please check your internet connection');
      }, 30000);
      
      // PERF: Kick off mic acquisition IN PARALLEL with the token fetch so the
      // two slowest startup steps (browser mic permission + Supabase edge call)
      // overlap instead of happening sequentially.
      const consentAt = (window as any).__voiceConsentAcceptedAt as number | undefined;
      const micT0 = performance.now();
      if (consentAt) {
        console.log('[VoiceTiming] 🎤 Requesting mic at +', (micT0 - consentAt).toFixed(1), 'ms after consent (prepared:', !!preparedMicStream, ')');
      } else {
        console.log('[VoiceTiming] 🎤 Requesting mic (no consent timestamp, prepared:', !!preparedMicStream, ')');
      }
      const micPromise: Promise<MediaStream> = preparedMicStream
        ? Promise.resolve(preparedMicStream)
        : navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 24000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
      micPromise.then(() => {
        const micT1 = performance.now();
        console.log('[VoiceTiming] ✅ Mic acquired in', (micT1 - micT0).toFixed(1), 'ms', consentAt ? `(total ${(micT1 - consentAt).toFixed(1)}ms since consent)` : '');
      }).catch(() => {});

      // Get ephemeral token from our new voice-session function (in parallel with mic)
      console.log('📞 PHASE 3 DEBUG: Calling voice-session function...', { assistantId, websiteUrl });
      console.log('🌐 STEP 1: Passing website URL to voice-session:', websiteUrl);
      voiceFlowTracker.trackEvent('WEBRTC_SEND', 'token_request', { assistantId, websiteUrl });
      const tokenT0 = performance.now();
      const tokenPromise = supabase.functions.invoke("voice-session", {
        body: { assistantId, websiteUrl }
      });

      const { data: tokenData, error } = await tokenPromise;
      const tokenT1 = performance.now();
      console.log('[VoiceTiming] 🔑 Token fetched in', (tokenT1 - tokenT0).toFixed(1), 'ms');
      console.log('Voice session function response:', { data: tokenData, error });

      if (error) {
        voiceFlowTracker.trackEvent('WEBRTC_SEND', 'token_error', { error }, false);
      } else {
        voiceFlowTracker.trackEvent('WEBRTC_SEND', 'token_received', { hasToken: !!tokenData?.client_secret?.value });
      }

      if (error) {
        console.error('=== ERROR FROM VOICE SESSION ===');
        console.error('Error getting token:', error);
        const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
        throw new Error(`Failed to get session token: ${errorMessage}`);
      }

      if (!tokenData) {
        throw new Error("No response from voice session function");
      }

      console.log('Realtime session response:', tokenData);

      if (!tokenData?.client_secret?.value) {
        console.error('Invalid token response structure:', tokenData);
        throw new Error("Failed to get ephemeral token from response");
      }

      const EPHEMERAL_KEY = tokenData.client_secret.value;
      console.log('Got ephemeral token, setting up WebRTC...');

      // Create peer connection
      this.pc = new RTCPeerConnection();
      voiceFlowTracker.trackEvent('WEBRTC_SEND', 'peer_connection_created', {});

      // Set up remote audio
      this.pc.ontrack = e => {
        console.log('PHASE 3: Received remote audio track');
        voiceFlowTracker.trackEvent('WEBRTC_SEND', 'audio_track_received', {
          streamId: e.streams[0]?.id,
          trackCount: e.streams[0]?.getTracks().length
        });
        this.audioEl.srcObject = e.streams[0];
      };

      // Await whichever of the two parallel operations is still pending
      this.webrtcStream = await micPromise;

      // Add the audio track to peer connection for WebRTC
      this.pc.addTrack(this.webrtcStream.getTracks()[0]);

      // Initialize audio recorder for streaming audio data (but don't start yet)
      this.audioRecorder = new AudioRecorder((audioData) => {
        this.handleAudioData(audioData);
      });

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      voiceFlowTracker.trackEvent('WEBRTC_SEND', 'data_channel_created', {});
      
      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        
        // PHASE 3: Comprehensive event tracking
        voiceFlowTracker.trackEvent('TRANSCRIPT_RECEIVE', `openai_${event.type}`, {
          type: event.type,
          hasContent: !!event.content,
          hasTranscript: !!event.transcript,
          hasDelta: !!event.delta
        });
        
        // PHASE 1: COMPREHENSIVE EVENT DEBUG LOGGING
        console.log('Data channel message received:', {
          eventType: event.type,
          hasContent: !!event.content,
          hasText: !!event.text,
          hasDelta: !!event.delta,
          timestamp: new Date().toISOString(),
          sessionEstablished: this.sessionEstablished,
          isResponseActive: this.isResponseActive,
          userSpeechActive: this.userSpeechActive
        });
        
        console.log("📨 PHASE 1 DEBUG: Received event:", {
          type: event.type,
          event: event,
          connectionState: {
            sessionEstablished: this.sessionEstablished,
            isResponseActive: this.isResponseActive,
            userSpeechActive: this.userSpeechActive,
            dataChannelReady: this.dc?.readyState === 'open'
          }
        });
        
        // Handle session establishment
        if (event.type === 'session.created') {
          const consentAt = (window as any).__voiceConsentAcceptedAt as number | undefined;
          if (consentAt) {
            console.log('[VoiceTiming] 🎧 session.created at +', (performance.now() - consentAt).toFixed(1), 'ms since consent — starting recorder');
          } else {
            console.log('[VoiceTiming] 🎧 session.created — starting recorder');
          }
          console.log('Session created - sending session update and starting audio recording');
          console.log('✅ PHASE 1 DEBUG: Session created - sending session update and starting audio recording');
          this.sessionEstablished = true;
          this.sendSessionUpdate();
          this.startAudioRecording();
          this.resetInactivityTimer();
        }

        
        // Handle session update confirmation from OpenAI
        if (event.type === 'session.updated') {
          console.log('🔧 STEP 3 DEBUG: Session updated confirmation received from OpenAI');
          console.log('🔧 STEP 3 DEBUG: Confirmed session config:', JSON.stringify(event.session, null, 2));
          
          // Verify output_audio_transcription is configured
          if (event.session?.output_audio_transcription) {
            console.log('✅ STEP 3 SUCCESS: output_audio_transcription confirmed configured:', event.session.output_audio_transcription);
          } else {
            console.error('❌ STEP 3 ERROR: output_audio_transcription NOT configured in session!');
          }
          
          // Verify input_audio_transcription is configured
          if (event.session?.input_audio_transcription) {
            console.log('✅ STEP 3 SUCCESS: input_audio_transcription confirmed configured:', event.session.input_audio_transcription);
          } else {
            console.error('❌ STEP 3 ERROR: input_audio_transcription NOT configured in session!');
          }
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(event.type, Date.now());

        // Any meaningful realtime event keeps the session alive (inactivity timer).
        if (
          event.type === 'input_audio_buffer.speech_started' ||
          event.type === 'conversation.item.input_audio_transcription.completed' ||
          event.type === 'response.audio.delta' ||
          event.type === 'response.output_audio.delta' ||
          event.type === 'response.done'
        ) {
          this.resetInactivityTimer();
        }

        // Optimize audio buffer based on performance
        if (event.type === 'response.audio.delta') {
          this.optimizeAudioBuffer();
        }

        
        // Track response state for interrupt handling
        if (event.type === 'response.created') {
          console.log('Response started, was active:', this.isResponseActive);
          this.isResponseActive = true;
        } else if (event.type === 'response.done') {
          console.log('Response completed, was active:', this.isResponseActive);
          this.isResponseActive = false;
        }
        
        // Handle AI response transcript events - these contain the AI's spoken response text
        if (event.type === 'response.audio_transcript.delta') {
          console.log('🔧 STEP 3 DEBUG: AI response transcript delta received:', event.delta);
          
          // Create custom event for AI transcript display
          this.onMessage({
            type: 'ai_transcript_delta',
            role: 'assistant',
            content: event.delta,
            timestamp: new Date().toISOString(),
            isLive: true,
            source: 'ai_speech'
          });
          
          return;
        }
        
        if (event.type === 'response.audio_transcript.done') {
          console.log('AI response transcript completed');
          
          this.onMessage({
            type: 'ai_transcript_complete',
            role: 'assistant',
            content: event.transcript,
            timestamp: new Date().toISOString(),
            isLive: false,
            source: 'ai_speech'
          });
          
          return;
        }
        
        if (event.type === 'input_audio_buffer.speech_started') {
          console.log('User speech started');
          
          this.userSpeechActive = true;
          if (this.isResponseActive) {
            console.log('Interrupting AI response');
            this.cancelResponse();
          }
        } else if (event.type === 'input_audio_buffer.speech_stopped') {
          console.log('User speech stopped');
          this.userSpeechActive = false;
        }
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('realtime-debug-event', {
            detail: {
              ...event,
              source: 'websocket_realtime',
              timestamp: new Date().toISOString()
            }
          }));
        }
        
        if (event.type === 'conversation.item.input_audio_transcription.delta') {
          console.log('Transcription delta');
          
          this.currentTranscriptId = event.item_id;
          
          this.onMessage({
            type: 'user_transcription_delta',
            content: event.delta || '',
            itemId: event.item_id,
            originalEvent: event,
            timestamp: new Date().toISOString(),
            isLive: true,
            state: 'transcribing'
          });
          
          return;
        }

        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          console.log('Transcription completed');
          this.onMessage(event);
          return;
        }
        
        this.updateConversationState(event);
        
        console.log('Forwarding event:', {
          eventType: event.type,
          hasOnMessage: typeof this.onMessage === 'function'
        });
        
        this.onMessage(event);
      });

      // Create and set local description
      const sdpT0 = performance.now();
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API (GA endpoint)
      const baseUrl = "https://api.openai.com/v1/realtime/calls";
      const model = "gpt-realtime";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('OpenAI Realtime API Error Details:', {
          status: sdpResponse.status,
          statusText: sdpResponse.statusText,
          errorText: errorText,
          headers: Object.fromEntries(sdpResponse.headers.entries()),
          ephemeralKeyLength: EPHEMERAL_KEY?.length || 0
        });
        throw new Error(`Failed to connect to OpenAI: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      const sdpT1 = performance.now();
      console.log('[VoiceTiming] 📡 WebRTC SDP handshake completed in', (sdpT1 - sdpT0).toFixed(1), 'ms');
      console.log("WebRTC connection established");
      
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
      // Note: Audio recording will start after session.created event
      console.log('WebRTC connected - waiting for session.created to start audio recording');

      // Connection successful
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);

    } catch (error) {
      console.error("Error initializing chat:", error);
      this.isConnecting = false;
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Attempt reconnection if this isn't the first attempt or if it's a recoverable error
      if (this.shouldRetry(error)) {
        await this.scheduleReconnect(error);
      } else {
        this.onConnectionChange?.(false, error instanceof Error ? error.message : 'Connection failed');
        throw error;
      }
    }
  }


  async sendMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    console.log('Sending message to voice session:', text);

    // Check if this is a manual input acknowledgment that needs immediate response
    const isManualInputAck = text.includes('received your email securely') || 
                            text.includes('received your phone number securely') ||
                            text.includes('Perfect! I received') ||
                            text.includes('Great! I received');

    if (isManualInputAck) {
      // Force immediate audio response for manual inputs
      console.log('Detected manual input acknowledgment - forcing immediate voice response');
      
      const responseEvent = {
        type: 'response.create',
        response: {
          modalities: ['audio'],
          instructions: `IMMEDIATELY say the following message with enthusiasm and continue the conversation naturally: "${text}"`
        }
      };
      
      this.dc.send(JSON.stringify(responseEvent));
      return;
    }

    // Regular message handling
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
  }


  startListening() {
    console.log('RealtimeChat: Starting to listen');
    if (this.audioRecorder) {
      this.audioRecorder.startListening();
      this.isListening = true;
    }
  }

  pauseListening() {
    console.log('RealtimeChat: Pausing listening');
    if (this.audioRecorder) {
      this.audioRecorder.pauseListening();
      this.isListening = false;
    }
    
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify({
        type: 'input_audio_buffer.clear'
      }));
    }
  }

  resumeListening() {
    console.log('RealtimeChat: Resuming listening');
    if (this.audioRecorder) {
      this.audioRecorder.resumeListening();
      this.isListening = true;
    }
  }

  mute() {
    console.log('RealtimeChat: Muting microphone');
    if (this.audioRecorder) {
      this.audioRecorder.mute();
      this.isMuted = true;
      this.isListening = false;
    }
  }

  unmute() {
    console.log('RealtimeChat: Unmuting microphone');
    if (this.audioRecorder) {
      this.audioRecorder.unmute();
      this.isMuted = false;
      this.isListening = true;
    }
  }

  // Manual toggle for user-initiated mic control
  toggleListening() {
    console.log(`RealtimeChat: Toggle listening - current state: ${this.isListening}`);
    
    if (this.isListening) {
      // Stop listening completely
      this.stopListening();
      this.isListening = false;
      this.isMuted = true;
      console.log('RealtimeChat: Manually stopped listening');
    } else {
      // Start listening again
      this.startListening();
      this.isListening = true;
      this.isMuted = false;
      console.log('RealtimeChat: Manually started listening');
    }
  }

  stopListening() {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('Data channel not ready for stop listening');
      return;
    }

    console.log('Stopping listening - clearing audio buffer');
    this.pauseListening();
  }

  getAudioState() {
    return {
      isListening: this.isListening,
      isMuted: this.isMuted,
      recorderState: this.audioRecorder?.getState() || null
    };
  }

  cancelResponse() {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('Data channel not ready for cancel response');
      return;
    }

    console.log('Cancelling current response');
    this.dc.send(JSON.stringify({
      type: 'response.cancel'
    }));
  }

  private async startAudioRecording() {
    try {
      if (!this.audioRecorder) {
        console.error('AudioRecorder not initialized');
        return;
      }
      
      await this.audioRecorder.start();
      this.audioRecorder.startListening();
      this.isListening = true;
      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start audio:', error);
      throw error;
    }
  }

  sendSessionUpdate() {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.log('Data channel not ready');
      return;
    }
    
    console.log('Sending session update');
    
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        output_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.85,  // Higher threshold for background noise tolerance
          prefix_padding_ms: 800,
          silence_duration_ms: 4000
        },
        voice: 'ballad',
        temperature: 0.3,
        max_response_output_tokens: 'inf'
      }
    };
    
    this.dc.send(JSON.stringify(sessionConfig));
    console.log('Session update sent');
  }

  async sendFunctionResult(callId: string, result: any) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
    
    if (result.field_name && result.next_field) {
      setTimeout(() => {
        this.sendAutoNudge(result.field_name, result.next_field);
      }, 100);
    }
  }

  private sendAutoNudge(completedField: string, nextField: string) {
    if (!this.dc || this.dc.readyState !== 'open') return;

    const nudgeMessages = {
      name: "Great! I've got your name. What's your email address?",
      email: "Perfect! I have your email. Can you give me your phone number?", 
      phone: "Thanks! Now what date works best for your appointment?",
      date: "Excellent! What time would you prefer?",
      time: "Perfect! What's the purpose of your appointment?"
    };

    const nudgeText = nudgeMessages[completedField as keyof typeof nudgeMessages] || 
                     `Thanks! What's your ${nextField}?`;

    console.log('Sending auto-nudge for booking flow:', nudgeText);
    
    // Send immediate acknowledgment without adding to conversation items
    const responseEvent = {
      type: 'response.create',
      response: {
        modalities: ['audio'],
        instructions: `Immediately say: "${nudgeText}"`
      }
    };

    this.dc.send(JSON.stringify(responseEvent));
  }

  // Enhanced interrupt detection
  detectUserInterrupt(): boolean {
    return this.userSpeechActive && this.isResponseActive;
  }

  // Force stop current AI response
  forceStopResponse() {
    if (this.isResponseActive) {
      this.cancelResponse();
      this.stopListening();
    }
  }

  private setupConnectionMonitoring() {
    // Monitor WebRTC connection state
    if (this.pc) {
      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        console.log('WebRTC connection state:', state);
        
        if (state === 'disconnected' || state === 'failed') {
          this.handleConnectionLoss();
        } else if (state === 'connected') {
          this.isConnected = true;
          this.onConnectionChange?.(true);
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc?.iceConnectionState;
        console.log('ICE connection state:', state);
        
        if (state === 'failed' || state === 'disconnected') {
          this.handleConnectionLoss();
        }
      };
    }

    // Setup heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.dc?.readyState === 'open') {
        try {
          this.dc.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.warn('Heartbeat failed:', error);
          this.handleConnectionLoss();
        }
      }
    }, 30000);
  }

  private shouldRetry(error: any): boolean {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Don't retry on authentication or invalid assistant errors
    if (errorMessage.includes('invalid assistant') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden')) {
      return false;
    }

    return true;
  }

  private async scheduleReconnect(error: any) {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.onReconnecting?.(this.reconnectAttempts);

    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      try {
        await this.init(this.lastAssistantId, this.lastLanguage);
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.onConnectionChange?.(false, 'Max reconnection attempts exceeded');
        }
      }
    }
  }

  private handleConnectionLoss() {
    if (!this.isConnected) return; // Already handling
    
    console.log('Connection lost, attempting to reconnect...');
    this.isConnected = false;
    this.onConnectionChange?.(false, 'Connection lost');
    
    // Clean up current connection
    this.cleanup();
    
    // Start reconnection process
    this.scheduleReconnect(new Error('Connection lost'));
  }

  // Handle audio data from recorder and stream to WebRTC
  private handleAudioData(audioData: Float32Array) {
    if (!this.dc || this.dc.readyState !== 'open') {
      return;
    }

    // Convert Float32Array to base64 encoded PCM16 for OpenAI Realtime API
    const encoded = this.encodeAudioForAPI(audioData);
    
    // Send audio buffer to OpenAI via data channel
    const audioEvent = {
      type: 'input_audio_buffer.append',
      audio: encoded
    };

    this.dc.send(JSON.stringify(audioEvent));
  }

  // Encode audio data for OpenAI Realtime API (PCM16 at 24kHz)
  private encodeAudioForAPI(float32Array: Float32Array): string {
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
  }

  private cleanup() {
    console.log('🧹 === PHASE 1 ENHANCED REALTIME CHAT CLEANUP ===');
    this.clearInactivityTimer();

    
    // Track cleanup progress
    const cleanupProgress = {
      intervalsCleaned: 0,
      audioRecorderStopped: false,
      webrtcTracksStopped: 0,
      dataChannelClosed: false,
      peerConnectionClosed: false,
      statesReset: false
    };
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      cleanupProgress.intervalsCleaned++;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
      cleanupProgress.intervalsCleaned++;
    }

    // PHASE 1: Enhanced audio recording cleanup with verification
    if (this.audioRecorder) {
      console.log('RealtimeChat: 🎤 PHASE 1 - Stopping audio recorder with enhanced cleanup');
      try {
        this.audioRecorder.stop();
        cleanupProgress.audioRecorderStopped = true;
        console.log('RealtimeChat: ✅ Audio recorder stopped successfully');
      } catch (error) {
        console.warn('RealtimeChat: ⚠️ Error stopping audio recorder:', error);
      }
      this.audioRecorder = null;
    }

    // PHASE 1: Enhanced WebRTC stream cleanup with explicit verification
    if (this.webrtcStream) {
      console.log('RealtimeChat: 📡 PHASE 1 - Enhanced WebRTC stream cleanup');
      this.webrtcStream.getTracks().forEach((track, index) => {
        const initialState = track.readyState;
        console.log(`RealtimeChat: Stopping WebRTC track ${index}: ${track.kind}, state: ${initialState}`);
        
        try {
          track.stop();
          cleanupProgress.webrtcTracksStopped++;
          
          // PHASE 1: Verify track cleanup with timeout verification
          setTimeout(() => {
            console.log(`RealtimeChat: Track ${index} cleanup verified - final state: ${track.readyState} (was: ${initialState})`);
          }, 200);
          
          // Force track cleanup by removing event listeners
          if (track.kind === 'audio') {
            console.log('RealtimeChat: 🎙️ PHASE 1 - Explicitly released audio track for microphone');
          }
        } catch (error) {
          console.warn(`RealtimeChat: ⚠️ Error stopping WebRTC track ${index}:`, error);
        }
      });
      this.webrtcStream = null;
    }
    
    // Enhanced WebRTC connections cleanup with timeout protection
    if (this.dc) {
      console.log('RealtimeChat: 📶 PHASE 1 - Enhanced data channel cleanup');
      try {
        if (this.dc.readyState === 'open') {
          this.dc.close();
        }
        cleanupProgress.dataChannelClosed = true;
        console.log('RealtimeChat: ✅ Data channel closed successfully');
      } catch (error) {
        console.warn('RealtimeChat: ⚠️ Error closing data channel:', error);
      }
      this.dc = null;
    }
    
    if (this.pc) {
      console.log('RealtimeChat: 🔗 PHASE 1 - Enhanced peer connection cleanup');
      try {
        // Stop all transceivers with enhanced logging
        if (this.pc.getTransceivers) {
          this.pc.getTransceivers().forEach((transceiver, index) => {
            console.log(`RealtimeChat: Stopping transceiver ${index}: ${transceiver.direction}`);
            if (transceiver.stop) {
              transceiver.stop();
            }
          });
        }
        
        this.pc.close();
        cleanupProgress.peerConnectionClosed = true;
        console.log('RealtimeChat: ✅ Peer connection closed successfully');
      } catch (error) {
        console.warn('RealtimeChat: ⚠️ Error closing peer connection:', error);
      }
      this.pc = null;
    }
    
    // Reset all activity states with verification
    this.isResponseActive = false;
    this.userSpeechActive = false;
    this.isListening = false;
    this.isMuted = false;
    cleanupProgress.statesReset = true;
    
    // Clear message queue
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    // PHASE 1: Cleanup verification with timeout
    setTimeout(() => {
      console.log('RealtimeChat: 📊 PHASE 1 CLEANUP VERIFICATION:', cleanupProgress);
      
      if (cleanupProgress.audioRecorderStopped && cleanupProgress.dataChannelClosed && 
          cleanupProgress.peerConnectionClosed && cleanupProgress.statesReset) {
        console.log('RealtimeChat: ✅ PHASE 1 ENHANCED CLEANUP VERIFIED SUCCESSFUL');
      } else {
        console.warn('RealtimeChat: ⚠️ PHASE 1 CLEANUP VERIFICATION ISSUES:', cleanupProgress);
      }
    }, 1000);
    
    console.log('🧹 === PHASE 1 ENHANCED CLEANUP COMPLETED ===');
  }

  // Manual reconnect method
  async reconnect() {
    console.log('Manual reconnect requested');
    this.reconnectAttempts = 0;
    this.cleanup();
    await this.init(this.lastAssistantId, this.lastLanguage);
  }

  forceStop() {
    console.log('RealtimeChat: ⚡ FORCE STOP - IMMEDIATE TERMINATION');
    
    // Immediate state reset
    this.isListening = false;
    this.isConnected = false;
    this.sessionEstablished = false;
    this.isResponseActive = false;
    this.userSpeechActive = false;
    
    // Clear all timers immediately
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Force stop audio recorder immediately
    if (this.audioRecorder) {
      this.audioRecorder.forceStop();
      this.audioRecorder = null;
    }
    
    // Stop WebRTC tracks immediately
    if (this.webrtcStream) {
      this.webrtcStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('RealtimeChat: Error stopping WebRTC track:', error);
        }
      });
      this.webrtcStream = null;
    }
    
    // Close connections immediately without waiting
    if (this.dc) {
      try {
        this.dc.close();
      } catch (error) {
        console.warn('RealtimeChat: Error closing data channel:', error);
      }
      this.dc = null;
    }
    
    if (this.pc) {
      try {
        this.pc.close();
      } catch (error) {
        console.warn('RealtimeChat: Error closing peer connection:', error);
      }
      this.pc = null;
    }
    
    // Stop audio playback immediately
    if (this.audioEl.srcObject) {
      try {
        this.audioEl.pause();
        this.audioEl.srcObject = null;
      } catch (error) {
        console.warn('RealtimeChat: Error stopping audio playback:', error);
      }
    }
    
    // Clear message queue
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    // Notify connection change
    this.onConnectionChange?.(false);
    console.log('RealtimeChat: ⚡ Force stop completed instantly');
  }

  disconnect() {
    console.log('🔌 === PHASE 2 ENHANCED REALTIME CHAT DISCONNECT ===');
    this.cleanup();
    
    // Force reset all states with PHASE 2 enhancements
    this.isConnected = false;
    this.isConnecting = false;
    this.isListening = false;
    this.isMuted = false;
    this.sessionEstablished = false;
    this.isResponseActive = false;
    this.userSpeechActive = false;
    this.reconnectAttempts = 0;
    
    // PHASE 2: Enhanced message queue and transcript cleanup
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    // PHASE 2: Clear any pending transcript operations
    console.log('🧹 PHASE 2: Clearing any pending transcript operations');
    
    console.log('🔌 Realtime chat disconnected and all states reset with PHASE 2 enhancements');
  }

  // Connection status getters
  get connected() { return this.isConnected; }
  get connecting() { return this.isConnecting; }
  get canReconnect() { return this.reconnectAttempts < this.maxReconnectAttempts; }

  // Performance optimization methods
  private updatePerformanceMetrics(eventType: string, timestamp: number) {
    const now = Date.now();
    
    if (eventType === 'response.created') {
      this.performanceMetrics.responseStartTime = now;
    } else if (eventType === 'response.audio.delta') {
      const latency = now - this.performanceMetrics.responseStartTime;
      this.performanceMetrics.audioLatency = latency;
      
      // Update audio performance monitor
      this.audioPerformanceMonitor.chunks++;
      this.audioPerformanceMonitor.totalLatency += latency;
      this.audioPerformanceMonitor.avgLatency = 
        this.audioPerformanceMonitor.totalLatency / this.audioPerformanceMonitor.chunks;
    }
    
    this.performanceMetrics.lastMessageTime = now;
    this.performanceMetrics.messageQueue = this.messageQueue.length;
    
    // Log performance metrics periodically
    if (this.performanceMetrics.lastMessageTime % 5000 < 100) {
      console.log('Voice Performance Metrics:', {
        audioLatency: this.performanceMetrics.audioLatency + 'ms',
        avgAudioLatency: Math.round(this.audioPerformanceMonitor.avgLatency) + 'ms',
        queueLength: this.performanceMetrics.messageQueue,
        bufferHealth: this.performanceMetrics.bufferHealth + '%'
      });
    }
  }

  private prioritizeMessage(message: any): number {
    // Priority system: 1 = highest, 5 = lowest
    if (message.type === 'response.cancel') return 1;
    if (message.type === 'input_audio_buffer.clear') return 1;
    if (message.type === 'session.update') return 2;
    if (message.type === 'response.create') return 2;
    if (message.type === 'conversation.item.create') return 3;
    if (message.type === 'ping') return 5;
    return 4;
  }

  private async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0 || this.dc?.readyState !== 'open') {
      return;
    }

    this.isProcessingQueue = true;
    
    try {
      // Sort by priority (lower number = higher priority)
      this.messageQueue.sort((a, b) => a.priority - b.priority);
      
      // Process up to 3 messages per batch to prevent overwhelming
      const batchSize = Math.min(3, this.messageQueue.length);
      const batch = this.messageQueue.splice(0, batchSize);
      
      for (const { message } of batch) {
        if (this.dc?.readyState === 'open') {
          this.dc.send(JSON.stringify(message));
        }
      }
    } catch (error) {
      console.warn('Error processing message queue:', error);
    }
    
    this.isProcessingQueue = false;
    
    // Continue processing if more messages remain
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processMessageQueue(), 10);
    }
  }

  private sendOptimizedMessage(message: any) {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('Data channel not ready for optimized send');
      return;
    }

    const priority = this.prioritizeMessage(message);
    const timestamp = Date.now();
    
    // High priority messages skip the queue
    if (priority <= 2) {
      this.dc.send(JSON.stringify(message));
      this.updatePerformanceMetrics(message.type, timestamp);
      return;
    }
    
    // Check queue size limit
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn('Message queue full, dropping oldest low-priority message');
      this.messageQueue.shift();
    }
    
    this.messageQueue.push({ message, priority, timestamp });
    this.processMessageQueue();
  }

  // Enhanced audio buffer optimization
  private optimizeAudioBuffer() {
    // Adjust buffer size based on performance
    if (this.performanceMetrics.audioLatency > 500) {
      this.audioBufferSize = Math.min(8192, this.audioBufferSize * 1.2);
    } else if (this.performanceMetrics.audioLatency < 200) {
      this.audioBufferSize = Math.max(2048, this.audioBufferSize * 0.9);
    }
    
    // Update buffer health metric
    this.performanceMetrics.bufferHealth = Math.max(0, 
      100 - (this.performanceMetrics.audioLatency / 10)
    );
  }

  private updateConversationState(event: any) {
    console.log(`🔄 Conversation state transition: ${this.conversationState} → `, event.type);
    
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.conversationState = 'listening';
        this.userSpeechActive = true;
        console.log('🎤 User started speaking');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        this.conversationState = 'transcribing';
        this.userSpeechActive = false;
        console.log('🎤 User stopped speaking, transcribing...');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        this.conversationState = 'processing';
        this.currentTranscriptId = event.item_id;
        console.log('✅ Transcription completed, processing...');
        break;
        
      case 'response.created':
        // Only allow AI response if user transcription is complete
        if (this.conversationState === 'processing') {
          this.conversationState = 'responding';
          this.isResponseActive = true;
          console.log('🤖 AI responding');
        } else {
          console.warn('⚠️ AI trying to respond while user still speaking/transcribing');
        }
        break;
        
      case 'response.done':
        this.conversationState = 'idle';
        this.isResponseActive = false;
        this.currentTranscriptId = null;
        console.log('🏁 Response complete, ready for next interaction');
        break;
    }
  }

  private calculateTranscriptConfidence(transcript: string): number {
    if (!transcript || transcript.length === 0) return 0;
    
    // Basic confidence scoring based on transcript quality indicators
    let confidence = 0.8; // Base confidence
    
    // Length factor (very short or very long transcripts are suspicious)
    if (transcript.length < 3) confidence -= 0.4;
    else if (transcript.length < 10) confidence -= 0.2;
    
    // Word coherence (check for complete words vs fragments)
    const words = transcript.split(/\s+/).filter(w => w.length > 0);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length || 0;
    if (avgWordLength < 2) confidence -= 0.3;
    
    // Check for common transcription errors or noise indicators
    const noiseIndicators = ['um', 'uh', 'er', '...', 'inaudible', 'unclear'];
    const noiseWords = words.filter(word => noiseIndicators.includes(word.toLowerCase())).length;
    confidence -= (noiseWords / words.length) * 0.4;
    
    // Check for repeated characters (indication of audio issues)
    if (/(.)\1{3,}/.test(transcript)) confidence -= 0.3;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private requestTranscriptRetry() {
    if (!this.dc || this.dc.readyState !== 'open') return;
    
    console.log('🔄 Requesting transcript retry due to low confidence');
    // Clear the audio buffer and request new input
    this.dc.send(JSON.stringify({
      type: 'input_audio_buffer.clear'
    }));
  }

  // Get performance insights for monitoring
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      avgAudioLatency: this.audioPerformanceMonitor.avgLatency,
      audioChunksProcessed: this.audioPerformanceMonitor.chunks,
      connectionStable: this.isConnected && !this.isConnecting,
      queueEfficiency: Math.max(0, 100 - (this.messageQueue.length * 2))
    };
  }
}