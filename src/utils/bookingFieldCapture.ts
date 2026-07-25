import { conversationMemory } from './ConversationMemory';
import { voiceTransitions } from './voiceTransitions';

type BookingField = 'name' | 'email' | 'phone';
type InputMethod = 'voice' | 'text' | 'secure';

type FieldKeyMap = Record<BookingField, 'userName' | 'userEmail' | 'userPhone'>;

const fieldKeyMap: FieldKeyMap = {
  name: 'userName',
  email: 'userEmail',
  phone: 'userPhone'
};

const normalizeName = (value: string) => {
  return value
    .replace(/^(?:my name is|name is|it's|it is|this is|i am|i'm|they call me|call me)\s*/i, '')
    .replace(/[0-9@]/g, '')
    .replace(/[.,!?]+$/g, '')
    .trim();
};

const extractFieldValue = (field: BookingField, raw: string): string | null => {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  if (field === 'email') {
    const emailMatch = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return emailMatch ? emailMatch[0].toLowerCase() : null;
  }

  if (field === 'phone') {
    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length < 7) return null;
    const hasCountryCode = normalized.trim().startsWith('+');
    return hasCountryCode ? `+${digitsOnly}` : digitsOnly;
  }

  const candidate = normalizeName(normalized);
  if (!candidate) return null;

  const parts = candidate.split(/\s+/);
  if (parts.length === 0 || parts.length > 4) return null;
  const validParts = parts.every(part => /^[A-Za-z][A-Za-z.'-]*$/.test(part));
  if (!validParts) return null;

  return parts.join(' ');
};

interface CaptureOptions {
  method: InputMethod;
  hint?: BookingField;
}

export const captureBookingFieldFromText = (
  rawText: string,
  { method, hint }: CaptureOptions
) => {
  const trimmed = rawText.trim();
  if (!trimmed) return;

  const context = conversationMemory.getCurrentContext();
  const pending = context.pendingBooking || {};
  const pendingRecord = pending as Record<string, string | undefined>;
  const hasBookingContext = Object.values(pendingRecord).some(value =>
    typeof value === 'string' && value.trim().length > 0
  );

  const evaluateField = (field: BookingField) => {
    const value = extractFieldValue(field, trimmed);
    return value ? { field, value } : null;
  };

  const order: BookingField[] = [];
  const targetField = context.nextField as BookingField | undefined;

  if (hint && !order.includes(hint)) {
    order.push(hint);
  }

  if (targetField && !order.includes(targetField)) {
    order.push(targetField);
  }

  (['email', 'phone'] as BookingField[]).forEach(field => {
    if (!order.includes(field)) {
      const key = fieldKeyMap[field];
      const existing = pendingRecord[key];
      if (!existing) {
        order.push(field);
      }
    }
  });

  if (
    !order.includes('name') &&
    !pendingRecord[fieldKeyMap.name] &&
    (hint === 'name' || targetField === 'name' || hasBookingContext)
  ) {
    order.push('name');
  }

  let captured: { field: BookingField; value: string } | null = null;
  for (const field of order) {
    const result = evaluateField(field);
    if (result) {
      captured = result;
      break;
    }
  }

  if (!captured) return;

  const bookingKey = fieldKeyMap[captured.field];
  const currentValue = pendingRecord[bookingKey];
  const previousMethod = (
    context.lastInputTransition?.to ||
    context.lastInputTransition?.from ||
    'voice'
  ) as InputMethod;

  const contextUpdates: Record<string, unknown> = {};
  if (context.nextField) {
    contextUpdates.nextField = undefined;
  }
  if (context.conversationPhase === 'privacy_choice') {
    contextUpdates.conversationPhase = 'collecting';
  }

  if (currentValue !== captured.value) {
    const update: Partial<Record<'userName' | 'userEmail' | 'userPhone', string>> = {
      [bookingKey]: captured.value
    };
    const memorySource: 'voice' | 'chat' = method === 'voice' ? 'voice' : 'chat';
    conversationMemory.updateBookingInfo(update, memorySource);
  }

  if (Object.keys(contextUpdates).length > 0) {
    conversationMemory.setContext(contextUpdates);
  }

  voiceTransitions.recordTransition(captured.field, previousMethod, method, true);

  console.log('🧠 Captured booking detail from text', {
    field: captured.field,
    value: captured.value,
    method
  });
};
