import React, { Component, ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  assistantId?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ERROR BOUNDARY CAUGHT:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ERROR BOUNDARY DETAILS:', {
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo.componentStack,
      assistantId: this.props.assistantId,
      url: window.location.href
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center border-destructive">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2 text-destructive">Preview Error</h1>
            <p className="text-muted-foreground mb-4">Something went wrong while loading the preview</p>
            
            {this.state.error && (
              <div className="text-xs text-muted-foreground mb-4 font-mono bg-muted p-2 rounded text-left">
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}
            
            {this.props.assistantId && (
              <div className="text-xs text-muted-foreground mb-4 font-mono bg-muted p-2 rounded">
                <strong>Assistant ID:</strong> {this.props.assistantId}
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Reload Page
              </Button>
              
              <Button 
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }} 
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="ghost"
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}