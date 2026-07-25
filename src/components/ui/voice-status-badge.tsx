import React from 'react';
import { Mic, Brain, Volume2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceStatusBadgeProps {
  status: 'listening' | 'processing' | 'ai_responding' | 'idle' | 'error';
  className?: string;
}

export const VoiceStatusBadge: React.FC<VoiceStatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'listening':
        return {
          icon: Mic,
          text: 'Listening...',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          pulseColor: 'bg-green-400'
        };
      case 'processing':
        return {
          icon: Clock,
          text: 'Processing...',
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          pulseColor: 'bg-orange-400'
        };
      case 'ai_responding':
        return {
          icon: Volume2,
          text: 'AI Responding...',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          pulseColor: 'bg-blue-400'
        };
      case 'error':
        return {
          icon: Brain,
          text: 'Error',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          pulseColor: 'bg-red-400'
        };
      default:
        return {
          icon: Brain,
          text: 'Ready',
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          pulseColor: 'bg-gray-400'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium shadow-sm",
      config.bgColor,
      config.textColor,
      className
    )}>
      <Icon size={14} className={cn(
        status === 'listening' && "animate-pulse",
        status === 'processing' && "animate-spin",
        status === 'ai_responding' && "animate-pulse"
      )} />
      <span>{config.text}</span>
      {(status === 'listening' || status === 'processing' || status === 'ai_responding') && (
        <div className="flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 h-1 rounded-full animate-pulse",
                config.pulseColor
              )}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};