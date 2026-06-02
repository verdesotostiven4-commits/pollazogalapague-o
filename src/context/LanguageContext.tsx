import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LanguageCode, LanguageOption } from '../types';

type TranslationMap = Record<string, string>;

type LanguageContextValue = {
  language: LanguageCode;
  languages: LanguageOption[];
  setLanguage: (language: LanguageCode) => void;
  t: (key: string) => string;
};

const LANGUAGE_STORAGE_KEY = 'pollazo_language';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', shortLabel: 'ES', flag: 'EC' },
  { code: 'en', name: 'English', nativeName: 'English', shortLabel: 'EN', flag: 'US' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', shortLabel: 'PT', flag: 'BR' },
  { code: 'fr', name: 'French', nativeName: 'Français', shortLabel: 'FR', flag: 'FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', shortLabel: 'DE', flag: 'DE' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', shortLabel: 'IT', flag: 'IT' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', shortLabel: 'ZH', flag: 'CN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', shortLabel: 'JA', flag: 'JP' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', shortLabel: 'NL', flag: 'NL' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', shortLabel: 'RU', flag: 'RU' },
];

const isLanguageCode = (value: string | null | undefined): value is LanguageCode => {
  return LANGUAGE_OPTIONS.some(option => option.code === value);
};

const detectBrowserLanguage = (): LanguageCode => {
  if (typeof window === 'undefined') return 'es';

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguageCode(stored)) return stored;

  const browserLanguage = window.navigator.languages?.[0] || window.navigator.language || 'es';
  const shortCode = browserLanguage.toLowerCase().slice(0, 2);

  return isLanguageCode(shortCode) ? shortCode : 'es';
};

