import { conversationMemory } from './ConversationMemory';

export interface VoiceTransitionState {
  previousMethod: 'voice' | 'text' | 'secure';
  currentMethod: 'voice' | 'text' | 'secure';
  fieldType: string;
  timestamp: number;
  success: boolean;
}

class VoiceTransitionManager {
  private transitions: VoiceTransitionState[] = [];
  private maxHistory = 50;

  // Record a transition between input methods
  recordTransition(
    fieldType: string,
    previousMethod: 'voice' | 'text' | 'secure',
    currentMethod: 'voice' | 'text' | 'secure',
    success: boolean = true
  ) {
    const transition: VoiceTransitionState = {
      fieldType,
      previousMethod,
      currentMethod,
      timestamp: Date.now(),
      success
    };

    this.transitions.unshift(transition);
    
    // Keep only recent transitions
    if (this.transitions.length > this.maxHistory) {
      this.transitions = this.transitions.slice(0, this.maxHistory);
    }

    // Log to conversation memory for analytics
    conversationMemory.setContext({
      lastInputTransition: {
        field: fieldType,
        from: previousMethod,
        to: currentMethod,
        success,
        timestamp: transition.timestamp
      }
    });

    // Note: Enhanced analytics would be added when ConversationMemory interface is updated

    // Trigger smart notifications for UX improvements
    this.checkForUXSuggestions(transition);
  }

  // Get recent success rate for smart feedback
  private getRecentSuccessRate(): number {
    const recent = this.transitions.slice(0, 10);
    if (recent.length === 0) return 1;
    return recent.filter(t => t.success).length / recent.length;
  }

  // Check for UX improvement opportunities
  private checkForUXSuggestions(transition: VoiceTransitionState) {
    const recentFailures = this.transitions
      .slice(0, 5)
      .filter(t => t.currentMethod === transition.currentMethod && !t.success).length;

    // Note: UX suggestions would be stored in ConversationMemory when interface supports it
    if (recentFailures >= 2 && transition.currentMethod === 'voice') {
      console.log('Voice input suggestion: Consider switching to text input for better accuracy');
    }

    if (this.isFrequentSwitcher() && this.transitions.length > 10) {
      console.log('UX suggestion: Consider sticking with preferred method for faster completion');
    }
  }

  // Get user's preferred method based on recent transitions
  getPreferredMethod(fieldType?: string): 'voice' | 'text' | 'secure' {
    const recentTransitions = this.transitions
      .filter(t => !fieldType || t.fieldType === fieldType)
      .filter(t => t.success && t.timestamp > Date.now() - 300000) // Last 5 minutes
      .slice(0, 10); // Last 10 transitions

    if (recentTransitions.length === 0) return 'text';

    // Count successful method usage
    const methodCounts = recentTransitions.reduce((counts, transition) => {
      counts[transition.currentMethod] = (counts[transition.currentMethod] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Return most frequently used method
    const [preferredMethod] = Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)[0] || ['text', 0];

    return preferredMethod as 'voice' | 'text' | 'secure';
  }

  // Check if user frequently switches methods (might indicate UX issues)
  isFrequentSwitcher(): boolean {
    const recentTransitions = this.transitions
      .filter(t => t.timestamp > Date.now() - 600000) // Last 10 minutes
      .slice(0, 20);

    if (recentTransitions.length < 5) return false;

    // Count method switches
    let switches = 0;
    for (let i = 1; i < recentTransitions.length; i++) {
      if (recentTransitions[i].currentMethod !== recentTransitions[i-1].currentMethod) {
        switches++;
      }
    }

    return switches / recentTransitions.length > 0.4; // More than 40% switches
  }

  // Get transition statistics for a field type
  getFieldStatistics(fieldType: string) {
    const fieldTransitions = this.transitions.filter(t => t.fieldType === fieldType);
    
    if (fieldTransitions.length === 0) {
      return {
        totalTransitions: 0,
        successRate: 0,
        preferredMethod: 'text' as const,
        avgTimeToComplete: 0
      };
    }

    const successRate = fieldTransitions.filter(t => t.success).length / fieldTransitions.length;
    const preferredMethod = this.getPreferredMethod(fieldType);
    
    // Calculate average time between transitions (completion time proxy)
    const completionTimes = [];
    for (let i = 1; i < fieldTransitions.length; i++) {
      const timeDiff = fieldTransitions[i-1].timestamp - fieldTransitions[i].timestamp;
      if (timeDiff > 0 && timeDiff < 60000) { // Less than 1 minute
        completionTimes.push(timeDiff);
      }
    }

    const avgTimeToComplete = completionTimes.length > 0 
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    return {
      totalTransitions: fieldTransitions.length,
      successRate,
      preferredMethod,
      avgTimeToComplete
    };
  }

  // Generate smart suggestions for improving user experience
  getSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.isFrequentSwitcher()) {
      suggestions.push("You seem to switch input methods frequently. Consider sticking with your preferred method for faster completion.");
    }

    const voiceFailures = this.transitions
      .filter(t => t.currentMethod === 'voice' && !t.success)
      .length;

    if (voiceFailures > 2) {
      suggestions.push("Having trouble with voice input? Try speaking more clearly or use text input for better accuracy.");
    }

    const secureUsage = this.transitions
      .filter(t => t.currentMethod === 'secure')
      .length;

    if (secureUsage === 0) {
      suggestions.push("For sensitive information like emails or phone numbers, consider using secure input for better privacy.");
    }

    return suggestions;
  }

  // Clear transition history
  clearHistory() {
    this.transitions = [];
    conversationMemory.setContext({
      lastInputTransition: undefined
    });
  }

  // Export data for analytics
  exportData() {
    return {
      transitions: this.transitions,
      metadata: {
        preferredMethod: this.getPreferredMethod(),
        isFrequentSwitcher: this.isFrequentSwitcher(),
        suggestions: this.getSuggestions(),
        exportTime: Date.now()
      }
    };
  }
}

// Singleton instance
export const voiceTransitions = new VoiceTransitionManager();

// Helper function to provide smart acknowledgments based on transition context
export const getVoiceAcknowledgment = (
  fieldType: string,
  method: 'voice' | 'text' | 'secure',
  success: boolean
): string => {
  const stats = voiceTransitions.getFieldStatistics(fieldType);
  
  if (!success) {
    return method === 'voice' 
      ? "I didn't catch that. Would you like to try again or switch to typing?"
      : "There was an issue with that input. Please try again.";
  }

  if (method === 'voice') {
    if (stats.totalTransitions === 0) {
      return "Great! I've captured your information via voice.";
    } else if (stats.preferredMethod === 'voice') {
      return "Perfect! Voice input received.";
    } else {
      return "Got it! I've recorded that information.";
    }
  } else if (method === 'secure') {
    return "Thank you for using secure input. Your information is protected.";
  } else {
    return "Information updated successfully.";
  }
};

// Helper to suggest the best input method for a field
export const suggestInputMethod = (fieldType: string): 'voice' | 'text' | 'secure' => {
  const sensitiveFields = ['email', 'phone', 'ssn', 'credit_card', 'password'];
  
  if (sensitiveFields.some(field => fieldType.toLowerCase().includes(field))) {
    return 'secure';
  }

  return voiceTransitions.getPreferredMethod(fieldType);
};
