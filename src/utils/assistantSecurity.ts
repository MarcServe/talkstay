import { supabase } from "@/integrations/supabase/client";

/**
 * Security helper to safely fetch assistant data without exposing sensitive information
 * This prevents exposure of API tokens and other sensitive business data
 */

interface SafeAssistantData {
  id: string;
  business_name: string;
  system_prompt?: string;
  voice_type: string;
  tone: string;
  logo_url?: string | null;
  website_url?: string;
  language: string;
  description?: string;
  is_trial?: boolean;
  trial_expires_at?: string;
  scraped_content?: any;
  created_at?: string;
  updated_at?: string;
}

// Safe fields that can be exposed for trial assistants
const SAFE_FIELDS = [
  'id',
  'business_name', 
  'system_prompt',
  'voice_type',
  'tone',
  'logo_url',
  'website_url', 
  'language',
  'description',
  'is_trial',
  'trial_expires_at',
  'scraped_content', // For preview functionality
  'created_at',
  'updated_at'
].join(',');

// Sensitive fields that should NEVER be exposed publicly
const SENSITIVE_FIELDS = [
  'calendly_api_token',
  'google_calendar_access_token',
  'google_calendar_refresh_token',
  'google_calendar_client_id',
  'google_calendar_client_secret',
  'whatsapp_number',
  'whatsapp_message_template',
  'booking_notification_email',
  'embed_code'
];

/**
 * Safely fetch assistant data for preview/trial mode
 * Only returns non-sensitive fields to prevent data exposure
 * Uses improved logic to handle different access contexts
 */
export async function fetchSafeAssistantData(assistantId: string): Promise<SafeAssistantData | null> {
  try {
    console.log('Fetching safe assistant data for:', assistantId);
    
    // Use the new public access policy that allows both trial and embed access
    const { data, error } = await supabase
      .from('assistants')
      .select(SAFE_FIELDS)
      .eq('id', assistantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching assistant data:', error);
      return null;
    }

    if (!data) {
      console.log('No assistant found with ID:', assistantId);
      return null;
    }

    console.log('Assistant data found:', {
      id: (data as any)?.id,
      business_name: (data as any)?.business_name,
      is_trial: (data as any)?.is_trial,
      trial_expires_at: (data as any)?.trial_expires_at,
      has_embed: !!(data as any)?.embed_code
    });

    return validateSafeData(data);
  } catch (error) {
    console.error('Safe assistant fetch error:', error);
    return null;
  }
}

/**
 * Check if an assistant is a valid trial (publicly accessible)
 */
export async function isValidTrialAssistant(assistantId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_valid_trial_assistant', {
      assistant_id: assistantId
    });

    if (error) {
      console.error('Error checking trial status:', error);
      return false;
    }

    return Boolean(data);
  } catch (error) {
    console.error('Trial check error:', error);
    return false;
  }
}

/**
 * Fetch full assistant data (only for authenticated owners)
 * Includes sensitive fields like API tokens
 * Improved with better error handling and user context
 */
export async function fetchFullAssistantData(assistantId: string) {
  try {
    console.log('Fetching full assistant data for:', assistantId);
    
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching full assistant data:', error);
      if (error.code === 'PGRST116') {
        // Row level security violation
        console.log('Access denied - user may not own this assistant or not authenticated');
        return null;
      }
      throw new Error('Failed to load assistant data');
    }

    if (!data) {
      console.log('No assistant found or access denied for ID:', assistantId);
      return null;
    }

    console.log('Full assistant data loaded for user');
    return data;
  } catch (error) {
    console.error('Full assistant fetch error:', error);
    return null;
  }
}

/**
 * Validate that we're not accidentally exposing sensitive fields
 */
export function validateSafeData(data: any): SafeAssistantData | null {
  if (!data) return null;

  // Remove any sensitive fields that might have been included
  const safeData: any = {};
  const allowedFields = SAFE_FIELDS.split(',');
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      safeData[field] = data[field];
    }
  }

  // Double-check: ensure no sensitive fields are present
  for (const sensitiveField of SENSITIVE_FIELDS) {
    if (safeData[sensitiveField] !== undefined) {
      console.warn(`Security Warning: Sensitive field ${sensitiveField} was included in safe data`);
      delete safeData[sensitiveField];
    }
  }

  return safeData as SafeAssistantData;
}