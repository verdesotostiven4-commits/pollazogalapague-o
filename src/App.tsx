import { useState, useEffect } from 'react';
// ... otros imports ...

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [landingDone, setLandingDone] = useState(() => {
    return !!localStorage.getItem('pollazo_landing_dismissed') || !!localStorage.getItem('pollazo_customer_phone');
  });

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleContinue = () => {
    localStorage.setItem('pollazo_landing_dismissed', '1');
    setLandingDone(true);
  };

  if (!landingDone) {
    return <LandingPage onInstall={handleInstall} canInstall={!!deferredPrompt} onContinueWeb={handleContinue} />;
  }

  return <AppShell onInstall={handleInstall} canInstall={!!deferredPrompt} />;
}
