import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Edit2, Check, X } from 'lucide-react';
import { formMemory } from '@/utils/FormMemory';
import { conversationalFormExtractor } from '@/utils/conversationalFormExtractor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FormDataCapturePanelProps {
  formConfig: any;
  sessionId: string;
}

export const FormDataCapturePanel: React.FC<FormDataCapturePanelProps> = ({
  formConfig,
  sessionId,
}) => {
  const [capturedData, setCapturedData] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentlyUpdatedFields, setRecentlyUpdatedFields] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Subscribe to form data updates
  useEffect(() => {
    const isMockData = (value: string): boolean => {
      const mockPatterns = [
        /john\.?smith/i,
        /jane\.?doe/i,
        /@example\./i,
        /@test\./i,
        /@webtech\./i,
        /555[-\s]?\d{4}/,
        /\+44791112/,
        /123[-\s]?456/,
      ];
      return mockPatterns.some(pattern => pattern.test(String(value)));
    };
    
    const unsubscribe = formMemory.subscribeToFormData(sessionId, (data) => {
      // Filter out mock data
      const cleanedData: Record<string, any> = {};
      const blockedFields: string[] = [];
      
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (typeof value === 'string' && isMockData(value)) {
          console.warn(`🚫 Blocked mock data for field "${key}": ${value}`);
          blockedFields.push(key);
          // Don't include this field
        } else {
          cleanedData[key] = value;
        }
      });
      
      // Alert user if mock data was blocked
      if (blockedFields.length > 0) {
        toast({
          title: "Mock Data Detected",
          description: `Blocked example values for: ${blockedFields.join(', ')}. Please provide real information.`,
          variant: "destructive",
        });
      }
      
      // Update captured data with cleaned data and compare against the latest state.
      setCapturedData((previousData) => {
        const updatedFields = new Set<string>();
        Object.keys(cleanedData).forEach((key) => {
          if (cleanedData[key] !== previousData[key]) {
            updatedFields.add(key);
          }
        });

        if (updatedFields.size > 0) {
          setRecentlyUpdatedFields(updatedFields);
          setTimeout(() => {
            setRecentlyUpdatedFields(new Set());
          }, 2000);
        }

        return cleanedData;
      });
      calculateProgress(cleanedData);
    });

    // Load initial data
    const context = formMemory.getFormContext(sessionId);
    if (context) {
      setCapturedData(context.collectedData);
      calculateProgress(context.collectedData);
    }

    return unsubscribe;
  }, [sessionId, toast]);

  // Listen for voice-triggered submission
  useEffect(() => {
    console.log('[DEBUG] FormDataCapturePanel mounted, listening for voice_form_submit');
    console.log('[DEBUG] Current sessionId:', sessionId);
    
    const handleVoiceSubmit = (event: any) => {
      console.log('[DEBUG] voice_form_submit event received');
      console.log('[DEBUG] Event sessionId:', event.detail?.sessionId);
      console.log('[DEBUG] Component sessionId:', sessionId);
      console.log('[DEBUG] SessionIds match:', event.detail?.sessionId === sessionId);
      
      if (event.detail?.sessionId === sessionId) {
        console.log('🎤 [DEBUG] Voice submission triggered - calling handleSubmit');
        handleSubmit();
      } else {
        console.log('❌ [DEBUG] SessionId mismatch - not submitting');
      }
    };
    
    window.addEventListener('voice_form_submit', handleVoiceSubmit);
    return () => {
      console.log('[DEBUG] FormDataCapturePanel unmounting - removing listener');
      window.removeEventListener('voice_form_submit', handleVoiceSubmit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const calculateProgress = (data: Record<string, any>) => {
    const requiredFields = getAllRequiredFields();
    if (requiredFields.length === 0) {
      setProgress(100);
      return;
    }

    const filledFields = requiredFields.filter(
      (field) => data[field] && data[field] !== ''
    );
    const progressValue = Math.round((filledFields.length / requiredFields.length) * 100);
    setProgress(progressValue);
  };

  const getAllRequiredFields = (): string[] => {
    const fields = new Set<string>();
    formConfig.topics.forEach((topic: any) => {
      if (topic.required) {
        (topic.dataPoints || []).forEach((field: string) => {
          if (field) fields.add(field);
        });
      }
    });
    return Array.from(fields);
  };

  const isTopicComplete = (topic: any): boolean => {
    return topic.dataPoints.every(
      (field: string) => capturedData[field] && capturedData[field] !== ''
    );
  };

  const getFieldLabel = (field: string): string => {
    // Convert camelCase to Title Case
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const handleEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const handleSaveEdit = () => {
    if (editingField) {
      formMemory.updateField(sessionId, editingField, editValue);
      setEditingField(null);
      setEditValue('');
      toast({
        title: 'Field updated',
        description: `${getFieldLabel(editingField)} has been updated`,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const canSubmit = (): boolean => {
    const requiredFields = getAllRequiredFields();
    return conversationalFormExtractor.isConversationComplete(
      formConfig.topics,
      capturedData
    );
  };

  const handleSubmit = async () => {
    console.log('[DEBUG] ===== handleSubmit called =====');
    console.log('[DEBUG] formConfig.id:', formConfig.id);
    console.log('[DEBUG] sessionId:', sessionId);
    
    // Validation disabled for voice forms - AI collects data during conversation
    // Allow submission regardless of completeness to support flexible voice interactions
    
    setSubmitting(true);
    try {
      formMemory.completeForm(sessionId);
      const submissionData = formMemory.getSubmissionData(sessionId);
      
      console.log('[DEBUG] Submission data:', submissionData);
      console.log('[DEBUG] Calling submit-voice-form edge function...');

      const { data, error } = await supabase.functions.invoke('submit-voice-form', {
        body: {
          formId: formConfig.id,
          assistantId: formConfig.assistant_id,
          sessionId,
          data: submissionData?.collectedData,
          fieldCollectionLog: submissionData?.conversationTranscript,
        },
      });

      console.log('[DEBUG] submit-voice-form response:', { data, error });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your form has been submitted successfully',
      });

      // Clear form memory
      formMemory.clearForm(sessionId);

      // Dispatch session end event instead of reload
      console.log('📢 Dispatching voice_session_end event');
      window.dispatchEvent(new CustomEvent('voice_session_end', {
        detail: { 
          sessionId,
          formId: formConfig.id,
          success: true
        }
      }));
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit form',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Progress Header */}
      <div>
        <h3 className="font-semibold mb-2">Your Information</h3>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          {progress}% complete
        </p>
      </div>

      {/* Topics */}
      <div className="space-y-4">
        {formConfig.topics.map((topic: any) => (
          <Card key={topic.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {topic.name}
                {isTopicComplete(topic) ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                {topic.required && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Required
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topic.dataPoints.map((field: string) => (
                <div 
                  key={field} 
                  className={`flex items-center justify-between gap-2 p-2 rounded-md transition-all duration-300 ${
                    recentlyUpdatedFields.has(field) 
                      ? 'bg-green-500/10 border-l-4 border-green-500 animate-in slide-in-from-left' 
                      : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-muted-foreground">
                      {getFieldLabel(field)}
                    </Label>
                    <p className={`text-sm font-medium truncate ${
                      recentlyUpdatedFields.has(field) ? 'text-green-600 dark:text-green-400' : ''
                    }`}>
                      {capturedData[field] || (
                        <span className="text-muted-foreground italic">Not provided</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(field, capturedData[field])}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversation Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="text-xs font-medium mb-2">Conversation Notes</h4>
          <p className="text-xs text-muted-foreground">
            {Object.keys(capturedData).length > 0
              ? `Collected ${Object.keys(capturedData).length} field${
                  Object.keys(capturedData).length > 1 ? 's' : ''
                } so far...`
              : 'Start chatting to collect information'}
          </p>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="space-y-2">
        {/* Primary voice-first submit */}
        {canSubmit() && (
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
          >
            {submitting ? 'Submitting...' : 'Submit Form'}
          </Button>
        )}
        
        {/* Manual submit option - always visible but smaller */}
        {!canSubmit() && Object.keys(capturedData).length > 0 && (
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
            size="sm"
            variant="outline"
          >
            {submitting ? 'Submitting...' : 'Submit Anyway'}
          </Button>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingField !== null} onOpenChange={() => handleCancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingField ? getFieldLabel(editingField) : ''}</DialogTitle>
            <DialogDescription>
              Update the value for this field
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter value"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
