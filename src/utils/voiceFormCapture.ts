import { VoiceFormField, VoiceFormFieldType, ValidationResult } from '@/types/voiceForm';
import { parseNaturalDate, parseNaturalTime, formatDateHuman } from '@/utils/naturalDateParser';

/**
 * VoiceFormFieldCapture - Generalized field extraction and validation for voice forms
 */
export class VoiceFormFieldCapture {
  /**
   * Extract field value from natural language input based on field type
   */
  extractFieldValue(field: VoiceFormField, rawInput: string): string | null {
    const normalized = rawInput.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;

    switch (field.type) {
      case 'email':
        return this.extractEmail(normalized);
      case 'phone':
        return this.extractPhone(normalized);
      case 'date':
        return this.extractDate(normalized);
      case 'time':
        return this.extractTime(normalized);
      case 'number':
        return this.extractNumber(normalized);
      case 'select':
        return this.extractOption(normalized, field.validation?.options);
      case 'multiselect':
        return this.extractMultipleOptions(normalized, field.validation?.options);
      case 'text':
      case 'textarea':
      default:
        return this.extractText(normalized);
    }
  }

  /**
   * Validate extracted value against field rules
   */
  validateField(field: VoiceFormField, value: string): ValidationResult {
    if (!value && field.required) {
      return { isValid: false, error: `${field.label} is required` };
    }

    if (!value) {
      return { isValid: true, normalizedValue: value };
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        return this.validateEmail(value);
      case 'phone':
        return this.validatePhone(value);
      case 'number':
        return this.validateNumber(value, field.validation);
      case 'date':
        return this.validateDate(value);
      case 'time':
        return this.validateTime(value);
      case 'select':
        return this.validateOption(value, field.validation?.options);
      case 'multiselect':
        return this.validateMultipleOptions(value, field.validation?.options);
      default:
        return this.validateText(value, field.validation);
    }
  }

  /**
   * Determine if field should use secure (manual) input
   */
  requiresSecureInput(field: VoiceFormField): boolean {
    return field.privacyLevel === 'private';
  }

  // ========== EMAIL ==========
  private extractEmail(text: string): string | null {
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return emailMatch ? emailMatch[0].toLowerCase() : null;
  }

  private validateEmail(email: string): ValidationResult {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailPattern.test(email);
    return {
      isValid,
      error: isValid ? undefined : 'Invalid email format',
      normalizedValue: email.toLowerCase()
    };
  }

  // ========== PHONE ==========
  private extractPhone(text: string): string | null {
    const digitsOnly = text.replace(/\D/g, '');
    if (digitsOnly.length < 7) return null;
    const hasCountryCode = text.trim().startsWith('+');
    return hasCountryCode ? `+${digitsOnly}` : digitsOnly;
  }

  private validatePhone(phone: string): ValidationResult {
    const cleanPhone = phone.replace(/\D/g, '');
    const isValid = cleanPhone.length >= 7 && cleanPhone.length <= 15;
    return {
      isValid,
      error: isValid ? undefined : 'Invalid phone number format',
      normalizedValue: phone
    };
  }

  // ========== NUMBER ==========
  private extractNumber(text: string): string | null {
    const numberMatch = text.match(/-?\d+\.?\d*/);
    return numberMatch ? numberMatch[0] : null;
  }

  private validateNumber(value: string, validation?: VoiceFormField['validation']): ValidationResult {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { isValid: false, error: 'Must be a valid number' };
    }

    if (validation?.min !== undefined && num < validation.min) {
      return { isValid: false, error: `Must be at least ${validation.min}` };
    }

    if (validation?.max !== undefined && num > validation.max) {
      return { isValid: false, error: `Must be at most ${validation.max}` };
    }

