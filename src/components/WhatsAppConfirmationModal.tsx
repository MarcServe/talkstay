import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, ExternalLink } from 'lucide-react';

interface WhatsAppConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappUrl: string;
  businessName: string;
}

export const WhatsAppConfirmationModal: React.FC<WhatsAppConfirmationModalProps> = ({
  isOpen,
  onClose,
  whatsappUrl,
  businessName
}) => {
  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Connect via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Continue your conversation with {businessName} on WhatsApp for faster responses and direct communication.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium">WhatsApp Connection Ready</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Click below to open WhatsApp and continue the conversation with {businessName}.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleOpenWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open WhatsApp
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};