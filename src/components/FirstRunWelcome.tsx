import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Globe2, Languages, Sparkles } from 'lucide-react';
import type { LanguageCode } from '../types';

const WELCOME_DONE_KEY = 'pollazo_welcome_completed';
const LANGUAGE_STORAGE_KEY = 'pollazo_language';

const LOGO_OFFICIAL =
  'https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0';

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
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-gradient-to-br from-orange-500 via-[#f39763] to-yellow-300 text-gray-950 selection:bg-yellow-200">
      <style>
        {`
          @keyframes pollazoWelcomeFloat {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-8px) scale(1.015); }
          }

          @keyframes pollazoWelcomeShine {
            0% { transform: translateX(-120%) rotate(18deg); opacity: 0; }
            35% { opacity: 0.5; }
            100% { transform: translateX(180%) rotate(18deg); opacity: 0; }
          }

          .pollazo-welcome-logo {
            animation: pollazoWelcomeFloat 5.5s ease-in-out infinite;
          }

          .pollazo-welcome-shine::after {
            content: '';
            position: absolute;
            inset: -40%;
            width: 40%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
            animation: pollazoWelcomeShine 4.8s ease-in-out infinite;
          }
        `}
      </style>

      <div className="min-h-[100dvh] relative flex items-center justify-center px-4 py-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute top-1/3 -right-28 h-80 w-80 rounded-full bg-yellow-100/35 blur-3xl" />
          <div className="absolute -bottom-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-900/15 blur-3xl" />
        </div>

        <section className="relative w-full max-w-md rounded-[36px] border border-white/45 bg-white/88 p-5 shadow-2xl shadow-orange-900/20 backdrop-blur-xl">
          <div className="pollazo-welcome-shine relative overflow-hidden rounded-[30px] bg-gradient-to-br from-orange-50 via-white to-yellow-50 border border-orange-100 px-5 pt-6 pb-5 text-center shadow-inner">
            <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-[34px] bg-white shadow-xl shadow-orange-100 ring-1 ring-orange-100">
              <img
                src={LOGO_OFFICIAL}
                alt="Logo La Casa del Pollazo"
                className="pollazo-welcome-logo h-24 w-24 object-contain"
              />
            </div>

            <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-orange-200">
              <Sparkles size={13} />
              Galápagos · Ecuador
            </div>

            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-500">
              {text.kicker}
            </p>

            <h1 className="mt-2 text-4xl font-black leading-none tracking-tighter text-gray-950">
              {text.title}
            </h1>

            <p className="mx-auto mt-3 max-w-xs text-sm font-bold leading-relaxed text-gray-600">
              {text.subtitle}
            </p>
          </div>

          <div className="mt-4 rounded-[30px] border border-orange-100 bg-white p-4 shadow-lg shadow-orange-100/70">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <Languages size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
                    Idioma · Language
                  </p>
                  <h2 className="text-xl font-black leading-none text-gray-950">
                    {text.choose}
                  </h2>
                </div>
              </div>
              <Globe2 className="text-orange-400" size={22} />
            </div>

            <div className="grid gap-2">
              {visibleLanguages.map(option => {
                const active = option.code === language;

                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setLanguage(option.code)}
                    className={`flex w-full items-center gap-3 rounded-[22px] border p-3 text-left transition-all active:scale-[0.98] ${
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
                      <span className={`block text-[10px] font-bold uppercase tracking-widest ${active ? 'text-white/80' : 'text-gray-400'}`}>
                        {active ? text.selected : option.helper}
                      </span>
                    </span>
                    {active && <Check size={20} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            {!showAllLanguages && (
              <button
                type="button"
                onClick={() => setShowAllLanguages(true)}
                className="mt-2 w-full rounded-[22px] border border-dashed border-orange-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-orange-600 active:scale-[0.98] transition-transform"
              >
                {text.more}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[28px] bg-gray-950 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-900/20 active:scale-[0.98] transition-transform"
          >
            {text.ready}
            <ChevronRight size={18} strokeWidth={3} />
          </button>

          <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/90 drop-shadow-sm">
            {text.note}
          </p>
        </section>
      </div>
    </div>
  );
}
