import { useEffect } from 'react';

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

const INSTALL_TEXTS = [
  'instalar app',
  'install app',
  'instalar aplicação',
  'installer l’app',
  'app installieren',
  'installa app',
  '安装应用',
  'アプリをインストール',
  'app installeren',
  'установить приложение',
];

const isLandingInstallButton = (button: HTMLButtonElement) => {
  const text = String(button.textContent || '').trim().toLowerCase();
  return INSTALL_TEXTS.some(label => text.includes(label)) || button.dataset.pollazoInstall === '1';
};

const markInstallButtons = () => {
  document.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
    if (!isLandingInstallButton(button)) return;

    button.dataset.pollazoInstall = '1';

    // Evita que el interceptor antiguo de index.html reconozca el texto y se coma el clic.
    const text = String(button.textContent || '').trim();
    if (/instalar app/i.test(text)) {
      const textNodes = Array.from(button.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
      const target = textNodes.find(node => String(node.textContent || '').toLowerCase().includes('instalar app'));
      if (target) target.textContent = String(target.textContent || '').replace(/instalar app/i, 'Instalar Pollazo');
    }

    const ready = Boolean(window.__pollazoInstallState?.prompt);
    button.disabled = !ready;
    button.style.opacity = ready ? '' : '0.72';
    button.style.cursor = ready ? '' : 'wait';
    button.title = ready ? 'Instalar La Casa del Pollazo' : 'Preparando instalación de Chrome';
  });
};

export default function InstallNativeFix() {
  useEffect(() => {
    const state = window.__pollazoInstallState || { prompt: null, installed: false };
    window.__pollazoInstallState = state;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      state.prompt = event as InstallPromptEvent;
      queueMicrotask(markInstallButtons);
    };

    const handleInstalled = () => {
      state.installed = true;
      state.prompt = null;
      try {
        localStorage.setItem('pollazo_landing_dismissed', '1');
      } catch {
        // Almacenamiento opcional.
      }
      queueMicrotask(markInstallButtons);
    };

    const handleClick = async (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(element instanceof HTMLButtonElement) || element.dataset.pollazoInstall !== '1') return;

      event.preventDefault();
      event.stopPropagation();

      const prompt = state.prompt;
      if (!prompt || state.installed) {
        markInstallButtons();
        return;
      }

      state.prompt = null;
      element.disabled = true;

      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'dismissed') {
          element.disabled = false;
          element.style.opacity = '';
          element.style.cursor = '';
          element.title = 'Recarga la página para volver a intentarlo';
        }
      } catch (error) {
        console.error('No se pudo abrir la instalación nativa:', error);
        element.disabled = false;
        element.style.opacity = '';
        element.style.cursor = '';
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    document.addEventListener('click', handleClick, true);

    const observer = new MutationObserver(markInstallButtons);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    markInstallButtons();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      document.removeEventListener('click', handleClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
