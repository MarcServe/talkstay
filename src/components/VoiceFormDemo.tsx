import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormInput, Mic, MessageSquare } from 'lucide-react';

export const VoiceFormDemo = () => {
  return (
    <Card className="bg-glass border-glass backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Voice Form Filling Integration
          <Badge variant="secondary">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Demo Form */}
        <div className="bg-muted/30 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <FormInput className="w-4 h-4" />
            Demo Contact Form
          </h4>
          <form className="space-y-4">
            <div>
              <label htmlFor="demo-name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                id="demo-name"
                type="text"
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="demo-email" className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                id="demo-email"
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="demo-phone" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                id="demo-phone"
                type="tel"
                placeholder="Enter your phone number"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="demo-message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <textarea
                id="demo-message"
                placeholder="Enter your message"
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </form>
        </div>

        {/* Voice Commands Guide */}
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-primary">
            <MessageSquare className="w-4 h-4" />
            Voice Commands to Try
          </h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">Say:</Badge>
              <span>"Fill my name as John Smith"</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">Say:</Badge>
              <span>"Enter my email as john at example dot com"</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">Say:</Badge>
              <span>"Put my phone number as 555-123-4567"</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">Say:</Badge>
              <span>"Fill the message field with Hello, I need help"</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">Say:</Badge>
              <span>"Complete this form" (for guided filling)</span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="space-y-3">
          <h4 className="font-semibold">How Voice Form Filling Works</h4>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">1</div>
              <div>
                <strong>Automatic Detection:</strong> The voice assistant scans the page for form fields when it loads
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">2</div>
              <div>
                <strong>Voice Commands:</strong> Use natural language like "fill my name" or "enter my email"
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">3</div>
              <div>
                <strong>Smart Matching:</strong> AI matches your spoken field names to actual form fields
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">4</div>
              <div>
                <strong>Auto-Formatting:</strong> Handles email formats ("at" → "@"), phone numbers, and more
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>💡 Tip:</strong> This demo form is ready for voice filling! Click the voice button and try the commands above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};