import { useEffect } from 'react';

function getLegalScroll(): HTMLElement | null {
  return document.querySelector('.pollazo-legal-scroll') as HTMLElement | null;
}

export default function LegalModalNoAutoScroll() {
  useEffect(() => {
    let lockUntil = 0;
    let unlockedByUser = false;
    let lastScroll: HTMLElement | null = null;
    let frame = 0;

    const startLock = (scroll: HTMLElement) => {
      if (lastScroll === scroll) return;

      lastScroll = scroll;
      unlockedByUser = false;
      lockUntil = Date.now() + 2600;
      scroll.scrollTop = 0;
    };

    const markUserScroll = () => {
      unlockedByUser = true;
      lockUntil = 0;
    };

    const loop = () => {
      const scroll = getLegalScroll();

      if (scroll) {
        startLock(scroll);

        if (!unlockedByUser && Date.now() < lockUntil && scroll.scrollTop > 0) {
          scroll.scrollTop = 0;
        }
      } else {
        lastScroll = null;
        unlockedByUser = false;
        lockUntil = 0;
      }

      frame = window.requestAnimationFrame(loop);
    };

    const bindUserEvents = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.addEventListener('wheel', markUserScroll, { passive: true });
      scroll.addEventListener('touchstart', markUserScroll, { passive: true });
      scroll.addEventListener('pointerdown', markUserScroll, { passive: true });
    };

    const unbindUserEvents = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.removeEventListener('wheel', markUserScroll);
      scroll.removeEventListener('touchstart', markUserScroll);
      scroll.removeEventListener('pointerdown', markUserScroll);
    };

    const bindTimer = window.setInterval(bindUserEvents, 300);
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.clearInterval(bindTimer);
      window.cancelAnimationFrame(frame);
      unbindUserEvents();
    };
  }, []);

  return null;
}
