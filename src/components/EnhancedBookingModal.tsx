import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, Mail, Phone, Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistantId: string;
  initialData?: {
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    service?: string;
    preferredDate?: string;
    preferredTime?: string;
    message?: string;
  };
}

interface AvailableSlot {
  start_time: string;
  end_time: string;
}

interface AvailableSlots {
  [date: string]: AvailableSlot[];
}

export const EnhancedBookingModal: React.FC<EnhancedBookingModalProps> = ({
  isOpen,
  onClose,
  assistantId,
  initialData = {}
}) => {
  // Form state
  const [userName, setUserName] = useState(initialData.userName || '');
  const [userEmail, setUserEmail] = useState(initialData.userEmail || '');
  const [userPhone, setUserPhone] = useState(initialData.userPhone || '');
  const [service, setService] = useState(initialData.service || '');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData.preferredDate ? new Date(initialData.preferredDate) : undefined
  );
  const [selectedTime, setSelectedTime] = useState(initialData.preferredTime || '');
  const [message, setMessage] = useState(initialData.message || '');

  // Slots state
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [videoMeetingUrl, setVideoMeetingUrl] = useState('');
  const [videoPlatform, setVideoPlatform] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load available slots on mount
  useEffect(() => {
    if (isOpen && assistantId) {
      loadAvailableSlots();
    }
  }, [isOpen, assistantId]);

  // Update initial data when it changes
  useEffect(() => {
    if (initialData) {
      setUserName(initialData.userName || '');
      setUserEmail(initialData.userEmail || '');
      setUserPhone(initialData.userPhone || '');
      setService(initialData.service || '');
      setMessage(initialData.message || '');
      if (initialData.preferredDate) {
        setSelectedDate(new Date(initialData.preferredDate));
      }
      if (initialData.preferredTime) {
        setSelectedTime(initialData.preferredTime);
      }
    }
  }, [initialData]);

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      console.log('📅 Fetching available slots for assistant:', assistantId);
      
      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: {
          assistantId,
          // Get next 30 days
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      });

      if (error) throw error;

      if (data?.success && data.availableSlots) {
        console.log('✅ Loaded available slots:', data.availableSlots);
        setAvailableSlots(data.availableSlots);
      } else {
        console.warn('⚠️ No slots returned or unsuccessful response');
        setAvailableSlots({});
      }
    } catch (error) {
      console.error('❌ Error loading slots:', error);
      toast.error('Failed to load available times');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Get dates that have available slots
  const datesWithSlots = Object.keys(availableSlots);
  
  // Get available times for selected date
  const availableTimesForDate = selectedDate
    ? availableSlots[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Validation
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^[\+]?[(]?[\d\s\-\(\)]{10,}$/.test(phone.replace(/\s/g, ''));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!userName?.trim()) {
      newErrors.userName = 'Name is required';
    }

    if (!userEmail?.trim()) {
      newErrors.userEmail = 'Email is required';
    } else if (!validateEmail(userEmail)) {
      newErrors.userEmail = 'Invalid email address';
    }

    if (!userPhone?.trim()) {
      newErrors.userPhone = 'Phone number is required';
    } else if (!validatePhone(userPhone)) {
      newErrors.userPhone = 'Invalid phone number';
    }

    if (!service?.trim()) {
      newErrors.service = 'Service type is required';
    }

    if (!selectedDate) {
      newErrors.date = 'Please select a date';
    }

    if (!selectedTime) {
      newErrors.time = 'Please select a time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: {
          assistantId,
          userName,
          userEmail,
          userPhone,
          service,
          preferredDate: format(selectedDate!, 'yyyy-MM-dd'),
          preferredTime: selectedTime,
          message
        }
      });

      if (error) throw error;

      // Extract video meeting info from response
      if (data?.videoMeetingUrl) {
        setVideoMeetingUrl(data.videoMeetingUrl);
        setVideoPlatform(data.videoPlatform || '');
      }

      setBookingSuccess(true);
      toast.success('Booking confirmed! Check your email for details.');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bookingSuccess ? 'Booking Confirmed!' : 'Complete Your Booking'}</DialogTitle>
          <DialogDescription>
            {bookingSuccess 
              ? 'Your appointment has been confirmed. Check your email for details.'
              : 'Please confirm your details and select an available time slot'
            }
          </DialogDescription>
        </DialogHeader>

        {bookingSuccess ? (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Appointment Confirmed</h3>
              <p className="text-muted-foreground text-sm">
                We've sent a confirmation email to {userEmail} with all the details.
              </p>
            </div>

            {videoMeetingUrl && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold">Video Meeting Ready</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Join via {videoPlatform === 'google_meet' ? 'Google Meet' : 
                           videoPlatform === 'zoom' ? 'Zoom' : 
                           videoPlatform === 'teams' ? 'Microsoft Teams' : 'video call'}
                </p>
                <Button 
                  onClick={() => window.open(videoMeetingUrl, '_blank')}
                  className="w-full"
                  variant="default"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Open Video Meeting Link
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  The link is also in your confirmation email
                </p>
              </div>
            )}

            <Button onClick={onClose} className="w-full" variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="John Doe"
                  className={errors.userName ? 'border-destructive' : ''}
                />
                {errors.userName && (
                  <p className="text-xs text-destructive">{errors.userName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="john@example.com"
                  className={errors.userEmail ? 'border-destructive' : ''}
                />
                {errors.userEmail && (
                  <p className="text-xs text-destructive">{errors.userEmail}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className={errors.userPhone ? 'border-destructive' : ''}
                />
                {errors.userPhone && (
                  <p className="text-xs text-destructive">{errors.userPhone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="service">Service Type *</Label>
                <Input
                  id="service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="Consultation, Meeting, etc."
                  className={errors.service ? 'border-destructive' : ''}
                />
                {errors.service && (
                  <p className="text-xs text-destructive">{errors.service}</p>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Select Date & Time
            </h3>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading available times...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Preferred Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !selectedDate && 'text-muted-foreground',
                          errors.date && 'border-destructive'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                          const hasSlots = datesWithSlots.includes(dateStr);
                          return isPast || !hasSlots;
                        }}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date}</p>
                  )}
                  {datesWithSlots.length === 0 && !loadingSlots && (
                    <p className="text-xs text-muted-foreground">
                      No available dates. Please contact us directly.
                    </p>
                  )}
                </div>

                {/* Time Slots */}
                <div className="space-y-2">
                  <Label>Available Times *</Label>
                  {selectedDate ? (
                    availableTimesForDate.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                        {availableTimesForDate.map((slot) => (
                          <Button
                            key={slot.start_time}
                            type="button"
                            variant={selectedTime === slot.start_time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot.start_time)}
                            className="justify-start"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {slot.start_time}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                        No times available for this date
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                      Select a date first
                    </p>
                  )}
                  {errors.time && (
                    <p className="text-xs text-destructive">{errors.time}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Additional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Additional Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any special requests or additional information..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={submitting || loadingSlots}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </Button>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
