import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlatformDetectionResult {
  platform: string;
  confidence: number;
  technologyStack: any;
  cached: boolean;
}

interface PlatformDetectionProps {
  websiteUrl: string;
  onDetectionComplete?: (result: PlatformDetectionResult) => void;
}

export const PlatformDetection = ({ websiteUrl, onDetectionComplete }: PlatformDetectionProps) => {
  const [detection, setDetection] = useState<PlatformDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (websiteUrl && websiteUrl.startsWith('http')) {
      detectPlatform();
    }
  }, [websiteUrl]);

  const detectPlatform = async () => {
    if (!websiteUrl || !websiteUrl.startsWith('http')) return;
    
    setIsDetecting(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('platform-detection', {
        body: { websiteUrl }
      });

      if (error) {
        throw new Error(error.message || 'Platform detection failed');
      }

      const result = data as PlatformDetectionResult;
      setDetection(result);
      onDetectionComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect platform';
      setError(errorMessage);
      console.error('Platform detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.5) return "Medium";
    return "Low";
  };

  if (!websiteUrl || !websiteUrl.startsWith('http')) {
    return null;
  }

  return (
    <Card className="bg-glass border-glass backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Platform Detection
            {isDetecting && <Loader2 className="w-4 h-4 animate-spin" />}
          </h3>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {detection && !isDetecting && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  Detected: {detection.platform}
                </span>
                {detection.cached && (
                  <Badge variant="outline" className="text-xs">
                    Cached
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(detection.confidence)}`} />
                <span className="text-xs text-muted-foreground">
                  {getConfidenceLabel(detection.confidence)} ({Math.round(detection.confidence * 100)}%)
                </span>
              </div>
            </div>

            {detection.technologyStack?.detectedFeatures?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Also detected: </span>
                {detection.technologyStack.detectedFeatures
                  .filter((feature: string) => feature !== detection.platform)
                  .join(', ')}
              </div>
            )}
          </div>
        )}

        {isDetecting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing website platform...
          </div>
        )}
      </CardContent>
    </Card>
  );
};