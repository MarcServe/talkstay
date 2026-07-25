import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { VoiceConsentOverlay } from './VoiceConsentOverlay';

interface VoiceButtonWithConsentProps {
  children: React.ReactNode;
  onVoiceStart: () => void;
  className?: string;
  disabled?: boolean;
  assistantName?: string;
  assistantId?: string;
  persistConsent?: boolean;
  skipConsent?: boolean;
}

const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_DAYS = 30;

export const VoiceButtonWithConsent: React.FC<VoiceButtonWithConsentProps> = ({
  children,
  onVoiceStart,
  className,
  disabled = false,
  assistantName,
  assistantId,
  persistConsent = true,
  skipConsent = false
}) => {
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsentOverlay, setShowConsentOverlay] = useState(false);

  const CONSENT_KEY = assistantId
    ? `talkweb_voice_consent_${assistantId}`
    : 'talkweb_voice_consent';

  // Check for existing consent on mount. Iframe context is exactly when GDPR
  // consent is required — do NOT auto-skip. Use skipConsent prop for explicit
  // dashboard previews only.
  useEffect(() => {
    if (skipConsent) {
      setHasConsent(true);
      return;
    }
    if (!persistConsent) return;

    try {
      // New format: JSON with version + timestamp (matches widget.js)
      const raw = localStorage.getItem(CONSENT_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const ageDays = (Date.now() - new Date(parsed.timestamp).getTime()) / (1000 * 60 * 60 * 24);
          if (parsed.granted && parsed.version === CONSENT_VERSION && ageDays < CONSENT_EXPIRY_DAYS) {
            setHasConsent(true);
            return;
          }
        } catch {
          // Legacy string format
          if (raw === 'granted' || raw === 'true') {
            setHasConsent(true);
            return;
          }
        }
      }

      // Fallback: any other talkweb_voice_consent_* key granted (widget.js wrote it)
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (!key.startsWith('talkweb_voice_consent')) continue;
        const val = localStorage.getItem(key);
        if (!val) continue;
        try {
          const parsed = JSON.parse(val);
          const ageDays = (Date.now() - new Date(parsed.timestamp).getTime()) / (1000 * 60 * 60 * 24);
          if (parsed.granted && ageDays < CONSENT_EXPIRY_DAYS) {
            setHasConsent(true);
            return;
          }
        } catch {
          if (val === 'granted' || val === 'true') {
            setHasConsent(true);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Consent check failed:', e);
    }
  }, [persistConsent, skipConsent, CONSENT_KEY]);

  const handleButtonClick = () => {
    if (disabled) return;
    
    if (skipConsent || hasConsent) {
      // User has already consented or consent is skipped (widget handles it)
      onVoiceStart();
    } else {
      // Show consent overlay
      setShowConsentOverlay(true);
    }
  };

  const handleConsent = () => {
    const t0 = performance.now();
    (window as any).__voiceConsentAcceptedAt = t0;
    console.log('[VoiceTiming] ✅ Consent accepted at', t0.toFixed(1), 'ms');

    setHasConsent(true);
    setShowConsentOverlay(false);

    if (persistConsent) {
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({
          granted: true,
          version: CONSENT_VERSION,
          timestamp: new Date().toISOString(),
        }));
      } catch {}
    }

    console.log('[VoiceTiming] ▶️ Calling onVoiceStart at +', (performance.now() - t0).toFixed(1), 'ms after consent');
    onVoiceStart();
  };

  const handleDecline = () => {
    setShowConsentOverlay(false);
    if (persistConsent) {
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({
          granted: false,
          version: CONSENT_VERSION,
          timestamp: new Date().toISOString(),
        }));
      } catch {}
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          onClick={handleButtonClick}
          className={className}
          disabled={disabled}
        >
          {children}
        </Button>
        
        {/* Transparent overlay when consent not granted */}
        {!hasConsent && !disabled && (
          <div 
            className="absolute inset-0 bg-transparent cursor-pointer rounded-md"
            onClick={handleButtonClick}
            title="Click to grant voice permission"
          />
        )}
      </div>

      <VoiceConsentOverlay
        isVisible={showConsentOverlay}
        onConsent={handleConsent}
        onDecline={handleDecline}
        assistantName={assistantName}
      />
    </>
  );
};