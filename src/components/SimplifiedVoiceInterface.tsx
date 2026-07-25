import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, MessageCircle, X, Send, Volume2, Phone, PhoneCall, Copy, Info, Minimize2, Maximize2, Globe, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { MessageBubble } from './ui/message-bubble';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { RealtimeChat } from '@/utils/RealtimeChat';
import { VoiceButtonWithConsent } from './VoiceButtonWithConsent';
import { WhatsAppConfirmationModal } from './WhatsAppConfirmationModal';
import { BookingConfirmationModal } from './BookingConfirmationModal';
import { BookingModal } from './BookingModal';
import { BookingInformationModal } from './BookingInformationModal';
import { SupportTicketModal } from './SupportTicketModal';
import { PrivacyInputModal } from './PrivacyInputModal';
import { detectSensitiveData, removeSensitiveData } from '@/utils/sensitiveDataDetector';
import { conversationMemory } from '@/utils/ConversationMemory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TextToSpeech } from '@/utils/TextToSpeech';
import { captureBookingFieldFromText } from '@/utils/bookingFieldCapture';
import { BrandedMicIcon } from './ui/branded-mic-icon';
import { trackLinkClick } from '@/utils/linkClickTracker';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  source: 'voice' | 'text';
  isTranscribing?: boolean;
}

interface SendTextMessageOptions {
  displayText?: string;
  rawText?: string;
  metadata?: {
    sensitiveField?: 'email' | 'phone' | 'name';
    wasRedacted?: boolean;
    [key: string]: unknown;
  };
}

interface SimplifiedVoiceInterfaceProps {
  assistantId: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  showChatButton?: boolean;
  embedded?: boolean;
}

