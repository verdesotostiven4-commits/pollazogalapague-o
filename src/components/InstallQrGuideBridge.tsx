import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Compass, Download, Home, QrCode, Smartphone, Sparkles, X } from 'lucide-react';

const INSTALL_PATH = '/instalar';
const LANDING_DISMISSED_KEY = 'pollazo_landing_dismissed';
const INSTALL_DISMISSED_KEY = 'pollazo_install_guide_dismissed';
const APP_URL = 'https://pollazogalapague-o-psi.vercel.app';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const isInstallRoute = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return window.location.pathname === INSTALL_PATH || params.get('qr') === '1' || params.get('instalar') === '1';
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as { standalone?: boolean }).standalone === true;
};

const deviceKind = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'other';
};

export default function InstallQrGuideBridge() {
  const [show, setShow] = useState(() => isInstallRoute() && !isStandalone());
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const device = useMemo(deviceKind, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!isInstallRoute()) return undefined;

    const timer = window.setTimeout(() => setShow(!isStandalone()), 80);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  const closeAndEnter = () => {
    localStorage.setItem(LANDING_DISMISSED_KEY, '1');
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    setShow(false);
    window.history.replaceState({}, '', '/');
    window.dispatchEvent(new Event('pollazo:install-guide-closed'));
  };

  const installAndroid = async () => {
    if (!installPrompt) {
      closeAndEnter();
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice?.catch(() => undefined);
    } finally {
      setInstallPrompt(null);
      closeAndEnter();
    }
  };

  const title = device === 'ios' ? 'Instala desde Safari' : device === 'android' ? 'Instala en tu Android' : 'Abre La Casa del Pollazo';
  const subtitle = device === 'ios'
    ? 'En iPhone toca compartir y luego “Agregar a pantalla de inicio”.'
    : device === 'android'
      ? 'Toca instalar o entra directo para pedir desde tu celular.'
      : 'Escanea este QR desde tu celular y pide rápido.';

  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-300 text-slate-950">
      <div className="min-h-[100dvh] px-5 py-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+22px)] flex items-center justify-center">
        <div className="w-full max-w-[430px] rounded-[38px] bg-white/96 p-5 shadow-2xl shadow-orange-950/25 border border-white/60">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-3 py-2 text-orange-600">
              <QrCode size={17} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">QR Pollazo</span>
            </div>
            <button type="button" onClick={closeAndEnter} className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95" aria-label="Cerrar guía">
              <X size={20} />
            </button>
          </div>

          <div className="mt-6 text-center">
            <div className="mx-auto w-24 h-24 rounded-[32px] bg-gradient-to-br from-yellow-300 to-orange-500 p-1 shadow-xl shadow-orange-200">
              <div className="w-full h-full rounded-[28px] bg-white flex items-center justify-center overflow-hidden">
                <img src="/pollazo-splash-icon.svg?v=8" alt="La Casa del Pollazo" className="w-20 h-20 object-contain" />
              </div>
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">La Casa del Pollazo</p>
            <h1 className="mt-2 text-[34px] font-black uppercase italic leading-[0.92] tracking-[-0.05em] text-slate-950">{title}</h1>
            <p className="mt-4 text-sm font-bold leading-relaxed text-slate-500">{subtitle}</p>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-[28px] bg-orange-50 border border-orange-100 p-4 flex gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white text-orange-500 flex items-center justify-center shadow-sm flex-shrink-0"><Smartphone size={21} /></div>
              <div>
                <p className="text-sm font-black text-slate-950 uppercase">1. Escanea o abre el link</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500 leading-relaxed">Usa el QR del local o entra desde WhatsApp, historias o estados.</p>
              </div>
            </div>

            <div className="rounded-[28px] bg-yellow-50 border border-yellow-100 p-4 flex gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white text-yellow-600 flex items-center justify-center shadow-sm flex-shrink-0">{device === 'ios' ? <Compass size={21} /> : <Download size={21} />}</div>
              <div>
                <p className="text-sm font-black text-slate-950 uppercase">2. Guárdala como app</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500 leading-relaxed">{device === 'ios' ? 'En Safari: Compartir → Agregar a pantalla de inicio.' : 'En Android: toca Instalar app si aparece el aviso.'}</p>
              </div>
            </div>

            <div className="rounded-[28px] bg-slate-50 border border-slate-100 p-4 flex gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white text-orange-500 flex items-center justify-center shadow-sm flex-shrink-0"><Home size={21} /></div>
              <div>
                <p className="text-sm font-black text-slate-950 uppercase">3. Pide en segundos</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500 leading-relaxed">Elige productos, marca tu ubicación y confirma el pedido.</p>
              </div>
            </div>
          </div>

          <button type="button" onClick={device === 'android' ? installAndroid : closeAndEnter} className="mt-6 w-full h-16 rounded-[26px] bg-gradient-to-r from-orange-500 to-yellow-400 text-white text-sm font-black uppercase tracking-[0.14em] shadow-xl shadow-orange-200 active:scale-[0.98] flex items-center justify-center gap-2">
            {device === 'android' && installPrompt ? 'Instalar app' : 'Entrar a pedir'}
            <ChevronRight size={18} />
          </button>

          <button type="button" onClick={closeAndEnter} className="mt-3 w-full h-12 rounded-[22px] bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-widest active:scale-[0.98]">
            Continuar sin instalar
          </button>

          <div className="mt-4 rounded-[24px] bg-slate-950 text-white p-4 flex gap-3 items-start">
            <Sparkles className="text-yellow-300 mt-0.5 flex-shrink-0" size={18} />
            <p className="text-[11px] font-bold leading-relaxed text-white/80">Tip: si el cliente no quiere instalar, igual puede pedir desde el navegador. La instalación solo hace que vuelva más fácil la próxima vez.</p>
          </div>

          <p className="mt-4 text-center text-[10px] font-bold text-slate-400 break-all">{APP_URL}{INSTALL_PATH}</p>
        </div>
      </div>
    </div>
  );
}
