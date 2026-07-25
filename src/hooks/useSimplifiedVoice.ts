import { useState, useRef, useCallback, useEffect } from 'react';
import { SimplifiedVoiceRecorder } from '@/utils/SimplifiedVoiceRecorder';
import { TextToSpeech } from '@/utils/TextToSpeech';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { conversationMemory } from '@/utils/ConversationMemory';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;  
  source: 'voice' | 'text';
}

export interface QuickHelpPayload {
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  message?: string;
  urgency?: string;
  category?: string;
  businessName?: string;
}

interface VoiceCallbacks {
  onWhatsAppRedirect?: (url: string, businessName: string) => void;
  onSupportTicket?: (details: QuickHelpPayload) => void;
  onBookingRequest?: (details: any) => void;
}

export const useSimplifiedVoice = (assistantId: string, callbacks?: VoiceCallbacks) => {
  console.log('🎯 useSimplifiedVoice hook initialized with assistantId:', assistantId);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const voiceRecorderRef = useRef<SimplifiedVoiceRecorder | null>(null);
  const textToSpeechRef = useRef<TextToSpeech | null>(null);
  
  // MEMORY SYNC FIX: Create a persistent session ID shared between voice and text
  const sessionIdRef = useRef<string>(`unified-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Sync messages from ConversationMemory
  useEffect(() => {
    const unsubscribe = conversationMemory.subscribe((state) => {
      console.log('📨 ConversationMemory updated:', state.messages.length, 'messages');
      const formattedMessages: Message[] = state.messages.map(msg => ({
        id: `${msg.sender}-${msg.timestamp}`,
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp),
        source: msg.type as 'voice' | 'text'
      }));
      console.log('📨 Setting', formattedMessages.length, 'messages to state');
      console.log('📨 Last 3 messages:', formattedMessages.slice(-3).map(m => `${m.sender}: ${m.text.substring(0, 30)}...`));
      setMessages(formattedMessages);
    });

    return () => unsubscribe();
  }, []);

  // Handle function calls from AI
  const handleFunctionCall = useCallback(async (functionCall: any) => {
    console.log('🔧 Processing function call:', functionCall);
    console.log('🔧 Function call name:', functionCall.name);
    console.log('🔧 Function call data:', JSON.stringify(functionCall, null, 2));

    try {
      switch (functionCall.name) {
        case 'whatsapp_redirect':
          console.log('🔧 WhatsApp redirect triggered');
          if (functionCall.success && functionCall.whatsapp_url) {
            console.log('WhatsApp redirect URL:', functionCall.whatsapp_url);
            if (callbacks?.onWhatsAppRedirect) {
              callbacks.onWhatsAppRedirect(functionCall.whatsapp_url, functionCall.business_name || 'Business');
            } else {
              // Fallback behavior
              const popup = window.open(functionCall.whatsapp_url, '_blank');
              if (!popup || popup.closed) {
                toast({
                  title: "WhatsApp Blocked",
                  description: "Please allow popups and try again.",
                  variant: "destructive"
                });
              } else {
                toast({
                  title: "Opening WhatsApp",
                  description: "Connecting you to WhatsApp for direct communication...",
                });
              }
            }
          } else {
            console.log('🔧 WhatsApp redirect failed:', functionCall.message);
            toast({
              title: "WhatsApp Unavailable",
              description: functionCall.message || "WhatsApp connection is not available at the moment.",
              variant: "destructive"
            });
          }
          break;

        case 'call_business':
          console.log('🔧 Call business triggered - checking business hours');
          
          try {
            // Import utilities
            const { formatPhoneNumber, speakPhoneNumber, isMobileDevice } = await import('@/utils/phoneFormatter');
            const { formatPhoneNumberInternational, speakPhoneNumberInternational } = await import('@/utils/phoneFormatterEnhanced');
            const { trackPhoneNumberDisplayed } = await import('@/utils/phoneCallAnalytics');
            const { getCachedPhone, setCachedPhone } = await import('@/utils/phoneCache');
            const { measureAsync } = await import('@/utils/phonePerformance');
            const { isBusinessOpen, getNextAvailableTime } = await import('@/utils/businessHours');
            
            // Get assistant data to check business hours
            const { data: assistantData } = await supabase
              .from('assistants')
              .select('business_hours, whatsapp_number, whatsapp_message_template')
              .eq('id', assistantId)
              .single();

            // Check if business is open
            const isOpen = assistantData?.business_hours 
              ? isBusinessOpen(assistantData.business_hours) 
              : true;

            if (!isOpen && assistantData?.whatsapp_number) {
              // Business is closed - redirect to WhatsApp
              console.log('🕐 Business closed - redirecting to WhatsApp');
              
              const nextAvailable = getNextAvailableTime(assistantData.business_hours);
              const whatsappMessage = assistantData.whatsapp_message_template || 
                "Hi! I'd like to schedule a callback.";
              
              const whatsappUrl = `https://wa.me/${assistantData.whatsapp_number}?text=${encodeURIComponent(whatsappMessage)}`;
              
              conversationMemory.addMessage(
                'assistant',
                `I'm sorry, we're currently closed. ${nextAvailable}\n\nHowever, you can message us on WhatsApp and we'll get back to you as soon as possible!`,
                'chat'
              );

              // Trigger WhatsApp redirect
              if (callbacks?.onWhatsAppRedirect) {
                callbacks.onWhatsAppRedirect(whatsappUrl, 'WhatsApp');
              }

              await textToSpeechRef.current?.speak(
                `I'm sorry, we're currently closed. ${nextAvailable}. You can message us on WhatsApp and we'll get back to you as soon as possible.`
              );
              break;
            }
            
            // Business is open - show phone number
            const cached = getCachedPhone(assistantId);
            let phoneNumber: string;
            let formattedNumber: string;
            
            if (cached) {
              console.log('📦 Using cached phone number for', assistantId);
              phoneNumber = cached.phoneNumber;
              formattedNumber = cached.formattedNumber;
            } else {
              phoneNumber = functionCall.phone_number || 
                           functionCall.contact_url?.replace('tel:', '').replace(/\D/g, '') || 
                           '';
              
              if (!phoneNumber) {
                throw new Error('Phone number not available');
              }
              
              // Try international formatting first
              formattedNumber = await measureAsync(
                'format_phone_number',
                async () => {
                  const intlFormat = formatPhoneNumberInternational(phoneNumber);
                  return intlFormat || formatPhoneNumber(phoneNumber);
                },
                { assistantId }
              );
              
              setCachedPhone(assistantId, phoneNumber, formattedNumber);
            }
            
            const isMobile = isMobileDevice();
            const spokenNumber = speakPhoneNumberInternational(phoneNumber) || speakPhoneNumber(phoneNumber);
            
            trackPhoneNumberDisplayed(assistantId, phoneNumber).catch(console.error);
            
            const contextMessage = isMobile
              ? "📞 Great! Here's our number - just tap it to call us directly:"
              : "📞 Here's our phone number. You can call us from your mobile device:";
            
            conversationMemory.addMessage('assistant', contextMessage, 'chat');
            conversationMemory.addMessage(
              'assistant', 
              `📞 CALL_NOW:${formattedNumber}:${assistantId}`,
              'chat'
            );
            
            const spokenMessage = isMobile
              ? `Our phone number is ${spokenNumber}. You can tap the number on your screen to call us directly.`
              : `Our phone number is ${spokenNumber}. Feel free to call us during business hours.`;
            
            await textToSpeechRef.current?.speak(spokenMessage);
            
          } catch (error) {
            console.error('❌ Error handling call_business:', error);
            const errorMessage = 'I encountered an error while trying to show the phone number. Please try again or check the website for contact information.';
            conversationMemory.addMessage('assistant', errorMessage, 'chat');
            await textToSpeechRef.current?.speak(errorMessage);
          }
          break;

        case 'send_quick_help':
          console.log('🔧 Send quick help triggered');
          if (functionCall.success && functionCall.action === 'show_support_modal') {
            const detailsSource = functionCall.details || functionCall.payload || {};
            const quickHelpPayload: QuickHelpPayload = {
              userEmail: functionCall.user_email || functionCall.userEmail || detailsSource.user_email || detailsSource.userEmail,
              userPhone: functionCall.user_phone || functionCall.userPhone || detailsSource.user_phone || detailsSource.userPhone,
              userName: functionCall.user_name || functionCall.userName || detailsSource.user_name || detailsSource.userName,
              message: functionCall.user_message || functionCall.message || functionCall.userMessage || detailsSource.user_message || detailsSource.message || detailsSource.userMessage,
              urgency: functionCall.urgency || detailsSource.urgency,
              category: functionCall.category || detailsSource.category,
              businessName: functionCall.business_name || functionCall.businessName || detailsSource.business_name || detailsSource.businessName
            };

            console.log('Quick help request - showing modal with details:', quickHelpPayload);

            if (callbacks?.onSupportTicket) {
              callbacks.onSupportTicket(quickHelpPayload);
            } else {
              toast({
                title: "Support Request",
                description: "Please fill out the support form to get help.",
              });
            }
          } else {
            console.log('🔧 Support request failed:', functionCall.message);
            toast({
              title: "Support Unavailable",
              description: functionCall.message || "Support form is not available at the moment.",
              variant: "destructive"
            });
          }
          break;

        case 'book_appointment':
          console.log('🔧 Book appointment triggered:', functionCall);
          if (callbacks?.onBookingRequest) {
            callbacks.onBookingRequest(functionCall);
          } else if (functionCall.success) {
            toast({
              title: "Booking Confirmed",
              description: functionCall.message || "Your appointment has been booked successfully!",
            });
            if (functionCall.calendlyUrl) {
              setTimeout(() => {
                window.open(functionCall.calendlyUrl, '_blank');
              }, 1500);
            }
          } else {
            toast({
              title: "Booking Request",
              description: "We'll help you schedule an appointment. Please provide your details.",
            });
          }
          break;

        default:
          console.log('🔧 Unhandled function call:', functionCall.name);
          if (functionCall.message) {
            toast({
              title: "Action Completed", 
              description: functionCall.message,
            });
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error handling function call:', error);
      toast({
        title: "Action Failed",
        description: "Failed to process the requested action. Please try again.",
        variant: "destructive"
      });
    }
  }, [callbacks]);

  const handleVoiceResult = useCallback(async (transcript: string) => {
    console.log('🎤 Processing voice transcript:', transcript);
    console.log('🎤 Assistant ID:', assistantId);
    
    // Add user message to ConversationMemory
    conversationMemory.addMessage('user', transcript, 'voice');
    
    setIsProcessing(true);

    try {
      // Get structured conversation history for full context
      const conversationHistory = conversationMemory.getConversationHistory();
      const currentContext = conversationMemory.getCurrentContext();
      
      // Calculate batch completion status
      const pendingBooking = currentContext.pendingBooking || {};
      const batch1Complete = !!(
        pendingBooking.userName &&
        pendingBooking.userEmail &&
        pendingBooking.userPhone
      );
      const batch2Complete = !!(
        pendingBooking.service &&
        pendingBooking.preferredDate &&
        pendingBooking.preferredTime
      );
      
      console.log('🎤 Calling AI chat with voice transcript, history:', conversationHistory.length, 'messages');
      console.log('🎤 Batch status - Batch 1:', batch1Complete, 'Batch 2:', batch2Complete);
      
      // MEMORY SYNC FIX: Send full conversation history and booking context
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: transcript,
          assistantId,
          sessionId: sessionIdRef.current,
          conversationHistory,
          bookingContext: {
            pendingBooking: currentContext.pendingBooking || null,
            collectingInfo: currentContext.collectingInfo || null,
            nextField: currentContext.nextField || null,
            conversationPhase: currentContext.conversationPhase || null,
            batch1Complete,
            batch2Complete
          }
        }
      });

      console.log('🎤 AI chat response:', { data, error });

      if (error) throw error;

      const assistantResponse = data.response || "I'm not quite sure how to help with that one — could you say a bit more about what you're looking for? I can also share contact options if that's easier.";
      console.log('🎤 Assistant response:', assistantResponse);
      console.log('🎤 Adding assistant message to memory');

      // Add assistant message to ConversationMemory
      conversationMemory.addMessage('assistant', assistantResponse, 'voice');
      console.log('✅ Assistant message added to conversationMemory');

      // Process function calls
      if (data.functionCall) {
        await handleFunctionCall(data.functionCall);
      }

      // Handle navigation requests from AI (same as text chat)
      if (data.navigation && data.navigation.type === 'navigate') {
        console.log('🧭 Navigation requested from voice:', data.navigation.url);
        
        try {
          // Import URLMapper to get navigation metadata
          const { URLMapper } = await import('@/utils/URLMapper');
          const urlMapper = new URLMapper(assistantId, data.navigation.url);
          
          // Load scraped data
          const { data: assistantData } = await supabase
            .from('assistants')
            .select('scraped_content, website_url')
            .eq('id', assistantId)
            .single();
          
          if (assistantData) {
            await urlMapper.initialize([], assistantData.scraped_content || {});
            const navTarget = urlMapper.getNavigationInfo(data.navigation.url);
            const availablePages = urlMapper.getAvailableNavigationLabels(5);

            if (!navTarget) {
              const suggestion = availablePages.length
                ? `Here are some pages I can open: ${availablePages.join(', ')}.`
                : 'Please ask for one of the pages listed on the site map.';
              const failureMessage = `I couldn't find that page in the saved site map. ${suggestion}`;

              conversationMemory.updateLastAssistantMessage(failureMessage);
              toast({
                title: "Page not available",
                description: suggestion,
                variant: "destructive",
                duration: 4000
              });
              await textToSpeechRef.current?.speak(failureMessage);
              return;
            }

            const targetUrl = navTarget.url;

            // Post navigation message to parent window
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'VOICE_NAVIGATE',
                url: targetUrl,
                source: 'voice-chat',
                openInNewTab: true,
                navType: navTarget.type,
                exists: navTarget.exists
              }, '*');
              console.log('📤 Posted VOICE_NAVIGATE to parent from voice');
            } else {
              window.open(targetUrl, '_blank', 'noopener');
            }
            
            // Show user feedback
            toast({
              title: "🧭 Navigating...",
              description: `Opening ${targetUrl} in a new tab`,
              duration: 2000,
            });
          }
        } catch (error) {
          console.error('❌ Error handling voice navigation:', error);
        }
      }

      // Speak the response
      await textToSpeechRef.current?.speak(assistantResponse);

    } catch (error) {
      console.error('❌ Error processing voice input:', error);
      toast({
        title: "Error",
        description: "Failed to process voice input. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [assistantId, handleFunctionCall]);

  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice recognition error:', error);
    setIsListening(false);
    setIsProcessing(false);
    
    toast({
      title: "Voice Recognition Error",
      description: error,
      variant: "destructive"
    });
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    console.log('💬 Sending text message:', text.trim());
    console.log('💬 Assistant ID:', assistantId);
    console.log('💬 Session ID:', sessionIdRef.current);

    // Add user message to ConversationMemory
    conversationMemory.addMessage('user', text.trim(), 'chat');
    
    setIsProcessing(true);

    try {
      // Get structured conversation history for full context
      const conversationHistory = conversationMemory.getConversationHistory();
      const currentContext = conversationMemory.getCurrentContext();
      
      // Calculate batch completion status
      const pendingBooking = currentContext.pendingBooking || {};
      const batch1Complete = !!(
        pendingBooking.userName &&
        pendingBooking.userEmail &&
        pendingBooking.userPhone
      );
      const batch2Complete = !!(
        pendingBooking.service &&
        pendingBooking.preferredDate &&
        pendingBooking.preferredTime
      );
      
      console.log('💬 Calling AI chat with text message, history:', conversationHistory.length, 'messages');
      console.log('💬 Batch status - Batch 1:', batch1Complete, 'Batch 2:', batch2Complete);
      
      // MEMORY SYNC FIX: Send full conversation history and booking context
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: text.trim(),
          assistantId,
          sessionId: sessionIdRef.current,
          conversationHistory,
          bookingContext: {
            pendingBooking: currentContext.pendingBooking || null,
            collectingInfo: currentContext.collectingInfo || null,
            nextField: currentContext.nextField || null,
            conversationPhase: currentContext.conversationPhase || null,
            batch1Complete,
            batch2Complete
          }
        }
      });

      console.log('💬 AI chat response:', { data, error });

      if (error) throw error;

      const assistantResponse = data.response || "I'm not quite sure how to help with that one — could you rephrase or share a bit more detail? I can also share contact options or set up a callback.";
      console.log('💬 Assistant response:', assistantResponse);

      // Add assistant message to ConversationMemory
      conversationMemory.addMessage('assistant', assistantResponse, 'chat');

      // Process function calls
      if (data.functionCall) {
        await handleFunctionCall(data.functionCall);
      }

      // Handle navigation requests from AI (same as text chat)
      if (data.navigation && data.navigation.type === 'navigate') {
        console.log('🧭 Navigation requested from text:', data.navigation.url);
        
        try {
          // Import URLMapper to get navigation metadata
          const { URLMapper } = await import('@/utils/URLMapper');
          const urlMapper = new URLMapper(assistantId, data.navigation.url);
          
          // Load scraped data
          const { data: assistantData } = await supabase
            .from('assistants')
            .select('scraped_content, website_url')
            .eq('id', assistantId)
            .single();
          
          if (assistantData) {
            await urlMapper.initialize([], assistantData.scraped_content || {});
            const navTarget = urlMapper.getNavigationInfo(data.navigation.url);
            const availablePages = urlMapper.getAvailableNavigationLabels(5);

            if (!navTarget) {
              const suggestion = availablePages.length
                ? `Here are some pages I can open: ${availablePages.join(', ')}.`
                : 'Please choose one of the pages listed in the site map.';
              const failureMessage = `I couldn't find that page in the saved site map. ${suggestion}`;

              conversationMemory.updateLastAssistantMessage(failureMessage);
              toast({
                title: "Page not available",
                description: suggestion,
                variant: "destructive",
                duration: 4000
              });
              return;
            }

            const targetUrl = navTarget.url;
            
            // Post navigation message to parent window
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'VOICE_NAVIGATE',
                url: targetUrl,
                source: 'text-chat',
                openInNewTab: true,
                navType: navTarget.type,
                exists: navTarget.exists
              }, '*');
              console.log('📤 Posted VOICE_NAVIGATE to parent from text');
            } else {
              window.open(targetUrl, '_blank', 'noopener');
            }
            
            // Show user feedback
            toast({
              title: "🧭 Navigating...",
              description: `Opening ${targetUrl} in a new tab`,
              duration: 2000,
            });
          }
        } catch (error) {
          console.error('❌ Error handling text navigation:', error);
        }
      }

    } catch (error) {
      console.error('❌ Error sending text message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [assistantId, handleFunctionCall]);

  // PRIVACY FIX: Auto-stop timeout ref
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize voice systems
  useEffect(() => {
    const initVoice = () => {
      // Initialize speech recognition with privacy safeguards
      voiceRecorderRef.current = new SimplifiedVoiceRecorder({
        onResult: handleVoiceResult,
        onError: handleVoiceError,
        onStart: () => {
          console.log('🎤 Voice recording started');
          setIsListening(true);
          
          // PRIVACY FIX: Set auto-stop timeout (30 seconds max)
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current);
          }
          autoStopTimeoutRef.current = setTimeout(() => {
            console.log('🔒 Auto-stopping voice for privacy after 30 seconds');
            if (voiceRecorderRef.current?.isActive()) {
              voiceRecorderRef.current.stop();
            }
            setIsListening(false);
            toast({
              title: "Privacy Protection",
              description: "Voice session automatically stopped after 30 seconds",
            });
          }, 30000);
        },
        onEnd: () => {
          console.log('🎤 Voice recording ended');
          setIsListening(false);
          
          // PRIVACY FIX: Clear auto-stop timeout
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current);
            autoStopTimeoutRef.current = null;
          }
        }
      });

      // Initialize text-to-speech
      textToSpeechRef.current = new TextToSpeech((speaking) => {
        setIsSpeaking(speaking);
      });

      setIsConnected(voiceRecorderRef.current.isSupported());
    };

    initVoice();

    return () => {
      // PRIVACY FIX: Enhanced cleanup
      console.log('🔒 Cleaning up voice systems for privacy');
      
      // Clear auto-stop timeout
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }
      
      // Force stop and cleanup voice recorder
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.stop();
        voiceRecorderRef.current.cleanup();
      }
      
      // Stop TTS
      textToSpeechRef.current?.stop();
      
      setIsListening(false);
      setIsSpeaking(false);
    };
  }, [assistantId, handleVoiceResult, handleVoiceError]);

  const startListening = useCallback(() => {
    console.log('🎤 STARTING VOICE RECORDING - assistantId:', assistantId);
    
    if (!voiceRecorderRef.current?.isSupported()) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive"
      });
      return;
    }

    // PRIVACY FIX: Ensure not already listening
    if (isListening || voiceRecorderRef.current?.isActive()) {
      console.log('🔒 Already listening, stopping first for privacy');
      stopListening();
      return;
    }

    // Stop any current speech
    textToSpeechRef.current?.stop();
    
    voiceRecorderRef.current?.start();
  }, [isListening]);

  const stopListening = useCallback(() => {
    console.log('🎤 STOPPING VOICE RECORDING - assistantId:', assistantId);
    
    // PRIVACY FIX: Immediately update UI state for instant feedback
    setIsListening(false);
    
    // Clear auto-stop timeout
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    
    // Force stop the recorder (async operation)
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.stop();
    }
  }, [assistantId]);

  const clearMessages = useCallback(() => {
    conversationMemory.clearMessages();
  }, []);

  return {
    messages,
    isListening,
    isSpeaking,
    isProcessing,
    isConnected,
    startListening,
    stopListening,
    sendTextMessage,
    clearMessages
  };
};