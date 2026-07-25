import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VoiceFormFillerModal } from './VoiceFormFillerModal';
import { VoiceForm } from '@/types/voiceForm';
import { toast } from 'sonner';

interface VoiceFormChatModalProps {
  form: VoiceForm | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>, collectionLog?: any[]) => Promise<{ success: boolean }>;
}

export const VoiceFormChatModal: React.FC<VoiceFormChatModalProps> = ({
  form,
  open,
  onClose,
  onSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async (data: Record<string, any>, collectionLog?: any[]) => {
    setIsSubmitting(true);
    try {
      const result = await onSubmit(data, collectionLog);
      
      if (result.success) {
        toast.success('Form submitted successfully!');
        onClose();
      } else {
        toast.error('Failed to submit form. Please try again.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('An error occurred while submitting the form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.name}</DialogTitle>
          {form.description && (
            <DialogDescription>{form.description}</DialogDescription>
          )}
        </DialogHeader>
        
        <VoiceFormFillerModal
          form={form}
          onComplete={handleComplete}
          onCancel={onClose}
          disabled={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};
