import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchSafeAssistantData, validateSafeData } from "@/utils/assistantSecurity";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PreviewErrorBoundary } from "@/components/PreviewErrorBoundary";
import { runProductionDiagnostics, logDiagnostics } from "@/utils/productionDiagnostics";
import { getCurrentConfig } from "@/config/environment";
import { conversationMemory } from "@/utils/ConversationMemory";
import { formMemory } from "@/utils/FormMemory";
import { clearPreviewStorage } from "@/utils/previewStorageManager";
import { trackLinkClick } from "@/utils/linkClickTracker";

import KnowledgeBasePreview from "@/components/KnowledgeBasePreview";
import { Send, Bot, User, Globe, Volume2, Mic, MicOff, ChevronDown, ChevronUp, Minus, RotateCcw, ExternalLink } from "lucide-react";
import { BrandedMicIcon } from "@/components/ui/branded-mic-icon";
import { openReviewPrompt } from "@/utils/reviewPrompt";
import { VoiceAcknowledgmentManager } from "@/utils/voiceAcknowledgments";
import { BookingModal } from "@/components/BookingModal";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModal";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import VoiceChatInterface from "@/components/VoiceChatInterface";
import EmbeddedChatInterface from "@/components/EmbeddedChatInterface";
import { SimplifiedVoiceInterface } from "@/components/SimplifiedVoiceInterface";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ProductionDebugTrigger } from "@/components/ProductionDebugPanel";
import { VoiceButtonWithConsent } from "@/components/VoiceButtonWithConsent";
import { MessageBubble } from "@/components/ui/message-bubble";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { SimplifiedFooter } from "@/components/SimplifiedFooter";
import { AssistantTrialExpiredOverlay } from "@/components/AssistantTrialExpiredOverlay";
import { AssistantTrialTimer } from "@/components/AssistantTrialTimer";


interface Assistant {
  id: string;
  business_name: string;
  system_prompt?: string;
  voice_type: string;
  tone: string;
  scraped_content?: any;
  website_url?: string;
  logo_url?: string | null;
  language?: string;
  description?: string;
  is_trial?: boolean;
  trial_expires_at?: string;
  created_at?: string;
  widget_primary_color?: string | null;
  widget_accent_color?: string | null;
  widget_text_color?: string | null;
  widget_background_color?: string | null;
  widget_border_color?: string | null;
  widget_user_bubble_color?: string | null;
  widget_ai_bubble_color?: string | null;
  widget_gradient_enabled?: boolean | null;
  widget_button_gradient_enabled?: boolean | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoiceTranscript?: boolean;
  responseId?: number;
}

interface VoiceMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: string;
  responseId?: string;
}

interface VoiceFormProgressState {
  collectedFields: Record<string, string>;
  nextField: string | null;
  isComplete: boolean;
  lastUpdatedField: string | null;
}

type BookingInfoShape = {
  userName: string;
  userEmail: string;
  userPhone: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
};

type BookingInfoUpdate = Partial<BookingInfoShape>;

type BookingFieldInternal = keyof BookingInfoUpdate;

const INITIAL_VOICE_FORM_PROGRESS: VoiceFormProgressState = {
  collectedFields: {},
  nextField: null,
  isComplete: false,
  lastUpdatedField: null
};

const isLikelyPlaceholderValue = (fieldKey: string, value: string) => {
  const lower = value.toLowerCase();

  if (!lower) return true;

  const genericTokens = [
    'placeholder',
    'sample',
    'mock',
    'lorem',
    'ipsum',
    'autofill',
    'auto fill',
    'autopilot',
    'auto-pilot',
    'fake',
    'unknown',
    'not sure',
    'not provided',
    'tbd',
    'n/a',
    'na'
  ];

  if (genericTokens.some(token => lower.includes(token))) {
    return true;
  }

  if (fieldKey.includes('email')) {
    if (!value.includes('@')) return true;
    const invalidEmailSubstrings = [
      'example.com',
      'sample.com',
      'mock.com',
      'placeholder.com',
      'fake.com',
      'demo.com',
      'email.com'
    ];
    if (invalidEmailSubstrings.some(sub => lower.includes(sub))) {
      return true;
    }
  }

  if (fieldKey.includes('phone') || fieldKey.includes('number')) {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 7) return true;
    const invalidPhonePatterns = [
      '0000000',
      '1111111',
      '2222222',
      '3333333',
      '4444444',
      '5555555',
      '6666666',
      '7777777',
      '8888888',
      '9999999',
      '1234567',
      '1234567890',
      '9999999999',
      '5555555555'
    ];
    if (invalidPhonePatterns.some(pattern => digits === pattern || digits.endsWith(pattern))) {
      return true;
    }
  }

  if (fieldKey.includes('name')) {
    const invalidNames = [
      'john doe',
      'jane doe',
      'sample name',
      'test name',
      'full name',
      'name here',
      'your name'
    ];
    if (invalidNames.includes(lower)) {
      return true;
    }
  }

  if (fieldKey.includes('date')) {
    if (lower.includes('any date') || lower.includes('anytime') || lower.includes('sometime')) {
      return true;
    }
  }

  if (fieldKey.includes('time')) {
    if (lower.includes('any time') || lower.includes('whenever') || lower.includes('anytime')) {
      return true;
    }
  }

  return false;
};

const BOOKING_FIELD_MAP: Record<string, BookingFieldInternal> = {
  name: 'userName',
  user_name: 'userName',
  email: 'userEmail',
  user_email: 'userEmail',
  phone: 'userPhone',
  user_phone: 'userPhone',
  number: 'userPhone',
  contact_number: 'userPhone',
  service: 'service',
  service_type: 'service',
  purpose: 'service',
  message: 'message',
  date: 'preferredDate',
  appointment_date: 'preferredDate',
  preferred_date: 'preferredDate',
  time: 'preferredTime',
  appointment_time: 'preferredTime',
  preferred_time: 'preferredTime'
};

