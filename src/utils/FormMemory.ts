/**
 * FormMemory - Manages form conversation state independently from ConversationMemory
 * Handles data collection, progress tracking, and real-time updates for voice forms
 */

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface FormContext {
  formId: string;
  sessionId: string;
  collectedData: Record<string, any>;
  conversationTranscript: Message[];
  startedAt: Date;
  lastActivity: Date;
  completionTimeSeconds?: number;
}

type FormDataSubscriber = (data: Record<string, any>) => void;

export class FormMemory {
  private contexts: Map<string, FormContext> = new Map();
  private subscribers: Map<string, FormDataSubscriber[]> = new Map();

  /**
   * Initialize a new form conversation
   */
  initializeForm(formId: string, sessionId: string): void {
    const context: FormContext = {
      formId,
      sessionId,
      collectedData: {},
      conversationTranscript: [],
      startedAt: new Date(),
      lastActivity: new Date(),
    };

    this.contexts.set(sessionId, context);
    console.log(`[FormMemory] Initialized form session: ${sessionId}`);
  }

  /**
   * Get form context by session ID
   */
  getFormContext(sessionId: string): FormContext | null {
    return this.contexts.get(sessionId) || null;
  }

  /**
   * Update collected form data and notify subscribers
   */
  updateFormData(sessionId: string, data: Record<string, any>): void {
    const context = this.contexts.get(sessionId);
    if (!context) {
      console.warn(`[FormMemory] No context found for session: ${sessionId}`);
      return;
    }

    // Merge new data with existing
    context.collectedData = {
      ...context.collectedData,
      ...data,
    };
    context.lastActivity = new Date();

    this.contexts.set(sessionId, context);

    // Notify all subscribers
    this.notifySubscribers(sessionId, context.collectedData);

    console.log(`[FormMemory] Updated data for session ${sessionId}:`, data);
  }

  /**
   * Add a message to the conversation transcript
   */
  addMessage(sessionId: string, sender: 'user' | 'assistant', text: string): void {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    const message: Message = {
      sender,
      text,
      timestamp: new Date(),
    };

    context.conversationTranscript.push(message);
    context.lastActivity = new Date();

    this.contexts.set(sessionId, context);
  }

  /**
   * Subscribe to form data updates (for real-time UI updates)
   */
  subscribeToFormData(sessionId: string, callback: FormDataSubscriber): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, []);
    }

    this.subscribers.get(sessionId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(sessionId);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify all subscribers of data changes
   */
  private notifySubscribers(sessionId: string, data: Record<string, any>): void {
    const subscribers = this.subscribers.get(sessionId);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }

  /**
   * Calculate form progress based on required fields
   */
  getFormProgress(sessionId: string, requiredFields: string[]): number {
    const context = this.contexts.get(sessionId);
    if (!context) return 0;

    const filledFields = requiredFields.filter(
      field => context.collectedData[field] && context.collectedData[field] !== ''
    );

    return Math.round((filledFields.length / requiredFields.length) * 100);
  }

  /**
   * Check if form can be submitted (all required fields filled)
   */
  canSubmit(sessionId: string, requiredFields: string[]): boolean {
    const context = this.contexts.get(sessionId);
    if (!context) return false;

    return requiredFields.every(
      field => context.collectedData[field] && context.collectedData[field] !== ''
    );
  }

  /**
   * Get field value
   */
  getFieldValue(sessionId: string, fieldName: string): any {
    const context = this.contexts.get(sessionId);
    return context?.collectedData[fieldName] || null;
  }

  /**
   * Update a specific field value
   */
  updateField(sessionId: string, fieldName: string, value: any): void {
    this.updateFormData(sessionId, { [fieldName]: value });
  }

  /**
   * Get conversation transcript
   */
  getConversationTranscript(sessionId: string): Message[] {
    const context = this.contexts.get(sessionId);
    return context?.conversationTranscript || [];
  }

  /**
   * Mark form as completed and calculate duration
   */
  completeForm(sessionId: string): void {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    const endTime = new Date();
    const durationMs = endTime.getTime() - context.startedAt.getTime();
    context.completionTimeSeconds = Math.round(durationMs / 1000);

    this.contexts.set(sessionId, context);

    console.log(`[FormMemory] Form completed in ${context.completionTimeSeconds}s`);
  }

  /**
   * Get all collected data for submission
   */
  getSubmissionData(sessionId: string): {
    collectedData: Record<string, any>;
    conversationTranscript: Message[];
    completionTimeSeconds?: number;
  } | null {
    const context = this.contexts.get(sessionId);
    if (!context) return null;

    return {
      collectedData: context.collectedData,
      conversationTranscript: context.conversationTranscript,
      completionTimeSeconds: context.completionTimeSeconds,
    };
  }

  /**
   * Clear form context (cleanup after submission)
   */
  clearForm(sessionId: string): void {
    this.contexts.delete(sessionId);
    this.subscribers.delete(sessionId);
    console.log(`[FormMemory] Cleared form session: ${sessionId}`);
  }

  /**
   * Clear all form sessions (for complete reset)
   */
  clearAllForms(): void {
    const sessionCount = this.contexts.size;
    this.contexts.clear();
    this.subscribers.clear();
    console.log(`[FormMemory] Cleared all form sessions (${sessionCount} sessions)`);
  }

  /**
   * Get all active sessions (for debugging)
   */
  getActiveSessions(): string[] {
    return Array.from(this.contexts.keys());
  }
}

// Export singleton instance
export const formMemory = new FormMemory();
