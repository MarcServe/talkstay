import React from 'react';

interface IconProps {
  className?: string;
}

export const WhatsAppIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#25D366" strokeWidth="1.5" fill="none"/>
  </svg>
);

export const GmailIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2" fill="#EA4335"/>
    <path d="M2 6l10 7 10-7" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M2 18l6.5-5M22 18l-6.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const PhoneCallIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" fill="#34A853" stroke="#2D9348" strokeWidth="0.5"/>
  </svg>
);

export const WebWidgetIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="3" width="20" height="18" rx="2" stroke="#4285F4" strokeWidth="1.5"/>
    <path d="M2 7h20" stroke="#4285F4" strokeWidth="1.5"/>
    <circle cx="5" cy="5" r="0.8" fill="#EA4335"/>
    <circle cx="7.5" cy="5" r="0.8" fill="#FBBC05"/>
    <circle cx="10" cy="5" r="0.8" fill="#34A853"/>
    <rect x="5" y="10" width="6" height="8" rx="1" fill="#4285F4" opacity="0.2" stroke="#4285F4" strokeWidth="0.8"/>
    <rect x="13" y="10" width="6" height="3" rx="1" fill="#34A853" opacity="0.2" stroke="#34A853" strokeWidth="0.8"/>
    <rect x="13" y="15" width="6" height="3" rx="1" fill="#FBBC05" opacity="0.2" stroke="#FBBC05" strokeWidth="0.8"/>
  </svg>
);

export const VoiceAIIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" fill="#4285F4"/>
    <path d="M19 10v1a7 7 0 01-14 0v-1" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 18v4M8 22h8" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const EmailForwardIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="1" y="5" width="16" height="12" rx="1.5" fill="#4285F4" opacity="0.15" stroke="#4285F4" strokeWidth="1.2"/>
    <path d="M1 7l8 5 8-5" stroke="#4285F4" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M17 13l4-3-4-3" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 10h-7" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const BioLinkIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="1" width="14" height="22" rx="3" stroke="#4285F4" strokeWidth="1.5"/>
    <path d="M10 1h4v2h-4z" fill="#4285F4"/>
    <rect x="8" y="7" width="8" height="2" rx="1" fill="#34A853"/>
    <rect x="8" y="11" width="8" height="2" rx="1" fill="#FBBC05"/>
    <rect x="8" y="15" width="8" height="2" rx="1" fill="#EA4335"/>
    <circle cx="12" cy="20" r="1" fill="#4285F4"/>
  </svg>
);

export const LinkedInIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export const MapPinIcon: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="1.5"/>
    <path d="M3 10h18" stroke="#4285F4" strokeWidth="1.5"/>
    <path d="M8 2v4M16 2v4" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="15" r="1.5" fill="#4285F4"/>
    <circle cx="12" cy="15" r="1.5" fill="#EA4335"/>
    <circle cx="16" cy="15" r="1.5" fill="#34A853"/>
  </svg>
);

export const GlobeIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#4285F4" strokeWidth="1.5"/>
    <ellipse cx="12" cy="12" rx="4" ry="10" stroke="#34A853" strokeWidth="1.2"/>
    <path d="M2 12h20" stroke="#FBBC05" strokeWidth="1.2"/>
    <path d="M4 7h16M4 17h16" stroke="#EA4335" strokeWidth="0.8" opacity="0.6"/>
  </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#4285F4" strokeWidth="1.5"/>
    <path d="M14 2v6h6" stroke="#4285F4" strokeWidth="1.5"/>
    <path d="M8 13h8M8 17h5" stroke="#EA4335" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="#34A853" strokeWidth="1.5" fill="#34A853" fillOpacity="0.1"/>
    <path d="M9 12l2 2 4-4" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const NoCodeIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#34A853" strokeWidth="1.5"/>
    <path d="M8 12l2.5 2.5L16 9" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const VoiceFormIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" stroke="#4285F4" strokeWidth="1.5" fill="#4285F4" fillOpacity="0.08"/>
    <circle cx="12" cy="9" r="2.5" fill="#EA4335"/>
    <path d="M12 11.5v1.5" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9.5 13a2.5 2.5 0 005 0" stroke="#EA4335" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8" y1="18" x2="16" y2="18" stroke="#4285F4" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="9" y1="20" x2="15" y2="20" stroke="#4285F4" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
  </svg>
);
