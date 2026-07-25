const MAX_STORED_MESSAGES = 200;
const HISTORY_EXPORT_LIMIT = 40;
const BOOKING_STALE_RESET_MS = 10 * 60 * 1000; // 10 minutes

interface ConversationMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type: 'voice' | 'chat';
  metadata?: {
    isPrivate?: boolean;
    fieldType?: string;
    collected?: boolean;
    truncated?: boolean;
  };
}

interface BookingInfo {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  service?: string;
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
}

type BookingInfoField = keyof BookingInfo;
type BookingInfoSource = 'voice' | 'chat';

const PLACEHOLDER_PATTERNS = [
  /\bmock\b/i,
  /\bsample\b/i,
  /\bplaceholder\b/i,
  /\bdemo\b/i,
  /\btest data\b/i
];

const PLACEHOLDER_EMAIL_DOMAINS = ['example.com', 'test.com', 'demo.com'];
const PLACEHOLDER_NAMES = ['john doe', 'jane doe', 'test user', 'sample user', 'demo user'];
const PLACEHOLDER_PHONES = ['1234567890', '0000000000', '5555555555'];

const sanitizeBookingField = (field: BookingInfoField, value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (PLACEHOLDER_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return undefined;
  }

  switch (field) {
    case 'userEmail': {
      const lower = trimmed.toLowerCase();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower);
      if (!isEmail) return undefined;
      const domain = lower.split('@')[1];
      if (domain && PLACEHOLDER_EMAIL_DOMAINS.includes(domain)) return undefined;
      return lower;
    }
    case 'userPhone': {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 7) return undefined;
      if (PLACEHOLDER_PHONES.includes(digits)) return undefined;
      return trimmed;
    }
    case 'userName': {
      const normalized = trimmed.replace(/[^A-Za-z.'\-\s]/g, '').replace(/\s+/g, ' ').trim();
      if (!normalized || normalized.length < 2) return undefined;
      if (PLACEHOLDER_NAMES.includes(normalized.toLowerCase())) return undefined;
      return normalized;
    }
    default:
      return trimmed;
  }
};

const isPlaceholderValue = (field: BookingInfoField, value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'string') return false;

  const sanitized = sanitizeBookingField(field, value);
  return sanitized === undefined;
};

interface QuickHelpInfo {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  message?: string;
}

interface BookingEvent {
  type: 'show_confirmation' | 'hide_confirmation' | 'loading_changed' | 'data_updated';
  data: any;
  source: 'voice' | 'chat';
}

interface AlternativeSlot {
  date: string;
  start_time: string;
  end_time?: string;
  formatted_date: string;
  formatted_time: string;
}

interface ConversationState {
  messages: ConversationMessage[];
  context: {
    currentTopic?: string;
    pendingBooking?: BookingInfo;
    pendingBookingSources?: Partial<Record<BookingInfoField, BookingInfoSource>>;
    pendingBookingUpdatedAt?: number;
    pendingBookingSession?: BookingInfoSource;
    pendingQuickHelp?: QuickHelpInfo;
    collectingInfo?: 'booking' | 'quickhelp' | null;
    nextField?: string;
    conversationPhase?: 'initial' | 'collecting' | 'reviewing' | 'submitting' | 'confirming' | 'complete' | 'privacy_choice';
    alternativeSlots?: AlternativeSlot[];
    lastInputTransition?: {
      field: string;
      from: 'voice' | 'text' | 'secure';
      to: 'voice' | 'text' | 'secure';
      success: boolean;
      timestamp: number;
    };
    lastError?: {
      type: 'network' | 'validation' | 'server' | 'timeout' | 'unknown';
      message: string;
      timestamp: number;
      suggestedAction?: string;
    };
  };
  privacy: {
    requestedManualInput?: boolean;
    sensitiveFieldsPreference?: 'voice' | 'manual';
  };
  booking: {
    showConfirmation?: boolean;
    confirmationData?: any;
    isLoading?: boolean;
    source?: 'voice' | 'chat';
  };
}

