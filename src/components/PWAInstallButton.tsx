import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast({
        title: "App Installed!",
        description: "TalkWeb has been added to your home screen.",
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Already Installed",
        description: "TalkWeb is already installed on your device.",
        variant: "default",
      });
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast({
          title: "Installing...",
          description: "TalkWeb is being installed to your home screen.",
        });
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast({
        title: "Installation Failed",
        description: "Could not install the app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  // Don't show button if already installed or prompt not available
  if (isInstalled) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Check className="h-4 w-4" />
        Installed
      </Button>
    );
  }

  if (!deferredPrompt) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstallClick} 
      disabled={isInstalling}
      className="gap-2 shadow-2xl hover:shadow-3xl bg-gradient-to-r from-primary via-primary to-primary-foreground/90 hover:from-primary/90 hover:via-primary hover:to-primary text-primary-foreground font-bold border-2 border-primary-foreground/20 animate-pulse hover:animate-none transition-all"
      size="lg"
    >
      <Download className="h-5 w-5 animate-bounce" />
      {isInstalling ? 'Installing...' : 'Install App'}
    </Button>
  );
};
