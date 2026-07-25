// Utility for detecting sensitive data in user input

export interface DetectedData {
  type: 'email' | 'phone';
  value: string;
  original: string;
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

export const detectSensitiveData = (text: string): DetectedData | null => {
  // Check for email first
  const emailMatch = text.match(EMAIL_REGEX);
  if (emailMatch && emailMatch[0]) {
    return {
      type: 'email',
      value: emailMatch[0],
      original: text
    };
  }

  // Check for phone number
  const phoneMatch = text.match(PHONE_REGEX);
  if (phoneMatch && phoneMatch[0]) {
    // Clean phone number
    const cleanedPhone = phoneMatch[0].replace(/[^\d+]/g, '');
    if (cleanedPhone.length >= 10) {
      return {
        type: 'phone',
        value: phoneMatch[0],
        original: text
      };
    }
  }

  return null;
};

export const removeSensitiveData = (text: string, detectedData: DetectedData): string => {
  return text.replace(detectedData.value, '[REDACTED]');
};
