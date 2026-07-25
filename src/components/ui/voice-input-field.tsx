import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, History, Zap, AlertTriangle, RotateCcw, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceVisualizer } from './voice-visualizer';
import { InputMethodToggle, InputMethod, InputStatus } from './input-method-toggle';
import { voiceTransitions, getVoiceAcknowledgment } from '@/utils/voiceTransitions';
import { voiceErrorRecovery, VoiceErrorRecovery } from '@/utils/voiceErrorRecovery';
import { cn } from '@/lib/utils';

// Extend window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((ev: Event) => any) | null;
  onresult: ((ev: any) => any) | null;
  onerror: ((ev: any) => any) | null;
  onend: ((ev: Event) => any) | null;
  start(): void;
  stop(): void;
}

interface VoiceInputFieldProps {
  id?: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  onMethodChange?: (method: InputMethod) => void;
  initialMethod?: InputMethod;
  showSecureOption?: boolean;
  onSecureInput?: () => void;
  className?: string;
  fieldType?: string;
  showTransitionHistory?: boolean;
  onVoiceAcknowledgment?: (message: string) => void;
  size?: 'default' | 'large';
}

export const VoiceInputField: React.FC<VoiceInputFieldProps> = ({
  id,
  label,
  value,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  error,
  onChange,
  onMethodChange,
  initialMethod = 'text',
  showSecureOption = false,
  onSecureInput,
  className,
  fieldType = 'default',
  showTransitionHistory = true,
  onVoiceAcknowledgment,
  size = 'default'
}) => {
  const [currentMethod, setCurrentMethod] = useState<InputMethod>(
    value && initialMethod === 'voice' ? 'voice' : initialMethod
  );
  const [status, setStatus] = useState<InputStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string>();
  const [lastUsedMethod, setLastUsedMethod] = useState<InputMethod | undefined>();
  const [switchCount, setSwitchCount] = useState(0);
  const [acknowledgment, setAcknowledgment] = useState<string>();
  const [showRetryOptions, setShowRetryOptions] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousMethodRef = useRef<InputMethod>(currentMethod);

  // Voice error recovery is handled by the global instance

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatus('capturing');
        setVoiceError(undefined);
        setShowRetryOptions(false);
        
        // Reset error recovery on new attempt
        voiceErrorRecovery.clear();
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          onChange(transcript.trim());
          setStatus('success');
          setLastUsedMethod('voice');
          setVoiceError(undefined);
          
          // Record successful voice transition
          voiceTransitions.recordTransition(fieldType, previousMethodRef.current, 'voice', true);
          
          // Show smart acknowledgment with enhanced feedback
          const ack = getVoiceAcknowledgment(fieldType, 'voice', true);
          setAcknowledgment('✓ Voice captured successfully');
          
          // Auto-hide success state and acknowledgment
          setTimeout(() => {
            setStatus('idle');
            setAcknowledgment(undefined);
          }, 3000);
        } else {
          handleVoiceError('No speech detected', 'timeout');
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setStatus('error');
        
        const errorTypeMap: Record<string, 'network' | 'permission' | 'timeout' | 'processing' | 'recognition'> = {
          'network': 'network',
          'not-allowed': 'permission', 
          'no-speech': 'timeout',
          'audio-capture': 'processing',
          'service-not-allowed': 'permission'
        };
        
        const errorType = errorTypeMap[event.error] || 'recognition';
        handleVoiceError(
          event.error === 'network' ? 'Network error occurred' :
          event.error === 'not-allowed' ? 'Microphone access denied' :
          event.error === 'no-speech' ? 'No speech detected' :
          'Voice recognition error',
          errorType
        );
      };

      recognition.onend = () => {
        setIsListening(false);
        if (status === 'capturing') {
          setStatus('idle');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status]);

  const handleVoiceError = async (errorMessage: string, errorType?: 'network' | 'permission' | 'timeout' | 'processing' | 'recognition') => {
    setStatus('error');
    setVoiceError(errorMessage);
    
    // Use global error recovery instance
    const recovered = await voiceErrorRecovery.handleError(
      new Error(errorMessage), 
      { 
        type: errorType === 'permission' ? 'permission' : 
              errorType === 'network' ? 'connection' : 
              errorType === 'timeout' ? 'session' : 'transcription',
        severity: errorType === 'permission' ? 'critical' : 'medium'
      },
      () => {
        // On successful recovery
        setVoiceError(undefined);
        setStatus('idle');
        setShowRetryOptions(false);
      },
      () => {
        // On recovery failure
        setShowRetryOptions(true);
      }
    );
    
    // Record failed voice transition
    voiceTransitions.recordTransition(fieldType, 'voice', 'voice', false);
  };

  const handleMethodChange = (method: InputMethod) => {
    if (method === 'secure' && onSecureInput) {
      onSecureInput();
      return;
    }

    // Track method switches
    if (method !== currentMethod) {
      setSwitchCount(prev => prev + 1);
      voiceTransitions.recordTransition(fieldType, currentMethod, method, true);
      previousMethodRef.current = currentMethod;
    }

    if (method === 'voice' && currentMethod !== 'voice') {
      startVoiceCapture();
    } else if (method !== 'voice' && isListening) {
      stopVoiceCapture();
    }

    setCurrentMethod(method);
    onMethodChange?.(method);

    // Record method used for text input
    if (method === 'text' && value) {
      setLastUsedMethod('text');
    }
  };

  const startVoiceCapture = () => {
    if (!recognitionRef.current || isListening) return;

    try {
      setStatus('processing');
      recognitionRef.current.start();
      
      // Auto-stop after 10 seconds with better error handling
      timeoutRef.current = setTimeout(() => {
        if (isListening) {
          stopVoiceCapture();
          handleVoiceError('Timeout - please try again', 'timeout');
        }
      }, 10000);
    } catch (error) {
      handleVoiceError('Could not start voice recognition', 'processing');
    }
  };

  const stopVoiceCapture = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const toggleVoiceCapture = () => {
    if (isListening) {
      stopVoiceCapture();
    } else {
      startVoiceCapture();
    }
  };

  const renderVoiceIndicator = () => {
    if (currentMethod !== 'voice') return null;

    return (
      <div className="relative w-full">
        <div className={cn(
          "border rounded-lg transition-all duration-500 transform w-full",
          size === 'large' ? "p-4" : "p-5 sm:p-4",
          status === 'capturing' && "border-blue-300 bg-blue-50 scale-[1.02] shadow-lg shadow-blue-100",
          status === 'success' && "border-green-300 bg-green-50 scale-[1.01] shadow-lg shadow-green-100",
          status === 'error' && "border-red-300 bg-red-50 scale-[1.01] shadow-lg shadow-red-100",
          status === 'idle' && value && "border-green-300 bg-green-50",
          status === 'idle' && !value && "border-muted bg-muted/30 hover:bg-muted/50"
        )}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleVoiceCapture}
                disabled={disabled || status === 'processing'}
                className={cn(
                  "transition-all duration-300 hover:scale-105 flex-shrink-0",
                  size === 'large' ? "h-16 w-16" : "h-12 w-12 sm:h-9 sm:w-9",
                  isListening && "border-blue-500 text-blue-600 bg-blue-50",
                  status === 'success' && "border-green-500 text-green-600 bg-green-50"
                )}
              >
                {isListening ? (
                  <MicOff className={cn("animate-pulse", size === 'large' ? "h-7 w-7" : "h-5 w-5 sm:h-4 sm:w-4")} />
                ) : (
                  <Mic className={cn(size === 'large' ? "h-7 w-7" : "h-5 w-5 sm:h-4 sm:w-4")} />
                )}
              </Button>
              
              <div className="flex-1 min-w-0">
                {value ? (
                  <div className="space-y-1">
                    <p className={cn(
                      "font-medium text-foreground break-words",
                      size === 'large' ? "text-lg" : "text-base sm:text-sm"
                    )}>{value}</p>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-muted-foreground",
                        size === 'large' ? "text-sm" : "text-sm sm:text-xs"
                      )}>Voice captured</p>
                      {acknowledgment && (
                        <div className={cn(
                          "text-green-600 animate-fade-in",
                          size === 'large' ? "text-sm" : "text-sm sm:text-xs"
                        )}>
                          {acknowledgment}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className={cn(
                      "text-muted-foreground",
                      size === 'large' ? "text-base" : "text-base sm:text-sm"
                    )}>
                      {status === 'capturing' ? 'Listening...' : 
                       status === 'processing' ? 'Processing...' : 
                       'Click microphone to speak'}
                    </p>
                    {status === 'capturing' && (
                      <p className={cn(
                        "text-blue-600 mt-1",
                        size === 'large' ? "text-sm" : "text-sm sm:text-xs"
                      )}>Speak clearly into your microphone</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Voice visualizer */}
            <VoiceVisualizer 
              isListening={isListening}
              isProcessing={status === 'processing'}
              isSpeaking={false}
              className="ml-2 flex-shrink-0"
            />
          </div>

          {voiceError && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{voiceError}</span>
              </div>
              
              {showRetryOptions && (
                <div className="flex items-center gap-2 text-xs error-recovery-options">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVoiceError(undefined);
                      setStatus('idle');
                      setShowRetryOptions(false);
                      startVoiceCapture();
                    }}
                    className="h-8 text-xs gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry Voice
                  </Button>
                  <Button
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCurrentMethod('secure');
                      setVoiceError(undefined);
                      setShowRetryOptions(false);
                    }}
                    className="h-8 text-xs gap-1"
                  >
                    <Keyboard className="h-3 w-3" />
                    Type Instead
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTextInput = () => {
    if (currentMethod !== 'text') return null;

    return (
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value && !lastUsedMethod) {
              setLastUsedMethod('text');
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "transition-all duration-300 transform hover:scale-[1.01] focus:scale-[1.01] break-words text-gray-900",
            size === 'large' ? "h-16 text-lg px-4" : "h-12 text-base sm:h-10 sm:text-sm",
            error && "border-red-500 focus:border-red-500",
            value && "border-green-300 bg-green-50/50"
          )}
        />
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Zap className={cn("text-green-500", size === 'large' ? "h-7 w-7" : "h-4 w-4 sm:h-3 sm:w-3")} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>

      <InputMethodToggle
        currentMethod={currentMethod}
        status={status}
        onMethodChange={handleMethodChange}
        hasValue={!!value}
        errorMessage={voiceError || error}
        disabled={disabled}
        showSecure={showSecureOption}
        fieldId={id}
        lastUsedMethod={lastUsedMethod}
        switchCount={switchCount}
        className={cn("mb-2", size === 'large' && "mb-3")}
      />

      <div className="relative w-full">
        {renderTextInput()}
        {renderVoiceIndicator()}
      </div>

      {error && currentMethod === 'text' && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};