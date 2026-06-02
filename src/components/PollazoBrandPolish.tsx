import { useEffect } from 'react';

const TRANSPARENT_LOGO =
  'https://blogger.googleusercontent.com/img/a/AVvXsEj_z_wFD2fFBMGygHoeaB-BRAJFDaT7VY0VtWUcD2kOgCaXyLb7BCpVGNZC6any7SIqhUX4TL_MW7FGhHvX49fMsU8BULMMQcsO5QT2Ey7J1TDzGJ3gyzdA5cU7qNkB8322cPMt_IbW0hV6Dafp3DGfyGu3kmBnaCEd3QfvComUHLlqvWwXgqXnJBY077o';

const OLD_LOGO_MARKERS = [
  '/logo-final.png',
  'AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0',
];

const shouldReplaceLogo = (image: HTMLImageElement) => {
  const alt = String(image.alt || '').toLowerCase();
  const src = String(image.getAttribute('src') || image.src || '');

  return (
    alt.includes('logo') ||
    OLD_LOGO_MARKERS.some(marker => src.includes(marker))
  );
};

const polishLogos = () => {
  const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];

  images.forEach(image => {
    if (!shouldReplaceLogo(image)) return;

    image.src = TRANSPARENT_LOGO;
    image.classList.add('pollazo-polished-logo-img');

    const parent = image.parentElement;
    if (parent) {
      parent.classList.add('pollazo-polished-logo-wrap');
    }
  });
};

export default function PollazoBrandPolish() {
  useEffect(() => {
    polishLogos();

    const interval = window.setInterval(polishLogos, 900);
    const observer = new MutationObserver(polishLogos);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'class'],
    });

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <style>{`
      .pollazo-polished-logo-img {
        background: transparent !important;
        border-radius: 0 !important;
        object-fit: contain !important;
        filter: drop-shadow(0 18px 24px rgba(124, 45, 18, 0.28));
      }

      .pollazo-polished-logo-wrap {
        background: transparent !important;
        border-color: transparent !important;
        box-shadow: none !important;
        outline: 0 !important;
      }

      #root > div.fixed.inset-0.bg-white {
        overflow-y: auto !important;
        overscroll-behavior: contain;
      }

      #root > div.fixed.inset-0.bg-white > section.relative {
        min-height: 100dvh !important;
        height: auto !important;
        overflow-y: auto !important;
        justify-content: flex-start !important;
        padding-top: max(20px, calc(env(safe-area-inset-top) + 18px)) !important;
        padding-bottom: max(28px, calc(env(safe-area-inset-bottom) + 26px)) !important;
      }

      #root > div.fixed.inset-0.bg-white > section.relative > div.relative.z-10 {
        min-height: calc(100dvh - 56px);
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        gap: clamp(14px, 2.2vh, 28px) !important;
      }

      #root > div.fixed.inset-0.bg-white > section.relative > div.relative.z-10 > * {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
      }

      #root > div.fixed.inset-0.bg-white div[class*="max-w-xs"][class*="space-y-4"] {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }

      #root > div.fixed.inset-0.bg-white div[class*="bg-white/90"] {
        margin-top: 2px !important;
        padding: 16px !important;
        border-radius: 28px !important;
        box-shadow: 0 16px 30px rgba(124, 45, 18, 0.14) !important;
      }

      #root > div.fixed.inset-0.bg-white div[class*="bg-white/12"] {
        margin-top: 4px !important;
        border-radius: 28px !important;
      }

      #root > div.fixed.inset-0.bg-white p[class*="mt-2"] {
        margin-top: 4px !important;
      }

      #root > div.fixed.inset-0.bg-white .pollazo-polished-logo-img {
        width: min(13rem, 34vh) !important;
        height: min(13rem, 34vh) !important;
        max-width: 100% !important;
      }

      @media (max-height: 760px) {
        #root > div.fixed.inset-0.bg-white .pollazo-polished-logo-img {
          width: min(10.75rem, 29vh) !important;
          height: min(10.75rem, 29vh) !important;
        }

        #root > div.fixed.inset-0.bg-white h1 {
          font-size: clamp(2.35rem, 9vw, 3rem) !important;
        }

        #root > div.fixed.inset-0.bg-white > section.relative > div.relative.z-10 {
          gap: 12px !important;
        }
      }

      @media (max-height: 670px) {
        #root > div.fixed.inset-0.bg-white .pollazo-polished-logo-img {
          width: 8.6rem !important;
          height: 8.6rem !important;
        }

        #root > div.fixed.inset-0.bg-white div[class*="space-y-4"] {
          gap: 9px !important;
        }
      }
    `}</style>
  );
}
