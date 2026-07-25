import React, { useState, useEffect } from 'react';
import { Mic, Edit3, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type InputMethod = 'voice' | 'text' | 'secure';
export type InputStatus = 'idle' | 'capturing' | 'processing' | 'success' | 'error';

interface InputMethodToggleProps {
  currentMethod: InputMethod;
  status: InputStatus;
  onMethodChange: (method: InputMethod) => void;
  voiceLabel?: string;
  textLabel?: string;
  secureLabel?: string;
  hasValue?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  showSecure?: boolean;
  className?: string;
  fieldId?: string;
  lastUsedMethod?: InputMethod;
  switchCount?: number;
}

export const InputMethodToggle: React.FC<InputMethodToggleProps> = ({
  currentMethod,
  status,
  onMethodChange,
  voiceLabel = "Voice",
  textLabel = "Type",
  secureLabel = "Secure",
  hasValue = false,
  errorMessage,
  disabled = false,
  showSecure = false,
  className,
  fieldId,
  lastUsedMethod,
  switchCount = 0
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousMethod, setPreviousMethod] = useState<InputMethod>(currentMethod);
  const [transitionFeedback, setTransitionFeedback] = useState<{
    from: InputMethod;
    to: InputMethod;
    success: boolean;
    message?: string;
  } | null>(null);

  // Track method changes for animations
  useEffect(() => {
    if (currentMethod !== previousMethod) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      setPreviousMethod(currentMethod);
      return () => clearTimeout(timer);
    }
  }, [currentMethod, previousMethod]);

  const handleMethodChange = async (newMethod: InputMethod) => {
    if (disabled || newMethod === currentMethod) return;
    
    setIsTransitioning(true);
    
    // Smooth transition with animation
    setTimeout(() => {
      onMethodChange(newMethod);
    }, 150);
  };

  const getMethodIcon = (method: InputMethod) => {
    switch (method) {
      case 'voice':
        return <Mic className="h-3 w-3" />;
      case 'text':
        return <Edit3 className="h-3 w-3" />;
      case 'secure':
        return <Shield className="h-3 w-3" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'capturing':
        return <Mic className="h-3 w-3 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'capturing':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Captured';
      case 'error':
        return errorMessage || 'Error';
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Method History Indicator */}
      {hasValue && lastUsedMethod && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {getMethodIcon(lastUsedMethod)}
            <span>
              Entered via {lastUsedMethod === 'voice' ? 'voice' : lastUsedMethod === 'secure' ? 'secure input' : 'typing'}
            </span>
          </div>
          {switchCount > 0 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              {switchCount} {switchCount === 1 ? 'switch' : 'switches'}
            </Badge>
          )}
        </div>
      )}

      {/* Method Toggle Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex bg-muted rounded-lg p-1 relative overflow-hidden w-full">
            {/* Sliding background indicator */}
            <div 
              className={cn(
                "absolute top-1 bottom-1 bg-background shadow-sm rounded-md transition-all duration-300 ease-out",
                currentMethod === 'voice' && "left-1 right-auto w-[calc(33.333%-0.25rem)]",
                currentMethod === 'text' && showSecure && "left-[33.333%] right-auto w-[calc(33.333%-0.25rem)]",
                currentMethod === 'text' && !showSecure && "left-[50%] right-auto w-[calc(50%-0.25rem)]",
                currentMethod === 'secure' && "right-1 left-auto w-[calc(33.333%-0.25rem)]"
              )}
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMethodChange('voice')}
              disabled={disabled || isTransitioning}
              className={cn(
                "h-8 px-1.5 sm:px-4 text-[10px] sm:text-sm transition-all duration-300 relative z-10 flex-1 min-w-0",
                currentMethod === 'voice' && "text-foreground font-medium",
                currentMethod !== 'voice' && "text-muted-foreground hover:text-foreground",
                isTransitioning && "pointer-events-none"
              )}
            >
              <Mic className={cn(
                "h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5 transition-all duration-300 flex-shrink-0",
                currentMethod === 'voice' && status === 'capturing' && "animate-pulse text-blue-500"
              )} />
              <span className="truncate">{voiceLabel}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMethodChange('text')}
              disabled={disabled || isTransitioning}
              className={cn(
                "h-8 px-1.5 sm:px-4 text-[10px] sm:text-sm transition-all duration-300 relative z-10 flex-1 min-w-0",
                currentMethod === 'text' && "text-foreground font-medium",
                currentMethod !== 'text' && "text-muted-foreground hover:text-foreground",
                isTransitioning && "pointer-events-none"
              )}
            >
              <Edit3 className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5 flex-shrink-0" />
              <span className="truncate">{textLabel}</span>
            </Button>
            
            {showSecure && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMethodChange('secure')}
                disabled={disabled || isTransitioning}
                className={cn(
                  "h-8 px-1.5 sm:px-4 text-[10px] sm:text-sm transition-all duration-300 relative z-10 flex-1 min-w-0",
                  currentMethod === 'secure' && "text-foreground font-medium",
                  currentMethod !== 'secure' && "text-muted-foreground hover:text-foreground",
                  isTransitioning && "pointer-events-none"
                )}
              >
                <Shield className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5 flex-shrink-0" />
                <span className="truncate">{secureLabel}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Status Indicators */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {hasValue && status === 'idle' && (
            <div className="flex items-center gap-1">
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs transition-all duration-300",
                  lastUsedMethod === 'voice' && "bg-blue-50 text-blue-700 border-blue-200",
                  lastUsedMethod === 'secure' && "bg-purple-50 text-purple-700 border-purple-200",
                  lastUsedMethod === 'text' && "bg-green-50 text-green-700 border-green-200"
                )}
              >
                {getMethodIcon(lastUsedMethod || currentMethod)}
                <CheckCircle className="h-2 w-2 ml-1" />
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Status Text */}
      {getStatusText() && (
        <div className={cn(
          "text-xs px-2 py-1 rounded-md transition-all duration-200",
          status === 'capturing' && "bg-blue-50 text-blue-700",
          status === 'processing' && "bg-blue-50 text-blue-700",
          status === 'success' && "bg-green-50 text-green-700",
          status === 'error' && "bg-red-50 text-red-700"
        )}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>
        </div>
      )}

      {/* Enhanced Transition Indicator */}
      {isTransitioning && (
        <div className="text-xs text-center py-1">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Switching input method...</span>
          </div>
        </div>
      )}
    </div>
  );
};