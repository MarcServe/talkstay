import { RealtimeChat } from './RealtimeAudio';
import { conversationMemory } from './ConversationMemory';

export class VoiceAcknowledgmentManager {
  constructor(
    private realtimeChat: RealtimeChat | null,
    private setMessages: (updater: (prev: any[]) => any[]) => void
  ) {}

  // Booking acknowledgments
  async acknowledgeBookingDetails(details: any) {
    const message = `Perfect! I have your booking details. Date: ${details.preferredDate}, Time: ${details.preferredTime}. Let me confirm this appointment for you.`;
    await this.sendAcknowledgment(message);
    conversationMemory.setContext({ conversationPhase: 'confirming' });
  }

  async acknowledgeBookingSuccess(email: string) {
    const message = `Great! Your appointment has been confirmed. You'll receive a confirmation email at ${email}. Is there anything else I can help you with?`;
    await this.sendAcknowledgment(message);
    conversationMemory.setContext({ conversationPhase: 'complete' });
  }

  async acknowledgeBookingError() {
    const message = `I apologize, but I encountered an issue processing your booking. Let me help you get in touch with support directly.`;
    await this.sendAcknowledgment(message);
  }

  // Specific data acknowledgments with interrupt capability
  async acknowledgeWhatsAppRedirect(businessName: string) {
    const message = `I'm connecting you to ${businessName} on WhatsApp.`;
    await this.sendAcknowledgment(message);
  }

  async acknowledgeEmailReceived(email: string, needsSpellingConfirmation: boolean = true) {
    const baseMessage = `I heard your email as "${email}"`;
    const spellingMessage = needsSpellingConfirmation 
      ? `. Does that sound right? You can say "yes" to confirm, "no" to try again, or "type" if you'd prefer to enter it securely.`
      : `. Perfect! I've got that saved.`;
    
    const message = baseMessage + spellingMessage;
    await this.sendAcknowledgment(message);
    conversationMemory.updateBookingInfo({ userEmail: email }, 'voice');
    
    // If email is confirmed, automatically trigger privacy choice for phone
    if (!needsSpellingConfirmation) {
      await this.requestPrivacyInput('phone');
    }
  }

  async acknowledgeNameReceived(name: string, needsSpellingConfirmation: boolean = false) {
    const baseMessage = `Thank you, ${name}! I've got your name.`;
    await this.sendAcknowledgment(baseMessage);
    conversationMemory.updateBookingInfo({ userName: name }, 'voice');
    
    // Automatically trigger privacy choice for email collection
    await this.requestPrivacyInput('email');
  }

  async acknowledgePhoneReceived(phone: string, needsSpellingConfirmation: boolean = true) {
    const baseMessage = `I heard your phone number as "${phone}"`;
    const followupMessage = needsSpellingConfirmation 
      ? `. Is that correct? Say "yes" to confirm, "no" to try again, or "type" for secure input.`
      : `. Excellent! I've got all your contact details now.`;
    
    const message = baseMessage + followupMessage;
    await this.sendAcknowledgment(message);
    conversationMemory.updateBookingInfo({ userPhone: phone }, 'voice');
  }

  // Privacy-focused field collection with better guidance
  async requestPrivacyInput(fieldType: 'email' | 'phone' | 'name') {
    const messages = {
      email: [
        "Now I need your email address. You have a couple of options here:",
        "You can either speak it out loud - I'll listen carefully and repeat it back to confirm,", 
        "or if you prefer more privacy, there's a secure text input option available.",
        "What feels more comfortable for you?"
      ].join(' '),
      phone: [
        "Perfect! Now for your phone number.",
        "Just like before, you can speak it clearly and I'll confirm what I heard,",
        "or use the secure typing option if you'd prefer.",
        "Which way works better for you?"
      ].join(' '),
      name: [
        "Great! Let's start with your name.",
        "You can speak it naturally, or type it if you prefer.",
        "What would you like to do?"
      ].join(' ')
    };
    
    await this.sendAcknowledgment(messages[fieldType]);
    
    // Mark that we're waiting for privacy choice
    conversationMemory.setContext({ 
      conversationPhase: 'privacy_choice',
      nextField: fieldType
    });
  }

