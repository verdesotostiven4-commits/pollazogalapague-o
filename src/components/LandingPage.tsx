import { useState, useEffect, type CSSProperties } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Loader2,
  MapPin,
  Scale,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import LegalModal from './LegalModal';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const LOGO_OFFICIAL =
  'https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0';

type InstallStatus = 'idle' | 'installing' | 'installed';

export default function LandingPage({ onInstall, canInstall }: Props) {
  const admin = useAdmin() as any;
  const settings = admin?.settings;
  const extraSettings = admin?.extraSettings;

  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');

  const logoUrl = extraSettings?.logo_url || LOGO_OFFICIAL;
  const primaryColor = settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 100);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);

      if (installStatus !== 'installed') {
        setInstallStatus('idle');
        setInstallMessage('');
      }
    };

    const handleAppInstalled = () => {
      setInstallStatus('installed');
      setInstallMessage('App instalada. Revisa tu pantalla de inicio y ábrela desde el ícono.');
      localStorage.setItem('pollazo_landing_dismissed', '1');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [installStatus]);

  const isIOS = () => {
    return (
      /iPhone|iPad|iPod/.test(window.navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  };

  const markInstalledSoon = () => {
    window.setTimeout(() => {
      setInstallStatus('installed');
      setInstallMessage('App instalada. Revisa tu pantalla de inicio y ábrela desde el ícono.');
      localStorage.setItem('pollazo_landing_dismissed', '1');
    }, 1200);
  };

  const handleInstallClick = async () => {
    if (installStatus === 'installed') {
      setInstallMessage('La app ya debería estar instalada. Revisa tu pantalla de inicio.');
      return;
    }

    if (isIOS()) {
      setShowIOSModal(true);
      return;
    }

    setInstallStatus('installing');
    setInstallMessage('Preparando instalación...');

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === 'dismissed') {
          setInstallStatus('idle');
          setInstallMessage('Instalación cancelada. Puedes intentarlo otra vez.');
        } else {
          setInstallMessage('Instalación aceptada. Revisa tu pantalla de inicio en unos segundos.');
          markInstalledSoon();
        }

        setDeferredPrompt(null);
      } catch {
        setInstallStatus('idle');
        setInstallMessage('No se pudo abrir la instalación. Intenta otra vez o usa el menú de Chrome.');
      }

      return;
    }

    onInstall();

    window.setTimeout(() => {
      setInstallStatus('idle');

      if (canInstall) {
        setInstallMessage('Si no apareció la ventana de instalación, intenta tocar nuevamente.');
      } else {
        setInstallMessage('Usa el menú de Chrome y elige “Instalar app” o “Agregar a pantalla principal”.');
      }
    }, 900);
  };

  const installButtonContent = () => {
    if (installStatus === 'installing') {
      return (
        <>
          <Loader2 size={20} className="animate-spin" /> Instalando...
        </>
      );
    }

    if (installStatus === 'installed') {
      return <>✅ App instalada</>;
    }

    return (
      <>
        <Download size={20} /> Instalar App
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-white text-gray-950 overflow-hidden font-sans"
      style={{ '--pollazo-primary': primaryColor } as CSSProperties}
    >
      <style>
        {`
          @keyframes pollazoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          .pollazo-logo-float {
            animation: pollazoFloat 6s ease-in-out infinite;
          }

          * {
            font-style: normal !important;
            text-decoration: none !important;
          }
        `}
      </style>

      <section className="relative h-full flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-orange-500 via-orange-400 to-orange-300">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-100/30 blur-3xl" />
        </div>

        <div
          className="relative z-10 max-w-md mx-auto space-y-8"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
        >
          <div className="relative flex justify-center">
            <img
              src={logoUrl}
              className="relative w-52 h-52 object-contain drop-shadow-2xl pollazo-logo-float"
              alt="Logo La Casa del Pollazo"
            />
          </div>

          <div className="space-y-4">
            <p className="text-white/80 font-black uppercase tracking-[0.35em] text-[10px]">
              GALÁPAGOS • ECUADOR
            </p>

            <h1 className="font-black text-5xl text-white leading-none tracking-tighter not-italic">
              La Casa del Pollazo
            </h1>

            <div className="flex items-center justify-center gap-1.5 bg-black/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 w-fit mx-auto">
              <MapPin className="text-yellow-300" size={14} />
              <span className="text-white font-bold text-[11px] uppercase tracking-widest">
                El Mirador
              </span>
            </div>

            <p className="text-white/90 text-sm font-semibold max-w-xs mx-auto">
              Tu market con pollo fresco enfundado y productos esenciales.
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installStatus === 'installing'}
              className={`w-full py-4 bg-white text-orange-600 rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${
                installStatus === 'installing' ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              {installButtonContent()}
            </button>

            {installStatus === 'installed' && (
              <div className="bg-white/90 border border-white rounded-3xl p-4 shadow-lg">
                <p className="text-orange-700 text-[11px] font-black uppercase leading-relaxed">
                  Revisa tu pantalla de inicio. Si ya ves el ícono, abre la app desde ahí.
                </p>
              </div>
            )}

            <div className="bg-white/12 border border-white/15 rounded-3xl p-4 backdrop-blur-md">
              <p className="text-white/80 text-[10px] font-bold leading-relaxed">
                Al instalar y usar la app, aceptas nuestras reglas de pedidos,
                pagos, entregas, puntos y privacidad.
              </p>

              <button
                type="button"
                onClick={() => setShowLegalModal(true)}
                className="mt-3 mx-auto flex items-center justify-center gap-2 text-white font-black text-[10px] uppercase tracking-widest bg-white/15 px-4 py-2.5 rounded-2xl active:scale-95 transition-all"
              >
                <Scale size={14} />
                Ver términos y privacidad
              </button>
            </div>

            {installMessage && (
              <p className="text-white/80 text-[10px] font-black uppercase mt-2 leading-relaxed px-2">
                {installMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-300"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center transition-transform active:scale-90"
              aria-label="Cerrar instalación iPhone"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-orange-50 rounded-[30px] flex items-center justify-center mx-auto mb-4 border-2 border-orange-100 shadow-inner">
                <img
                  src={LOGO_OFFICIAL}
                  className="w-16 h-16 object-contain"
                  alt="Logo La Casa del Pollazo"
                />
              </div>

              <h2 className="text-2xl font-black text-gray-950 leading-tight uppercase tracking-tighter">
                Instalar en iPhone
              </h2>

              <p className="text-gray-500 font-bold text-xs mt-1 uppercase tracking-widest">
                Sigue estos pasos en Safari
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-5 bg-orange-50 border border-orange-100 rounded-3xl p-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <Share className="text-orange-500" size={28} />
                </div>

                <div className="text-left">
                  <p className="font-black text-[15px] text-gray-900 uppercase leading-none">
                    Paso 1
                  </p>

                  <p className="text-[13px] text-gray-600 mt-1 font-medium">
                    Pulsa el botón de <b>Compartir</b> en Safari abajo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 bg-orange-50 border border-orange-100 rounded-3xl p-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <PlusSquare className="text-orange-500" size={28} />
                </div>

                <div className="text-left">
                  <p className="font-black text-[15px] text-gray-900 uppercase leading-none">
                    Paso 2
                  </p>

                  <p className="text-[13px] text-gray-600 mt-1 font-medium">
                    Desliza y selecciona <b>Agregar a inicio</b>.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-orange-50 border border-orange-100 rounded-3xl p-4 text-center">
              <p className="text-[10px] font-bold text-orange-700 leading-relaxed">
                Después de instalar, abre la app desde el ícono. Si es la primera vez, te aparecerán los términos para aceptar.
              </p>

              <button
                type="button"
                onClick={() => setShowLegalModal(true)}
                className="mt-3 inline-flex items-center justify-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-widest bg-white px-4 py-2.5 rounded-2xl border border-orange-100 active:scale-95 transition-all"
              >
                <Scale size={14} />
                Ver términos
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-5 rounded-3xl bg-orange-500 text-white font-black text-base shadow-xl shadow-orange-200 transition-all active:scale-95 uppercase tracking-widest"
            >
              ¡Entendido, listo!
            </button>
          </div>
        </div>
      )}

      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />
    </div>
  );
}
