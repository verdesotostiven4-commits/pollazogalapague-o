import { useState, useEffect, type CSSProperties } from 'react';
import {
  Download,
  Globe,
  Share,
  PlusSquare,
  X,
  Loader2,
  Smartphone
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

  const logoUrl = LOGO_OFFICIAL;
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
            50% { transform: translateY(-15px); }
          }
          .pollazo-logo-float { animation: pollazoFloat 4s ease-in-out infinite; }
          .ios-modal-enter { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          * { font-style: normal !important; text-decoration: none !important; }
        `}
      </style>

      {/* HERO / SPLASH SCREEN */}
      <section className="relative h-full flex flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-200/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md mx-auto space-y-8" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="relative flex justify-center">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl transform scale-110" />
            <img src={logoUrl} className="relative w-56 h-52 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] pollazo-logo-float" alt="Logo" />
          </div>

          <div className="space-y-3">
            <div className="inline-block px-3 py-1 bg-black/10 rounded-full backdrop-blur-sm border border-white/10">
              <p className="text-white font-black uppercase tracking-[0.3em] text-[9px]">Puerto Ayora • Galápagos</p>
            </div>
            <h1 className="font-black text-5xl text-white leading-none tracking-tighter drop-shadow-lg">
              La Casa del Pollazo
            </h1>
            <p className="text-white/90 text-base font-bold max-w-xs mx-auto drop-shadow-sm">
              Pollo fresco y productos esenciales directos a tu puerta.
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4 pt-4">
            <button 
              onClick={handleInstallClick} 
              className="w-full py-4.5 bg-white text-orange-600 rounded-[24px] font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 text-lg hover:bg-orange-50"
            >
              {!deferredPrompt && !/iPhone|iPad|iPod/.test(window.navigator.userAgent) ? (
                <><Loader2 size={22} className="animate-spin" /> Conectando...</>
              ) : (
                <><Smartphone size={22} /> Instalar App</>
              )}
            </button>
            
            <button 
              onClick={onContinueWeb} 
              className="group text-sm font-bold text-white/80 mx-auto flex items-center gap-2 justify-center active:opacity-50 transition-all"
            >
              <Globe size={16} className="group-hover:rotate-12 transition-transform" /> 
              Continuar en la web
            </button>
            
            {installMessage && <p className="text-white/90 text-[11px] font-black uppercase tracking-wider bg-black/10 py-2 rounded-xl backdrop-blur-sm">{installMessage}</p>}
          </div>
        </div>
      </section>

      {/* MODAL REDISEÑADO PARA IOS (IPHONE) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 sm:p-6" onClick={() => setShowIOSModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          
          <div 
            className="ios-modal-enter w-full max-w-md bg-white rounded-[40px] p-8 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.5)] relative z-[110] border-t border-orange-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
            
            <button 
              onClick={() => setShowIOSModal(false)} 
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center transition-all active:scale-75 hover:bg-gray-100"
            >
              <X size={20} className="text-gray-400" />
            </button>

            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-orange-50 rounded-[28px] flex items-center justify-center mx-auto mb-4 border-2 border-orange-100">
                <img src={logoUrl} className="w-14 h-14 object-contain" alt="Icono" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Instalar en tu iPhone</h2>
              <p className="text-gray-500 font-medium text-sm mt-1">Acceso directo desde tu pantalla</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-5 bg-gray-50 border border-gray-100 rounded-3xl p-5 hover:border-orange-200 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <Share className="text-orange-500" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-black text-[14px] text-gray-900 uppercase tracking-tight leading-none">Paso 1</p>
                  <p className="text-[13px] text-gray-600 mt-1 font-medium italic">Pulsa el botón 'Compartir' de Safari abajo.</p>
                </div>
              </div>

              <div className="flex items-center gap-5 bg-gray-50 border border-gray-100 rounded-3xl p-5 hover:border-orange-200 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <PlusSquare className="text-orange-500" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-black text-[14px] text-gray-900 uppercase tracking-tight leading-none">Paso 2</p>
                  <p className="text-[13px] text-gray-600 mt-1 font-medium italic">Busca y selecciona 'Agregar a inicio'.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowIOSModal(false)} 
              className="w-full mt-8 py-4.5 rounded-[22px] bg-orange-500 text-white font-black text-base shadow-xl shadow-orange-200 transition-all active:scale-95 hover:bg-orange-600"
            >
              ¡Entendido, listo!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
