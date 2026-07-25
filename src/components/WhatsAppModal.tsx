import React from 'react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappUrl: string;
  businessName: string;
  isPreviewMode?: boolean;
  bookingDetails?: {
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    preferredDate?: string;
    preferredTime?: string;
    serviceType?: string;
  };
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  whatsappUrl,
  businessName,
  isPreviewMode = false,
  bookingDetails
}) => {
  if (!isOpen) return null;

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-400">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-6 text-center">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="text-xl font-bold mb-2">Redirecting to WhatsApp</h3>
          <p className="text-white/90 text-sm">
            {isPreviewMode 
              ? "Opening test WhatsApp line (preview mode)" 
              : `Connecting you to ${businessName}`
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          {bookingDetails && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-gray-800 mb-3">Your booking details will be included:</h4>
              <div className="space-y-2 text-sm">
                {bookingDetails.userName && (
                  <div>
                    <span className="font-medium text-gray-600">Name:</span> {bookingDetails.userName}
                  </div>
                )}
                {bookingDetails.userEmail && (
                  <div>
                    <span className="font-medium text-gray-600">Email:</span> {bookingDetails.userEmail}
                  </div>
                )}
                {bookingDetails.userPhone && (
                  <div>
                    <span className="font-medium text-gray-600">Phone:</span> {bookingDetails.userPhone}
                  </div>
                )}
                {bookingDetails.preferredDate && (
                  <div>
                    <span className="font-medium text-gray-600">Date:</span> {bookingDetails.preferredDate}
                  </div>
                )}
                {bookingDetails.preferredTime && (
                  <div>
                    <span className="font-medium text-gray-600">Time:</span> {bookingDetails.preferredTime}
                  </div>
                )}
                {bookingDetails.serviceType && (
                  <div>
                    <span className="font-medium text-gray-600">Service:</span> {bookingDetails.serviceType}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="text-gray-600 mb-6">
            {bookingDetails 
              ? "Your booking information will be shared with the business on WhatsApp"
              : "Click the button below to continue your conversation on WhatsApp"
            }
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Open WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};