import React, { useState, useEffect } from 'react';

interface QuickHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: QuickHelpDetails) => void;
  helpDetails: QuickHelpDetails;
  businessName: string;
  isLoading?: boolean;
}

interface QuickHelpDetails {
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  message: string;
  urgency?: string;
  category?: string;
}

export const QuickHelpModal: React.FC<QuickHelpModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  helpDetails,
  businessName,
  isLoading = false
}) => {
  const [email, setEmail] = useState(helpDetails.userEmail || '');
  const [phone, setPhone] = useState(helpDetails.userPhone || '');
  const [name, setName] = useState(helpDetails.userName || '');
  const [message, setMessage] = useState(helpDetails.message || '');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailInputMode, setEmailInputMode] = useState<'voice' | 'manual'>(helpDetails.userEmail ? 'voice' : 'manual');
  const [phoneInputMode, setPhoneInputMode] = useState<'voice' | 'manual'>(helpDetails.userPhone ? 'voice' : 'manual');
  const [nameInputMode, setNameInputMode] = useState<'voice' | 'manual'>(helpDetails.userName ? 'voice' : 'manual');

  // Update state when helpDetails changes
  useEffect(() => {
    setEmail(helpDetails.userEmail || '');
    setPhone(helpDetails.userPhone || '');
    setName(helpDetails.userName || '');
    setMessage(helpDetails.message || '');
    setEmailInputMode(helpDetails.userEmail ? 'voice' : 'manual');
    setPhoneInputMode(helpDetails.userPhone ? 'voice' : 'manual');
    setNameInputMode(helpDetails.userName ? 'voice' : 'manual');
  }, [helpDetails]);

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSubmit = () => {
    let hasErrors = false;

    // At least one contact method is required
    if (!email && !phone) {
      setEmailError('Please provide either email or phone number');
      setPhoneError('Please provide either email or phone number');
      hasErrors = true;
    } else {
      // Validate email if provided
      if (email && !validateEmail(email)) {
        setEmailError('Please enter a valid email address');
        hasErrors = true;
      } else {
        setEmailError('');
      }

      // Validate phone if provided
      if (phone && !validatePhone(phone)) {
        setPhoneError('Please enter a valid phone number');
        hasErrors = true;
      } else {
        setPhoneError('');
      }
    }

    if (!hasErrors && message.trim()) {
      onConfirm({
        userEmail: email || undefined,
        userPhone: phone || undefined,
        userName: name || undefined,
        message: message.trim(),
        urgency: helpDetails.urgency || 'medium',
        category: helpDetails.category || 'general'
      });
    }
  };

  const toggleEmailMode = () => {
    setEmailInputMode(emailInputMode === 'voice' ? 'manual' : 'voice');
    if (emailInputMode === 'voice') {
      setEmail('');
    }
  };

  const togglePhoneMode = () => {
    setPhoneInputMode(phoneInputMode === 'voice' ? 'manual' : 'voice');
    if (phoneInputMode === 'voice') {
      setPhone('');
    }
  };

  const toggleNameMode = () => {
    setNameInputMode(nameInputMode === 'voice' ? 'manual' : 'voice');
    if (nameInputMode === 'voice') {
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Send Quick Message</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Share your project requirements in your own words. We'll summarize the details and send them directly to {businessName} so the right person can follow up.
          </p>

          <div className="space-y-4">
            {/* Name field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Name (Optional)
                </label>
                <button
                  type="button"
                  onClick={toggleNameMode}
                  className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  {nameInputMode === 'voice' ? 'Type Instead' : 'Use Voice'}
                </button>
              </div>
              {nameInputMode === 'voice' ? (
                <div className="p-3 border border-border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">
                      {name || 'Provided via voice'}
                    </span>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your name"
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Email field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <button
                  type="button"
                  onClick={toggleEmailMode}
                  className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  {emailInputMode === 'voice' ? 'Type Instead' : 'Use Voice'}
                </button>
              </div>
              {emailInputMode === 'voice' ? (
                <div className="p-3 border border-border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">
                      {email || 'Provided via voice'}
                    </span>
                  </div>
                </div>
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your email address"
                  disabled={isLoading}
                />
              )}
              {emailError && (
                <p className="text-sm text-destructive mt-1">{emailError}</p>
              )}
            </div>

            {/* Phone field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Phone Number
                </label>
                <button
                  type="button"
                  onClick={togglePhoneMode}
                  className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  {phoneInputMode === 'voice' ? 'Type Instead' : 'Use Voice'}
                </button>
              </div>
              {phoneInputMode === 'voice' ? (
                <div className="p-3 border border-border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">
                      {phone || 'Provided via voice'}
                    </span>
                  </div>
                </div>
              ) : (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                />
              )}
              {phoneError && (
                <p className="text-sm text-destructive mt-1">{phoneError}</p>
              )}
            </div>

            {/* Message field */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Describe your project, goals, timeline, budget, and anything else we should know..."
                disabled={isLoading}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Please provide at least one contact method (email or phone). We'll respond as soon as possible.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !message.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};