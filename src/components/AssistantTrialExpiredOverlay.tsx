import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Mail, Calendar, MessageCircle } from 'lucide-react';
import { useAssistantTrial } from '@/hooks/useAssistantTrial';

interface AssistantTrialExpiredOverlayProps {
  createdAt: string | undefined | null;
  businessName?: string;
  onBookDemo?: () => void;
  is_trial?: boolean | null;
  trial_expires_at?: string | null;
}

export const AssistantTrialExpiredOverlay: React.FC<AssistantTrialExpiredOverlayProps> = ({
  createdAt,
  businessName = 'your assistant',
  onBookDemo,
  is_trial,
  trial_expires_at
}) => {
  const trialStatus = useAssistantTrial(createdAt, { is_trial, trial_expires_at });

  if (!trialStatus.isExpired) {
    return null;
  }

  const handleBookDemo = () => {
    if (onBookDemo) {
      onBookDemo();
    } else {
      // Default to Google Calendar booking link
      window.open('https://calendar.app.google/cbkE71koNXVDvW2V8', '_blank');
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hi, I would like to continue using my AI assistant "${businessName}" after the 24-hour trial. Can you help me get started?`);
    window.open(`https://wa.me/254727505050?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Continue using AI Assistant - ${businessName}`);
    const body = encodeURIComponent(`Hi,\n\nI've been testing my AI assistant "${businessName}" and would like to continue using it beyond the 24-hour trial.\n\nPlease let me know the next steps to get started.\n\nThank you!`);
    window.location.href = `mailto:sales@talkweb.co.ke?subject=${subject}&body=${body}`;
  };

  const handleCall = () => {
    window.location.href = 'tel:+254727505050';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 bg-card border-border shadow-2xl animate-fade-in">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold">24-Hour Free Trial Ended</h2>
            <p className="text-muted-foreground text-sm">
              Your free trial of <strong>{businessName}</strong> has expired. 
              Contact us to continue using your AI assistant with a customized plan.
            </p>
          </div>

          {/* Benefits reminder */}
          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm font-medium">Why continue with us?</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ Unlimited conversations</li>
              <li>✓ Custom branding & voice</li>
              <li>✓ Calendar integrations</li>
              <li>✓ Dedicated support</li>
              <li>✓ Bespoke pricing for your needs</li>
            </ul>
          </div>

          {/* Primary CTA */}
          <Button 
            onClick={handleBookDemo}
            className="w-full"
            size="lg"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Book a Demo Call
          </Button>

          {/* Secondary contact options */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Or contact us directly:</p>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleWhatsApp}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEmail}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCall}
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground pt-2">
            We offer flexible plans tailored to your business needs.
          </p>
        </div>
      </Card>
    </div>
  );
};
