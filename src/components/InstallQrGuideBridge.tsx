import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Compass, Download, Home, QrCode, Smartphone, Sparkles, X } from 'lucide-react';

const INSTALL_PATH = '/instalar';
const LANDING_DISMISSED_KEY = 'pollazo_landing_dismissed';
const INSTALL_DISMISSED_KEY = 'pollazo_install_guide_dismissed';
const APP_URL = 'https://pollazogalapague-o-phi.vercel.app';

const INSTALL_LABELS = [
  'instalar app',
  'instalar pollazo',
  'install app',
  'install pollazo',
  'instalar aplicação',
  'installer l’app',
  'app installieren',
  'installa app',
  '安装应用',
  'アプリをインストール',
  'app installeren',
  'установить приложение',
];

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
};

declare global {
  interface Window {
    __pollazoInstallState?: {
      prompt: InstallPromptEvent | null;
      installed: boolean;
    };
  }
}

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

const buttonMatchesInstall = (button: HTMLButtonElement) => {
  if (button.dataset.pollazoInstall === '1') return true;
  const text = String(button.textContent || '').trim().toLowerCase();
  return INSTALL_LABELS.some(label => text.includes(label));
};

const renameInstallButton = (button: HTMLButtonElement) => {
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const value = String(node.textContent || '');
    if (/instalar app/i.test(value)) {
      node.textContent = value.replace(/instalar app/i, 'Instalar Pollazo');
      break;
    }
    node = walker.nextNode();
  }
};

export default function InstallQrGuideBridge() {
  const [show, setShow] = useState(() => isInstallRoute() && !isStandalone());
  const [installReady, setInstallReady] = useState(() => Boolean(window.__pollazoInstallState?.prompt));
  const promptRef = useRef<InstallPromptEvent | null>(window.__pollazoInstallState?.prompt || null);
  const installedRef = useRef(Boolean(window.__pollazoInstallState?.installed || isStandalone()));
  const device = useMemo(deviceKind, []);

  const syncInstallButtons = useCallback(() => {
    document.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      if (!buttonMatchesInstall(button)) return;

      renameInstallButton(button);
      button.dataset.pollazoInstall = '1';

      const ready = Boolean(promptRef.current) && !installedRef.current;
      button.disabled = !ready;
      button.style.opacity = ready ? '' : '0.72';
      button.style.cursor = ready ? '' : 'wait';
      button.title = installedRef.current
        ? 'La aplicación ya está instalada'
        : ready
          ? 'Instalar La Casa del Pollazo'
          : 'Chrome está preparando la instalación';
    });
  }, []);

  const runNativeInstall = useCallback(async () => {
    const prompt = promptRef.current || window.__pollazoInstallState?.prompt || null;
    if (!prompt || installedRef.current) {
      syncInstallButtons();
      return;
    }

    promptRef.current = null;
    if (window.__pollazoInstallState) window.__pollazoInstallState.prompt = null;
    setInstallReady(false);
    syncInstallButtons();

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;

      if (choice.outcome === 'dismissed') {
        document.querySelectorAll<HTMLButtonElement>('button[data-pollazo-install="1"]').forEach(button => {
          button.title = 'Recarga la página para volver a intentarlo';
        });
      }
    } catch (error) {
      console.error('No se pudo abrir la instalación nativa:', error);
    }
  }, [syncInstallButtons]);

  useEffect(() => {
    const sharedState = window.__pollazoInstallState || { prompt: null, installed: false };
    window.__pollazoInstallState = sharedState;

    if (sharedState.prompt) {
      promptRef.current = sharedState.prompt;
      setInstallReady(true);
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      const prompt = event as InstallPromptEvent;
      promptRef.current = prompt;
      sharedState.prompt = prompt;
      setInstallReady(true);
      queueMicrotask(syncInstallButtons);
    };

    const handleInstalled = () => {
      installedRef.current = true;
      promptRef.current = null;
      sharedState.installed = true;
      sharedState.prompt = null;
      setInstallReady(false);

      try {
        localStorage.setItem(LANDING_DISMISSED_KEY, '1');
      } catch {
        // Almacenamiento opcional.
      }

      queueMicrotask(syncInstallButtons);
    };

    const handleInstallClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement) || target.dataset.pollazoInstall !== '1') return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void runNativeInstall();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    document.addEventListener('click', handleInstallClick, true);

    const observer = new MutationObserver(syncInstallButtons);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    syncInstallButtons();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      document.removeEventListener('click', handleInstallClick, true);
      observer.disconnect();
    };
  }, [runNativeInstall, syncInstallButtons]);

  useEffect(() => {
    if (!isInstallRoute()) return undefined;
    const timer = window.setTimeout(() => setShow(!isStandalone()), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    syncInstallButtons();
  }, [installReady, syncInstallButtons]);

  if (!show) return null;

  const closeAndEnter = () => {
    localStorage.setItem(LANDING_DISMISSED_KEY, '1');
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    setShow(false);
    window.history.replaceState({}, '', '/');
    window.dispatchEvent(new Event('pollazo:install-guide-closed'));
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
                <img src="/pollazo-icon-192-v27.png" alt="La Casa del Pollazo" className="w-20 h-20 object-contain" />
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
                <p className="mt-1 text-[11px] font-bold text-slate-500 leading-relaxed">{device === 'ios' ? 'En Safari: Compartir → Agregar a pantalla de inicio.' : 'En Android: toca Instalar Pollazo cuando el botón esté activo.'}</p>
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

          <button
            type="button"
            data-pollazo-install="1"
            onClick={() => void runNativeInstall()}
            disabled={device !== 'android' || !installReady}
            className="mt-6 w-full h-16 rounded-[26px] bg-gradient-to-r from-orange-500 to-yellow-400 text-white text-sm font-black uppercase tracking-[0.14em] shadow-xl shadow-orange-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {device === 'android' ? 'Instalar Pollazo' : 'Entrar a pedir'}
            <ChevronRight size={18} />
          </button>

          <button type="button" onClick={closeAndEnter} className="mt-3 w-full h-12 rounded-[22px] bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-widest active:scale-[0.98]">
            Continuar sin instalar
          </button>

          <div className="mt-4 rounded-[24px] bg-slate-950 text-white p-4 flex gap-3 items-start">
            <Sparkles className="text-yellow-300 mt-0.5 flex-shrink-0" size={18} />
            <p className="text-[11px] font-bold leading-relaxed text-white/80">La instalación utiliza únicamente la ventana oficial de Chrome. Si el botón está apagado, espera unos segundos a que Chrome prepare la app.</p>
          </div>

          <p className="mt-4 text-center text-[10px] font-bold text-slate-400 break-all">{APP_URL}{INSTALL_PATH}</p>
        </div>
      </div>
    </div>
  );
}
