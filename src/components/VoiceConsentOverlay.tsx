import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';

interface VoiceConsentOverlayProps {
  isVisible: boolean;
  onConsent: () => void;
  onDecline: () => void;
  assistantName?: string;
}

export const VoiceConsentOverlay: React.FC<VoiceConsentOverlayProps> = ({
  isVisible,
  onConsent,
  onDecline,
  assistantName = "AI Assistant"
}) => {
  const [hasConsented, setHasConsented] = useState(false);

  const handleAccept = () => {
    if (hasConsented) {
      onConsent();
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-3">
      <Card className="w-full max-w-[320px] bg-background border shadow-2xl">
        <CardHeader className="pb-1 pt-3 px-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <CardTitle className="text-sm">Voice Permission</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Talk with {assistantName}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 px-3 pb-3">
          <div className="flex items-start gap-1.5 bg-muted/40 p-2 rounded-md">
            <Lock className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Encrypted & session-only. No storage, no sharing.
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="consent"
              checked={hasConsented}
              onCheckedChange={(checked) => setHasConsented(checked as boolean)}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-[11px] leading-snug cursor-pointer">
              I consent to voice recording and AI processing for this session.{' '}
              <Button
                variant="link"
                className="p-0 h-auto text-[11px] text-primary underline"
                onClick={() => window.open('/privacy-policy', '_blank')}
              >
                Privacy Policy
              </Button>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAccept}
              disabled={!hasConsented}
              className="flex-1 h-8 text-xs"
              size="sm"
            >
              Accept
            </Button>
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1 h-8 text-xs"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};
