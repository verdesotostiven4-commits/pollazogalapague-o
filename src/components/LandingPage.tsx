import { useState, useEffect, type CSSProperties } from 'react';
import {
  Download,
  Globe,
  Share,
  PlusSquare,
  X,
  Loader2
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const LOGO_OFFICIAL = "https://blogger.googleusercontent.com/img/a/AVvXsEin3pN4YDaHP3IxmNrtpbD2swEb9qpEJOsOmbbbtAmlaSgSicNgZbB9jYTdfdX4oiDOBORD4h5oDSRlFbzw6-3B6c2sFH7s3T0tla5kFjCe6treln_EPQ5a2i7V-ghUqJyTeVztj1ORThqO-G-eqO1eyDxo3MsEsoiBW60fatCa7SNeVHtJd-a3vLrjhtg";

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  const admin = useAdmin() as any;
  const settings = admin?.settings;
  const extraSettings = admin?.extraSettings;

  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installMessage, setInstallMessage] = useState('');

  const logoUrl = extraSettings?.logo_url || LOGO_OFFICIAL;
  const primaryColor = settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (/iPhone|iPad|iPod/.test(window.navigator.userAgent)) {
      setShowIOSModal(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'dismissed') setInstallMessage('Instalación cancelada.');
      setDeferredPrompt(null);
      return;
    }
    setInstallMessage('Usa el menú de tu navegador para instalar la App.');
    onInstall();
  };

  return (
    <div className="fixed inset-0 bg-white text-gray-950 overflow-hidden font-sans" style={{ '--pollazo-primary': primaryColor } as CSSProperties}>
      <style>
        {`
          @keyframes pollazoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .pollazo-logo-float { animation: pollazoFloat 6s ease-in-out infinite; }
          * { font-style: normal !important; text-decoration: none !important; }
        `}
      </style>

      {/* HERO / SPLASH SCREEN - Única sección visible */}
      <section className="relative h-full flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-orange-500 via-orange-400 to-orange-300">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-100/30 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md mx-auto space-y-10" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}>
          <div className="relative flex justify-center">
            <img src={logoUrl} className="relative w-52 h-52 object-contain drop-shadow-2xl pollazo-logo-float" alt="Logo" />
          </div>

          <div className="space-y-4">
            <p className="text-white/80 font-black uppercase tracking-[0.35em] text-[10px]">GALÁPAGOS • ECUADOR</p>
            <h1 className="font-black text-5xl text-white leading-none tracking-tighter">Pollazo El Mirador</h1>
            <p className="text-white/90 text-sm font-semibold max-w-xs mx-auto">Tu market con pollo fresco enfundado y productos esenciales.</p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4">
            <button 
              onClick={handleInstallClick} 
              className="w-full py-4 bg-white text-orange-600 rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {!deferredPrompt && !/iPhone|iPad|iPod/.test(window.navigator.userAgent) ? (
                <><Loader2 size={20} className="animate-spin" /> Preparando...</>
              ) : (
                <><Download size={20} /> Instalar App</>
              )}
            </button>
            
            <button 
              onClick={onContinueWeb} 
              className="text-xs font-bold text-white/75 mx-auto flex items-center gap-2 justify-center active:opacity-50 transition-transform hover:scale-105"
            >
              <Globe size={14} /> Continuar en la web
            </button>
            
            {installMessage && <p className="text-white/75 text-[10px] font-bold uppercase mt-2">{installMessage}</p>}
          </div>
        </div>
      </section>

      {/* MODAL PARA USUARIOS DE IOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z- bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[32px] p-7 shadow-2xl relative">
            <button 
              onClick={() => setShowIOSModal(false)} 
              className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center transition-transform active:scale-90"
            >
              <X size={18} />
            </button>
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-950 leading-tight">Instalar en iPhone</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-orange-50 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                    <Share className="text-orange-500" size={20} />
                  </div>
                  <p className="font-black text-[13px] text-gray-950">1. Pulsa el botón 'Compartir' en Safari.</p>
                </div>
                <div className="flex items-center gap-4 bg-orange-50 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                    <PlusSquare className="text-orange-500" size={20} />
                  </div>
                  <p className="font-black text-[13px] text-gray-950">2. Selecciona 'Agregar a inicio'.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)} 
                className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black transition-transform active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
