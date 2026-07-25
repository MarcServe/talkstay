import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, Calendar, Clock, MessageSquare, CheckCircle } from 'lucide-react';
import { useVoiceBooking } from '@/hooks/useVoiceBooking';

interface BookingInformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookingInfo: any) => void;
  assistantName?: string;
}

export const BookingInformationModal: React.FC<BookingInformationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assistantName = 'Assistant'
}) => {
  const { bookingInfo, updateBookingInfo, getBookingStatus } = useVoiceBooking();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Appointment Details', icon: Calendar },
    { id: 3, title: 'Additional Information', icon: MessageSquare },
    { id: 4, title: 'Review & Confirm', icon: CheckCircle }
  ];

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!bookingInfo.userName || bookingInfo.userName.trim().length < 2) {
        newErrors.userName = 'Name must be at least 2 characters';
      }
      if (!bookingInfo.userEmail) {
        newErrors.userEmail = 'Email is required';
      } else if (!validateEmail(bookingInfo.userEmail)) {
        newErrors.userEmail = 'Please enter a valid email address';
      }
      if (bookingInfo.userPhone && !validatePhone(bookingInfo.userPhone)) {
        newErrors.userPhone = 'Please enter a valid phone number';
      }
    }

    if (step === 2) {
      if (!bookingInfo.service) {
        newErrors.service = 'Please select a service';
      }
      if (!bookingInfo.preferredDate) {
        newErrors.preferredDate = 'Please select a preferred date';
      }
      if (!bookingInfo.preferredTime) {
        newErrors.preferredTime = 'Please select a preferred time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSubmit = () => {
    if (validateStep(2)) { // Final validation of required fields
      onSubmit(bookingInfo);
      onClose();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Full Name *</Label>
              <Input
                id="userName"
                value={bookingInfo.userName || ''}
                onChange={(e) => updateBookingInfo({ userName: e.target.value })}
                placeholder="Enter your full name"
                className={errors.userName ? 'border-destructive' : ''}
              />
              {errors.userName && <p className="text-sm text-destructive">{errors.userName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail">Email Address *</Label>
              <Input
                id="userEmail"
                type="email"
                value={bookingInfo.userEmail || ''}
                onChange={(e) => updateBookingInfo({ userEmail: e.target.value })}
                placeholder="your.email@example.com"
                className={errors.userEmail ? 'border-destructive' : ''}
              />
              {errors.userEmail && <p className="text-sm text-destructive">{errors.userEmail}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPhone">Phone Number (Optional)</Label>
              <Input
                id="userPhone"
                type="tel"
                value={bookingInfo.userPhone || ''}
                onChange={(e) => updateBookingInfo({ userPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className={errors.userPhone ? 'border-destructive' : ''}
              />
              {errors.userPhone && <p className="text-sm text-destructive">{errors.userPhone}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service">Service Type *</Label>
              <Input
                id="service"
                value={bookingInfo.service || ''}
                onChange={(e) => updateBookingInfo({ service: e.target.value })}
                placeholder="e.g., Consultation, Meeting, Support"
                className={errors.service ? 'border-destructive' : ''}
              />
              {errors.service && <p className="text-sm text-destructive">{errors.service}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredDate">Preferred Date *</Label>
              <Input
                id="preferredDate"
                type="date"
                value={bookingInfo.preferredDate || ''}
                onChange={(e) => updateBookingInfo({ preferredDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={errors.preferredDate ? 'border-destructive' : ''}
              />
              {errors.preferredDate && <p className="text-sm text-destructive">{errors.preferredDate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTime">Preferred Time *</Label>
              <Input
                id="preferredTime"
                type="time"
                value={bookingInfo.preferredTime || ''}
                onChange={(e) => updateBookingInfo({ preferredTime: e.target.value })}
                className={errors.preferredTime ? 'border-destructive' : ''}
              />
              {errors.preferredTime && <p className="text-sm text-destructive">{errors.preferredTime}</p>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Additional Message (Optional)</Label>
              <Textarea
                id="message"
                value={bookingInfo.message || ''}
                onChange={(e) => updateBookingInfo({ message: e.target.value })}
                placeholder="Any additional information or special requests..."
                rows={4}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Booking Summary</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span><strong>Name:</strong> {bookingInfo.userName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span><strong>Email:</strong> {bookingInfo.userEmail}</span>
                </div>
                {bookingInfo.userPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span><strong>Phone:</strong> {bookingInfo.userPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span><strong>Service:</strong> {bookingInfo.service}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span><strong>Date:</strong> {bookingInfo.preferredDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span><strong>Time:</strong> {bookingInfo.preferredTime}</span>
                </div>
                {bookingInfo.message && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span><strong>Message:</strong> {bookingInfo.message}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                By confirming this booking, you agree to receive appointment confirmations and updates via email.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Book Appointment with {assistantName}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-muted-foreground bg-background'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-px mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">
          <h3 className="text-lg font-medium mb-4">
            {steps.find(s => s.id === currentStep)?.title}
          </h3>
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          
          {currentStep < 4 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1">
              Confirm Booking
            </Button>
          )}
          
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};