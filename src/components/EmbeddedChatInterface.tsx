import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Phone, PhoneCall, Copy, Info, ExternalLink } from 'lucide-react';
import { useSimplifiedVoice, QuickHelpPayload } from '@/hooks/useSimplifiedVoice';
import { toast } from '@/hooks/use-toast';
import { MessageBubble } from '@/components/ui/message-bubble';
import { cn } from '@/lib/utils';
import { WhatsAppConfirmationModal } from '@/components/WhatsAppConfirmationModal';
import { BookingConfirmationModal } from '@/components/BookingConfirmationModal';
import { BookingInformationModal } from '@/components/BookingInformationModal';
import { EnhancedBookingModal } from '@/components/EnhancedBookingModal';
import { SupportTicketModal } from '@/components/SupportTicketModal';
import { QuickHelpModal } from '@/components/QuickHelpModal';
import { supabase } from '@/integrations/supabase/client';
import { conversationMemory } from '@/utils/ConversationMemory';
import { useBookingSync } from '@/hooks/useBookingSync';
import {
  buildExternalBookingUrl,
  encodeBookingLinkMessage,
  parseBookingLinkMessage,
} from '@/utils/externalBookingUrl';

type QuickHelpFormDetails = {
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  message: string;
  urgency?: string;
  category?: string;
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  source?: 'voice' | 'text';
}

interface EmbeddedChatInterfaceProps {
  assistantId: string;
}