const es: TranslationMap = {
  'common.close': 'Cerrar',
  'common.current': 'Actual',
  'common.ready': 'Lista',
  'common.pending': 'Pendiente',
  'common.use': 'Usar',
  'common.edit': 'Editar',
  'common.repair': 'Reparar',
  'common.help': 'Ayuda',
  'common.understood': 'Entendido',
  'nav.home': 'Inicio',
  'nav.catalog': 'Catálogo',
  'nav.orders': 'Pedidos',
  'nav.cart': 'Carrito',
  'nav.info': 'Info',
  'header.catalog': 'Catálogo',
  'header.orders': 'Mis pedidos',
  'header.cart': 'Carrito',
  'header.info': 'Información',
  'header.ranking': 'Ranking VIP',
  'header.home_subtitle': 'El #1 del mercado',
  'header.back_home': 'Inicio',
  'header.open_ranking': 'Abrir ranking',
  'header.open_profile': 'Abrir perfil',
  'header.open_cart': 'Abrir carrito',
  'language.saved': 'Idioma actualizado',
  'language.card_kicker': 'Idioma',
  'language.card_title': 'Elige tu idioma',
  'language.card_text': 'Ideal para clientes locales, turistas y visitantes internacionales en Galápagos.',
  'info.hero.kicker': 'Información oficial',
  'info.location': 'El Mirador · Puerto Ayora',
  'info.account.title': 'Mi cuenta Pollazo',
  'info.account.subtitle': 'Nivel y perfil del cliente',
  'info.account.empty': 'Registra tu nombre, WhatsApp y ubicación para activar tu perfil, guardar direcciones y subir de nivel.',
  'info.account.level_progress': 'Progreso de nivel',
  'info.level.sheet_kicker': 'Niveles Pollazo',
  'info.level.sheet_title': 'Así subes de nivel',
  'info.level.sheet_text': 'Tu nivel sube con tu historial de compras válidas. Sirve para entender tu progreso como cliente y preparar futuros beneficios cuando el negocio los active.',
  'info.delivery.title': 'Mi entrega',
  'info.delivery.add_point': 'Agrega tu punto de entrega',
  'info.delivery.selected': 'Seleccionada',
  'info.delivery.show_less': 'Mostrar menos direcciones',
  'info.delivery.show_more': 'Mostrar más',
  'info.delivery.save_fast': 'Guarda Casa, Trabajo, Airbnb u otro punto para pedir más rápido.',
  'info.delivery.add_new': 'Agregar nueva dirección',
  'info.notifications.not_available': 'No disponible',
  'info.notifications.need_phone': 'Primero registra tu WhatsApp para asociar los avisos a tu pedido.',
  'info.notifications.manual_blocked': 'Los avisos están bloqueados. Debes permitirlos manualmente desde ajustes del celular o navegador.',
  'info.notifications.ready_notice': 'Listo. Te avisaremos sobre pedidos, Plus y cambios importantes.',
  'info.notifications.repaired_notice': 'Avisos reparados. Este celular quedó registrado nuevamente.',
  'info.notifications.active': 'Activos',
  'info.notifications.blocked': 'Bloqueados',
  'info.notifications.recommended': 'Recomendado',
  'info.notifications.register_data': 'Registrar datos',
  'info.notifications.allow_help': 'Ver cómo permitir',
  'info.notifications.repairing': 'Reparando...',
  'info.notifications.activating': 'Activando...',
  'info.notifications.active_button': 'Avisos activos',
  'info.notifications.activate': 'Activar avisos',
  'info.notifications.kicker': 'Avisos importantes',
  'info.notifications.title': 'Notificaciones Pollazo',
  'info.notifications.text': 'Te avisaremos sobre el estado de tu pedido, regalos Plus, cambios importantes y recordatorios útiles. Sin spam.',
  'info.notifications.blocked_message': 'Tu celular o navegador bloqueó los avisos. Por seguridad, el permiso debe cambiarse manualmente desde ajustes.',
  'info.notifications.active_message': 'Avisos activos. Tu celular está listo para recibir notificaciones del Pollazo.',
  'info.notifications.permission_kicker': 'Permisos del celular',
  'info.notifications.permission_title': 'Activa notificaciones',
  'info.notifications.permission_text': 'Cuando una notificación queda bloqueada, la app no puede abrir otra vez el permiso automático. Debes permitirlo desde los ajustes del celular o del navegador.',
  'info.notifications.android_steps_title': 'Android / app instalada',
  'info.notifications.android_steps': '1. Mantén presionado el ícono de La Casa del Pollazo. 2. Toca Información de la app. 3. Entra a Notificaciones. 4. Activa Permitir notificaciones. 5. Vuelve a Info y toca Reparar avisos.',
  'info.notifications.chrome_steps_title': 'Chrome',
  'info.notifications.chrome_steps': '1. Abre Chrome. 2. Entra a Configuración del sitio. 3. Busca pollazogalapague-o-psi.vercel.app. 4. Cambia Notificaciones a Permitir. 5. Vuelve a la app y toca Reparar avisos.',
  'info.install.title': 'Instalar app',
  'info.install.subtitle': 'Acceso rápido desde tu celular.',
  'info.contact.title': 'Contacto directo',
  'info.contact.whatsapp': 'WhatsApp Oficial',
  'info.contact.attention': 'Atención inmediata',
  'info.contact.chat': 'Chatear',
  'info.contact.phone': 'Línea Telefónica',
  'info.contact.call': 'Llamar',
  'info.hours.title': 'Horario de atención',
  'info.hours.value': '7:00 AM – 9:00 PM · Todos los días',
  'info.location.title': 'Ubicación',
  'info.buy.title': 'Comprar ahora',
  'info.buy.subtitle': 'Ver catálogo y armar pedido',
  'info.team.title': 'Nuestro Equipo',
  'info.team.subtitle': 'Personas detrás de la atención y servicio',
  'info.gallery.title': 'Galería',
  'info.legal.title': 'Información legal y ayuda',
  'info.legal.subtitle': 'Términos, privacidad, pagos, entregas y soporte',
  'info.legal.note': 'Los premios, niveles, promociones y beneficios pueden cambiar según lo que active el negocio. La app siempre mostrará lo disponible.',
  'info.footer': 'Hecho para comprar fácil en Puerto Ayora',
  'legal.required.title': 'Antes de continuar',
  'legal.required.subtitle': 'Revisa y acepta para usar la app',
  'legal.required.notice': 'Para comprar, guardar tu ubicación, recibir avisos de pedido y usar beneficios, necesitamos que aceptes estas reglas básicas.',
  'legal.read.title': 'Centro legal y ayuda',
  'legal.read.subtitle': 'Consulta reglas, privacidad y soporte',
  'legal.hero.kicker': 'La Casa del Pollazo',
  'legal.hero.title': 'Compra fácil, con reglas claras',
  'legal.hero.text': 'Aquí explicamos cómo funcionan pedidos, pagos, entregas, datos personales, beneficios, puntos, notificaciones y ayuda.',
  'legal.category.orders': 'Pedidos',
  'legal.category.orders_text': 'Estados, cambios y confirmación.',
  'legal.category.payments': 'Pagos',
  'legal.category.payments_text': 'Efectivo, Deuna, transferencia y tarjeta.',
  'legal.category.data': 'Datos',
  'legal.category.data_text': 'Privacidad, ubicación y seguridad.',
  'legal.info_title': 'Información legal',
  'legal.help_title': 'Ayuda rápida',
  'legal.help.order': 'Problemas con mi pedido',
  'legal.help.order_text': 'Consulta estados, cambios, cancelaciones, productos faltantes o coordinación de entrega.',
  'legal.help.payment': 'Problemas con pago',
  'legal.help.payment_text': 'Ayuda con comprobantes, Deuna, transferencias, pagos rechazados o pagos pendientes.',
  'legal.help.location': 'Ubicación o entrega',
  'legal.help.location_text': 'Corrige referencia, punto de entrega, Airbnb, hotel, casa o negocio cercano.',
  'legal.help.notifications': 'Notificaciones y rastreo',
  'legal.help.notifications_text': 'Revisa avisos del pedido, permisos del celular y seguimiento en vivo.',
  'legal.help.security': 'Seguridad de mi cuenta',
  'legal.help.security_text': 'Reporta actividad sospechosa, número equivocado o problemas de verificación.',
  'legal.help.data': 'Mis datos',
  'legal.help.data_text': 'Solicita actualizar, corregir o eliminar datos asociados a tu WhatsApp.',
  'legal.whatsapp': 'Contactar por WhatsApp',
  'legal.update_note': 'Estos términos pueden actualizarse cuando cambien funciones, métodos de pago, promociones, reparto, membresías o requisitos del negocio.',
  'legal.footer_required': 'Al continuar confirmas que entiendes las reglas de uso, compra, entrega, pagos y privacidad.',
  'legal.footer_read': 'Esta sección es solo para consulta. Ya aceptaste las reglas al ingresar por primera vez.',
  'legal.accept': 'Acepto y continuar',
  'legal.close_reading': 'Cerrar lectura',
};

