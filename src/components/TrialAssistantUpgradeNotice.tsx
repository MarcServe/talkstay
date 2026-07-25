import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calendar, Send, MessageCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const GOOGLE_CALENDAR_LINK = "https://calendar.app.google/cbkE71koNXVDvW2V8";
const WHATSAPP_LINK = "https://wa.me/447471245972?text=Hi%20TalkWeb%2C%20I%27d%20like%20to%20learn%20more%20about%20getting%20a%20fully%20grounded%20voice%20AI%20assistant%20for%20my%20business.";

export const TrialAssistantUpgradeNotice = () => {
  const { toast } = useToast();
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', businessName: '' });

  const handleBookDemo = () => {
    window.open(GOOGLE_CALENDAR_LINK, '_blank');
  };

  const handleSubmitPricing = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.businessName.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'pricing_request',
          to: 'sales@talkweb.io',
          data: {
            name: form.name,
            email: form.email,
            business_name: form.businessName,
          }
        }
      });
      setSubmitted(true);
      toast({ title: "Request sent!", description: "Our team will get back to you shortly." });
    } catch {
      toast({ title: "Failed to send request", description: "Please try again or contact us directly.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">Basic Test Assistant</h4>
              <p className="text-sm text-muted-foreground">
                This assistant has limited website data for testing purposes only. For a fully grounded assistant with comprehensive knowledge of your entire website, book a demo or request pricing tailored to your business needs.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 ml-8">
            <Button onClick={handleBookDemo} size="sm" variant="default">
              <Calendar className="w-4 h-4 mr-2" />
              Book a Demo
            </Button>
            <Button onClick={() => setShowPricingDialog(true)} size="sm" variant="outline">
              <Send className="w-4 h-4 mr-2" />
              Request Pricing
            </Button>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat on WhatsApp
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Pricing</DialogTitle>
            <DialogDescription>
              Tell us about your business and we'll send you a tailored pricing plan.
            </DialogDescription>
          </DialogHeader>
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="font-semibold text-lg mb-1">Request Sent!</h4>
              <p className="text-sm text-muted-foreground">Our team will contact you shortly.</p>
              <Button onClick={() => setShowPricingDialog(false)} className="mt-4" variant="outline">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pricing-name">Name</Label>
                <Input id="pricing-name" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="pricing-email">Email</Label>
                <Input id="pricing-email" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="pricing-business">Business Name</Label>
                <Input id="pricing-business" placeholder="Your business name" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
              </div>
              <Button onClick={handleSubmitPricing} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : 'Submit Request'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
