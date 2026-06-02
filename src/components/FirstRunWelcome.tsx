import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Globe2, Languages, Sparkles } from 'lucide-react';
import type { LanguageCode } from '../types';

const WELCOME_DONE_KEY = 'pollazo_welcome_completed';
const LANGUAGE_STORAGE_KEY = 'pollazo_language';

const LOGO_OFFICIAL =
  'https://blogger.googleusercontent.com/img/a/AVvXsEj_z_wFD2fFBMGygHoeaB-BRAJFDaT7VY0VtWUcD2kOgCaXyLb7BCpVGNZC6any7SIqhUX4TL_MW7FGhHvX49fMsU8BULMMQcsO5QT2Ey7J1TDzGJ3gyzdA5cU7qNkB8322cPMt_IbW0hV6Dafp3DGfyGu3kmBnaCEd3QfvComUHLlqvWwXgqXnJBY077o';

type LanguageOption = {
  code: LanguageCode;
  flag: string;
  nativeName: string;
  helper: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'es', flag: '🇪🇨', nativeName: 'Español', helper: 'Recomendado para Ecuador' },
  { code: 'en', flag: '🇺🇸', nativeName: 'English', helper: 'For tourists and visitors' },
  { code: 'pt', flag: '🇧🇷', nativeName: 'Português', helper: 'Brasil / Portugal' },
  { code: 'fr', flag: '🇫🇷', nativeName: 'Français', helper: 'France / Canada' },
  { code: 'de', flag: '🇩🇪', nativeName: 'Deutsch', helper: 'Deutschland' },
  { code: 'it', flag: '🇮🇹', nativeName: 'Italiano', helper: 'Italia' },
  { code: 'zh', flag: '🇨🇳', nativeName: '中文', helper: 'Chinese' },
  { code: 'ja', flag: '🇯🇵', nativeName: '日本語', helper: 'Japanese' },
  { code: 'nl', flag: '🇳🇱', nativeName: 'Nederlands', helper: 'Nederland' },
  { code: 'ru', flag: '🇷🇺', nativeName: 'Русский', helper: 'Russian' },
];

const COPY: Record<LanguageCode, {
  kicker: string;
  title: string;
  subtitle: string;
  choose: string;
  ready: string;
  note: string;
  selected: string;
  more: string;
  less: string;
}> = {
  es: {
    kicker: 'Bienvenido al sabor de Galápagos',
    title: 'La Casa del Pollazo',
    subtitle: 'Compra fácil, rápido y con atención directa desde tu celular.',
    choose: 'Elige tu idioma',
    ready: 'Entrar a la app',
    note: 'Podrás cambiarlo después desde Info.',
    selected: 'Seleccionado',
    more: 'Más idiomas',
    less: 'Mostrar menos',
  },
  en: {
    kicker: 'Welcome to Galápagos flavor',
    title: 'La Casa del Pollazo',
    subtitle: 'Shop easily, fast, and with direct service from your phone.',
    choose: 'Choose your language',
    ready: 'Enter the app',
    note: 'You can change it later in Info.',
    selected: 'Selected',
    more: 'More languages',
    less: 'Show less',
  },
  pt: {
    kicker: 'Bem-vindo ao sabor de Galápagos',
    title: 'La Casa del Pollazo',
    subtitle: 'Compre fácil, rápido e com atendimento direto pelo celular.',
    choose: 'Escolha seu idioma',
    ready: 'Entrar no app',
    note: 'Você pode alterar depois em Info.',
    selected: 'Selecionado',
    more: 'Mais idiomas',
    less: 'Mostrar menos',
  },
  fr: {
    kicker: 'Bienvenue au goût des Galápagos',
    title: 'La Casa del Pollazo',
    subtitle: 'Achetez facilement, rapidement et avec une assistance directe.',
    choose: 'Choisissez votre langue',
    ready: 'Entrer dans l’app',
    note: 'Vous pourrez la changer plus tard dans Info.',
    selected: 'Sélectionné',
    more: 'Plus de langues',
    less: 'Afficher moins',
  },
  de: {
    kicker: 'Willkommen beim Geschmack der Galápagos',
    title: 'La Casa del Pollazo',
    subtitle: 'Einfach, schnell und direkt über dein Handy einkaufen.',
    choose: 'Wähle deine Sprache',
    ready: 'App öffnen',
    note: 'Du kannst sie später unter Info ändern.',
    selected: 'Ausgewählt',
    more: 'Mehr Sprachen',
    less: 'Weniger anzeigen',
  },
  it: {
    kicker: 'Benvenuto nel sapore delle Galápagos',
    title: 'La Casa del Pollazo',
    subtitle: 'Compra facilmente, velocemente e con assistenza diretta.',
    choose: 'Scegli la tua lingua',
    ready: 'Entra nell’app',
    note: 'Puoi cambiarla dopo da Info.',
    selected: 'Selezionato',
    more: 'Più lingue',
    less: 'Mostra meno',
  },
  zh: {
    kicker: '欢迎来到加拉帕戈斯风味',
    title: 'La Casa del Pollazo',
    subtitle: '用手机轻松、快速购买，并获得直接服务。',
    choose: '选择语言',
    ready: '进入应用',
    note: '之后可以在 Info 中更改。',
    selected: '已选择',
    more: '更多语言',
    less: '显示较少',
  },
  ja: {
    kicker: 'ガラパゴスの味へようこそ',
    title: 'La Casa del Pollazo',
    subtitle: 'スマホから簡単・迅速に注文できます。',
    choose: '言語を選択',
    ready: 'アプリに入る',
    note: 'あとで Info から変更できます。',
    selected: '選択済み',
    more: 'その他の言語',
    less: '少なく表示',
  },
  nl: {
    kicker: 'Welkom bij de smaak van Galápagos',
    title: 'La Casa del Pollazo',
    subtitle: 'Bestel makkelijk, snel en direct vanaf je telefoon.',
    choose: 'Kies je taal',
    ready: 'App openen',
    note: 'Je kunt dit later wijzigen via Info.',
    selected: 'Geselecteerd',
    more: 'Meer talen',
    less: 'Minder tonen',
  },
  ru: {
    kicker: 'Добро пожаловать во вкус Галапагосов',
    title: 'La Casa del Pollazo',
    subtitle: 'Покупайте легко и быстро прямо с телефона.',
    choose: 'Выберите язык',
    ready: 'Открыть приложение',
    note: 'Позже можно изменить в Info.',
    selected: 'Выбрано',
    more: 'Больше языков',
    less: 'Показать меньше',
  },
};

