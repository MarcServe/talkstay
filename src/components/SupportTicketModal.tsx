import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, MessageSquare, CheckCircle, HelpCircle } from 'lucide-react';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketInfo: any) => void;
  assistantName?: string;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assistantName = 'Support Team'
}) => {
  const [ticketInfo, setTicketInfo] = useState({
    userName: '',
    userEmail: '',
    userPhone: '',
    category: '',
    priority: 'medium',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!ticketInfo.userName || ticketInfo.userName.trim().length < 2) {
      newErrors.userName = 'Name must be at least 2 characters';
    }
    if (!ticketInfo.userEmail) {
      newErrors.userEmail = 'Email is required';
    } else if (!validateEmail(ticketInfo.userEmail)) {
      newErrors.userEmail = 'Please enter a valid email address';
    }
    if (ticketInfo.userPhone && !validatePhone(ticketInfo.userPhone)) {
      newErrors.userPhone = 'Please enter a valid phone number';
    }
    if (!ticketInfo.category) {
      newErrors.category = 'Please select a category';
    }
    if (!ticketInfo.subject || ticketInfo.subject.trim().length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    }
    if (!ticketInfo.message || ticketInfo.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(ticketInfo);
      onClose();
      // Reset form
      setTicketInfo({
        userName: '',
        userEmail: '',
        userPhone: '',
        category: '',
        priority: 'medium',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setTicketInfo(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const categories = [
    { value: 'support', label: 'General Support' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'sales', label: 'Sales Inquiry' },
    { value: 'feedback', label: 'Feedback/Suggestion' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Contact {assistantName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="userName">Full Name *</Label>
              <Input
                id="userName"
                value={ticketInfo.userName}
                onChange={(e) => updateField('userName', e.target.value)}
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
                value={ticketInfo.userEmail}
                onChange={(e) => updateField('userEmail', e.target.value)}
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
                value={ticketInfo.userPhone}
                onChange={(e) => updateField('userPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className={errors.userPhone ? 'border-destructive' : ''}
              />
              {errors.userPhone && <p className="text-sm text-destructive">{errors.userPhone}</p>}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Request Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={ticketInfo.category} onValueChange={(value) => updateField('category', value)}>
                  <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={ticketInfo.priority} onValueChange={(value) => updateField('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={ticketInfo.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="Brief description of your request"
                className={errors.subject ? 'border-destructive' : ''}
              />
              {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={ticketInfo.message}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="Please provide detailed information about your request..."
                rows={4}
                className={errors.message ? 'border-destructive' : ''}
              />
              {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              We'll respond to your request within 24 hours during business days. For urgent matters, please include "URGENT" in your subject line.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};