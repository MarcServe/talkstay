import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceStatusIndicatorProps {
  status: 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error' | 'success';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  status,
  className,
  size = 'md',
  showText = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          text: 'Connecting...',
          animate: 'animate-spin'
        };
      case 'listening':
        return {
          icon: Mic,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/30',
          text: 'Listening',
          animate: 'animate-pulse'
        };
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          text: 'Processing...',
          animate: 'animate-spin'
        };
      case 'speaking':
        return {
          icon: Volume2,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          text: 'AI Speaking',
          animate: 'animate-pulse'
        };
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          text: 'Ready',
          animate: ''
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          text: 'Error',
          animate: 'animate-pulse'
        };
      default:
        return {
          icon: MicOff,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/20',
          text: 'Ready',
          animate: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeConfig = {
    sm: { 
      container: 'h-8 px-3 text-xs gap-1.5',
      icon: 12,
      padding: 'p-1'
    },
    md: { 
      container: 'h-10 px-4 text-sm gap-2',
      icon: 16,
      padding: 'p-2'
    },
    lg: { 
      container: 'h-12 px-5 text-base gap-2.5',
      icon: 20,
      padding: 'p-2.5'
    }
  };

  const sizes = sizeConfig[size];

  return (
    <div className={cn(
      "inline-flex items-center rounded-full border transition-all duration-300",
      "backdrop-blur-sm font-medium",
      sizes.container,
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className={cn(
        "rounded-full transition-all duration-200",
        config.bgColor,
        sizes.padding
      )}>
        <Icon 
          size={sizes.icon} 
          className={cn(
            config.color,
            config.animate,
            "transition-colors duration-200"
          )} 
        />
      </div>
      
      {showText && (
        <span className={cn(
          config.color,
          "font-medium transition-colors duration-200"
        )}>
          {config.text}
        </span>
      )}
    </div>
  );
};