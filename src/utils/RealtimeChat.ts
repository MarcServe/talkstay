import { supabase } from '@/integrations/supabase/client';
import { conversationMemory } from './ConversationMemory';

// Helper: Parse booking arguments from AI function call
const parseBookingArguments = (args: any): any => {
  const parsed = typeof args === 'string' ? JSON.parse(args) : args;

  return {
    userName: parsed.user_name?.trim() || parsed.userName?.trim(),
    userEmail: parsed.user_email?.trim() || parsed.userEmail?.trim(),
    userPhone: parsed.user_phone?.trim() || parsed.userPhone?.trim(),
    preferredDate: parsed.preferred_date?.trim() || parsed.preferredDate?.trim(),
    preferredTime: parsed.preferred_time?.trim() || parsed.preferredTime?.trim(),
    service: parsed.service_type?.trim() || parsed.service?.trim() || parsed.purpose?.trim(),
    message: parsed.message?.trim() || parsed.user_message?.trim()
  };
};

// Helper: Merge AI data with ConversationMemory data (AI data takes precedence)
const mergeBookingData = (aiData: any, memoryData: any): any => {
  return {
    userName: aiData.userName || memoryData.userName,
    userEmail: aiData.userEmail || memoryData.userEmail,
    userPhone: aiData.userPhone || memoryData.userPhone,
    preferredDate: aiData.preferredDate || memoryData.preferredDate,
    preferredTime: aiData.preferredTime || memoryData.preferredTime,
    service: aiData.service || memoryData.service,
    message: aiData.message || memoryData.message
  };
};

// Helper: Validate that all required booking fields are present
const validateBookingData = (data: any): boolean => {
  return Boolean(
    data.userName?.trim() &&
    data.userEmail?.trim() &&
    data.userPhone?.trim() &&
    data.preferredDate?.trim() &&
    data.preferredTime?.trim()
  );
};

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
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

        // Only forward audio once we've confirmed sustained speech
        if (sustainedSpeechFrames >= MIN_SPEECH_FRAMES) {
          this.onAudioData(new Float32Array(inputData));
        }
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
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
  }
}

