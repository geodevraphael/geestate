import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { X, Download, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show after delay if not installed
    if (isIOSDevice && !standalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Desktop
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 relative">
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 hover:bg-muted rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Download className="h-6 w-6 text-primary-foreground" />
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="font-semibold text-foreground mb-1">
              Install GeoEstate
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {isIOS 
                ? 'Add to your home screen for quick access'
                : 'Install the app for a better experience'
              }
            </p>

            {isIOS ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="bg-muted rounded px-2 py-1 font-medium">1</span>
                  Tap <Share className="h-4 w-4 inline mx-1" /> Share button
                </p>
                <p className="flex items-center gap-2">
                  <span className="bg-muted rounded px-2 py-1 font-medium">2</span>
                  Tap <Plus className="h-4 w-4 inline mx-1" /> Add to Home Screen
                </p>
              </div>
            ) : (
              <Button onClick={handleInstall} size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
