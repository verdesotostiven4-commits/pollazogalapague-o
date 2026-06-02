import { useState, useEffect, type CSSProperties } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Loader2,
  MapPin,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import LegalModal from './LegalModal';
import type { LanguageCode } from '../types';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallStatus = 'idle' | 'installing' | 'installed';
type LangText = Partial<Record<LanguageCode, string>> & { es: string; en?: string };
type TextKey = keyof typeof TEXTS;

const LOGO_OFFICIAL =
  'https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0';

const TEXTS = {
  installedMessage: {
    es: 'App instalada. Revisa tu pantalla de inicio y ábrela desde el ícono.',
    en: 'App installed. Check your home screen and open it from the icon.',
    pt: 'App instalado. Confira sua tela inicial e abra pelo ícone.',
    fr: 'Application installée. Vérifiez votre écran d’accueil et ouvrez-la depuis l’icône.',
    de: 'App installiert. Prüfe deinen Startbildschirm und öffne sie über das Symbol.',
    it: 'App installata. Controlla la schermata iniziale e aprila dall’icona.',
    zh: '应用已安装。请查看主屏幕并从图标打开。',
    ja: 'アプリがインストールされました。ホーム画面のアイコンから開いてください。',
    nl: 'App geïnstalleerd. Controleer je startscherm en open via het icoon.',
    ru: 'Приложение установлено. Проверьте главный экран и откройте его через значок.',
  },
  alreadyInstalled: {
    es: 'La app ya debería estar instalada. Revisa tu pantalla de inicio.',
    en: 'The app should already be installed. Check your home screen.',
    pt: 'O app já deve estar instalado. Confira sua tela inicial.',
    fr: 'L’application devrait déjà être installée. Vérifiez votre écran d’accueil.',
    de: 'Die App sollte bereits installiert sein. Prüfe deinen Startbildschirm.',
    it: 'L’app dovrebbe essere già installata. Controlla la schermata iniziale.',
    zh: '应用应该已经安装。请查看主屏幕。',
    ja: 'アプリはすでにインストールされているはずです。ホーム画面を確認してください。',
    nl: 'De app zou al geïnstalleerd moeten zijn. Controleer je startscherm.',
    ru: 'Приложение уже должно быть установлено. Проверьте главный экран.',
  },
  preparing: {
    es: 'Preparando instalación...',
    en: 'Preparing installation...',
    pt: 'Preparando instalação...',
    fr: 'Préparation de l’installation...',
    de: 'Installation wird vorbereitet...',
    it: 'Preparazione installazione...',
    zh: '正在准备安装...',
    ja: 'インストールを準備中...',
    nl: 'Installatie voorbereiden...',
    ru: 'Подготовка установки...',
  },
  cancelled: {
    es: 'Instalación cancelada. Puedes intentarlo otra vez.',
    en: 'Installation cancelled. You can try again.',
    pt: 'Instalação cancelada. Você pode tentar novamente.',
    fr: 'Installation annulée. Vous pouvez réessayer.',
    de: 'Installation abgebrochen. Du kannst es erneut versuchen.',
    it: 'Installazione annullata. Puoi riprovare.',
    zh: '安装已取消。你可以再试一次。',
    ja: 'インストールがキャンセルされました。もう一度お試しください。',
    nl: 'Installatie geannuleerd. Je kunt het opnieuw proberen.',
    ru: 'Установка отменена. Можно попробовать снова.',
  },
  accepted: {
    es: 'Instalación aceptada. Revisa tu pantalla de inicio en unos segundos.',
    en: 'Installation accepted. Check your home screen in a few seconds.',
    pt: 'Instalação aceita. Confira sua tela inicial em alguns segundos.',
    fr: 'Installation acceptée. Vérifiez votre écran d’accueil dans quelques secondes.',
    de: 'Installation akzeptiert. Prüfe deinen Startbildschirm in ein paar Sekunden.',
    it: 'Installazione accettata. Controlla la schermata iniziale tra pochi secondi.',
    zh: '安装已接受。几秒后请查看主屏幕。',
    ja: 'インストールが承認されました。数秒後にホーム画面を確認してください。',
    nl: 'Installatie geaccepteerd. Controleer je startscherm over enkele seconden.',
    ru: 'Установка принята. Через несколько секунд проверьте главный экран.',
  },
  installError: {
    es: 'No se pudo abrir la instalación. Intenta otra vez o usa el menú de Chrome.',
    en: 'Could not open installation. Try again or use the Chrome menu.',
    pt: 'Não foi possível abrir a instalação. Tente novamente ou use o menu do Chrome.',
    fr: 'Impossible d’ouvrir l’installation. Réessayez ou utilisez le menu Chrome.',
    de: 'Installation konnte nicht geöffnet werden. Versuche es erneut oder nutze das Chrome-Menü.',
    it: 'Impossibile aprire l’installazione. Riprova o usa il menu di Chrome.',
    zh: '无法打开安装。请重试或使用 Chrome 菜单。',
    ja: 'インストールを開けませんでした。再試行するか Chrome メニューを使用してください。',
    nl: 'Installatie kon niet worden geopend. Probeer opnieuw of gebruik het Chrome-menu.',
    ru: 'Не удалось открыть установку. Попробуйте снова или используйте меню Chrome.',
  },
  tryAgain: {
    es: 'Si no apareció la ventana de instalación, intenta tocar nuevamente.',
    en: 'If the install window did not appear, tap again.',
    pt: 'Se a janela de instalação não apareceu, toque novamente.',
    fr: 'Si la fenêtre d’installation n’apparaît pas, touchez à nouveau.',
    de: 'Wenn das Installationsfenster nicht erschien, tippe erneut.',
    it: 'Se la finestra di installazione non appare, tocca di nuovo.',
    zh: '如果安装窗口没有出现，请再次点击。',
    ja: 'インストール画面が表示されない場合は、もう一度タップしてください。',
    nl: 'Als het installatievenster niet verscheen, tik dan opnieuw.',
    ru: 'Если окно установки не появилось, нажмите еще раз.',
  },
  chromeHelp: {
    es: 'Usa el menú de Chrome y elige “Instalar app” o “Agregar a pantalla principal”.',
    en: 'Use the Chrome menu and choose “Install app” or “Add to home screen”.',
    pt: 'Use o menu do Chrome e escolha “Instalar app” ou “Adicionar à tela inicial”.',
    fr: 'Utilisez le menu Chrome et choisissez “Installer l’application” ou “Ajouter à l’écran d’accueil”.',
    de: 'Nutze das Chrome-Menü und wähle “App installieren” oder “Zum Startbildschirm hinzufügen”.',
    it: 'Usa il menu di Chrome e scegli “Installa app” o “Aggiungi alla schermata iniziale”.',
    zh: '使用 Chrome 菜单并选择“安装应用”或“添加到主屏幕”。',
    ja: 'Chrome メニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。',
    nl: 'Gebruik het Chrome-menu en kies “App installeren” of “Toevoegen aan startscherm”.',
    ru: 'Используйте меню Chrome и выберите «Установить приложение» или «Добавить на главный экран».',
  },
  installing: { es: 'Instalando...', en: 'Installing...', pt: 'Instalando...', fr: 'Installation...', de: 'Installieren...', it: 'Installazione...', zh: '正在安装...', ja: 'インストール中...', nl: 'Installeren...', ru: 'Установка...' },
  installed: { es: 'App instalada', en: 'App installed', pt: 'App instalado', fr: 'Application installée', de: 'App installiert', it: 'App installata', zh: '应用已安装', ja: 'アプリインストール済み', nl: 'App geïnstalleerd', ru: 'Приложение установлено' },
  installApp: { es: 'Instalar App', en: 'Install App', pt: 'Instalar app', fr: 'Installer l’app', de: 'App installieren', it: 'Installa app', zh: '安装应用', ja: 'アプリをインストール', nl: 'App installeren', ru: 'Установить приложение' },
  heroText: {
    es: 'Tu market con pollo fresco enfundado y productos esenciales.',
    en: 'Your market for fresh packaged chicken and essentials.',
    pt: 'Seu market com frango fresco embalado e produtos essenciais.',
    fr: 'Votre market avec poulet frais emballé et produits essentiels.',
    de: 'Dein Markt für frisch verpacktes Hähnchen und wichtige Produkte.',
    it: 'Il tuo market con pollo fresco confezionato e prodotti essenziali.',
    zh: '你的新鲜包装鸡肉和日常必需品市场。',
    ja: '新鮮なパックチキンと生活必需品のマーケット。',
    nl: 'Jouw market voor vers verpakte kip en essentials.',
    ru: 'Ваш маркет со свежей упакованной курицей и товарами первой необходимости.',
  },
  openFromIcon: {
    es: 'Revisa tu pantalla de inicio. Si ya ves el ícono, abre la app desde ahí.',
    en: 'Check your home screen. If you see the icon, open the app from there.',
    pt: 'Confira sua tela inicial. Se já vê o ícone, abra o app por ali.',
    fr: 'Vérifiez votre écran d’accueil. Si l’icône apparaît, ouvrez l’app depuis là.',
    de: 'Prüfe deinen Startbildschirm. Wenn du das Symbol siehst, öffne die App dort.',
    it: 'Controlla la schermata iniziale. Se vedi l’icona, apri l’app da lì.',
    zh: '查看主屏幕。如果看到图标，请从那里打开应用。',
    ja: 'ホーム画面を確認し、アイコンがあればそこから開いてください。',
    nl: 'Controleer je startscherm. Zie je het icoon, open de app daar.',
    ru: 'Проверьте главный экран. Если видите значок, откройте приложение оттуда.',
  },
  legalInstall: {
    es: 'Al instalar y usar la app, aceptas nuestras reglas de pedidos, pagos, entregas, puntos y privacidad.',
    en: 'By installing and using the app, you accept our rules for orders, payments, deliveries, points and privacy.',
    pt: 'Ao instalar e usar o app, você aceita nossas regras de pedidos, pagamentos, entregas, pontos e privacidade.',
    fr: 'En installant et en utilisant l’app, vous acceptez nos règles de commandes, paiements, livraisons, points et confidentialité.',
    de: 'Mit Installation und Nutzung akzeptierst du unsere Regeln zu Bestellungen, Zahlungen, Lieferungen, Punkten und Datenschutz.',
    it: 'Installando e usando l’app, accetti le regole su ordini, pagamenti, consegne, punti e privacy.',
    zh: '安装并使用应用即表示你接受订单、付款、配送、积分和隐私规则。',
    ja: 'アプリをインストールして使用すると、注文、支払い、配送、ポイント、プライバシーの規則に同意したものとします。',
    nl: 'Door de app te installeren en te gebruiken accepteer je onze regels voor bestellingen, betalingen, bezorging, punten en privacy.',
    ru: 'Устанавливая и используя приложение, вы принимаете правила заказов, оплат, доставки, баллов и конфиденциальности.',
  },
  seeTermsPrivacy: { es: 'Ver términos y privacidad', en: 'View terms and privacy', pt: 'Ver termos e privacidade', fr: 'Voir conditions et confidentialité', de: 'Bedingungen und Datenschutz ansehen', it: 'Vedi termini e privacy', zh: '查看条款和隐私', ja: '利用規約とプライバシーを見る', nl: 'Bekijk voorwaarden en privacy', ru: 'Смотреть условия и конфиденциальность' },
  continueWeb: { es: 'Entrar sin instalar', en: 'Enter without installing', pt: 'Entrar sem instalar', fr: 'Entrer sans installer', de: 'Ohne Installation öffnen', it: 'Entra senza installare', zh: '不安装直接进入', ja: 'インストールせずに入る', nl: 'Openen zonder installeren', ru: 'Войти без установки' },
  closeInstall: { es: 'Cerrar instalación iPhone', en: 'Close iPhone install', pt: 'Fechar instalação iPhone', fr: 'Fermer installation iPhone', de: 'iPhone-Installation schließen', it: 'Chiudi installazione iPhone', zh: '关闭 iPhone 安装', ja: 'iPhone インストールを閉じる', nl: 'iPhone-installatie sluiten', ru: 'Закрыть установку iPhone' },
  iphoneTitle: { es: 'Instalar en iPhone', en: 'Install on iPhone', pt: 'Instalar no iPhone', fr: 'Installer sur iPhone', de: 'Auf iPhone installieren', it: 'Installa su iPhone', zh: '在 iPhone 上安装', ja: 'iPhone にインストール', nl: 'Installeren op iPhone', ru: 'Установить на iPhone' },
  safariSteps: { es: 'Sigue estos pasos en Safari', en: 'Follow these steps in Safari', pt: 'Siga estes passos no Safari', fr: 'Suivez ces étapes dans Safari', de: 'Folge diesen Schritten in Safari', it: 'Segui questi passaggi in Safari', zh: '在 Safari 中按这些步骤操作', ja: 'Safari で次の手順を実行してください', nl: 'Volg deze stappen in Safari', ru: 'Следуйте этим шагам в Safari' },
  step1: { es: 'Paso 1', en: 'Step 1', pt: 'Passo 1', fr: 'Étape 1', de: 'Schritt 1', it: 'Passo 1', zh: '第 1 步', ja: 'ステップ 1', nl: 'Stap 1', ru: 'Шаг 1' },
  step2: { es: 'Paso 2', en: 'Step 2', pt: 'Passo 2', fr: 'Étape 2', de: 'Schritt 2', it: 'Passo 2', zh: '第 2 步', ja: 'ステップ 2', nl: 'Stap 2', ru: 'Шаг 2' },
  stepShare: {
    es: 'Pulsa el botón de Compartir en Safari abajo.',
    en: 'Tap the Share button at the bottom of Safari.',
    pt: 'Toque no botão Compartilhar na parte inferior do Safari.',
    fr: 'Touchez le bouton Partager en bas de Safari.',
    de: 'Tippe unten in Safari auf Teilen.',
    it: 'Tocca il pulsante Condividi in basso in Safari.',
    zh: '点击 Safari 底部的分享按钮。',
    ja: 'Safari 下部の共有ボタンをタップします。',
    nl: 'Tik onderaan in Safari op de deelknop.',
    ru: 'Нажмите кнопку «Поделиться» внизу Safari.',
  },
  stepAdd: {
    es: 'Desliza y selecciona Agregar a inicio.',
    en: 'Swipe and select Add to Home Screen.',
    pt: 'Deslize e selecione Adicionar à tela inicial.',
    fr: 'Faites défiler et sélectionnez Ajouter à l’écran d’accueil.',
    de: 'Wische und wähle Zum Home-Bildschirm hinzufügen.',
    it: 'Scorri e seleziona Aggiungi alla schermata Home.',
    zh: '滑动并选择添加到主屏幕。',
    ja: 'スクロールして「ホーム画面に追加」を選択します。',
    nl: 'Veeg en selecteer Zet op beginscherm.',
    ru: 'Прокрутите и выберите «На экран Домой».',
  },
  afterInstall: {
    es: 'Después de instalar, abre la app desde el ícono. Si es la primera vez, te aparecerán los términos para aceptar.',
    en: 'After installing, open the app from the icon. If it is your first time, the terms will appear for acceptance.',
    pt: 'Depois de instalar, abra o app pelo ícone. Se for a primeira vez, os termos aparecerão para aceitar.',
    fr: 'Après l’installation, ouvrez l’app depuis l’icône. Si c’est votre première fois, les conditions s’afficheront.',
    de: 'Öffne die App nach der Installation über das Symbol. Beim ersten Mal erscheinen die Bedingungen zum Akzeptieren.',
    it: 'Dopo l’installazione, apri l’app dall’icona. Se è la prima volta, appariranno i termini da accettare.',
    zh: '安装后，从图标打开应用。如果是第一次使用，会显示需要接受的条款。',
    ja: 'インストール後、アイコンからアプリを開いてください。初回は同意する規約が表示されます。',
    nl: 'Open na installatie de app via het icoon. De eerste keer verschijnen de voorwaarden om te accepteren.',
    ru: 'После установки откройте приложение через значок. При первом запуске появятся условия для принятия.',
  },
  seeTerms: { es: 'Ver términos', en: 'View terms', pt: 'Ver termos', fr: 'Voir conditions', de: 'Bedingungen ansehen', it: 'Vedi termini', zh: '查看条款', ja: '規約を見る', nl: 'Voorwaarden bekijken', ru: 'Смотреть условия' },
  understoodReady: { es: '¡Entendido, listo!', en: 'Got it, ready!', pt: 'Entendi, pronto!', fr: 'Compris, prêt !', de: 'Verstanden, bereit!', it: 'Capito, pronto!', zh: '明白，完成！', ja: '了解、準備完了！', nl: 'Begrepen, klaar!', ru: 'Понятно, готово!' },
} as const;

