import React, { memo, useCallback } from 'react';
import { Phone, PhoneCall, Copy, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PhoneNumberDisplayProps {
  phoneNumber: string;
  assistantId: string;
  messageId: string;
}

/**
 * Optimized phone number display component with memoization
 * Prevents unnecessary re-renders for better performance
 */
export const PhoneNumberDisplay = memo<PhoneNumberDisplayProps>(({ 
  phoneNumber, 
  assistantId,
  messageId 
}) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleClick = useCallback(async () => {
    try {
      const { trackPhoneNumberClicked } = await import('@/utils/phoneCallAnalytics');
      trackPhoneNumberClicked(assistantId, phoneNumber).catch(console.error);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, [assistantId, phoneNumber]);

  const handleCopy = useCallback(async () => {
    try {
      // Copy the full phone number with formatting
      await navigator.clipboard.writeText(phoneNumber);
      const { trackPhoneNumberCopied } = await import('@/utils/phoneCallAnalytics');
      trackPhoneNumberCopied(assistantId, phoneNumber).catch(console.error);
      
      toast({ 
        title: "Phone number copied!", 
        description: phoneNumber,
        duration: 2000
      });
    } catch (error) {
      console.error('Copy error:', error);
      toast({ 
        title: "Copy failed", 
        description: "Please try selecting and copying manually.",
        variant: "destructive",
        duration: 2000
      });
    }
  }, [assistantId, phoneNumber]);

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%] rounded-xl px-5 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
        <div className="flex flex-col gap-3">
          {/* Header with icon */}
          <div className="flex items-center gap-2 text-blue-700">
            <Phone className="w-5 h-5" />
            <span className="text-sm font-semibold">
              {isMobile ? "Tap to call us now" : "Call us at"}
            </span>
          </div>
          
          {/* Large clickable phone number */}
          <a 
            href={`tel:${phoneNumber.startsWith('+') ? phoneNumber.replace(/\D/g, '') : phoneNumber.replace(/\D/g, '')}`}
            onClick={handleClick}
            className="text-2xl md:text-3xl font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2 group active:scale-95 transition-transform"
            aria-label={`Call ${phoneNumber}`}
          >
            <PhoneCall className="w-6 h-6 md:w-7 md:h-7 group-hover:animate-pulse" />
            {phoneNumber}
          </a>
          
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100 transition-colors w-fit"
          >
            <Copy className="w-3 h-3" />
            Copy number
          </button>
          
          {/* Device-specific tip */}
          {!isMobile && (
            <p className="text-xs text-gray-600 mt-2 italic flex items-center gap-1">
              <Info className="w-3 h-3" />
              💡 This works best on mobile devices for direct calling
            </p>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.phoneNumber === nextProps.phoneNumber &&
    prevProps.assistantId === nextProps.assistantId &&
    prevProps.messageId === nextProps.messageId
  );
});

PhoneNumberDisplay.displayName = 'PhoneNumberDisplay';
