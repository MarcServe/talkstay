import React from 'react';
import { cn } from '@/lib/utils';

interface CircularTextProps {
  text?: string;
  radius?: number;
  fontSize?: number;
  className?: string;
  animationDuration?: number;
  color?: string;
}

export const CircularText: React.FC<CircularTextProps> = ({
  text = "TalkWeb • TalkWeb • TalkWeb • ",
  radius = 40,
  fontSize = 12,
  className,
  animationDuration = 15,
  color = "hsl(var(--primary))"
}) => {
  const circumference = 2 * Math.PI * radius;
  const viewBoxSize = (radius + 10) * 2;
  const center = viewBoxSize / 2;

  return (
    <svg
      width={viewBoxSize}
      height={viewBoxSize}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className={cn("absolute inset-0", className)}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <path
          id="circle-path"
          d={`M ${center},${center} m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`}
        />
      </defs>
      
      <text
        fontSize={fontSize}
        fill={color}
        fillOpacity={0.7}
        fontWeight="500"
        letterSpacing="0.5px"
        className="font-sans"
      >
        <textPath href="#circle-path" startOffset="0%">
          <animate
            attributeName="startOffset"
            values="0%;100%"
            dur={`${animationDuration}s`}
            repeatCount="indefinite"
          />
          {text}
        </textPath>
      </text>
    </svg>
  );
};