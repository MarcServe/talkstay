import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Volume2, FormInput, Loader2 } from 'lucide-react';
import { languageManager } from '@/utils/languageDetection';
import { useTranslation } from '@/utils/translations';
import { LanguageSelector } from './LanguageSelector';

interface FormField {
  element: HTMLElement;
  type: string;
  label: string;
  placeholder?: string;
  value?: string;
}

export const VoiceFormFiller = () => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedForms, setDetectedForms] = useState<FormField[]>([]);
  const [currentField, setCurrentField] = useState<FormField | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState(languageManager.getCurrentLanguage());
  const { toast } = useToast();

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = languageManager.getSpeechRecognitionLanguage();

      recognitionInstance.onstart = () => {
        setIsListening(true);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceInput(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: t('error.speechRecognition'),
          description: t('error.speechRecognition'),
          variant: "destructive",
        });
      };

      setRecognition(recognitionInstance);
    }

    // Scan for forms on page load
    scanForForms();

    // Listen for language changes
    const unsubscribe = languageManager.onLanguageChange((language) => {
      setCurrentLanguage(language);
      if (recognition) {
        recognition.lang = languageManager.getSpeechRecognitionLanguage();
      }
    });

    return unsubscribe;
  }, []);

  const scanForForms = () => {
    const forms = document.querySelectorAll('form');
    const formFields: FormField[] = [];

    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        const htmlInput = input as HTMLInputElement;
        
        // Skip hidden, submit, and button inputs
        if (htmlInput.type === 'hidden' || htmlInput.type === 'submit' || htmlInput.type === 'button') {
          return;
        }

        const label = getFieldLabel(htmlInput);
        
        formFields.push({
          element: htmlInput,
          type: htmlInput.type || htmlInput.tagName.toLowerCase(),
          label: label,
          placeholder: htmlInput.placeholder,
          value: htmlInput.value
        });
      });
    });

    setDetectedForms(formFields);
    
    if (formFields.length > 0) {
      toast({
        title: t('form.scanForForms'),
        description: `Found ${formFields.length} form fields that can be filled with voice input.`,
      });
    }
  };

  const getFieldLabel = (element: HTMLElement): string => {
    // Try to find associated label
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      return labelElement.textContent?.trim() || '';
    }

    // Check for parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.replace(element.textContent || '', '').trim() || '';
    }

    // Use placeholder or name attribute
    const placeholder = element.getAttribute('placeholder');
    const name = element.getAttribute('name');
    
    return placeholder || name || `Field ${Math.random().toString(36).substr(2, 5)}`;
  };

  const startVoiceInput = (field: FormField) => {
    if (!recognition) {
      toast({
        title: t('error.voiceNotSupported'),
        description: t('error.voiceNotSupported'),
        variant: "destructive",
      });
      return;
    }

    setCurrentField(field);
    setIsProcessing(true);
    
    // Highlight the field
    field.element.style.border = '2px solid #3b82f6';
    field.element.focus();
    
    recognition.start();
  };

  const handleVoiceInput = (transcript: string) => {
    if (!currentField) return;

    setIsProcessing(false);
    
    // Remove highlight
    currentField.element.style.border = '';
    
    // Fill the form field
    const inputElement = currentField.element as HTMLInputElement;
    
    if (inputElement.type === 'email') {
      // Process email format
      const emailPattern = transcript.toLowerCase()
        .replace(/\s+at\s+/g, '@')
        .replace(/\s+dot\s+/g, '.')
        .replace(/\s+/g, '');
      inputElement.value = emailPattern;
    } else if (inputElement.type === 'tel') {
      // Process phone number format
      const phonePattern = transcript.replace(/\D/g, '');
      inputElement.value = phonePattern;
    } else {
      // Regular text input
      inputElement.value = transcript;
    }

    // Trigger input event for frameworks that listen to it
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    toast({
      title: t('form.fillWithVoice'),
      description: `"${currentField.label}" has been filled with voice input.`,
    });

    setCurrentField(null);
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    setIsProcessing(false);
    
    if (currentField) {
      currentField.element.style.border = '';
      setCurrentField(null);
    }
  };

  if (detectedForms.length === 0) {
    return (
      <Card className="bg-glass border-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <FormInput className="w-5 h-5" />
              Voice Form Filler
            </div>
            <LanguageSelector variant="compact" showLabel={false} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FormInput className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t('form.noFormsDetected')}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={scanForForms}
            >
              {t('form.scanForForms')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass border-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <FormInput className="w-5 h-5" />
              Voice Form Filler
              <Badge variant="secondary">{detectedForms.length} fields</Badge>
            </div>
            <LanguageSelector variant="compact" showLabel={false} />
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {detectedForms.map((field, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{field.label}</div>
                <div className="text-sm text-muted-foreground">
                  Type: {field.type} 
                  {field.placeholder && ` • Placeholder: ${field.placeholder}`}
                </div>
                {field.value && (
                  <div className="text-sm text-green-600 mt-1">
                    Current: {field.value.substring(0, 50)}
                    {field.value.length > 50 ? '...' : ''}
                  </div>
                )}
              </div>
              
              <Button
                variant={currentField === field ? "destructive" : "outline"}
                size="sm"
                onClick={() => currentField === field ? stopListening() : startVoiceInput(field)}
                disabled={isProcessing && currentField !== field}
              >
                {currentField === field ? (
                  isListening ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing
                    </>
                  )
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    {t('form.fillWithVoice')}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Click "{t('form.fillWithVoice')}" next to any field to use voice input
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={scanForForms}
          >
            {t('form.refreshFields')}
          </Button>
        </div>

        {currentField && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Volume2 className="w-4 h-4" />
              <span className="font-medium">
                {isListening ? t('voice.listening') : t('voice.processing')}
              </span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Speak now to fill "{currentField.label}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};