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

const INSTALL_LABELS = [
  'instalar app',
  'instalar pollazo',
  'install app',
  'install pollazo',
  'instalar aplicación',
  'instalar aplicação',
  'installer l’app',
  'app installieren',
  'installa app',
  '安装应用',
  'アプリをインストール',
  'app installeren',
  'установить приложение',
];

const isInstallButton = (button: HTMLButtonElement) => {
  if (button.dataset.pollazoInstall === '1') return true;
  const text = String(button.textContent || '').trim().toLowerCase();
  return INSTALL_LABELS.some(label => text.includes(label));
};

const renameButton = (button: HTMLButtonElement) => {
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

  button.dataset.pollazoInstall = '1';
};

const findInstallButtons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(isInstallButton);

export default function InstallQrGuideBridge() {
  useEffect(() => {
    const state = window.__pollazoInstallState || {
      prompt: null,
      installed: false,
    };

    window.__pollazoInstallState = state;

    const syncButtons = () => {
      const ready = Boolean(state.prompt) && !state.installed;

      findInstallButtons().forEach(button => {
        renameButton(button);
        button.disabled = !ready;
        button.style.opacity = ready ? '' : '0.68';
        button.style.cursor = ready ? '' : 'wait';
        button.title = state.installed
          ? 'La aplicación ya está instalada'
          : ready
            ? 'Instalar La Casa del Pollazo'
            : 'Chrome está preparando la instalación';
      });
    };

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      state.prompt = event as InstallPromptEvent;
      state.installed = false;
      queueMicrotask(syncButtons);
    };

    const handleInstallReady = () => {
      queueMicrotask(syncButtons);
    };

    const handleInstalled = () => {
      state.installed = true;
      state.prompt = null;

      try {
        localStorage.setItem('pollazo_landing_dismissed', '1');
      } catch {
        // Almacenamiento opcional.
      }

      queueMicrotask(syncButtons);
    };

    const handleClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement) || !isInstallButton(target)) return;

      renameButton(target);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const installPrompt = state.prompt;
      if (!installPrompt || state.installed) {
        syncButtons();
        return;
      }

      try {
        // Debe ejecutarse inmediatamente dentro del gesto del usuario.
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;

        state.prompt = null;

        if (choice.outcome === 'dismissed') {
          target.disabled = false;
          target.style.opacity = '';
          target.style.cursor = '';
          target.title = 'Recarga la página para volver a intentarlo';
          return;
        }

        target.disabled = true;
        target.title = 'Instalación aceptada';
      } catch (error) {
        console.error('No se pudo abrir la instalación nativa:', error);
        target.disabled = false;
        target.style.opacity = '';
        target.style.cursor = '';
        target.title = 'No se pudo abrir la instalación';
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pollazo:install-ready', handleInstallReady as EventListener);
    window.addEventListener('appinstalled', handleInstalled);
    document.addEventListener('click', handleClick, true);

    const observer = new MutationObserver(syncButtons);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    syncButtons();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pollazo:install-ready', handleInstallReady as EventListener);
      window.removeEventListener('appinstalled', handleInstalled);
      document.removeEventListener('click', handleClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
