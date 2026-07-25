import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, X, Send, Phone, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookingModal } from './BookingModal';
import { WhatsAppModal } from './WhatsAppModal';
import { openReviewPrompt } from '@/utils/reviewPrompt';
import { conversationMemory } from '@/utils/ConversationMemory';
import { useBookingSync } from '@/hooks/useBookingSync';
import { captureBookingFieldFromText } from '@/utils/bookingFieldCapture';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface VoiceChatInterfaceProps {
  assistantId: string;
  embedded?: boolean;
}

const VoiceChatInterface: React.FC<VoiceChatInterfaceProps> = ({ 
  assistantId, 
  embedded = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationTurn, setCurrentConversationTurn] = useState<string | null>(null);
  const { bookingModal, closeModal } = useBookingSync();
  const [whatsappModal, setWhatsappModal] = useState<{isOpen: boolean; url: string; businessName: string}>({
    isOpen: false,
    url: '',
    businessName: ''
  });
  const [sessionStartTime] = useState(Date.now());
  const [hasUserEngaged, setHasUserEngaged] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Add message listener for widget close events
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'close_widget') {
        console.log('VoiceChatInterface: Received close_widget message');
        // Close the interface and reset state
        setIsOpen(false);
        setMessages([]);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleMessage = async (message: string) => {
    if (!message.trim()) return;

    // Track user engagement
    setHasUserEngaged(true);

    // Add to unified conversation memory
    conversationMemory.addMessage('user', message, 'chat');

    // Attempt to capture any booking details that were typed
    captureBookingFieldFromText(message, { method: 'text' });

    // Add user message to local state
    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      console.log('Sending chat request:', { assistantId, message });

      const conversationHistory = conversationMemory.getConversationHistory();
      const currentContext = conversationMemory.getCurrentContext();
      const bookingState = conversationMemory.getBookingState();

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          assistantId,
          message,
          sessionId: `chat-${sessionStartTime}`,
          conversationHistory,
          bookingContext: {
            pendingBooking: currentContext.pendingBooking || null,
            collectingInfo: currentContext.collectingInfo || null,
            nextField: currentContext.nextField || null,
            conversationPhase: currentContext.conversationPhase || null,
            bookingState
          }
        }
      });

      console.log('Chat response received:', { data, error });

      if (error) {
        console.error('Chat function error:', error);
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
        
        throw new Error(error.message || 'Unable to connect to chat service. Please try again.');
      }

      if (!data) {
        throw new Error('No response received from chat service.');
      }

      // Check for specific error messages in data (expired/deleted assistants)
      if (data.error) {
        console.error('Chat data error:', data.error);
        
        // Check if this is a 429 limit error in data
        if (data.error === 'CONVERSATION_LIMIT_EXCEEDED' || data.upgradeRequired === true) {
          console.log('🚫 Conversation limit exceeded (from data) - notifying widget');
          
          const fallbackContacts = data.fallbackContacts || null;
          const message = data.message || 'This assistant is currently unavailable due to high usage.';
          
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'conversation_limit_reached',
              fallbackContacts,
              message
            }, '*');
          }
          
          return; // Don't throw, widget will handle UI
        }
        
        throw new Error(data.error);
      }

      const responseText = data.response || data.functionCall?.message || 'I apologize, but I encountered an issue processing your request. Please try again.';

      // Store alternative slots if provided
      if (data.alternativeSlots && Array.isArray(data.alternativeSlots)) {
        console.log('📅 Storing alternative slots:', data.alternativeSlots);
        conversationMemory.setAlternativeSlots(data.alternativeSlots);
        
        // Also update booking info if provided
        if (data.pendingBookingInfo) {
          conversationMemory.updateBookingInfo(data.pendingBookingInfo, 'chat');
        }
      }

      // Add to unified conversation memory
      conversationMemory.addMessage('assistant', responseText, 'chat');

      // Create new conversation turn for AI response
      const turnId = `turn-${Date.now()}`;
      setCurrentConversationTurn(turnId);
      
      // Add AI response to local state
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // End conversation turn
      setTimeout(() => setCurrentConversationTurn(null), 100);

      // Handle function calls
      if (data.functionCall) {
        const fc = data.functionCall;
        console.log('🔍 Function call received:', fc);
        console.log('🔍 WhatsApp URL check:', fc.whatsapp_url);
        console.log('🔍 Success check:', fc.success);
        console.log('🔍 Business name:', fc.business_name);
        
        if (fc.success && fc.whatsapp_url) {
          console.log('✅ Setting WhatsApp modal to open');
          const modalState = {
            isOpen: true,
            url: fc.whatsapp_url,
            businessName: fc.business_name || 'Business'
          };
          console.log('🔍 Modal state:', modalState);
          setWhatsappModal(modalState);
          toast.success(`Connecting you to ${fc.business_name || 'WhatsApp'}...`);
        } else if (fc.calendlyUrl || fc.bookingId) {
          toast.success(fc.message || 'Your appointment has been scheduled.');
          if (fc.calendlyUrl) {
            window.open(fc.calendlyUrl, '_blank');
          }
        } else if (fc.success === false) {
          // If backend couldn't book (missing details), open booking modal to collect info
          conversationMemory.showBookingConfirmation({}, 'chat');
        }
      }

      // Handle navigation
      if (data.navigation?.url) {
        const url = data.navigation.url;
        if (embedded) {
          window.parent?.postMessage({ type: 'navigation', url }, '*');
        } else {
          window.open(url, '_blank');
        }
      }

    } catch (error) {
      console.error('Chat message error:', error);
      
      const errorText = error instanceof Error ? error.message : 'I\'m having trouble connecting right now. Please try again or contact support directly.';
      
      // Don't show error message if it's a conversation limit error (widget handles it)
      if (!errorText.includes('CONVERSATION_LIMIT_EXCEEDED')) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: errorText,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        toast.error(errorText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessage(inputText);
    }
  };

  const handleBookingConfirm = async (details: any) => {
    console.log('=== BOOKING CONFIRMATION START ===');
    console.log('📋 handleBookingConfirm called with details:', details);
    console.log('🏢 Assistant ID:', assistantId);
    console.log('📍 Current timestamp:', new Date().toISOString());
    
    // Update conversation memory with edited details
    const bookingInfo = {
      userName: details.userName,
      userEmail: details.userEmail,
      userPhone: details.userPhone,
      preferredDate: details.preferredDate,
      preferredTime: details.preferredTime,
      service: details.serviceType
    };
    
    console.log('💾 Updating conversation memory with:', bookingInfo);
    conversationMemory.updateBookingInfo(bookingInfo, 'chat');
    console.log('✅ Conversation memory updated');
    
    conversationMemory.setBookingLoading(true);
    setIsLoading(true);
    
    try {
      const requestPayload = {
        assistantId,
        ...details,
        previewMode: true,
        supportEmail: 'support@talkweb.io'
      };
      
      console.log('🚀 Calling book-appointment edge function with payload:', requestPayload);
      console.log('📞 Function URL: /functions/v1/book-appointment');
      
      const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: requestPayload
      });

      console.log('📥 Response from book-appointment:', { data, error });

      if (error) {
        console.error('❌ book-appointment returned error:', error);
        throw error;
      }
      
      console.log('✅ Booking successful!');
      console.log('📧 Email sending status:', data);

      // Success feedback with next steps
      toast.success('Booking confirmed! Details sent to support. You will receive a confirmation email shortly.', {
        duration: 5000
      });
      
      // Close modal and clear booking state after brief delay
      setTimeout(() => {
        console.log('🧹 Closing modal and clearing booking state');
        closeModal();
        conversationMemory.updateBookingInfo({}, 'chat');
      }, 1000);

    } catch (error) {
      console.error('❌ BOOKING ERROR:', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Enhanced error handling with retry option
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ User-facing error message:', errorMessage);
      
      toast.error(`Booking failed: ${errorMessage}. Please try again or contact support.`, {
        duration: 7000,
        action: {
          label: 'Retry',
          onClick: () => {
            console.log('🔄 User clicked retry button');
            handleBookingConfirm(details);
          }
        }
      });
    } finally {
      console.log('🏁 Booking process completed (success or failure)');
      setIsLoading(false);
      conversationMemory.setBookingLoading(false);
    }
  };

  const handleChatClose = () => {
    setIsOpen(false);
    
    // Show review prompt if user has engaged and session lasted more than 30 seconds
    const sessionDuration = Date.now() - sessionStartTime;
    if (hasUserEngaged && sessionDuration > 30000 && messages.length >= 2) {
      setTimeout(() => {
        openReviewPrompt({
          assistantId,
          origin: 'chat_session',
          channel: 'chat'
        });
      }, 500);
    }
  };

  const quickActions = [
    { label: 'Book Appointment', action: () => handleMessage('I want to book an appointment') },
    { label: 'Contact Info', action: () => handleMessage('What is your contact information?') },
    { label: 'Services', action: () => handleMessage('What services do you offer?') },
    { label: 'Support', action: () => handleMessage('I need help with support') }
  ];

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[90vw]">
          <Card className="bg-background border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium text-sm">AI Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(!showChat)}
                  className="h-8 w-8 p-0"
                  title={showChat ? 'Switch to Voice' : 'Switch to Chat'}
                >
                  {showChat ? <Mic className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setMessages([]);
                    // Notify parent if embedded to end session completely
                    if (embedded) {
                      window.parent?.postMessage({ type: 'end_chat' }, '*');
                    }
                  }}
                  className="h-7 px-2 text-xs"
                  title="End Chat"
                >
                  End Chat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleChatClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col h-96">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Hi! I'm here to help you with information, bookings, and support.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={action.action}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {messages.map((message, index) => {
                  const isLastMessage = index === messages.length - 1;
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showSeparator = prevMessage && prevMessage.sender !== message.sender;
                  
                  return (
                    <div key={message.id}>
                      {showSeparator && (
                        <div className="flex justify-center my-2">
                          <div className="w-12 h-px bg-border" />
                        </div>
                      )}
                      <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] p-3 rounded-lg text-sm ${
                            message.sender === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex space-x-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-muted/20">
                <div className="flex gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 min-h-[40px] max-h-[100px] resize-none"
                    rows={1}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleMessage(inputText)}
                    disabled={!inputText.trim() || isLoading}
                    size="icon"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <BookingModal
          isOpen={bookingModal.isOpen}
          onClose={closeModal}
          onConfirm={handleBookingConfirm}
          bookingDetails={bookingModal.details}
          businessName="Business"
          isLoading={bookingModal.isLoading || isLoading}
          embedded={embedded}
        />
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsappModal.isOpen}
        onClose={() => setWhatsappModal({isOpen: false, url: '', businessName: ''})}
        whatsappUrl={whatsappModal.url}
        businessName={whatsappModal.businessName}
      />
    </>
  );
};

export default VoiceChatInterface;