const isLanguageCode = (value: string | null): value is LanguageCode => {
  return LANGUAGE_OPTIONS.some(option => option.code === value);
};

const detectInitialLanguage = (): LanguageCode => {
  if (typeof window === 'undefined') return 'es';

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguageCode(stored)) return stored;

  const browserLanguage = window.navigator.languages?.[0] || window.navigator.language || 'es';
  const shortCode = browserLanguage.toLowerCase().slice(0, 2);

  return isLanguageCode(shortCode) ? shortCode : 'es';
};

const shouldSkipWelcome = () => {
  if (typeof window === 'undefined') return true;

  const path = window.location.pathname;
  if (path === '/admin' || path === '/repartidor') return true;

  const params = new URLSearchParams(window.location.search);
  const opensImportantDeepLink =
    params.get('tracking') === '1' ||
    params.get('plus') === '1' ||
    params.has('membershipReminder') ||
    params.has('membershipId');

  if (opensImportantDeepLink) return true;

  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;

  return !isPWA || window.localStorage.getItem(WELCOME_DONE_KEY) === '1';
};

const playWelcomeChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    gain.connect(context.destination);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + 0.54 + index * 0.04);
    });
  } catch {
    // Sonido opcional.
  }
};

export default function FirstRunWelcome({ children }: { children: React.ReactNode }) {
  const [showWelcome, setShowWelcome] = useState(() => !shouldSkipWelcome());
  const [language, setLanguage] = useState<LanguageCode>(() => detectInitialLanguage());
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [isLanguageScrolling, setIsLanguageScrolling] = useState(false);
  const languageScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const text = COPY[language] || COPY.es;

  const visibleLanguages = useMemo(() => {
    return showAllLanguages ? LANGUAGE_OPTIONS : LANGUAGE_OPTIONS.slice(0, 2);
  }, [showAllLanguages]);

  useEffect(() => {
    if (!showWelcome) return;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language, showWelcome]);

  useEffect(() => {
    if (!showAllLanguages) {
      setShowScrollArrow(false);
      setIsLanguageScrolling(false);
      return;
    }

    const list = languageScrollRef.current;
    if (!list) return;

    const updateArrow = () => {
      const distanceToBottom = list.scrollHeight - list.clientHeight - list.scrollTop;
      setShowScrollArrow(distanceToBottom > 18);
      setIsLanguageScrolling(true);

      if (scrollIdleTimerRef.current) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }

      scrollIdleTimerRef.current = window.setTimeout(() => {
        setIsLanguageScrolling(false);
      }, 760);
    };

    updateArrow();
    list.addEventListener('scroll', updateArrow, { passive: true });

    const previewTimer = window.setTimeout(() => {
      if (!languageScrollRef.current) return;
      const target = Math.min(46, languageScrollRef.current.scrollHeight - languageScrollRef.current.clientHeight);
      if (target <= 0) return;

      languageScrollRef.current.scrollTo({ top: target, behavior: 'smooth' });

      window.setTimeout(() => {
        languageScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 850);
    }, 300);

    return () => {
      list.removeEventListener('scroll', updateArrow);
      window.clearTimeout(previewTimer);
      if (scrollIdleTimerRef.current) window.clearTimeout(scrollIdleTimerRef.current);
    };
  }, [showAllLanguages]);

  const handleContinue = () => {
    if (isLeaving) return;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    window.localStorage.setItem(WELCOME_DONE_KEY, '1');
    document.documentElement.lang = language;
    playWelcomeChime();
    setIsLeaving(true);

    window.setTimeout(() => {
      setShowWelcome(false);
    }, 980);
  };

  const scrollLanguagesToEnd = () => {
    const list = languageScrollRef.current;
    if (!list) return;

    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  };

  if (!showWelcome) return <>{children}</>;

  return (
    <div className={`fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-br from-orange-500 via-[#f39763] to-yellow-300 text-gray-950 selection:bg-yellow-200 transition-opacity duration-500 ${isLeaving ? 'opacity-0' : 'opacity-100'}`}>
      <style>
        {`
          @keyframes pollazoWelcomeFloat {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-7px) scale(1.012); }
          }

          @keyframes pollazoWelcomeShine {
            0% { transform: translateX(-120%) rotate(18deg); opacity: 0; }
            35% { opacity: 0.42; }
            100% { transform: translateX(180%) rotate(18deg); opacity: 0; }
          }

          @keyframes pollazoArrowBounce {
            0%, 100% { transform: translateY(0); opacity: 0.9; }
            50% { transform: translateY(8px); opacity: 1; }
          }

          @keyframes pollazoCardEnter {
            0% { transform: translateY(20px) scale(0.965); opacity: 0; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }

          @keyframes pollazoExitGlow {
            0% { transform: scale(0.7); opacity: 0; }
            45% { transform: scale(1.25); opacity: 0.9; }
            100% { transform: scale(2.8); opacity: 0; }
          }

          .pollazo-welcome-card {
            animation: pollazoCardEnter 0.56s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }

          .pollazo-welcome-logo {
            animation: pollazoWelcomeFloat 5.5s ease-in-out infinite;
            filter: drop-shadow(0 14px 20px rgba(124, 45, 18, 0.24));
          }

          .pollazo-welcome-shine::after {
            content: '';
            position: absolute;
            inset: -40%;
            width: 42%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
            animation: pollazoWelcomeShine 5.4s ease-in-out infinite;
            pointer-events: none;
          }

          .pollazo-language-scroll {
            scrollbar-width: none;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }

          .pollazo-language-scroll::-webkit-scrollbar {
            width: 7px;
          }

          .pollazo-language-scroll::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 999px;
          }

          .pollazo-language-scroll::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 999px;
          }

          .pollazo-language-scroll.is-scrolling {
            scrollbar-width: thin;
            scrollbar-color: #fb923c #fff7ed;
          }

          .pollazo-language-scroll.is-scrolling::-webkit-scrollbar-thumb {
            background: #fb923c;
          }

          .pollazo-language-scroll.is-scrolling::-webkit-scrollbar-track {
            background: #fff7ed;
          }

          .pollazo-scroll-arrow {
            animation: pollazoArrowBounce 1.05s ease-in-out infinite;
          }

          .pollazo-exit-glow {
            animation: pollazoExitGlow 0.94s ease-out both;
          }

          @media (max-height: 720px) {
            .pollazo-welcome-hero-logo {
              width: 5.65rem !important;
              height: 5.65rem !important;
            }

            .pollazo-welcome-hero-title {
              font-size: 2.02rem !important;
            }

            .pollazo-welcome-hero-copy {
              font-size: 0.78rem !important;
              line-height: 1.32rem !important;
            }
          }
        `}
      </style>

      <div className="relative flex h-[100dvh] items-center justify-center overflow-hidden px-3 py-3 sm:px-4 sm:py-5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute top-1/3 -right-28 h-80 w-80 rounded-full bg-yellow-100/35 blur-3xl" />
          <div className="absolute -bottom-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-900/15 blur-3xl" />
          <div className="absolute inset-x-8 top-10 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <div className="absolute inset-x-12 bottom-10 h-px bg-gradient-to-r from-transparent via-orange-900/20 to-transparent" />
        </div>

        {isLeaving && (
          <div className="pollazo-exit-glow pointer-events-none absolute h-48 w-48 rounded-full bg-white/80 blur-xl" />
        )}

        <section className={`pollazo-welcome-card relative flex max-h-[calc(100dvh-24px)] w-full max-w-md flex-col overflow-hidden rounded-[36px] border border-white/55 bg-white/92 p-4 shadow-2xl shadow-orange-900/25 backdrop-blur-2xl ring-1 ring-orange-100/40 sm:p-5 ${isLeaving ? 'scale-[1.035] blur-[1px] transition-all duration-700' : ''}`}>
          <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.28),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.72),transparent_32%)]" />

          <div className="pollazo-welcome-shine relative shrink-0 overflow-hidden rounded-[30px] bg-gradient-to-br from-orange-50 via-white to-yellow-50 border border-orange-100 px-4 pt-4 pb-4 text-center shadow-inner">
            <div className="absolute -top-16 -right-14 h-32 w-32 rounded-full bg-yellow-200/35 blur-2xl" />
            <div className="absolute -bottom-16 -left-14 h-32 w-32 rounded-full bg-orange-200/40 blur-2xl" />

            <div className="relative mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-[30px] bg-transparent">
              <img
                src={LOGO_OFFICIAL}
                alt="Logo La Casa del Pollazo"
                className="pollazo-welcome-logo pollazo-welcome-hero-logo h-24 w-24 object-contain"
              />
            </div>

            <div className="relative mx-auto mb-2 flex w-fit items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-orange-200">
              <Sparkles size={12} />
              Galápagos · Ecuador
            </div>

            <p className="relative text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
              {text.kicker}
            </p>

            <h1 className="pollazo-welcome-hero-title relative mt-1.5 text-[2.45rem] font-black leading-[0.9] tracking-tighter text-gray-950">
              {text.title}
            </h1>

            <p className="pollazo-welcome-hero-copy relative mx-auto mt-2 max-w-xs text-[13px] font-bold leading-relaxed text-gray-600">
              {text.subtitle}
            </p>
          </div>

          <div className="relative mt-3 flex min-h-0 flex-1 flex-col rounded-[28px] border border-orange-100 bg-white p-3 shadow-lg shadow-orange-100/70">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <Languages size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500">
                    Idioma · Language
                  </p>
                  <h2 className="truncate text-lg font-black leading-none text-gray-950">
                    {text.choose}
                  </h2>
                </div>
              </div>
              <Globe2 className="shrink-0 text-orange-400" size={21} />
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={languageScrollRef}
                className={`pollazo-language-scroll grid max-h-full gap-2 overflow-y-auto pr-1 pb-2 ${isLanguageScrolling ? 'is-scrolling' : ''}`}
                style={{ maxHeight: showAllLanguages ? 'min(272px, 34dvh)' : 'auto' }}
              >
                {visibleLanguages.map(option => {
                  const active = option.code === language;

                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => setLanguage(option.code)}
                      className={`flex w-full items-center gap-3 rounded-[21px] border p-3 text-left transition-all active:scale-[0.98] ${
                        active
                          ? 'border-orange-300 bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-100'
                          : 'border-orange-100 bg-orange-50/60 text-gray-900 hover:bg-orange-50'
                      }`}
                      aria-label={`Seleccionar ${option.nativeName}`}
                    >
                      <span className="text-3xl leading-none">{option.flag}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black uppercase tracking-tight">
                          {option.nativeName}
                        </span>
                        <span className={`block truncate text-[10px] font-bold uppercase tracking-widest ${active ? 'text-white/80' : 'text-gray-400'}`}>
                          {active ? text.selected : option.helper}
                        </span>
                      </span>
                      {active && <Check size={20} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>

              {showAllLanguages && showScrollArrow && (
                <button
                  type="button"
                  onClick={scrollLanguagesToEnd}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 text-orange-500 drop-shadow-[0_2px_6px_rgba(124,45,18,0.35)] active:scale-90 transition-transform"
                  aria-label="Ir al final de idiomas"
                >
                  <ChevronDown className="pollazo-scroll-arrow" size={28} strokeWidth={4} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAllLanguages(current => !current)}
              className="mt-2 shrink-0 w-full rounded-[21px] border border-dashed border-orange-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-orange-600 active:scale-[0.98] transition-transform"
            >
              {showAllLanguages ? text.less : text.more}
            </button>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="relative mt-3 flex shrink-0 w-full items-center justify-center gap-2 overflow-hidden rounded-[26px] bg-gray-950 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-900/20 active:scale-[0.98] transition-transform disabled:opacity-70"
            disabled={isLeaving}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="relative">{text.ready}</span>
            <ChevronRight className="relative" size={18} strokeWidth={3} />
          </button>

          <p className="relative mt-2 shrink-0 text-center text-[10px] font-black uppercase tracking-widest text-white/90 drop-shadow-sm">
            {text.note}
          </p>
        </section>
      </div>
    </div>
  );
}
