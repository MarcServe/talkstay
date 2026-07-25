import React, { useState, useEffect } from 'react';
import { VoiceFormFillerModal } from './VoiceFormFillerModal';
import { supabase } from '@/integrations/supabase/client';
import { VoiceForm } from '@/types/voiceForm';
import { normalizeVoiceFormRecord } from '@/utils/voiceFormAdapter';
import { Button } from '@/components/ui/button';
import { BrandedMicIcon } from '@/components/ui/branded-mic-icon';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceFormWidgetProps {
  formId: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  buttonText?: string;
  buttonIcon?: boolean;
}

/**
 * Embeddable Voice Form Widget
 * 
 * This component can be embedded on external websites via iframe.
 * It provides a floating button that opens the form modal.
 */
export const VoiceFormWidget: React.FC<VoiceFormWidgetProps> = ({
  formId,
  position = 'bottom-right',
  primaryColor = '#3b82f6',
  buttonText = 'Open Form',
  buttonIcon = true,
}) => {
  const [form, setForm] = useState<VoiceForm | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('voice_forms')
        .select('*, branding_logo_url, branding_redirect_url')
        .eq('id', formId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setForm(normalizeVoiceFormRecord(data));
    } catch (error) {
      console.error('Error loading form:', error);
      toast.error('Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: Record<string, any>, collectionLog?: any[]) => {
    try {
      const { error } = await supabase.functions.invoke('submit-voice-form', {
        body: {
          formId,
          assistantId: form?.assistantId,
          sessionId: crypto.randomUUID(),
          data,
          fieldCollectionLog: collectionLog,
        }
      });

      if (error) throw error;

      // Send message to parent window if in iframe
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'voice-form-submitted',
          formId,
          data,
        }, '*');
      }

      setIsOpen(false);
      toast.success(form?.actions.successMessage || 'Form submitted successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  };

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6',
    };
    return positions[position];
  };

  if (isLoading) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <div className="animate-pulse w-14 h-14 rounded-full bg-muted" />
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 p-0 flex items-center justify-center"
          style={{
            backgroundColor: primaryColor,
          }}
        >
          <BrandedMicIcon 
            size={24} 
            showText={false}
            className="text-white"
            micClassName="text-white"
          />
        </Button>
      </div>

      {/* Form Modal */}
      {isOpen && form && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-background rounded-lg shadow-2xl border">
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{form.name}</h2>
              {form.description && (
                <p className="text-muted-foreground mb-6">{form.description}</p>
              )}
              
              <VoiceFormFillerModal
                form={form}
                onComplete={handleSubmit}
                onCancel={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
