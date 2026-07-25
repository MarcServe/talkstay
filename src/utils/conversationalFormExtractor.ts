/**
 * ConversationalFormExtractor - Intelligent data extraction from natural conversation
 * Flexible field extraction based on form configuration
 */

interface Topic {
  id: string;
  name: string;
  aiInstruction: string;
  dataPoints: string[];
  required: boolean;
}

interface ExtractionResult {
  [key: string]: any;
}

export class ConversationalFormExtractor {
  /**
   * Extract data from natural conversation based on topics configuration
   */
  extractFromConversation(
    message: string,
    topics: Topic[],
    currentData: Record<string, any>
  ): ExtractionResult {
    const extracted: ExtractionResult = {};
    const lowerMessage = message.toLowerCase();

    // Extract standard contact fields
    const name = this.extractName(message, currentData);
    if (name) extracted.name = name;

    const email = this.extractEmail(message);
    if (email) extracted.email = email;

    const phone = this.extractPhone(message);
    if (phone) extracted.phone = phone;

    // Extract custom fields based on topic data points
    topics.forEach(topic => {
      topic.dataPoints.forEach(field => {
        // Skip if already collected
        if (currentData[field]) return;

        const value = this.extractCustomField(field, message, lowerMessage);
        if (value) extracted[field] = value;
      });
    });

    return extracted;
  }

