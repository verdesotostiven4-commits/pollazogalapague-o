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

const LOGO_OFFICIAL = "https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0";

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
    const isIOS = /iPhone|iPad|iPod/.test(window.navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
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

      {/* ✅ DISEÑO ORIGINAL RESTAURADO */}
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

      {/* ✅ MODAL REDISEÑADO PARA IOS (IPHONE) - LIMPIO Y PROFESIONAL */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShowIOSModal(false)}>
          <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowIOSModal(false)} 
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center transition-transform active:scale-90"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8">
               <div className="w-20 h-20 bg-orange-50 rounded-[24px] flex items-center justify-center mx-auto mb-4 border-2 border-orange-100">
                  <img src={logoUrl} className="w-14 h-14 object-contain" alt="Logo" />
               </div>
               <h2 className="text-2xl font-black text-gray-950 leading-tight">Instalar en iPhone</h2>
               <p className="text-gray-500 font-medium text-sm mt-1">Sigue estos pasos en Safari</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-orange-50 border border-orange-100 rounded-2xl p-5">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <Share className="text-orange-500" size={24} />
                </div>
                <p className="font-black text-[14px] text-gray-950">1. Pulsa el botón 'Compartir' en la barra de Safari.</p>
              </div>

              <div className="flex items-center gap-4 bg-orange-50 border border-orange-100 rounded-2xl p-5">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <PlusSquare className="text-orange-500" size={24} />
                </div>
                <p className="font-black text-[14px] text-gray-950">2. Desliza y selecciona 'Agregar al inicio'.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowIOSModal(false)} 
              className="w-full mt-8 py-4.5 rounded-2xl bg-orange-500 text-white font-black text-base shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              ¡Entendido, listo!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
