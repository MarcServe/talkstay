import { conversationMemory } from './ConversationMemory';

export interface BookingError {
  type: 'network' | 'validation' | 'server' | 'timeout' | 'unknown';
  message: string;
  code?: string;
  retryable: boolean;
  suggestedAction?: 'retry' | 'whatsapp' | 'manual_contact' | 'fix_data';
}

export class BookingErrorHandler {
  private static maxRetries = 3;
  private static retryDelay = 1000; // Base delay in ms

  static parseError(error: any): BookingError {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Unable to connect to the booking service. Please check your internet connection.',
        retryable: true,
        suggestedAction: 'retry'
      };
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'The booking request timed out. Please try again.',
        retryable: true,
        suggestedAction: 'retry'
      };
    }

    // Server response errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return {
            type: 'validation',
            message: 'Please check that all booking information is correct and complete.',
            code: '400',
            retryable: false,
            suggestedAction: 'fix_data'
          };
        
        case 409:
          return {
            type: 'server',
            message: 'This time slot is no longer available. Please choose a different time.',
            code: '409',
            retryable: false,
            suggestedAction: 'whatsapp'
          };
        
        case 429:
          return {
            type: 'server',
            message: 'Too many booking requests. Please wait a moment and try again.',
            code: '429',
            retryable: true,
            suggestedAction: 'retry'
          };
        
        case 500:
        case 502:
        case 503:
          return {
            type: 'server',
            message: 'The booking service is temporarily unavailable. Please try again shortly.',
            code: error.status.toString(),
            retryable: true,
            suggestedAction: 'retry'
          };
        
        default:
          return {
            type: 'server',
            message: `Server error (${error.status}). Please try again or contact us directly.`,
            code: error.status.toString(),
            retryable: true,
            suggestedAction: 'whatsapp'
          };
      }
    }

    // Validation errors from our own checks
    if (error.message?.includes('validation') || error.message?.includes('required')) {
      return {
        type: 'validation',
        message: error.message || 'Please fill out all required booking information.',
        retryable: false,
        suggestedAction: 'fix_data'
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      message: 'An unexpected error occurred. Please try again or contact us for assistance.',
      retryable: true,
      suggestedAction: 'whatsapp'
    };
  }

  static async retryWithBackoff<T>(
    asyncFn: () => Promise<T>,
    maxRetries: number = BookingErrorHandler.maxRetries
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;
        
        const bookingError = this.parseError(error);
        
        // Don't retry non-retryable errors
        if (!bookingError.retryable || attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Booking attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      }
    }
    
    throw lastError;
  }

  static logError(error: BookingError, context?: any) {
    console.error('Booking Error:', {
      type: error.type,
      message: error.message,
      code: error.code,
      retryable: error.retryable,
      suggestedAction: error.suggestedAction,
      context
    });

    // Store error in conversation memory for analytics
    conversationMemory.setContext({
      lastError: {
        type: error.type,
        message: error.message,
        timestamp: Date.now(),
        suggestedAction: error.suggestedAction
      }
    });
  }

  static getRetryMessage(attempt: number, maxRetries: number): string {
    if (attempt === 1) {
      return 'Trying again...';
    } else if (attempt < maxRetries) {
      return `Retry attempt ${attempt} of ${maxRetries}...`;
    } else {
      return 'Final attempt...';
    }
  }

  static getSuggestedActionMessage(action: BookingError['suggestedAction']): string {
    switch (action) {
      case 'retry':
        return 'Please try submitting your booking again.';
      case 'whatsapp':
        return 'Try continuing on WhatsApp for personalized assistance.';
      case 'manual_contact':
        return 'Contact the business directly to complete your booking.';
      case 'fix_data':
        return 'Please check and correct your booking information.';
      default:
        return 'Please try again or contact us for help.';
    }
  }
}

// Utility function to validate booking data before submission
export const validateBookingData = (bookingData: any): BookingError | null => {
  const requiredFields = ['userEmail', 'userPhone', 'preferredDate'];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!bookingData[field] || bookingData[field].trim() === '') {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      type: 'validation',
      message: `Please provide: ${missingFields.join(', ').replace(/([A-Z])/g, ' $1').toLowerCase()}`,
      retryable: false,
      suggestedAction: 'fix_data'
    };
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(bookingData.userEmail)) {
    return {
      type: 'validation',
      message: 'Please provide a valid email address.',
      retryable: false,
      suggestedAction: 'fix_data'
    };
  }

  // Phone validation
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(bookingData.userPhone.replace(/\s/g, ''))) {
    return {
      type: 'validation',
      message: 'Please provide a valid phone number.',
      retryable: false,
      suggestedAction: 'fix_data'
    };
  }

  return null; // No validation errors
};

// Enhanced fetch function with timeout and error handling
export const bookingFetch = async (url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
};