export class ConversationMemory {
  private state: ConversationState = {
    messages: [],
    context: {
      conversationPhase: 'initial'
    },
    privacy: {},
    booking: {}
  };

  private subscribers: Array<(state: ConversationState) => void> = [];
  private bookingEventSubscribers: Array<(event: BookingEvent) => void> = [];
  private isBookingInfoStale(maxAgeMs: number = BOOKING_STALE_RESET_MS) {
    const pending = this.state.context.pendingBooking || {};
    const hasBookingData = Object.keys(pending).length > 0;
    if (!hasBookingData) {
      return false;
    }

    const lastUpdated = this.state.context.pendingBookingUpdatedAt;
    if (!lastUpdated) {
      return true;
    }

    return Date.now() - lastUpdated > maxAgeMs;
  }

  constructor() {
    // Initialize with welcome message
    this.addMessage('assistant', 'Hi! I\'m here to help you with information, bookings, and support. How can I assist you today?', 'voice');
  }

  subscribe(callback: (state: ConversationState) => void) {
    this.subscribers.push(callback);
    callback(this.state); // Immediate update
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(callback => callback({ ...this.state }));
  }

  addMessage(sender: 'user' | 'assistant', text: string, type: 'voice' | 'chat', metadata?: any) {
    const message: ConversationMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender,
      timestamp: new Date(),
      type,
      metadata: {
        ...metadata,
        transcription_source: type === 'voice' ? 'openai_realtime' : 'direct_input',
        message_length: text.length,
        voice_features: type === 'voice' ? {
          transcription_completed: metadata?.transcription_completed || false,
          source: metadata?.source || 'unknown',
          realtime_api_id: metadata?.message_id || undefined,
          realtime_response_id: metadata?.response_id || undefined
        } : undefined
      }
    };

    this.state.messages.push(message);

    if (this.state.messages.length > MAX_STORED_MESSAGES) {
      console.warn(
        `ConversationMemory: Trimming message history to last ${MAX_STORED_MESSAGES} entries (current: ${this.state.messages.length})`
      );
      this.state.messages = this.state.messages.slice(-MAX_STORED_MESSAGES);
    }
    this.notify();
    
    // Enhanced logging for voice messages
    if (type === 'voice') {
      console.log(`Added ${sender} voice message:`, {
        text: text.substring(0, 100),
        metadata: message.metadata
      });
    }
    
