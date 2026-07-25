import React from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
  reconnectAttempt?: number;
  className?: string;
  showText?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  reconnectAttempt = 0,
  className,
  showText = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'connecting':
        return {
          icon: Loader2,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          animate: true
        };
      case 'reconnecting':
        return {
          icon: Loader2,
          text: `Reconnecting... (${reconnectAttempt})`,
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          animate: true
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Connection Error',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon 
        className={cn(
          "h-3 w-3",
          config.animate && "animate-spin"
        )} 
      />
      {showText && (
        <span className="whitespace-nowrap">
          {config.text}
        </span>
      )}
    </Badge>
  );
};