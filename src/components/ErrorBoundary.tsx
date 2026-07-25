import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  error: string;
  assistantId?: string;
  onRetry?: () => void;
  showAssistantId?: boolean;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ 
  error, 
  assistantId, 
  onRetry, 
  showAssistantId = true 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        
        <h1 className="text-xl font-bold text-destructive">
          Unable to Load Assistant
        </h1>
        
        <p className="text-muted-foreground text-sm leading-relaxed">
          {error}
        </p>
        
        <div className="space-y-2">
          {onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline" 
              className="w-full"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.href = '/'} 
            variant="ghost" 
            className="w-full"
            size="sm"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
        
        {showAssistantId && assistantId && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Assistant ID: <span className="font-mono">{assistantId}</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};