import { supabase } from '@/integrations/supabase/client';

/**
 * Analytics tracking for phone call interactions
 */

export interface PhoneCallEvent {
  assistantId: string;
  eventType: 'phone_number_displayed' | 'phone_number_clicked' | 'phone_number_copied' | 'ai_suggested_call';
  phoneNumber?: string;
  deviceType: 'mobile' | 'desktop';
  sessionId?: string;
  userAgent?: string;
}

export const trackPhoneCallEvent = async (event: PhoneCallEvent) => {
  try {
    const { error } = await supabase
      .from('user_analytics')
      .insert({
        event_type: event.eventType,
        event_data: {
          assistant_id: event.assistantId,
          phone_number_masked: event.phoneNumber ? maskPhoneNumber(event.phoneNumber) : null,
          device_type: event.deviceType,
          user_agent: event.userAgent || navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        session_id: event.sessionId || 'anonymous'
      });

    if (error) {
      console.error('Analytics tracking error:', error);
    }
  } catch (error) {
    // Silent fail - don't interrupt user experience for analytics
    console.error('Failed to track phone call event:', error);
  }
};

/**
 * Mask phone number for privacy (show only last 4 digits)
 */
const maskPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
};

/**
 * Track when AI proactively suggests calling
 */
export const trackAISuggestion = async (assistantId: string, conversationContext: string) => {
  await trackPhoneCallEvent({
    assistantId,
    eventType: 'ai_suggested_call',
    deviceType: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  });
};

/**
 * Track when phone number is displayed to user
 */
export const trackPhoneNumberDisplayed = async (assistantId: string, phoneNumber: string, sessionId?: string) => {
  await trackPhoneCallEvent({
    assistantId,
    eventType: 'phone_number_displayed',
    phoneNumber,
    deviceType: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    sessionId
  });
};

/**
 * Track when user clicks phone number to call
 */
export const trackPhoneNumberClicked = async (assistantId: string, phoneNumber: string, sessionId?: string) => {
  await trackPhoneCallEvent({
    assistantId,
    eventType: 'phone_number_clicked',
    phoneNumber,
    deviceType: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    sessionId
  });
};

/**
 * Track when user copies phone number
 */
export const trackPhoneNumberCopied = async (assistantId: string, phoneNumber: string, sessionId?: string) => {
  await trackPhoneCallEvent({
    assistantId,
    eventType: 'phone_number_copied',
    phoneNumber,
    deviceType: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    sessionId
  });
};
