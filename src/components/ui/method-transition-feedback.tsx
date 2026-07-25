import React from 'react';
import { Mic, Keyboard, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MethodTransitionFeedbackProps {
  fromMethod: 'voice' | 'text' | 'secure';
  toMethod: 'voice' | 'text' | 'secure';
  success: boolean;
  message?: string;
  className?: string;
}

export const MethodTransitionFeedback: React.FC<MethodTransitionFeedbackProps> = ({
  fromMethod,
  toMethod,
  success,
  message,
  className
}) => {
  const getMethodIcon = (method: 'voice' | 'text' | 'secure') => {
    switch (method) {
      case 'voice':
        return <Mic className="h-4 w-4" />;
      case 'secure':
        return <Shield className="h-4 w-4" />;
      default:
        return <Keyboard className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: 'voice' | 'text' | 'secure') => {
    switch (method) {
      case 'voice':
        return 'Voice';
      case 'secure':
        return 'Secure Text';
      default:
        return 'Text';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
      success 
        ? "bg-green-50 border-green-200 text-green-700" 
        : "bg-blue-50 border-blue-200 text-blue-700",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
          "bg-white/60 border"
        )}>
          {getMethodIcon(fromMethod)}
          {getMethodLabel(fromMethod)}
        </div>
        
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
          success ? "bg-green-100 border-green-200" : "bg-blue-100 border-blue-200"
        )}>
          {getMethodIcon(toMethod)}
          {getMethodLabel(toMethod)}
        </div>
      </div>

      <div className="flex-1">
        {success && <CheckCircle className="h-4 w-4 text-green-600 inline mr-2" />}
        <span className="text-sm">
          {message || (success 
            ? `Switched to ${getMethodLabel(toMethod).toLowerCase()} input successfully`
            : `Switching to ${getMethodLabel(toMethod).toLowerCase()} input...`
          )}
        </span>
      </div>
    </div>
  );
};