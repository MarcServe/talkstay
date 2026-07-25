import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { VoiceForm, VoiceFormField } from '@/types/voiceForm';
import { VoiceFormManager } from '@/utils/VoiceFormManager';
import { SimplifiedVoiceRecorder } from '@/utils/SimplifiedVoiceRecorder';
import { toast } from 'sonner';

interface VoiceFormModalProps {
  form: VoiceForm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

export const VoiceFormModal: React.FC<VoiceFormModalProps> = ({
  form,
  open,
  onOpenChange,
  onSubmit
}) => {
  const [formManager] = useState(() => new VoiceFormManager(form));
  const [currentField, setCurrentField] = useState<VoiceFormField | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState<SimplifiedVoiceRecorder | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [progress, setProgress] = useState(formManager.getProgress());
  const [collectedData, setCollectedData] = useState(formManager.getCollectedData());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const nextField = formManager.getNextField();
      setCurrentField(nextField);
      updateProgress();
    } else {
      formManager.reset();
      setCurrentField(null);
      setManualInput('');
      setError(null);
      updateProgress();
    }
  }, [open]);

  const updateProgress = () => {
    setProgress(formManager.getProgress());
    setCollectedData(formManager.getCollectedData());
  };

  const handleVoiceInput = async () => {
    if (!currentField) return;

    if (isListening && voiceRecorder) {
      // Stop listening
      voiceRecorder.stop();
      setIsListening(false);
      return;
    }

    // Create new recorder instance with callbacks
    const recorder = new SimplifiedVoiceRecorder({
      onResult: async (transcript: string) => {
        setIsListening(false);
        setIsProcessing(true);

        try {
          const success = formManager.setFieldValue(
            currentField.id,
            transcript,
            'voice',
            0
          );

          if (success) {
            toast.success(`Got it: ${transcript}`);
            moveToNextField();
          } else {
            formManager.incrementRetry(currentField.id);
            setError('Could not understand that. Please try again.');
          }
        } catch (err) {
          setError('Error processing voice input');
          console.error('Voice processing error:', err);
        } finally {
          setIsProcessing(false);
        }
      },
      onError: (error: string) => {
        setIsListening(false);
        setError(error);
        toast.error('Voice input failed');
      },
      onStart: () => {
        setIsListening(true);
        setError(null);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    setVoiceRecorder(recorder);
    recorder.start();
  };

  const handleManualInput = () => {
    if (!currentField || !manualInput.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const success = formManager.setFieldValue(
        currentField.id,
        manualInput.trim(),
        'text',
        0
      );

      if (success) {
        setManualInput('');
        moveToNextField();
      } else {
        formManager.incrementRetry(currentField.id);
        setError('Invalid input. Please check and try again.');
      }
    } catch (err) {
      setError('Error processing input');
      console.error('Input processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const moveToNextField = () => {
    updateProgress();

    if (formManager.isComplete()) {
      handleFormComplete();
    } else {
      const nextField = formManager.getNextField();
      setCurrentField(nextField);
    }
  };

  const handleFormComplete = async () => {
    setIsProcessing(true);

    try {
      const submissionData = formManager.exportSubmissionData();
      await onSubmit(submissionData.data);
      
      toast.success('Form submitted successfully!');
      onOpenChange(false);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit form');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFieldPrompt = () => {
    if (!currentField) return '';
    return formManager.generateFieldPrompt(currentField);
  };

  if (!currentField && !formManager.isComplete()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{form.name}</DialogTitle>
          <DialogDescription>{form.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{progress.percentComplete}%</span>
            </div>
            <Progress value={progress.percentComplete} />
            <p className="text-xs text-muted-foreground">
              {progress.completedFields} of {progress.totalFields} fields completed
            </p>
          </div>

          {/* Current Field */}
          {currentField && !formManager.isComplete() && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">{currentField.label}</p>
                <p className="text-sm text-muted-foreground">{getFieldPrompt()}</p>
              </div>

              {/* Voice Input Button */}
              {form.settings.enableVoiceInput && 
               currentField.privacyLevel !== 'private' && (
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    variant={isListening ? 'destructive' : 'default'}
                    onClick={handleVoiceInput}
                    disabled={isProcessing}
                    className="rounded-full w-20 h-20"
                  >
                    {isListening ? (
                      <MicOff className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </Button>
                </div>
              )}

              {/* Manual Input Fallback */}
              {form.settings.enableManualFallback && (
                <div className="space-y-2">
                  <Label htmlFor="manual-input">
                    Or type your answer:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="manual-input"
                      type={currentField.type === 'email' ? 'email' : 
                            currentField.type === 'phone' ? 'tel' : 
                            currentField.type === 'number' ? 'number' : 'text'}
                      placeholder={currentField.placeholder || `Enter ${currentField.label.toLowerCase()}`}
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleManualInput();
                      }}
                      disabled={isProcessing}
                    />
                    <Button
                      onClick={handleManualInput}
                      disabled={!manualInput.trim() || isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Next'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Completion State */}
          {formManager.isComplete() && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Form Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Submitting your information...
                </p>
              </div>
            </div>
          )}

          {/* Collected Data Preview */}
          {progress.completedFields > 0 && !formManager.isComplete() && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Collected Information:</p>
              <div className="space-y-1">
                {Object.entries(collectedData).map(([fieldId, value]) => {
                  const field = form.fields.find(f => f.id === fieldId);
                  return (
                    <div key={fieldId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{field?.label}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
