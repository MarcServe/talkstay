import { VoiceForm, VoiceFormField, VoiceFormFieldType } from '@/types/voiceForm';

const humanizeFieldName = (field: string): string =>
  field
    .replace(/[_-]+/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const inferFieldType = (field: string): VoiceFormFieldType => {
  const normalized = field.toLowerCase();

  if (normalized.includes('email')) return 'email';
  if (normalized.includes('phone') || normalized.includes('tel') || normalized.includes('mobile')) return 'phone';
  if (normalized.includes('date')) return 'date';
  if (normalized.includes('time')) return 'time';
  if (normalized.includes('budget') || normalized.includes('amount') || normalized.includes('number')) return 'number';
  if (
    normalized.includes('message') ||
    normalized.includes('description') ||
    normalized.includes('detail') ||
    normalized.includes('requirement') ||
    normalized.includes('goal') ||
    normalized.includes('objective')
  ) {
    return 'textarea';
  }

  return 'text';
};

const createFieldFromTopic = (field: string, topic: any): VoiceFormField => {
  const label = humanizeFieldName(field);
  const prompt = topic?.aiInstruction || `Please provide your ${label.toLowerCase()}.`;

  return {
    id: field,
    name: field,
    label,
    type: inferFieldType(field),
    required: topic?.required === true,
    voicePrompts: {
      initial: prompt,
      confirmation: `Got it, {value}. Is that correct?`,
      retry: `Sorry, I didn't catch that. Could you repeat your ${label.toLowerCase()}?`,
      help: `Please say your ${label.toLowerCase()} clearly.`,
    },
    privacyLevel: field.toLowerCase().includes('email') || field.toLowerCase().includes('phone') ? 'sensitive' : 'public',
    placeholder: label,
  };
};

const fieldsFromTopics = (topics: any[]): VoiceFormField[] => {
  const seen = new Set<string>();
  const fields: VoiceFormField[] = [];

  topics.forEach((topic) => {
    (topic?.dataPoints || []).forEach((field: string) => {
      if (!field || seen.has(field)) return;
      seen.add(field);
      fields.push(createFieldFromTopic(field, topic));
    });
  });

  return fields;
};

export const normalizeVoiceFormRecord = (form: any): VoiceForm => {
  const record = form || {};
  const fields = Array.isArray(record.fields) && record.fields.length > 0
    ? record.fields
    : fieldsFromTopics(Array.isArray(record.topics) ? record.topics : []);

  return {
    id: record.id || '',
    assistantId: record.assistantId || record.assistant_id || '',
    name: record.name || record.form_name || 'Voice Form',
    description: record.description || '',
    fields,
    settings: record.settings || {
      conversationStyle: 'friendly',
      confirmEachField: false,
      allowCorrections: true,
      maxRetries: 3,
      language: 'en',
      enableVoiceInput: true,
      enableManualFallback: true,
      showProgress: true,
    },
    actions: record.actions || {
      onComplete: 'database',
      successMessage: 'Form submitted successfully!',
    },
    notificationSettings: record.notificationSettings || record.notification_settings,
    isActive: record.isActive ?? record.is_active ?? true,
    createdAt: record.createdAt || record.created_at || new Date().toISOString(),
    updatedAt: record.updatedAt || record.updated_at || new Date().toISOString(),
    brandingLogoUrl: record.brandingLogoUrl || record.branding_logo_url,
    brandingRedirectUrl: record.brandingRedirectUrl || record.branding_redirect_url,
    theme: (record.theme === 'light' || record.theme === 'dark' || record.theme === 'auto')
      ? record.theme
      : 'auto',
  };
};