    return { isValid: true, normalizedValue: num };
  }

  // ========== DATE ==========
  private extractDate(text: string): string | null {
    // Try ISO format first
    const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];

    // Try common numeric formats
    const dateMatch = text.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/);
    if (dateMatch) {
      const parts = dateMatch[0].split(/[-\/]/);
      if (parts.length === 3) {
        const [month, day, year] = parts;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // Fall back to natural language parsing
    const naturalDate = parseNaturalDate(text);
    if (naturalDate) return naturalDate;

    return null;
  }

  private validateDate(date: string): ValidationResult {
    const parsed = new Date(date + 'T12:00:00');
    const isValid = !isNaN(parsed.getTime());
    return {
      isValid,
      error: isValid ? undefined : 'Invalid date format',
      normalizedValue: isValid ? formatDateHuman(date) : undefined
    };
  }

  // ========== TIME ==========
  private extractTime(text: string): string | null {
    // Try standard HH:MM AM/PM format first
    const timeMatch = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/i);
    if (timeMatch) {
      const time = timeMatch[0];
      if (/PM/i.test(time)) {
        const [hours, mins] = time.replace(/\s*PM/i, '').split(':');
        const hour24 = parseInt(hours) === 12 ? 12 : parseInt(hours) + 12;
        return `${hour24.toString().padStart(2, '0')}:${mins}`;
      }
      if (/AM/i.test(time)) {
        const [hours, mins] = time.replace(/\s*AM/i, '').split(':');
        const hour24 = parseInt(hours) === 12 ? 0 : parseInt(hours);
        return `${hour24.toString().padStart(2, '0')}:${mins}`;
      }
      return time;
    }

    // Try "<N> AM/PM" without colon (e.g. "3 PM", "3PM")
    const simpleAmPm = text.match(/(\d{1,2})\s*(AM|PM)/i);
    if (simpleAmPm) {
      const h = parseInt(simpleAmPm[1]);
      const isPm = /PM/i.test(simpleAmPm[2]);
      const hour24 = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
      return `${String(hour24).padStart(2, '0')}:00`;
    }

    // Fall back to natural language parsing
    const naturalTime = parseNaturalTime(text);
    if (naturalTime) return naturalTime;

    return null;
  }

  private validateTime(time: string): ValidationResult {
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const isValid = timePattern.test(time);
    return {
      isValid,
      error: isValid ? undefined : 'Invalid time format (use HH:MM)',
      normalizedValue: time
    };
  }

  // ========== SELECT ==========
  private extractOption(text: string, options?: string[]): string | null {
    if (!options || options.length === 0) return text;

    const normalized = text.toLowerCase();
    const match = options.find(opt => 
      normalized.includes(opt.toLowerCase()) || 
      opt.toLowerCase().includes(normalized)
    );

    return match || null;
  }

  private validateOption(value: string, options?: string[]): ValidationResult {
    if (!options || options.length === 0) {
      return { isValid: true, normalizedValue: value };
    }

    const isValid = options.some(opt => 
      opt.toLowerCase() === value.toLowerCase()
    );

    return {
      isValid,
      error: isValid ? undefined : `Must be one of: ${options.join(', ')}`,
      normalizedValue: value
    };
  }

  // ========== MULTISELECT ==========
  private extractMultipleOptions(text: string, options?: string[]): string | null {
    if (!options || options.length === 0) return text;

    const normalized = text.toLowerCase();
    const matches = options.filter(opt => 
      normalized.includes(opt.toLowerCase())
    );

    return matches.length > 0 ? matches.join(', ') : null;
  }

  private validateMultipleOptions(value: string, options?: string[]): ValidationResult {
    if (!options || options.length === 0) {
      return { isValid: true, normalizedValue: value };
    }

    const selected = value.split(',').map(v => v.trim());
    const allValid = selected.every(sel => 
      options.some(opt => opt.toLowerCase() === sel.toLowerCase())
    );

    return {
      isValid: allValid,
      error: allValid ? undefined : `All values must be from: ${options.join(', ')}`,
      normalizedValue: value
    };
  }

  // ========== TEXT ==========
  private extractText(text: string): string | null {
    // Remove common voice prefixes
    const cleaned = text
      .replace(/^(?:it's|it is|this is|my answer is|i (?:think|believe|would say))\s*/i, '')
      .replace(/[.,!?]+$/g, '')
      .trim();

    return cleaned || null;
  }

  private validateText(value: string, validation?: VoiceFormField['validation']): ValidationResult {
    if (validation?.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return { isValid: false, error: 'Invalid format' };
      }
    }

    if (validation?.min !== undefined && value.length < validation.min) {
      return { isValid: false, error: `Must be at least ${validation.min} characters` };
    }

    if (validation?.max !== undefined && value.length > validation.max) {
      return { isValid: false, error: `Must be at most ${validation.max} characters` };
    }

    return { isValid: true, normalizedValue: value };
  }
}

// Singleton instance for convenience
export const voiceFormCapture = new VoiceFormFieldCapture();
