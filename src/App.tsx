import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { AppShell } from './components/AppShell';

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [landingDone, setLandingDone] = useState(() => {
    return !!localStorage.getItem('pollazo_landing_dismissed') || !!localStorage.getItem('pollazo_customer_phone');
  });

  // Lógica PWA: Captura de instalación y Auto-Update
  useEffect(() => {
    // Forzar actualización de Service Worker para evitar versiones obsoletas
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleContinue = () => {
    localStorage.setItem('pollazo_landing_dismissed', '1');
    setLandingDone(true);
  };

  if (!landingDone) {
    return (
      <LandingPage 
        onInstall={handleInstall} 
        canInstall={!!deferredPrompt} 
        onContinueWeb={handleContinue} 
      />
    );
  }

  return <AppShell onInstall={handleInstall} canInstall={!!deferredPrompt} />;
}