  /**
   * Extract name from message
   */
  private extractName(message: string, currentData: Record<string, any>): string | null {
    // Skip if already have name
    if (currentData.name) return null;

    const patterns = [
      /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/i, // Just a name
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract email from message
   */
  private extractEmail(message: string): string | null {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = message.match(emailPattern);
    return match ? match[0].toLowerCase() : null;
  }

  /**
   * Extract phone number from message
   */
  private extractPhone(message: string): string | null {
    const phonePatterns = [
      /\b(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/,
      /\b([0-9]{3})[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/,
      /\b([0-9]{10,11})\b/,
    ];

    for (const pattern of phonePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[0].replace(/\D/g, '');
      }
    }

    return null;
  }

  /**
   * Extract custom fields based on field type
   */
  private extractCustomField(
    fieldType: string,
    message: string,
    lowerMessage: string
  ): any {
    switch (fieldType) {
      case 'budget':
      case 'budgetRange':
        return this.extractBudget(message, lowerMessage);
      
      case 'timeline':
      case 'deadline':
        return this.extractTimeline(message, lowerMessage);
      
      case 'projectType':
      case 'serviceType':
        return this.extractProjectType(message, lowerMessage);
      
      case 'company':
      case 'companyName':
        return this.extractCompany(message);
      
      case 'currentStage':
        return this.extractCurrentStage(message, lowerMessage);
      
      case 'goals':
      case 'objectives':
        return this.extractGoals(message, lowerMessage);
      
      case 'teamSize':
        return this.extractTeamSize(message, lowerMessage);
      
      case 'contactPreference':
        return this.extractContactPreference(message, lowerMessage);
      
      default:
        return this.extractGeneric(fieldType, message, lowerMessage);
    }
  }

  /**
   * Extract budget information
   */
  private extractBudget(message: string, lowerMessage: string): string | null {
    // Match various budget formats
    const patterns = [
      /\$\s?(\d+[,.]?\d*)\s?k/i, // $50k
      /\$\s?(\d+[,.]?\d*)/i, // $5000
      /(\d+[,.]?\d*)\s?(?:thousand|k)/i, // 50 thousand
      /budget.*?(\d+[,.]?\d*)/, // budget is 50000
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        let amount = match[1].replace(/,/g, '');
        if (lowerMessage.includes('k') || lowerMessage.includes('thousand')) {
          amount = (parseFloat(amount) * 1000).toString();
        }
        return `$${parseFloat(amount).toLocaleString()}`;
      }
    }

    return null;
  }

  /**
   * Extract timeline information
   */
  private extractTimeline(message: string, lowerMessage: string): string | null {
    const patterns = [
      /(\d+)\s+(day|week|month|year)s?/i,
      /(q[1-4])\s*(\d{4})?/i, // Q1 2025
      /(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      /by\s+([a-z]+\s+\d+)/i, // by March 15
      /(asap|urgent|immediately)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Extract project/service type
   */
  private extractProjectType(message: string, lowerMessage: string): string | null {
    const types = [
      'website', 'web app', 'mobile app', 'landing page', 'ecommerce',
      'redesign', 'consultation', 'support', 'maintenance', 'development',
      'design', 'branding', 'marketing', 'seo', 'content'
    ];

    for (const type of types) {
      if (lowerMessage.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }

    return null;
  }

  /**
   * Extract company name
   */
  private extractCompany(message: string): string | null {
    const patterns = [
      /(?:at|from|with)\s+([A-Z][a-zA-Z0-9\s&]+(?:Inc|LLC|Ltd)?)/,
      /company.*?([A-Z][a-zA-Z0-9\s&]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract current project stage
   */
  private extractCurrentStage(message: string, lowerMessage: string): string | null {
    const stages = [
      'planning', 'design', 'development', 'testing', 'launch', 'maintenance',
      'just starting', 'in progress', 'nearly complete', 'idea stage'
    ];

    for (const stage of stages) {
      if (lowerMessage.includes(stage)) {
        return stage.charAt(0).toUpperCase() + stage.slice(1);
      }
    }

    return null;
  }

  /**
   * Extract goals/objectives
   */
  private extractGoals(message: string, lowerMessage: string): string | null {
    if (lowerMessage.includes('goal') || lowerMessage.includes('want to') || 
        lowerMessage.includes('need to') || lowerMessage.includes('looking to')) {
      // Return the message as the goal
      return message;
    }
    return null;
  }

  /**
   * Extract team size
   */
  private extractTeamSize(message: string, lowerMessage: string): string | null {
    const match = message.match(/(\d+)\s*(?:people|person|member|employee)s?/i);
    if (match) {
      return match[1];
    }
    return null;
  }

  /**
   * Extract contact preference
   */
  private extractContactPreference(message: string, lowerMessage: string): string | null {
    const preferences = ['email', 'phone', 'text', 'call', 'message'];
    
    for (const pref of preferences) {
      if (lowerMessage.includes(pref)) {
        return pref.charAt(0).toUpperCase() + pref.slice(1);
      }
    }

    return null;
  }

  /**
   * Generic extraction for unknown field types
   */
  private extractGeneric(fieldType: string, message: string, lowerMessage: string): string | null {
    // If the message mentions the field type, return the message
    const fieldLower = fieldType.toLowerCase();
    if (lowerMessage.includes(fieldLower)) {
      return message;
    }
    return null;
  }

  /**
   * Determine next topic to explore based on what's missing
   */
  determineNextTopic(
    topics: Topic[],
    collectedData: Record<string, any>
  ): Topic | null {
    // Find first required topic with missing data
    for (const topic of topics) {
      if (topic.required) {
        const hasAllData = topic.dataPoints.every(field => collectedData[field]);
        if (!hasAllData) {
          return topic;
        }
      }
    }

    // Find first optional topic with missing data
    for (const topic of topics) {
      if (!topic.required) {
        const hasAllData = topic.dataPoints.every(field => collectedData[field]);
        if (!hasAllData) {
          return topic;
        }
      }
    }

    return null; // All topics covered
  }

  /**
   * Check if conversation is complete (all required fields filled)
   */
  isConversationComplete(
    topics: Topic[],
    collectedData: Record<string, any>
  ): boolean {
    const requiredTopics = topics.filter(t => t.required);
    
    return requiredTopics.every(topic =>
      topic.dataPoints.every(field => 
        collectedData[field] && collectedData[field] !== ''
      )
    );
  }

  /**
   * Get list of missing required fields
   */
  getMissingRequiredFields(
    topics: Topic[],
    collectedData: Record<string, any>
  ): string[] {
    const missing: string[] = [];
    
    topics.forEach(topic => {
      if (topic.required) {
        topic.dataPoints.forEach(field => {
          if (!collectedData[field]) {
            missing.push(field);
          }
        });
      }
    });

    return missing;
  }
}

// Export singleton instance
export const conversationalFormExtractor = new ConversationalFormExtractor();
