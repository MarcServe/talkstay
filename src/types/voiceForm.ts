/**
 * Voice Form System - Type Definitions
 * Phase 1: Foundation for universal voice-based form collection
 */

export type VoiceFormFieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'number' 
  | 'date' 
  | 'time' 
  | 'select' 
  | 'multiselect' 
  | 'textarea';

export type PrivacyLevel = 'public' | 'sensitive' | 'private';

export type ConversationStyle = 'formal' | 'casual' | 'friendly';

export type FormActionType = 'email' | 'webhook' | 'database' | 'booking' | 'custom';

export interface FieldValidation {
  pattern?: string;
  min?: number;
  max?: number;
  options?: string[];
  customValidation?: string; // JavaScript expression for custom validation
}

export interface VoicePrompts {
  initial: string;           // "What's your email address?"
  confirmation: string;       // "Got it, {value}. Is that correct?"
  retry: string;             // "Sorry, I didn't catch that. Could you repeat?"
  help: string;              // "Please say your email, like john at example dot com"
}

export interface VoiceFormField {
  id: string;
  name: string;
  label: string;
  type: VoiceFormFieldType;
  required: boolean;
  validation?: FieldValidation;
  voicePrompts: VoicePrompts;
  privacyLevel: PrivacyLevel; // Determines voice vs manual input preference
  placeholder?: string;
  defaultValue?: string;
  conditionalRules?: ConditionalRule[];
}

export interface ConditionalRule {
  if: {
    fieldId: string;
    condition: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    value: any;
  };
  then: {
    action: 'show' | 'hide' | 'skip' | 'require' | 'optional';
    targetFieldId: string;
  };
}

export interface FormSettings {
  conversationStyle: ConversationStyle;
  confirmEachField: boolean;
  allowCorrections: boolean;
  maxRetries: number;
  language: string;
  enableVoiceInput: boolean;
  enableManualFallback: boolean;
  showProgress: boolean;
}

export interface FormActions {
  onComplete: FormActionType;
  webhookUrl?: string;
  emailRecipients?: string[];
  successMessage: string;
  redirectUrl?: string;
  customScript?: string;
}

export interface VoiceForm {
  id: string;
  assistantId: string;
  name: string;
  description: string;
  fields: VoiceFormField[];
  settings: FormSettings;
  actions: FormActions;
  notificationSettings?: {
    email?: {
      enabled: boolean;
      recipients: string[];
      sendOnSubmit: boolean;
      includeTranscript: boolean;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      method: string;
      headers: Record<string, string>;
      includeTranscript: boolean;
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
      mentionUsers: string[];
    };
    discord?: {
      enabled: boolean;
      webhookUrl: string;
      mentionRoles: string[];
    };
    realtime?: {
      enabled: boolean;
      browserNotifications: boolean;
    };
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  brandingLogoUrl?: string;
  brandingRedirectUrl?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface FieldCollectionLog {
  fieldId: string;
  fieldName: string;
  collectionMethod: 'voice' | 'text' | 'secure';
  attempts: number;
  timeSpent: number; // seconds
  correctionsMade: number;
  success: boolean;
  errorMessage?: string;
}

export interface VoiceFormSubmission {
  id: string;
  formId: string;
  assistantId: string;
  sessionId: string;
  data: Record<string, any>;
  completionTime?: number; // seconds
  fieldCollectionLog?: FieldCollectionLog[];
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedValue?: any;
}

export interface FormProgress {
  totalFields: number;
  completedFields: number;
  currentFieldIndex: number;
  percentComplete: number;
  requiredFieldsRemaining: number;
}

// Template definitions for pre-built forms
export interface VoiceFormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'contact' | 'booking' | 'survey' | 'registration' | 'feedback' | 'application' | 'custom';
  icon: string;
  fields: Omit<VoiceFormField, 'id'>[];
  defaultSettings: FormSettings;
  defaultActions: FormActions;
}