    return message.id;
  }

  updateLastAssistantMessage(text: string) {
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    if (lastMessage && lastMessage.sender === 'assistant') {
      lastMessage.text = text;
    } else {
      this.addMessage('assistant', text, 'voice');
    }
    this.notify();
  }

  appendToLastAssistantMessage(text: string) {
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    if (lastMessage && lastMessage.sender === 'assistant') {
      lastMessage.text += text;
    } else {
      this.addMessage('assistant', text, 'voice');
    }
    this.notify();
  }

  setContext(updates: Partial<ConversationState['context']>) {
    this.state.context = { ...this.state.context, ...updates };
    this.notify();
  }

  setPrivacyPreference(preference: 'voice' | 'manual') {
    this.state.privacy.sensitiveFieldsPreference = preference;
    this.notify();
  }

  requestManualInput() {
    this.state.privacy.requestedManualInput = true;
    this.notify();
  }

  updateBookingInfo(info: Partial<BookingInfo>, source: 'voice' | 'chat' = 'voice') {
    const bookingWasStale = this.isBookingInfoStale();

    if (bookingWasStale && Object.keys(info).length === 0) {
      console.warn('ConversationMemory: Dropping stale booking info with no new updates');
      this.clearBookingInfo(source);
      return;
    }

    const previous = bookingWasStale ? {} : (this.state.context.pendingBooking || {});
    const previousSources = bookingWasStale ? {} : (this.state.context.pendingBookingSources || {});
    const updated = { ...previous } as BookingInfo;
    const updatedSources: Partial<Record<BookingInfoField, BookingInfoSource>> = { ...previousSources };
    let hasChanges = false;

    (Object.entries(info) as [BookingInfoField, unknown][]).forEach(([field, rawValue]) => {
      if (rawValue === undefined || rawValue === null) {
        if (field in updated) {
          delete updated[field];
          delete updatedSources[field];
          hasChanges = true;
        }
        return;
      }

      const sanitized = sanitizeBookingField(field, rawValue);
      if (sanitized === undefined) {
        return;
      }

      const existing = updated[field];
      const existingSource = updatedSources[field];
      const existingIsPlaceholder = isPlaceholderValue(field, existing);
      const canVoiceOverrideChat =
        source === 'voice' &&
        existingSource === 'chat' &&
        (existingIsPlaceholder || bookingWasStale);

      const shouldOverride =
        !existing ||
        (typeof existing === 'string' && existing.trim().length === 0) ||
        source === existingSource ||
        source === 'chat' ||
        canVoiceOverrideChat;

      if (!shouldOverride && source === 'voice') {
        return;
      }

      if (existing === sanitized) {
        if (existingSource !== source) {
          updatedSources[field] = source;
          hasChanges = true;
        }
        return;
      }

      updated[field] = sanitized as any;
      updatedSources[field] = source;
      hasChanges = true;
    });

    if (!hasChanges) {
      return;
    }

    this.state.context.pendingBooking = updated;
    this.state.context.pendingBookingSources = updatedSources;
    this.state.context.pendingBookingUpdatedAt = Date.now();
    this.state.context.pendingBookingSession = source;
    this.notify();

    this.emitBookingEvent({
      type: 'data_updated',
      data: { ...updated },
      source
    });

    // Auto-show booking modal when all required fields are collected
    const hasRequiredFields = Boolean(
      updated.userName?.trim() &&
      updated.userEmail?.trim() &&
      updated.userPhone?.trim()
    );

    console.log('🔄 Required fields check:', {
      userName: updated.userName?.trim(),
      userEmail: updated.userEmail?.trim(),
      userPhone: updated.userPhone?.trim(),
      hasRequiredFields,
      showConfirmation: this.state.booking.showConfirmation
    });

    if (hasRequiredFields && !this.state.booking.showConfirmation) {
      console.log('✅ All required booking fields collected - auto-showing modal');
      this.showBookingConfirmation(updated, source);
    } else if (hasRequiredFields && this.state.booking.showConfirmation) {
      console.log('⚠️ Required fields present but modal already showing');
    } else {
      console.log('⏳ Waiting for more required fields...');
    }
  }

  updateQuickHelpInfo(info: Partial<QuickHelpInfo>) {
    this.state.context.pendingQuickHelp = {
      ...this.state.context.pendingQuickHelp,
      ...info 
    };
    this.notify();
  }

  getConversationHistory(limit: number = HISTORY_EXPORT_LIMIT): Array<{role: string; content: string; timestamp: Date; source: string}> {
    const effectiveLimit = Math.max(0, limit);
    const filteredMessages = this.state.messages.filter(msg => !msg.metadata?.isPrivate);
    const relevantMessages =
      effectiveLimit > 0
        ? filteredMessages.slice(-effectiveLimit)
        : filteredMessages;

    console.log('=== GET CONVERSATION HISTORY ===');
    console.log('📚 Total stored messages:', this.state.messages.length);
    console.log('📚 Filtered messages:', filteredMessages.length);
    console.log('📚 Returning last N messages:', relevantMessages.length, 'of requested limit', effectiveLimit || 'ALL');
    console.log('📚 Sample return set:', relevantMessages.slice(-3));

    const history = relevantMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
      timestamp: msg.timestamp,
      source: msg.type
    }));

    return history;
  }

  // Get conversation history excluding the initial welcome message (for voice re-injection)
  getConversationHistoryForVoice(limit: number = HISTORY_EXPORT_LIMIT): Array<{role: string; content: string; timestamp: Date; source: string}> {
    const effectiveLimit = Math.max(0, limit);
    const filteredMessages = this.state.messages.filter(msg => !msg.metadata?.isPrivate);
    
    // Skip the first assistant message (welcome message) to prevent repetition
    let messagesToUse = filteredMessages;
    if (filteredMessages.length > 0 && filteredMessages[0].sender === 'assistant') {
      messagesToUse = filteredMessages.slice(1);
      console.log('⏭️ Skipping initial welcome message for voice injection');
    }
    
    const relevantMessages =
      effectiveLimit > 0
        ? messagesToUse.slice(-effectiveLimit)
        : messagesToUse;

    console.log('=== GET CONVERSATION HISTORY FOR VOICE ===');
    console.log('📚 Total stored messages:', this.state.messages.length);
    console.log('📚 Messages after skipping welcome:', messagesToUse.length);
    console.log('📚 Returning last N messages:', relevantMessages.length);

    const history = relevantMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
      timestamp: msg.timestamp,
      source: msg.type
    }));

    return history;
  }

  // Check if all required booking fields are complete
  isBookingComplete(): boolean {
    const booking = this.state.context.pendingBooking || {};
    return Boolean(
      booking.userName &&
      booking.userEmail &&
      booking.userPhone &&
      booking.preferredDate &&
      booking.preferredTime
    );
  }

  // Get current booking data for modal
  getBookingData(): BookingInfo {
    return this.state.context.pendingBooking || {};
  }

  shouldShowPrivacyInput(fieldType: 'email' | 'phone'): boolean {
    return this.state.privacy.sensitiveFieldsPreference === 'manual' ||
           this.state.privacy.requestedManualInput === true;
  }

  isCollectingInfo(): boolean {
    return this.state.context.collectingInfo !== null;
  }

  getMessages(): ConversationMessage[] {
    return [...this.state.messages];
  }

  getCurrentContext() {
    return { ...this.state.context };
  }

  getPrivacySettings() {
    return { ...this.state.privacy };
  }

  // Booking event management for voice-chat synchronization
  subscribeToBookingEvents(callback: (event: BookingEvent) => void) {
    this.bookingEventSubscribers.push(callback);
    return () => {
      this.bookingEventSubscribers = this.bookingEventSubscribers.filter(sub => sub !== callback);
    };
  }

  private emitBookingEvent(event: BookingEvent) {
    console.log('🔔 ===== CONVERSATION MEMORY EMITTING BOOKING EVENT =====');
    console.log('🔔 Event type:', event.type);
    console.log('🔔 Event data:', JSON.stringify(event.data, null, 2));
    console.log('🔔 Event source:', event.source);
    console.log('🔔 Number of subscribers:', this.bookingEventSubscribers.length);
    
    this.bookingEventSubscribers.forEach((callback, index) => {
      console.log(`🔔 Calling subscriber ${index + 1} of ${this.bookingEventSubscribers.length}...`);
      callback(event);
      console.log(`🔔 ✅ Subscriber ${index + 1} called`);
    });
    console.log('🔔 ===== BOOKING EVENT EMISSION COMPLETE =====');
  }

  showBookingConfirmation(bookingData: any, source: 'voice' | 'chat' = 'voice') {
    console.log('ConversationMemory: Show booking confirmation:', { bookingData, source });

    const contextUpdates: Partial<ConversationState['context']> = {};

    if (this.state.context.collectingInfo) {
      contextUpdates.collectingInfo = null;
    }

    if (this.state.context.nextField) {
      contextUpdates.nextField = undefined;
    }

    if (this.state.context.conversationPhase !== 'confirming') {
      contextUpdates.conversationPhase = 'confirming';
    }

    if (Object.keys(contextUpdates).length > 0) {
      this.state.context = { ...this.state.context, ...contextUpdates };
    }

    this.state.booking = {
      showConfirmation: true,
      confirmationData: bookingData,
      isLoading: false,
      source
    };
    console.log('📢 State updated:', JSON.stringify(this.state.booking, null, 2));
    
    console.log('📢 Calling notify()...');
    this.notify();
    console.log('📢 ✅ notify() called');
    
    // Emit event for cross-interface synchronization
    console.log('📢 Emitting booking event...');
    this.emitBookingEvent({
      type: 'show_confirmation',
      data: bookingData,
      source
    });
    console.log('📢 ===== SHOW BOOKING CONFIRMATION COMPLETE =====');
  }

  hideBookingConfirmation() {
    console.log('ConversationMemory: Hide booking confirmation');

    const contextUpdates: Partial<ConversationState['context']> = {};

    if (this.state.context.collectingInfo) {
      contextUpdates.collectingInfo = null;
    }

    if (this.state.context.nextField) {
      contextUpdates.nextField = undefined;
    }

    if (this.state.context.conversationPhase !== 'complete') {
      contextUpdates.conversationPhase = 'complete';
    }

    if (Object.keys(contextUpdates).length > 0) {
      this.state.context = { ...this.state.context, ...contextUpdates };
    }

    this.state.booking.showConfirmation = false;
    this.state.booking.confirmationData = null;
    this.notify();

    this.emitBookingEvent({
      type: 'hide_confirmation',
      data: null,
      source: this.state.booking.source || 'voice'
    });

    this.clearBookingInfo(this.state.booking.source || 'voice');
  }

  setBookingLoading(isLoading: boolean) {
    this.state.booking.isLoading = isLoading;
    this.notify();
    
    this.emitBookingEvent({
      type: 'loading_changed',
      data: { isLoading },
      source: this.state.booking.source || 'voice'
    });
  }

  getBookingState() {
    return { ...this.state.booking };
  }

  clear() {
    // Before clearing, trigger conversation summary if there was meaningful interaction
    this.triggerConversationSummary();

    this.state = {
      messages: [],
      context: { conversationPhase: 'initial' },
      privacy: {},
      booking: {}
    };
    this.addMessage('assistant', 'Hi! I\'m here to help you with information, bookings, and support. How can I assist you today?', 'voice');
  }

  clearBookingInfo(source: 'voice' | 'chat' = 'voice') {
    if (!this.state.context.pendingBooking || Object.keys(this.state.context.pendingBooking).length === 0) {
      return;
    }

    this.state.context.pendingBooking = {};
    this.state.context.pendingBookingSources = {};
    this.state.context.pendingBookingUpdatedAt = undefined;
    this.state.context.pendingBookingSession = undefined;
    this.notify();

    this.emitBookingEvent({
      type: 'data_updated',
      data: {},
      source
    });
  }

  isBookingStale(maxAgeMs: number = BOOKING_STALE_RESET_MS) {
    return this.isBookingInfoStale(maxAgeMs);
  }

  // Voice error tracking
  recordVoiceError(fieldType: string, errorType: string, attemptNumber: number) {
    // Add error tracking functionality here
    console.log(`Voice error recorded for ${fieldType}: ${errorType} (attempt ${attemptNumber})`);
  }

  getVoiceErrorHistory() {
    return [];
  }

  getRecentVoiceErrors(fieldType?: string) {
    return [];
  }

  private async triggerConversationSummary() {
    // Only trigger if we have meaningful conversation (2+ exchanges, excluding system messages)
    const meaningfulMessages = this.state.messages.filter(msg => !msg.metadata?.isPrivate);
    if (meaningfulMessages.length < 4) return; // 4 messages = 2 exchanges (user + assistant pairs)

    try {
      // Get current assistant ID from URL or context
      const urlParams = new URLSearchParams(window.location.search);
      const assistantId = urlParams.get('assistant') || sessionStorage.getItem('currentAssistantId');
      
      if (!assistantId) return;

      // Generate a session ID based on current timestamp and some randomness
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store conversations to database first (for summary processing)
      await this.storeConversationsToDatabase(assistantId, sessionId);

      // Import supabase here to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Call the conversation summary function
      const { data, error } = await supabase.functions.invoke('send-conversation-summary', {
        body: {
          assistantId,
          sessionId
        }
      });

      if (error) {
        console.error('Error sending conversation summary:', error);
      } else {
        console.log('Conversation summary sent successfully:', data);
      }
    } catch (error) {
      console.error('Error triggering conversation summary:', error);
    }
  }

  private async storeConversationsToDatabase(assistantId: string, sessionId: string) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Group messages into conversation pairs (user + assistant)
      const conversationPairs = [];
      for (let i = 0; i < this.state.messages.length - 1; i += 2) {
        const userMsg = this.state.messages[i];
        const assistantMsg = this.state.messages[i + 1];
        
        if (userMsg?.sender === 'user' && assistantMsg?.sender === 'assistant') {
          // Skip system/private messages
          if (userMsg.metadata?.isPrivate || assistantMsg.metadata?.isPrivate) continue;
          
          conversationPairs.push({
            assistant_id: assistantId,
            session_id: sessionId,
            user_message: userMsg.text,
            ai_response: assistantMsg.text,
            tool_calls: [],
            created_at: userMsg.timestamp.toISOString()
          });
        }
      }

      if (conversationPairs.length > 0) {
        const { error } = await supabase
          .from('conversations')
          .insert(conversationPairs);
          
        if (error) {
          console.error('Error storing conversations:', error);
        }
      }
    } catch (error) {
      console.error('Error in storeConversationsToDatabase:', error);
    }
  }

  // Check if we should interrupt AI response
  shouldInterruptResponse(): boolean {
    const lastUserMessage = [...this.state.messages]
      .reverse()
      .find(msg => msg.sender === 'user');
    
    if (!lastUserMessage) return false;
    
    // If user just sent a message while AI was responding, interrupt
    const timeSinceLastUser = Date.now() - lastUserMessage.timestamp.getTime();
    return timeSinceLastUser < 2000; // Interrupt if user spoke in last 2 seconds
  }

  // Track when user starts speaking to interrupt repetitive responses
  userStartedSpeaking() {
    this.addMessage('user', '[User started speaking]', 'voice', { isPrivate: true });
  }

  // Mark when AI response should be truncated
  markResponseTruncated() {
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    if (lastMessage && lastMessage.sender === 'assistant') {
      lastMessage.metadata = { ...lastMessage.metadata, truncated: true };
      this.notify();
    }
  }

  // Clear all messages
  clearMessages() {
    this.state.messages = [];
    this.notify();
  }

  setAlternativeSlots(slots: AlternativeSlot[]) {
    this.state.context.alternativeSlots = slots;
    this.notify();
  }

  selectAlternativeSlot(index: number) {
    const slots = this.state.context.alternativeSlots;
    if (!slots || index < 0 || index >= slots.length) {
      return null;
    }
    
    const selected = slots[index];
    
    // Update pending booking with selected time
    if (this.state.context.pendingBooking) {
      this.state.context.pendingBooking.preferredDate = selected.date;
      this.state.context.pendingBooking.preferredTime = selected.start_time;
      this.notify();
    }
    
    return selected;
  }

  getAlternativeSlots(): AlternativeSlot[] {
    return this.state.context.alternativeSlots || [];
  }

  clearAlternativeSlots() {
    this.state.context.alternativeSlots = undefined;
    this.notify();
  }
}

export { type AlternativeSlot };
export const conversationMemory = new ConversationMemory();