const en: TranslationMap = {
  ...es,
  'nav.home': 'Home',
  'nav.catalog': 'Catalog',
  'nav.orders': 'Orders',
  'nav.cart': 'Cart',
  'nav.info': 'Info',
  'header.catalog': 'Catalog',
  'header.orders': 'My orders',
  'header.cart': 'Cart',
  'header.info': 'Information',
  'header.back_home': 'Home',
  'language.saved': 'Language updated',
  'language.card_kicker': 'Language',
  'language.card_title': 'Choose your language',
  'language.card_text': 'Perfect for local customers, tourists and international visitors in Galápagos.',
  'info.hero.kicker': 'Official information',
  'info.account.title': 'My Pollazo account',
  'info.delivery.title': 'My delivery',
  'info.notifications.title': 'Pollazo notifications',
  'info.notifications.activate': 'Activate alerts',
  'info.notifications.active_button': 'Alerts active',
  'info.contact.title': 'Direct contact',
  'info.buy.title': 'Order now',
  'info.legal.title': 'Legal information and help',
  'legal.required.title': 'Before continuing',
  'legal.read.title': 'Legal center and help',
  'legal.accept': 'Accept and continue',
  'legal.close_reading': 'Close reading',
};

const pt: TranslationMap = { ...en, 'nav.home': 'Início', 'nav.catalog': 'Catálogo', 'nav.orders': 'Pedidos', 'nav.cart': 'Carrinho', 'header.orders': 'Meus pedidos', 'language.card_title': 'Escolha seu idioma' };
const fr: TranslationMap = { ...en, 'nav.home': 'Accueil', 'nav.catalog': 'Catalogue', 'nav.orders': 'Commandes', 'nav.cart': 'Panier', 'header.orders': 'Mes commandes', 'language.card_title': 'Choisissez votre langue' };
const de: TranslationMap = { ...en, 'nav.home': 'Start', 'nav.catalog': 'Katalog', 'nav.orders': 'Bestellungen', 'nav.cart': 'Warenkorb', 'header.orders': 'Meine Bestellungen', 'language.card_title': 'Sprache wählen' };
const it: TranslationMap = { ...en, 'nav.catalog': 'Catalogo', 'nav.orders': 'Ordini', 'nav.cart': 'Carrello', 'header.orders': 'I miei ordini', 'language.card_title': 'Scegli la lingua' };
const zh: TranslationMap = { ...en, 'nav.home': '首页', 'nav.catalog': '目录', 'nav.orders': '订单', 'nav.cart': '购物车', 'nav.info': '信息', 'language.card_title': '选择语言' };
const ja: TranslationMap = { ...en, 'nav.home': 'ホーム', 'nav.catalog': 'カタログ', 'nav.orders': '注文', 'nav.cart': 'カート', 'nav.info': '情報', 'language.card_title': '言語を選択' };
const nl: TranslationMap = { ...en, 'nav.catalog': 'Catalogus', 'nav.orders': 'Bestellingen', 'nav.cart': 'Winkelwagen', 'header.orders': 'Mijn bestellingen', 'language.card_title': 'Kies je taal' };
const ru: TranslationMap = { ...en, 'nav.home': 'Главная', 'nav.catalog': 'Каталог', 'nav.orders': 'Заказы', 'nav.cart': 'Корзина', 'nav.info': 'Инфо', 'language.card_title': 'Выберите язык' };

const dictionaries: Record<LanguageCode, TranslationMap> = {
  es,
  en,
  pt,
  fr,
  de,
  it,
  zh,
  ja,
  nl,
  ru,
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => detectBrowserLanguage());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const currentDictionary = dictionaries[language] || dictionaries.es;

    return {
      language,
      languages: LANGUAGE_OPTIONS,
      setLanguage: setLanguageState,
      t: (key: string) => currentDictionary[key] || dictionaries.es[key] || dictionaries.en[key] || key,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    return {
      language: 'es' as LanguageCode,
      languages: LANGUAGE_OPTIONS,
      setLanguage: () => undefined,
      t: (key: string) => dictionaries.es[key] || dictionaries.en[key] || key,
    };
  }

  return context;
}
