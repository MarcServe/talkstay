import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Loader2, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type BookingStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error' | 'timeout';

interface BookingStatusProps {
  status: BookingStatus;
  error?: string;
  successMessage?: string;
  onRetry?: () => void;
  onWhatsAppFallback?: () => void;
  onManualContact?: () => void;
  bookingDetails?: {
    businessName?: string;
    confirmationNumber?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  };
  className?: string;
}

export const BookingStatus: React.FC<BookingStatusProps> = ({
  status,
  error,
  successMessage,
  onRetry,
  onWhatsAppFallback,
  onManualContact,
  bookingDetails,
  className
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'validating':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
          title: 'Validating Information',
          description: 'Checking your booking details...',
          color: 'border-blue-200 bg-blue-50'
        };
      
      case 'submitting':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-green-500" />,
          title: 'Submitting Booking',
          description: 'Processing your appointment request...',
          color: 'border-green-200 bg-green-50'
        };
      
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          title: 'Booking Confirmed!',
          description: successMessage || 'Your appointment has been successfully scheduled.',
          color: 'border-green-300 bg-green-50'
        };
      
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          title: 'Booking Failed',
          description: error || 'There was an issue processing your booking.',
          color: 'border-red-200 bg-red-50'
        };
      
      case 'timeout':
        return {
          icon: <Clock className="h-5 w-5 text-orange-500" />,
          title: 'Request Timeout',
          description: 'The booking request took too long. Please try again.',
          color: 'border-orange-200 bg-orange-50'
        };
      
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config || status === 'idle') return null;

  return (
    <Card className={cn("transition-all duration-300", config.color, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {config.icon}
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">
              {config.title}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {config.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Success Details */}
        {status === 'success' && bookingDetails && (
          <div className="space-y-3">
            <div className="bg-white/80 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-sm text-gray-800">Booking Details</h4>
              
              {bookingDetails.confirmationNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Confirmation:</span>
                  <Badge variant="outline" className="font-mono">
                    {bookingDetails.confirmationNumber}
                  </Badge>
                </div>
              )}
              
              {bookingDetails.businessName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Business:</span>
                  <span className="font-medium">{bookingDetails.businessName}</span>
                </div>
              )}
              
              {bookingDetails.scheduledDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{bookingDetails.scheduledDate}</span>
                </div>
              )}
              
              {bookingDetails.scheduledTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{bookingDetails.scheduledTime}</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                You should receive a confirmation email shortly.
              </p>
            </div>
          </div>
        )}

        {/* Loading Progress */}
        {(status === 'validating' || status === 'submitting') && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-1000",
                  status === 'validating' ? "w-1/3 bg-blue-500" : "w-2/3 bg-green-500"
                )}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {status === 'validating' ? 'Step 1 of 2' : 'Step 2 of 2'}
            </p>
          </div>
        )}

        {/* Error Actions */}
        {(status === 'error' || status === 'timeout') && (
          <div className="space-y-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full" size="sm">
                Try Again
              </Button>
            )}
            
            <div className="grid grid-cols-1 gap-2">
              {onWhatsAppFallback && (
                <Button
                  onClick={onWhatsAppFallback}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <MessageSquare className="h-3 w-3 mr-2" />
                  Continue on WhatsApp
                </Button>
              )}
              
              {onManualContact && (
                <Button
                  onClick={onManualContact}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Calendar className="h-3 w-3 mr-2" />
                  Contact Directly
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Success Actions */}
        {status === 'success' && (
          <div className="text-center">
            <Button variant="outline" size="sm" className="text-xs">
              Add to Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Hook for managing booking status
export const useBookingStatus = () => {
  const [status, setStatus] = React.useState<BookingStatus>('idle');
  const [error, setError] = React.useState<string>();
  const [successMessage, setSuccessMessage] = React.useState<string>();

  const updateStatus = React.useCallback((newStatus: BookingStatus, message?: string) => {
    setStatus(newStatus);
    
    if (newStatus === 'error' || newStatus === 'timeout') {
      setError(message);
      setSuccessMessage(undefined);
    } else if (newStatus === 'success') {
      setSuccessMessage(message);
      setError(undefined);
    } else {
      setError(undefined);
      setSuccessMessage(undefined);
    }
  }, []);

  const reset = React.useCallback(() => {
    setStatus('idle');
    setError(undefined);
    setSuccessMessage(undefined);
  }, []);

  return {
    status,
    error,
    successMessage,
    updateStatus,
    reset
  };
};