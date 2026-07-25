import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, User, ExternalLink, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingDetails {
  confirmationId?: string;
  service?: string;
  date?: string;
  time?: string;
  userName?: string;
  userEmail?: string;
  calendlyUrl?: string;
  businessName?: string;
  message?: string;
}

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails: BookingDetails;
  success: boolean;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  isOpen,
  onClose,
  bookingDetails,
  success
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleOpenCalendly = () => {
    if (bookingDetails.calendlyUrl) {
      window.open(bookingDetails.calendlyUrl, '_blank');
    }
  };

  const handleReviewSubmit = async (selectedRating: number) => {
    if (isSubmittingReview || reviewSubmitted) return;
    
    setIsSubmittingReview(true);
    setRating(selectedRating);
    
    try {
      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingDetails.confirmationId,
        rating: selectedRating,
        review_type: 'booking_experience',
        user_email: bookingDetails.userEmail,
        user_name: bookingDetails.userName
      });

      if (error) throw error;

      setReviewSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${success ? 'text-green-600' : 'text-amber-600'}`} />
            {success ? 'Booking Confirmed' : 'Booking in Progress'}
          </DialogTitle>
          <DialogDescription>
            {success 
              ? 'Your appointment has been successfully scheduled.' 
              : 'We\'re processing your booking request.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="space-y-3">
                {bookingDetails.confirmationId && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-800">Confirmation ID:</span>
                    <span className="text-green-700 font-mono text-sm">
                      #{bookingDetails.confirmationId}
                    </span>
                  </div>
                )}
                
                {bookingDetails.service && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">{bookingDetails.service}</span>
                  </div>
                )}
                
                {bookingDetails.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">{bookingDetails.date}</span>
                  </div>
                )}
                
                {bookingDetails.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">{bookingDetails.time}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800">
                {bookingDetails.message || 'Your booking request is being processed. You will receive a confirmation email shortly.'}
              </p>
            </div>
          )}
          
          {/* Review Prompt - Only show after successful booking */}
          {success && !reviewSubmitted && (
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3 text-center">How was your booking experience?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleReviewSubmit(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    disabled={isSubmittingReview}
                    className="transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        (hoveredRating || rating) >= star 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {isSubmittingReview && (
                <p className="text-xs text-center text-muted-foreground mt-2">Submitting...</p>
              )}
            </div>
          )}

          {/* Thank you message after review */}
          {success && reviewSubmitted && (
            <div className="border-t pt-4 mt-2 text-center">
              <p className="text-sm font-medium text-green-600">
                ⭐ Thank you for your feedback!
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {bookingDetails.calendlyUrl && (
              <Button 
                onClick={handleOpenCalendly}
                className="flex-1"
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Calendar
              </Button>
            )}
            <Button 
              onClick={onClose}
              className="flex-1"
            >
              Continue Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};