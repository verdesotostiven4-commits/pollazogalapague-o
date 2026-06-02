import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Globe2, Languages, Sparkles } from 'lucide-react';
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
  scrollHint: string;
}> = {
  es: {
    kicker: 'Bienvenido al sabor de Galápagos',
    title: 'La Casa del Pollazo',
    subtitle: 'Compra fácil, rápido y con atención directa desde tu celular.',
    choose: 'Elige tu idioma',
    ready: 'Entrar a la app',
    note: 'Puedes cambiarlo después desde Info.',
    selected: 'Seleccionado',
    more: 'Más idiomas',
    less: 'Mostrar menos',
    scrollHint: 'Desliza solo esta lista para ver más idiomas',
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
    scrollHint: 'Scroll only this list to see more languages',
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
    scrollHint: 'Role apenas esta lista para ver mais idiomas',
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
    scrollHint: 'Faites défiler seulement cette liste',
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
    scrollHint: 'Scrolle nur diese Liste für mehr Sprachen',
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
    scrollHint: 'Scorri solo questa lista per altre lingue',
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
    scrollHint: '仅滚动此列表查看更多语言',
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
    scrollHint: 'このリストだけをスクロールしてください',
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
    scrollHint: 'Scroll alleen deze lijst voor meer talen',
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
    scrollHint: 'Прокрутите только этот список',
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

export default function FirstRunWelcome({ children }: { children: React.ReactNode }) {
  const [showWelcome, setShowWelcome] = useState(() => !shouldSkipWelcome());
  const [language, setLanguage] = useState<LanguageCode>(() => detectInitialLanguage());
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const text = COPY[language] || COPY.es;

  const visibleLanguages = useMemo(() => {
    return showAllLanguages ? LANGUAGE_OPTIONS : LANGUAGE_OPTIONS.slice(0, 2);
  }, [showAllLanguages]);

  useEffect(() => {
    if (!showWelcome) return;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language, showWelcome]);

  const handleContinue = () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    window.localStorage.setItem(WELCOME_DONE_KEY, '1');
    document.documentElement.lang = language;
    setShowWelcome(false);
  };

  if (!showWelcome) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-br from-orange-500 via-[#f39763] to-yellow-300 text-gray-950 selection:bg-yellow-200">
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
            scrollbar-width: thin;
            scrollbar-color: #fb923c #fff7ed;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }

          .pollazo-language-scroll::-webkit-scrollbar {
            width: 7px;
          }

          .pollazo-language-scroll::-webkit-scrollbar-thumb {
            background: #fb923c;
            border-radius: 999px;
          }

          .pollazo-language-scroll::-webkit-scrollbar-track {
            background: #fff7ed;
            border-radius: 999px;
          }

          @media (max-height: 720px) {
            .pollazo-welcome-hero-logo {
              width: 5.7rem !important;
              height: 5.7rem !important;
            }

            .pollazo-welcome-hero-title {
              font-size: 2.05rem !important;
            }

            .pollazo-welcome-hero-copy {
              font-size: 0.78rem !important;
              line-height: 1.35rem !important;
            }
          }
        `}
      </style>

      <div className="relative flex h-[100dvh] items-center justify-center overflow-hidden px-3 py-3 sm:px-4 sm:py-5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute top-1/3 -right-28 h-80 w-80 rounded-full bg-yellow-100/35 blur-3xl" />
          <div className="absolute -bottom-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-900/15 blur-3xl" />
        </div>

        <section className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-md flex-col overflow-hidden rounded-[34px] border border-white/45 bg-white/90 p-4 shadow-2xl shadow-orange-900/20 backdrop-blur-xl sm:p-5">
          <div className="pollazo-welcome-shine relative shrink-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-50 via-white to-yellow-50 border border-orange-100 px-4 pt-4 pb-4 text-center shadow-inner">
            <div className="mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-[30px] bg-transparent">
              <img
                src={LOGO_OFFICIAL}
                alt="Logo La Casa del Pollazo"
                className="pollazo-welcome-logo pollazo-welcome-hero-logo h-24 w-24 object-contain"
              />
            </div>

            <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-orange-200">
              <Sparkles size={12} />
              Galápagos · Ecuador
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
              {text.kicker}
            </p>

            <h1 className="pollazo-welcome-hero-title mt-1.5 text-[2.45rem] font-black leading-[0.9] tracking-tighter text-gray-950">
              {text.title}
            </h1>

            <p className="pollazo-welcome-hero-copy mx-auto mt-2 max-w-xs text-[13px] font-bold leading-relaxed text-gray-600">
              {text.subtitle}
            </p>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-[28px] border border-orange-100 bg-white p-3 shadow-lg shadow-orange-100/70">
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
                className="pollazo-language-scroll grid max-h-full gap-2 overflow-y-auto pr-1"
                style={{ maxHeight: showAllLanguages ? 'min(270px, 34dvh)' : 'auto' }}
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

              {showAllLanguages && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-1 bg-gradient-to-t from-white via-white/92 to-transparent px-2 pb-1 pt-8">
                  <p className="mx-auto w-fit rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-orange-600 shadow-sm">
                    ↓ {text.scrollHint}
                  </p>
                </div>
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
            className="mt-3 flex shrink-0 w-full items-center justify-center gap-2 rounded-[26px] bg-gray-950 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-900/20 active:scale-[0.98] transition-transform"
          >
            {text.ready}
            <ChevronRight size={18} strokeWidth={3} />
          </button>

          <p className="mt-2 shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-white/90 drop-shadow-sm">
            {text.note}
          </p>
        </section>
      </div>
    </div>
  );
}
