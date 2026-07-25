import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceForm } from '@/types/voiceForm';
import { normalizeVoiceFormRecord } from '@/utils/voiceFormAdapter';

interface UseVoiceFormChatProps {
  assistantId: string;
  sessionId: string;
}

export const useVoiceFormChat = ({ assistantId, sessionId }: UseVoiceFormChatProps) => {
  const [availableForms, setAvailableForms] = useState<VoiceForm[]>([]);
  const [activeForm, setActiveForm] = useState<VoiceForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAvailableForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('voice_forms')
        .select('*')
        .eq('assistant_id', assistantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableForms((data || []).map(normalizeVoiceFormRecord));
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setIsLoading(false);
    }
  }, [assistantId]);

  const triggerForm = useCallback((formId: string) => {
    const form = availableForms.find(f => f.id === formId);
    if (form) {
      setActiveForm(form);
    }
  }, [availableForms]);

  const closeForm = useCallback(() => {
    setActiveForm(null);
  }, []);

  const submitForm = useCallback(async (formData: Record<string, any>, collectionLog?: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('submit-voice-form', {
        body: {
          formId: activeForm?.id,
          assistantId,
          sessionId,
          data: formData,
          fieldCollectionLog: collectionLog,
        }
      });

      if (error) throw error;
      
      closeForm();
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting form:', error);
      return { success: false, error };
    }
  }, [activeForm, assistantId, sessionId, closeForm]);

  return {
    availableForms,
    activeForm,
    isLoading,
    loadAvailableForms,
    triggerForm,
    closeForm,
    submitForm,
  };
};
