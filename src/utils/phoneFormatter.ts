/**
 * Format phone number for display with proper spacing
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Handle international format (+44...)
  if (cleaned.startsWith('+44')) {
    const number = cleaned.slice(3);
    if (number.length === 10) {
      return `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
    }
    return cleaned;
  }
  
  // Handle US format (+1...)
  if (cleaned.startsWith('+1')) {
    const number = cleaned.slice(2);
    if (number.length === 10) {
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    return cleaned;
  }
  
  // Handle 10-digit US numbers without country code
  if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Handle 11-digit US numbers (1 + 10 digits)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.slice(1);
    return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  }
  
  // Return cleaned if can't format
  return cleaned;
};

/**
 * Format phone number for voice speaking (space between each digit)
 */
export const speakPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Convert to array of individual characters for clear pronunciation
  return cleaned.split('').join(' ');
};

/**
 * Detect if user is on mobile device
 */
export const isMobileDevice = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};
