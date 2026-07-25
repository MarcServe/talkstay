import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeVoiceForm } from '@/utils/RealtimeVoiceForm';
import { formMemory } from '@/utils/FormMemory';
import { VoiceConsentOverlay } from '@/components/VoiceConsentOverlay';
import { VADThresholdControl } from '@/components/VADThresholdControl';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface FormConversationInterfaceProps {
  formConfig: any;
  sessionId: string;
}

const FormConversationInterface: React.FC<FormConversationInterfaceProps> = ({
  formConfig,
  sessionId
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [showConsent, setShowConsent] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [fieldsCaptured, setFieldsCaptured] = useState(0);
  const [isUserInterrupting, setIsUserInterrupting] = useState(false);
  const [vadThreshold, setVadThreshold] = useState(0.6);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // Track if user clicked start
  const [hasEverConnected, setHasEverConnected] = useState(false); // Track if ever successfully connected
  const [connectionError, setConnectionError] = useState(false); // Track if last connection failed
  const [isVADExpanded, setIsVADExpanded] = useState(false); // Default to collapsed for better transcript visibility
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<RealtimeVoiceForm | null>(null);
  const interruptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capturedFieldNamesRef = useRef<Set<string>>(new Set());

  const CONSENT_KEY = 'talkweb_voice_form_consent';

  const requiredFieldNames = React.useMemo(() => {
    if (!Array.isArray(formConfig?.topics)) return [];

    const fields = new Set<string>();
    formConfig.topics
      .filter((topic: any) => topic.required === true)
      .forEach((topic: any) => {
        (topic.dataPoints || []).forEach((field: string) => {
          if (field) fields.add(field);
        });
      });

    return Array.from(fields);
  }, [formConfig]);

  // Calculate total REQUIRED fields from form config
  const totalFields = requiredFieldNames.length;

  // Check for existing consent on mount
  useEffect(() => {
    console.log('🔍 Checking for existing consent...');
    const stored = localStorage.getItem(CONSENT_KEY);
    console.log('Stored consent:', stored);
    
    // If previously declined, clear it and show modal again
    if (stored === 'declined') {
      console.log('⚠️ Previous decline found, clearing and showing modal');
      localStorage.removeItem(CONSENT_KEY);
      setShowConsent(true);
      return;
    }
    
    if (stored === 'granted') {
      console.log('✅ Consent already granted');
      setHasConsent(true);
      setShowConsent(false);
    } else {
      console.log('⚠️ No consent found, showing modal');
      setShowConsent(true);
    }
  }, []);

  // Initialize form memory - clear EVERYTHING first to prevent old data bleeding
  useEffect(() => {
    console.log('🧹 CLEARING ALL FORM MEMORY (complete reset)');
    formMemory.clearAllForms(); // Clear all sessions completely
    
    console.log('🧹 Clearing specific session:', sessionId);
    formMemory.clearForm(sessionId);
    
    console.log('🆕 Initializing fresh form memory');
    formMemory.initializeForm(formConfig.id, sessionId);
    capturedFieldNamesRef.current = new Set();
    setFieldsCaptured(0);
    
    // Broadcast reset event to parent window to clear external caches
    console.log('📢 Broadcasting voice_form_reset event to parent window');
    window.parent.postMessage({
      type: 'voice_form_reset',
      formId: formConfig.id,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, '*');
  }, [formConfig.id, sessionId]);

  // DO NOT auto-connect - wait for user to click Start button
  // This was removed to improve UX and prevent confusion

  // Monitor connection status every 5 seconds
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      console.log('🔍 Connection status check:', {
        isConnected,
        connectionState,
        isMuted,
        isSpeaking,
        realtimeExists: !!realtimeRef.current
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isConnected, connectionState, isMuted, isSpeaking]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for session end event from FormDataCapturePanel
  useEffect(() => {
    const handleSessionEnd = (event: CustomEvent) => {
      console.log('🏁 Voice session end event received:', event.detail);
      
      // Don't disconnect immediately - let the AI finish speaking first
      // The session_end_ready event from server will trigger actual disconnect
      console.log('⏳ Waiting for AI to finish farewell message...');
    };

    window.addEventListener('voice_session_end', handleSessionEnd as EventListener);
    
    return () => {
      window.removeEventListener('voice_session_end', handleSessionEnd as EventListener);
    };
  }, []);

  // Handle realtime messages
  const handleRealtimeMessage = (data: any) => {
    console.log('📨 Realtime event:', data.type);

    // Handle transcripts
    if (data.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = data.transcript || '';
      setUserTranscript('');
      
      if (transcript) {
        const userMessage: Message = {
          sender: 'user',
          text: transcript,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        formMemory.addMessage(sessionId, 'user', transcript);
      }
    }

    if (data.type === 'response.audio_transcript.delta' || data.type === 'response.output_audio_transcript.delta') {
      setAiTranscript(prev => prev + (data.delta || ''));
    }

    if (data.type === 'response.audio_transcript.done' || data.type === 'response.output_audio_transcript.done') {
      const transcript = data.transcript || aiTranscript;
      if (transcript) {
        const aiMessage: Message = {
          sender: 'ai',
          text: transcript,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        formMemory.addMessage(sessionId, 'assistant', transcript);
      }
      setAiTranscript('');
    }

    // Handle voice-triggered submission
    if (data.type === 'submit_form_requested') {
      console.log('📤 [DEBUG] submit_form_requested received');
      console.log('[DEBUG] Current sessionId:', sessionId);
      console.log('[DEBUG] Dispatching voice_form_submit event');
      
      toast({
        title: "Submitting Form...",
        description: "Processing your information",
      });
      
      // Trigger the FormDataCapturePanel's submit function
      window.dispatchEvent(new CustomEvent('voice_form_submit', {
        detail: { sessionId }
      }));
      
      console.log('[DEBUG] voice_form_submit event dispatched');
    }

    // Handle session end ready signal from server
    if (data.type === 'session_end_ready') {
      console.log('🏁 Session end signal received from server');
      
      toast({
        title: "Session Complete ✅",
        description: "Thank you! Your form has been submitted successfully.",
        duration: 5000,
      });
      
      // Mark session as complete
      setSessionComplete(true);
      
      // Disconnect gracefully after a brief delay
      setTimeout(() => {
        console.log('🔌 Disconnecting voice session...');
        if (realtimeRef.current) {
          realtimeRef.current.disconnect();
          setIsConnected(false);
          setConnectionState('disconnected');
        }
      }, 1000);
    }

    // Manual typed fallback after repeated mishears on a critical field
    if (data.type === 'manual_fallback_required') {
      const friendly = String(data.field || 'value').replace(/_/g, ' ');
      toast({
        title: 'Trouble hearing your ' + friendly,
        description: data.message || `You can type your ${friendly} directly in the panel on the right, or spell it slowly.`,
        duration: 8000,
      });
      // Open the field for editing in FormDataCapturePanel via existing edit affordance
      window.parent.postMessage({
        type: 'voice_form_manual_fallback',
        formId: formConfig.id,
        sessionId,
        fieldName: data.field,
        timestamp: new Date().toISOString()
      }, '*');
    }


    if (data.type === 'field_committed') {
      const { field, value, fieldsCompleted, totalFields: serverTotal } = data;
      console.log(`✅ field_committed: ${field} = ${value}`);

      formMemory.updateFormData(sessionId, { [field]: value });
      const updatedCount = typeof fieldsCompleted === 'number' ? fieldsCompleted : fieldsCaptured + 1;
      setFieldsCaptured(updatedCount);

      window.parent.postMessage({
        type: 'voice_form_field_captured',
        formId: formConfig.id,
        sessionId,
        fieldName: field,
        fieldValue: value,
        timestamp: new Date().toISOString()
      }, '*');

      const total = serverTotal || totalFields;
      const progress = total > 0 ? Math.round((updatedCount / total) * 100) : 0;
      window.parent.postMessage({
        type: 'voice_form_progress',
        formId: formConfig.id,
        sessionId,
        fieldsCompleted: updatedCount,
        totalFields: total,
        progress,
        timestamp: new Date().toISOString()
      }, '*');

      toast({
        title: 'Saved ✓',
        description: `Got your ${String(field).replace(/_/g, ' ')}`,
      });

      if (updatedCount >= total && total > 0) {
        toast({
          title: "All Set! 🎉",
          description: "You've completed all required fields",
          duration: 5000,
        });
      }
    }
  };

  // Toggle mute
  const handleToggleMute = () => {
    if (!realtimeRef.current) return;

    if (isMuted) {
      realtimeRef.current.unmute();
      setIsMuted(false);
      toast({
        title: "Unmuted",
        description: "Microphone is now active",
      });
    } else {
      realtimeRef.current.mute();
      setIsMuted(true);
      toast({
        title: "Muted",
        description: "Microphone is paused",
      });
    }
  };

  // Toggle connection
  const handleToggleConnection = async () => {
    if (isConnected) {
      // Disconnect
      realtimeRef.current?.disconnect();
      setIsConnected(false);
      setConnectionState('disconnected');
      setIsMuted(false);
      toast({
        title: "Disconnected",
        description: "Voice conversation ended",
      });
    } else {
      // Mark that user has initiated start
      if (!hasStarted) {
        setHasStarted(true);
      }
      
      // Connect or reconnect
      try {
        console.log('🔄 Starting voice connection...');
        setConnectionState('connecting');
        setConnectionError(false);
        
        realtimeRef.current = new RealtimeVoiceForm(
          (message) => handleRealtimeMessage(message),
          (speaking) => setIsSpeaking(speaking),
          () => {
            setIsUserInterrupting(true);
            if (interruptTimeoutRef.current) {
              clearTimeout(interruptTimeoutRef.current);
            }
            interruptTimeoutRef.current = setTimeout(() => {
              setIsUserInterrupting(false);
            }, 2000);
          },
          (level) => setAudioLevel(level)
        );
        
        await realtimeRef.current.connect(formConfig.id);
        setIsConnected(true);
        setConnectionState('connected');
        setIsMuted(false);
        setHasEverConnected(true);
        
        toast({
          title: hasEverConnected ? "Reconnected" : "Connected",
          description: "Voice conversation ready. Start speaking!",
        });
      } catch (error) {
        console.error('❌ Failed to connect:', error);
        setConnectionState('disconnected');
        setConnectionError(true);
        toast({
          title: "Connection Failed",
          description: "Please check microphone permissions and try again",
          variant: "destructive",
        });
      }
    }
  };

  // Handle consent
  const handleConsent = () => {
    console.log('✅ User granted consent');
    setHasConsent(true);
    setShowConsent(false);
    localStorage.setItem(CONSENT_KEY, 'granted');
  };

  const handleDecline = () => {
    console.log('❌ User declined consent');
    setShowConsent(false);
    // Don't permanently store decline - just close modal
    toast({
      title: "Voice Access Required",
      description: "Voice permission is needed to use this form. Refresh to try again.",
      variant: "destructive",
    });
  };

  // Handle VAD threshold change
  const handleThresholdChange = (newThreshold: number) => {
    console.log('🎚️ User changed VAD threshold to:', newThreshold);
    setVadThreshold(newThreshold);
    realtimeRef.current?.updateVADThreshold(newThreshold);
    toast({
      title: "Sensitivity Updated",
      description: `Voice detection set to ${(newThreshold * 100).toFixed(0)}%`,
    });
  };

  return (
    <>
      <VoiceConsentOverlay
        isVisible={showConsent}
        onConsent={handleConsent}
        onDecline={handleDecline}
        assistantName="Voice Form Assistant"
      />
      
      <div className="flex flex-col h-full bg-transparent">
      {/* Full-Screen Success Overlay */}
      {sessionComplete && (
        <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-background to-emerald-50 dark:from-green-950/30 dark:via-background dark:to-emerald-950/30 z-[100] flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-6 p-8 max-w-lg mx-4">
            {/* Business Logo */}
            {formConfig?.branding_logo_url && (
              <img 
                src={formConfig.branding_logo_url} 
                alt={formConfig.business_name || 'Business'} 
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
            )}
            
            {/* Success Icon with Animation */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 animate-scale-in">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Celebration rings */}
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-green-400/30 animate-ping" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-foreground">
                Form Submitted! 🎉
              </h3>
              <p className="text-lg text-muted-foreground">
                Thank you for your submission
              </p>
            </div>
            
            {/* Business name */}
            {formConfig?.business_name && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{formConfig.business_name}</span> will be in touch soon
              </p>
            )}
            
            {/* Fields summary */}
            {totalFields > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{fieldsCaptured}</span> fields captured successfully
                </p>
              </div>
            )}
            
            <Button
              onClick={() => window.location.reload()}
              className="mt-6 px-8 py-3 text-base"
              size="lg"
            >
              Start New Form
            </Button>
          </div>
        </div>
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}
        
        {/* Show interim transcripts */}
        {userTranscript && (
          <div className="flex justify-end opacity-60">
            <div className="max-w-[80%] rounded-lg p-4 bg-primary/50 text-primary-foreground">
              <p className="text-sm italic">{userTranscript}...</p>
            </div>
          </div>
        )}
        
        {aiTranscript && (
          <div className="flex justify-start opacity-60">
            <div className="max-w-[80%] rounded-lg p-4 bg-muted/50 text-foreground">
              <p className="text-sm italic">{aiTranscript}...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Controls */}
      <div className="border-t bg-background/60 backdrop-blur-sm p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col items-center gap-4">
            {/* Connection Status */}
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isConnected 
                ? isMuted
                  ? 'bg-orange-500'
                  : isUserInterrupting
                    ? 'bg-blue-500 animate-pulse scale-110 ring-4 ring-blue-300'
                    : isSpeaking 
                      ? 'bg-green-500 animate-pulse scale-110' 
                      : 'bg-primary'
                : 'bg-gray-400'
              }
            `}>
              {isConnected ? (
                isMuted ? (
                  <VolumeX className="h-8 w-8 text-white" />
                ) : isUserInterrupting ? (
                  <Mic className="h-8 w-8 text-white animate-pulse" />
                ) : isSpeaking ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )
              ) : (
                <MicOff className="h-8 w-8 text-white" />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium">
                {sessionComplete ? "Session Complete ✅" : 
                 !hasStarted && !isConnected ? "Ready to begin" :
                 connectionState === 'connecting' ? "Connecting to voice assistant..." :
                 connectionState === 'connected' ? (
                   isUserInterrupting ? "👂 Listening to you..." :
                   isMuted ? "Microphone Muted" : isSpeaking ? "AI is speaking..." : "Listening..."
                 ) :
                 connectionError ? "Connection failed - please try again" :
                 hasEverConnected ? "Session ended" :
                 "Ready to connect"}
              </p>
              {!hasStarted && !isConnected && !sessionComplete && (
                <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                  Click below to start your voice conversation. We'll guide you through each step.
                </p>
              )}
              {connectionState === 'connected' && totalFields > 0 && !sessionComplete && (
                <p className="text-xs text-muted-foreground mt-1">
                  Progress: {fieldsCaptured}/{totalFields} fields collected
                </p>
              )}
            </div>

            {/* VAD Threshold Control - Only show when connected, collapsed by default */}
            {isConnected && (
              <div className="w-full max-w-md">
                <VADThresholdControl
                  threshold={vadThreshold}
                  onThresholdChange={handleThresholdChange}
                  audioLevel={audioLevel}
                  isListening={!isMuted && !isSpeaking}
                  isExpanded={isVADExpanded}
                  onToggleExpanded={() => setIsVADExpanded(!isVADExpanded)}
                />
              </div>
            )}

            <div className="flex gap-2">
              {isConnected && (
                <Button
                  onClick={handleToggleMute}
                  variant={isMuted ? "default" : "outline"}
                  size="sm"
                >
                  {isMuted ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Mute
                    </>
                  )}
                </Button>
              )}
              
              {isConnected && isSpeaking && (
                <Button
                  onClick={() => {
                    console.log('🛑 Manual stop requested by user');
                    realtimeRef.current?.clearAudioQueue();
                  }}
                  variant="destructive"
                  size="sm"
                  className="bg-destructive/90 hover:bg-destructive"
                >
                  <VolumeX className="h-4 w-4 mr-2" />
                  Stop AI
                </Button>
              )}
              
              <Button
                onClick={handleToggleConnection}
                variant={isConnected ? "destructive" : "default"}
                size={!hasStarted && !isConnected ? "lg" : "sm"}
                disabled={connectionState === 'connecting'}
                className={!hasStarted && !isConnected ? "text-lg px-8 py-6" : ""}
              >
                {connectionState === 'connecting' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : isConnected ? (
                  "End Conversation"
                ) : !hasStarted ? (
                  <>
                    <Mic className="h-5 w-5 mr-2" />
                    Start Voice Form
                  </>
                ) : connectionError ? (
                  "Try Again"
                ) : hasEverConnected ? (
                  "Start Again"
                ) : (
                  "Reconnect"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export { FormConversationInterface };
export default FormConversationInterface;