export const Preview = () => {
  const { assistantId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Enhanced debug logging
  console.log('🚀 PREVIEW COMPONENT RENDER START');
  console.log('Preview component rendered with assistantId:', assistantId);
  console.log('Current URL:', window.location.href);
  console.log('URL params from useParams:', { assistantId });
  console.log('Environment config:', getCurrentConfig());
  console.log('Window location object:', {
    href: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
  });

  // Check URL parameters for voice mode and embedded mode
  const urlParams = new URLSearchParams(window.location.search);
  const isVoiceMode = urlParams.get('voice') === 'true';
  const isEmbedded = urlParams.get('embedded') === 'true';
  const isChatMode = urlParams.get('chat') === 'true';
  const isWidgetOnlyMode = urlParams.get('mode') === 'widget-only';
  const isPreviewMode = urlParams.get('preview') === 'true';
  const isDashboardPreview = urlParams.get('dashboardPreview') === 'true';
  const isDraftMode = urlParams.get('draft') === '1' || urlParams.get('draft') === 'true';
  
  console.log('Voice mode detected:', isVoiceMode);
  console.log('Embedded mode detected:', isEmbedded);
  console.log('Chat mode detected:', isChatMode);
  console.log('Widget-only mode detected:', isWidgetOnlyMode);
  console.log('Preview mode detected:', isPreviewMode);
  
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [currentKBPage, setCurrentKBPage] = useState<any>(null);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [realtimeChat, setRealtimeChat] = useState<any>(null);
  const [speechDetected, setSpeechDetected] = useState(false);
  const [idleTimeout, setIdleTimeout] = useState<NodeJS.Timeout | null>(null);
  const [voiceAcknowledger, setVoiceAcknowledger] = useState<VoiceAcknowledgmentManager | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppUrl, setWhatsAppUrl] = useState('');
  const [currentBookingDetails, setCurrentBookingDetails] = useState<any>(null);
  const [voiceFormProgress, setVoiceFormProgress] = useState<VoiceFormProgressState>(INITIAL_VOICE_FORM_PROGRESS);
  const [conversationStartTime, setConversationStartTime] = useState<Date | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);
  
  useEffect(() => {
    if (!voiceFormProgress.lastUpdatedField) {
      return;
    }

    const lastUpdatedValue = voiceFormProgress.lastUpdatedField
      ? voiceFormProgress.collectedFields[voiceFormProgress.lastUpdatedField] ?? null
      : null;

    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(
          {
            type: 'voice_form_progress',
            payload: {
              collectedFields: { ...voiceFormProgress.collectedFields },
              nextField: voiceFormProgress.nextField,
              isComplete: voiceFormProgress.isComplete,
              lastUpdatedField: voiceFormProgress.lastUpdatedField,
              lastUpdatedValue,
              totalCollected: Object.keys(voiceFormProgress.collectedFields).length,
              timestamp: Date.now()
            }
          },
          '*'
        );

        if (voiceFormProgress.lastUpdatedField && lastUpdatedValue !== null) {
          window.parent.postMessage(
            {
              type: 'voice_form_field_captured',
              payload: {
                field: voiceFormProgress.lastUpdatedField,
                value: lastUpdatedValue,
                timestamp: Date.now()
              }
            },
            '*'
          );
        }
      } catch (postMessageError) {
        console.warn('Failed to post voice form progress to parent window:', postMessageError);
      }
    }
  }, [voiceFormProgress]);

  const processCollectedBookingFields = useCallback(
    ({
      primaryField,
      primaryValue,
      collectedFields,
      isComplete,
      nextField
    }: {
      primaryField?: string | null;
      primaryValue?: unknown;
      collectedFields?: Record<string, unknown>;
      isComplete?: boolean;
      nextField?: string | null;
    }) => {
      const bookingUpdates: BookingInfoUpdate = {};
      const entriesToPersist: Array<{ field: string; value: string }> = [];

      const registerField = (fieldKey: string, value: unknown) => {
        if (!fieldKey) return;
        const normalizedKey = fieldKey.toLowerCase();
        const mappedKey = BOOKING_FIELD_MAP[normalizedKey];
        if (!mappedKey) return;
        if (value === null || value === undefined) return;
        const stringValue = typeof value === 'string' ? value : String(value);
        const trimmed = stringValue.trim();
        if (!trimmed) return;

        if (isLikelyPlaceholderValue(normalizedKey, trimmed)) {
          console.warn('[Voice Form] Skipping placeholder booking value', {
            field: normalizedKey,
            value: trimmed
          });
          return;
        }

        bookingUpdates[mappedKey] = trimmed;
        entriesToPersist.push({ field: normalizedKey, value: trimmed });
      };

      if (primaryField) {
        registerField(primaryField, primaryValue);
      }

      if (collectedFields && typeof collectedFields === 'object') {
        Object.entries(collectedFields).forEach(([key, value]) => {
          registerField(key, value);
        });
      }

      if (Object.keys(bookingUpdates).length > 0) {
        console.log('🗂️ Updating conversation memory with booking fields:', bookingUpdates);
        conversationMemory.updateBookingInfo(bookingUpdates as BookingInfoShape, 'voice');
        setCurrentBookingDetails((prev: any) => ({
          ...(prev || {}),
          ...bookingUpdates
        }));
      }

      if (entriesToPersist.length === 0 && typeof isComplete !== 'boolean' && typeof nextField !== 'string') {
        return;
      }

      setVoiceFormProgress(prev => {
        const updated: VoiceFormProgressState = {
          collectedFields: { ...prev.collectedFields },
          nextField: typeof nextField === 'string' ? nextField : prev.nextField,
          isComplete: typeof isComplete === 'boolean' ? isComplete : prev.isComplete,
          lastUpdatedField:
            entriesToPersist.length > 0
              ? entriesToPersist[entriesToPersist.length - 1].field
              : prev.lastUpdatedField
        };

        entriesToPersist.forEach(({ field, value }) => {
          updated.collectedFields[field] = value;
        });

        return updated;
      });
    },
    [setCurrentBookingDetails, setVoiceFormProgress]
  );

  // Booking confirmation modal state for voice interactions
  const [bookingConfirmationModal, setBookingConfirmationModal] = useState<{
    isOpen: boolean;
    details: any;
    source?: string;
  } | null>(null);
  const pendingUserMessageIndexRef = useRef<number | null>(null);
  const pendingAssistantMessageIndexRef = useRef<number | null>(null);
  
  // Text-to-Speech refs and state
  const assistantResponseCounterRef = useRef(0);
  const activeAssistantResponseIdRef = useRef<number | null>(null);
  const assistantTranscriptBufferRef = useRef<string>('');
  const assistantResponseFinalizedRef = useRef(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSpeechSynthesisAvailable, setIsSpeechSynthesisAvailable] = useState(false);
  
  // Response lifecycle tracking
  const [currentResponseId, setCurrentResponseId] = useState<number | null>(null);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isUserTranscribing, setIsUserTranscribing] = useState(false);
  const [conversationState, setConversationState] = useState<'idle' | 'user_speaking' | 'user_transcribing' | 'ai_responding' | 'ai_complete'>('idle');
  const [messageQueue, setMessageQueue] = useState<Array<{id: string, type: 'user' | 'assistant', content: string, responseId?: string}>>([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  
  // Message ordering queue system for voice conversations
  const [queuedAIResponses, setQueuedAIResponses] = useState<any[]>([]);
  const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserTranscribingRef = useRef<boolean>(false); // Ref for immediate access
  
  // Mute state tracking refs
  const wasListeningBeforeMuteRef = useRef(false);
  const isExternallyMutedRef = useRef(false);
  const isListeningRef = useRef(isListening);
  const isConnectedRef = useRef(isConnected);
  const cancelAssistantSpeechRef = useRef<() => void>(() => {});

  // Transform messages for MessageBubble component
  const transformMessage = (message: Message, index: number) => ({
    id: `msg-${index}`,
    text: message.content,
    sender: message.role as 'user' | 'assistant' | 'system',
    timestamp: message.timestamp,
    source: message.isVoiceTranscript ? 'voice' as const : 'text' as const,
    // Enhanced transcribing state for AI streaming transcripts
    isTranscribing: message.role === 'assistant' && 
                   message.isVoiceTranscript && 
                   isAiResponding && 
                   message.responseId === currentResponseId,
    error: false,
    isEmpty: false
  });

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
      setIsSpeechSynthesisAvailable(true);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    // Clear preview cache on assistant change or page load for fresh session
    console.log('🔄 Preview: Clearing preview cache for fresh session');
    clearPreviewStorage();
    
    // Clear all form memory to prevent mock data from bleeding into new sessions
    console.log('🧹 Preview: Clearing all form memory');
    formMemory.clearAllForms();
    
    // Reset voice session if active
    if (realtimeChat) {
      console.log('🔌 Disconnecting existing voice session for fresh preview');
      realtimeChat.disconnect();
      setRealtimeChat(null);
      setIsConnected(false);
      setIsListening(false);
      setVoiceStarted(false);
    }
    
    loadAssistant();
    
    // Run production diagnostics on load
    if (assistantId) {
      runProductionDiagnostics(assistantId).then(diagnostics => {
        logDiagnostics(diagnostics);
        
        // If there are critical issues, show them to the user
        const criticalIssues = diagnostics.issues.filter(issue => issue.severity === 'error');
        if (criticalIssues.length > 0) {
          console.error('Critical production issues detected:', criticalIssues);
        }
      }).catch(error => {
        console.error('Failed to run production diagnostics:', error);
      });
    }
  }, [assistantId]);
  
  // Sync refs with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Stable session id for the lifetime of this preview tab — used to correlate
  // outbound link clicks (WhatsApp / phone) with the conversation/lead.
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__previewSessionId) {
      (window as any).__previewSessionId = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }, []);

  // Separate useEffect for message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📥 Message received:', event.data?.type);
      
      if (event.data?.type === 'close_widget') {
        console.log('Received close_widget message - ending voice session immediately');
        
        // End voice session if active
        if (realtimeChat) {
          console.log('Disconnecting realtime chat session');
          realtimeChat.disconnect();
          setRealtimeChat(null);
        }
        
        // Reset voice states
        cancelAssistantSpeechRef.current();
        setIsConnected(false);
        setIsListening(false);
        setVoiceStarted(false);
        setIsAISpeaking(false);
        setIsAiResponding(false);
        setSpeechDetected(false);
        setIsUserTranscribing(false);
        isUserTranscribingRef.current = false;
        wasListeningBeforeMuteRef.current = false;
        isExternallyMutedRef.current = false;
      } else if (event.data?.type === 'talkweb_mute_state') {
        const muted = Boolean(event.data.muted);
        console.log('🎛️ ========== STEP 6: MUTE STATE RECEIVED ==========');
        console.log('🎛️ Received talkweb_mute_state message:', muted);
        console.log('🎛️ Current states - listening:', isListeningRef.current, 'speaking:', isAISpeaking);
        
        isExternallyMutedRef.current = muted;
        
        if (muted) {
          console.log('🔇 STEP 6: MUTING - Applying all safety guards');
          
          // Save current listening state before muting
          wasListeningBeforeMuteRef.current = isListeningRef.current;
          
          // STEP 6: Cancel any ongoing AI speech with safety guard
          try {
            cancelAssistantSpeechRef.current();
            console.log('✅ AI speech cancelled');
          } catch (error) {
            console.error('⚠️ Failed to cancel speech:', error);
          }
          
          // Reset speech-related states
          setIsAISpeaking(false);
          setIsAiResponding(false);
          setSpeechDetected(false);
          setIsUserTranscribing(false);
          isUserTranscribingRef.current = false;
          setConversationState('idle');
          
          // STEP 6: Pause listening with error handling
          if (realtimeChat && typeof realtimeChat.pauseListening === 'function') {
            try {
              realtimeChat.pauseListening();
              console.log('🔇 Paused realtime chat listening due to mute');
            } catch (error) {
              console.error('⚠️ Failed to pause realtime chat during mute:', error);
            }
          }
          
          setIsListening(false);
          console.log('🔇 ========== STEP 6: MUTE COMPLETE ==========');
        } else {
          console.log('🎤 STEP 6: UNMUTING - Restoring audio functionality');
          
          // Unmute: resume if we were listening before mute
          const shouldResume = wasListeningBeforeMuteRef.current;
          wasListeningBeforeMuteRef.current = false;
          
          console.log('🎤 Should resume:', shouldResume);
          console.log('🎤 RealtimeChat exists:', !!realtimeChat);
          console.log('🎤 Is connected:', isConnectedRef.current);
          
          if (
            shouldResume &&
            realtimeChat &&
            typeof realtimeChat.resumeListening === 'function' &&
            isConnectedRef.current
          ) {
            try {
              realtimeChat.resumeListening();
              setIsListening(true);
              console.log('✅ Resumed realtime chat listening after unmute');
            } catch (error) {
              console.error('⚠️ Failed to resume realtime chat after unmute:', error);
            }
          } else {
            console.log('ℹ️ Not resuming - conditions not met');
          }
          
          console.log('🎤 ========== STEP 6: UNMUTE COMPLETE ==========');
        }
      } else if (event.data?.type === 'call_business') {
        console.log('📞 Received call_business message from embedded chat:', event.data);
        // Handle the call_business function call
        if (event.data.data) {
          console.log('📞 Processing call_business with data:', event.data.data);
          // Call handleFunctionCall which is defined later in the component
          setTimeout(() => {
            handleFunctionCall(event.data.data).catch((err: any) => {
              console.error('📞 Error in handleFunctionCall:', err);
            });
          }, 0);
        }
      }
    };
    
    console.log('📡 Setting up message listener');
    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log('📡 Removing message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [realtimeChat]);

  // Cleanup queue timeout on unmount
  useEffect(() => {
    return () => {
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
    };
  }, []);

  // Subscribe to booking events from conversation memory
  useEffect(() => {
    console.log('📅 Preview: Setting up booking event subscription');
    
    const unsubscribe = conversationMemory.subscribeToBookingEvents((event) => {
      console.log('📅 Preview: Received booking event:', event);
      
      switch (event.type) {
        case 'show_confirmation':
          console.log('📅 Preview: Showing booking confirmation modal');
          const contextBooking = conversationMemory.getCurrentContext().pendingBooking;
          setBookingConfirmationModal({
            isOpen: true,
            details: {
              ...event.data,
              userEmail: event.data.userEmail || contextBooking?.userEmail || '',
              userPhone: event.data.userPhone || contextBooking?.userPhone || '',
            },
            source: event.source
          });
          break;
          
        case 'hide_confirmation':
          console.log('📅 Preview: Hiding booking confirmation modal');
          setBookingConfirmationModal(null);
          break;
          
        case 'data_updated':
          console.log('📅 Preview: Updating booking data');
          setBookingConfirmationModal(prev => prev ? {
            ...prev,
            details: {
              ...prev.details,
              ...event.data
            }
          } : null);
          break;
      }
    });

    return () => {
      console.log('📅 Preview: Cleaning up booking event subscription');
      unsubscribe();
    };
  }, []);

  const loadAssistant = async () => {
    console.log('=== PREVIEW DEBUG START ===');
    console.log('loadAssistant called with assistantId:', assistantId);
    console.log('useParams output:', { assistantId });
    console.log('Current environment:', window.location.hostname);
    console.log('Current URL:', window.location.href);
    console.log('URL pathname:', window.location.pathname);
    console.log('Expected assistant ID:', 'e7fa0f16-ba8e-4277-bd80-70f0aa25cbad');
    console.log('IDs match:', assistantId === 'e7fa0f16-ba8e-4277-bd80-70f0aa25cbad');
    console.log('=== PREVIEW DEBUG END ===');
    
    if (!assistantId) {
      console.error('No assistantId provided to loadAssistant');
      setError('No assistant ID provided');
      return;
    }

    try {
      setError(null); // Clear any previous errors
      
      console.log('=== DATABASE QUERY START ===');
      console.log('About to query for assistant:', assistantId);
      
      // Direct database query for public access (trial or embed)
      const { data, error: dbError } = await supabase
        .from('assistants')
        .select('id, business_name, website_url, voice_type, tone, language, description, logo_url, is_trial, trial_expires_at, created_at, embed_code, scraped_content, widget_primary_color, widget_accent_color, widget_text_color, widget_background_color, widget_border_color, widget_user_bubble_color, widget_ai_bubble_color, widget_gradient_enabled, widget_button_gradient_enabled')
        .eq('id', assistantId)
        .maybeSingle();

      console.log('=== DATABASE QUERY RESULT ===');
      console.log('Data:', data);
      console.log('Error:', dbError);
      console.log('=== DATABASE QUERY END ===');

      if (dbError) {
        console.error('Preview: Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      if (!data) {
        console.error('=== NO DATA FOUND ===');
        console.error('Preview: No assistant found with ID:', assistantId);
        console.error('Query was for ID:', assistantId, 'Type:', typeof assistantId);
        console.error('=== NO DATA FOUND END ===');
        throw new Error('Assistant not found. Please check the assistant ID and try again.');
      }
      
      // Verify assistant is publicly accessible
      // Admin-activated assistants (is_trial === false) are permanently active and always accessible
      const isAdminActivated = data.is_trial === false;
      const isTrialActive = data.is_trial === true && data.trial_expires_at && new Date(data.trial_expires_at) > new Date();
      const hasEmbedCode = data.embed_code && data.embed_code.trim() !== '';
      
      // For assistants with is_trial = null (default), check 24h from created_at
      const isDefault24hTrial = data.is_trial === null || data.is_trial === undefined;
      let isWithinDefault24h = false;
      if (isDefault24hTrial && data.created_at) {
        const createdDate = new Date(data.created_at);
        isWithinDefault24h = new Date() < new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const accessGranted = isAdminActivated || isTrialActive || hasEmbedCode || isWithinDefault24h;
      
      console.log('Preview: Access check', { 
        isAdminActivated,
        isTrialActive, 
        hasEmbedCode,
        isWithinDefault24h,
        is_trial: data.is_trial,
        trial_expires_at: data.trial_expires_at,
        accessGranted
      });
      
      // Deny access only if none of the conditions are met
      if (!accessGranted) {
        console.error('Preview: Assistant not publicly accessible');
        throw new Error('This assistant is not publicly accessible. It must either be a trial assistant or have an embed code.');
      }
      
      console.log('Assistant loaded successfully:', { 
        id: data.id, 
        business_name: data.business_name,
        is_trial: data.is_trial,
        trial_expires_at: data.trial_expires_at 
      });
      
      setAssistant(data);
      
      // Check if this assistant has knowledge base data
      if (data.scraped_content) {
        try {
          let scrapedData;
          if (typeof data.scraped_content === 'string') {
            scrapedData = JSON.parse(data.scraped_content);
          } else {
            scrapedData = data.scraped_content;
          }
          
          // Check if this is knowledge base format (has allPages)
          if (scrapedData.allPages && scrapedData.allPages.length > 0) {
            setShowKnowledgeBase(true);
          }
        } catch (error) {
          console.error('Error parsing knowledge base data:', error);
        }
      }
      
      // Add welcome message with dynamic greeting
      const greetings = [
        `Hello! I'm the AI assistant for ${data.business_name}. How can I help you today?`,
        `Welcome to ${data.business_name}! I'm here to assist you. What would you like to know?`,
        `Hi there! I'm your ${data.business_name} assistant. How may I help you?`,
        `Greetings! I'm here to help you with ${data.business_name}. What can I do for you?`
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      // Only show preview mode message for trial assistants
      const messages: Message[] = [
        {
          role: 'assistant',
          content: randomGreeting,
          timestamp: new Date()
        }
      ];
      
      setMessages(messages);
    } catch (error) {
      console.error('=== PREVIEW ERROR CAUGHT ===');
      console.error('Error loading assistant:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Assistant ID was:', assistantId);
      console.error('=== PREVIEW ERROR END ===');
      const errorMessage = error instanceof Error ? error.message : 'Failed to load assistant. Please try refreshing the page.';
      setError(errorMessage);
      
      // Add helpful context based on error type
      if (errorMessage.includes('not found')) {
        setError('Assistant not found. The assistant may have been deleted or the link may be invalid.');
      } else if (errorMessage.includes('validation failed')) {
        setError('Assistant configuration error. Please contact support if this issue persists.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Connection error. Please check your internet connection and try again.');
      }
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !assistant || isLoading) return;

    // Cancel any active speech and reset transcript state
    cancelAssistantSpeech();
    resetAssistantTranscriptState();
    pendingAssistantMessageIndexRef.current = null;
    activeAssistantResponseIdRef.current = null;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    
    // Track conversation engagement
    if (!conversationStartTime) {
      setConversationStartTime(new Date());
    }
    setMessageCount(prev => prev + 1);

    try {
      console.log('=== AI CHAT REQUEST ===');
      console.log('Sending message:', inputMessage);
      console.log('Assistant ID:', assistant.id);
      
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: inputMessage,
          assistantId: assistant.id,
          sessionId: `preview-${Date.now()}`,
          useDraft: isDraftMode,
        }
      });

      console.log('=== AI CHAT RESPONSE ===');
      console.log('Full response data:', data);
      console.log('Response error:', error);
      console.log('Function call in response:', data?.functionCall);

      if (error) {
        console.error('AI Chat error:', error);
        throw error;
      }

      // Check for specific error messages in data (expired/deleted assistants)
      if (data?.error) {
        console.error('AI Chat data error:', data.error);
        throw new Error(data.error);
      }

      // Handle function/tool results
      if (data.functionCall) {
        const fc = data.functionCall;
        console.log('=== FUNCTION CALL DETECTED ===');
        console.log('Function call object:', fc);
        console.log('Function call name:', fc.name);
        console.log('Function call structure:', Object.keys(fc));
        
        // Handle WhatsApp redirect from text input
        if (fc.name === 'whatsapp_redirect') {
          console.log('WhatsApp redirect function call from text input detected');
          await handleFunctionCall(fc);
        } else if (fc.whatsapp_url) {
          console.log('WhatsApp URL directly in function call:', fc.whatsapp_url);
          try {
            window.open(fc.whatsapp_url, '_blank');
          } catch {}
        } else if (fc.calendlyUrl || fc.bookingId) {
          toast({ title: 'Booking', description: fc.message || 'Your appointment has been scheduled.' });
          if (fc.calendlyUrl) {
            try { window.open(fc.calendlyUrl, '_blank'); } catch {}
          }
        } else if (fc.name && fc.arguments) {
          console.log('Generic function call handler:', fc.name);
          // Legacy: pass through to handler when AI returned raw tool call
          await handleFunctionCall(fc);
        }
      } else {
        console.log('No function call detected in response');
      }

      // Handle navigation result (new shape)
      if (data.navigation?.url) {
        const navUrl = data.navigation.url;
        const navWindow = window.open(navUrl, '_blank', 'noopener,noreferrer');
        
        if (!navWindow) {
          // Popup was blocked — show toast with clickable link
          toast({
            title: "🔗 Link ready",
            description: `Tap to open: ${navUrl}`,
            duration: 8000,
          });
        }
        
        // Override error-looking response text with a positive navigation message
        const currentResponse = data.response || '';
        const isGenericError = currentResponse.includes('I apologize') || currentResponse.includes('encountered an issue') || !currentResponse.trim();
        if (isGenericError) {
          data.response = `Opening [${navUrl}](${navUrl}) in a new tab for you.`;
        }
      }

      // Handle legacy navigation format if present
      if (data.navigation && typeof data.navigation === 'string') {
        console.log('Legacy navigation detected:', data.navigation);
        await handleFunctionCall({ name: 'navigate_to_page', arguments: JSON.stringify({ page: data.navigation }) });
      }

      // Enhanced fallback: Parse AI response for navigation mentions when no function call was made
      if (!data.functionCall && !data.navigation) {
        const responseText = data.response || '';
        
        // Look for mentions of navigation with specific patterns
        const navPatterns = [
          /(?:taking you to|navigating to|opening|visit|going to)\s+(?:the\s+)?contact(?:\s+page|\s+us)?/i,
          /(?:taking you to|navigating to|opening|visit|going to)\s+(?:the\s+)?about(?:\s+page)?/i,
          /(?:taking you to|navigating to|opening|visit|going to)\s+(?:the\s+)?companies(?:\s+page)?/i,
          /(?:taking you to|navigating to|opening|visit|going to)\s+(?:the\s+)?blog(?:\s+page)?/i,
          /(?:taking you to|navigating to|opening|visit|going to)\s+(?:the\s+)?home(?:\s+page)?/i,
          /contact(?:\s+page|\s+us)?\s+(?:is|at)\s+(https?:\/\/[^\s]+)/i,
          /visit\s+(https?:\/\/[^\s]+)/i
        ];
        
        let extractedUrl = null;
        
        for (const pattern of navPatterns) {
          const match = responseText.match(pattern);
          if (match) {
            if (match[1] && match[1].startsWith('http')) {
              // Direct URL found
              extractedUrl = match[1];
            } else {
              // Map keywords to URLs
              const text = match[0].toLowerCase();
              if (text.includes('contact')) {
                extractedUrl = 'https://www.wemakechange.org/contact-us';
              } else if (text.includes('about')) {
                extractedUrl = 'https://www.wemakechange.org/about';
              } else if (text.includes('companies')) {
                extractedUrl = 'https://www.wemakechange.org/companies';
              } else if (text.includes('blog')) {
                extractedUrl = 'https://www.wemakechange.org/blog';
              } else if (text.includes('home')) {
                extractedUrl = 'https://www.wemakechange.org';
              }
            }
            break;
          }
        }
        
        if (extractedUrl) {
          console.log('Navigation extracted from AI response:', extractedUrl);
          await handleFunctionCall({
            name: 'navigate_to_page',
            arguments: JSON.stringify({ page: extractedUrl })
          });
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.functionCall?.message || 'I can help you with navigation and booking.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Always show a friendly assistant bubble — never a raw technical error
      const errorText = "I'm having a small issue on my side right now. Could you try that again in a moment? If it keeps happening, I can take your details so the team can reach out.";
      
      const errorMessage: Message = {
        role: 'assistant',
        content: errorText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Message queue processing function
  const processMessageQueue = async () => {
    if (processingQueue || messageQueue.length === 0) {
      return;
    }
    
    setProcessingQueue(true);
    
    try {
      const nextMessage = messageQueue[0];
      setMessageQueue(prev => prev.slice(1));
      
      if (nextMessage.type === 'user') {
        // Add user message to UI - convert VoiceMessage to Message format
        const userMessage: Message = {
          role: 'user',
          content: nextMessage.content,
          timestamp: new Date(),
          isVoiceTranscript: true
        };
        
        setMessages(prev => [...prev, userMessage]);
        conversationMemory.addMessage('user', nextMessage.content, 'voice');
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      setProcessingQueue(false);
      
      // Process next message if available
      if (messageQueue.length > 0) {
        setTimeout(() => processMessageQueue(), 100);
      }
    }
  };

  // Helper function to handle voice transcriptions
  const handleVoiceTranscription = async (transcriptText: string) => {
    if (!assistant) return;
    
    console.log('🤖 Processing voice transcription:', transcriptText);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: transcriptText,
          assistantId: assistant.id,
          sessionId: `voice-${Date.now()}`,
          useDraft: isDraftMode,
        }
      });

      if (error) {
        console.error('Voice AI Chat error:', error);
        throw error;
      }

      // Handle function calls from voice input
      if (data?.functionCall) {
        await handleFunctionCall(data.functionCall);
      }

      // Handle regular AI response (will be handled by voice stream)
      if (data?.response && !data?.functionCall) {
        console.log('AI response from voice input:', data.response);
      }

    } catch (error) {
      console.error('Error processing voice transcription:', error);
      toast({
        title: "Voice Processing Error",
        description: "Could not process your voice message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Queue management for proper message ordering
  const flushAIResponseQueue = useCallback(() => {
    if (queuedAIResponses.length === 0) return;
    
    console.log('🔄 Flushing AI response queue, count:', queuedAIResponses.length);
    
    // Process all queued AI responses in order
    queuedAIResponses.forEach(queuedMessage => {
      console.log('📝 Processing queued AI message:', queuedMessage.type);
      
      if (queuedMessage.type === 'response.audio_transcript.delta' && queuedMessage.delta) {
        // Process AI transcript deltas
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          
          const shouldContinueMessage = lastMessage && 
            lastMessage.role === 'assistant' && 
            lastMessage.isVoiceTranscript;
          
          if (shouldContinueMessage) {
            return prev.map((msg, index) => 
              index === prev.length - 1 
                ? { ...msg, content: msg.content + queuedMessage.delta }
                : msg
            );
          } else {
            const assistantMessage: Message = {
              role: 'assistant',
              content: queuedMessage.delta,
              timestamp: new Date(),
              isVoiceTranscript: true
            };
            return [...prev, assistantMessage];
          }
        });
      } else if (queuedMessage.type === 'response.created') {
        setIsAiResponding(true);
        setConversationState('ai_responding');
      }
    });
    
    // Clear the queue and timeout
    setQueuedAIResponses([]);
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
  }, [queuedAIResponses]);

  const startQueueTimeout = useCallback(() => {
    // Clear any existing timeout
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
    }
    
    // Set timeout to flush queue after 8 seconds if transcription gets stuck
    queueTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Queue timeout reached, force flushing AI responses');
      setIsUserTranscribing(false);
      flushAIResponseQueue();
    }, 8000);
  }, [flushAIResponseQueue]);

  // Text-to-Speech helper functions
  const cancelAssistantSpeech = useCallback(() => {
    console.log('🔇 ========== STEP 6: CANCEL ASSISTANT SPEECH ==========');
    
    // STEP 6: Check external mute state
    if (isExternallyMutedRef.current) {
      console.log('🔇 STEP 6: Already muted - ensuring no audio plays');
    }
    
    if (speechSynthesisRef.current) {
      try {
        speechSynthesisRef.current.cancel();
        console.log('✅ Speech synthesis cancelled');
      } catch (error) {
        console.error('⚠️ Failed to cancel speech synthesis:', error);
      }
    }
    
    // STEP 6: Clear utterance reference
    if (speechUtteranceRef.current) {
      speechUtteranceRef.current = null;
      console.log('✅ Speech utterance reference cleared');
    }
    
    console.log('🔇 ========== STEP 6: CANCEL COMPLETE ==========');
  }, []);
  
  useEffect(() => {
    cancelAssistantSpeechRef.current = cancelAssistantSpeech;
  }, [cancelAssistantSpeech]);

  const speakAssistantText = (text: string) => {
    console.log('🔊 ========== STEP 6: SPEAK ASSISTANT TEXT ==========');
    console.log('🔊 Text to speak:', text?.substring(0, 50));
    console.log('🔊 Speech synthesis available:', isSpeechSynthesisAvailable);
    console.log('🔊 Externally muted:', isExternallyMutedRef.current);
    
    // STEP 6: Safety guard - don't speak if externally muted
    if (isExternallyMutedRef.current) {
      console.log('🔇 STEP 6: BLOCKED - Externally muted, not speaking');
      return;
    }
    
    if (!isSpeechSynthesisAvailable || !text || text.trim().length === 0) {
      console.log('⚠️ Cannot speak - invalid conditions');
      return;
    }

    // STEP 6: Cancel any existing speech before starting new one
    cancelAssistantSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    if (assistant?.language) {
      utterance.lang = assistant.language;
    }
    utterance.onend = () => {
      console.log('✅ Speech ended');
      speechUtteranceRef.current = null;
    };
    utterance.onerror = (error) => {
      console.error('⚠️ Speech error:', error);
      speechUtteranceRef.current = null;
    };

    // STEP 6: Double-check mute state before actually speaking
    if (isExternallyMutedRef.current) {
      console.log('🔇 STEP 6: BLOCKED at last moment - muted before speaking');
      return;
    }

    speechUtteranceRef.current = utterance;
    speechSynthesisRef.current?.speak(utterance);
    console.log('🔊 ========== STEP 6: SPEECH STARTED ==========');
  };

  const clearAssistantTranscriptBuffer = () => {
    assistantTranscriptBufferRef.current = '';
  };

  const resetAssistantTranscriptState = () => {
    clearAssistantTranscriptBuffer();
    assistantResponseFinalizedRef.current = false;
  };

  const ensureAssistantPlaceholder = (contentOverride?: string) => {
    const currentResponseId = activeAssistantResponseIdRef.current;
    if (currentResponseId === null) {
      return;
    }

    setMessages(prev => {
      let index = pendingAssistantMessageIndexRef.current;

      const indexIsCurrentResponse =
        index !== null &&
        index >= 0 &&
        index < prev.length &&
        prev[index]?.role === 'assistant' &&
        prev[index]?.responseId === currentResponseId;

      if (!indexIsCurrentResponse) {
        index = prev.findIndex(
          msg =>
            msg.role === 'assistant' &&
            msg.isVoiceTranscript &&
            msg.responseId === currentResponseId
        );
      }

      const bufferText = assistantTranscriptBufferRef.current;
      const trimmedBuffer = bufferText.trim();
      const overrideHasContent = typeof contentOverride === 'string' && contentOverride.trim().length > 0;
      const hasDisplayContent = overrideHasContent || trimmedBuffer.length > 0;

      if (!hasDisplayContent) {
        pendingAssistantMessageIndexRef.current = null;

        if (index !== null && index >= 0) {
          return prev.filter((_, idx) => idx !== index);
        }

        return prev;
      }

      const displayContent =
        overrideHasContent
          ? contentOverride.trim()
          : trimmedBuffer;

      if (index !== null && index >= 0) {
        pendingAssistantMessageIndexRef.current = index;

        const existingMessage = prev[index];
        if (existingMessage && existingMessage.content === displayContent) {
          return prev;
        }

        return prev.map((msg, idx) =>
          idx === index
            ? {
                ...msg,
                content: displayContent,
                isVoiceTranscript: true,
                responseId: currentResponseId
              }
            : msg
        );
      }

      const placeholder: Message = {
        role: 'assistant',
        content: displayContent,
        timestamp: new Date(),
        isVoiceTranscript: true,
        responseId: currentResponseId
      };

      pendingAssistantMessageIndexRef.current = prev.length;
      return [...prev, placeholder];
    });
  };

  const getMicrophoneStartError = (error: unknown) => {
    if (error && typeof error === 'object' && 'name' in error) {
      switch ((error as DOMException).name) {
        case 'NotAllowedError':
          return 'Microphone permission was denied. Allow microphone access in your browser settings and try again.';
        case 'NotFoundError':
          return 'No microphone was found on this device.';
        case 'NotReadableError':
          return 'Your microphone is busy in another app or browser tab.';
        case 'SecurityError':
          return 'Microphone access is blocked in this browsing context.';
        default:
          break;
      }
    }

    return error instanceof Error ? error.message : 'Unable to start the microphone.';
  };

  const requestMicrophoneFromGesture = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support microphone access.');
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      throw new Error(getMicrophoneStartError(error));
    }
  };

  const initializeRealtimeChat = async () => {
    if (!assistant?.id || realtimeChat) {
      console.log('RealtimeChat: Skipping initialization - assistant ID:', assistant?.id, 'existing chat:', !!realtimeChat);
      return;
    }
    
    let preparedMicStream: MediaStream | null = null;

    try {
      console.log('=== PREVIEW VOICE INIT STARTED ===');
      console.log('RealtimeChat: Starting initialization for assistant:', assistant.id);
      setIsLoading(true);
      conversationMemory.clear();
      setVoiceFormProgress(INITIAL_VOICE_FORM_PROGRESS);
      setCurrentBookingDetails(null);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'voice_form_reset',
            payload: {
              timestamp: Date.now()
            }
          },
          '*'
        );
      }

      // PERF: Kick off the realtime module import in parallel with the mic
      // permission prompt so the JS chunk is ready by the time we need it.
      const importT0 = performance.now();
      const realtimeModulePromise = import('@/utils/RealtimeAudio').then((mod) => {
        console.log('[VoiceTiming] 📦 RealtimeAudio module loaded in', (performance.now() - importT0).toFixed(1), 'ms');
        return mod;
      });

      preparedMicStream = await requestMicrophoneFromGesture();

      const { RealtimeChat } = await realtimeModulePromise;
      console.log('RealtimeChat: Class imported successfully');
      console.log('🌐 STEP 1: Passing website URL to RealtimeChat:', assistant.website_url);
      
      const chat = new RealtimeChat((message: any) => {
        console.log('🎯 RealtimeChat: Received realtime message:', {
          type: message.type,
          hasContent: !!(message.content || message.text || message.transcript),
          confidence: message.confidence,
          fullMessageKeys: Object.keys(message),
          timestamp: new Date().toISOString()
        });
        
        // Reset idle timeout on any activity
        resetIdleTimeout();

        // Helper function to read assistant delta from various event formats
        const readAssistantDelta = (event: any): string => {
          if (!event) return '';
          const candidates = [event.delta, event.transcript, event.text];
          for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.length > 0) {
              return candidate;
            }
          }
          return '';
        };


        // Helper function to update assistant transcript
        const updateAssistantTranscript = (rawDelta: string) => {
          if (!rawDelta || rawDelta.trim().length === 0) {
            return;
          }

          if (activeAssistantResponseIdRef.current === null) {
            return;
          }

          assistantTranscriptBufferRef.current += rawDelta;
          ensureAssistantPlaceholder();
        };

        // Helper function to extract final text from response events
        const extractFinalAssistantText = (event: any): string | null => {
          const collected: string[] = [];

          const collectStrings = (value: any) => {
            if (!value) {
              return;
            }

            if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed.length > 0) {
                collected.push(trimmed);
              }
              return;
            }

            if (Array.isArray(value)) {
              value.forEach(collectStrings);
              return;
            }

            if (typeof value === 'object') {
              collectStrings(value.text);
              collectStrings(value.value);
              collectStrings(value.content);
              collectStrings(value.delta);
              collectStrings(value.transcript);

              if ('output' in value) {
                collectStrings(value.output);
              }

              if ('output_text' in value) {
                collectStrings(value.output_text);
              }

              if ('response' in value) {
                collectStrings(value.response);
              }
            }
          };

          collectStrings(event);

          if (collected.length === 0) {
            return null;
          }

          const unique = Array.from(new Set(collected));
          unique.sort((a, b) => b.length - a.length);

          return unique[0] || null;
        };

        // Helper function to finalize assistant transcript
        const finalizeAssistantTranscript = (
          options?: { speak?: boolean; releaseResponse?: boolean; finalText?: string }
        ) => {
          if (assistantResponseFinalizedRef.current && !options?.finalText) {
            return;
          }

          const shouldSpeak = options?.speak ?? true;
          const releaseResponse = options?.releaseResponse ?? true;
          const finalCandidate = options?.finalText ?? assistantTranscriptBufferRef.current;
          const finalSpeechText = finalCandidate ? finalCandidate.trim() : '';

          setMessages(prev => {
            const currentResponseId = activeAssistantResponseIdRef.current;
            let index = pendingAssistantMessageIndexRef.current;

            const indexIsCurrentResponse =
              index !== null &&
              index >= 0 &&
              index < prev.length &&
              prev[index]?.role === 'assistant' &&
              (currentResponseId === null || prev[index]?.responseId === currentResponseId);

            if (!indexIsCurrentResponse) {
              if (currentResponseId !== null) {
                index = prev.findIndex(
                  msg =>
                    msg.role === 'assistant' &&
                    msg.isVoiceTranscript &&
                    msg.responseId === currentResponseId
                );
              } else {
                index = null;
              }
            }

            if (index !== null && index >= 0 && index < prev.length && prev[index]?.role === 'assistant') {
              if (!finalSpeechText) {
                return prev.filter((_, idx) => idx !== index);
              }

              return prev.map((msg, idx) =>
                idx === index
                  ? {
                      ...msg,
                      content: finalSpeechText,
                      timestamp: new Date(),
                      isVoiceTranscript: true,
                      responseId: currentResponseId ?? msg.responseId
                    }
                  : msg
              );
            }

            if (!finalSpeechText) {
              return prev;
            }

            const assistantMessage: Message = {
              role: 'assistant',
              content: finalSpeechText,
              timestamp: new Date(),
              isVoiceTranscript: true,
              responseId: currentResponseId ?? undefined
            };

            pendingAssistantMessageIndexRef.current = prev.length;
            return [...prev, assistantMessage];
          });

          if (shouldSpeak && finalSpeechText) {
            speakAssistantText(finalSpeechText);
          }

          pendingAssistantMessageIndexRef.current = null;
          if (releaseResponse) {
            activeAssistantResponseIdRef.current = null;
          }
          assistantResponseFinalizedRef.current = true;
          clearAssistantTranscriptBuffer();
        };
        
        if (message.type === 'input_audio_buffer.speech_started') {
          setSpeechDetected(true);
          setConversationState('user_speaking');
          console.log('🎤 User started speaking');
          
          // Check if user is externally muted and show feedback
          if (isExternallyMutedRef.current) {
            toast({
              title: "Microphone Muted",
              description: "Use the mute toggle in the widget header to unmute before speaking.",
              variant: "destructive"
            });
            return;
          }
          
          // Cancel any active speech when user starts speaking
          cancelAssistantSpeech();
          resetAssistantTranscriptState();
          pendingAssistantMessageIndexRef.current = null;
          activeAssistantResponseIdRef.current = null;
          pendingUserMessageIndexRef.current = null;
        }
        
        if (message.type === 'input_audio_buffer.speech_stopped') {
          setSpeechDetected(false);
          setConversationState('user_transcribing');
          setIsUserTranscribing(true);
          isUserTranscribingRef.current = true;
          startQueueTimeout();
          console.log('🎤 User stopped speaking, transcribing...');
          
          // Status messages removed for better UX
        }
        
        if (message.type === 'response.created') {
          console.log('🤖 AI response started');
          
          // Cancel any active speech and initialize new response
          cancelAssistantSpeech();
          assistantResponseCounterRef.current += 1;
          activeAssistantResponseIdRef.current = assistantResponseCounterRef.current;
          pendingAssistantMessageIndexRef.current = null;
          resetAssistantTranscriptState();
          ensureAssistantPlaceholder();
          
          if (isUserTranscribingRef.current) {
            console.log('⏳ Queuing AI response.created - user still transcribing');
            setQueuedAIResponses(prev => [...prev, message]);
            return;
          }
          
          setIsAiResponding(true);
          setConversationState('ai_responding');
        }
        
        if (message.type === 'response.audio_transcript.delta') {
          const delta = readAssistantDelta(message);
          console.log('📝 AI audio transcript delta:', delta);
          
          if (isUserTranscribingRef.current) {
            console.log('⏳ Queuing AI transcript delta - user transcription in progress');
            setQueuedAIResponses(prev => [...prev, message]);
            return;
          }
          
          updateAssistantTranscript(delta);
        }
        
        if (message.type === 'response.audio_transcript.done') {
          console.log('✅ AI audio transcript complete');
          finalizeAssistantTranscript();
        }
        
        if (message.type === 'response.output_text.delta') {
          const delta = readAssistantDelta(message);
          console.log('📝 AI text output delta:', delta);
          
          if (isUserTranscribingRef.current) {
            console.log('⏳ Queuing AI text delta - user transcription in progress');
            setQueuedAIResponses(prev => [...prev, message]);
            return;
          }
          
          updateAssistantTranscript(delta);
        }
        
        if (message.type === 'response.output_text.done') {
          console.log('✅ AI text output complete');
          const finalText = extractFinalAssistantText(message);
          const finalCandidate = finalText && finalText.trim().length > 0 ? finalText.trim() : undefined;
          if (finalCandidate) {
            assistantTranscriptBufferRef.current = finalCandidate;
          }
          finalizeAssistantTranscript({ finalText: finalCandidate });
        }
        
        if (message.type === 'response.done') {
          console.log('🏁 AI response done');
          const finalText = extractFinalAssistantText(message);
          const finalCandidate = finalText && finalText.trim().length > 0 ? finalText.trim() : undefined;
          finalizeAssistantTranscript({ finalText: finalCandidate, speak: false });
          setIsAiResponding(false);
          setConversationState('idle');
        }
        
        if (message.type === 'response.canceled') {
          console.log('⚠️ AI response canceled');
          finalizeAssistantTranscript({ speak: false });
          setIsAiResponding(false);
          setConversationState('idle');
        }
        
        if (message.type === 'response.error') {
          console.error('❌ AI response error:', message.error);
          const errorText =
            (typeof message.error?.message === 'string' && message.error.message.trim().length > 0
              ? message.error.message
              : null) ||
            extractFinalAssistantText(message) ||
            'Sorry, I encountered an issue and could not finish that response.';
          finalizeAssistantTranscript({ speak: false, finalText: errorText });
          setIsAiResponding(false);
          setConversationState('idle');
        }
        
        if (message.type === 'conversation.item.input_audio_transcription.delta' && message.delta) {
          console.log('📝 User transcript delta:', message.delta);
          
          setMessages(prev => {
            const deltaText = message.delta;
            if (typeof deltaText !== 'string' || deltaText.length === 0) {
              return prev;
            }

            let pendingIndex = pendingUserMessageIndexRef.current;
            const trimmedDelta = deltaText.trim();

            if (trimmedDelta.length === 0) {
              return prev;
            }

            if (pendingIndex === null) {
              const newMessage: Message = {
                role: 'user',
                content: deltaText,
                timestamp: new Date(),
                isVoiceTranscript: true
              };

              pendingUserMessageIndexRef.current = prev.length;
              return [...prev, newMessage];
            }

            return prev.map((msg, index) =>
              index === pendingIndex
                ? {
                    ...msg,
                    content: msg.content + deltaText,
                    timestamp: new Date()
                  }
                : msg
            );
          });
        }
        
        if (
          (message.type === 'conversation.item.input_audio_transcription.completed' && message.transcript) ||
          (message.type === 'user_transcription' && message.content)
        ) {
          const transcript = message.transcript || message.content;
          console.log('✅ User transcription complete:', transcript);
          
          if (isAISpeaking) {
            console.log('⚠️ Blocking user transcript - AI is speaking audio');
            return;
          }
          
          if (!transcript || transcript.trim().length === 0) {
            console.log('⚠️ Empty transcription content, skipping');
            return;
          }
          
          setIsUserTranscribing(false);
          isUserTranscribingRef.current = false;
          setConversationState('idle');
          
          setMessages(prev => {
            if (pendingUserMessageIndexRef.current === null) {
              const userMessage: Message = {
                role: 'user',
                content: transcript,
                timestamp: new Date(),
                isVoiceTranscript: true
              };
              return [...prev, userMessage];
            }

            return prev.map((msg, index) =>
              index === pendingUserMessageIndexRef.current
                ? {
                    ...msg,
                    content: transcript,
                    timestamp: new Date()
                  }
                : msg
            );
          });

          pendingUserMessageIndexRef.current = null;
          conversationMemory.addMessage('user', transcript, 'voice');
          
          console.log('🔄 Flushing queued AI responses after user transcription');
          flushAIResponseQueue();
          
          if (!conversationStartTime) {
            setConversationStartTime(new Date());
          }
          setMessageCount(prev => prev + 1);
          
          // Note: AI response will come via Realtime API WebSocket events
          console.log('🎯 User message processed, waiting for AI response via Realtime API');
        }
        
        // Handle function calls from voice
        if (message.type === 'response.function_call_arguments.done') {
          console.log('Function call from voice:', message);
          try {
            const functionCall = {
              name: message.name,
              arguments: message.arguments
            };
            handleFunctionCall(functionCall);
          } catch (error) {
            console.error('Error handling voice function call:', error);
          }
        }
        
        if (message.type === 'response.audio.delta') {
          setIsAISpeaking(true);
        }
        
        if (message.type === 'response.audio.done') {
          setIsAISpeaking(false);
          // Move review popup to end of session, not immediately
        }
      });
      
      console.log('RealtimeChat: Instance created, calling init...');
      await chat.init(assistant.id, assistant.language, assistant.website_url, preparedMicStream); // STEP 1: Pass website URL
      preparedMicStream = null;
      console.log('RealtimeChat: Init completed successfully');
      
      setRealtimeChat(chat);
      setIsConnected(true);
      setVoiceStarted(true);
      setIsListening(true);
      resetIdleTimeout();
      
      // Track conversation start
      if (!conversationStartTime) {
        setConversationStartTime(new Date());
      }
      
      // Initialize voice acknowledgment manager
      const acknowledger = new VoiceAcknowledgmentManager(chat, setMessages);
      setVoiceAcknowledger(acknowledger);
      
      console.log('=== PREVIEW VOICE INIT COMPLETED ===');
      
    } catch (error) {
      if (preparedMicStream) {
        preparedMicStream.getTracks().forEach((track) => track.stop());
      }

      console.error('=== PREVIEW VOICE INIT ERROR ===', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Voice Assistant Error",
        description: `Could not initialize voice assistant: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetIdleTimeout = () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
    const timeout = setTimeout(() => {
      // Check for recent messages within the last 2 minutes
      const recentMessages = messages.filter(msg => 
        (Date.now() - msg.timestamp.getTime()) < 120000
      );
      const hasActiveConversation = recentMessages.length > 0;
      
      // Only show session ended if no recent activity, not in modal flows, and voice is actually active
      if (!showBookingModal && !showWhatsAppModal && !hasActiveConversation && isConnected && voiceStarted) {
        disconnectVoice();
        toast({
          title: "Session Ended",
          description: "Voice session ended due to inactivity",
        });
      } else if (isConnected || showBookingModal || showWhatsAppModal) {
        // Reset timeout if still active or in modal flows
        resetIdleTimeout();
      }
    }, 60000); // 60 seconds idle timeout
    setIdleTimeout(timeout);
  };

  const toggleVoiceConversation = async () => {
    if (!realtimeChat || !isConnected) {
      await initializeRealtimeChat();
      return;
    }

    try {
      setSpeechDetected(false);
      setIsUserTranscribing(false);
      isUserTranscribingRef.current = false;

      if (isListening) {
        realtimeChat.pauseListening();
        setIsListening(false);
        setConversationState('idle');
      } else {
        realtimeChat.resumeListening();
        setIsListening(true);
      }

      resetIdleTimeout();
    } catch (error) {
      console.error('Error toggling microphone state:', error);
      toast({
        title: "Microphone Error",
        description: "We couldn't change the microphone state. Please try again.",
        variant: "destructive"
      });
    }
  };

  const disconnectVoice = () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout);
      setIdleTimeout(null);
    }
    
    // Cancel any active speech and reset transcript state
    cancelAssistantSpeech();
    resetAssistantTranscriptState();
    pendingAssistantMessageIndexRef.current = null;
    activeAssistantResponseIdRef.current = null;
    
    if (realtimeChat) {
      realtimeChat.disconnect();
      setRealtimeChat(null);
      setIsConnected(false);
      setIsListening(false);
      setVoiceStarted(false);
      setSpeechDetected(false);
    }

    pendingUserMessageIndexRef.current = null;
    pendingAssistantMessageIndexRef.current = null;
    
    // Single consolidated toast message
    toast({
      title: "Voice Session Ended",
      description: "Thank you for using our voice assistant",
      duration: 3000
    });
    
    // Only trigger review popup after meaningful conversation
    setTimeout(() => {
      triggerReviewPromptIfEligible('voice');
    }, 1500);
  };

  const triggerReviewPromptIfEligible = (channel: 'voice' | 'chat' | 'booking' | 'whatsapp') => {
    // Only show review popup if there was meaningful interaction
    const conversationDuration = conversationStartTime ? (Date.now() - conversationStartTime.getTime()) / 1000 : 0;
    const hasMinimumInteraction = conversationDuration > 30 || messageCount > 2;
    
    if (assistant?.id && hasMinimumInteraction) {
      openReviewPrompt({
        assistantId: assistant.id,
        origin: 'preview',
        channel,
        logoUrl: assistant.logo_url
      });
    }
  };

  const triggerReviewPrompt = (channel: 'voice' | 'chat' | 'booking' | 'whatsapp') => {
    if (assistant?.id) {
      openReviewPrompt({
        assistantId: assistant.id,
        origin: 'preview',
        channel,
        logoUrl: assistant.logo_url
      });
    }
  };


  const handleFunctionCall = async (functionCall: any) => {
    try {
      // Handle both old format (with arguments) and new format (processed object)
      let args: any = {};
      
      if (functionCall.arguments) {
        // Old format: parse JSON arguments
        try {
          args = JSON.parse(functionCall.arguments);
        } catch (e) {
          console.error('Error parsing function call arguments:', e);
          args = {};
        }
      } else {
        // New format: data is directly in the functionCall object
        args = functionCall;
      }
      
      if (functionCall.name === 'navigate_to_page') {
        const targetUrl = args.page || args.url;
        console.log('=== NAVIGATION DEBUG ===');
        console.log('Raw navigation request:', args);
        console.log('Target URL extracted:', targetUrl);

        if (targetUrl) {
          let handledByPreview = false;
          const navigateKnowledgeBase = (window as any).navigateKnowledgeBasePage;
          const findKnowledgePage = (window as any).navigateKnowledgeBaseByUrl;
          const showKnowledgePage = (window as any).navigateKnowledgeBaseShowPage;

          if (typeof navigateKnowledgeBase === 'function') {
            try {
              let previewResult = navigateKnowledgeBase(targetUrl);
              if (!previewResult && typeof targetUrl === 'string') {
                try {
                  const baseForPreview = (() => {
                    if (assistant?.website_url) {
                      try {
                        return new URL(
                          /^https?:/i.test(assistant.website_url)
                            ? assistant.website_url
                            : `https://${assistant.website_url}`
                        );
                      } catch {}
                    }
                    return new URL(window.location.origin);
                  })();

                  const derived = /^https?:/i.test(targetUrl)
                    ? new URL(targetUrl)
                    : new URL(
                        targetUrl.startsWith('/')
                          ? targetUrl
                          : `/${targetUrl.replace(/^\/+/, '')}`,
                        baseForPreview
                      );
                  previewResult = navigateKnowledgeBase(derived.pathname);
                  if (!previewResult && derived.pathname) {
                    const lastSegment = derived.pathname.split('/').filter(Boolean).pop();
                    if (lastSegment) {
                      previewResult = navigateKnowledgeBase(lastSegment);
                    }
                  }
                } catch (innerError) {
                  console.debug('Navigation preview fallback error:', innerError);
                }

                if (!previewResult && typeof findKnowledgePage === 'function') {
                  const matchedPage = findKnowledgePage(targetUrl);
                  if (matchedPage) {
                    previewResult = typeof showKnowledgePage === 'function'
                      ? showKnowledgePage(matchedPage)
                      : navigateKnowledgeBase(matchedPage.url || matchedPage.title || '');
                  }
                }
              }

              if (previewResult) {
                handledByPreview = true;
                toast({
                  title: 'Navigation',
                  description: `Showing ${previewResult.title || 'the requested page'} in the preview.`,
                });
              }
            } catch (previewError) {
              console.debug('Knowledge base navigation fallback failed:', previewError);
            }
          }

          if (handledByPreview) {
            return;
          }

          // Validate and clean the URL using assistant's website domain
          let fullUrl: string;
          try {
            const getBaseOrigin = () => {
              console.log('🌐 STEP 3: getBaseOrigin called');
              
              // STEP 3.1: First priority - parentOrigin from URL params (passed by widget)
              try {
                const urlParams = new URLSearchParams(window.location.search);
                const parentOrigin = urlParams.get('parentOrigin');
                if (parentOrigin) {
                  console.log('🌐 STEP 3: Using parentOrigin from URL params:', parentOrigin);
                  return parentOrigin;
                }
              } catch (e) {
                console.warn('🌐 STEP 3: Failed to get parentOrigin from URL params:', e);
              }
              
              // STEP 3.2: Second priority - Try to get parent window's origin if in iframe
              try {
                if (window.parent && window.parent !== window) {
                  const parentOrigin = window.parent.location.origin;
                  console.log('🌐 STEP 3: Using parent window origin:', parentOrigin);
                  return parentOrigin;
                }
              } catch (e) {
                // Cross-origin restriction - this is expected and OK
                console.debug('🌐 STEP 3: Cannot access parent origin (cross-origin):', e);
              }
              
              // STEP 3.3: Third priority - Assistant's website_url
              try {
                if (assistant?.website_url) {
                  const base = new URL(/^https?:\/\//i.test(assistant.website_url) ? assistant.website_url : `https://${assistant.website_url}`);
                  console.log('🌐 STEP 3: Using assistant website_url:', base.origin);
                  return base.origin;
                }
              } catch (e) {
                console.warn('🌐 STEP 3: Failed to parse assistant website_url:', e);
              }
              
              // STEP 3.4: Final fallback - Current window origin
              console.log('🌐 STEP 3: Using fallback window.location.origin:', window.location.origin);
              return window.location.origin;
            };
            const baseOrigin = getBaseOrigin();
            console.log('🌐 STEP 3: Final base origin selected:', baseOrigin);
            
            const raw = (targetUrl as string).trim();
            
            // STEP 4: Improved URL parsing with better relative path detection
            console.log('🌐 STEP 4: Parsing navigation target:', raw);
            console.log('🌐 STEP 4: Base origin:', baseOrigin);
            console.log('🌐 STEP 4: Assistant website_url:', assistant?.website_url);
            
            // Check if this is a common relative path pattern (like "login", "about", "contact")
            const isLikelyPath = /^[a-z0-9-_]+$/i.test(raw) && raw.length < 50 && !raw.includes('.');
            
            if (/^https?:\/\//i.test(raw)) {
              // Already a full URL
              fullUrl = raw;
              console.log('🌐 STEP 4: Using as full URL:', fullUrl);
            } else if (/^www\./i.test(raw) || /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) {
              // Domain-like pattern (www.example.com or example.com)
              fullUrl = `https://${raw}`;
              console.log('🌐 STEP 4: Detected domain pattern, adding https:', fullUrl);
            } else if (raw.startsWith('/')) {
              // Already has leading slash
              fullUrl = `${baseOrigin}${raw}`;
              console.log('🌐 STEP 4: Path with leading slash:', fullUrl);
            } else if (isLikelyPath) {
              // STEP 4: Single word like "login" - treat as path
              fullUrl = `${baseOrigin}/${raw}`;
              console.log('🌐 STEP 4: Detected likely path, adding leading slash:', fullUrl);
            } else {
              // Default: add leading slash
              fullUrl = `${baseOrigin}/${raw.replace(/^\/+/, '')}`;
              console.log('🌐 STEP 4: Default path handling:', fullUrl);
            }
            
            // STEP 4: Validation - prevent TalkWeb URLs when assistant has different website
            if (assistant?.website_url) {
              const assistantOrigin = new URL(/^https?:\/\//i.test(assistant.website_url) ? assistant.website_url : `https://${assistant.website_url}`).origin;
              if (fullUrl.includes('talkweb.io') && !assistantOrigin.includes('talkweb.io')) {
                console.warn('🌐 STEP 4: Prevented TalkWeb URL construction, using assistant origin instead');
                const urlPath = new URL(fullUrl).pathname;
                fullUrl = `${assistantOrigin}${urlPath}`;
                console.log('🌐 STEP 4: Corrected URL:', fullUrl);
              }
            }
            
            // Validate URL format
            new URL(fullUrl);
            console.log('🌐 STEP 4: Final validated navigation URL:', fullUrl);
            
            // Track link click
            if (assistant?.id) {
              trackLinkClick({
                assistantId: assistant.id,
                clickedUrl: fullUrl,
                linkLabel: targetUrl as string,
                source: 'text_navigation',
              });
            }
            
            // Show navigation toast
            toast({ title: 'Navigation', description: `Opening ${fullUrl}...` });
            
            // STEP 5: Use parent window communication for navigation
            try {
              if (window.parent && window.parent !== window) {
                // In iframe/widget - send navigation message to parent (widget)
                console.log('🌐 STEP 5: Sending VOICE_NAVIGATE message to parent window');
                window.parent.postMessage({ 
                  type: 'VOICE_NAVIGATE',
                  url: fullUrl,
                  openInNewTab: true
                }, '*');
                console.log('🌐 STEP 5: Navigation message sent to widget (new tab)');
              } else {
                // Not in iframe - open in new tab to keep voice session active
                console.log('🌐 STEP 5: Not in iframe, opening in new tab');
                window.open(fullUrl, '_blank', 'noopener,noreferrer');
              }
            } catch (error) {
              console.error('🌐 STEP 5: Navigation error:', error);
              // Fallback to new tab navigation
              window.open(fullUrl, '_blank', 'noopener,noreferrer');
            }
          } catch (urlError) {
            console.error('Invalid URL format:', targetUrl, urlError);
            toast({ title: 'Navigation Error', description: `Invalid URL format: ${targetUrl}`, variant: 'destructive' });
          }
        } else {
          console.error('No target URL provided in navigation request');
          toast({
            title: "Navigation Error", 
            description: "No target page specified",
            variant: "destructive"
          });
        }
      } else if (functionCall.name === 'search_knowledge') {
        const q = args.query;
        if (!q) {
          toast({ title: 'Search', description: 'Missing query', variant: 'destructive' });
          return;
        }
        try {
          const domain = (() => { try { return new URL(assistant?.website_url || '').hostname; } catch { return ''; } })();
          const { data, error } = await supabase.functions.invoke('knowledge-search', {
            body: { assistantId: assistant?.id, query: q, topK: args.top_k || 5, domain, tags: ['kb-upload'] }
          });
          if (error) throw error;
          const matches = data?.matches || [];
          const summary = matches.slice(0, 3).map((m: any, i: number) => `${i + 1}. ${m.metadata?.title || m.metadata?.url || m.id}`).join('\n') || 'No results found.';
          setMessages(prev => [...prev, { role: 'assistant', content: `Here are relevant results:\n${summary}`, timestamp: new Date() }]);
        } catch (e: any) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Search error: ${e?.message || e}`, timestamp: new Date() }]);
        }
      } else if (functionCall.name === 'collect_booking_info') {
        console.log('🗂️ collect_booking_info function call received:', functionCall);
        
        const rawFieldName = (args.field_name || args.fieldName || args.field || '').toString();
        const normalizedFieldName = rawFieldName.trim().toLowerCase();
        const rawFieldValue = args.field_value ?? args.fieldValue ?? args.value ?? '';
        const fieldValue = typeof rawFieldValue === 'string' ? rawFieldValue.trim() : String(rawFieldValue ?? '');
        const isComplete = Boolean(args.is_complete ?? args.isComplete);
        const nextField = (args.next_field || args.nextField || null) as string | null;
        const collectedFieldsRaw = args.collected_fields || args.collectedFields || {};

        processCollectedBookingFields({
          primaryField: normalizedFieldName,
          primaryValue: fieldValue,
          collectedFields: collectedFieldsRaw,
          isComplete,
          nextField
        });
      } else if (functionCall.name === 'manual_input_received') {
        console.log('✍️ manual_input_received function call received:', functionCall);
        const fieldType = (args.fieldType || args.field_type || args.field || '').toString().toLowerCase();
        const value = args.value ?? args.field_value ?? '';
        const manualCollectedFields = args.collected_fields || args.collectedFields || undefined;

        processCollectedBookingFields({
          primaryField: fieldType,
          primaryValue: value,
          collectedFields: manualCollectedFields,
          isComplete: typeof args.is_complete === 'boolean' ? args.is_complete : undefined,
          nextField: (args.next_field || args.nextField || null) as string | null
        });
      } else if (functionCall.name === 'book_appointment') {
        // Enhanced booking process with proper data extraction and validation
        const userEmail = args.user_email || args.userEmail || args.contact_info || args.email || '';
        const userName = args.user_name || args.userName || args.name || '';
        const userPhone = args.user_phone || args.userPhone || args.phone || args.contact_number || '';
        const preferredDate = args.preferred_date || args.date || '';
        const preferredTime = args.preferred_time || args.time || '';
        
        // Prepare booking details with all extracted information
        const bookingDetails = {
          email: userEmail,
          phone: userPhone,
          name: userName,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          service_type: args.service_type || args.service,
          message: args.message || args.additional_info
        };
        
        console.log('Booking details extracted:', bookingDetails);
        setCurrentBookingDetails(bookingDetails);
        
        // Add voice acknowledgment for received details
        if (realtimeChat && isConnected) {
          let acknowledgment = "I've captured your booking information. ";
          if (userEmail) acknowledgment += "Email: " + userEmail + ". ";
          if (userName) acknowledgment += "Name: " + userName + ". ";
          if (userPhone) acknowledgment += "Phone: " + userPhone + ". ";
          if (preferredDate) acknowledgment += "Date: " + preferredDate + ". ";
          if (preferredTime) acknowledgment += "Time: " + preferredTime + ". ";
          acknowledgment += "Please review and confirm your booking details.";
          
          // Send acknowledgment through voice
          realtimeChat.sendMessage(acknowledgment);
          
          // Add visual message too
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: acknowledgment,
            timestamp: new Date()
          }]);
        }
        
        // Keep the enhanced booking confirmation modal for complex layouts
        const showBookingConfirmation = () => {
          // FIX 1: Disconnect background voice so modal's own SpeechRecognition is sole listener
          if (realtimeChat) {
            console.log('🔇 Pausing background voice for booking modal');
            realtimeChat.disconnect();
            setRealtimeChat(null);
            setIsConnected(false);
            setIsListening(false);
            setVoiceStarted(false);
            setSpeechDetected(false);
          }

          // Remove any existing confirmation modal
          const existingModal = document.getElementById('booking-confirmation-modal');
          if (existingModal) {
            existingModal.remove();
          }

          const modalBackdrop = document.createElement('div');
          modalBackdrop.id = 'booking-confirmation-modal';
          modalBackdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            backdrop-filter: blur(4px);
          `;

          const confirmationModal = document.createElement('div');
          confirmationModal.style.cssText = `
            width: 100%;
            max-width: 550px;
            max-height: 90vh;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
            overflow: hidden;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid rgba(255,255,255,0.18);
          `;

          // Add enhanced keyframe animations
          const style = document.createElement('style');
          style.textContent = `
            @keyframes slideUp {
              from { 
                transform: translateY(40px) scale(0.96); 
                opacity: 0; 
              }
              to { 
                transform: translateY(0) scale(1); 
                opacity: 1; 
              }
            }
            @keyframes fadeOut {
              from { 
                transform: scale(1); 
                opacity: 1; 
              }
              to { 
                transform: scale(0.95); 
                opacity: 0; 
              }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
            .countdown-animation {
              animation: pulse 1s infinite;
            }
          `;
          document.head.appendChild(style);

          // Format date and time for better display
          const formatDateTime = () => {
            const date = args.preferred_date;
            const time = args.preferred_time;
            
            if (date && time) {
              try {
                const dateObj = new Date(date + ' ' + time);
                return {
                  date: dateObj.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }),
                  time: dateObj.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                  })
                };
              } catch (e) {
                return { date: date || 'Not specified', time: time || 'Not specified' };
              }
            }
            return { date: date || 'Not specified', time: time || 'Not specified' };
          };

          const { date: formattedDate, time: formattedTime } = formatDateTime();

          // Helper function for phone formatting
          const formatPhoneDisplay = (phone: string) => {
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.length === 10) {
              return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            }
            return phone;
          };

          confirmationModal.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 28px; text-align: center; position: relative;">
              <div style="position: relative; z-index: 1;">
                <div style="width: 48px; height: 48px; margin: 0 auto 12px auto; position: relative;">
                  <svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="8" width="40" height="36" rx="6" fill="white" opacity="0.2"/>
                    <rect x="4" y="8" width="40" height="12" rx="6" fill="white" opacity="0.35"/>
                    <rect x="14" y="4" width="3" height="8" rx="1.5" fill="white"/>
                    <rect x="31" y="4" width="3" height="8" rx="1.5" fill="white"/>
                    <text x="24" y="36" text-anchor="middle" fill="white" font-size="18" font-weight="700" font-family="system-ui, sans-serif">${new Date().getDate()}</text>
                  </svg>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Confirm Your Appointment</h3>
                <p style="margin: 0; font-size: 15px; opacity: 0.95; font-weight: 400;">
                  🎙️ Say "confirm booking" or use the buttons below
                </p>
              </div>
            </div>
            
            <div style="padding: 28px; overflow-y: auto; max-height: calc(90vh - 200px);">
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                  <div style="font-size: 18px;">📋</div>
                  <h4 style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">Booking Details</h4>
                </div>
                
                <div style="display: grid; gap: 16px;">
                  ${userName ? `
                  <div style="padding: 12px 16px; background: white; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <span style="font-size: 16px;">👤</span>
                      <span style="font-weight: 600; color: #374151; font-size: 13px;">Name</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span id="name-value" style="color: #6b7280; font-weight: 500; font-size: 15px; flex: 1; overflow-x: auto; white-space: nowrap;">${userName}</span>
                      <button id="name-edit-btn" onclick="toggleEdit('name', true)" style="
                        padding: 3px 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px;
                        color: #374151; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; margin-left: 8px;
                      ">✏️ Edit</button>
                    </div>
                    <div id="name-edit-controls" style="display: none; margin-top: 8px;">
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button id="name-save-btn" onclick="saveEdit('name')" style="
                          padding: 3px 10px; background: #10b981; border: 1px solid #10b981; border-radius: 6px;
                          color: white; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
                        ">✅ Save</button>
                        <button id="name-cancel-btn" onclick="toggleEdit('name', false)" style="
                          padding: 3px 10px; background: #ef4444; border: 1px solid #ef4444; border-radius: 6px;
                          color: white; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
                        ">❌ Cancel</button>
                      </div>
                    </div>
                  </div>
                  ` : ''}
                  
                  <div style="padding: 12px 16px; background: white; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <span style="font-size: 16px;">📧</span>
                      <span style="font-weight: 600; color: #374151; font-size: 13px;">Email</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span id="email-value" style="color: #6b7280; font-weight: 500; font-size: 15px; flex: 1; overflow-x: auto; white-space: nowrap; word-break: break-all;">${userEmail}</span>
                      <button id="email-edit-btn" onclick="toggleEdit('email', true)" style="
                        padding: 3px 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px;
                        color: #374151; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; margin-left: 8px;
                      ">✏️ Edit</button>
                    </div>
                    <div id="email-edit-controls" style="display: none; margin-top: 8px;">
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button id="email-save-btn" onclick="saveEdit('email')" style="
                          padding: 3px 10px; background: #10b981; border: 1px solid #10b981; border-radius: 6px;
                          color: white; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
                        ">✅ Save</button>
                        <button id="email-cancel-btn" onclick="toggleEdit('email', false)" style="
                          padding: 3px 10px; background: #ef4444; border: 1px solid #ef4444; border-radius: 6px;
                          color: white; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
                        ">❌ Cancel</button>
                      </div>
                    </div>
                  </div>
                  
                  ${userPhone ? `
                  <div style="padding: 12px 16px; background: white; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <span style="font-size: 16px;">📱</span>
                      <span style="font-weight: 600; color: #374151; font-size: 13px;">Phone</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span id="phone-value" style="color: #6b7280; font-weight: 500; font-size: 15px; flex: 1; overflow-x: auto; white-space: nowrap;">${formatPhoneDisplay(userPhone)}</span>
                      <button id="phone-edit-btn" onclick="toggleEdit('phone', true)" style="
                        padding: 3px 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px;
                        color: #374151; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; margin-left: 8px;
                      ">✏️ Edit</button>
                    </div>
                    <div id="phone-edit-controls" style="display: none; margin-top: 8px;">
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button id="phone-save-btn" onclick="saveEdit('phone')" style="
                          padding: 3px 10px; background: #10b981; border: 1px solid #10b981; border-radius: 6px;
                          color: white; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
                        ">✅ Save</button>
                        <button id="phone-cancel-btn" onclick="toggleEdit('phone', false)" style="
                          padding: 3px 10px; background: #ef4444; border: 1px solid #ef4444; border-radius: 6px;
                          color: white; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
                        ">❌ Cancel</button>
                      </div>
                    </div>
                  </div>
                  ` : ''}
                  
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; background: white; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 16px;">📅</span>
                      <span style="font-weight: 600; color: #374151;">Date</span>
                    </div>
                    <span style="color: #6b7280; font-weight: 500; text-align: right;">${formattedDate}</span>
                  </div>
                  
                  ${args.preferred_time ? `
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; background: white; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 16px;">🕐</span>
                      <span style="font-weight: 600; color: #374151;">Time</span>
                    </div>
                    <span style="color: #6b7280; font-weight: 500; text-align: right;">${formattedTime}</span>
                  </div>
                  ` : ''}
                  
                  ${args.service_type ? `
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; background: white; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 16px;">🔧</span>
                      <span style="font-weight: 600; color: #374151;">Service</span>
                    </div>
                    <span style="color: #6b7280; font-weight: 500; text-align: right;">${args.service_type}</span>
                  </div>
                  ` : ''}
                  
                  ${args.message ? `
                  <div style="padding: 12px 16px; background: white; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <span style="font-size: 16px;">💬</span>
                      <span style="font-weight: 600; color: #374151;">Message</span>
                    </div>
                    <div style="color: #6b7280; font-size: 14px; line-height: 1.5; background: #f8fafc; padding: 12px; border-radius: 8px; max-height: 100px; overflow-y: auto;">${args.message}</div>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <div id="voice-status-indicator" style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                color: white; 
                padding: 16px 20px; 
                border-radius: 12px; 
                margin-bottom: 24px;
                text-align: center;
                font-size: 15px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                border: 1px solid rgba(255,255,255,0.2);
              ">
                🎙️ Click Edit buttons to modify details, or say "confirm", "proceed", or "cancel"
              </div>
              
              <div style="display: flex; gap: 14px; justify-content: center;">
                <button id="cancel-booking-btn" style="
                  padding: 14px 28px;
                  border: 2px solid #e5e7eb;
                  background: white;
                  color: #374151;
                  border-radius: 12px;
                  cursor: pointer;
                  font-size: 15px;
                  font-weight: 600;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                  min-width: 120px;
                " onmouseover="this.style.borderColor='#d1d5db'; this.style.background='#f9fafb'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'" onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'">
                  Cancel
                </button>
                <button id="confirm-booking-btn" style="
                  padding: 14px 28px;
                  border: none;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border-radius: 12px;
                  cursor: pointer;
                  font-size: 15px;
                  font-weight: 600;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                  min-width: 140px;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)'">
                  ✨ Confirm Booking
                </button>
              </div>
            </div>
          `;

          modalBackdrop.appendChild(confirmationModal);
          document.body.appendChild(modalBackdrop);

          // Track editable user details from voice and manual editing
          let currentEmail = userEmail || '';
          let currentName = userName || '';
          let currentPhone = userPhone || '';
          let isEditingEmail = false;
          let isEditingName = false;
          let isEditingPhone = false;

          // Validation functions
          const validateEmail = (email: string) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
          };

          const validatePhone = (phone: string) => {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            return phone.length >= 10 && phoneRegex.test(phone.replace(/\D/g, ''));
          };


          const formatPhoneNumber = (phone: string) => {
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.length === 10) {
              return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            }
            return phone;
          };

          // Toggle edit mode functions
          const toggleEdit = (field: 'email' | 'name' | 'phone', enable: boolean) => {
            const valueElement = document.getElementById(`${field}-value`);
            const editButton = document.getElementById(`${field}-edit-btn`);
            const editControls = document.getElementById(`${field}-edit-controls`);

            if (!valueElement || !editButton) return;

            if (enable) {
              // Switch to edit mode
              const currentValue = field === 'email' ? currentEmail :
                                 field === 'name' ? currentName : currentPhone;
              valueElement.innerHTML = `
                <input
                  id="${field}-input"
                  type="${field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}"
                  value="${currentValue}"
                  placeholder="${field === 'email' ? 'Enter email address' :
                              field === 'name' ? 'Enter your name' : 'Enter phone number'}"
                  style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    background: white;
                    outline: none;
                    transition: border-color 0.2s;
                  "
                  onfocus="this.style.borderColor='#667eea'"
                  onblur="this.style.borderColor='#e5e7eb'"
                  onkeypress="if(event.key==='Enter') document.getElementById('${field}-save-btn').click()"
                />
                <div id="${field}-error" style="color: #ef4444; font-size: 12px; margin-top: 4px; display: none;"></div>
              `;
              
              editButton.style.display = 'none';
              if (editControls) editControls.style.display = 'block';
              
              // Focus the input
              const input = document.getElementById(`${field}-input`) as HTMLInputElement;
              if (input) input.focus();
              
              if (field === 'email') isEditingEmail = true;
              if (field === 'name') isEditingName = true;
              if (field === 'phone') isEditingPhone = true;
            } else {
              // Switch back to display mode
              const displayValue = field === 'email' ? currentEmail : 
                                 field === 'name' ? currentName : 
                                 field === 'phone' ? formatPhoneNumber(currentPhone) : currentPhone;
              
              valueElement.innerHTML = displayValue;
              editButton.style.display = 'inline-flex';
              if (editControls) editControls.style.display = 'none';
              
              if (field === 'email') isEditingEmail = false;
              if (field === 'name') isEditingName = false;
              if (field === 'phone') isEditingPhone = false;
            }
          };

          const saveEdit = (field: 'email' | 'name' | 'phone') => {
            const input = document.getElementById(`${field}-input`) as HTMLInputElement;
            const errorDiv = document.getElementById(`${field}-error`);
            
            if (!input || !errorDiv) return;
            
            const value = input.value.trim();
            let isValid = true;
            let errorMessage = '';
            
            // Validate input
            if (field === 'email') {
              if (!value) {
                isValid = false;
                errorMessage = 'Email is required';
              } else if (!validateEmail(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
              }
            } else if (field === 'name') {
              if (!value) {
                isValid = false;
                errorMessage = 'Name is required';
              } else if (value.length < 2) {
                isValid = false;
                errorMessage = 'Name must be at least 2 characters';
              }
            } else if (field === 'phone') {
              if (!value) {
                isValid = false;
                errorMessage = 'Phone number is required';
              } else if (!validatePhone(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
              }
            }
            
            if (!isValid) {
              errorDiv.textContent = errorMessage;
              errorDiv.style.display = 'block';
              input.style.borderColor = '#ef4444';
              return;
            }
            
            // Save the value
            if (field === 'email') currentEmail = value;
            if (field === 'name') currentName = value;
            if (field === 'phone') currentPhone = value;

            if (field === 'email') {
              conversationMemory.updateBookingInfo({ userEmail: value }, 'chat');
            } else if (field === 'phone') {
              conversationMemory.updateBookingInfo({ userPhone: value }, 'chat');
            } else if (field === 'name') {
              conversationMemory.updateBookingInfo({ userName: value }, 'chat');
            }
            
            toggleEdit(field, false);
            
            // Show success feedback
            const statusDiv = document.getElementById('voice-status-indicator');
            if (statusDiv) {
              const oldBg = statusDiv.style.background;
              const oldContent = statusDiv.innerHTML;
              statusDiv.style.background = '#10b981';
              statusDiv.innerHTML = `✅ ${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`;
              setTimeout(() => {
                statusDiv.style.background = oldBg;
                statusDiv.innerHTML = oldContent;
              }, 2000);
            }
          };

          const cleanupEditHandlers = () => {
            delete (window as any).toggleEdit;
            delete (window as any).saveEdit;
          };

          cleanupEditHandlers();
          (window as any).toggleEdit = toggleEdit;
          (window as any).saveEdit = saveEdit;

          const removeBookingModal = () => {
            cleanupEditHandlers();
            if (modalBackdrop.parentElement) {
              modalBackdrop.remove();
            }
          };

          // Voice recognition setup
          let recognition: any = null;
          if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onresult = (event: any) => {
              const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
              console.log('Voice confirmation heard:', transcript);
              
              const statusDiv = document.getElementById('voice-status-indicator');
              if (statusDiv) {
                statusDiv.style.background = '#f59e0b';
                statusDiv.innerHTML = `🎙️ Heard: "${transcript}"`;
              }

              // Voice updates for details
              if (/email(?: address)? is/.test(transcript)) {
                const part = transcript.split(/email(?: address)? is/)[1] || '';
                if (part) {
                  const normalized = part
                    .toLowerCase()
                    .replace(/\s+at\s+/g, '@')
                    .replace(/\s+dot\s+/g, '.')
                    .replace(/\s+/g, '');
                  currentEmail = normalized;
                  conversationMemory.updateBookingInfo({ userEmail: normalized }, 'voice');
                  const el = document.getElementById('email-value');
                  if (el) el.textContent = normalized;
                  if (statusDiv) {
                    statusDiv.style.background = '#10b981';
                    statusDiv.innerHTML = `📧 Email set to ${normalized}`;
                  }
                }
                return;
              }

              if (/phone(?: number)? is/.test(transcript)) {
                const part = transcript.split(/phone(?: number)? is/)[1] || '';
                const digits = part.replace(/[^0-9+]/g, '');
                if (digits) {
                  currentPhone = digits;
                  conversationMemory.updateBookingInfo({ userPhone: digits }, 'voice');
                  const el = document.getElementById('phone-value');
                  if (el) el.textContent = digits;
                  if (statusDiv) {
                    statusDiv.style.background = '#10b981';
                    statusDiv.innerHTML = `📱 Phone set to ${digits}`;
                  }
                }
                return;
              }

              if (/(my )?name is/.test(transcript)) {
                const part = transcript.split(/name is/)[1] || '';
                const cleaned = part.trim().replace(/\s+/g, ' ');
                if (cleaned) {
                  currentName = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
                  conversationMemory.updateBookingInfo({ userName: currentName }, 'voice');
                  const el = document.getElementById('name-value');
                  if (el) el.textContent = currentName;
                  if (statusDiv) {
                    statusDiv.style.background = '#10b981';
                    statusDiv.innerHTML = `👤 Name set to ${currentName}`;
                  }
                }
                return;
              }
              
              if (transcript.includes('confirm') || transcript.includes('proceed') || transcript.includes('yes') || transcript.includes('book')) {
                recognition.stop();
                if (statusDiv) {
                  statusDiv.style.background = '#10b981';
                  statusDiv.innerHTML = '✅ Confirmed! Processing...';
                }
                setTimeout(() => processBooking(true), 1000);
              } else if (transcript.includes('cancel') || transcript.includes('no') || transcript.includes('stop')) {
                recognition.stop();
                if (statusDiv) {
                  statusDiv.style.background = '#ef4444';
                  statusDiv.innerHTML = '❌ Cancelled';
                }
                setTimeout(() => processBooking(false), 1000);
              } else {
                setTimeout(() => {
                  if (statusDiv) {
                    statusDiv.style.background = '#10b981';
                    statusDiv.innerHTML = '🎙️ Listening... Say "confirm", "proceed", or "cancel"';
                  }
                }, 2000);
              }
            };
            
            recognition.start();
          }

          // Handle manual button clicks with enhanced UX
          const processBooking = async (proceed: boolean) => {
            if (recognition) recognition.stop();
            
            if (!proceed) {
              // Smooth exit animation
              confirmationModal.style.animation = 'fadeOut 0.3s ease-out forwards';
              setTimeout(() => {
                removeBookingModal();
              }, 300);
              
              toast({
                title: "Booking Cancelled",
                description: "Your booking was cancelled. Let me know if you'd like to try again.",
                variant: "default"
              });
              return;
            }

            // Show processing state
            const statusDiv = document.getElementById('voice-status-indicator');
            const confirmBtn = document.getElementById('confirm-booking-btn') as HTMLElement;
            const cancelBtn = document.getElementById('cancel-booking-btn') as HTMLElement;
            
            if (statusDiv) {
              statusDiv.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
              statusDiv.innerHTML = '⏳ Processing your booking...';
            }
            
            if (confirmBtn) {
              confirmBtn.style.opacity = '0.5';
              confirmBtn.style.pointerEvents = 'none';
              confirmBtn.innerHTML = '⏳ Processing...';
            }
            
            if (cancelBtn) {
              cancelBtn.style.opacity = '0.5';
              cancelBtn.style.pointerEvents = 'none';
            }
            
            // Require email before proceeding
            if (!currentEmail) {
              if (statusDiv) {
                statusDiv.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                statusDiv.style.color = 'white';
                statusDiv.style.opacity = '1';
                statusDiv.innerHTML = '📧 Please say "my email is …" to provide your email before confirming.';
              }
              if (confirmBtn) { confirmBtn.style.opacity = '1'; confirmBtn.style.pointerEvents = 'auto'; confirmBtn.innerHTML = '✨ Confirm Booking'; }
              if (cancelBtn) { cancelBtn.style.opacity = '1'; cancelBtn.style.pointerEvents = 'auto'; }
              return;
            }

            try {
                const { data: bookingData, error: bookingError } = await supabase.functions.invoke('enhanced-booking', {
                  body: {
                    assistantId: assistant?.id,
                    userEmail: currentEmail,
                    preferredDate: args.preferred_date,
                    preferredTime: args.preferred_time,
                    serviceType: args.service_type,
                    userName: currentName || args.name || args.user_name,
                    userPhone: currentPhone || args.phone || args.contact_number,
                    message: args.message
                  }
                });

                if (bookingError) {
                  console.warn('enhanced-booking error:', bookingError);
                }

                if (!bookingData?.success) {
                  // Show conflict / error in modal and present availability picker
                  if (statusDiv) {
                    statusDiv.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    statusDiv.innerHTML = bookingData?.message || '❌ That time is unavailable.';
                  }
                  if (bookingData?.conflict && Array.isArray(bookingData?.alternatives) && bookingData.alternatives.length) {
                    const showAvailability = (alternatives: any[]) => {
                      const backdrop = document.createElement('div');
                      backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px';
                      const modal = document.createElement('div');
                      modal.style.cssText = 'width:min(92vw,520px);max-height:90vh;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 20px 40px rgba(0,0,0,.25);overflow:hidden';
                      modal.innerHTML = `
                        <div style="background:#0ea5e9;color:#fff;padding:16px;text-align:center">
                          <div style="font-weight:700;font-size:18px">Choose Another Time</div>
                          <div style="opacity:.95;font-size:13px;margin-top:4px">Select any of the available slots below</div>
                        </div>
                        <div style="padding:16px">
                          <div id="alt-slots" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:50vh;overflow:auto"></div>
                          <div style="display:flex;justify-content:flex-end;margin-top:12px"><button id="close-alt" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827">Close</button></div>
                        </div>`;
                      backdrop.appendChild(modal);
                      document.body.appendChild(backdrop);
                      const container = modal.querySelector('#alt-slots') as HTMLElement;
                      const render = (alts: any[]) => {
                        container.innerHTML = '';
                        alts.slice(0, 12).forEach((alt) => {
                          const d = alt.formatted_date || alt.date || args.preferred_date;
                          const t = alt.formatted_time || alt.start_time || '';
                          const btn = document.createElement('button');
                          btn.style.cssText = 'padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;color:#111827;text-align:left;cursor:pointer';
                          btn.innerHTML = `<div style="font-weight:600;font-size:14px">${d}</div>${t ? `<div style=\"font-size:12px;color:#6b7280\">${t}</div>` : ''}`;
                          btn.onclick = async () => {
                            try {
                              const { data: retry, error: retryErr } = await supabase.functions.invoke('enhanced-booking', {
                                body: {
                                  assistantId: assistant?.id,
                                  userEmail: currentEmail,
                                  preferredDate: d,
                                  preferredTime: t || null,
                                  serviceType: args.service_type,
                                  userName: currentName || args.name || args.user_name,
                                  userPhone: currentPhone || args.phone || args.contact_number,
                                  message: args.message
                                }
                              });
                              if (retryErr) console.warn('enhanced-booking retry error:', retryErr);
                              if (!retry?.success) {
                                if (retry?.conflict && Array.isArray(retry?.alternatives) && retry.alternatives.length) {
                                  render(retry.alternatives);
                                  if (statusDiv) { statusDiv.innerHTML = '❌ Still unavailable. Pick another time.'; }
                                  return;
                                }
                                toast({ title: 'Booking Issue', description: retry?.message || 'Please pick another time.', variant: 'destructive' });
                                return;
                              }
                              document.body.removeChild(backdrop);
                              // Success flow mirrors below
                              if (statusDiv) {
                                statusDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                statusDiv.innerHTML = '✅ Booking Confirmed! Email sent successfully.';
                              }
                              toast({ title: 'Booking Confirmed! ✅', description: `Confirmation email sent to ${currentEmail}.`, duration: 8000 });
                              openReviewPrompt({ assistantId: assistant!.id, origin: 'booking', channel: 'chat', logoUrl: assistant!.logo_url || null });
                              if (retry.calendly_url) {
                                setTimeout(() => { window.open(retry.calendly_url, '_blank', 'width=700,height=800,scrollbars=yes,resizable=yes'); }, 500);
                              }
                            } catch (e) {
                              console.error('Retry booking error:', e);
                              toast({ title: 'Booking Error', description: 'Please try again.', variant: 'destructive' });
                            }
                          };
                          container.appendChild(btn);
                        });
                      };
                      render(alternatives);
                      modal.querySelector('#close-alt')?.addEventListener('click', () => document.body.removeChild(backdrop));
                      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) document.body.removeChild(backdrop); });
                    };
                    showAvailability(bookingData.alternatives);
                  }
                  // Reset buttons after brief pause
                  setTimeout(() => {
                    if (confirmBtn) { confirmBtn.style.opacity = '1'; confirmBtn.style.pointerEvents = 'auto'; confirmBtn.innerHTML = '✨ Confirm Booking'; }
                    if (cancelBtn) { cancelBtn.style.opacity = '1'; cancelBtn.style.pointerEvents = 'auto'; }
                    if (statusDiv) { 
                      statusDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; 
                      statusDiv.style.color = 'white';
                      statusDiv.style.opacity = '1';
                      statusDiv.innerHTML = '🎙️ Listening... Say "confirm", "proceed", or "cancel"'; 
                    }
                  }, 2500);
                  return;
                }
              // Show success toast - book-appointment handles email sending based on trial status
              toast({
                title: "✅ Booking Confirmed!",
                description: `Confirmation email sent to ${currentEmail}`,
                duration: 8000
              });
              
              // Show success state
              if (statusDiv) {
                statusDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                statusDiv.innerHTML = '✅ Booking Confirmed! Email sent.';
              }
               
                // Close modal after success
                setTimeout(() => {
                  removeBookingModal();
                }, 3000);
              
              // Show success message in modal for 2 seconds before closing
              confirmationModal.innerHTML = `
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                  <h3 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700;">Booking Confirmed!</h3>
                  <p style="margin: 0 0 16px 0; font-size: 16px; opacity: 0.95;">
                    Preview confirmation email sent to ${currentEmail}
                  </p>
                  <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; font-size: 14px;">
                      📧 Check your inbox and follow the link to complete scheduling
                    </p>
                  </div>
                  <div id="countdown-timer" style="
                    font-size: 18px; 
                    font-weight: 600; 
                    margin-top: 20px;
                    opacity: 0.9;
                  ">
                    Closing in <span class="countdown-animation">3</span>...
                  </div>
                </div>
              `;

              // Countdown timer
              let countdown = 3;
              const countdownInterval = setInterval(() => {
                countdown--;
                const countdownElement = document.querySelector('#countdown-timer');
                if (countdownElement && countdown > 0) {
                  countdownElement.innerHTML = `Closing in <span class="countdown-animation">${countdown}</span>...`;
                } else if (countdownElement && countdown === 0) {
                  countdownElement.innerHTML = '<span class="countdown-animation">Opening Calendly...</span>';
                  clearInterval(countdownInterval);
                }
              }, 1000);

              // Auto-close modal and open Calendly
              setTimeout(() => {
                clearInterval(countdownInterval);
                  confirmationModal.style.animation = 'fadeOut 0.4s ease-out forwards';

                setTimeout(() => {
                  removeBookingModal();
                }, 400);
                
                // Show success toast
                toast({
                  title: "Booking Confirmed! ✅",
                  description: `Preview confirmation email sent to ${currentEmail}. Check your inbox for demo booking details.`,
                  duration: 8000
                });

                // Optional review prompt
                openReviewPrompt({ assistantId: assistant!.id, origin: 'booking', channel: 'chat', logoUrl: assistant!.logo_url || null });

                // Open Calendly if available
                if (bookingData.calendly_url) {
                  setTimeout(() => {
                    window.open(bookingData.calendly_url, '_blank', 'width=700,height=800,scrollbars=yes,resizable=yes');
                  }, 500);
                }
              }, 3500);

            } catch (bookingError) {
              console.error('Booking error:', bookingError);
              
              // Show error state
              if (statusDiv) {
                statusDiv.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                statusDiv.innerHTML = '❌ Booking failed. Please try again.';
              }
              
              // Reset buttons after error
              setTimeout(() => {
                if (confirmBtn) {
                  confirmBtn.style.opacity = '1';
                  confirmBtn.style.pointerEvents = 'auto';
                  confirmBtn.innerHTML = '✨ Confirm Booking';
                }
                
                if (cancelBtn) {
                  cancelBtn.style.opacity = '1';
                  cancelBtn.style.pointerEvents = 'auto';
                }
                
                if (statusDiv) {
                  statusDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                  statusDiv.innerHTML = '🎙️ Listening... Say "confirm", "proceed", or "cancel"';
                }
              }, 3000);
              
              toast({
                title: "Booking Error",
                description: "There was an issue processing your booking. Please try again.",
                variant: "destructive"
              });
            }
          };

          document.getElementById('cancel-booking-btn')?.addEventListener('click', () => processBooking(false));
          document.getElementById('confirm-booking-btn')?.addEventListener('click', () => processBooking(true));
          
          // Close modal when clicking backdrop
          modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
              processBooking(false);
            }
          });
        };

        showBookingConfirmation();
      } else if (functionCall.name === 'whatsapp_redirect') {
        try {
          console.log('🟢 [WhatsApp] Function called, full object:', JSON.stringify(functionCall, null, 2));
          
          // Check if we already have the whatsapp_url (new format from ai-chat)
          let whatsappUrl = functionCall.whatsapp_url || args.whatsapp_url;
          let businessName = functionCall.business_name || args.business_name || assistant?.business_name || 'our team';
          
          console.log('🟢 [WhatsApp] Initial values - URL:', whatsappUrl, 'Business:', businessName);
          
          // If no whatsapp_url yet, call the whatsapp-redirect function (old format)
          if (!whatsappUrl) {
            const userMessage = args.userMessage || args.user_message || args.context || '';
            const customMessage = args.customMessage || args.custom_message || '';
            
            console.log('🟢 [WhatsApp] Invoking edge function with:', { assistantId: assistant!.id, userMessage, customMessage });
            const { data, error } = await supabase.functions.invoke('whatsapp-redirect', {
              body: { assistantId: assistant!.id, userMessage, customMessage }
            });
            
            console.log('🟢 [WhatsApp] Edge function response:', { data, error });
            
            if (error) {
              console.error('🔴 [WhatsApp] Edge function error:', error);
              throw error;
            }
            
            if (data?.not_activated) {
              const msg = data.message || `${businessName} hasn't activated WhatsApp yet. Please leave your details here or use the booking form to schedule a callback.`;
              toast({ title: 'WhatsApp not activated', description: msg });
              return;
            }
            whatsappUrl = data?.whatsapp_url;
            businessName = data?.business_name || businessName;
            console.log('🟢 [WhatsApp] Updated values from edge function - URL:', whatsappUrl, 'Business:', businessName);
          }
          
          if (!whatsappUrl) {
            const errorMsg = 'Unable to create WhatsApp link.';
            console.error('🔴 [WhatsApp] No URL available:', errorMsg);
            toast({ 
              title: 'WhatsApp Error', 
              description: String(errorMsg), 
              variant: 'destructive' 
            });
            return;
          }
          
          console.log('🟢 [WhatsApp] Final URL to use:', whatsappUrl);
          
          // Show visual popup for WhatsApp redirection (FIRST, not after window.open)
          const showWhatsAppModal = () => {
            try {
              console.log('🟢 [WhatsApp] Starting modal creation...');
              
              const modalBackdrop = document.createElement('div');
              console.log('🟢 [WhatsApp] Created backdrop element');
              
              modalBackdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                backdrop-filter: blur(4px);
              `;
              console.log('🟢 [WhatsApp] Applied backdrop styles');
              
              const confirmationModal = document.createElement('div');
              console.log('🟢 [WhatsApp] Created modal element');
              
              confirmationModal.style.cssText = `
                width: 100%;
                max-width: 420px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0,0,0,0.25);
                overflow: hidden;
                animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
              `;
              console.log('🟢 [WhatsApp] Applied modal styles');
              
              confirmationModal.innerHTML = `
                <div style="background: linear-gradient(135deg, #25d366 0%, #1ba154 100%); color: white; padding: 24px; text-align: center;">
                  <div style="font-size: 32px; margin-bottom: 12px;">💬</div>
                  <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Redirecting to WhatsApp</h3>
                  <p style="margin: 0; font-size: 14px; opacity: 0.95;">
                    ${functionCall.using_fallback || args.using_fallback ? "Opening test WhatsApp line (preview mode)" : "Connecting you to our WhatsApp chat"}
                  </p>
                </div>
                
                <div style="padding: 24px; text-align: center;">
                  <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">
                    Click the button below to continue your conversation on WhatsApp
                  </p>
                  
                  <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="cancel-whatsapp" style="
                      padding: 12px 20px;
                      border: 1px solid #e5e7eb;
                      background: white;
                      border-radius: 8px;
                      cursor: pointer;
                      color: #6b7280;
                    ">Cancel</button>
                    
                    <a href="${whatsappUrl}" target="_blank" id="open-whatsapp" style="
                      padding: 12px 20px;
                      background: #25d366;
                      color: white;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 500;
                      display: inline-block;
                    ">Open WhatsApp</a>
                  </div>
                </div>
              `;
              console.log('🟢 [WhatsApp] Set modal innerHTML');
              
              modalBackdrop.appendChild(confirmationModal);
              console.log('🟢 [WhatsApp] Appended modal to backdrop');
              
              document.body.appendChild(modalBackdrop);
              console.log('🟢 [WhatsApp] Appended backdrop to body - Modal should now be visible!');
              console.log('🟢 [WhatsApp] Modal element in DOM:', document.body.contains(modalBackdrop));
              
              // Event handlers
              const cancelBtn = confirmationModal.querySelector('#cancel-whatsapp');
              const openBtn = confirmationModal.querySelector('#open-whatsapp');
              
              console.log('🟢 [WhatsApp] Found buttons:', { cancel: !!cancelBtn, open: !!openBtn });
              
              cancelBtn?.addEventListener('click', () => {
                console.log('🟢 [WhatsApp] Cancel button clicked');
                modalBackdrop.remove();
              });
              
              openBtn?.addEventListener('click', () => {
                console.log('🟢 [WhatsApp] Open button clicked');
                modalBackdrop.remove();
                // Trigger review after WhatsApp redirect
                setTimeout(() => {
                  triggerReviewPrompt('whatsapp');
                }, 2000);
              });
              
              modalBackdrop.addEventListener('click', (e) => {
                if (e.target === modalBackdrop) {
                  console.log('🟢 [WhatsApp] Backdrop clicked - closing modal');
                  modalBackdrop.remove();
                }
              });
              
              // Auto-close after 10 seconds
              setTimeout(() => {
                if (modalBackdrop.parentElement) {
                  console.log('🟢 [WhatsApp] Auto-closing modal after 10 seconds');
                  modalBackdrop.remove();
                }
              }, 10000);
              
              console.log('🟢 [WhatsApp] Modal creation complete!');
            } catch (modalError) {
              console.error('🔴 [WhatsApp] ERROR creating modal:', modalError);
              console.error('🔴 [WhatsApp] Error stack:', modalError instanceof Error ? modalError.stack : 'No stack trace');
              
              // Super simple fallback
              alert(`WhatsApp Redirect: Click OK to open WhatsApp\n\nURL: ${whatsappUrl}`);
              window.open(whatsappUrl, '_blank');
            }
          };
          
          console.log('🟢 [WhatsApp] About to call showWhatsAppModal()...');
          
          // Track WhatsApp redirect click — include any known contact info so we can follow up
          if (assistant?.id && whatsappUrl) {
            const ctx = (() => {
              try { return conversationMemory.getCurrentContext().pendingBooking || {}; }
              catch { return {} as any; }
            })();
            trackLinkClick({
              assistantId: assistant.id,
              sessionId: (typeof window !== 'undefined' && (window as any).__previewSessionId) || undefined,
              clickedUrl: whatsappUrl,
              linkLabel: 'WhatsApp',
              source: 'whatsapp_redirect',
              contactName: args.user_name || args.userName || args.name || ctx.userName || null,
              contactEmail: args.user_email || args.userEmail || args.email || ctx.userEmail || null,
              contactPhone: args.user_phone || args.userPhone || args.phone || ctx.userPhone || null,
            });
          }
          
          showWhatsAppModal();
          console.log('🟢 [WhatsApp] showWhatsAppModal() executed');
        } catch (err: any) {
          console.error('🔴 [WhatsApp] OUTER ERROR caught in whatsapp_redirect handler:', err);
          console.error('🔴 [WhatsApp] Error details:', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
            fullError: JSON.stringify(err, Object.getOwnPropertyNames(err))
          });
          toast({ title: 'WhatsApp not available', description: err?.message || 'Please try again later.', variant: 'destructive' });
        }
      } else if (functionCall.name === 'call_business') {
        try {
          console.log('📞 [Call] Function called, full object:', JSON.stringify(functionCall, null, 2));
          
          // Check if we already have the contact_url (new format from contact-redirect)
          let callUrl = functionCall.contact_url || args.contact_url;
          let businessName = functionCall.business_name || args.business_name || assistant?.business_name || 'our team';
          let phoneNotConfigured = false;
          
          console.log('📞 [Call] Initial values - URL:', callUrl, 'Business:', businessName);
          
          // If we don't have the URL yet, call the contact-redirect function
          if (!callUrl) {
            console.log('📞 [Call] No URL yet, calling contact-redirect function...');
            const { data: redirectData, error: redirectError } = await supabase.functions.invoke('contact-redirect', {
              body: {
                assistantId: assistant?.id,
                contactType: 'phone',
                userMessage: args.userMessage || functionCall.userMessage || 'User requested to call'
              }
            });
            
            console.log('📞 [Call] contact-redirect response:', redirectData);
            
            if (redirectError) {
              console.error('📞 [Call] contact-redirect error:', redirectError);
              phoneNotConfigured = true;
            }
            
            if (!redirectData?.success) {
              phoneNotConfigured = true;
            }
            
            if (!phoneNotConfigured) {
              callUrl = redirectData.contact_url;
              businessName = redirectData.business_name || businessName;
            }
          }
          
          console.log('📞 [Call] Final URL:', callUrl, 'Not configured:', phoneNotConfigured);
          
          // Track phone call click — include any known contact info so we can follow up
          if (assistant?.id && callUrl && !phoneNotConfigured) {
            const ctx = (() => {
              try { return conversationMemory.getCurrentContext().pendingBooking || {}; }
              catch { return {} as any; }
            })();
            trackLinkClick({
              assistantId: assistant.id,
              sessionId: (typeof window !== 'undefined' && (window as any).__previewSessionId) || undefined,
              clickedUrl: callUrl,
              linkLabel: 'Phone Call',
              source: 'phone_redirect',
              contactName: args.user_name || args.userName || args.name || ctx.userName || null,
              contactEmail: args.user_email || args.userEmail || args.email || ctx.userEmail || null,
              contactPhone: args.user_phone || args.userPhone || args.phone || ctx.userPhone || null,
            });
          }
          
          // Check if user is on mobile
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          console.log('📞 [Call] Is mobile:', isMobile);
          
          const showCallModal = () => {
            console.log('📞 [Call] Creating modal...', { callUrl, phoneNotConfigured });
            
            const modal = document.createElement('div');
            modal.id = 'call-business-modal';
            modal.style.cssText = `
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              background: white !important;
              padding: 2rem !important;
              border-radius: 1rem !important;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
              z-index: 999999 !important;
              max-width: 90% !important;
              width: 400px !important;
              text-align: center !important;
              display: block !important;
              visibility: visible !important;
            `;
            
            if (phoneNotConfigured || !callUrl || !callUrl.startsWith('tel:')) {
              // Show phone not configured message
              modal.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1rem;">📞</div>
                <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #1a1a1a;">
                  Phone Number Not Available
                </h2>
                <p style="color: #666; margin-bottom: 1.5rem; font-size: 1rem; line-height: 1.5;">
                  ${businessName} hasn't configured a phone number yet. Please use other contact methods or try again later.
                </p>
                <button id="closeCallModal" 
                        style="width: 100%; padding: 0.75rem; background: #667eea; color: white; 
                               border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer;
                               transition: background 0.2s;"
                        onmouseover="this.style.background='#5568d3'"
                        onmouseout="this.style.background='#667eea'">
                  Close
                </button>
              `;
            } else {
              const phoneNumber = callUrl.replace('tel:', '').replace(/[^\d\+\(\)\s-]/g, '');
              const isIPad = /iPad/.test(navigator.userAgent);
              
              modal.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1rem;">📞</div>
                <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #1a1a1a;">
                  Call ${businessName}
                </h2>
                <a href="${callUrl}" 
                   id="phoneNumberDisplay" 
                   style="display: block; color: #2563eb; margin-bottom: 1.5rem; font-size: 1.3rem; font-weight: 600; 
                          text-decoration: underline; cursor: pointer; transition: color 0.2s;"
                   onmouseover="this.style.color='#1d4ed8'"
                   onmouseout="this.style.color='#2563eb'">
                  ${phoneNumber}
                </a>
                ${isMobile ? `
                  <a href="${callUrl}" 
                     style="display: block; width: 100%; padding: 1rem; background: #10b981; color: white; 
                            text-decoration: none; border-radius: 0.5rem; font-weight: 600; font-size: 1.1rem;
                            margin-bottom: 0.75rem; transition: background 0.2s;"
                     onmouseover="this.style.background='#059669'"
                     onmouseout="this.style.background='#10b981'">
                    📱 Call Now
                  </a>
                  <button id="copyPhoneNumber" 
                          style="width: 100%; padding: 0.75rem; background: #667eea; color: white; 
                                 border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer;
                                 margin-bottom: 0.75rem; transition: background 0.2s;"
                          onmouseover="this.style.background='#5568d3'"
                          onmouseout="this.style.background='#667eea'">
                    📋 Copy Number
                  </button>
                  ${isIPad ? `
                    <p style="color: #666; font-size: 0.85rem; margin-bottom: 1rem; padding: 0.5rem; background: #fef3c7; border-radius: 0.5rem;">
                      💡 On iPad, you may need to copy and manually dial the number
                    </p>
                  ` : ''}
                ` : `
                  <button id="copyPhoneNumber" 
                          style="width: 100%; padding: 0.75rem; background: #667eea; color: white; 
                                 border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer;
                                 margin-bottom: 0.75rem; transition: background 0.2s;"
                          onmouseover="this.style.background='#5568d3'"
                          onmouseout="this.style.background='#667eea'">
                    📋 Copy Number
                  </button>
                  <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem; padding: 0.75rem; background: #fef3c7; border-radius: 0.5rem;">
                    📱 Calling works best on mobile devices
                  </p>
                `}
                <button id="closeCallModal" 
                        style="width: 100%; padding: 0.75rem; background: #f3f4f6; color: #4b5563; 
                               border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer;
                               transition: background 0.2s;"
                        onmouseover="this.style.background='#e5e7eb'"
                        onmouseout="this.style.background='#f3f4f6'">
                  Close
                </button>
              `;
            }
            
            const backdrop = document.createElement('div');
            backdrop.id = 'call-business-backdrop';
            backdrop.style.cssText = `
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              background: rgba(0,0,0,0.7) !important;
              z-index: 999998 !important;
              backdrop-filter: blur(4px) !important;
              display: block !important;
              visibility: visible !important;
            `;
            
            console.log('📞 [Call] Appending modal and backdrop to body');
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);
            console.log('📞 [Call] Modal appended, checking if visible:', {
              modalInDOM: document.getElementById('call-business-modal') !== null,
              backdropInDOM: document.getElementById('call-business-backdrop') !== null,
              modalDisplay: modal.style.display,
              modalZIndex: modal.style.zIndex
            });
            
            const copyPhoneButton = modal.querySelector('#copyPhoneNumber') as HTMLButtonElement;
            if (copyPhoneButton) {
              copyPhoneButton.addEventListener('click', async () => {
                const phoneNumber = callUrl.replace('tel:', '');
                try {
                  await navigator.clipboard.writeText(phoneNumber);
                  copyPhoneButton.textContent = '✓ Copied!';
                  copyPhoneButton.style.background = '#10b981';
                  setTimeout(() => {
                    copyPhoneButton.textContent = '📋 Copy Number';
                    copyPhoneButton.style.background = '#667eea';
                  }, 2000);
                } catch (err) {
                  console.error('Failed to copy:', err);
                  // Fallback for older browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = phoneNumber;
                  textArea.style.position = 'fixed';
                  textArea.style.opacity = '0';
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    copyPhoneButton.textContent = '✓ Copied!';
                    copyPhoneButton.style.background = '#10b981';
                    setTimeout(() => {
                      copyPhoneButton.textContent = '📋 Copy Number';
                      copyPhoneButton.style.background = '#667eea';
                    }, 2000);
                  } catch (e) {
                    console.error('Fallback copy failed:', e);
                  }
                  document.body.removeChild(textArea);
                }
              });
            }
            
            const closeModal = () => {
              modal.remove();
              backdrop.remove();
            };
            
            document.getElementById('closeCallModal')?.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);
            
            console.log('📞 [Call] Modal created and displayed');
          };
          
          console.log('📞 [Call] About to call showCallModal()...');
          showCallModal();
          console.log('📞 [Call] showCallModal() executed');
        } catch (err: any) {
          console.error('🔴 [Call] ERROR caught in call_business handler:', err);
          console.error('🔴 [Call] Error details:', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name
          });
          // Show modal even on error
          const showErrorModal = () => {
            const modal = document.createElement('div');
            modal.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              z-index: 10001;
              max-width: 90%;
              width: 400px;
              text-align: center;
            `;
            
            modal.innerHTML = `
              <div style="font-size: 3rem; margin-bottom: 1rem;">📞</div>
              <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #1a1a1a;">
                Call Not Available
              </h2>
              <p style="color: #666; margin-bottom: 1.5rem; font-size: 1rem; line-height: 1.5;">
                ${err?.message || 'Phone contact is not available at the moment. Please use other contact methods or try again later.'}
              </p>
              <button id="closeErrorModal" 
                      style="width: 100%; padding: 0.75rem; background: #667eea; color: white; 
                             border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer;
                             transition: background 0.2s;"
                      onmouseover="this.style.background='#5568d3'"
                      onmouseout="this.style.background='#667eea'">
                Close
              </button>
            `;
            
            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0,0,0,0.7);
              z-index: 10000;
              backdrop-filter: blur(4px);
            `;
            
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);
            
            const closeModal = () => {
              modal.remove();
              backdrop.remove();
            };
            
            document.getElementById('closeErrorModal')?.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);
          };
          
          showErrorModal();
        }
      } else if (functionCall.name === 'search_knowledge') {
        try {
          const query = args.query || args.search || args.q || '';
          const topK = args.top_k || args.topK || 5;
          if (!query || !query.trim()) {
            toast({ title: 'Search', description: 'Please provide what you want me to look up.', variant: 'default' });
            return;
          }
          let domain: string | undefined = undefined;
          try { domain = new URL(assistant?.website_url || '').hostname; } catch {}
          const { data, error } = await supabase.functions.invoke('knowledge-search', {
            body: { assistantId: assistant!.id, query, topK, domain, tags: ['kb-upload'] }
          });
          if (error) console.warn('knowledge-search error:', error);
          const results = data?.matches || data?.results || [];
          toast({ title: 'Knowledge Search', description: `Found ${results.length} result(s).`, variant: 'default' });
        } catch (err: any) {
          console.error('Knowledge search error:', err);
          toast({ title: 'Knowledge Search', description: 'Could not search knowledge base right now.', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Error handling function call:', error);
    }
  };

  const showWhatsAppFallback = (whatsappUrl: string, businessName: string) => {
    const fallbackModal = document.createElement('div');
    fallbackModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    `;

    fallbackModal.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        text-align: center;
      ">
        <h3 style="margin: 0 0 16px 0; color: #1f2937;">Open WhatsApp</h3>
        <p style="margin: 0 0 20px 0; color: #6b7280;">Click the button below to continue your conversation on WhatsApp with ${businessName}.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            padding: 12px 24px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 8px;
            cursor: pointer;
          ">Cancel</button>
          <a href="${whatsappUrl}" target="_blank" style="
            padding: 12px 24px;
            background: #25d366;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
          " onclick="this.parentElement.parentElement.parentElement.remove(); setTimeout(() => triggerReviewPrompt('whatsapp'), 2000);">Open WhatsApp</a>
        </div>
      </div>
    `;

    document.body.appendChild(fallbackModal);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  console.log('🎯 RENDER DECISION POINT:', {
    error: !!error,
    assistant: !!assistant,
    isVoiceMode,
    isEmbedded,
    isWidgetOnlyMode
  });

  if (error) {
    console.log('🚨 RENDERING ERROR STATE:', error);
    // Voice mode error UI - compact and focused
    if (isVoiceMode && isEmbedded) {
      return (
        <div className="h-full flex items-center justify-center p-4 bg-background">
          <div className="text-center">
            <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Voice assistant unavailable</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{error}</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Assistant Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reload Page
          </Button>
        </Card>
      </div>
    );
  }

  if (!assistant) {
    console.log('🔄 RENDERING LOADING STATE - No assistant data yet');
    // Voice mode loading - compact
    if (isVoiceMode && isEmbedded) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading assistant...</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Assistant ID: {assistantId}</p>
        </div>
      </div>
    );
  }

  // Parse knowledge base data
  const getKnowledgeBaseData = () => {
    if (!assistant?.scraped_content) return null;
    
    try {
      let scrapedData;
      if (typeof assistant.scraped_content === 'string') {
        scrapedData = JSON.parse(assistant.scraped_content);
      } else {
        scrapedData = assistant.scraped_content;
      }
      
      if (scrapedData.allPages && scrapedData.allPages.length > 0) {
        return scrapedData;
      }
    } catch (error) {
      console.error('Error parsing knowledge base data:', error);
    }
    
    return null;
  };

  const knowledgeBaseData = getKnowledgeBaseData();

  // Widget-only mode for preview
  if (isWidgetOnlyMode) {
  console.log('🎪 RENDERING WIDGET-ONLY MODE for assistant:', assistant?.id, assistant?.business_name);
  
  console.log('✅ MAIN RENDER PATH - Assistant loaded successfully:', {
    assistantId: assistant.id,
    businessName: assistant.business_name,
    renderMode: isWidgetOnlyMode ? 'widget-only' : isEmbedded ? 'embedded' : 'full'
  });
    
    // Show loading state if assistant hasn't loaded yet
    if (!assistant) {
      return (
        <div className="h-full w-full bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading assistant...</p>
          </div>
        </div>
      );
    }

    // Show error state if there's an error
    if (error) {
      return (
        <div className="h-full w-full bg-background flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <h3 className="font-semibold text-red-700 mb-2">Widget Error</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadAssistant} size="sm">
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    
    const primaryColor = assistant.widget_primary_color || 'hsl(var(--primary))';
    const accentColor = assistant.widget_accent_color || 'hsl(var(--accent))';
    // Default text to black for better contrast on light backgrounds
    const textColor = assistant.widget_text_color || '#1a1a1a';
    const hasPrimaryColor = !!assistant.widget_primary_color;
    
    // Determine if primary color is light or dark for intelligent contrast
    const isLightPrimary = (() => {
      const color = assistant.widget_primary_color || '';
      if (!color || color.startsWith('hsl(var')) return false;
      // Simple hex luminance check
      if (color.startsWith('#') && color.length >= 7) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6;
      }
      return false;
    })();
    // When no custom primary color is set, use high-contrast dark text since the default gradient will be light
    const headerTextColor = hasPrimaryColor ? (isLightPrimary ? '#1a1a1a' : '#ffffff') : '#1a1a1a';
    const headerSubTextColor = hasPrimaryColor ? (isLightPrimary ? '#333333' : '#ffffff') : '#444444';
    
    const customBg = assistant.widget_background_color;
    const gradientEnabled = assistant.widget_gradient_enabled !== false;
    return (
      <div 
        className="h-full w-full flex flex-col overflow-hidden relative"
        style={{
          background: customBg
            ? customBg
            : `linear-gradient(135deg, ${primaryColor}26 0%, ${primaryColor}15 50%, ${accentColor}20 100%)`
        }}
      >
        {/* TalkWeb branded background image at 15% opacity */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: `url('/images/talkweb-widget-bg.webp')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        {/* 24-Hour Trial Expired Overlay */}
        <AssistantTrialExpiredOverlay 
          createdAt={assistant.created_at}
          businessName={assistant.business_name}
          is_trial={assistant.is_trial}
          trial_expires_at={assistant.trial_expires_at}
        />
        {/* Enhanced Header with Glassmorphism */}
        <div 
          className="relative z-10 p-6 flex flex-col items-center gap-4 shadow-lg"
          style={{
            background: hasPrimaryColor 
              ? (gradientEnabled
                  ? `linear-gradient(135deg, ${primaryColor}, ${accentColor || primaryColor + 'dd'})`
                  : primaryColor)
              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted)))',
            color: textColor,
            borderBottom: assistant.widget_border_color ? `1px solid ${assistant.widget_border_color}` : undefined
          }}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Large Logo Display - clickable to website with visual hints */}
            {assistant.logo_url ? (
              assistant.website_url ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a 
                      href={assistant.website_url.startsWith('http') ? assistant.website_url : `https://${assistant.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative mb-3 cursor-pointer hover:scale-105 transition-transform duration-200"
                    >
                      <div className="absolute inset-0 rounded-2xl blur-xl scale-125" style={{ backgroundColor: isLightPrimary ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }} />
                      <img 
                        src={assistant.logo_url} 
                        alt={`${assistant.business_name} logo`}
                        className="relative w-24 h-24 rounded-2xl object-contain p-1 shadow-2xl"
                        style={{ 
                          backgroundColor: isLightPrimary ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                          borderWidth: '4px',
                          borderStyle: 'solid',
                          borderColor: isLightPrimary ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)'
                        }}
                      />
                      {/* External link icon overlay */}
                      <div className="absolute -bottom-1 -right-1 bg-white/90 rounded-full p-1.5 shadow-lg opacity-70 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3 text-gray-600" />
                      </div>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
                    <p>Visit Website ↗</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="relative mb-3">
                  <div className="absolute inset-0 rounded-2xl blur-xl scale-125" style={{ backgroundColor: isLightPrimary ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }} />
                  <img 
                    src={assistant.logo_url} 
                    alt={`${assistant.business_name} logo`}
                    className="relative w-24 h-24 rounded-2xl object-contain p-1 shadow-2xl"
                    style={{ 
                      backgroundColor: isLightPrimary ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                      borderWidth: '4px',
                      borderStyle: 'solid',
                      borderColor: isLightPrimary ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)'
                    }}
                  />
                </div>
              )
            ) : (
              <div className="relative mb-3">
                <div className="absolute inset-0 rounded-full blur-xl scale-150" style={{ backgroundColor: isLightPrimary ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }} />
                <div className="relative w-20 h-20 rounded-full shadow-2xl flex items-center justify-center" style={{
                  backgroundColor: isLightPrimary ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
                  borderWidth: '4px',
                  borderStyle: 'solid',
                  borderColor: isLightPrimary ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)'
                }}>
                  <Bot className="w-10 h-10" style={{ color: headerTextColor }} />
                </div>
              </div>
            )}
            
            <h2 className="text-xl font-bold tracking-tight" style={{ color: headerTextColor, textShadow: isLightPrimary ? 'none' : '0 1px 3px rgba(0,0,0,0.3)' }}>{assistant.business_name}</h2>
            <p className="text-sm font-medium" style={{ color: headerSubTextColor, opacity: 0.9, textShadow: isLightPrimary ? 'none' : '0 1px 2px rgba(0,0,0,0.2)' }}>Voice Web</p>
            
            {/* Visit website link - visible hint */}
            {assistant.website_url && (
              <a 
                href={assistant.website_url.startsWith('http') ? assistant.website_url : `https://${assistant.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 text-xs opacity-80 hover:opacity-100 underline underline-offset-2 flex items-center gap-1 transition-opacity"
                style={{ color: headerTextColor }}
              >
                Visit our website
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            
            {/* Multi-language indicator badge */}
            <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm" style={{
              backgroundColor: isLightPrimary ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: isLightPrimary ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.3)',
              color: headerTextColor
            }}>
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Speak Any Language</span>
            </div>
          </div>
        </div>

        {/* Prominent Voice Section with Branded Mic */}
        <div className="relative z-10 flex flex-col items-center justify-center py-8 px-4">
          <div className="relative">
            {/* Glow effect behind mic */}
            <div 
              className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${
                isConnected && isListening ? 'scale-150 opacity-60' : 'scale-100 opacity-30'
              }`}
              style={{ backgroundColor: primaryColor }}
            />
            
            {/* Voice Button with Branded Mic Icon */}
             <VoiceButtonWithConsent
               onVoiceStart={toggleVoiceConversation}
               disabled={isLoading}
               assistantName={assistant.business_name}
                assistantId={assistant.id}
                skipConsent={isDashboardPreview}
               className={`relative w-28 h-28 rounded-full transition-all duration-300 shadow-2xl border-4 ${
                isConnected && isListening 
                  ? 'scale-110 animate-pulse border-white/50' 
                  : 'hover:scale-105 border-white/30'
              }`}
            >
              <div 
                className="absolute inset-0 rounded-full flex flex-col items-center justify-center"
                style={{
                  backgroundColor: isConnected && isListening ? primaryColor : `${primaryColor}ee`,
                  color: textColor
                }}
              >
                <BrandedMicIcon 
                  size={36} 
                  showText={true}
                  animationSpeed={isConnected && isListening ? 8 : 15}
                  className="text-current"
                  micClassName={`text-current ${isConnected && isListening ? 'animate-pulse' : ''}`}
                />
              </div>
            </VoiceButtonWithConsent>
          </div>
          
          {/* Voice Status Text */}
          <div className="mt-6 text-center">
            <p className={`text-lg font-semibold transition-colors ${
              isConnected && isListening ? 'text-primary' : 'text-foreground'
            }`}>
              {isConnected && isListening ? '🎤 Listening...' : 'Tap to Talk'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isConnected && isListening 
                ? 'Speak now, I\'m listening' 
                : 'Start a voice conversation'}
            </p>
          </div>
        </div>

        {/* Enhanced Voice Status Indicator */}
        {isConnected && (
          <div className={`relative z-10 mx-4 mb-4 rounded-xl p-3 flex items-center justify-center gap-3 text-sm transition-all duration-300 backdrop-blur-sm ${
            conversationState === 'user_speaking' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300' :
            conversationState === 'user_transcribing' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300' :
            conversationState === 'ai_responding' ? 'bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300' :
            isListening ? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300' :
            'bg-muted/50 border border-border text-muted-foreground'
          }`}>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    conversationState === 'user_speaking' ? 'bg-blue-500 animate-pulse' :
                    conversationState === 'user_transcribing' ? 'bg-amber-500 animate-bounce' :
                    conversationState === 'ai_responding' ? 'bg-purple-500 animate-pulse' :
                    isListening ? 'bg-green-500 animate-pulse' :
                    'bg-muted-foreground/50'
                  }`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="font-medium">
              {conversationState === 'user_speaking' ? 'Speaking... Keep talking' :
               conversationState === 'user_transcribing' ? 'Transcribing your speech...' :
               conversationState === 'ai_responding' ? 'AI is responding...' :
               isListening ? 'Listening... Speak now' :
               'Voice conversation ready'}
            </span>
          </div>
        )}

        {/* End Session Button - Privacy Control */}
        {isConnected && (
          <div className="relative z-10 mx-4 mb-2">
            <Button
              onClick={() => {
                disconnectVoice();
                toast({
                  title: "Voice Session Ended",
                  description: "Microphone access has been released.",
                });
              }}
              variant="outline"
              size="sm"
              className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 dark:hover:border-red-700"
            >
              <MicOff className="w-4 h-4" />
              End Voice Session
            </Button>
          </div>
        )}

        {/* Messages with Enhanced Styling */}
        <ScrollArea className="relative z-10 flex-1 px-4" style={{ backgroundColor: assistant?.widget_background_color || undefined }}>
          <div className="space-y-4 py-2">
            {messages.map((message, index) => (
              <MessageBubble 
                key={index}
                message={transformMessage(message, index)}
                userBubbleColor={assistant?.widget_user_bubble_color}
                aiBubbleColor={assistant?.widget_ai_bubble_color}
                userTextColor={assistant?.widget_text_color}
              />
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Bot className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div className="bg-muted/80 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Enhanced Input Section */}
        <div
          className="relative z-10 border-t bg-background/80 backdrop-blur-sm p-4"
          style={{ borderTopColor: assistant?.widget_border_color || undefined }}
        >
          <div className="flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Or type your message..."
              className="flex-1 h-12 rounded-xl border-2 border-border/50 focus:border-primary/50 transition-colors"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
              className="h-12 w-12 rounded-xl shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* WhatsApp Modal */}
        {showWhatsAppModal && (
          <WhatsAppModal
            isOpen={showWhatsAppModal}
            onClose={() => setShowWhatsAppModal(false)}
            whatsappUrl={whatsAppUrl}
            businessName={assistant?.business_name || 'Business'}
          />
        )}
      </div>
    );
  }

  // Voice-only mode for widget - uses custom branding
  if (isVoiceMode && isEmbedded && !isChatMode) {
    const primaryColor = assistant.widget_primary_color || '#6366f1';
    const textColor = assistant.widget_text_color || '#ffffff';
    const bgStyle = assistant.logo_url
      ? { 
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${assistant.logo_url})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' as const 
        }
      : { 
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` 
        };
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 relative" style={bgStyle}>
        {/* 24-Hour Trial Expired Overlay */}
        <AssistantTrialExpiredOverlay 
          createdAt={assistant.created_at}
          businessName={assistant.business_name}
          is_trial={assistant.is_trial}
          trial_expires_at={assistant.trial_expires_at}
        />
        <div className="text-center mb-8" style={{ color: textColor }}>
          {assistant.logo_url && (
            <img 
              src={assistant.logo_url} 
              alt={`${assistant.business_name} logo`}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-2 border-white/20"
            />
          )}
          <h2 className="text-lg font-semibold mb-2">{assistant.business_name}</h2>
          <p className="text-sm opacity-90 mb-1">Voice Assistant</p>
          <p className="text-xs opacity-80">Click the microphone to start talking</p>
        </div>
        {/* Voice interface integrated into chat */}
        <div className="mt-6 flex flex-col items-center gap-2" style={{ color: textColor }}>
          {isAISpeaking && (
            <div className="flex items-center gap-2 text-xs">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>AI Speaking...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat-only mode for widget
  if (isEmbedded && isChatMode) {
    return (
      <div
        className="h-full flex flex-col bg-background relative"
        style={{ backgroundColor: assistant?.widget_background_color || undefined }}
      >
        {/* 24-Hour Trial Expired Overlay */}
        <AssistantTrialExpiredOverlay 
          createdAt={assistant.created_at}
          businessName={assistant.business_name}
          is_trial={assistant.is_trial}
          trial_expires_at={assistant.trial_expires_at}
        />
        {/* Embedded Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Enhanced Header with prominent voice button for embedded chat */}
          <div
            className="p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5"
            style={{
              borderBottomColor: assistant?.widget_border_color || undefined,
              background: assistant?.widget_primary_color
                ? (assistant?.widget_gradient_enabled !== false
                    ? `linear-gradient(135deg, ${assistant.widget_primary_color}, ${assistant.widget_accent_color || assistant.widget_primary_color}dd)`
                    : assistant.widget_primary_color)
                : undefined,
              color: assistant?.widget_text_color || undefined,
            }}
          >
            <div className="flex flex-col items-center gap-3">
               <VoiceButtonWithConsent
                 onVoiceStart={toggleVoiceConversation}
                 disabled={isLoading}
                 assistantName={assistant.business_name}
                  assistantId={assistant.id}
                  skipConsent={isDashboardPreview}
                 className={`w-16 h-16 rounded-full transition-all duration-300 relative overflow-hidden flex items-center justify-center ${
                  isConnected
                    ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30' 
                    : 'bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:scale-105'
                }
                ${speechDetected ? 'animate-pulse' : ''}`}
              >
                <Mic className={`w-6 h-6 relative z-10`} />
                {isConnected && speechDetected && (
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30" />
                )}
              </VoiceButtonWithConsent>
              <p className="text-sm text-foreground font-medium mt-2">Tap to speak</p>
              
              {isConnected && isListening && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <span>Listening...</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" style={{ backgroundColor: assistant?.widget_background_color || undefined }}>
            <div className="space-y-3">
               {messages.map((message, index) => (
                 <MessageBubble 
                   key={index}
                   message={transformMessage(message, index)}
                   userBubbleColor={assistant?.widget_user_bubble_color}
                   aiBubbleColor={assistant?.widget_ai_bubble_color}
                   userTextColor={assistant?.widget_text_color}
                 />
               ))}

              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input - Text-only with voice emphasis */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message (or use voice above)..."
                className="flex-1 text-sm"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                size="sm"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-2">
              Voice-first assistant • Use the microphone above for best experience
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging for chat widget state
  console.log('Preview mode state:', {
    isEmbedded,
    isChatMode,
    isPreviewMode,
    showChatWidget,
    shouldShowChat: ((isEmbedded && isChatMode) || (!isEmbedded && showChatWidget)),
    shouldShowFloatingMic: ((!isEmbedded || isPreviewMode) && !showChatWidget),
    currentURL: window.location.href
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* 24-Hour Trial Expired Overlay */}
      <AssistantTrialExpiredOverlay 
        createdAt={assistant.created_at}
        businessName={assistant.business_name}
        is_trial={assistant.is_trial}
        trial_expires_at={assistant.trial_expires_at}
      />
      
      {/* 24-Hour Trial Timer - Fixed position */}
      <div className="fixed top-4 left-4 z-40">
        <AssistantTrialTimer createdAt={assistant.created_at} variant="full" is_trial={assistant.is_trial} trial_expires_at={assistant.trial_expires_at} />
      </div>
      
      {/* PWA Install Button */}
      <div className="fixed top-4 right-4 z-50">
        <PWAInstallButton />
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {assistant.business_name} Assistant
            </h1>
            <p className="text-muted-foreground mb-4">
              {assistant.business_name} AI Assistant
            </p>
            
            <div className="flex items-center justify-center gap-2">
              {knowledgeBaseData && (
                <Button
                  variant={showKnowledgeBase ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowKnowledgeBase(!showKnowledgeBase)}
                  className="gap-2"
                >
                  <Globe className="w-4 h-4" />
                  {showKnowledgeBase ? 'Hide Website Preview' : 'Show Website Preview'}
                </Button>
              )}
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  clearPreviewStorage();
                  toast({
                    title: "Session Cleared",
                    description: "Preview data has been reset.",
                  });
                  window.location.reload();
                }}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Session
              </Button>
            </div>
          </div>

          {/* Floating Mic Button for Preview Mode - Uses custom branding */}
          {(!isEmbedded || isPreviewMode) && !showChatWidget && (
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3 animate-fade-in">
              {/* Promotional text - uses custom colors */}
              <div 
                className="px-4 py-2 rounded-full text-sm font-medium shadow-lg border backdrop-blur-sm animate-scale-in"
                style={{
                  background: `linear-gradient(to right, ${assistant.widget_primary_color || 'hsl(var(--primary))'}, ${assistant.widget_accent_color || assistant.widget_primary_color || 'hsl(var(--primary))'})`,
                  color: assistant.widget_text_color || 'hsl(var(--primary-foreground))',
                  borderColor: `${assistant.widget_primary_color || 'hsl(var(--primary))'}33`
                }}
              >
                Skip the scrolling, Just <span className="font-bold text-yellow-300">"TALK"</span> to me
              </div>
              
              {/* Voice button with custom branding */}
              <button
                onClick={() => {
                  console.log('Floating mic button clicked, opening chat widget');
                  setShowChatWidget(true);
                }}
                className="w-16 h-16 rounded-full shadow-xl border-2 backdrop-blur-sm transition-all duration-300 hover:scale-110 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${assistant.widget_primary_color || 'hsl(var(--primary))'}, ${assistant.widget_accent_color || assistant.widget_primary_color || 'hsl(var(--primary))'}cc)`,
                  color: assistant.widget_text_color || 'hsl(var(--primary-foreground))',
                  borderColor: `${assistant.widget_primary_color || 'hsl(var(--primary))'}33`
                }}
              >
                {assistant.logo_url ? (
                  <img 
                    src={assistant.logo_url} 
                    alt={`${assistant.business_name} logo`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            </div>
          )}

          <div className={`flex gap-6 ${knowledgeBaseData && showKnowledgeBase ? 'h-[1400px]' : ''}`}>
            {/* Knowledge Base Preview */}
            {knowledgeBaseData && showKnowledgeBase && (
              <div className="w-1/2">
                <Card className="h-full">
                  <KnowledgeBasePreview
                    knowledgeBase={knowledgeBaseData}
                    businessName={assistant.business_name}
                    onPageChange={setCurrentKBPage}
                  />
                </Card>
              </div>
            )}

          {/* Chat Interface - Only show when embedded with chat mode OR when showChatWidget is explicitly true */}
            {((isEmbedded && isChatMode) || (!isEmbedded && showChatWidget)) && (
              <>
                {/* Minimized Widget View - Uses custom branding */}
                {isWidgetMinimized && !isEmbedded && (
                  <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
                    <Card 
                      className="shadow-2xl border-2 cursor-pointer hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: assistant.widget_primary_color || 'hsl(var(--primary))',
                        color: assistant.widget_text_color || 'hsl(var(--primary-foreground))',
                        borderColor: `${assistant.widget_primary_color || 'hsl(var(--primary))'}33`
                      }}
                      onClick={() => setIsWidgetMinimized(false)}
                    >
                      <div className="p-4 flex items-center gap-3 min-w-[200px]">
                        {assistant.logo_url ? (
                          <img 
                            src={assistant.logo_url} 
                            alt={`${assistant.business_name} logo`}
                            className="w-10 h-10 rounded-full object-cover bg-white/10"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Bot className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{assistant.business_name}</p>
                          <p className="text-xs opacity-80">Click to expand</p>
                        </div>
                        <ChevronUp className="w-5 h-5" />
                      </div>
                    </Card>
                  </div>
                )}

                {/* Full Chat Widget - Hide when minimized */}
                {!isWidgetMinimized && (
              <div className={`${knowledgeBaseData && showKnowledgeBase ? 'w-1/2' : 'max-w-4xl mx-auto w-full'}`}>
                <Card className="bg-glass border-glass backdrop-blur-md">
                  <div className="h-[1400px] flex flex-col">
                     {/* Enhanced Header with close button */}
                     {!isEmbedded && (
                        <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">Voice & Chat Assistant</h3>
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Live
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log('Minimizing chat widget');
                                  setIsWidgetMinimized(true);
                                }}
                                className="hover:bg-primary/10"
                                title="Minimize widget"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log('Closing chat widget, returning to floating mic');
                                  setShowChatWidget(false);
                                  setIsWidgetMinimized(false);
                                }}
                                className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Close widget"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        </div>
                     )}
                    
                    {/* Voice Interface - This handles AI chat and function calls */}
                    <div className="flex-1">
                      <SimplifiedVoiceInterface 
                        assistantId={assistantId || ''} 
                        embedded={true}
                        showChatButton={false}
                      />
                    </div>
                  </div>
                 </Card>
               </div>
                )}
              </>
             )}

          {/* Assistant Info - Show when chat widget is visible or when embedded with chat */}
          {((isEmbedded && isChatMode) || (!isEmbedded && showChatWidget)) && (!knowledgeBaseData || !showKnowledgeBase) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <h3 className="font-semibold text-sm text-muted-foreground">Voice Type</h3>
                <p className="capitalize">{assistant.voice_type}</p>
              </Card>
              <Card className="p-4 text-center">
                <h3 className="font-semibold text-sm text-muted-foreground">Tone</h3>
                <p className="capitalize">{assistant.tone}</p>
              </Card>
              <Card className="p-4 text-center">
                <h3 className="font-semibold text-sm text-muted-foreground">Status</h3>
                <p className="text-green-600">Live Preview</p>
              </Card>
            </div>
           )}
         </div>
       </div>
     </div>
     
     {/* Booking Confirmation Modal - Page level for voice interactions */}
     {bookingConfirmationModal && (
       <BookingConfirmationModal
         isOpen={bookingConfirmationModal.isOpen}
         onClose={() => {
           console.log('📅 Preview: Closing booking confirmation modal');
           setBookingConfirmationModal(null);
           conversationMemory.hideBookingConfirmation();
         }}
         bookingDetails={bookingConfirmationModal.details}
         success={true}
       />
     )}
     
     {/* Custom branded footer */}
     <SimplifiedFooter logoUrl={assistant?.logo_url} businessName={assistant?.business_name} />
     </div>
   );
 };

export default Preview;