interface RealtimeChatCallbacks {
  onUserTranscript?: (text: string, isFinal: boolean) => void;
  onAssistantTranscript?: (text: string, isDone: boolean) => void;
  onAssistantAudioStart?: () => void;
  onAssistantAudioEnd?: () => void;
  onUserSpeechStart?: () => void;
  onUserSpeechStop?: () => void;
  onError?: (error: string) => void;
  onBookingReady?: (bookingData: any) => void; // Direct callback to open booking modal
  onInactivityTimeout?: () => void; // Fired when the 30s idle auto-disconnect closes the session
}

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;
  private localStream: MediaStream | null = null;
  private localAudioTrack: MediaStreamTrack | null = null;
  private isListening: boolean = false;
  private assistantId: string;
  private assistantVoice?: string;
  private websiteUrl?: string;
  private callbacks: RealtimeChatCallbacks;
  private currentUserTranscript: string = '';
  private currentAssistantTranscript: string = '';
  private isAssistantSpeaking: boolean = false;
  private assistantResponseStarted: boolean = false;
  private historyInjected: boolean = false;
  private isPaused: boolean = false;
  private wasSpeaking: boolean = false;
  private isMuted: boolean = false;
  private keepAliveInterval: number | null = null;
  // Inactivity auto-disconnect (saves AI credits if the user walks away). Mirrors the
  // proven 30s pattern in RealtimeAudio.ts / RealtimeVoiceForm.ts.
  private inactivityTimer: number | null = null;
  private readonly INACTIVITY_MS = 30_000;
  private lastProcessedResponseId: string | null = null; // Deduplication tracker
  private lastProcessedTranscript: string | null = null; // Prevent duplicate transcripts
  private isInitializing: boolean = true; // Part 4: Block premature responses
  private initializationTimeout: number | null = null;
  private bookingSilenceFix: boolean = false;
  /** Override the edge function used to mint the ephemeral token (TalkStay). */
  public tokenFunction: string = 'realtime-token';
  /** Override the token request body (TalkStay sends the room QR token). */
  public tokenBody: Record<string, unknown> | null = null;

  constructor(assistantId: string, callbacks: RealtimeChatCallbacks = {}, assistantVoice?: string, websiteUrl?: string, initialMuteState: boolean = false, bookingSilenceFix: boolean = false) {
    this.assistantId = assistantId;
    this.assistantVoice = assistantVoice;
    this.websiteUrl = websiteUrl;
    this.callbacks = callbacks;
    this.isMuted = initialMuteState;
    this.bookingSilenceFix = bookingSilenceFix;
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    console.log('RealtimeChat initialized with website URL:', this.websiteUrl);
  }

  private async injectConversationHistory() {
    if (this.historyInjected || !this.dc || this.dc.readyState !== 'open') {
      console.log('⏭️ Skipping history injection:', { 
        alreadyInjected: this.historyInjected, 
        dcReady: this.dc?.readyState 
      });
      return;
    }

    console.log('📚 Injecting conversation history into OpenAI session...');
    
    try {
      // Get conversation history from memory - use voice-specific method to skip welcome message
      const history = conversationMemory.getConversationHistoryForVoice();
      
      if (history.length === 0) {
        console.log('ℹ️ No conversation history to inject (welcome message skipped)');
        this.historyInjected = true;
        return;
      }

      console.log(`📝 Found ${history.length} messages to inject`);

      // Parse and inject each historical message into OpenAI.
      // Assistant items must use content type "text"; "input_text" is user-only
      // and silently drops prior assistant turns (breaking chat→voice memory).
      for (const msg of history) {
        const role = msg.role;
        const text = msg.content;
        if (!text || !role) continue;
        if (role !== 'user' && role !== 'assistant') continue;

        const historyEvent = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role,
            content: [
              role === 'assistant'
                ? { type: 'text', text }
                : { type: 'input_text', text },
            ],
          },
        };

        this.dc.send(JSON.stringify(historyEvent));
        console.log(`✅ Injected ${role} message:`, text.substring(0, 50));
      }

      // Get booking context for additional context
      const context = conversationMemory.getCurrentContext();
      if (context.pendingBooking && Object.keys(context.pendingBooking).length > 0) {
        const bookingInfo = Object.entries(context.pendingBooking)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        
        console.log('📋 Adding booking context:', bookingInfo);
        
        const contextEvent = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: `Current booking information collected: ${bookingInfo}`
              }
            ]
          }
        };
        
        this.dc.send(JSON.stringify(contextEvent));
      }

      this.historyInjected = true;
      console.log('✅ Conversation history injection complete');
      
    } catch (error) {
      console.error('❌ Error injecting conversation history:', error);
    }
  }

  async init() {
    try {
      console.log('🎯 Initializing RealtimeChat for assistant:', this.assistantId);

      // OPTIMIZATION: Request microphone permission FIRST, before network calls
      // This allows permission prompt to show immediately and run in parallel
    console.log('Requesting microphone access...');
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const audioTrack = ms.getTracks()[0];
      console.log('Got microphone permission');
      this.localStream = ms;
      this.localAudioTrack = audioTrack;
      this.localAudioTrack.enabled = false;
      this.isListening = false;

      console.log('Getting ephemeral token with voice:', this.assistantVoice);
      
      // TalkStay may supply its own token minter (hotel-aware + sanitizes the
      // OPENAI_API_KEY, which has a trailing newline that breaks realtime-token).
      const tokenPromise = supabase.functions.invoke(this.tokenFunction, {
        body: this.tokenBody ?? {
          assistantId: this.assistantId,
          voiceAccent: this.assistantVoice,
          websiteUrl: this.websiteUrl
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Token request timed out after 10 seconds')), 10000)
      );

      const { data, error } = await Promise.race([tokenPromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(`Failed to get token: ${error.message}`);
      }

      if (!data?.client_secret?.value) {
        throw new Error("No ephemeral token received");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('Got ephemeral token');

      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.pc.ontrack = (e) => {
        console.log('Remote audio track received');
        
        if (this.isPaused || this.isMuted) {
          console.log('Audio track blocked (paused/muted)');
          return;
        }
        
        this.audioEl.srcObject = e.streams[0];
      };

      this.pc.addTrack(audioTrack);
      console.log('Added local audio track');

      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", async () => {
        console.log('Data channel opened');
        
        if (!this.isMuted) {
          // PART 3: Delay VAD activation to prevent initial repetition
          console.log('⏳ Delaying VAD activation by 400ms...');
          await new Promise(resolve => setTimeout(resolve, 400));
          
          // Re-check mute state after delay (user might have muted during wait)
          if (!this.isMuted) {
            console.log('Auto-enabling microphone...');
            await this.resumeListening();
          } else {
            console.log('Microphone was muted during delay, staying muted');
          }
        } else {
          console.log('Microphone stays muted');
        }
      });
      
      this.dc.addEventListener("close", () => {
        console.log('Data channel closed');
      });
      
      this.dc.addEventListener("error", (e) => {
        console.error('Data channel error:', e);
      });
      
      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          this.handleRealtimeEvent(event);
        } catch (err) {
          console.error('Error parsing event:', err, 'Raw data:', e.data);
        }
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('📤 Created SDP offer');

      // Connect to OpenAI's Realtime API (GA endpoint — Beta /v1/realtime was disabled)
      const baseUrl = "https://api.openai.com/v1/realtime/calls";
      // The ephemeral key is bound to the model its session was created with, so the
      // SDP handshake MUST request that same model. Token minters that report a
      // `model` (TalkStay's talkstay-voice-token → gpt-realtime) win; otherwise keep
      // the historical default.
      const model = (data as any)?.model || "gpt-4o-realtime-preview-2024-12-17";
      
      // Add timeout to SDP exchange for faster failure
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!sdpResponse.ok) {
          throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
        }

        const answer = {
          type: "answer" as RTCSdpType,
          sdp: await sdpResponse.text(),
        };
        
        await this.pc.setRemoteDescription(answer);
        console.log('✅ WebRTC connection established');
      } catch (error) {
        clearTimeout(timeoutId);
        if ((error as any).name === 'AbortError') {
          throw new Error('SDP exchange timed out after 10 seconds');
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error("❌ Error initializing RealtimeChat:", error);
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to initialize');
      throw error;
    }
  }

  private async handleRealtimeEvent(event: any) {
    console.log('🔥 EVENT:', event.type);
    
    // STEP 4 FIX: EMERGENCY MUTE CHECK - Block audio even if mute flag isn't set yet
    if (event.type === 'response.audio.delta' || event.type === 'response.audio.done') {
      if (this.audioEl && (this.audioEl.volume === 0 || this.audioEl.muted)) {
        console.log('🔇 EMERGENCY MUTE: Blocking audio event (audioEl is muted/0 volume)');
        return;
      }
    }
    
    // LAYER 2 FIX: Block ALL assistant and transcription events when muted
    if (this.isMuted) {
      const blockedEventTypes = [
        'response.created',
        'response.audio.delta',
        'response.audio.done',
        'response.audio_transcript.delta',
        'response.audio_transcript.done',
        'response.output_item.added',
        'response.output_item.done',
        'response.content_part.delta',
        'response.text.delta',
        'response.output_text.delta',
        'conversation.item.input_audio_transcription.delta',
        'conversation.item.input_audio_transcription.completed',
        'input_audio_buffer.speech_started',
        'input_audio_buffer.speech_stopped',
        'response.function_call_arguments.delta',
        'response.function_call_arguments.done'
      ];
      
      if (blockedEventTypes.some(type => event.type === type)) {
        console.log('🔇 MUTED: Blocking event ->', event.type);
        return; // STOP - don't process anything
      }
    }
    
    // Log ALL assistant response events with full data
    if (event.type?.startsWith('response.')) {
      console.log('📢 RESPONSE EVENT FULL DATA:', JSON.stringify(event, null, 2));
    }

    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        const userText = event.transcript || '';
        console.log('👤 User (FINAL):', userText);
        this.resetInactivityTimer(); // user finished speaking — keep the session alive
        if (userText.trim()) {
          this.currentUserTranscript = userText;
          this.callbacks.onUserTranscript?.(userText, true);
        }
        break;

      case 'conversation.item.input_audio_transcription.delta':
        const userDelta = event.delta || '';
        console.log('📝 User interim delta:', userDelta);
        this.currentUserTranscript += userDelta;
        if (this.currentUserTranscript.trim()) {
          console.log('✅ Calling onUserTranscript (interim):', this.currentUserTranscript);
          this.callbacks.onUserTranscript?.(this.currentUserTranscript, false);
        }
        break;
      
      case 'input_audio_buffer.speech_started':
        console.log('🎤 Speech started - user is speaking');
        this.resetInactivityTimer(); // genuine activity — keep the session alive
        this.currentUserTranscript = '';
        this.callbacks.onUserSpeechStart?.();
        break;

      case 'response.created':
        console.log('🎯 Response started, id:', event.response?.id, 'isInitializing:', this.isInitializing);
        this.resetInactivityTimer(); // AI is responding — keep the session alive

        // PART 4: Block responses during initialization period
        if (this.isInitializing) {
          console.log('⏭️ BLOCKING response during initialization period');
          return;
        }
        
        this.assistantResponseStarted = true;
        this.currentAssistantTranscript = '';
        // Reset deduplication for new response
        if (event.response?.id && event.response.id !== this.lastProcessedResponseId) {
          this.lastProcessedTranscript = null;
        }
        break;

      // PRIMARY: Use output_item.added for complete text immediately
      case 'response.output_item.added':
        console.log('✅ OUTPUT ITEM ADDED, response_id:', event.response_id);
        if (event.item?.type === 'message' && event.item?.content) {
          for (const content of event.item.content) {
            const fullText = content.transcript || content.text;
            if (fullText?.trim()) {
              // DEDUPLICATION: Skip if we already processed this exact transcript
              if (this.lastProcessedTranscript === fullText) {
                console.log('⏭️ SKIPPING DUPLICATE transcript:', fullText.substring(0, 50));
                return;
              }
              console.log('📝 FULL TEXT:', fullText);
              this.lastProcessedTranscript = fullText;
              this.lastProcessedResponseId = event.response_id || null;
              this.callbacks.onAssistantTranscript?.(fullText, true);
              return; // Exit early - we have the full text
            }
          }
        }
        break;

      // IGNORE these events - they cause fragmentation
      case 'response.audio_transcript.delta':
        console.log('⏭️ IGNORING audio_transcript.delta - causes fragmentation');
        return;

      case 'response.audio_transcript.done':
        console.log('⏭️ IGNORING audio_transcript.done - we already have full text');
        return;

      case 'response.text.delta':
      case 'response.output_text.delta':
        console.log('⏭️ IGNORING text delta - causes fragmentation');
        return;

      case 'response.content_part.delta':
        console.log('⏭️ IGNORING content_part.delta - causes fragmentation');
        return;

      // Fallback if output_item.added didn't contain the text
      case 'response.output_item.done':
        console.log('✅ OUTPUT ITEM DONE (fallback), response_id:', event.response_id);
        if (event.item?.content) {
          for (const content of event.item.content) {
            const fullText = content.transcript || content.text;
            if (fullText?.trim()) {
              // DEDUPLICATION: Skip if we already processed this exact transcript
              if (this.lastProcessedTranscript === fullText) {
                console.log('⏭️ SKIPPING DUPLICATE transcript (fallback):', fullText.substring(0, 50));
                return;
              }
              console.log('📝 FULL TEXT (from done):', fullText);
              this.lastProcessedTranscript = fullText;
              this.lastProcessedResponseId = event.response_id || null;
              this.callbacks.onAssistantTranscript?.(fullText, true);
              return;
            }
          }
        }
        break;

      case 'response.audio.delta':
        this.resetInactivityTimer(); // AI is actively speaking — keep the session alive
        // STEP 7: Comprehensive validation logging
        console.log('🎵 ========== AUDIO DELTA RECEIVED ==========');
        console.log('🎵 Muted:', this.isMuted);
        console.log('🎵 Paused:', this.isPaused);
        console.log('🎵 isAssistantSpeaking:', this.isAssistantSpeaking);
        
        if (this.isPaused || this.isMuted) {
          console.log('✅ STEP 7 VALIDATION: Audio delta BLOCKED (muted/paused)');
          console.log('🔇 Discarding audio delta (paused/muted)');
          break;
        }
        
        console.log('🎵 Audio delta ALLOWED - playing');
        if (!this.isAssistantSpeaking) {
          this.isAssistantSpeaking = true;
          this.callbacks.onAssistantAudioStart?.();
          console.log('🎵 Started assistant audio playback');
        }
        break;

      case 'response.audio.done':
        console.log('Audio playback complete');
        
        if (this.isPaused || this.isMuted) {
          console.log('Audio done ignored (muted/paused)');
          break;
        }
        
        this.isAssistantSpeaking = false;
        this.callbacks.onAssistantAudioEnd?.();
        break;

      case 'response.function_call_arguments.done':
        // Function call completed - handle it
        console.log('🔧 ===== FUNCTION CALL DONE =====');
        console.log('🔧 Call ID:', event.call_id);
        console.log('🔧 Function name:', event.name);
        console.log('🔧 Raw arguments:', event.arguments);
        console.log('🔧 Event type:', event.type);
        console.log('🔧 Full event:', JSON.stringify(event, null, 2));
        
        if (event.name === 'book_appointment') {
          console.log('📅 ===== OPEN REVIEW MODAL =====');
          try {
            // Step 1: Parse arguments from AI
            const aiBookingData = parseBookingArguments(event.arguments);
            console.log('📋 AI provided data:', aiBookingData);

            // Step 2: Get any existing data from ConversationMemory
            const memoryData = conversationMemory.getCurrentContext().pendingBooking || {};
            console.log('📋 Memory data:', memoryData);

            // Step 3: Merge data (AI data takes precedence)
            const mergedData = mergeBookingData(aiBookingData, memoryData);
            console.log('📋 Merged data:', mergedData);

            // Step 4: Validate completeness
            if (!validateBookingData(mergedData)) {
              console.error('❌ Incomplete booking data:', mergedData);
              conversationMemory.setContext({ 
                conversationPhase: 'collecting' 
              });
              this.callbacks.onError?.('Missing required booking information');
              return;
            }

            // Step 5: Update ConversationMemory with merged data
            conversationMemory.updateBookingInfo(mergedData, 'voice');

            // Step 6: Transition to 'reviewing' phase (NOT submitting)
            console.log('📋 Setting phase to reviewing...');
            conversationMemory.setContext({ 
              conversationPhase: 'reviewing' 
            });

            // Step 7: Trigger REVIEW modal (user must confirm before submission)
            console.log('📋 Emitting show_confirmation event...');
            conversationMemory.showBookingConfirmation(mergedData, 'voice');
            
            // Release the OpenAI turn BEFORE opening the modal.
            // If we call onBookingReady first, React mutes the audioEl within ms
            // and the AI's acknowledgement never plays.
            if (this.dc?.readyState === 'open') {
              this.dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: event.call_id,
                  output: JSON.stringify({ success: true, status: 'booking_form_opened' })
                }
              }));
              this.dc.send(JSON.stringify({
                type: 'response.create',
                response: {
                  instructions: 'The booking form is now open on screen. Tell the user briefly to review their details and confirm. Keep it to one short sentence.'
                }
              }));
            }

            // Open the modal after queuing the AI response
            console.log('📋 Calling onBookingReady callback...');
            this.callbacks.onBookingReady?.(mergedData);
            console.log('📅 ===== REVIEW MODAL SHOULD NOW BE OPEN =====');

          } catch (error) {
            console.error('❌ Error preparing booking review:', error);
            conversationMemory.setContext({ 
              conversationPhase: 'collecting' 
            });
            this.callbacks.onError?.('Could not process booking');
          }
        } else if (event.name === 'call_business') {
          try {
            // Fetch the actual phone number from the backend
            const { data: contactData } = await supabase.functions.invoke('contact-redirect', {
              body: {
                assistantId: this.assistantId,
                contactType: 'phone',
                userMessage: 'User requested to call'
              }
            });
            
            if (contactData?.not_activated) {
              const msg = contactData.message || `${contactData.business_name || 'This business'} hasn't published a phone number yet. You can leave your details here or book a callback instead.`;
              this.callbacks.onError?.(msg);
            } else if (contactData?.contact_url) {
              const phoneNumber = contactData.contact_url.replace('tel:', '').trim();
              console.log('Got phone number:', phoneNumber);
              
              const phoneMessage = `📞 CALL_NOW:${phoneNumber}:${this.assistantId}`;
              this.callbacks.onAssistantTranscript?.(phoneMessage, true);
            } else {
              console.error('No contact URL received');
              this.callbacks.onError?.('Phone number not available');
            }
          } catch (error) {
            console.error('Error fetching phone number:', error);
            this.callbacks.onError?.('Could not retrieve phone number');
          }
        } else if (event.name === 'navigate_to_page') {
          console.log('🧭 ===== NAVIGATE_TO_PAGE TRIGGERED =====');
          try {
            const args = typeof event.arguments === 'string' 
              ? JSON.parse(event.arguments) 
              : event.arguments;
            
            const pageRequest = args.page || args.pageRequest || args.page_request || '';
            console.log('🧭 Navigation requested for:', pageRequest);
            console.log('🧭 Arguments received:', JSON.stringify(args, null, 2));
            console.log('🧭 Current website URL:', this.websiteUrl);
            
            if (!this.websiteUrl) {
              console.warn('⚠️ No website URL configured for navigation');
              this.callbacks.onError?.('Navigation not available - website URL not configured');
              return;
            }
            
            // Import and initialize URLMapper
            const { URLMapper } = await import('./URLMapper');
            const urlMapper = new URLMapper(this.assistantId, this.websiteUrl);
            
            // Load scraped data from database to check if URLs exist
            let scrapedData: any = { navigationMapping: {}, anchorLinks: [], isSinglePageSite: false };
            try {
              const supabase = (await import('@/integrations/supabase/client')).supabase;
              const { data: assistantData } = await supabase
                .from('assistants')
                .select('scraped_content')
                .eq('id', this.assistantId)
                .single();
              
              if (assistantData?.scraped_content) {
                scrapedData = assistantData.scraped_content;
                console.log('🗺️ Loaded scraped data:', {
                  hasNavMapping: !!scrapedData.navigationMapping,
                  anchorLinksCount: scrapedData.anchorLinks?.length || 0,
                  isSinglePage: scrapedData.isSinglePageSite
                });
              }
            } catch (error) {
              console.warn('⚠️ Could not load scraped data:', error);
            }
            
            // Initialize with scraped data
            await urlMapper.initialize([], scrapedData);
            
            // Get the navigation target with metadata
            const navTarget = urlMapper.getNavigationInfo(pageRequest);
            
            if (navTarget) {
              console.log('✅ Navigation target found:', {
                url: navTarget.url,
                openInNewTab: navTarget.openInNewTab,
                type: navTarget.type,
                exists: navTarget.exists
              });
              
              // Warn if URL doesn't exist in scraped data
              if (!navTarget.exists) {
                console.warn('⚠️ WARNING: URL not found in scraped data, may result in 404');
              }
              
              // Send navigation message with metadata via assistant transcript callback
              // Format: 🧭 NAVIGATE:{url}|{openInNewTab}|{type}|{exists}
              const navMessage = `🧭 NAVIGATE:${navTarget.url}|${navTarget.openInNewTab}|${navTarget.type}|${navTarget.exists}`;
              this.callbacks.onAssistantTranscript?.(navMessage, true);
              
              console.log('📤 Navigation message sent:', navMessage);
            } else {
              console.warn('⚠️ No navigation target found for:', pageRequest);
              this.callbacks.onError?.(`Could not find page: ${pageRequest}`);
            }
            
          } catch (error) {
            console.error('❌ Error processing navigation:', error);
            this.callbacks.onError?.('Navigation failed');
          }
        } else if (event.name === 'capture_lead') {
          console.log('📨 ===== CAPTURE_LEAD TRIGGERED =====');
          try {
            const args = typeof event.arguments === 'string' ? JSON.parse(event.arguments) : event.arguments;
            const supabase = (await import('@/integrations/supabase/client')).supabase;

            // Build a transcript snapshot from ConversationMemory
            const msgs = conversationMemory.getMessages?.() || [];
            const transcript = msgs.map((m: any) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            }));

            const { data: leadData, error: leadError } = await supabase.functions.invoke('capture-lead', {
              body: {
                assistantId: this.assistantId,
                userEmail: args.user_email,
                userPhone: args.user_phone,
                userName: args.user_name,
                problemSummary: args.problem_summary,
                transcript,
              },
            });

            if (leadError || !leadData?.success) {
              console.error('Lead capture failed:', leadError || leadData);
              this.callbacks.onAssistantTranscript?.(
                "I had trouble saving your details. Could you share your email one more time?",
                true
              );
            } else {
              console.log('✅ Lead captured:', leadData.leadId);
              const successMsg = leadData.message
                || "✅ Got it — your details have been sent to the team and they'll reach out shortly.";
              this.callbacks.onAssistantTranscript?.(successMsg, true);
            }
          } catch (error) {
            console.error('❌ capture_lead error:', error);
            this.callbacks.onError?.('Could not save your details');
          }
        }
        break;

      case 'response.done':
        console.log('✅ Response done');
        this.currentAssistantTranscript = '';
        this.assistantResponseStarted = false;
        break;

      case 'error':
        console.error('❌ Realtime API error:', event.error);
        this.callbacks.onError?.(event.error?.message || 'Unknown error');
        break;

      case 'session.created':
        console.log('✅ Session created - injecting conversation history');
        // Inject conversation history after session is created
        await this.injectConversationHistory();
        // Start the 30s idle countdown now the session is live (covers "connect
        // then walk away" without speaking). Reset on any real activity below.
        this.resetInactivityTimer();

        // PART 4: Set initialization timeout - allow responses after 500ms
        console.log('⏳ Starting 500ms initialization period...');
        this.initializationTimeout = window.setTimeout(() => {
          console.log('✅ Initialization period complete - allowing responses');
          this.isInitializing = false;
        }, 500);
        break;

      case 'session.updated':
        console.log('✅ Session updated');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('🎤 Speech stopped - processing...');
        this.callbacks.onUserSpeechStop?.();
        break;

      default:
        // Log all unhandled events with detailed info
        if (event.type?.startsWith('response.')) {
          console.log('🔍 UNHANDLED RESPONSE EVENT:', event.type);
          console.log('📦 Event data:', {
            type: event.type,
            item: event.item,
            content: event.item?.content,
            delta: event.delta,
            text: event.text,
            transcript: event.transcript
          });
        } else {
          console.log('📨 Unhandled event type:', event.type);
        }
    }
  }

  async sendMessage(text: string, bookingContext?: any, conversationHistory?: any[]) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    console.log('💬 Sending text message:', text);
    console.log('📋 With booking context:', bookingContext);
    console.log('💭 With conversation history:', conversationHistory);

    // Create a comprehensive context message that includes booking info and conversation history
    let contextMessage = '';
    
    const phase = bookingContext?.conversationPhase || 'collecting';
    
    if (bookingContext?.pendingBooking) {
      const booking = bookingContext.pendingBooking;
      contextMessage += `\n\n[BOOKING CONTEXT]\n`;
      if (booking.userName) contextMessage += `Name: ${booking.userName}\n`;
      if (booking.userEmail) contextMessage += `Email: ${booking.userEmail}\n`;
      if (booking.userPhone) contextMessage += `Phone: ${booking.userPhone}\n`;
      if (booking.preferredTime) contextMessage += `Preferred Time: ${booking.preferredTime}\n`;
      if (booking.serviceType) contextMessage += `Service: ${booking.serviceType}\n`;
      contextMessage += `Phase: ${phase}\n`;
      if (bookingContext.nextField) contextMessage += `Next Field: ${bookingContext.nextField}\n`;
      
      // Add phase-specific context
      if (phase === 'reviewing') {
        contextMessage += `\n[BOOKING REVIEW PHASE]
The user is currently reviewing their booking details in a modal window.
Wait for them to confirm or make changes. Do not ask for information again.
Acknowledge that you're waiting for their confirmation.\n`;
      } else if (phase === 'submitting') {
        contextMessage += `\n[BOOKING SUBMISSION IN PROGRESS]
The booking is currently being submitted. Please wait for confirmation before responding.\n`;
      } else if (phase === 'complete') {
        contextMessage += `\n[BOOKING COMPLETE]
The booking has been successfully submitted. Thank the user for booking!\n`;
      }
    }

    if (conversationHistory && conversationHistory.length > 0) {
      contextMessage += `\n\n[RECENT CONVERSATION]\n`;
      conversationHistory.slice(-5).forEach((msg, idx) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        contextMessage += `${role}: ${msg.content}\n`;
      });
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text + contextMessage
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  isMicrophoneActive() {
    if (!this.localAudioTrack) {
      return false;
    }

    return this.isListening && this.localAudioTrack.enabled;
  }

  // Restart the 30s idle countdown. Called only on genuine conversation activity
  // (user speech / AI response), NOT on keepalive pings, so a muted/abandoned
  // session still times out and stops burning credits.
  private resetInactivityTimer = () => {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = window.setTimeout(() => {
      console.log('⏱️ Voice chat inactivity timeout — closing session to save credits');
      try { this.callbacks.onInactivityTimeout?.(); } catch (e) { console.warn(e); }
      this.disconnect();
    }, this.INACTIVITY_MS);
  };

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting RealtimeChat');

    // Clear initialization timeout
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }

    // Use lightweight pause (tracks will be fully stopped below anyway)
    this.isMuted = true;
    this.isListening = false;
    this.isPaused = true;
    this.stopKeepAlive();
    this.clearInactivityTimer();
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.localStream = null;
    this.localAudioTrack = null;
    this.isListening = false;
    this.recorder = null;
    this.dc = null;
    this.pc = null;
    this.isInitializing = true; // Reset for next connection
    
    if (this.audioEl.srcObject) {
      const tracks = (this.audioEl.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      this.audioEl.srcObject = null;
    }
  }

  // LIGHTWEIGHT pause — used by mic toggle button. Instant and reversible.
  pauseListening() {
    console.log('🔇 pauseListening (lightweight): disabling mic and muting audio');
    
    this.isMuted = true;
    this.isListening = false;
    this.isPaused = true;

    // Mute audio output (reversible)
    if (this.audioEl) {
      this.audioEl.muted = true;
      this.audioEl.pause();
      console.log('🔇 Audio element muted and paused');
    }

    // Disable mic track (reversible — NOT .stop())
    if (this.localAudioTrack) {
      this.localAudioTrack.enabled = false;
      console.log('🔇 Microphone track disabled');
    }

    // Cancel any in-flight AI response
    if (this.dc && this.dc.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify({ type: 'response.cancel' }));
        this.dc.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
        console.log('🔇 Sent response.cancel + input_audio_buffer.clear');
      } catch (error) {
        console.warn('⚠️ Failed to send cancel/clear:', error);
      }
    }

    this.wasSpeaking = this.isAssistantSpeaking;
    this.isAssistantSpeaking = false;
    console.log('🔇 pauseListening complete');
  }

  // MIC-ONLY pause — used when booking modal opens. Cuts the user's mic but keeps AI audio playing
  // so the assistant can finish its acknowledgement before the modal takes over.
  pauseMicOnly() {
    console.log('🔇 pauseMicOnly: disabling mic only, AI audio stays live');
    this.isListening = false;
    if (this.localAudioTrack) {
      this.localAudioTrack.enabled = false;
    }
    if (this.dc && this.dc.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
      } catch (_) {}
    }
  }

  // AGGRESSIVE mute — used by external widget mute button. Destroys tracks, disables VAD, starts keepalive.
  hardMute() {
    console.log('🔇 ========== HARD MUTE: AGGRESSIVE PAUSE START ==========');
    
    // CRITICAL: Immediately silence audio FIRST
    if (this.audioEl) {
      this.audioEl.volume = 0;
      this.audioEl.muted = true;
      this.audioEl.pause();
      console.log('🔇 IMMEDIATE SILENCE: Audio element volume=0, muted=true, paused');
    }
    
    // Stop audio element tracks
    if (this.audioEl.srcObject) {
      const stream = this.audioEl.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
        track.stop();
        console.log('🛑 Disabled and stopped audio track:', track.id);
      });
    }
    
    this.wasSpeaking = this.isAssistantSpeaking;
    this.isMuted = true;
    this.isListening = false;
    this.isPaused = true;
    this.isAssistantSpeaking = false;

    // Send cancel + disable VAD
    if (this.dc && this.dc.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify({ type: 'response.cancel' }));
        this.dc.send(JSON.stringify({ type: 'response.cancel' }));
        this.dc.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
        this.dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: null,
            input_audio_transcription: null
          }
        }));
        console.log('✅ Sent cancel, clear, and disabled VAD/transcription');
      } catch (error) {
        console.warn('⚠️ Failed to send cancel/clear/session.update:', error);
      }
    }

    // Close audio transceivers
    if (this.pc) {
      const receivers = this.pc.getReceivers();
      receivers.forEach(receiver => {
        if (receiver.track.kind === 'audio') {
          receiver.track.stop();
          receiver.track.enabled = false;
        }
      });
      const transceivers = this.pc.getTransceivers();
      transceivers.forEach(transceiver => {
        if (transceiver.receiver.track.kind === 'audio') {
          transceiver.direction = 'inactive';
        }
      });
      console.log('✅ All audio transceivers closed/inactivated');
    }

    // Recreate audio element
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      if (this.audioEl.srcObject) {
        (this.audioEl.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        this.audioEl.srcObject = null;
      }
      const parent = this.audioEl.parentNode;
      if (parent) parent.removeChild(this.audioEl);
      this.audioEl = document.createElement("audio");
      this.audioEl.autoplay = false;
      this.audioEl.muted = true;
      console.log('✅ Created fresh audio element (muted, no autoplay)');
    }

    // Disable microphone
    if (this.localAudioTrack) {
      this.localAudioTrack.enabled = false;
    }
    
    this.startKeepAlive();
    console.log('🔇 ========== HARD MUTE: AGGRESSIVE PAUSE COMPLETE ==========');
  }

  setExternalMuteState(isMuted: boolean) {
    console.log(`🔄 External mute state changed to: ${isMuted}`);
    this.isMuted = isMuted;
    
    if (isMuted) {
      console.log('🔇 Externally muted - calling hardMute()');
      this.hardMute();
    } else {
      console.log('🔊 Externally unmuted - calling hardUnmute()');
      this.hardUnmute();
    }
  }

  // STEP 4: Keepalive mechanism to prevent timeout when muted
  private startKeepAlive() {
    // Clear any existing keepalive
    this.stopKeepAlive();
    
    console.log('⏰ ========== LAYER 1 FIX: KEEPALIVE STARTED (PING-BASED) ==========');
    console.log('⏰ Starting keepalive (data channel ping, NO audio)');
    
    this.keepAliveInterval = window.setInterval(() => {
      if (this.dc && this.dc.readyState === 'open' && this.isMuted) {
        try {
          // LAYER 1 FIX: Send empty session update as keepalive ping (NOT audio)
          // This keeps the WebSocket alive without triggering VAD
          this.dc.send(JSON.stringify({
            type: 'session.update',
            session: {} // Empty update just to keep connection alive
          }));
          
          console.log('⏰ Sent keepalive ping (no audio, VAD stays disabled)');
        } catch (error) {
          console.warn('⚠️ Failed to send keepalive:', error);
        }
      }
    }, 5000); // Every 5 seconds
    
    console.log('✅ Keepalive interval established (ping-based, no audio)');
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval !== null) {
      console.log('⏰ STEP 4: Stopping keepalive');
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // Helper to encode audio data (needed for keepalive)
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

  // LIGHTWEIGHT resume — used by mic toggle button. Instant and reversible.
  async resumeListening() {
    console.log('🎙️ resumeListening (lightweight): re-enabling mic and audio');
    
    this.wasSpeaking = false;
    this.isMuted = false;
    this.isPaused = false;

    // Unmute audio output
    if (this.audioEl) {
      this.audioEl.volume = 1;
      this.audioEl.muted = false;
      this.audioEl.autoplay = true;
      try { await this.audioEl.play(); } catch (_) {}
      console.log('🎙️ Audio element unmuted, volume=1, autoplay=true');
    }

    // Re-enable mic track
    if (this.localAudioTrack) {
      this.localAudioTrack.enabled = true;
      this.isListening = true;
      console.log('🎙️ Microphone track re-enabled');
    } else {
      console.warn('RealtimeChat: No local audio track available to resume');
    }

    console.log('🎙️ resumeListening complete');
  }

  // AGGRESSIVE unmute — used by external widget unmute. Reconstructs transceivers, re-enables VAD, etc.
  async hardUnmute() {
    console.log('🎙️ ========== HARD UNMUTE: FULL RESUME START ==========');
    
    this.wasSpeaking = false;
    this.stopKeepAlive();
    this.isMuted = false;
    this.isPaused = false;

    // Restore audio element
    if (this.audioEl) {
      this.audioEl.volume = 1;
      this.audioEl.muted = false;
      this.audioEl.autoplay = true;
      console.log('🎙️ Audio element restored: volume=1, muted=false, autoplay=true');
    }
    
    // Re-enable OpenAI VAD and transcription
    if (this.dc && this.dc.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.85,
              prefix_padding_ms: 500,
              silence_duration_ms: 2000

            },
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        }));
        console.log('✅ Re-enabled OpenAI VAD and transcription');
      } catch (error) {
        console.warn('⚠️ Failed to send session.update:', error);
      }
    }

    // Re-enable transceivers
    if (this.pc) {
      const transceivers = this.pc.getTransceivers();
      transceivers.forEach(transceiver => {
        if (transceiver.receiver.track.kind === 'audio') {
          transceiver.direction = 'recvonly';
        }
      });
      const receivers = this.pc.getReceivers();
      receivers.forEach(receiver => {
        if (receiver.track.kind === 'audio') {
          receiver.track.enabled = true;
        }
      });
      
      // Re-establish ontrack handler
      this.pc.ontrack = (e) => {
        if (!this.isPaused && !this.isMuted) {
          this.audioEl.srcObject = e.streams[0];
          this.audioEl.autoplay = true;
          this.audioEl.muted = false;
          this.audioEl.play().catch(err => console.warn('Audio play failed:', err));
        }
      };
      console.log('✅ Audio transceivers re-enabled');
    }

    // Re-enable mic
    if (this.localAudioTrack) {
      this.localAudioTrack.enabled = true;
      this.isListening = true;
      console.log('🎙️ Microphone re-enabled');
    }

    if (!this.historyInjected) {
      await this.injectConversationHistory();
    }

    console.log('🎙️ ========== HARD UNMUTE: FULL RESUME COMPLETE ==========');
  }
}
