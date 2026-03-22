import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Handle beforeinstallprompt (Android/Chrome/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Check if it's iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
    setIsIOS(isIOSDevice);

    // If it's iOS and not standalone, show prompt
    if (isIOSDevice && !window.navigator.standalone) {
      setShowPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[9999] animate-in md:left-auto md:right-8 md:bottom-28 md:w-80">
      <div className="glass-morphism rounded-2xl p-5 relative overflow-hidden group">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-green-500/20 blur-3xl rounded-full transition-all group-hover:bg-green-500/30" />
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors p-1"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="bg-green-500/20 p-3 rounded-xl text-green-500">
            <Download size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Install Melodix</h3>
            <p className="text-sm text-white/70 mt-1 leading-relaxed">
              {isIOS 
                ? "Experience Melodix like a native app on your iPhone."
                : "Add Melodix to your home screen for faster access."
              }
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {isIOS ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-3 text-xs text-white/90">
                <span className="bg-white/10 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">1</span>
                <span className="flex items-center gap-1">Tap the <Share size={14} className="text-blue-400" /> icon below </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <span className="bg-white/10 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">2</span>
                <span className="flex items-center gap-1">Select <PlusSquare size={14} /> 'Add to Home Screen'</span>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className="w-full bg-[#1db954] hover:bg-[#1ed760] text-black font-bold py-3 rounded-full transition-all transform active:scale-[0.98] shadow-lg shadow-green-500/20"
            >
              Install App 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
