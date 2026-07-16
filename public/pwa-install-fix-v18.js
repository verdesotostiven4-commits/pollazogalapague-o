(() => {
  'use strict';

  const PROMPT_KEY = '__pollazoNativeInstallPromptV19';
  const SW_RELOAD_KEY = 'pollazo_sw_controlled_reload_v19';
  let installing = false;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const labels = [
    'instalar app',
    'instalar en mi celular',
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

  const readPrompt = () => window[PROMPT_KEY] || null;

  const isInstallButton = button => {
    const text = String(button?.textContent || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    return labels.some(label => text.includes(label));
  };

  const installButtons = () =>
    Array.from(document.querySelectorAll('button')).filter(isInstallButton);

  const syncButtons = () => {
    if (isStandalone()) return;

    const ready = Boolean(readPrompt());

    installButtons().forEach(button => {
      if (installing) return;
      button.disabled = !ready;
      button.style.setProperty('opacity', ready ? '1' : '0.72');
      button.style.setProperty('cursor', ready ? 'pointer' : 'wait');
      button.setAttribute('aria-disabled', ready ? 'false' : 'true');
      button.setAttribute(
        'aria-label',
        ready ? 'Instalar aplicación' : 'Preparando instalación nativa de Chrome'
      );
    });
  };

  const storePrompt = event => {
    window[PROMPT_KEY] = event || null;
    syncButtons();
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      await registration.update().catch(() => undefined);
      await navigator.serviceWorker.ready;

      if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => {
          let finished = false;

          const finish = () => {
            if (finished) return;
            finished = true;
            navigator.serviceWorker.removeEventListener('controllerchange', finish);
            window.clearTimeout(timer);
            resolve(undefined);
          };

          const timer = window.setTimeout(finish, 2500);
          navigator.serviceWorker.addEventListener('controllerchange', finish, {
            once: true,
          });
        });

        if (
          navigator.serviceWorker.controller &&
          sessionStorage.getItem(SW_RELOAD_KEY) !== '1'
        ) {
          sessionStorage.setItem(SW_RELOAD_KEY, '1');
          window.location.reload();
        }
      }
    } catch (error) {
      console.warn('[Pollazo PWA] No se pudo preparar la instalación.', error);
    }
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    storePrompt(event);
  });

  window.addEventListener('appinstalled', () => {
    storePrompt(null);
    localStorage.setItem('pollazo_landing_dismissed', '1');
  });

  window.addEventListener(
    'click',
    event => {
      const button = event.target?.closest?.('button');
      const promptEvent = readPrompt();

      if (
        !button ||
        !isInstallButton(button) ||
        !promptEvent ||
        installing ||
        isStandalone()
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      installing = true;
      button.disabled = true;
      button.style.setProperty('opacity', '0.82');

      storePrompt(null);

      try {
        const promptResult = promptEvent.prompt();

        Promise.resolve(promptResult)
          .then(() => promptEvent.userChoice)
          .then(choice => {
            if (choice?.outcome === 'accepted') {
              localStorage.setItem('pollazo_landing_dismissed', '1');
            }
          })
          .catch(error => {
            console.warn('[Pollazo PWA] Chrome no abrió el cuadro nativo.', error);
          })
          .finally(() => {
            installing = false;
            syncButtons();
          });
      } catch (error) {
        installing = false;
        console.warn('[Pollazo PWA] Chrome no abrió el cuadro nativo.', error);
        syncButtons();
      }
    },
    true
  );

  const observer = new MutationObserver(syncButtons);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  if (document.readyState === 'loading') {
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        syncButtons();
        void registerServiceWorker();
      },
      { once: true }
    );
  } else {
    syncButtons();
    void registerServiceWorker();
  }
})();
