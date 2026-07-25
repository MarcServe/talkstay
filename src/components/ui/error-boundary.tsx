import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showFallbackOptions?: boolean;
  onWhatsAppRedirect?: () => void;
  onManualContact?: () => void;
}

export class BookingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Booking Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  getErrorMessage(): string {
    const { error } = this.state;
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (error?.message?.includes('validation')) {
      return 'Please check that all required information is filled out correctly.';
    }
    
    if (error?.message?.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    
    return 'Something went wrong with your booking request. We\'re here to help!';
  }

  getErrorSeverity(): 'warning' | 'error' | 'info' {
    const { error } = this.state;
    
    if (error?.message?.includes('network') || error?.message?.includes('timeout')) {
      return 'warning';
    }
    
    if (error?.message?.includes('validation')) {
      return 'info';
    }
    
    return 'error';
  }

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;
      const severity = this.getErrorSeverity();
      
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className={`mx-auto rounded-full p-3 mb-4 w-fit ${
              severity === 'error' ? 'bg-red-100 text-red-600' :
              severity === 'warning' ? 'bg-orange-100 text-orange-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">
              {severity === 'error' ? 'Booking Error' :
               severity === 'warning' ? 'Connection Issue' :
               'Let\'s Fix This'}
            </CardTitle>
            <CardDescription className="text-sm">
              {this.getErrorMessage()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Retry Section */}
            {canRetry && (
              <div className="space-y-2">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Attempt {this.state.retryCount + 1} of {this.maxRetries + 1}
                </p>
              </div>
            )}

            {/* Fallback Options */}
            {this.props.showFallbackOptions && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Or choose an alternative:
                </p>
                
                <div className="grid grid-cols-1 gap-2">
                  {this.props.onWhatsAppRedirect && (
                    <Button
                      onClick={this.props.onWhatsAppRedirect}
                      variant="outline"
                      className="w-full"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Continue on WhatsApp
                    </Button>
                  )}
                  
                  {this.props.onManualContact && (
                    <Button
                      onClick={this.props.onManualContact}
                      variant="outline"
                      className="w-full"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Directly
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Reset Button */}
            <Button
              onClick={this.handleReset}
              variant="ghost"
              className="w-full text-sm"
            >
              Start Over
            </Button>

            {/* Technical Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-muted rounded-lg">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Technical Details
                </summary>
                <pre className="text-xs mt-2 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error handled:', error);
    setError(error);
  }, []);

  const retry = React.useCallback(async (asyncAction: () => Promise<void>) => {
    setIsRetrying(true);
    setError(null);
    
    try {
      await asyncAction();
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isRetrying,
    handleError,
    retry,
    clearError
  };
};