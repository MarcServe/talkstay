import React from 'react';
import { cn } from '@/lib/utils';

interface VoiceVisualizerProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isListening,
  isProcessing,
  isSpeaking,
  className,
  size = 'md',
  showLabel = false
}) => {
  const getVisualizationState = () => {
    if (isSpeaking) return 'speaking';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    return 'idle';
  };

  const state = getVisualizationState();
  
  const getStateLabel = () => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'AI Speaking...';
      default: return 'Ready';
    }
  };

  const sizeConfig = {
    sm: { width: 'w-0.5', gap: 'gap-0.5', heights: { idle: 'h-1', listening: 'h-4', processing: 'h-3', speaking: 'h-5' } },
    md: { width: 'w-1', gap: 'gap-1', heights: { idle: 'h-2', listening: 'h-8', processing: 'h-6', speaking: 'h-10' } },
    lg: { width: 'w-1.5', gap: 'gap-1.5', heights: { idle: 'h-3', listening: 'h-12', processing: 'h-9', speaking: 'h-16' } }
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className={cn("flex items-center justify-center", config.gap)}>
        {/* Enhanced Voice Activity Bars with better animations */}
        {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
          <div
            key={bar}
            className={cn(
              config.width,
              "rounded-full transition-all duration-300 ease-out",
              {
                'idle': cn(config.heights.idle, 'bg-muted-foreground/30'),
                'listening': cn(
                  config.heights.listening, 
                  'bg-primary animate-pulse-voice shadow-sm',
                  'shadow-primary/30'
                ),
                'processing': cn(
                  config.heights.processing, 
                  'bg-amber-500 animate-pulse',
                  'shadow-sm shadow-amber-500/30'
                ),
                'speaking': cn(
                  config.heights.speaking, 
                  'bg-emerald-500 animate-pulse-voice shadow-sm',
                  'shadow-emerald-500/30'
                )
              }[state]
            )}
            style={{
              animationDelay: `${bar * 80}ms`,
              transform: state === 'listening' || state === 'speaking' 
                ? `scaleY(${0.8 + Math.sin(Date.now() * 0.01 + bar) * 0.2})` 
                : 'scaleY(1)'
            }}
          />
        ))}
      </div>
      
      {/* Enhanced state label with smooth transitions */}
      {showLabel && (
        <div className={cn(
          "mt-2 text-xs font-medium transition-all duration-300",
          {
            'idle': 'text-muted-foreground/70',
            'listening': 'text-primary animate-pulse',
            'processing': 'text-amber-600',
            'speaking': 'text-emerald-600'
          }[state]
        )}>
          <span className="animate-fade-in">{getStateLabel()}</span>
        </div>
      )}
      
      {/* Background glow effect for enhanced states */}
      {(state === 'listening' || state === 'speaking') && (
        <div className={cn(
          "absolute inset-0 rounded-full blur-xl opacity-20 -z-10 animate-pulse",
          state === 'listening' ? 'bg-primary' : 'bg-emerald-500'
        )} />
      )}
    </div>
  );
};