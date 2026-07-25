/**
 * Enhanced Phone Number Formatting with International Support
 * Supports multiple country formats and intelligent formatting
 */

interface PhoneFormat {
  country: string;
  code: string;
  pattern: RegExp;
  format: (number: string) => string;
}

const PHONE_FORMATS: PhoneFormat[] = [
  // United States/Canada
  {
    country: 'US/CA',
    code: '+1',
    pattern: /^1?(\d{3})(\d{3})(\d{4})$/,
    format: (n) => n.replace(/^1?(\d{3})(\d{3})(\d{4})$/, '+1 ($1) $2-$3')
  },
  // United Kingdom
  {
    country: 'UK',
    code: '+44',
    pattern: /^44?(\d{2,4})(\d{6,7})$/,
    format: (n) => n.replace(/^44?(\d{2,4})(\d{6,7})$/, '+44 $1 $2')
  },
  // Australia
  {
    country: 'AU',
    code: '+61',
    pattern: /^61?(\d{1})(\d{4})(\d{4})$/,
    format: (n) => n.replace(/^61?(\d{1})(\d{4})(\d{4})$/, '+61 $1 $2 $3')
  },
  // Germany
  {
    country: 'DE',
    code: '+49',
    pattern: /^49?(\d{3,4})(\d{7,9})$/,
    format: (n) => n.replace(/^49?(\d{3,4})(\d{7,9})$/, '+49 $1 $2')
  },
  // France
  {
    country: 'FR',
    code: '+33',
    pattern: /^33?(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})$/,
    format: (n) => n.replace(/^33?(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})$/, '+33 $1 $2 $3 $4 $5')
  },
  // Japan
  {
    country: 'JP',
    code: '+81',
    pattern: /^81?(\d{1,4})(\d{1,4})(\d{4})$/,
    format: (n) => n.replace(/^81?(\d{1,4})(\d{1,4})(\d{4})$/, '+81 $1 $2 $3')
  },
  // China
  {
    country: 'CN',
    code: '+86',
    pattern: /^86?(\d{3})(\d{4})(\d{4})$/,
    format: (n) => n.replace(/^86?(\d{3})(\d{4})(\d{4})$/, '+86 $1 $2 $3')
  },
  // India
  {
    country: 'IN',
    code: '+91',
    pattern: /^91?(\d{5})(\d{5})$/,
    format: (n) => n.replace(/^91?(\d{5})(\d{5})$/, '+91 $1 $2')
  }
];

/**
 * Enhanced phone number formatting with international support
 */
export const formatPhoneNumberInternational = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  // Clean the number
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Try to match against known formats
  for (const format of PHONE_FORMATS) {
    if (format.pattern.test(cleaned)) {
      return format.format(cleaned);
    }
  }

  // Fallback: Basic international format
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }

  // Default US format fallback
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '+1 ($1) $2-$3');
  }

  return phoneNumber;
};

/**
 * Detect country code from phone number
 */
export const detectCountryCode = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');

  for (const format of PHONE_FORMATS) {
    if (format.pattern.test(cleaned)) {
      return format.country;
    }
  }

  return 'Unknown';
};

/**
 * Validate international phone number
 */
export const isValidInternationalPhone = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Must be at least 10 digits
  if (cleaned.length < 10) return false;

  // Must be at most 15 digits (ITU-T E.164 standard)
  if (cleaned.length > 15) return false;

  return true;
};

/**
 * Format for voice readout with international support
 */
export const speakPhoneNumberInternational = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code pronunciation
  for (const format of PHONE_FORMATS) {
    if (format.pattern.test(cleaned)) {
      const countryCodeDigits = format.code.slice(1).split('').join(' ');
      const remainingDigits = cleaned.slice(format.code.length - 1).split('').join(', ');
      return `${countryCodeDigits}, ${remainingDigits}`;
    }
  }

  // Fallback
  return cleaned.split('').join(', ');
};
