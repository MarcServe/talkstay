import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Loader2, Check } from 'lucide-react';
import { VoiceForm, VoiceFormField } from '@/types/voiceForm';
import { VoiceFormManager } from '@/utils/VoiceFormManager';
import { normalizeVoiceFormRecord } from '@/utils/voiceFormAdapter';

interface VoiceFormFillerModalProps {
  form: VoiceForm;
  onComplete: (data: Record<string, any>, collectionLog?: any[]) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const VoiceFormFillerModal: React.FC<VoiceFormFillerModalProps> = ({
  form,
  onComplete,
  onCancel,
  disabled = false,
}) => {
  const normalizedForm = useMemo(() => normalizeVoiceFormRecord(form), [form]);
  const formManager = useMemo(() => new VoiceFormManager(normalizedForm), [normalizedForm]);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [isListening, setIsListening] = useState(false);

  const currentField = normalizedForm.fields[currentFieldIndex];
  const progress = normalizedForm.fields.length > 0
    ? (currentFieldIndex / normalizedForm.fields.length) * 100
    : 100;

  if (!currentField) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This form has no fields configured.
        </p>
        <Button type="button" variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  const handleFieldValue = (value: any, method: 'voice' | 'text' | 'secure') => {
    formManager.setFieldValue(currentField.id, value, method);
    setCollectedData(formManager.getCollectedData());

    if (currentFieldIndex < normalizedForm.fields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    } else {
      // Form complete
      const submissionData = formManager.exportSubmissionData();
      onComplete(submissionData.data, submissionData.fieldCollectionLog);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    // Implement voice capture logic here
    // For now, just simulate
    setTimeout(() => {
      setIsListening(false);
      handleFieldValue('Voice captured value', 'voice');
    }, 2000);
  };

  const renderFieldInput = (field: VoiceFormField) => {
    const value = collectedData[field.id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => setCollectedData({ ...collectedData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
      case 'email':
      case 'phone':
      case 'number':
      case 'date':
      case 'time':
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => setCollectedData({ ...collectedData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setCollectedData({ ...collectedData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Field {currentFieldIndex + 1} of {normalizedForm.fields.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={currentField.id}>
              {currentField.label}
              {currentField.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <p className="text-sm text-muted-foreground">
              {currentField.voicePrompts.initial}
            </p>
          </div>

          {renderFieldInput(currentField)}

          {normalizedForm.settings.enableVoiceInput && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                onClick={handleVoiceInput}
                disabled={disabled || isListening}
                className="flex-1"
              >
                {isListening ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Listening...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Use Voice
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          {currentFieldIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentFieldIndex(currentFieldIndex - 1)}
              disabled={disabled}
            >
              Previous
            </Button>
          )}
          <Button
            type="button"
            onClick={() => handleFieldValue(collectedData[currentField.id], 'text')}
            disabled={disabled || !collectedData[currentField.id]}
          >
            {currentFieldIndex === normalizedForm.fields.length - 1 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Submit
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>

      {/* Branding Footer */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-center items-center">
          {normalizedForm.brandingLogoUrl ? (
            <a
              href={normalizedForm.brandingRedirectUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img
                src={normalizedForm.brandingLogoUrl}
                alt="Powered by"
                className="h-8 object-contain"
              />
            </a>
          ) : (
            <a
              href="https://talkweb.app"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img
                src="/lovable-uploads/d8670dc7-02cf-487b-8267-ebcdb13bffb5.png"
                alt="Powered by TalkWeb"
                className="h-8 object-contain"
              />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