  async acknowledgeManualInput(fieldType: 'email' | 'phone' | 'name', value: string) {
    const messages = {
      email: `Perfect! I received your email securely as ${value}. Thank you for using the private input option.`,
      phone: `Excellent! Your phone number has been securely recorded. All your contact information is now complete.`,
      name: `Perfect! I received your name securely as ${value}. Thank you for using the secure input option.`
    };
    
    // Force immediate voice acknowledgment - highest priority
    await this.sendImmediateVoiceAcknowledgment(messages[fieldType]);
    
    // Also add to conversation memory and UI
    conversationMemory.addMessage('assistant', messages[fieldType], 'voice');
    this.setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: `🔒 ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} received securely`,
      sender: 'assistant' as const,
      timestamp: new Date()
    }]);
    
    if (fieldType === 'email') {
      conversationMemory.updateBookingInfo({ userEmail: value }, 'chat');
      // Automatically trigger privacy choice for phone after email is securely received
      await this.requestPrivacyInput('phone');
    } else if (fieldType === 'phone') {
      conversationMemory.updateBookingInfo({ userPhone: value }, 'chat');
    } else if (fieldType === 'name') {
      conversationMemory.updateBookingInfo({ userName: value }, 'chat');
      // Automatically trigger privacy choice for email after name is securely received
      await this.requestPrivacyInput('email');
    }
  }

  // Proactive spelling confirmation
  async confirmSpelling(fieldType: 'name' | 'email', value: string) {
    const message = fieldType === 'name'
      ? `Just to confirm, your name is ${value} - is that spelled correctly?`
      : `Let me confirm your email: ${value} - does that look right?`;
    
    await this.sendAcknowledgment(message);
  }

  // Method guidance - always present three options
  async presentMethodOptions() {
    const message = "I can help you in three ways: connect you via WhatsApp for instant messaging, have a quick chat right here, or help you book an appointment. Which would you prefer?";
    await this.sendAcknowledgment(message);
  }

  // Anti-repetition controls
  async sendStopCommand() {
    if (this.realtimeChat) {
      console.log('User requested to stop - cancelling response');
      this.realtimeChat.cancelResponse();
      await this.sendAcknowledgment("Understood. How can I help you?", true);
      conversationMemory.markResponseTruncated();
    }
  }

  async sendPauseCommand() {
    if (this.realtimeChat) {
      console.log('User requested to pause');
      this.realtimeChat.stopListening();
      await this.sendAcknowledgment("Paused. Let me know when you're ready to continue.", true);
    }
  }

  // Enhanced interrupt handling
  async handleUserInterrupt() {
    if (this.realtimeChat) {
      console.log('User interrupt detected - stopping current response');
      this.realtimeChat.cancelResponse();
      conversationMemory.userStartedSpeaking();
      
      // Short pause before asking what they need
      setTimeout(async () => {
        await this.sendAcknowledgment("Sorry about that. What did you need?", true);
      }, 500);
    }
  }

  private async sendAcknowledgment(message: string, isShort: boolean = false) {
    try {
      // Add to conversation memory
      conversationMemory.addMessage('assistant', message, 'voice');
      
      // Update local messages state for UI
      this.setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: message,
        sender: 'assistant' as const,
        timestamp: new Date()
      }]);

      // Send via realtime chat if available and message isn't too short
      if (this.realtimeChat && !isShort) {
        await this.realtimeChat.sendMessage(message);
      }
      
      console.log('Acknowledgment sent:', message);
    } catch (error) {
      console.error('Error sending acknowledgment:', error);
    }
  }

  // Send immediate voice acknowledgment for critical real-time feedback
  private async sendImmediateVoiceAcknowledgment(message: string) {
    try {
      console.log('Sending immediate voice acknowledgment:', message);
      
      // Force immediate voice response if realtime chat is available
      if (this.realtimeChat) {
        // Send as high priority message with force flag
        await this.realtimeChat.sendMessage(`${message}`);
      }
      
      console.log('Immediate voice acknowledgment sent successfully');
    } catch (error) {
      console.error('Error sending immediate voice acknowledgment:', error);
      // Fallback to regular acknowledgment
      await this.sendAcknowledgment(message);
    }
  }

  // Check if user is trying to interrupt with common commands
  isInterruptCommand(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase().trim();
    const interruptCommands = [
      'stop', 'pause', 'wait', 'hold on', 'enough', 
      'that\'s enough', 'stop talking', 'quiet',
      'interrupt', 'hold up', 'one moment'
    ];
    
    return interruptCommands.some(cmd => lowerMessage.includes(cmd));
  }

  // Detect if AI is repeating itself
  isRepeating(newMessage: string): boolean {
    const recentMessages = conversationMemory.getMessages()
      .filter(msg => msg.sender === 'assistant')
      .slice(-3)
      .map(msg => msg.text.toLowerCase());
    
    const newLower = newMessage.toLowerCase();
    return recentMessages.some(msg => 
      this.similarity(msg, newLower) > 0.8
    );
  }

  private similarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[s2.length][s1.length];
  }
}