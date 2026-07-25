import React from 'react';
import { Mic } from 'lucide-react';
import { CircularText } from './circular-text';
import { cn } from '@/lib/utils';

interface BrandedMicIconProps {
  size?: number;
  showText?: boolean;
  textRadius?: number;
  className?: string;
  micClassName?: string;
  animationSpeed?: number;
}

export const BrandedMicIcon: React.FC<BrandedMicIconProps> = ({
  size = 20,
  showText = true,
  textRadius,
  className,
  micClassName,
  animationSpeed = 15
}) => {
  // Calculate text radius based on mic size
  const calculatedRadius = textRadius || size * 2;
  const containerSize = (calculatedRadius + 10) * 2;
  
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      role="img"
      aria-label="Voice assistant"
      style={{ 
        width: containerSize, 
        height: containerSize,
        minWidth: containerSize,
        minHeight: containerSize
      }}
    >
      {showText && (
        <CircularText
          radius={calculatedRadius}
          fontSize={Math.max(6, size * 0.3)}
          animationDuration={animationSpeed}
          className="opacity-60"
        />
      )}
      <Mic 
        className={cn("relative z-10", micClassName)} 
        size={size}
      />
    </div>
  );
};