const EmbeddedChatInterface: React.FC<EmbeddedChatInterfaceProps> = ({ assistantId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [assistantInfo, setAssistantInfo] = useState<{ businessName: string }>({
    businessName: 'Support Team'
  });

  // External booking link config — when set, in-chat booking intents skip the
  // built-in modal and surface a CTA that opens the company's own form.
  const [externalBooking, setExternalBooking] = useState<{
    enabled: boolean;
    url: string;
    label: string;
    autoOpen: boolean;
  }>({ enabled: false, url: '', label: 'Open booking form', autoOpen: false });
  const externalBookingRef = useRef(externalBooking);
  useEffect(() => { externalBookingRef.current = externalBooking; }, [externalBooking]);
  const handledExternalBookingRef = useRef(false);

  // Use booking sync hook to auto-show modal when fields are collected
  const { bookingModal, closeModal } = useBookingSync();

  
  // Log + intercept booking modal opens. If the assistant is configured to
  // route bookings to an external web form, close the built-in modal and
  // surface a CTA chat message (optionally auto-opening the link).
  useEffect(() => {
    if (!bookingModal) {
      handledExternalBookingRef.current = false;
      return;
    }

    console.log('📋 Booking modal state changed in EmbeddedChatInterface:', {
      isOpen: bookingModal.isOpen,
      hasDetails: !!bookingModal.details,
      details: bookingModal.details
    });

    if (!bookingModal.isOpen) return;

    const ext = externalBookingRef.current;
    if (!ext.enabled || !ext.url) return;
    if (handledExternalBookingRef.current) return;
    handledExternalBookingRef.current = true;

    const details = bookingModal.details || {};
    const finalUrl = buildExternalBookingUrl(ext.url, {
      userName: details.userName,
      userEmail: details.userEmail,
      preferredDate: details.preferredDate,
    });

    // Close the built-in modal — the visitor will book on the external page.
    try { closeModal(); } catch (e) { console.warn('closeModal failed', e); }

    // Make sure the AI doesn't keep collecting time-slot fields.
    try {
      conversationMemory.clearBookingInfo('chat');
    } catch (e) { console.warn('clearBookingInfo failed', e); }

    const business = assistantInfo.businessName || 'us';
    conversationMemory.addMessage(
      'assistant',
      `Here's the booking form for ${business}. Tap the button below to complete your request.`,
      'chat'
    );
    conversationMemory.addMessage(
      'assistant',
      encodeBookingLinkMessage(finalUrl, ext.label),
      'chat'
    );

    if (ext.autoOpen) {
      try { window.open(finalUrl, '_blank', 'noopener,noreferrer'); } catch (e) {
        console.warn('Auto-open booking link failed', e);
      }
    }
  }, [bookingModal, closeModal, assistantInfo.businessName]);
  
  // Modal states
  const [whatsAppModal, setWhatsAppModal] = useState<{
    isOpen: boolean;
    whatsappUrl: string;
    businessName: string;
  }>({ isOpen: false, whatsappUrl: '', businessName: '' });

  const [bookingInfoModal, setBookingInfoModal] = useState<{
    isOpen: boolean;
    businessName: string;
  }>({ isOpen: false, businessName: '' });

  const [supportTicketModal, setSupportTicketModal] = useState<{
    isOpen: boolean;
    category: string;
    priority: string;
    subject: string;
    userMessage: string;
  }>({ isOpen: false, category: 'support', priority: 'medium', subject: '', userMessage: '' });

  const defaultQuickHelpDetails: QuickHelpFormDetails = {
    userEmail: '',
    userPhone: '',
    userName: '',
    message: '',
    urgency: 'medium',
    category: 'general'
  };

  const [quickHelpModalState, setQuickHelpModalState] = useState<{
    isOpen: boolean;
    helpDetails: QuickHelpFormDetails;
    businessName: string;
  }>({
    isOpen: false,
    helpDetails: { ...defaultQuickHelpDetails },
    businessName: 'Support Team'
  });

  const [isSendingQuickHelp, setIsSendingQuickHelp] = useState(false);

  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'processing' | 'connecting' | 'connected'>('idle');

  
  // Simplified voice interface
  const {
    messages,
    isListening,
    isSpeaking,
    isProcessing,
    isConnected,
    startListening,
    stopListening,
    sendTextMessage,
    clearMessages
  } = useSimplifiedVoice(assistantId, {
    onSupportTicket: (details) => {
      handleSupportTicketRequest(details);
    }
  });

  useEffect(() => {
    let isMounted = true;

    const loadAssistantInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('assistants')
          .select('business_name, default_booking_method, external_scheduling_url, external_link_label, external_link_auto_open')
          .eq('id', assistantId)
          .single();

        if (!isMounted) return;

        if (error) {
          console.error('Failed to fetch assistant info:', error);
          return;
        }

        if (data?.business_name) {
          setAssistantInfo({ businessName: data.business_name });
          setQuickHelpModalState((prev) => ({
            ...prev,
            businessName: data.business_name
          }));
        }

        const url = (data as any)?.external_scheduling_url?.trim?.() || '';
        const useExternal =
          (data as any)?.default_booking_method === 'external_link' && !!url;
        setExternalBooking({
          enabled: useExternal,
          url,
          label: (data as any)?.external_link_label?.trim?.() || 'Open booking form',
          autoOpen: !!(data as any)?.external_link_auto_open,
        });
      } catch (fetchError) {
        if (isMounted) {
          console.error('Error loading assistant info:', fetchError);
        }
      }
    };

    loadAssistantInfo();

    return () => {
      isMounted = false;
    };
  }, [assistantId]);

  const handleSupportTicketRequest = (details: QuickHelpPayload) => {
    const helpDetails = {
      userEmail: details.userEmail || '',
      userPhone: details.userPhone || '',
      userName: details.userName || '',
      message: details.message || '',
      urgency: details.urgency || 'medium',
      category: details.category || 'general'
    };

    conversationMemory.updateQuickHelpInfo(helpDetails);

    setQuickHelpModalState((prev) => ({
      isOpen: true,
      helpDetails,
      businessName: details.businessName || prev.businessName || assistantInfo.businessName
    }));
  };

  const handleQuickHelpClose = () => {
    setQuickHelpModalState((prev) => ({
      ...prev,
      isOpen: false
    }));
  };

  const handleQuickHelpSubmit = async (details: QuickHelpFormDetails) => {
    setIsSendingQuickHelp(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-quick-help', {
        body: {
          assistantId,
          userEmail: details.userEmail,
          userPhone: details.userPhone,
          userName: details.userName,
          message: details.message,
          urgency: details.urgency || 'medium',
          category: details.category || 'general'
        }
      });

      if (error) {
        throw error;
      }

      const responseMessage = data?.message || 'Your message has been sent successfully!';
      toast({
        title: 'Support request sent',
        description: responseMessage
      });

      conversationMemory.addMessage(
        'assistant',
        'Thanks! I have shared your project details with our team. We will reach out shortly.',
        'chat'
      );

      setQuickHelpModalState({
        isOpen: false,
        helpDetails: { ...defaultQuickHelpDetails },
        businessName: assistantInfo.businessName
      });
    } catch (error) {
      console.error('Error sending quick help request:', error);
      const description = error instanceof Error ? error.message : 'Failed to send support request. Please try again.';
      toast({
        title: 'Support Unavailable',
        description,
        variant: 'destructive'
      });
    } finally {
      setIsSendingQuickHelp(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessage = async (message: string) => {
    if (!message.trim()) return;
    
    setInputText('');
    
    try {
      await sendTextMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessage(inputText);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-xl w-96 max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm font-medium">
                {isConnected ? 'Voice Available' : 'Voice Not Available'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status removed for better UX */}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
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

              // External booking link CTA
              const bookingLink = parseBookingLinkMessage(message.text);
              if (bookingLink) {
                return (
                  <div key={message.id} className="flex justify-start mb-4">
                    <div className="max-w-[90%] rounded-xl px-5 py-4 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30 shadow-md">
                      <div className="flex items-center gap-2 text-primary mb-3">
                        <ExternalLink className="w-5 h-5" />
                        <span className="text-sm font-semibold">Book on our website</span>
                      </div>
                      <a
                        href={bookingLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {bookingLink.label}
                      </a>
                      <p className="text-xs text-muted-foreground mt-2">
                        Opens in a new tab on the company's website.
                      </p>
                    </div>
                  </div>
                );
              }

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
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Voice Controls */}
          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!isConnected || isProcessing}
              className={cn(
                "flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 shadow-lg",
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
                (!isConnected || isProcessing) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isListening ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isProcessing}
            />
            <button
              onClick={() => handleMessage(inputText)}
              disabled={!inputText.trim() || isProcessing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Additional Actions */}
          {messages.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={clearMessages}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
              >
                Clear Conversation
              </button>
            </div>
          )}
        </div>

        {/* Development Features */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 border-t border-border bg-muted/30">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Messages: {messages.length}</div>
              <div>Status: {isListening ? 'Listening' : isSpeaking ? 'Speaking' : isProcessing ? 'Processing' : 'Ready'}</div>
              <div>Voice: {isConnected ? 'Available' : 'Not Available'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <WhatsAppConfirmationModal
        isOpen={whatsAppModal.isOpen}
        onClose={() => setWhatsAppModal(prev => ({ ...prev, isOpen: false }))}
        whatsappUrl={whatsAppModal.whatsappUrl}
        businessName={whatsAppModal.businessName}
      />

      {bookingModal && (
        <EnhancedBookingModal
          isOpen={bookingModal.isOpen}
          onClose={closeModal}
          assistantId={assistantId}
          initialData={bookingModal.details}
        />
      )}

      <BookingInformationModal
        isOpen={bookingInfoModal.isOpen}
        onClose={() => setBookingInfoModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={() => {}}
      />

      <QuickHelpModal
        isOpen={quickHelpModalState.isOpen}
        onClose={handleQuickHelpClose}
        onConfirm={handleQuickHelpSubmit}
        helpDetails={quickHelpModalState.helpDetails}
        businessName={quickHelpModalState.businessName || assistantInfo.businessName}
        isLoading={isSendingQuickHelp}
      />

      <SupportTicketModal
        isOpen={supportTicketModal.isOpen}
        onClose={() => setSupportTicketModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={() => {}}
      />
    </>
  );
};

export default EmbeddedChatInterface;