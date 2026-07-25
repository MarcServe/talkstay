import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PrivacyInputModal } from './PrivacyInputModal';
import { WhatsAppModal } from './WhatsAppModal';
import { VoiceInputField } from './ui/voice-input-field';
import { BookingStatus, useBookingStatus } from './ui/booking-status';
import { BookingErrorBoundary } from './ui/error-boundary';
import { voiceTransitions, getVoiceAcknowledgment } from '@/utils/voiceTransitions';
import { audioFeedback } from '@/utils/audioFeedback';
import { BookingErrorHandler, validateBookingData, bookingFetch } from '@/utils/bookingErrorHandling';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceBooking } from '@/hooks/useVoiceBooking';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

// Dynamic calendar icon showing today's real date number
const DynamicCalendarIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => {
  const today = new Date().getDate();
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <text x="12" y="18" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="bold">{today}</text>
    </svg>
  );
};
import { Card } from './ui/card';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: BookingDetails) => void;
  bookingDetails: BookingDetails;
  businessName: string;
  isLoading?: boolean;
  embedded?: boolean;
}

interface BookingDetails {
  userEmail: string;
  userName: string;
  userPhone: string;  // Made required
  preferredDate: string;
  preferredTime: string;  // Made required
  serviceType: string;  // Made required (purpose of appointment)
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookingDetails,
  businessName,
  isLoading = false,
  embedded = false
}) => {
  // Clear any cached dates and ensure fresh data
  const clearCachedBookingData = () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('booking') || key.includes('appointment')) {
          localStorage.removeItem(key);
        }
      });
      console.log('Cleared cached booking data from localStorage');
    } catch (e) {
      console.log('No localStorage access or error clearing cache:', e);
    }
  };

  // Name state
  const [name, setName] = useState(bookingDetails.userName || '');
  const [nameError, setNameError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingNameOverlay, setIsEditingNameOverlay] = useState(false);
  const [originalName, setOriginalName] = useState(bookingDetails.userName || '');
  
  // Email state
  const [email, setEmail] = useState(bookingDetails.userEmail || '');
  const [emailError, setEmailError] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingEmailOverlay, setIsEditingEmailOverlay] = useState(false);
  const [originalEmail, setOriginalEmail] = useState(bookingDetails.userEmail || '');
  
  // Phone state
  const [phone, setPhone] = useState(bookingDetails.userPhone || '');
  const [phoneError, setPhoneError] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingPhoneOverlay, setIsEditingPhoneOverlay] = useState(false);
  const [originalPhone, setOriginalPhone] = useState(bookingDetails.userPhone || '');
  
  // Privacy modal state
  const [privacyModal, setPrivacyModal] = useState<{
    isOpen: boolean;
    fieldType: 'email' | 'phone';
    currentValue: string;
  }>({ isOpen: false, fieldType: 'email', currentValue: '' });
  
  // WhatsApp modal state
  const [whatsappModal, setWhatsappModal] = useState<{
    isOpen: boolean;
    url: string;
  }>({ isOpen: false, url: '' });

  // Voice transition tracking
  const [lastAcknowledgment, setLastAcknowledgment] = useState<string>();

  // Voice confirmation state
  const [isListeningForConfirmation, setIsListeningForConfirmation] = useState(false);
  const [voiceCountdown, setVoiceCountdown] = useState<number>(60);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);
  const countdownIntervalRef = React.useRef<any>(null);

  // Booking status management
  const { status, error: statusError, successMessage, updateStatus, reset: resetStatus } = useBookingStatus();
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Alternative slots management
  const { alternativeSlots, selectAlternative } = useVoiceBooking();

  // Clear cached data on modal open and when booking details change
  useEffect(() => {
    if (isOpen) {
      clearCachedBookingData();
      console.log('BookingModal opened - cleared cached data and refreshing display');
      console.log('Current bookingDetails on modal open:', bookingDetails);
      
      // Force clear any potential browser date cache
      if (bookingDetails.preferredDate) {
        console.log('Received preferredDate:', bookingDetails.preferredDate);
        const testDate = new Date(bookingDetails.preferredDate);
        console.log('Parsed test date:', testDate, 'Valid:', !isNaN(testDate.getTime()));
      }
    }
  }, [isOpen, bookingDetails]);

  // Update name, email and phone state when bookingDetails changes
  useEffect(() => {
    setName(bookingDetails.userName || '');
    setOriginalName(bookingDetails.userName || '');
    setEmail(bookingDetails.userEmail || '');
    setPhone(bookingDetails.userPhone || '');
    setOriginalEmail(bookingDetails.userEmail || '');
    setOriginalPhone(bookingDetails.userPhone || '');
    setIsEditingName(false);
    setIsEditingEmail(false);
    setIsEditingPhone(false);
    console.log('BookingModal - Updated state with new booking details:', bookingDetails);
  }, [bookingDetails.userName, bookingDetails.userEmail, bookingDetails.userPhone]);

  // Check browser compatibility on mount
  useEffect(() => {
    const checkVoiceSupport = async () => {
      const isSpeechSupported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
      
      if (!isSpeechSupported) {
        setVoiceSupported(false);
        setVoiceError("Voice confirmation requires Chrome, Edge, or Safari browser.");
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        
        if (!hasMicrophone) {
          setVoiceSupported(false);
          setVoiceError("No microphone detected on this device.");
        }
      } catch (error) {
        console.warn('Could not check microphone availability:', error);
      }
    };

    checkVoiceSupport();
  }, []);

  // Auto-start voice confirmation listening when modal opens
  useEffect(() => {
    if (isOpen && !showSuccess && voiceSupported) {
      console.log('🎤 BookingModal opened - isOpen:', isOpen);
      console.log('🎤 Speech recognition supported and available');
      
      // Request microphone permission first
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('✅ Microphone permission granted');
          
          // Play success audio cue
          audioFeedback.playMicOnSound();
          
          // Play audio cue to indicate listening will start
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("Voice confirmation is ready. Say confirm booking to proceed.");
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
          }
          
          // Small delay to ensure modal is fully rendered and audio cue plays
          const timer = setTimeout(() => {
            console.log('🎤 Starting voice confirmation listener...');
            try {
              startConfirmationListening();
              console.log('✅ Voice confirmation listener started successfully');
              setVoiceError(null);
            } catch (error) {
              console.error('❌ Error starting voice confirmation:', error);
              console.error('Error details:', {
                name: error?.name,
                message: error?.message,
                stack: error?.stack
              });
              audioFeedback.playErrorSound();
              setVoiceError("Could not start voice confirmation.");
              setLastAcknowledgment("Could not start voice confirmation. Use the button below.");
            }
          }, 1200);
          
          return () => {
            console.log('🎤 Cleaning up voice confirmation on modal close');
            clearTimeout(timer);
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                console.log('Recognition already stopped');
              }
            }
            setIsListeningForConfirmation(false);
          };
        })
        .catch((error) => {
          console.error('❌ Microphone permission denied:', error);
          audioFeedback.playErrorSound();
          
          if (error.name === 'NotAllowedError') {
            setVoiceError("Microphone access blocked. Click your browser's address bar to allow microphone access.");
          } else {
            setVoiceError("Microphone access needed for voice confirmation.");
          }
          
          setLastAcknowledgment("Microphone access needed for voice confirmation. Click the button below to try again.");
        });
    } else {
      console.log('🎤 Modal closed or success shown - isOpen:', isOpen, 'showSuccess:', showSuccess);
    }
  }, [isOpen, voiceSupported]);

  // Name handlers
  const handleEditName = () => {
    setIsEditingNameOverlay(true);
    setName(originalName);
    setNameError('');
  };

  const handleSaveName = () => {
    if (name.trim()) {
      setOriginalName(name);
      setIsEditingName(false);
      setIsEditingNameOverlay(false);
      setNameError('');
    } else {
      setNameError('Name is required');
    }
  };

  const handleCancelNameEdit = () => {
    setName(originalName);
    setNameError('');
    setIsEditingName(false);
    setIsEditingNameOverlay(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!value.trim()) {
      setNameError('Name is required');
    } else {
      setNameError('');
    }
  };

  // Email handlers
  const handleEditEmail = () => {
    setIsEditingEmailOverlay(true);
    setEmail(originalEmail);
    setEmailError('');
  };

  const handleSaveEmail = () => {
    if (!emailError && email && validateEmail(email)) {
      setOriginalEmail(email);
      setIsEditingEmail(false);
      setIsEditingEmailOverlay(false);
    }
  };

  const handleCancelEmailEdit = () => {
    setEmail(originalEmail);
    setEmailError('');
    setIsEditingEmail(false);
    setIsEditingEmailOverlay(false);
  };

  // Phone handlers
  const handleEditPhone = () => {
    setIsEditingPhoneOverlay(true);
    setPhone(originalPhone);
    setPhoneError('');
  };

  const handleSavePhone = () => {
    if (!phoneError && phone && validatePhone(phone)) {
      setOriginalPhone(phone);
      setIsEditingPhone(false);
      setIsEditingPhoneOverlay(false);
    }
  };

  const handleCancelPhoneEdit = () => {
    setPhone(originalPhone);
    setPhoneError('');
    setIsEditingPhone(false);
    setIsEditingPhoneOverlay(false);
  };

  // Privacy modal handlers
  const handleSecureEmailInput = () => {
    setPrivacyModal({
      isOpen: true,
      fieldType: 'email',
      currentValue: originalEmail
    });
  };

  const handleSecurePhoneInput = () => {
    setPrivacyModal({
      isOpen: true,
      fieldType: 'phone',
      currentValue: originalPhone
    });
  };

  const handlePrivacySubmit = (value: string) => {
    if (privacyModal.fieldType === 'email') {
      setEmail(value);
      setOriginalEmail(value);
      setEmailError('');
      setIsEditingEmail(false);
      
      // Record transition
      voiceTransitions.recordTransition('email', 'voice', 'secure', true);
      setLastAcknowledgment(getVoiceAcknowledgment('email', 'secure', true));
    } else if (privacyModal.fieldType === 'phone') {
      const formatted = formatPhoneNumber(value);
      setPhone(formatted);
      setOriginalPhone(formatted);
      setPhoneError('');
      setIsEditingPhone(false);
      
      // Record transition
      voiceTransitions.recordTransition('phone', 'voice', 'secure', true);
      setLastAcknowledgment(getVoiceAcknowledgment('phone', 'secure', true));
    }
    setPrivacyModal({ isOpen: false, fieldType: 'email', currentValue: '' });
    
    // Clear acknowledgment after 3 seconds
    setTimeout(() => setLastAcknowledgment(undefined), 3000);
  };

  const closePrivacyModal = () => {
    setPrivacyModal({ isOpen: false, fieldType: 'email', currentValue: '' });
  };

  // Contact redirect handling
  const handleContactRedirect = async (contactType: 'phone' | 'whatsapp') => {
    try {
      // Extract assistant ID from URL or context (we'll need to pass this as prop)
      const assistantId = window.location.pathname.includes('/preview/') 
        ? window.location.pathname.split('/preview/')[1] 
        : null;
      
      if (!assistantId) {
        console.error('Assistant ID not found');
        return;
      }

      const bookingData = {
        userName: bookingDetails.userName,
        userEmail: email,
        userPhone: phone,
        preferredDate: bookingDetails.preferredDate,
        preferredTime: bookingDetails.preferredTime,
        serviceType: bookingDetails.serviceType
      };

      const { data: result, error } = await supabase.functions.invoke('contact-redirect', {
        body: {
          assistantId,
          contactType,
          bookingDetails: bookingData
        }
      });

      if (error) {
        throw error;
      }

      if (result && result.success) {
        if (contactType === 'whatsapp') {
          setWhatsappModal({
            isOpen: true,
            url: result.contact_url
          });
        } else {
          // For phone calls, directly open the tel: URL
          window.location.href = result.contact_url;
        }
      } else if (result && result.not_activated) {
        const fallbackMsg = result.message
          || (contactType === 'whatsapp'
            ? "This business hasn't activated WhatsApp. Please leave your details here or use the booking form."
            : "This business hasn't published a phone number. Please leave your details here or book a callback.");
        toast(contactType === 'whatsapp' ? 'WhatsApp not activated' : 'Phone not available', {
          description: fallbackMsg,
        });
      } else {
        console.error('Contact redirect failed:', result?.error);
        toast.error('Unable to connect', {
          description: result?.error || 'Please try the booking form or leave your details here.',
        });
      }
    } catch (error) {
      console.error('Contact redirect error:', error);
    }
  };

  const closeWhatsappModal = () => {
    setWhatsappModal({ isOpen: false, url: '' });
  };

  // Voice confirmation handlers
  const startConfirmationListening = () => {
    console.log('🎤 startConfirmationListening called');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported');
      setLastAcknowledgment("Voice confirmation not supported on this device.");
      setTimeout(() => setLastAcknowledgment(undefined), 3000);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!recognitionRef.current) {
      console.log('🎤 Creating new SpeechRecognition instance');
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 3;

      recognitionRef.current.onstart = () => {
        console.log('✅ Voice confirmation listening STARTED');
        setIsListeningForConfirmation(true);
        setVoiceCountdown(60);
        setVoiceError(null);
        
        // Play audio beep to confirm listening started
        audioFeedback.playMicOnSound();
        
        // Start countdown timer
        countdownIntervalRef.current = setInterval(() => {
          setVoiceCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Auto-stop after 60 seconds
        const timeoutId = setTimeout(() => {
          console.log('⏱️ Voice confirmation timeout reached (60s)');
          stopConfirmationListening();
          audioFeedback.playErrorSound();
          setVoiceError("Listening timeout reached.");
          setLastAcknowledgment("Listening timeout. Click the button to try again.");
        }, 60000);
        
        // Store timeout ID for cleanup
        (recognitionRef.current as any).timeoutId = timeoutId;
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log('🎤 Heard confirmation phrase:', transcript);

        // Extended confirmation phrases with more casual options
        const confirmationPhrases = [
          'confirm booking',
          'confirm',
          'yes',
          'yes confirm',
          'book it',
          'yes please',
          'proceed',
          'go ahead',
          'correct',
          "that's right",
          'thats right',
          'that is right',
          'okay',
          'ok',
          'sure',
          'yep',
          'yeah',
          'sounds good',
          'looks good',
          'all good'
        ];

        // Edit detail phrases
        const editNamePhrases = ['edit name', 'change name', 'modify name', 'update name', 'fix name'];
        const editEmailPhrases = ['edit email', 'change email', 'modify email', 'update email', 'fix email'];
        const editPhonePhrases = ['edit phone', 'change phone', 'modify phone', 'update phone', 'fix phone', 'edit number', 'change number'];
        const editDetailsPhrases = ['edit details', 'edit information', 'change details', 'modify details', 'update details'];

        const isConfirmation = confirmationPhrases.some(phrase => 
          transcript.includes(phrase)
        );

        const isEditName = editNamePhrases.some(phrase => transcript.includes(phrase));
        const isEditEmail = editEmailPhrases.some(phrase => transcript.includes(phrase));
        const isEditPhone = editPhonePhrases.some(phrase => transcript.includes(phrase));
        const isEditDetails = editDetailsPhrases.some(phrase => transcript.includes(phrase));

        if (isConfirmation) {
          console.log('✅ Confirmation phrase detected, triggering booking');
          
          // Play success sound
          audioFeedback.playSuccessSound();
          
          // Provide voice acknowledgment
          const acknowledgment = "Great! Confirming your booking now...";
          setLastAcknowledgment(acknowledgment);
          setVoiceError(null);
          
          // Speak acknowledgment if available
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(acknowledgment);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }

          // Trigger booking confirmation
          setTimeout(() => {
            handleConfirm();
            setLastAcknowledgment(undefined);
          }, 500);
        } else if (isEditName) {
          console.log('✏️ Edit name command detected');
          const acknowledgment = "Opening name field for editing";
          setLastAcknowledgment(acknowledgment);
          
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(acknowledgment);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }
          
          setTimeout(() => {
            handleEditName();
            setLastAcknowledgment(undefined);
          }, 500);
        } else if (isEditEmail) {
          console.log('✏️ Edit email command detected');
          const acknowledgment = "Opening email field for editing";
          setLastAcknowledgment(acknowledgment);
          
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(acknowledgment);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }
          
          setTimeout(() => {
            handleEditEmail();
            setLastAcknowledgment(undefined);
          }, 500);
        } else if (isEditPhone) {
          console.log('✏️ Edit phone command detected');
          const acknowledgment = "Opening phone field for editing";
          setLastAcknowledgment(acknowledgment);
          
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(acknowledgment);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }
          
          setTimeout(() => {
            handleEditPhone();
            setLastAcknowledgment(undefined);
          }, 500);
        } else if (isEditDetails) {
          console.log('✏️ Edit details command detected - enabling all edit modes');
          const acknowledgment = "Opening all fields for editing";
          setLastAcknowledgment(acknowledgment);
          
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(acknowledgment);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }
          
          setTimeout(() => {
            handleEditName();
            handleEditEmail();
            handleEditPhone();
            setLastAcknowledgment(undefined);
          }, 500);
        } else {
          console.log('❌ Not a recognized command:', transcript);
          audioFeedback.playErrorSound();
          setLastAcknowledgment(`I didn't catch that. Say 'confirm booking' to confirm or 'edit details' to make changes.`);
        }

        setIsListeningForConfirmation(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Voice confirmation error:', event.error);
        setIsListeningForConfirmation(false);
        audioFeedback.playErrorSound();
        
        if (event.error === 'no-speech') {
          setVoiceError("No speech detected.");
          setLastAcknowledgment("I didn't hear anything. Click the button to try again.");
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setVoiceError("Microphone access blocked.");
          setLastAcknowledgment("Microphone access denied. Please enable it in your browser settings and click the button to try again.");
        } else if (event.error === 'network') {
          setVoiceError("Network error.");
          setLastAcknowledgment("Network error. Please check your connection and try again.");
        } else {
          setVoiceError("Voice recognition error.");
          setLastAcknowledgment("Voice recognition error. Please try again.");
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Voice confirmation listening ended');
        setIsListeningForConfirmation(false);
      };
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting voice confirmation:', error);
      setIsListeningForConfirmation(false);
      setLastAcknowledgment("Could not start voice recognition. Please try again.");
      setTimeout(() => setLastAcknowledgment(undefined), 3000);
    }
  };

  const stopConfirmationListening = () => {
    if (recognitionRef.current) {
      // Clear any pending timeout
      if ((recognitionRef.current as any).timeoutId) {
        clearTimeout((recognitionRef.current as any).timeoutId);
        (recognitionRef.current as any).timeoutId = null;
      }
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
    }
    
    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setIsListeningForConfirmation(false);
    setVoiceCountdown(60);
    audioFeedback.playMicOffSound();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!isOpen && !showSuccess) return null;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
    if (value && !validatePhone(value)) {
      setPhoneError('Please enter a valid phone number');
    } else {
      setPhoneError('');
    }
  };

  const handleConfirm = async () => {
    console.log('=== BOOKING MODAL CONFIRM CLICKED ===');
    
    // Stop voice listening if active
    if (recognitionRef.current) {
      stopConfirmationListening();
    }
    
    // Prepare booking data with latest values
    const bookingData = { 
      ...bookingDetails,
      userName: originalName,
      userEmail: originalEmail,
      userPhone: originalPhone
    };
    
    console.log('📦 Passing booking data to parent:', bookingData);
    
    // Call parent's onConfirm handler instead of submitting directly
    onConfirm(bookingData);
  };


  const handleRetry = () => {
    setRetryAttempt(prev => prev + 1);
    resetStatus();
    handleConfirm();
  };

  const handleErrorFallback = () => {
    // Show both contact options in error fallback
    updateStatus('error', `
      <div class="space-y-2">
        <div class="font-medium">Booking system unavailable</div>
        <div class="text-sm">Please contact us directly:</div>
        <div class="flex gap-2">
          <button onclick="window.handleCallFallback()" class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Call Now
          </button>
          <button onclick="window.handleWhatsAppFallback()" class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
            WhatsApp
          </button>
        </div>
      </div>
    `);
    
    // Set global handlers for the fallback buttons
    (window as any).handleCallFallback = () => handleContactRedirect('phone');
    (window as any).handleWhatsAppFallback = () => handleContactRedirect('whatsapp');
  };

  const formatDateTime = () => {
    console.log('=== BOOKING MODAL DATE DEBUGGING ===');
    console.log('bookingDetails.preferredDate:', bookingDetails.preferredDate);
    console.log('bookingDetails full object:', bookingDetails);
    
    // Always use current date if no valid date is provided or date seems cached
    const now = new Date();
    let targetDate = now;
    
    if (bookingDetails.preferredDate) {
      const parsedDate = new Date(bookingDetails.preferredDate);
      console.log('Parsed date from bookingDetails:', parsedDate);
      console.log('Is parsed date valid?', !isNaN(parsedDate.getTime()));
      
      // Check if the date seems like a cached/old date (more than a week old or in the past)
      const daysDiff = (now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24);
      console.log('Days difference from current date:', daysDiff);
      
      if (!isNaN(parsedDate.getTime()) && daysDiff < 7 && daysDiff > -365) {
        // Use the provided date if it's valid and reasonable
        targetDate = parsedDate;
        console.log('Using provided date:', targetDate);
      } else {
        console.warn('Date seems cached or invalid, using current date instead');
        targetDate = now;
      }
    } else {
      console.log('No preferredDate provided, using current date');
    }
    
    // Force refresh: always recalculate from target date
    const formattedDate = targetDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
    
    // Calculate fullDate fresh every time - no caching
    const fullDate = targetDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    console.log('Final calculated fullDate:', fullDate);
    console.log('Final calculated formattedDate:', formattedDate);
    
    let formattedTime = bookingDetails.preferredTime || 'Not specified';
    if (formattedTime !== 'Not specified') {
      // Try to format time if it's in a standard format
      const timeMatch = formattedTime.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm|AM|PM)?/);
      if (timeMatch) {
        let [, hours, minutes = '00', period] = timeMatch;
        hours = hours.padStart(2, '0');
        minutes = minutes.padStart(2, '00');
        formattedTime = `${hours}:${minutes}${period ? ` ${period.toUpperCase()}` : ''}`;
      }
    }
    
    return { 
      date: formattedDate, 
      time: formattedTime,
      fullDate: fullDate
    };
  };

  const { date: formattedDate, time: formattedTime, fullDate } = formatDateTime();
  
  // Debug log the full booking details to track the source
  console.log('BookingModal - Full booking details:', bookingDetails);
  console.log('BookingModal - Calculated fullDate for calendar:', fullDate);

  // Conditional rendering: only show modal when isOpen is true
  console.log('🎯 BookingModal render check - isOpen:', isOpen, 'hasDetails:', Object.keys(bookingDetails).length);
  if (!isOpen) {
    console.log('🎯 BookingModal - NOT RENDERING (isOpen is false)');
    return null;
  }
  console.log('🎯 BookingModal - RENDERING NOW with details:', bookingDetails);

  const modalSizingClasses = embedded
    ? 'w-full max-w-md sm:max-w-lg'
    : 'w-full max-w-lg sm:max-w-xl';
  const headerTitleSize = embedded ? 'text-sm' : 'text-lg';
  const headerSubtitleSize = embedded ? 'text-[11px]' : 'text-sm';
  const contentSpacingClasses = embedded
    ? 'flex-1 p-3 space-y-3 overflow-y-auto'
    : 'flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-hidden';
  const headerPaddingClasses = embedded ? 'px-4 py-3' : 'px-6 py-4';
  const headerIconClasses = embedded ? 'w-4 h-4' : 'w-5 h-5';
  const headerInstructionSpacing = embedded ? 'mt-0.5' : 'mt-1';

  const modalContent = (
      <BookingErrorBoundary
        showFallbackOptions={true}
        onWhatsAppRedirect={() => handleContactRedirect('whatsapp')}
        onManualContact={() => handleContactRedirect('phone')}
        onError={(error, errorInfo) => {
          console.error('Booking modal error:', error, errorInfo);
          updateStatus('error', 'An unexpected error occurred. Please try again.');
        }}
      >
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[999999] flex items-center justify-center p-4">
        <div className={`bg-white rounded-xl shadow-xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[calc(100vh-3rem)] relative ${modalSizingClasses}`}>
          {/* Purple Header with Calendar Icon */}
          <div className={`bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl ${headerPaddingClasses}`}>
            <div className="flex items-center justify-center gap-2">
              <svg className={headerIconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex flex-col items-center">
                <h3 className={`${headerTitleSize} font-semibold`}>
                  {showSuccess ? 'Booking Confirmed!' : 'Confirm Your Appointment'}
                </h3>
                {fullDate && !showSuccess && (
                  <span className={`${headerSubtitleSize} text-white/80`}>{fullDate}</span>
                )}
                {!showSuccess && !embedded && (
                  <span className={`text-xs text-purple-200 ${headerInstructionSpacing} flex items-center gap-1`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Say "confirm booking" or "edit details" to make changes
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Voice Status Badge - Persistent at top right */}
          {!embedded && !showSuccess && (
            <div className="absolute top-2 right-2 z-10">
              {voiceSupported ? (
                isListeningForConfirmation ? (
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    🎤 Voice Active ({voiceCountdown}s)
                  </div>
                ) : voiceError ? (
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    🎤 Voice Unavailable
                  </div>
                ) : (
                  <div className="bg-gray-400 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    🎤 Voice Ready
                  </div>
                )
              ) : (
                <div className="bg-gray-400 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                  🎤 Not Supported
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className={contentSpacingClasses}>
            {/* Compact Summary for immediate glance (always visible at top) */}
            {!showSuccess && (
              <div className="w-full bg-white border border-purple-100 rounded-lg shadow-sm p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-700 sm:text-sm">
                    Appointment Summary
                  </h4>
                  <span className="text-[10px] text-purple-500 sm:text-xs">
                    Tap edit below to make changes
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-800">
                  <div className="flex items-center gap-2 bg-purple-50/60 rounded-md px-3 py-2">
                    <span className="text-purple-500 text-base sm:text-lg">📞</span>
                    <div>
                      <p className="font-medium text-[11px] text-purple-600 uppercase tracking-wide">Phone</p>
                      <p className="text-gray-900 text-sm sm:text-base font-semibold">{originalPhone || bookingDetails.userPhone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-50/60 rounded-md px-3 py-2">
                    <span className="text-purple-500 text-base sm:text-lg">📅</span>
                    <div>
                      <p className="font-medium text-[11px] text-purple-600 uppercase tracking-wide">Date</p>
                      <p className="text-gray-900 text-sm sm:text-base font-semibold">{formattedDate || bookingDetails.preferredDate || 'Pending'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-50/60 rounded-md px-3 py-2">
                    <span className="text-purple-500 text-base sm:text-lg">⏰</span>
                    <div>
                      <p className="font-medium text-[11px] text-purple-600 uppercase tracking-wide">Time</p>
                      <p className="text-gray-900 text-sm sm:text-base font-semibold">{formattedTime || bookingDetails.preferredTime || 'Pending'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-50/60 rounded-md px-3 py-2">
                    <span className="text-purple-500 text-base sm:text-lg">🛠️</span>
                    <div>
                      <p className="font-medium text-[11px] text-purple-600 uppercase tracking-wide">Service</p>
                      <p className="text-gray-900 text-sm sm:text-base font-semibold">{bookingDetails.serviceType || 'General enquiry'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Minimal voice status chip for mobile */}
            {!embedded && !showSuccess && (
              <div className="sm:hidden flex justify-center">
                <span className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium ${
                  voiceSupported
                    ? (isListeningForConfirmation ? 'bg-green-600 text-white' : 'bg-purple-600 text-white')
                    : 'bg-gray-400 text-white'
                }`}>
                  {voiceSupported
                    ? (isListeningForConfirmation ? '🎤 Listening...' : '🎤 Voice ready')
                    : '🎤 Voice unavailable'}
                </span>
              </div>
            )}

            {/* Voice Error Display - Persistent until dismissed */}
            {!embedded && voiceError && !showSuccess && (
              <div className="hidden sm:block bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Voice Confirmation Issue</p>
                      <p className="text-sm mt-1">{voiceError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setVoiceError(null)}
                    className="text-red-600 hover:text-red-800 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Voice Listening Indicator - Prominent when active */}
            {!embedded && isListeningForConfirmation && (
              <div className="hidden sm:block bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <div className="flex flex-col flex-1">
                      <p className="text-lg font-bold">🎤 Listening for Commands</p>
                      <p className="text-sm text-green-100">Say "confirm" or "edit details"</p>
                      <p className="text-xs text-green-200 mt-1">Time remaining: {voiceCountdown}s</p>
                    </div>
                  </div>
                  <button
                    onClick={stopConfirmationListening}
                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                  >
                    🔴 Stop
                  </button>
                </div>
              </div>
            )}
            
            {/* Manual Voice Control Button - Always visible */}
            {!embedded && voiceSupported && !showSuccess && (
              <div className="hidden sm:block">
              <button
                onClick={() => {
                  if (isListeningForConfirmation) {
                    console.log('🔴 Stopping voice confirmation');
                    stopConfirmationListening();
                  } else {
                    console.log('🎤 Manual voice trigger clicked');
                    setVoiceError(null);
                    // Request permission and start
                    navigator.mediaDevices.getUserMedia({ audio: true })
                      .then(() => {
                        console.log('✅ Mic permission granted from manual trigger');
                        audioFeedback.playClickSound();
                        startConfirmationListening();
                      })
                      .catch((error) => {
                        console.error('❌ Mic permission denied:', error);
                        audioFeedback.playErrorSound();
                        
                        if (error.name === 'NotAllowedError') {
                          setVoiceError("Microphone blocked by browser. Check your browser's address bar.");
                        } else {
                          setVoiceError("Microphone access needed for voice confirmation.");
                        }
                      });
                  }
                }}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                  isListeningForConfirmation
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                    : voiceError
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {isListeningForConfirmation ? '🔴 Stop Listening' : voiceError ? '🔄 Retry Voice Confirmation' : '🎤 Start Voice Confirmation'}
              </button>
              </div>
            )}
            
            {/* Booking Status */}
            <BookingStatus
              status={status}
              error={statusError}
              successMessage={successMessage}
              onRetry={handleRetry}
              onWhatsAppFallback={() => handleContactRedirect('whatsapp')}
              onManualContact={() => handleContactRedirect('phone')}
              bookingDetails={{
                businessName: businessName,
                confirmationNumber: `BK-${Date.now().toString().slice(-6)}`,
                scheduledDate: formattedDate,
                scheduledTime: formattedTime
              }}
            />

            {/* Alternative Time Slots */}
            {alternativeSlots && alternativeSlots.length > 0 && !showSuccess && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DynamicCalendarIcon className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Available Alternative Times</h4>
                </div>
                <p className="text-sm text-amber-800 mb-3">
                  Your requested time isn't available. Select one of these alternatives:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {alternativeSlots.slice(0, 4).map((slot, index) => (
                    <Card
                      key={index}
                      className="p-3 cursor-pointer hover:bg-amber-100 hover:border-amber-300 transition-colors border-amber-200"
                      onClick={() => {
                        const selected = selectAlternative(index);
                        if (selected) {
                          // Trigger re-booking with the selected slot
                          onConfirm({
                            userName: name,
                            userEmail: email,
                            userPhone: phone,
                            preferredDate: selected.date,
                            preferredTime: selected.start_time,
                            serviceType: bookingDetails.serviceType
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {slot.formatted_date}
                          </div>
                          <div className="text-sm text-gray-600">
                            {slot.formatted_time}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  💡 Your personal information is saved - just select a time
                </p>
              </div>
            )}

            {/* Main Form - Hidden during success */}
            {!showSuccess && (
              <>
                {/* Clean Card Layout for Booking Details */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 w-full overflow-hidden">
                  <h4 className="font-semibold text-gray-800 mb-3">Booking Details</h4>
                  
                  <div className="space-y-3 sm:space-y-4 w-full">
                    {/* Name Field with Inline Edit */}
                    {originalName && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        {!isEditingName ? (
                          <div className="bg-white rounded border border-gray-200 p-3 sm:p-2 w-full">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
                              <span className="text-base sm:text-sm text-gray-900 break-words flex-1">
                                {originalName}
                              </span>
                              <button
                                onClick={handleEditName}
                                disabled={status === 'submitting' || status === 'validating'}
                                className="inline-flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                                title="Edit name"
                              >
                                <svg className="w-4 h-4 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                              </button>
                            </div>
                          </div>
                        ) : (
                        <div className="space-y-1 w-full overflow-visible min-w-0">
                          <VoiceInputField
                            className="w-full min-w-0"
                            label=""
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Enter your name"
                            type="text"
                            error={nameError}
                            fieldType="name"
                            showTransitionHistory={false}
                            size="large"
                          />
                          {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                             <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:justify-end">
                              <button
                                onClick={handleSaveName}
                                disabled={!name.trim() || !!nameError}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save
                              </button>
                              <button
                                onClick={handleCancelNameEdit}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors w-full sm:w-auto"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Email Field with Inline Edit */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      {!isEditingEmail ? (
                        <div className="bg-white rounded border border-gray-200 p-3 sm:p-2 w-full">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
                            <span className="text-base sm:text-sm text-gray-900 break-words flex-1">
                              {originalEmail || 'Not provided'}
                            </span>
                            <button
                              onClick={handleEditEmail}
                              disabled={status === 'submitting' || status === 'validating'}
                              className="inline-flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                              title="Edit email"
                            >
                              <svg className="w-4 h-4 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 w-full overflow-visible min-w-0">
                          <VoiceInputField
                            className="w-full min-w-0"
                            label=""
                            value={email}
                            onChange={handleEmailChange}
                            placeholder="your@email.com"
                            type="email"
                            error={emailError}
                            fieldType="email"
                            showTransitionHistory={false}
                            size="large"
                          />
                           {emailError && <p className="text-xs text-red-600">{emailError}</p>}
                            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:justify-end">
                              <button
                                onClick={handleSaveEmail}
                                disabled={!email || !!emailError}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save
                              </button>
                              <button
                                onClick={handleCancelEmailEdit}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors w-full sm:w-auto"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            </div>
                        </div>
                      )}
                    </div>

                    {/* Phone Field with Inline Edit */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      {!isEditingPhone ? (
                        <div className="bg-white rounded border border-gray-200 p-3 sm:p-2 w-full">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
                            <span className="text-base sm:text-sm text-gray-900 break-words flex-1">
                              {originalPhone || 'Not provided'}
                            </span>
                            <button
                              onClick={handleEditPhone}
                              disabled={status === 'submitting' || status === 'validating'}
                              className="inline-flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                              title="Edit phone"
                            >
                              <svg className="w-4 h-4 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 w-full overflow-visible min-w-0">
                          <VoiceInputField
                            className="w-full min-w-0"
                            label=""
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="(555) 123-4567"
                            type="tel"
                            error={phoneError}
                            fieldType="phone"
                            showTransitionHistory={false}
                            size="large"
                          />
                           {phoneError && <p className="text-xs text-red-600">{phoneError}</p>}
                            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:justify-end">
                              <button
                                onClick={handleSavePhone}
                                disabled={!phone || !!phoneError}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save
                              </button>
                              <button
                                onClick={handleCancelPhoneEdit}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors w-full sm:w-auto"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Date */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Date:</span>
                      <span className="text-gray-800">{formattedDate}</span>
                    </div>
                    
                    {/* Time */}
                    {formattedTime && formattedTime !== 'Not specified' && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Time:</span>
                        <span className="text-gray-800">{formattedTime}</span>
                      </div>
                    )}
                    
                    {/* Service */}
                    {bookingDetails.serviceType && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Service:</span>
                        <span className="text-gray-800">{bookingDetails.serviceType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Voice Acknowledgment */}
                {lastAcknowledgment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-blue-800">{lastAcknowledgment}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Main Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={status === 'submitting' || status === 'validating'}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={
                        status === 'submitting' || 
                        status === 'validating' || 
                        !originalName ||
                        !originalEmail || 
                        !originalPhone || 
                        !!nameError ||
                        !!emailError || 
                        !!phoneError ||
                        isEditingName ||
                        isEditingEmail ||
                        isEditingPhone
                      }
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {status === 'validating' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Validating...
                        </>
                      ) : status === 'submitting' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Confirm Booking
                        </>
                      )}
                    </button>
                    
                    {/* Voice Confirmation Button */}
                    <button
                      onClick={isListeningForConfirmation ? stopConfirmationListening : startConfirmationListening}
                      disabled={
                        status === 'submitting' || 
                        status === 'validating' || 
                        !originalName ||
                        !originalEmail || 
                        !originalPhone || 
                        !!nameError ||
                        !!emailError || 
                        !!phoneError
                      }
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isListeningForConfirmation 
                          ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      title={isListeningForConfirmation ? "Listening... (say 'confirm booking' or 'yes')" : "Voice Confirm"}
                    >
                      {isListeningForConfirmation ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Voice Confirmation Feedback */}
                  {isListeningForConfirmation && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-1 h-4 bg-purple-600 rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1 h-4 bg-purple-600 rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1 h-4 bg-purple-600 rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-sm text-purple-800 font-medium">
                          Listening... Say "confirm booking" or "yes"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Contact Options - Only show when not processing */}
                  {status === 'idle' && (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-gray-500">Or contact us directly:</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleContactRedirect('phone')}
                          disabled={!originalEmail || !originalPhone || !!emailError || !!phoneError || isEditingEmail || isEditingPhone}
                          className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call Now
                        </button>
                        <button
                          onClick={() => handleContactRedirect('whatsapp')}
                          disabled={!originalEmail || !originalPhone || !!emailError || !!phoneError || isEditingEmail || isEditingPhone}
                          className="flex-1 px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg font-medium hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.388"/>
                          </svg>
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Name Overlay */}
      {isEditingNameOverlay && (
        <div 
          className={`${embedded ? 'absolute' : 'fixed'} inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4`}
          style={embedded ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' } : {}}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Edit Name</h4>
            <VoiceInputField
              className="w-full"
              label=""
              value={name}
              onChange={handleNameChange}
              placeholder="Enter your name"
              type="text"
              error={nameError}
              fieldType="name"
              showTransitionHistory={false}
              size="large"
            />
            {nameError && <p className="text-sm text-red-600 mt-2">{nameError}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveName}
                disabled={!name.trim() || !!nameError}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
              <button
                onClick={handleCancelNameEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Email Overlay */}
      {isEditingEmailOverlay && (
        <div 
          className={`${embedded ? 'absolute' : 'fixed'} inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4`}
          style={embedded ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' } : {}}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Edit Email Address</h4>
            <VoiceInputField
              className="w-full"
              label=""
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              type="email"
              error={emailError}
              fieldType="email"
              showTransitionHistory={false}
              size="large"
            />
            {emailError && <p className="text-sm text-red-600 mt-2">{emailError}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEmail}
                disabled={!email || !!emailError}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
              <button
                onClick={handleCancelEmailEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Phone Overlay */}
      {isEditingPhoneOverlay && (
        <div 
          className={`${embedded ? 'absolute' : 'fixed'} inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4`}
          style={embedded ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' } : {}}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Edit Phone Number</h4>
            <VoiceInputField
              className="w-full"
              label=""
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              type="tel"
              error={phoneError}
              fieldType="phone"
              showTransitionHistory={false}
              size="large"
            />
            {phoneError && <p className="text-sm text-red-600 mt-2">{phoneError}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSavePhone}
                disabled={!phone || !!phoneError}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
              <button
                onClick={handleCancelPhoneEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Privacy Input Modal */}
      <PrivacyInputModal
        isOpen={privacyModal.isOpen}
        onClose={closePrivacyModal}
        fieldType={privacyModal.fieldType}
        onSubmit={handlePrivacySubmit}
        currentValue={privacyModal.currentValue}
      />
      
      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsappModal.isOpen}
        onClose={closeWhatsappModal}
        whatsappUrl={whatsappModal.url}
        businessName={businessName}
        bookingDetails={{
          userName: originalName,
          userEmail: originalEmail,
          userPhone: originalPhone,
          preferredDate: bookingDetails.preferredDate,
          preferredTime: bookingDetails.preferredTime,
          serviceType: bookingDetails.serviceType
        }}
      />
    </BookingErrorBoundary>
  );

  // In embedded mode, use portal to escape widget container and render full-screen
  return embedded ? createPortal(modalContent, document.body) : modalContent;
};