export const SimplifiedVoiceInterface: React.FC<SimplifiedVoiceInterfaceProps> = ({ 
  assistantId,
  onSpeakingChange,
  showChatButton = false,
  embedded = false 
}) => {
  console.log('🎯 SimplifiedVoiceInterface rendered with assistantId:', assistantId);
  
  const [isOpen, setIsOpen] = useState(false);
  const [showChat, setShowChat] = useState(true); // Show chat by default to display transcripts
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const initialContext = conversationMemory.getCurrentContext();
  const initialPrivacy = conversationMemory.getPrivacySettings();

  // Modal states
  const [whatsAppModal, setWhatsAppModal] = useState({
    isOpen: false,
    whatsappUrl: '',
    businessName: ''
  });
  
  const [bookingReviewModal, setBookingReviewModal] = useState({
    isOpen: false,
    bookingDetails: {} as Record<string, any>,
    isLoading: false,
  });
  
  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    bookingDetails: {} as Record<string, any>,
    success: false,
    isLoading: false,
    source: 'voice' as 'voice' | 'chat'
  });

  const [bookingInfoModal, setBookingInfoModal] = useState({
    isOpen: false
  });

  const [supportTicketModal, setSupportTicketModal] = useState({
    isOpen: false
  });

  const [pendingBooking, setPendingBooking] = useState(initialContext.pendingBooking || {});
  const [shouldOfferManualBooking, setShouldOfferManualBooking] = useState<boolean>(
    Boolean(
      Object.values(initialContext.pendingBooking || {}).some(value =>
        typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
      ) || initialPrivacy.requestedManualInput
    )
  );
  const hasInitialized = useRef<boolean>(false);
  const manualInputRequestedRef = useRef<boolean>(initialPrivacy.requestedManualInput === true);
  const bookingConfirmationShownRef = useRef<boolean>(false);
  const persistentMicRef = useRef<boolean>(false);
  const connectionSessionIdRef = useRef<string | null>(null); // Part 5: Track connection session
  const savedBookingCount = Object.values(pendingBooking || {}).filter(value =>
    typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
  ).length;

  const [privacyModal, setPrivacyModal] = useState<{
    isOpen: boolean;
    fieldType: 'email' | 'phone';
    currentValue: string;
    pendingMessage: string;
  }>({
    isOpen: false,
    fieldType: 'email',
    currentValue: '',
    pendingMessage: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = conversationMemory.subscribe((state) => {
      const nextPending = state.context.pendingBooking || {};

      if (Object.keys(nextPending).length > 0 && conversationMemory.isBookingStale()) {
        console.warn('SimplifiedVoiceInterface: Clearing stale booking info before updating UI');
        conversationMemory.clearBookingInfo('voice');
        setPendingBooking({});
        setShouldOfferManualBooking(false);
        bookingConfirmationShownRef.current = false;
        return;
      }

      setPendingBooking(nextPending);

      const hasDetails = Object.values(nextPending).some(value =>
        typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
      );
      const manualRequested = state.privacy.requestedManualInput === true;
      const collectingBooking = state.context.collectingInfo === 'booking';

      setShouldOfferManualBooking(hasDetails || manualRequested || collectingBooking);

      if (manualRequested && !manualInputRequestedRef.current) {
        setBookingInfoModal(prev => ({ ...prev, isOpen: true }));
      }

      manualInputRequestedRef.current = manualRequested;

      // REMOVED AUTO-TRIGGER: Let the AI handle the booking confirmation flow properly
      // The AI will explicitly call conversationMemory.showBookingConfirmation() when ready
      // This prevents premature booking confirmations without user validation
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = conversationMemory.subscribeToBookingEvents((event) => {
      console.log('🎯 ===== BOOKING EVENT RECEIVED IN SIMPLIFIED VOICE =====');
      console.log('🎯 Event type:', event.type);
      console.log('🎯 Event data:', JSON.stringify(event.data, null, 2));
      console.log('🎯 Event source:', event.source);
      
      // Show REVIEW modal first for user to edit/confirm
      if (event.type === 'show_confirmation') {
        console.log('🎯 ===== SHOW_CONFIRMATION EVENT RECEIVED =====');
        console.log('🎯 Processing show_confirmation event...');
        const context = conversationMemory.getCurrentContext();
        console.log('🎯 Current context:', JSON.stringify(context, null, 2));
        
        // Normalize field names to handle variations (name->userName, email->userEmail, etc.)
        const normalizeBookingData = (data: any) => {
          if (!data) return {};
          return {
            userName: data.userName || data.name,
            userEmail: data.userEmail || data.email,
            userPhone: data.userPhone || data.phone,
            preferredDate: data.preferredDate || data.date,
            preferredTime: data.preferredTime || data.time,
            serviceType: data.serviceType || data.service,
            ...data // Keep any additional fields
          };
        };
        
        const mergedDetails = normalizeBookingData({
          ...(context.pendingBooking || {}),
          ...(event.data || {})
        });
        
        console.log('🎯 Normalized booking details:', JSON.stringify(mergedDetails, null, 2));
        console.log('🎯 Merged booking details:', JSON.stringify(mergedDetails, null, 2));
        console.log('🎯 Opening REVIEW modal for user to edit/confirm');
        console.log('🎯 Setting bookingReviewModal.isOpen to TRUE');
        
        // Update state directly - React batches updates automatically
        setBookingReviewModal({
          isOpen: true,
          bookingDetails: mergedDetails,
          isLoading: false
        });
        
        console.log('🎯 ===== BOOKING REVIEW MODAL STATE UPDATED =====');
        console.log('🎯 bookingReviewModal should now be:', { isOpen: true, hasDetails: Object.keys(mergedDetails).length > 0 });
      }
      
      setBookingModal(prev => {
        switch (event.type) {
          case 'hide_confirmation':
            return {
              ...prev,
              isOpen: false,
              isLoading: false
            };
          case 'loading_changed':
            return {
              ...prev,
              isLoading: Boolean(event.data?.isLoading)
            };
          case 'data_updated':
            return {
              ...prev,
              bookingDetails: {
                ...prev.bookingDetails,
                ...(event.data || {})
              }
            };
          default:
            return prev;
        }
      });
    });

    return unsubscribe;
  }, []);

  // Debug: Log booking review modal state changes for diagnostics
  useEffect(() => {
    console.log('🎯 BOOKING REVIEW MODAL STATE CHANGED:', {
      isOpen: bookingReviewModal.isOpen,
      hasDetails: Object.keys(bookingReviewModal.bookingDetails).length > 0,
      isLoading: bookingReviewModal.isLoading
    });
  }, [bookingReviewModal.isOpen, bookingReviewModal.isLoading]);

  // When booking modal opens: cut mic only so the AI can finish its acknowledgement,
  // then fully mute once the AI is done speaking.
  useEffect(() => {
    if (bookingReviewModal.isOpen) {
      console.log('🔇 Booking modal opened — mic cut, AI audio stays live for acknowledgement');
      if (realtimeChatRef.current) {
        realtimeChatRef.current.pauseMicOnly();
        setIsListening(false);
      }
    }
    // Per architecture: do NOT auto-reconnect when modal closes — user must tap mic
  }, [bookingReviewModal.isOpen]);

  const handleManualBookingSubmit = (info: Record<string, any>) => {
    conversationMemory.updateBookingInfo(info, 'chat');
    conversationMemory.showBookingConfirmation(info, 'chat');
  };

  const handleBookingConfirm = async (details: any) => {
    console.log('📋 Booking confirmed from review modal:', details);
    
    try {
      setBookingReviewModal(prev => ({ ...prev, isLoading: true }));
      
      // Validate required fields
      const email = details.userEmail || details.email;
      const date = details.preferredDate || details.date;
      
      if (!email) {
        toast({
          title: "Email Required",
          description: "Please provide an email address for booking confirmation",
          variant: "destructive"
        });
        setBookingReviewModal(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (!date) {
        toast({
          title: "Date Required",
          description: "Please provide a preferred date for your booking",
          variant: "destructive"
        });
        setBookingReviewModal(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Update phase to submitting
      conversationMemory.setContext({ 
        conversationPhase: 'submitting' 
      });
      
      // Submit booking via supabase function with FLAT structure
      const { data, error } = await supabase.functions.invoke('enhanced-booking', {
        body: { 
          assistantId,
          userEmail: email,
          userName: details.userName || details.name,
          userPhone: details.userPhone || details.phone,
          preferredDate: date,
          preferredTime: details.preferredTime || details.time,
          serviceType: details.serviceType || details.service,
          message: details.message
        }
      });

      // Close review modal
      setBookingReviewModal({ isOpen: false, bookingDetails: {}, isLoading: false });

      if (error) {
        console.error('❌ Booking submission failed:', error);
        conversationMemory.setContext({ 
          conversationPhase: 'collecting' 
        });
        throw error;
      }

      console.log('✅ Booking successful:', data);
      
      // Update phase to complete
      conversationMemory.setContext({ 
        conversationPhase: 'complete' 
      });
      
      // Clear booking info from memory
      conversationMemory.clearBookingInfo('voice');

      // Show success confirmation modal with review prompt
      setBookingModal({
        isOpen: true,
        bookingDetails: { ...details, confirmationId: data?.confirmationId },
        success: true,
        isLoading: false,
        source: 'voice'
      });

      toast({
        title: "Booking Confirmed!",
        description: "Your appointment has been successfully scheduled.",
      });
    } catch (error: any) {
      console.error('❌ Booking error:', error);
      setBookingReviewModal(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Booking Failed",
        description: error?.message || "There was an error processing your booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Realtime chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isExternallyMuted, setIsExternallyMuted] = useState(false); // STEP 5: Track external mute state
  const realtimeChatRef = useRef<RealtimeChat | null>(null);
  const sessionIdRef = useRef<string>(`realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  // bookingConfirmationShownRef is declared earlier with other refs
  const ttsRef = useRef<TextToSpeech | null>(null);
  const [assistantVoice, setAssistantVoice] = useState<string>('ballad');
  const [assistantTone, setAssistantTone] = useState<string>('professional');
  const [assistantLanguage, setAssistantLanguage] = useState<string>('en');
  const [assistantWebsiteUrl, setAssistantWebsiteUrl] = useState<string>('');
  const [bookingSilenceFix, setBookingSilenceFix] = useState<boolean>(false);

  // Helper function to get voice display name
  const getVoiceDisplayName = (voice: string): string => {
    const voiceMap: Record<string, string> = {
      'alloy': 'Alloy',
      'echo': 'Echo',
      'fable': 'Fable',
      'onyx': 'Onyx',
      'nova': 'Nova',
      'shimmer': 'Shimmer'
    };
    return voiceMap[voice] || voice;
  };

  // Fetch assistant settings on mount - voice accent is hardcoded at creation
  useEffect(() => {
    const fetchAssistantSettings = async () => {
      const { data, error } = await supabase
        .from('assistants')
        .select('voice_type, voice_accent, business_name, tone, language, website_url')
        .eq('id', assistantId)
        .maybeSingle();

      if (error) {
        console.warn('Assistant settings lookup skipped:', error.message);
        return;
      }

      if (!data) {
        // No row visible to this client (likely RLS / public widget) — fall back
        // to defaults silently instead of erroring on every render.
        return;
      }
      console.log('🎤 Loaded assistant settings:', {
        voice: data.voice_type,
        accent: data.voice_accent,
        tone: data.tone,
        language: data.language,
        websiteUrl: data.website_url
      });

      const voiceAccent = data.voice_accent || data.voice_type || 'ballad';
      setAssistantVoice(voiceAccent);
      if (data.tone) setAssistantTone(data.tone);
      if (data.language) setAssistantLanguage(data.language);
      if (data.website_url) setAssistantWebsiteUrl(data.website_url);
      // Booking silence fix is always active globally (no DB column needed)
      setBookingSilenceFix(true);
    };
    
    fetchAssistantSettings();
  }, [assistantId]);

  // OPTIMIZATION: Pre-request microphone permission for instant activation
  useEffect(() => {
    if (!embedded && !hasInitialized.current) {
      const preCacheMicrophone = async () => {
        try {
          console.log('🎤 Pre-requesting microphone permission for faster activation...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Immediately stop the stream - we just wanted to cache the permission
          stream.getTracks().forEach(track => track.stop());
          console.log('✅ Microphone permission cached - future activations will be instant');
        } catch (error) {
          console.log('ℹ️ Microphone permission not granted yet (will request when needed):', error);
          // This is OK - we'll request again when actually connecting
        }
      };
      
      hasInitialized.current = true;
      preCacheMicrophone();
    }
  }, [embedded]);

  // Auto-start voice session when voiceEnabled=true URL parameter is present
  useEffect(() => {
    if (!embedded) return;
    
    // Check if voice should be enabled from URL
    const params = new URLSearchParams(window.location.search);
    const voiceEnabled = params.get('voiceEnabled') === 'true';
    const voiceDisabled = params.get('voiceDisabled') === 'true';
    
    console.log('🎤 Voice URL params:', { voiceEnabled, voiceDisabled });
    
    // Auto-open voice session if enabled and not disabled
    if (voiceEnabled && !voiceDisabled && !hasInitialized.current) {
      console.log('🎤 Auto-starting voice session from URL parameter');
      
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        setIsOpen(true);
        console.log('✅ Voice interface auto-opened');
      }, 100);
      
      hasInitialized.current = true;
    }
  }, [embedded]);

  // Listen for widget state changes and mute/unmute messages
  useEffect(() => {
    const handleWidgetMessages = (event: MessageEvent) => {
      // ✅ SECURITY FIX: Accept messages from any origin since the widget is embedded everywhere
      // Instead, validate the message structure and assistantId
      
      // Validate message structure
      if (!event.data || typeof event.data !== 'object') {
        return; // Ignore invalid messages
      }
      
      const { type, assistantId: messageAssistantId, ...data } = event.data;
      
      // Only process messages for THIS assistant
      if (messageAssistantId && messageAssistantId !== assistantId) {
        console.log(`🔒 Ignoring message for different assistant: ${messageAssistantId}`);
        return;
      }
      
      // Log the message for debugging
      console.log(`📨 Received message from ${event.origin}:`, { type, data });
      
      switch (type) {
        case 'widget_force_mute':
          // 🚨 HIGH PRIORITY: Force mute command - executes IMMEDIATELY
          const forceMuted = Boolean(data.muted);
          console.log('🚨 FORCE MUTE COMMAND:', forceMuted);
          
          // 1. Stop ALL audio immediately
          const audioElements = document.querySelectorAll('audio');
          audioElements.forEach(audio => {
            audio.pause();
            audio.muted = true;
            audio.volume = 0;
            audio.currentTime = 0;
            console.log('🔇 Force stopped audio element');
          });
          
          // 1b. STOP TEXT-TO-SPEECH if active
          if (window.speechSynthesis?.speaking) {
            window.speechSynthesis.cancel();
            console.log('🔇 Cancelled active speech synthesis');
          }
          
          // 2. Stop microphone immediately
          if (realtimeChatRef.current) {
            if (forceMuted) {
              realtimeChatRef.current.pauseListening();
              console.log('🔇 Force paused listening');
            } else {
              realtimeChatRef.current.resumeListening();
              console.log('🎤 Force resumed listening');
            }
          }
          
          // 3. Update state
          setIsExternallyMuted(forceMuted);
          setIsListening(!forceMuted && isConnected);
          setIsSpeaking(false); // Always stop speaking on force mute
          
          console.log('🚨 FORCE MUTE COMPLETE:', forceMuted ? 'MUTED' : 'UNMUTED');
          break;
        
        case 'widget_minimize':
          console.log('📦 Widget minimized - voice continues');
          toast({
            title: "Chat minimized",
            description: "Voice still active",
            duration: 2000,
          });
          // Keep voice active - DO NOT call disconnect()
          break;
          
        case 'widget_expand':
          console.log('📤 Widget expanded');
          toast({
            title: "Chat expanded",
            duration: 1500,
          });
          break;
          
        case 'talkweb_mute_state':
          const muted = Boolean(data.muted);
          console.log(`🎛️ ========== TALKWEB_MUTE_STATE RECEIVED ==========`);
          console.log(`🎛️ Received talkweb_mute_state message: ${muted}`);
          console.log(`🎛️ Current states - listening: ${isListening} speaking: ${isSpeaking}`);
          
          if (muted) {
            // === MUTE ACTIVATED - IMMEDIATE FORCE STOP ===
            console.log('🔇 STEP 6: MUTING - Stopping all audio immediately');
            
            // 1. Stop ALL audio elements immediately
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
              audio.pause();
              audio.muted = true;
              audio.volume = 0;
              audio.currentTime = 0;
              console.log('🔇 Force stopped audio element');
            });
            
            // 1b. STOP TEXT-TO-SPEECH if active
            if (window.speechSynthesis?.speaking) {
              window.speechSynthesis.cancel();
              console.log('🔇 Cancelled active speech synthesis');
            }
            
            // 2. Stop microphone immediately
            console.log('🔇 Checking realtimeChatRef.current:', !!realtimeChatRef.current);
            if (realtimeChatRef.current) {
              console.log('🔇 RealtimeChat exists, calling methods...');
              console.log('🔇 pauseListening type:', typeof realtimeChatRef.current.pauseListening);
              console.log('🔇 setExternalMuteState type:', typeof realtimeChatRef.current.setExternalMuteState);
              
              try {
                realtimeChatRef.current.pauseListening();
                console.log('🔇 ✅ pauseListening() called successfully');
              } catch (error) {
                console.error('🔇 ❌ Error calling pauseListening():', error);
              }
              
              try {
                realtimeChatRef.current.setExternalMuteState(true);
                console.log('🔇 ✅ setExternalMuteState(true) called successfully');
              } catch (error) {
                console.error('🔇 ❌ Error calling setExternalMuteState():', error);
              }
            } else {
              console.error('🔇 ❌ realtimeChatRef.current is null/undefined!');
            }
            
            // 3. Update all state flags
            setIsExternallyMuted(true);
            setIsListening(false);
            setIsSpeaking(false);
            
            toast({
              title: "🔇 Voice muted",
              description: "All audio and microphone stopped",
              duration: 2000,
            });
            
            console.log('🔇 ========== MUTE COMPLETE ==========')
            
          } else {
            // === MUTE DEACTIVATED ===
            console.log('🎤 STEP 6: UNMUTING - Restoring audio functionality');
            
            // Clear external mute flag
            setIsExternallyMuted(false);
            setIsSpeaking(false);
            
            if (realtimeChatRef.current) {
              realtimeChatRef.current.setExternalMuteState(false);
            }
            
            // Check if should resume
            const shouldResume = isConnected && realtimeChatRef.current;
            console.log(`🎤 Should resume: ${shouldResume}`);
            console.log(`🎤 RealtimeChat exists: ${!!realtimeChatRef.current}`);
            console.log(`🎤 Is connected: ${isConnected}`);
            
            if (shouldResume) {
              setTimeout(() => {
                if (realtimeChatRef.current && !isExternallyMuted) {
                  realtimeChatRef.current.resumeListening();
                  setIsListening(true);
                  console.log('🎤 Auto-resumed listening after unmute');
                }
              }, 100);
            }
            
            toast({
              title: "🎤 Voice unmuted",
              description: shouldResume ? "Voice conversation resumed" : "Voice now enabled",
              duration: 2000,
            });
            
            console.log('🎤 ========== UNMUTE COMPLETE ==========');
          }
          break;
        
        case 'widget_mute':
          // Legacy message for mute (same as talkweb_mute_state with muted=true)
          console.log('🔇 Received legacy widget_mute message');
          
          setIsExternallyMuted(true);
          setIsListening(false);
          setIsSpeaking(false);
          
          if (realtimeChatRef.current) {
            realtimeChatRef.current.setExternalMuteState(true);
          }
          
          toast({
            title: "🔇 Voice muted",
            description: "Microphone and AI responses disabled",
            duration: 2000,
          });
          break;
          
        case 'widget_unmute':
          // Legacy message for unmute (same as talkweb_mute_state with muted=false)
          console.log('🎤 Received legacy widget_unmute message');
          
          setIsExternallyMuted(false);
          
          if (realtimeChatRef.current) {
            realtimeChatRef.current.setExternalMuteState(false);
            realtimeChatRef.current.resumeListening();
            if (isConnected) {
              setIsListening(true);
            }
          }
          
          toast({
            title: "🎤 Voice unmuted",
            description: "Microphone enabled",
            duration: 2000,
          });
          break;
          
        case 'close_widget':
          console.log('❌ Widget closed - ending session');
          if (realtimeChatRef.current) {
            // Notify widget that voice session ended
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'voice_session_ended'
              }, '*');
              console.log('📢 Sent voice_session_ended to parent window (close)');
            }
            
            realtimeChatRef.current.disconnect();
          }
          break;
      }
    };
    
    window.addEventListener('message', handleWidgetMessages);
    
    return () => {
      window.removeEventListener('message', handleWidgetMessages);
    };
  }, [toast, isSpeaking, isConnected]); // STEP 5: Added isConnected dependency

  const generateVoiceInstructions = useCallback((): string => {
    const toneMap: Record<string, string> = {
      professional: 'professional and clear',
      friendly: 'warm and friendly',
      enthusiastic: 'enthusiastic and energetic',
      calm: 'calm and reassuring',
      authoritative: 'confident and authoritative',
      empathetic: 'empathetic and supportive',
      playful: 'playful and upbeat'
    };

    const accentMap: Record<string, string> = {
      fable: 'British English accent',
      alloy: 'neutral American accent',
      echo: 'American accent',
      nova: 'warm North American accent',
      onyx: 'baritone American accent',
      shimmer: 'soft North American accent',
      coral: 'Australian-inspired accent',
      sage: 'clear professional accent',
      ash: 'conversational accent',
      ballad: 'expressive storyteller accent',
      verse: 'smooth narrative accent'
    };

    const languageMap: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese'
    };

    const resolvedTone = toneMap[assistantTone] || 'natural and conversational';
    const resolvedAccent = accentMap[assistantVoice] || '';
    const normalizedLanguage = (assistantLanguage || '').toLowerCase();
    const baseLanguage = normalizedLanguage.split('-')[0];
    const resolvedLanguage = languageMap[normalizedLanguage] || languageMap[baseLanguage];

    const parts: string[] = [
      `Speak with a ${resolvedTone} tone.`,
    ];

    if (resolvedAccent) {
      parts.push(`Use a ${resolvedAccent}.`);
    } else {
      parts.push('Keep your pronunciation clear and accessible.');
    }

    if (resolvedLanguage) {
      parts.push(`Deliver the response in ${resolvedLanguage}.`);
    }

    parts.push('Maintain natural pacing and sound like a helpful human assistant.');

    return parts.join(' ');
  }, [assistantTone, assistantVoice, assistantLanguage]);

  // Initialize Realtime Chat
  useEffect(() => {
    if (!isOpen) return;
    
    const initRealtimeChat = async () => {
      try {
        console.log('🎯 Initializing Realtime Chat...');
        setIsConnecting(true);
        setConnectionError(null);
        
        // PART 5: Generate new session ID and reset deduplication state
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('🆔 New connection session ID:', newSessionId);
        connectionSessionIdRef.current = newSessionId;
        
        // Initialize TTS
        if (!ttsRef.current) {
          ttsRef.current = new TextToSpeech((isSpeaking) => {
            console.log('🔊 TTS speaking state:', isSpeaking);
            onSpeakingChange?.(isSpeaking);
          });
        }
        
        const chat = new RealtimeChat(assistantId, {
          onUserSpeechStart: () => {
            console.log('🎤 User started speaking');
            // STEP 5: Don't set listening if externally muted
            if (!isExternallyMuted) {
              setIsListening(true);
            } else {
              console.log('🔇 STEP 5: Ignoring speech start - externally muted');
            }
          },
          onUserSpeechStop: () => {
            console.log('🛑 User stopped speaking');
            // STEP 5: Only update listening if not externally muted
            if (!isExternallyMuted) {
              setIsListening(false);
            }
          },
          onBookingReady: (bookingData: any) => {
            console.log('🎯 ===== DIRECT BOOKING READY CALLBACK =====');
            console.log('🎯 Booking data received:', bookingData);
            console.log('🎯 Force opening booking review modal...');
            setBookingReviewModal({
              isOpen: true,
              bookingDetails: bookingData,
              isLoading: false
            });
            console.log('🎯 ===== BOOKING REVIEW MODAL OPENED DIRECTLY =====');
          },
          onUserTranscript: async (text: string, isFinal: boolean) => {
            // LAYER 3 FIX: Block user transcript when muted
            if (isExternallyMuted) {
              console.log('🔇 BLOCKED: User transcript (muted)');
              return;
            }
            
            console.log('👤 User transcript received:', { text, isFinal, length: text.length });
            
            if (!text || text.trim().length === 0) {
              console.warn('⚠️ Empty transcript received, ignoring');
              return;
            }
            
            if (isFinal) {
              console.log('✅ FINAL user transcript - displaying message');
              
              // Check for "show form" commands
              const lowerText = text.toLowerCase().trim();
              const showFormCommands = ['show form', 'type it', 'secure input', 'use form', 'enter manually'];
              const isShowFormCommand = showFormCommands.some(cmd => lowerText.includes(cmd));
              
              if (isShowFormCommand) {
                console.log('🔒 Show form command detected:', text);
                
                // Determine which field to collect based on conversation context
                const context = conversationMemory.getCurrentContext();
                const nextField = context.nextField as 'email' | 'phone' | undefined;
                
                if (nextField) {
                  // Open privacy modal for the next field
                  setPrivacyModal({
                    isOpen: true,
                    fieldType: nextField,
                    currentValue: '',
                    pendingMessage: text
                  });
                  
                  toast({
                    title: "Secure Input",
                    description: `Please enter your ${nextField} securely below.`,
                  });
                  
                  // Acknowledge via voice
                  const acknowledgment = `Perfect! I've opened a secure form for your ${nextField}. Please enter it below.`;
                  if (ttsRef.current) {
                    await ttsRef.current.speak(acknowledgment, assistantVoice);
                  }
                  
                  // Add message to conversation
                  conversationMemory.addMessage('assistant', acknowledgment, 'voice');
                  setMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    text: acknowledgment,
                    sender: 'assistant',
                    timestamp: new Date(),
                    source: 'voice'
                  }]);
                  
                  return; // Don't process this as a regular message
                }
              }
              
              // Add final user message to UI
              const userMsg: Message = {
                id: `user-${Date.now()}`,
                text: text.trim(),
                sender: 'user',
                timestamp: new Date(),
                source: 'voice',
                isTranscribing: false
              };
              setMessages(prev => {
                const filtered = prev.filter(m => !m.isTranscribing);
                return [...filtered, userMsg];
              });
              conversationMemory.addMessage('user', text, 'voice');
              captureBookingFieldFromText(text, { method: 'voice' });
              
              // Realtime API will automatically respond via onAssistantTranscript callback
              console.log('⏳ Waiting for Realtime API response...');
              
            }
          },
          onAssistantTranscript: (text: string, isDone: boolean) => {
            // LAYER 3 FIX: Block assistant transcript when muted
            if (isExternallyMuted) {
              console.log('🔇 BLOCKED: Assistant transcript (muted)');
              return;
            }
            
            console.log('🤖 Assistant transcript received:', { text, isDone, length: text?.length });
            
            // Check for navigation messages
            if (text?.startsWith('🧭 NAVIGATE:')) {
              const navData = text.replace('🧭 NAVIGATE:', '');
              const [targetUrl, openInNewTab, navType, exists] = navData.split('|');
              
              console.log('🧭 Navigation requested from voice:', {
                url: targetUrl,
                openInNewTab: openInNewTab === 'true',
                type: navType,
                exists: exists === 'true'
              });
              
              // Warn if URL might not exist
              if (exists === 'false') {
                console.warn('⚠️ WARNING: Navigating to URL not confirmed in scraped data');
                toast({
                  title: "Navigation Warning",
                  description: "This page might not exist on the website.",
                  variant: "destructive",
                  duration: 3000
                });
              }
              
              // Post navigation message to parent window (widget will handle it)
              if (window.parent !== window) {
                // Track voice navigation click
                trackLinkClick({
                  assistantId,
                  clickedUrl: targetUrl,
                  linkLabel: targetUrl,
                  source: 'voice_navigation',
                });
                
                window.parent.postMessage({
                  type: 'VOICE_NAVIGATE',
                  url: targetUrl,
                  source: 'voice-assistant',
                  openInNewTab: openInNewTab === 'true',
                  navType: navType
                }, '*');
                console.log('📤 Posted VOICE_NAVIGATE to parent window (new tab)');
              }
              
              // Show user feedback
              toast({
                title: "🧭 Navigating...",
                description: `Taking you to ${targetUrl}`,
                duration: 2000,
              });
              
              // Don't add navigation control messages to chat transcript
              return;
            }
            
            // Display transcript when done - audio already provided by WebRTC
            if (isDone && text && text.trim()) {
              console.log('✅ Adding assistant message to UI:', text.substring(0, 50));
              const assistantMsg: Message = {
                id: `assistant-${Date.now()}`,
                text: text.trim(),
                sender: 'assistant',
                timestamp: new Date(),
                source: 'voice'
              };
              
              setMessages(prev => [...prev, assistantMsg]);
              conversationMemory.addMessage('assistant', text, 'voice');

              // Fallback booking detection for voice responses
              const bookingConfirmationPhrases = [
                'review the details',
                'confirm booking',
                'details on the screen',
                "say 'confirm booking'",
                'click the confirm button',
                'review your booking',
                'check the details',
                'confirm your appointment',
                'prepare your booking'
              ];

              const lowerText = text.toLowerCase();
              const hasBookingConfirmation = bookingConfirmationPhrases.some(phrase => 
                lowerText.includes(phrase)
              );

              if (hasBookingConfirmation) {
                console.log('[SimplifiedVoice] 🎯 Booking confirmation phrase detected in voice response');
                
                // CRITICAL FIX: Read directly from conversationMemory instead of stale state
                const currentBookingData = conversationMemory.getCurrentContext().pendingBooking || {};
                console.log('[SimplifiedVoice] 📋 Current booking data from memory:', currentBookingData);
                
                // Check if we have minimum required booking data
                const hasMinimumData = currentBookingData.userName && 
                                     currentBookingData.userEmail && 
                                     currentBookingData.preferredDate;
                
                console.log('[SimplifiedVoice] ✅ Has minimum data?', hasMinimumData, {
                  userName: !!currentBookingData.userName,
                  userEmail: !!currentBookingData.userEmail,
                  preferredDate: !!currentBookingData.preferredDate
                });
                
                if (hasMinimumData) {
                  console.log('[SimplifiedVoice] 🎉 Complete booking data found, showing confirmation modal NOW');
                  conversationMemory.showBookingConfirmation(currentBookingData, 'voice');
                } else {
                  console.log('[SimplifiedVoice] ❌ Incomplete booking data, not showing modal. Missing:', {
                    userName: !currentBookingData.userName,
                    userEmail: !currentBookingData.userEmail,
                    preferredDate: !currentBookingData.preferredDate
                  });
                }
              }
            } else {
              console.log('⚠️ Skipping assistant transcript:', { isDone, hasText: !!text, trimmed: text?.trim() });
            }
          },
          onAssistantAudioStart: () => {
            // LAYER 3 FIX: Block assistant audio start when muted
            if (isExternallyMuted) {
              console.log('🔇 BLOCKED: Assistant audio start (muted)');
              return;
            }
            console.log('🔊 Assistant started speaking');
            setIsSpeaking(true);
          },
          onAssistantAudioEnd: () => {
            // LAYER 3 FIX: Block assistant audio end when muted
            if (isExternallyMuted) {
              console.log('🔇 BLOCKED: Assistant audio end (muted)');
              return;
            }
            console.log('🔇 Assistant stopped speaking');
            setIsSpeaking(false);
          },
          onError: (error: string) => {
            console.error('❌ Realtime error:', error);
            toast({
              title: "Voice Error",
              description: error,
              variant: "destructive"
            });
          }
        }, assistantVoice, assistantWebsiteUrl || window.location.href, isExternallyMuted, bookingSilenceFix);

        await chat.init();
        realtimeChatRef.current = chat;
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        
        // Notify widget that voice session started
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'voice_session_started',
            assistantId
          }, '*');
          console.log('📢 Sent voice_session_started to parent window');
          
          // Request current mute state from widget to sync immediately
          window.parent.postMessage({
            type: 'request_mute_state',
            assistantId
          }, '*');
          console.log('📢 Requested current mute state from widget');
        }
        
        // Microphone will auto-enable after 200ms via RealtimeChat
        // Update UI state to reflect this
        setTimeout(() => {
          // STEP 5: Only set listening if not externally muted
          if (!isExternallyMuted) {
            setIsListening(true);
            console.log('✅ Realtime Chat initialized - microphone auto-enabled and listening');
          } else {
            console.log('🔇 STEP 5: Skipping auto-listen - externally muted');
          }
        }, 300); // Slight delay after the 200ms in RealtimeChat
        
        toast({
          title: "Voice Ready",
          description: `Listening with ${getVoiceDisplayName(assistantVoice)} accent`,
        });
      } catch (error) {
        console.error('❌ Failed to initialize Realtime Chat:', error);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Provide user-friendly error messages
        let errorMessage = 'Unable to start voice assistant';
        let errorDescription = 'Please check your internet connection and try again';
        
        if (error instanceof Error) {
          // Handle module loading errors specifically
          if (error.message.includes('dynamically imported module') || 
              error.message.includes('Failed to fetch') ||
              error.message.includes('RealtimeAudio')) {
            errorMessage = 'Voice Service Loading Error';
            errorDescription = 'We\'re having trouble loading the voice system. Please refresh the page and try again.';
          } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
            errorMessage = 'Connection Timeout';
            errorDescription = 'The connection took too long. Please check your internet and try again.';
          } else if (error.message.includes('network') || error.message.includes('offline')) {
            errorMessage = 'Network Error';
            errorDescription = 'Please check your internet connection and try again.';
          } else {
            errorDescription = error.message.length > 100 
              ? 'A technical error occurred. Please refresh and try again.' 
              : error.message;
          }
          
          setConnectionError(error.message);
        } else {
          setConnectionError('Unknown error occurred');
        }
        
        toast({
          title: errorMessage,
          description: errorDescription,
          variant: "destructive",
          duration: 8000,
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                toast({ title: "Refreshing...", description: "Reloading the page" });
                setTimeout(() => window.location.reload(), 500);
              }}
            >
              Refresh Page
            </Button>
          )
        });
      }
    };

    if (isOpen) {
      initRealtimeChat();
    }

    return () => {
      ttsRef.current?.stop();
      if (realtimeChatRef.current) {
        // Notify widget that voice session ended
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'voice_session_ended'
          }, '*');
          console.log('📢 Sent voice_session_ended to parent window (cleanup)');
        }
        
        realtimeChatRef.current.disconnect();
        realtimeChatRef.current = null;
      }
      setIsConnected(false);
      setIsListening(false);
      persistentMicRef.current = false;
    };
  }, [assistantId, isOpen, toast]);

  useEffect(() => {
    if (!isConnected || isExternallyMuted) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!persistentMicRef.current) {
        return;
      }

      const chat = realtimeChatRef.current;
      if (!chat) {
        return;
      }

      if (!chat.isMicrophoneActive()) {
        console.warn('⚠️ Microphone unexpectedly paused - forcing resume');
        chat.resumeListening();
        setIsListening(true);
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isConnected, isExternallyMuted]);

  const startListening = () => {
    if (realtimeChatRef.current && isConnected) {
      // STEP 5: Don't start listening if externally muted
      if (isExternallyMuted) {
        console.log('🔇 STEP 5: Cannot start listening - externally muted');
        toast({
          title: "Voice Muted",
          description: "Unmute to start listening",
          variant: "default"
        });
        return;
      }
      
      // Stop any ongoing TTS when user starts speaking
      ttsRef.current?.stop();
      console.log('🛑 Stopped TTS - user is speaking');

      realtimeChatRef.current.resumeListening();
      persistentMicRef.current = true;
      setIsListening(true);
      console.log('🎤 Starting to listen');
      toast({
        title: "Listening",
        description: "Speak now - I'm listening!",
      });
    }
  };

  const retryConnection = () => {
    console.log('🔄 Retrying connection...');
    setConnectionError(null);
    setIsOpen(false);
    setTimeout(() => setIsOpen(true), 100);
  };

  const stopListening = (options: { disconnect?: boolean } = {}) => {
    console.log('🎤 Stopping listening - IMMEDIATE');

    // 1. IMMEDIATELY update state - triggers button color change to blue
    setIsListening(false);
    persistentMicRef.current = false;
    
    // 2. Stop TTS playback immediately if speaking
    if (ttsRef.current) {
      ttsRef.current.stop();
      console.log('🛑 Stopped TTS playback');
    }
    
    // 3. Show immediate user feedback
    toast({
      title: "Stopped",
      description: "Microphone off",
    });
    
    if (realtimeChatRef.current) {
      realtimeChatRef.current.pauseListening();
      console.log('📡 RealtimeChat microphone paused');
    }

    if (options.disconnect && realtimeChatRef.current) {
      realtimeChatRef.current.disconnect();
      realtimeChatRef.current = null;
      setIsConnected(false);
      console.log('📡 RealtimeChat session disconnected');
    }
  };

  const clearMessages = () => {
    setMessages([]);
    conversationMemory.clearMessages();
  };

  const disconnectVoiceSession = () => {
    persistentMicRef.current = false;
    if (realtimeChatRef.current) {
      // Notify widget that voice session ended
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'voice_session_ended'
        }, '*');
        console.log('📢 Sent voice_session_ended to parent window (disconnect)');
      }
      
      realtimeChatRef.current.disconnect();
      realtimeChatRef.current = null;
    }
    setIsConnected(false);
  };

  const handleClose = () => {
    stopListening({ disconnect: true });
    disconnectVoiceSession();
    setIsOpen(false);
    setIsMinimized(false);
  };

  const toggleVoiceSession = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    try {
      if (!isConnected && realtimeChatRef.current === null) {
        const chat = new RealtimeChat(assistantId, {
          onUserTranscript: (text: string, isFinal: boolean) => {
            console.log('📝 User transcript received:', { text, isFinal });
            if (isFinal) {
              setMessages(prev => {
                const filtered = prev.filter(m => !m.isTranscribing);
                return [
                  ...filtered,
                  {
                    id: `user-${Date.now()}`,
                    text,
                    sender: 'user' as const,
                    timestamp: new Date(),
                    source: 'voice' as const
                  }
                ];
              });
              conversationMemory.addMessage('user', text, 'voice');
            }
          },
          onAssistantTranscript: (text: string) => {
            console.log('🤖 Assistant transcript:', text);
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.sender === 'assistant' && lastMsg.source === 'voice') {
                return [...prev.slice(0, -1), { ...lastMsg, text }];
              }
              return [
                ...prev,
                {
                  id: `assistant-${Date.now()}`,
                  text,
                  sender: 'assistant' as const,
                  timestamp: new Date(),
                  source: 'voice' as const
                }
              ];
            });
            conversationMemory.addMessage('assistant', text, 'voice');

            // Removed duplicate booking detection - handled in main initRealtimeChat at lines 849-895
          },
          onAssistantAudioStart: () => {
            console.log('🔊 Assistant audio started');
            setIsSpeaking(true);
          },
          onAssistantAudioEnd: () => {
            console.log('🔇 Assistant audio ended');
            setIsSpeaking(false);
          },
          onError: (error: string) => {
            console.error('❌ Realtime error:', error);
            toast({
              title: "Voice Error",
              description: error,
              variant: "destructive"
            });
          },
          onBookingReady: (bookingData: any) => {
            console.log('🎯 ===== DIRECT BOOKING READY CALLBACK (TOGGLE) =====');
            console.log('🎯 Booking data received:', bookingData);
            console.log('🎯 Force opening booking review modal...');
            setBookingReviewModal({
              isOpen: true,
              bookingDetails: bookingData,
              isLoading: false
            });
            console.log('🎯 ===== BOOKING REVIEW MODAL OPENED DIRECTLY =====');
          }
        }, assistantVoice, assistantWebsiteUrl || window.location.href, isExternallyMuted, bookingSilenceFix);
        await chat.init();
        realtimeChatRef.current = chat;
        setIsConnected(true);
      } else if (realtimeChatRef.current && !isConnected) {
        await realtimeChatRef.current.init();
        setIsConnected(true);
      }

      startListening();
    } catch (error) {
      console.error('❌ Failed to toggle voice session:', error);
      toast({
        title: "Voice Error",
        description: "We couldn't start the microphone. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sendTextMessage = async (text: string, options?: SendTextMessageOptions) => {
    if (!text.trim() && !options?.rawText?.trim()) return;

    const displayText = options?.displayText ?? text;
    const rawText = options?.rawText ?? text;

    console.log('=== TEXT MESSAGE SEND START ===');
    console.log('💬 Display text:', displayText);
    console.log('💬 Raw text:', rawText);
    console.log('💬 Metadata:', options?.metadata);

    // Add user message (sanitized display if provided)
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: displayText,
      sender: 'user',
      timestamp: new Date(),
      source: 'text'
    };
    setMessages(prev => [...prev, userMsg]);
    
    // Add to conversation memory
    console.log('📝 Adding message to conversationMemory...');
    conversationMemory.addMessage('user', rawText, 'chat', {
      ...options?.metadata,
      redacted: displayText !== rawText,
      displayed_text: displayText
    });
    console.log('✅ Message added to conversationMemory');

    const textMethod: 'text' | 'secure' = options?.metadata?.wasRedacted ? 'secure' : 'text';
    captureBookingFieldFromText(rawText, {
      method: textMethod,
      hint: options?.metadata?.sensitiveField as 'name' | 'email' | 'phone' | undefined
    });

    setIsProcessing(true);

    try {
      // Get conversation history
      console.log('📚 Fetching conversation history...');
      const conversationHistory = conversationMemory.getConversationHistory();
      console.log('📚 Conversation history retrieved:', {
        type: typeof conversationHistory,
        isArray: Array.isArray(conversationHistory),
        length: Array.isArray(conversationHistory) ? conversationHistory.length : 0,
        sample: Array.isArray(conversationHistory) 
          ? conversationHistory.slice(-2)
          : 'not an array'
      });
      
      const currentContext = conversationMemory.getCurrentContext();
      const bookingState = conversationMemory.getBookingState();
      
      console.log('📋 Current context:', currentContext);
      console.log('📋 Booking state:', bookingState);

      // Prepare request payload
      const requestPayload = {
        assistantId,
        message: rawText,
        sessionId: sessionIdRef.current,
        conversationHistory,
        bookingContext: {
          pendingBooking: currentContext.pendingBooking || null,
          collectingInfo: currentContext.collectingInfo || null,
          nextField: currentContext.nextField || null,
          conversationPhase: currentContext.conversationPhase || null,
          bookingState
        }
      };
      
      console.log('🚀 Sending request to ai-chat with payload:', {
        ...requestPayload,
        conversationHistoryLength: Array.isArray(conversationHistory) ? conversationHistory.length : 'N/A'
      });

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: requestPayload
      });
      
      console.log('📥 Response from ai-chat:', { data, error });

      // Handle 429 conversation limit exceeded
      if (error) {
        console.log('📥 Error details:', error);
        
        // Try to parse error context which may contain the response body
        let errorData = data;
        if (error.context && typeof error.context === 'object') {
          errorData = error.context;
        }
        
        // Check if this is a 429 limit error
        const isLimitError = 
          error.message?.includes('CONVERSATION_LIMIT_EXCEEDED') || 
          errorData?.error === 'CONVERSATION_LIMIT_EXCEEDED' ||
          errorData?.upgradeRequired === true;
          
        if (isLimitError) {
          console.log('🚫 Conversation limit exceeded - notifying widget');
          console.log('📥 Error data:', errorData);
          
          // Extract fallback contacts from error response
          const fallbackContacts = errorData?.fallbackContacts || null;
          const message = errorData?.message || error.message || 'This assistant is currently unavailable due to high usage.';
          
          // Notify parent widget to show fallback contact modal
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'conversation_limit_reached',
              fallbackContacts,
              message
            }, '*');
          }
          
          return; // Don't throw, widget will handle UI
        }
        
        const userFacingMessage =
          errorData?.message ||
          errorData?.error ||
          error.details ||
          error.message ||
          'The assistant is temporarily unavailable. Please try again later.';

        toast({
          title: "Assistant Unavailable",
          description: userFacingMessage,
          variant: "destructive",
        });

        const errorMsg: Message = {
          id: `assistant-error-${Date.now()}`,
          text: userFacingMessage,
          sender: 'assistant',
          timestamp: new Date(),
          source: 'text'
        };
        setMessages(prev => [...prev, errorMsg]);
        conversationMemory.addMessage('assistant', userFacingMessage, 'chat', {
          error: true,
          source: 'secure_text'
        });

        return;
      }

      let assistantResponse = data.response || "I'm not quite sure about that one — could you rephrase or share a bit more? I can also share contact options if that's easier.";
      
      // NEW: Handle booking data returned from AI
      if (data.requiresConfirmation && data.bookingData) {
        console.log('📋 Booking data received from AI chat:', data.bookingData);
        console.log('📋 Storing in conversationMemory to trigger modal...');
        
        // Update conversationMemory with complete booking info
        conversationMemory.updateBookingInfo({
          userName: data.bookingData.userName,
          userEmail: data.bookingData.userEmail,
          userPhone: data.bookingData.userPhone,
          service: data.bookingData.service,
          preferredDate: data.bookingData.preferredDate,
          preferredTime: data.bookingData.preferredTime,
          message: data.bookingData.message
        }, 'chat');
        
        console.log('✅ Booking info updated in memory - modal should trigger automatically');
        console.log('📋 Current booking state:', conversationMemory.getCurrentContext().pendingBooking);
        
        // The useEffect hook (lines 129-146) will now detect all fields are complete
        // and automatically call conversationMemory.showBookingConfirmation()
      }
      
      // AUTO-DETECT: If AI is asking for booking confirmation, show the modal
      const confirmationPhrases = [
        'please review these details',
        'please confirm',
        'let me know if everything looks correct',
        'review these details',
        'confirm the details',
        'is this information correct',
        'let me know if'
      ];
      
      const isAskingForConfirmation = confirmationPhrases.some(phrase => 
        assistantResponse.toLowerCase().includes(phrase)
      );
      
      if (isAskingForConfirmation) {
        console.log('🎯 AI is asking for booking confirmation - checking if we have complete booking data...');
        const context = conversationMemory.getCurrentContext();
        const booking: any = context.pendingBooking || {};
        
        const hasName = !!(booking.userName || booking.name);
        const hasEmail = !!(booking.userEmail || booking.email);
        const hasPhone = !!(booking.userPhone || booking.phone);
        const hasDate = !!(booking.preferredDate || booking.date);
        const hasTime = !!(booking.preferredTime || booking.time);
        const hasPurpose = !!(booking.serviceType || booking.service || booking.purpose);
        
        console.log('📋 Booking completeness check:', { hasName, hasEmail, hasPhone, hasDate, hasTime, hasPurpose });
        console.log('📋 Full booking data:', JSON.stringify(booking, null, 2));
        
        if (hasName && hasEmail && hasDate) { // Minimum required fields
          console.log('✅ Essential booking fields present - triggering modal automatically!');
          conversationMemory.showBookingConfirmation(booking, 'chat');
        } else {
          console.log('⚠️ Essential booking data incomplete - not showing modal yet');
        }
      }
      
      // DEBUG: Log full response data structure
      console.log('🔍 Full AI response data:', JSON.stringify(data, null, 2));
      console.log('🔍 functionCall exists?', !!data.functionCall);
      console.log('🔍 functionCall value:', data.functionCall);
      
      // Handle function calls from AI (phone, WhatsApp, booking modal, etc.)
      if (data.functionCall) {
        console.log('📞 Function call received:', data.functionCall);
        console.log('📞 Function name:', data.functionCall.name);
        console.log('📞 Function success:', data.functionCall.success);
        console.log('📞 Phone number:', data.functionCall.phone_number);
        
        // Handle phone call function - CHECK THIS FIRST
        if (data.functionCall.name === 'call_business') {
          console.log('✅ call_business detected!');
          console.log('✅ Success check:', data.functionCall.success);
          console.log('✅ Phone number check:', data.functionCall.phone_number);
          
          if (data.functionCall.phone_number) {
            console.log('🎯 Creating phone message with number:', data.functionCall.phone_number);
            
            // Format phone number message for display
            const phoneMessage: Message = {
              id: `phone-${Date.now()}`,
              text: `📞 CALL_NOW:${data.functionCall.phone_number}:${assistantId}`,
              sender: 'assistant',
              timestamp: new Date(),
              source: 'text'
            };
            
            console.log('🎯 Phone message created:', phoneMessage);
            setMessages(prev => {
              console.log('🎯 Adding phone message to messages array');
              return [...prev, phoneMessage];
            });
            
            // Also add the AI's response text if present
            if (assistantResponse && assistantResponse.trim()) {
              const textMsg: Message = {
                id: `assistant-${Date.now()}`,
                text: assistantResponse,
                sender: 'assistant',
                timestamp: new Date(),
                source: 'text'
              };
              setMessages(prev => [...prev, textMsg]);
            }
            
            conversationMemory.addMessage('assistant', assistantResponse, 'chat');
            console.log('✅ Phone call handling complete - exiting early');
            return; // Exit early since we handled the phone call
          } else {
            console.error('❌ call_business detected but no phone_number!');
          }
        }
        
        // Handle booking modal trigger
        if (data.functionCall.name === 'trigger_booking_modal' && data.functionCall.success && data.functionCall.bookingData) {
          console.log('📋 Trigger booking modal function call:', data.functionCall.bookingData);
          
          // Update conversation memory with complete booking data
          conversationMemory.updateBookingInfo(data.functionCall.bookingData, 'chat');
          
          // Show the booking confirmation modal immediately
          conversationMemory.showBookingConfirmation(data.functionCall.bookingData, 'chat');
          
          // Add the AI's response message
          if (assistantResponse && assistantResponse.trim()) {
            const assistantMsg: Message = {
              id: `assistant-${Date.now()}`,
              text: assistantResponse,
              sender: 'assistant',
              timestamp: new Date(),
              source: 'text'
            };
            setMessages(prev => [...prev, assistantMsg]);
            conversationMemory.addMessage('assistant', assistantResponse, 'chat');
          }
          
          return; // Exit early since we're showing the modal
        }

        // Handle capture_lead — just append the friendly confirmation message
        if (data.functionCall.name === 'capture_lead') {
          console.log('📨 Lead capture function call:', data.functionCall);
          const leadMsg: Message = {
            id: `assistant-${Date.now()}`,
            text: data.functionCall.message || (data.functionCall.success
              ? "✅ Got it — your details have been sent to the team and they'll reach out shortly."
              : "I had trouble saving your details. Could you share your email one more time?"),
            sender: 'assistant',
            timestamp: new Date(),
            source: 'text',
          };
          setMessages(prev => [...prev, leadMsg]);
          conversationMemory.addMessage('assistant', leadMsg.text, 'chat');
          return;
        }
      }

      // Handle navigation requests from AI
      if (data.navigation && data.navigation.type === 'navigate') {
        const navUrl = data.navigation.url;
        console.log('🧭 Navigation requested from text chat:', navUrl);
        
        // Post navigation message to parent window (widget will handle it)
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'VOICE_NAVIGATE',
            url: navUrl,
            source: 'text-chat',
            openInNewTab: true
          }, '*');
          console.log('📤 Posted VOICE_NAVIGATE to parent window from text (new tab)');
        } else {
          // Not in iframe — open directly in new tab
          const navWindow = window.open(navUrl, '_blank', 'noopener,noreferrer');
          if (!navWindow) {
            toast({
              title: "🔗 Link ready",
              description: `Tap to open: ${navUrl}`,
              duration: 8000,
            });
          }
        }
        
        // Show user feedback
        toast({
          title: "🧭 Navigating...",
          description: `Taking you to ${navUrl}`,
          duration: 2000,
        });
        
        // Override error-looking response text with a positive navigation message
        const currentResponse = data.response || '';
        const isGenericError = currentResponse.includes('I apologize') || currentResponse.includes('encountered an issue') || !currentResponse.trim();
        if (isGenericError) {
          assistantResponse = `Opening [${navUrl}](${navUrl}) in a new tab for you.`;
        }
      }
      
      // Add assistant response for non-function calls
      console.log('📝 Adding regular assistant message (no function call)');
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        text: assistantResponse,
        sender: 'assistant',
        timestamp: new Date(),
        source: 'text'
      };
      setMessages(prev => [...prev, assistantMsg]);
      conversationMemory.addMessage('assistant', assistantResponse, 'chat');

      // CRITICAL: Also send the text message to RealtimeChat if it's connected
      // This ensures voice and text systems share the same context
      if (realtimeChatRef.current && isConnected) {
        console.log('🔄 Syncing text message to RealtimeChat for voice context');
        try {
          const bookingContext = {
            pendingBooking: currentContext.pendingBooking || null,
            collectingInfo: currentContext.collectingInfo || null,
            nextField: currentContext.nextField || null,
            conversationPhase: currentContext.conversationPhase || null,
            bookingState
          };
          await realtimeChatRef.current.sendMessage(rawText, bookingContext, conversationHistory);
          console.log('✅ Text message synced to RealtimeChat');
        } catch (syncError) {
          console.warn('⚠️ Failed to sync text message to RealtimeChat:', syncError);
          // Don't throw - this is not critical for the main flow
        }
      }

      // Speak the response with TTS
      if (ttsRef.current && assistantResponse.trim()) {
        console.log('🔊 Starting TTS for text message response...');
        setIsSpeaking(true);
        try {
          await ttsRef.current.speak(assistantResponse, assistantVoice);
          console.log('✅ TTS completed for text message');
        } catch (ttsError) {
          console.error('❌ TTS error:', ttsError);
        } finally {
          setIsSpeaking(false);
        }
      } else if (!ttsRef.current) {
        console.warn('⚠️ TTS not available');
      }

    } catch (error) {
      console.error('❌ Error sending text message:', error);
      
      // Check if this is a conversation limit error (handled above, shouldn't reach here)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('CONVERSATION_LIMIT_EXCEEDED')) {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Route protection
  const currentPath = window.location.pathname;
  if (!currentPath.includes('/preview')) {
    return null;
  }

  const isEmbedded = embedded || 
                    window.location !== window.parent.location || 
                    window.self !== window.top ||
                    document.referrer !== '' ||
                    window.location.search.includes('embedded=true') ||
                    window.location.search.includes('mode=widget-only');

  if (isEmbedded) {
    return null;
  }

  if (!assistantId || assistantId === 'undefined' || assistantId === 'null') {
    return null;
  }

  // Exclude dashboard routes
  if (currentPath.includes('/dashboard') && !currentPath.includes('/create-assistant')) {
    return null;
  }

  // Notify parent component of speaking state changes
  React.useEffect(() => {
    onSpeakingChange?.(isSpeaking);
  }, [isSpeaking, onSpeakingChange]);

  const handleSendMessage = () => {
    console.log('💬 HandleSendMessage called with:', inputText);
    console.log('💬 Processing state:', isProcessing);
    console.log('💬 Assistant ID in interface:', assistantId);
    
    if (!inputText.trim() || isProcessing) return;
    
    // Check for sensitive data
    const detectedData = detectSensitiveData(inputText);
    
    if (detectedData) {
      console.log('🔒 Detected sensitive data:', detectedData.type);
      
      // Show privacy modal for confirmation
      setPrivacyModal({
        isOpen: true,
        fieldType: detectedData.type,
        currentValue: detectedData.value,
        pendingMessage: inputText
      });
      
      toast({
        title: "Privacy Protection",
        description: `We detected ${detectedData.type === 'email' ? 'an email' : 'a phone number'}. Please confirm it securely.`,
      });
      
      return;
    }
    
    console.log('💬 About to call sendTextMessage...');
    sendTextMessage(inputText);
    setInputText('');
  };

  const handlePrivacySubmit = (value: string) => {
    console.log('🔒 Privacy modal submitted with:', value);
    
    // Update conversation memory with the captured data
    if (privacyModal.fieldType === 'email') {
      conversationMemory.updateBookingInfo({ userEmail: value }, 'chat');
      toast({
        title: "Email Captured",
        description: "Your email has been securely saved for booking.",
      });
    } else if (privacyModal.fieldType === 'phone') {
      conversationMemory.updateBookingInfo({ userPhone: value }, 'chat');
      toast({
        title: "Phone Number Captured",
        description: "Your phone number has been securely saved for booking.",
      });
    }
    
    // Send the original message with redacted sensitive data
    const redactedMessage = removeSensitiveData(privacyModal.pendingMessage, {
      type: privacyModal.fieldType,
      value: privacyModal.currentValue,
      original: privacyModal.pendingMessage
    });

    sendTextMessage(redactedMessage, {
      rawText: privacyModal.pendingMessage,
      metadata: {
        sensitiveField: privacyModal.fieldType,
        wasRedacted: true
      }
    });
    setInputText('');
    setPrivacyModal({
      isOpen: false,
      fieldType: 'email',
      currentValue: '',
      pendingMessage: ''
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <VoiceButtonWithConsent
        onVoiceStart={() => {
          setIsMinimized(false);
          setIsOpen(true);
        }}
        assistantName="Voice Assistant"
        skipConsent={true}
      >
        <span>Start Voice Chat</span>
      </VoiceButtonWithConsent>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-0 right-0 z-50 px-4 sm:px-6">
        <div className="flex justify-center sm:justify-end">
          <Card className="w-full max-w-md sm:w-72 bg-card border-border shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={`w-2 h-2 flex-shrink-0 rounded-full ${
                isConnecting ? 'bg-blue-500 animate-pulse' : 
                isConnected ? (
                  isExternallyMuted ? 'bg-red-500' : // STEP 5: Red when muted
                  isListening ? 'bg-green-500 animate-pulse' : 
                  'bg-amber-500'
                ) : 
                'bg-red-500'
              }`} />
              <span className="truncate text-sm font-medium text-foreground">
                {isConnecting 
                  ? 'Connecting microphone...' 
                  : isConnected 
                    ? (
                      isExternallyMuted 
                        ? `🔇 Muted (${getVoiceDisplayName(assistantVoice)})` // STEP 5: Show muted status
                        : (isListening ? `Listening (${getVoiceDisplayName(assistantVoice)})` : 'Microphone paused')
                    )
                    : connectionError ? 'Connection failed' : 'Voice session inactive'}
              </span>
            </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsMinimized(false);
                    setShowChat(true);
                  }}
                  aria-label="Restore assistant"
                  className="h-9 w-9"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close assistant"
                  className="h-9 w-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {connectionError ? (
                <>
                  <p className="text-sm text-destructive">
                    {connectionError}
                  </p>
                  <Button
                    variant="default"
                    onClick={retryConnection}
                    disabled={isConnecting}
                    className="w-full justify-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    {isConnecting ? 'Connecting...' : 'Retry Connection'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="relative">
                      {/* Outer pulse ring when AI is speaking */}
                      {isSpeaking && (
                        <div className="absolute inset-0 rounded-full animate-pulse">
                          <div 
                            className="w-28 h-28 rounded-full -m-2" 
                            style={{
                              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.1))',
                              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                            }}
                          />
                        </div>
                      )}
                      
                      <button 
                        onClick={toggleVoiceSession}
                        disabled={isProcessing || isConnecting || isExternallyMuted}
                        className="relative rounded-full w-24 h-24 shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center z-10"
                        style={{
                          background: isExternallyMuted
                            ? 'hsl(var(--muted))'
                            : isSpeaking
                              ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.9))'
                              : isListening 
                                ? 'linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.8))'
                                : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                          boxShadow: isSpeaking 
                            ? '0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.3)' 
                            : undefined
                        }}
                        aria-label={isListening ? 'Pause microphone' : 'Start voice'}
                      >
                        {isConnecting ? (
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : isExternallyMuted ? (
                          <MicOff className="w-8 h-8 text-muted-foreground" />
                        ) : (
                          <div className="relative">
                            <div className={isSpeaking ? 'animate-pulse' : ''}>
                              <BrandedMicIcon 
                                size={28}
                                showText={!isListening && !isSpeaking}
                                className="text-white"
                                micClassName="text-white"
                                animationSpeed={isSpeaking ? 8 : 12}
                              />
                            </div>
                            {isListening && !isSpeaking && (
                              <div className="absolute inset-0 animate-ping opacity-75">
                                <div className="w-full h-full rounded-full bg-white/20" />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Inner pulse rings when AI is speaking */}
                        {isSpeaking && (
                          <>
                            <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '1.5s' }} />
                            <div className="absolute inset-0 rounded-full bg-white/5 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                          </>
                        )}
                      </button>
                    </div>
                    
                    <p className="text-sm text-center text-muted-foreground max-w-[200px]">
                      {isExternallyMuted 
                        ? '🔇 Muted by widget'
                        : isSpeaking
                          ? '🔊 AI is speaking...'
                          : isConnecting
                            ? 'Setting up your microphone...'
                            : isConnected
                              ? isListening
                                ? 'Listening... Tap to pause'
                                : 'Tap to resume voice'
                              : 'Tap to start voice'}
                    </p>
                  </div>
                </>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setIsMinimized(false);
                  setShowChat(true);
                }}
                className="w-full"
              >
                Open chat transcript
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 sm:px-8">
      <div className="flex justify-center sm:justify-end">
        <Card className="w-full max-w-md sm:w-96 bg-card border-border shadow-2xl">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border sm:flex-nowrap sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 flex-shrink-0 rounded-full ${
                  isConnecting ? 'bg-blue-500 animate-pulse' : 
                  isConnected ? 'bg-green-500' : 
                  'bg-red-500'
                }`} />
                <span className="truncate text-sm font-medium text-foreground">
                  {isConnecting 
                    ? 'Connecting...' 
                    : isConnected 
                      ? `Voice Assistant (${getVoiceDisplayName(assistantVoice)})` 
                      : connectionError ? 'Connection Failed' : 'Voice Not Available'}
                </span>
              </div>
              {/* Multilingual Badge */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-medium w-fit cursor-help">
                      <Globe className="w-3 h-3" />
                      <span className="hidden sm:inline">Speak Any Language</span>
                      <span className="sm:hidden">Speak Any Language</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">I understand and respond in all languages!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              {showChatButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChat(!showChat)}
                  disabled={!isConnected}
                  aria-label={showChat ? 'Hide transcript' : 'Show transcript'}
                  className="h-9 w-9"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsMinimized(true);
                  setShowChat(false);
                }}
                aria-label="Minimize assistant"
                className="h-9 w-9"
                data-testid="simplified-voice-minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close assistant"
                className="h-9 w-9"
                data-testid="simplified-voice-close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>




        {/* Messages */}
        {showChat && (
          <div className="max-h-80 overflow-y-auto p-4 space-y-3">
            {(() => {
              console.log('🎨 WIDGET DEBUG - Rendering messages:', {
                showChat,
                messageCount: messages.length,
                messages: messages.map(m => ({
                  id: m.id,
                  sender: m.sender,
                  source: m.source,
                  textPreview: m.text.substring(0, 30),
                  isTranscribing: m.isTranscribing
                }))
              });
              return null;
            })()}
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                Start a conversation by speaking or typing
              </p>
            ) : (
              messages.map((message) => {
                // Check if this is a phone number message
                const isPhoneMessage = message.text.startsWith('📞 CALL_NOW:');
                const messageParts = isPhoneMessage ? message.text.replace('📞 CALL_NOW:', '').split(':') : [];
                const phoneNumber = messageParts[0]?.trim() || '';
                const assistantIdFromMessage = messageParts[1] || assistantId;
                const isTranscribing = message.isTranscribing || false;
                
                return isPhoneMessage ? (
                  <div key={message.id} className="flex justify-start mb-4">
                    <div className="max-w-[90%] rounded-xl px-5 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
                      <div className="flex flex-col gap-3">
                        {/* Header with icon */}
                        <div className="flex items-center gap-2 text-blue-700">
                          <Phone className="w-5 h-5" />
                          <span className="text-sm font-semibold">
                            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
                              ? "Tap to call us now"
                              : "Call us at"}
                          </span>
                        </div>
                        
                        {/* Large clickable phone number */}
                        <a 
                          href={`tel:${phoneNumber.replace(/\D/g, '')}`}
                          onClick={async () => {
                            try {
                              const { trackPhoneNumberClicked } = await import('@/utils/phoneCallAnalytics');
                              trackPhoneNumberClicked(assistantIdFromMessage, phoneNumber).catch(console.error);
                            } catch (error) {
                              console.error('Analytics error:', error);
                            }
                          }}
                          className="text-2xl md:text-3xl font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2 group active:scale-95 transition-transform"
                          aria-label={`Call ${phoneNumber}`}
                        >
                          <PhoneCall className="w-6 h-6 md:w-7 md:h-7 group-hover:animate-pulse" />
                          {phoneNumber}
                        </a>
                        
                        {/* Copy button */}
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(phoneNumber.replace(/\D/g, ''));
                              const { trackPhoneNumberCopied } = await import('@/utils/phoneCallAnalytics');
                              trackPhoneNumberCopied(assistantIdFromMessage, phoneNumber).catch(console.error);
                              toast({ 
                                title: "Phone number copied!", 
                                description: "You can now paste it anywhere.",
                                duration: 2000
                              });
                            } catch (error) {
                              console.error('Copy error:', error);
                              toast({ 
                                title: "Copy failed", 
                                description: "Please try selecting and copying manually.",
                                variant: "destructive",
                                duration: 2000
                              });
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100 transition-colors w-fit"
                        >
                          <Copy className="w-3 h-3" />
                          Copy number
                        </button>
                        
                        {/* Device-specific tip */}
                        {!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
                          <p className="text-xs text-gray-600 mt-2 italic flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            💡 This works best on mobile devices for direct calling
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <MessageBubble
                    key={message.id}
                    message={{
                      id: message.id,
                      text: message.text,
                      sender: message.sender,
                      source: message.source
                    }}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Voice Controls - Large Purple Mic Button */}
          {(() => {
            console.log('🎤 RENDERING MIC BUTTON - isEmbedded:', isEmbedded, 'showChat:', showChat);
            return null;
          })()}
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            {connectionError ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-destructive text-center">
                  <p className="font-medium mb-2">Connection Error</p>
                  <p className="text-sm text-muted-foreground mb-4">{connectionError}</p>
                </div>
                <Button
                  variant="default"
                  size="lg"
                  onClick={retryConnection}
                  disabled={isConnecting}
                  className="rounded-full px-8"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Retry Connection'}
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Button
                    variant={isListening ? "destructive" : "default"}
                    size="lg"
                    onClick={toggleVoiceSession}
                    disabled={isProcessing || isConnecting}
                    className="!rounded-full w-32 h-32 bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative z-10 disabled:opacity-50"
                    style={{ borderRadius: '50%' }}
                    aria-label="Voice microphone button"
                  >
                    {isConnecting ? (
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isListening ? (
                      <MicOff className="w-12 h-12 text-white" />
                    ) : (
                      <Mic className="w-12 h-12 text-white" />
                    )}
                  </Button>
                  {/* Green Glow Effect when listening */}
                  {isListening && (
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30" />
                  )}
                  {/* Blue Glow Effect when connecting */}
                  {isConnecting && (
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse opacity-30" />
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground text-center">
                    {isConnecting 
                      ? "Connecting microphone..." 
                      : isListening 
                        ? `Listening (${getVoiceDisplayName(assistantVoice)})` 
                        : "Tap to speak"}
                  </p>
                  {/* Language guidance tooltip */}
                  {!isListening && !isConnecting && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                      <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        I understand all languages!
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Text Input */}
          {showChat && (
            <div className="flex gap-2">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 min-h-0 resize-none"
                rows={1}
                disabled={isProcessing}
                maxLength={500}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isProcessing}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Additional Actions */}
          {shouldOfferManualBooking && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBookingInfoModal(prev => ({ ...prev, isOpen: true }))}
              className="w-full"
            >
              Edit booking details{savedBookingCount > 0 ? ` (${savedBookingCount} saved)` : ''}
            </Button>
          )}

          {messages.length > 0 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="text-xs"
              >
                Clear Conversation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const email = prompt('Enter your email to receive the conversation transcript:');
                  if (email && email.includes('@')) {
                    const transcript = messages.map(m => `${m.sender === 'user' ? 'You' : 'Assistant'}: ${m.text}`).join('\n\n');
                    supabase.functions.invoke('send-conversation-summary', {
                      body: {
                        assistantId,
                        recipientEmail: email,
                        transcript
                      }
                    }).then(({ error }) => {
                      if (error) {
                        toast({ title: 'Failed to send', description: 'Could not send the transcript. Please try again.', variant: 'destructive' });
                      } else {
                        toast({ title: 'Transcript sent!', description: `Conversation history sent to ${email}` });
                      }
                    });
                  } else if (email) {
                    toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
                  }
                }}
                className="text-xs"
              >
                📧 Email Transcript
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <WhatsAppConfirmationModal
        isOpen={whatsAppModal.isOpen}
        onClose={() => setWhatsAppModal(prev => ({ ...prev, isOpen: false }))}
        whatsappUrl={whatsAppModal.whatsappUrl}
        businessName={whatsAppModal.businessName}
      />

      {/* Editable Booking Review Modal */}
      <BookingModal
        isOpen={bookingReviewModal.isOpen}
        onClose={() => setBookingReviewModal({ isOpen: false, bookingDetails: {}, isLoading: false })}
        onConfirm={handleBookingConfirm}
        bookingDetails={{
          userName: bookingReviewModal.bookingDetails.userName || bookingReviewModal.bookingDetails.name || '',
          userEmail: bookingReviewModal.bookingDetails.userEmail || bookingReviewModal.bookingDetails.email || '',
          userPhone: bookingReviewModal.bookingDetails.userPhone || bookingReviewModal.bookingDetails.phone || '',
          preferredDate: bookingReviewModal.bookingDetails.preferredDate || bookingReviewModal.bookingDetails.date || '',
          preferredTime: bookingReviewModal.bookingDetails.preferredTime || bookingReviewModal.bookingDetails.time || '',
          serviceType: bookingReviewModal.bookingDetails.serviceType || bookingReviewModal.bookingDetails.service || bookingReviewModal.bookingDetails.purpose || ''
        }}
        businessName={bookingReviewModal.bookingDetails.businessName || 'Business'}
        isLoading={bookingReviewModal.isLoading}
      />

      {/* Success Confirmation Modal */}
      <BookingConfirmationModal
        isOpen={bookingModal.isOpen}
        onClose={() => {
          setBookingModal(prev => ({ ...prev, isOpen: false }));
          conversationMemory.hideBookingConfirmation();
        }}
        bookingDetails={bookingModal.bookingDetails || {}}
        success={bookingModal.success}
      />

      <BookingInformationModal
        isOpen={bookingInfoModal.isOpen}
        onClose={() => setBookingInfoModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleManualBookingSubmit}
      />

      <SupportTicketModal
        isOpen={supportTicketModal.isOpen}
        onClose={() => setSupportTicketModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={() => {}}
      />

      <PrivacyInputModal
        isOpen={privacyModal.isOpen}
        onClose={() => setPrivacyModal({
          isOpen: false,
          fieldType: 'email',
          currentValue: '',
          pendingMessage: ''
        })}
        fieldType={privacyModal.fieldType}
        onSubmit={handlePrivacySubmit}
        currentValue={privacyModal.currentValue}
      />
    </div>
  </div>
);
};
