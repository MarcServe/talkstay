import React from 'react';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Loader2, Volume2, Square, Play } from 'lucide-react';

export type VoiceState = 
  | 'idle'          // Connected but not active
  | 'listening'     // Actively listening for user input
  | 'processing'    // Processing user speech
  | 'speaking'      // AI is speaking
  | 'stopped'       // Manually stopped/paused
  | 'disconnected'  // Not connected
  | 'connecting';   // Establishing connection

interface EnhancedVoiceVisualizerProps {
  state: VoiceState;
  speechDetected?: boolean;
  className?: string;
}

export const EnhancedVoiceVisualizer: React.FC<EnhancedVoiceVisualizerProps> = ({
  state,
  speechDetected = false,
  className
}) => {
  const getStateConfig = () => {
    switch (state) {
      case 'listening':
        return {
          icon: Mic,
          iconColor: speechDetected ? 'text-green-500' : 'text-blue-500',
          iconBg: speechDetected ? 'bg-green-100' : 'bg-blue-100',
          barColor: speechDetected ? 'bg-green-500' : 'bg-blue-500',
          animation: speechDetected ? 'animate-pulse' : 'animate-bounce',
          label: speechDetected ? 'Listening...' : 'Ready to listen',
          labelColor: speechDetected ? 'text-green-600' : 'text-blue-600'
        };
      case 'processing':
        return {
          icon: Loader2,
          iconColor: 'text-yellow-500',
          iconBg: 'bg-yellow-100',
          barColor: 'bg-yellow-500',
          animation: 'animate-spin',
          label: 'Processing...',
          labelColor: 'text-yellow-600'
        };
      case 'speaking':
        return {
          icon: Volume2,
          iconColor: 'text-purple-500',
          iconBg: 'bg-purple-100',
          barColor: 'bg-purple-500',
          animation: 'animate-pulse',
          label: 'AI is speaking...',
          labelColor: 'text-purple-600'
        };
      case 'stopped':
        return {
          icon: Square,
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-100',
          barColor: 'bg-orange-300',
          animation: '',
          label: 'Session paused',
          labelColor: 'text-orange-600'
        };
      case 'connecting':
        return {
          icon: Loader2,
          iconColor: 'text-gray-500',
          iconBg: 'bg-gray-100',
          barColor: 'bg-gray-400',
          animation: 'animate-spin',
          label: 'Connecting...',
          labelColor: 'text-gray-600'
        };
      case 'disconnected':
        return {
          icon: MicOff,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          barColor: 'bg-red-300',
          animation: '',
          label: 'Disconnected',
          labelColor: 'text-red-600'
        };
      default: // idle
        return {
          icon: Play,
          iconColor: 'text-muted-foreground',
          iconBg: 'bg-muted',
          barColor: 'bg-muted-foreground/30',
          animation: '',
          label: 'Ready',
          labelColor: 'text-muted-foreground'
        };
    }
  };

  const config = getStateConfig();
  const IconComponent = config.icon;

  const getBarHeight = (index: number) => {
    switch (state) {
      case 'listening':
        return speechDetected ? 
          ['h-6', 'h-8', 'h-10', 'h-8', 'h-6'][index] : 
          ['h-3', 'h-4', 'h-5', 'h-4', 'h-3'][index];
      case 'processing':
        return ['h-4', 'h-6', 'h-8', 'h-6', 'h-4'][index];
      case 'speaking':
        return ['h-8', 'h-10', 'h-12', 'h-10', 'h-8'][index];
      case 'stopped':
        return ['h-2', 'h-2', 'h-2', 'h-2', 'h-2'][index];
      case 'connecting':
        return ['h-3', 'h-5', 'h-4', 'h-5', 'h-3'][index];
      default:
        return ['h-2', 'h-2', 'h-2', 'h-2', 'h-2'][index];
    }
  };

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Central Icon */}
      <div className={cn(
        "relative p-4 rounded-full transition-all duration-300",
        config.iconBg,
        config.animation
      )}>
        <IconComponent className={cn("w-6 h-6", config.iconColor)} />
        
        {/* Pulse Ring Animation for Active States */}
        {(state === 'listening' && speechDetected) || state === 'speaking' ? (
          <div className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-20",
            state === 'listening' ? 'bg-green-500' : 'bg-purple-500'
          )} />
        ) : null}
      </div>

      {/* Voice Activity Bars */}
      <div className="flex items-end justify-center gap-1.5 min-h-[3rem]">
        {[0, 1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              "w-1.5 rounded-full transition-all duration-300 ease-out",
              getBarHeight(bar),
              config.barColor,
              {
                'listening': speechDetected ? 'animate-pulse' : '',
                'processing': 'animate-pulse',
                'speaking': 'animate-pulse',
                'connecting': 'animate-pulse'
              }[state] || ''
            )}
            style={{
              animationDelay: `${bar * 100}ms`,
              animationDuration: state === 'speaking' ? '0.5s' : '1s'
            }}
          />
        ))}
      </div>

      {/* State Label */}
      <div className={cn(
        "text-sm font-medium transition-colors duration-200",
        config.labelColor
      )}>
        {config.label}
      </div>

      {/* Additional Context for Certain States */}
      {state === 'listening' && speechDetected && (
        <div className="text-xs text-muted-foreground animate-fade-in">
          Speak clearly for best results
        </div>
      )}
      
      {state === 'stopped' && (
        <div className="text-xs text-muted-foreground animate-fade-in">
          Click play to resume listening
        </div>
      )}

      {state === 'processing' && (
        <div className="text-xs text-muted-foreground animate-fade-in">
          Understanding your message...
        </div>
      )}
    </div>
  );
};