const tx = (language: LanguageCode, key: TextKey) => {
  const entry = TEXTS[key] as LangText;
  return entry[language] || entry.en || entry.es;
};

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  const admin = useAdmin() as any;
  const { language } = useLanguage();
  const settings = admin?.settings;
  const extraSettings = admin?.extraSettings;

  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');

  const logoUrl = extraSettings?.logo_url || LOGO_OFFICIAL;
  const primaryColor = settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 100);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);

      if (installStatus !== 'installed') {
        setInstallStatus('idle');
        setInstallMessage('');
      }
    };

    const handleAppInstalled = () => {
      setInstallStatus('installed');
      setInstallMessage(tx(language, 'installedMessage'));
      localStorage.setItem('pollazo_landing_dismissed', '1');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [installStatus, language]);

  const isIOS = () => {
    return (
      /iPhone|iPad|iPod/.test(window.navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  };

  const markInstalledSoon = () => {
    window.setTimeout(() => {
      setInstallStatus('installed');
      setInstallMessage(tx(language, 'installedMessage'));
      localStorage.setItem('pollazo_landing_dismissed', '1');
    }, 1200);
  };

  const handleInstallClick = async () => {
    if (installStatus === 'installed') {
      setInstallMessage(tx(language, 'alreadyInstalled'));
      return;
    }

    if (isIOS()) {
      setShowIOSModal(true);
      return;
    }

    setInstallStatus('installing');
    setInstallMessage(tx(language, 'preparing'));

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === 'dismissed') {
          setInstallStatus('idle');
          setInstallMessage(tx(language, 'cancelled'));
        } else {
          setInstallMessage(tx(language, 'accepted'));
          markInstalledSoon();
        }

        setDeferredPrompt(null);
      } catch {
        setInstallStatus('idle');
        setInstallMessage(tx(language, 'installError'));
      }

      return;
    }

    onInstall();

    window.setTimeout(() => {
      setInstallStatus('idle');

      if (canInstall) {
        setInstallMessage(tx(language, 'tryAgain'));
      } else {
        setInstallMessage(tx(language, 'chromeHelp'));
      }
    }, 900);
  };

  const installButtonContent = () => {
    if (installStatus === 'installing') {
      return (
        <>
          <Loader2 size={20} className="animate-spin" /> {tx(language, 'installing')}
        </>
      );
    }

    if (installStatus === 'installed') {
      return <>✅ {tx(language, 'installed')}</>;
    }

    return (
      <>
        <Download size={20} /> {tx(language, 'installApp')}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-white text-gray-950 overflow-hidden font-sans"
      style={{ '--pollazo-primary': primaryColor } as CSSProperties}
    >
      <style>
        {`
          @keyframes pollazoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          .pollazo-logo-float {
            animation: pollazoFloat 6s ease-in-out infinite;
          }

          * {
            font-style: normal !important;
            text-decoration: none !important;
          }
        `}
      </style>

      <section className="relative h-full flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-orange-500 via-orange-400 to-orange-300">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-100/30 blur-3xl" />
        </div>

        <div
          className="relative z-10 max-w-md mx-auto space-y-8"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}
        >
          <div className="relative flex justify-center">
            <img
              src={logoUrl}
              className="relative w-52 h-52 object-contain drop-shadow-2xl pollazo-logo-float"
              alt="Logo La Casa del Pollazo"
            />
          </div>

          <div className="space-y-4">
            <p className="text-white/80 font-black uppercase tracking-[0.35em] text-[10px]">
              GALÁPAGOS • ECUADOR
            </p>

            <h1 className="font-black text-5xl text-white leading-none tracking-tighter not-italic">
              La Casa del Pollazo
            </h1>

            <div className="flex items-center justify-center gap-1.5 bg-black/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 w-fit mx-auto">
              <MapPin className="text-yellow-300" size={14} />
              <span className="text-white font-bold text-[11px] uppercase tracking-widest">
                El Mirador
              </span>
            </div>

            <p className="text-white/90 text-sm font-semibold max-w-xs mx-auto">
              {tx(language, 'heroText')}
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installStatus === 'installing'}
              className={`w-full py-4 bg-white text-orange-600 rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${
                installStatus === 'installing' ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              {installButtonContent()}
            </button>

            {onContinueWeb && (
              <button
                type="button"
                onClick={onContinueWeb}
                className="w-full py-3.5 bg-black/10 text-white rounded-3xl font-black border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                {tx(language, 'continueWeb')}
                <ArrowRight size={15} />
              </button>
            )}

            {installStatus === 'installed' && (
              <div className="bg-white/90 border border-white rounded-3xl p-4 shadow-lg">
                <p className="text-orange-700 text-[11px] font-black uppercase leading-relaxed">
                  {tx(language, 'openFromIcon')}
                </p>
              </div>
            )}

            <div className="bg-white/12 border border-white/15 rounded-3xl p-4 backdrop-blur-md">
              <p className="text-white/80 text-[10px] font-bold leading-relaxed">
                {tx(language, 'legalInstall')}
              </p>

              <button
                type="button"
                onClick={() => setShowLegalModal(true)}
                className="mt-3 mx-auto flex items-center justify-center gap-2 text-white font-black text-[10px] uppercase tracking-widest bg-white/15 px-4 py-2.5 rounded-2xl active:scale-95 transition-all"
              >
                <Scale size={14} />
                {tx(language, 'seeTermsPrivacy')}
              </button>
            </div>

            {installMessage && (
              <p className="text-white/80 text-[10px] font-black uppercase mt-2 leading-relaxed px-2">
                {installMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-300"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center transition-transform active:scale-90"
              aria-label={tx(language, 'closeInstall')}
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-orange-50 rounded-[30px] flex items-center justify-center mx-auto mb-4 border-2 border-orange-100 shadow-inner">
                <img
                  src={LOGO_OFFICIAL}
                  className="w-16 h-16 object-contain"
                  alt="Logo La Casa del Pollazo"
                />
              </div>

              <h2 className="text-2xl font-black text-gray-950 leading-tight uppercase tracking-tighter">
                {tx(language, 'iphoneTitle')}
              </h2>

              <p className="text-gray-500 font-bold text-xs mt-1 uppercase tracking-widest">
                {tx(language, 'safariSteps')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-5 bg-orange-50 border border-orange-100 rounded-3xl p-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <Share className="text-orange-500" size={28} />
                </div>

                <div className="text-left">
                  <p className="font-black text-[15px] text-gray-900 uppercase leading-none">
                    {tx(language, 'step1')}
                  </p>

                  <p className="text-[13px] text-gray-600 mt-1 font-medium">
                    {tx(language, 'stepShare')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 bg-orange-50 border border-orange-100 rounded-3xl p-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <PlusSquare className="text-orange-500" size={28} />
                </div>

                <div className="text-left">
                  <p className="font-black text-[15px] text-gray-900 uppercase leading-none">
                    {tx(language, 'step2')}
                  </p>

                  <p className="text-[13px] text-gray-600 mt-1 font-medium">
                    {tx(language, 'stepAdd')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-orange-50 border border-orange-100 rounded-3xl p-4 text-center">
              <p className="text-[10px] font-bold text-orange-700 leading-relaxed">
                {tx(language, 'afterInstall')}
              </p>

              <button
                type="button"
                onClick={() => setShowLegalModal(true)}
                className="mt-3 inline-flex items-center justify-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-widest bg-white px-4 py-2.5 rounded-2xl border border-orange-100 active:scale-95 transition-all"
              >
                <Scale size={14} />
                {tx(language, 'seeTerms')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-5 rounded-3xl bg-orange-500 text-white font-black text-base shadow-xl shadow-orange-200 transition-all active:scale-95 uppercase tracking-widest"
            >
              {tx(language, 'understoodReady')}
            </button>
          </div>
        </div>
      )}

      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />
    </div>
  );
}
