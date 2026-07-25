import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Mic, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VADThresholdControlProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
  audioLevel: number;
  isListening: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const VADThresholdControl: React.FC<VADThresholdControlProps> = ({
  threshold,
  onThresholdChange,
  audioLevel,
  isListening,
  isExpanded = false,
  onToggleExpanded
}) => {
  const isAboveThreshold = audioLevel > threshold;

  // Collapsed (minimized) view - just the audio level bar
  if (!isExpanded) {
    return (
      <Card className="p-2 bg-muted/50 border-border">
        <div className="flex items-center gap-2">
          {/* Compact audio level meter */}
          <div className="flex-1 relative h-6 bg-background rounded overflow-hidden border border-border">
            {/* Audio level bar */}
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 transition-all duration-75",
                isAboveThreshold
                  ? "bg-gradient-to-r from-green-500 to-green-400"
                  : "bg-gradient-to-r from-blue-500 to-blue-400"
              )}
              style={{ width: `${audioLevel * 100}%` }}
            />
            
            {/* Microphone icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Mic
                className={cn(
                  "h-3 w-3 transition-all duration-200",
                  isAboveThreshold
                    ? "text-white drop-shadow-lg"
                    : "text-muted-foreground/30"
                )}
              />
            </div>
          </div>

          {/* Expand button */}
          {onToggleExpanded && (
            <Button
              onClick={onToggleExpanded}
              variant="ghost"
              size="sm"
              className="h-6 px-2"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Expanded (full) view - all controls
  return (
    <Card className="p-4 bg-muted/50 border-border">
      <div className="space-y-4">
        {/* Header with collapse button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Voice Detection Sensitivity</span>
          </div>
          {onToggleExpanded && (
            <Button
              onClick={onToggleExpanded}
              variant="ghost"
              size="sm"
              className="h-6 px-2"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Visual Audio Level Meter */}
        <div className="space-y-2">
          <div className="relative h-8 bg-background rounded-lg overflow-hidden border border-border">
            {/* Background grid */}
            <div className="absolute inset-0 flex">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-border/20 last:border-r-0"
                />
              ))}
            </div>

            {/* Audio level bar */}
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 transition-all duration-75",
                isAboveThreshold
                  ? "bg-gradient-to-r from-green-500 to-green-400"
                  : "bg-gradient-to-r from-blue-500 to-blue-400"
              )}
              style={{ width: `${audioLevel * 100}%` }}
            />

            {/* Threshold indicator line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${threshold * 100}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
            </div>

            {/* Center microphone icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Mic
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  isAboveThreshold
                    ? "text-white drop-shadow-lg scale-110"
                    : "text-muted-foreground/30"
                )}
              />
            </div>
          </div>

          {/* Status text */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Audio Level: <span className="font-mono text-foreground">{(audioLevel * 100).toFixed(0)}%</span>
            </span>
            {isAboveThreshold && isListening && (
              <span className="text-green-500 font-medium animate-pulse">
                🎤 Detecting voice
              </span>
            )}
          </div>
        </div>

        {/* Threshold slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Threshold</span>
            <span className="font-mono text-foreground">{(threshold * 100).toFixed(0)}%</span>
          </div>
          
          <Slider
            value={[threshold]}
            onValueChange={(values) => onThresholdChange(values[0])}
            min={0.1}
            max={0.9}
            step={0.05}
            className="cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>More sensitive</span>
            <span>Less sensitive</span>
          </div>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Adjust the red line to set when your voice triggers the AI. 
          Lower = picks up quieter sounds. Higher = only loud sounds.
        </p>
      </div>
    </Card>
  );
};
