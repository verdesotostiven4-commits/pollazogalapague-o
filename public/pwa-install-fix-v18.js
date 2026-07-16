(() => {
  'use strict';

  const PROMPT_KEY = '__pollazoInstallPromptV18';
  const INSTALL_TIMEOUT_MS = 6000;
  let installInProgress = false;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const getPrompt = () => window[PROMPT_KEY] || null;
  const setPrompt = prompt => {
    window[PROMPT_KEY] = prompt || null;
    window.dispatchEvent(
      new CustomEvent('pollazo:install-prompt-state', {
        detail: { ready: Boolean(prompt) },
      })
    );
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await registration.update().catch(() => undefined);
    } catch (error) {
      console.warn('[Pollazo PWA] No se pudo registrar el service worker.', error);
    }
  };

  const INSTALL_LABELS = [
    'instalar app',
    'install app',
    'instalar aplicativo',
    'installer l’app',
    "installer l'app",
    'app installieren',
    'installa app',
    '安装应用',
    'アプリをインストール',
    'app installeren',
    'установить приложение',
  ];

  const isInstallButton = button => {
    const text = String(button?.textContent || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    return INSTALL_LABELS.some(label => text.includes(label));
  };

  const setButtonHtml = (button, html) => {
    if (!button || !button.isConnected) return;
    button.innerHTML = html;
  };

  const restoreButton = (button, originalHtml) => {
    if (!button || !button.isConnected) return;
    button.disabled = false;
    button.style.removeProperty('opacity');
    button.style.removeProperty('cursor');
    setButtonHtml(button, originalHtml);
  };

  const showManualHelp = button => {
    if (!button || !button.isConnected) return;
    button.disabled = false;
    button.style.removeProperty('opacity');
    button.style.removeProperty('cursor');
    setButtonHtml(button, '⋮ Chrome → Instalar app');
    button.setAttribute(
      'aria-label',
      'Abre el menú de Chrome y elige Instalar app o Agregar a pantalla principal'
    );
  };

  const waitForPrompt = timeoutMs => {
    const existing = getPrompt();
    if (existing) return Promise.resolve(existing);

    return new Promise(resolve => {
      let finished = false;

      const finish = value => {
        if (finished) return;
        finished = true;
        window.removeEventListener('pollazo:install-prompt-state', onState);
        window.clearTimeout(timer);
        resolve(value || null);
      };

      const onState = event => {
        if (event?.detail?.ready) finish(getPrompt());
      };

      const timer = window.setTimeout(() => finish(null), timeoutMs);
      window.addEventListener('pollazo:install-prompt-state', onState);
    });
  };

  const requestInstall = async button => {
    if (installInProgress || isStandalone()) return;

    installInProgress = true;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.style.setProperty('opacity', '0.82');
    button.style.setProperty('cursor', 'wait');
    setButtonHtml(button, '⏳ Preparando instalación…');

    try {
      await registerServiceWorker();
      const promptEvent = await waitForPrompt(INSTALL_TIMEOUT_MS);

      if (!promptEvent || typeof promptEvent.prompt !== 'function') {
        showManualHelp(button);
        return;
      }

      setButtonHtml(button, '⏳ Abriendo instalación…');
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPrompt(null);

      if (choice?.outcome === 'accepted') {
        setButtonHtml(button, '✅ Instalación aceptada');
        localStorage.setItem('pollazo_landing_dismissed', '1');
      } else {
        restoreButton(button, originalHtml);
      }
    } catch (error) {
      console.warn('[Pollazo PWA] No se pudo abrir la instalación.', error);
      restoreButton(button, originalHtml);
    } finally {
      installInProgress = false;
    }
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    setPrompt(event);
  });

  window.addEventListener('appinstalled', () => {
    setPrompt(null);
    localStorage.setItem('pollazo_landing_dismissed', '1');
  });

  window.addEventListener(
    'click',
    event => {
      const target = event.target;
      const button = target?.closest?.('button');

      if (!button || !isInstallButton(button) || isStandalone()) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void requestInstall(button);
    },
    true
  );

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => void registerServiceWorker(), {
      once: true,
    });
  } else {
    void registerServiceWorker();
  }
})();
