import { useEffect, useRef } from 'react';

const LANGUAGE_KEY = 'pollazo_language';

export default function LanguageReloadGuard() {
  const currentLanguageRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    currentLanguageRef.current = window.localStorage.getItem(LANGUAGE_KEY);
    let timer = 0;

    const checkLanguageChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const nextLanguage = window.localStorage.getItem(LANGUAGE_KEY);

        if (
          currentLanguageRef.current &&
          nextLanguage &&
          nextLanguage !== currentLanguageRef.current
        ) {
          window.location.reload();
          return;
        }

        currentLanguageRef.current = nextLanguage;
      }, 220);
    };

    window.addEventListener('click', checkLanguageChange, true);
    window.addEventListener('keydown', checkLanguageChange, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('click', checkLanguageChange, true);
      window.removeEventListener('keydown', checkLanguageChange, true);
    };
  }, []);

  return null;
}
