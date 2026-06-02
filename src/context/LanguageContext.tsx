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
type TranslationParams = Record<string, string | number>;

type LanguageContextValue = {
  language: LanguageCode;
  languages: LanguageOption[];
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const LANGUAGE_STORAGE_KEY = 'pollazo_language';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', shortLabel: 'ES', flag: '🇪🇨' },
  { code: 'en', name: 'English', nativeName: 'English', shortLabel: 'EN', flag: '🇺🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', shortLabel: 'PT', flag: '🇧🇷' },
  { code: 'fr', name: 'French', nativeName: 'Français', shortLabel: 'FR', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', shortLabel: 'DE', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', shortLabel: 'IT', flag: '🇮🇹' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', shortLabel: 'ZH', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', shortLabel: 'JA', flag: '🇯🇵' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', shortLabel: 'NL', flag: '🇳🇱' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', shortLabel: 'RU', flag: '🇷🇺' },
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

const applyParams = (text: string, params?: TranslationParams) => {
  if (!params) return text;

  return Object.entries(params).reduce((current, [key, value]) => {
    return current.replaceAll(`{${key}}`, String(value));
  }, text);
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
  'common.select': 'Seleccionar',
  'common.change': 'Cambiar',
  'common.done': 'Listo',
  'common.save': 'Guardar',

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
  'language.card_title': 'Idioma de la app',
  'language.card_text': 'Cambia la app a tu idioma preferido. Ideal para clientes locales y turistas en Galápagos.',
  'language.current_label': 'Idioma actual',
  'language.change_button': 'Cambiar idioma',
  'language.sheet_title': 'Elige tu idioma',
  'language.sheet_subtitle': 'La app guardará tu elección para tus próximas visitas.',
  'language.sheet_note': 'Los nombres propios como La Casa del Pollazo, Pollazo Plus y Pollazo Galapagueño se mantienen como marca.',

  'info.hero.kicker': 'Información oficial',
  'info.location': 'El Mirador · Puerto Ayora',
  'info.location.saved': 'Ubicación guardada',

  'info.level.sheet_kicker': 'Niveles Pollazo',
  'info.level.sheet_title': 'Así subes de nivel',
  'info.level.sheet_text': 'Tu nivel sube con tu historial de compras válidas. Sirve para entender tu progreso como cliente y preparar futuros beneficios cuando el negocio los active.',
  'info.level.max_reached': 'Ya llegaste al nivel máximo.',
  'info.level.remaining': 'Te faltan {points} puntos de progreso para subir.',
  'info.level.from_to': 'Desde {min} pts hasta {max} pts.',
  'info.level.from_plus': 'Desde {min} pts en adelante.',
  'info.level.label': 'Nivel {level} · {title}',
  'info.level.1.title': 'Cliente Nuevo',
  'info.level.1.benefit': 'Empieza tu historial Pollazo.',
  'info.level.1.reward': 'Tu primera meta es registrar compras reales.',
  'info.level.2.title': 'Pollazo Fan',
  'info.level.2.benefit': 'Ya eres cliente frecuente.',
  'info.level.2.reward': 'Podrás recibir mejores avisos y recomendaciones.',
  'info.level.3.title': 'Cliente Fiel',
  'info.level.3.benefit': 'Tu historial empieza a pesar más.',
  'info.level.3.reward': 'Nivel ideal para futuras promos del negocio.',
  'info.level.4.title': 'Cliente Oro',
  'info.level.4.benefit': 'Nivel alto de fidelidad.',
  'info.level.4.reward': 'Perfil destacado para beneficios especiales.',
  'info.level.5.title': 'Leyenda Pollazo',
  'info.level.5.benefit': 'Nivel máximo de cliente histórico.',
  'info.level.5.reward': 'Eres de los clientes más fuertes del Pollazo.',

  'info.account.title': 'Mi cuenta Pollazo',
  'info.account.subtitle': 'Nivel y perfil del cliente',
  'info.account.empty': 'Registra tu nombre, WhatsApp y ubicación para activar tu perfil, guardar direcciones y subir de nivel.',
  'info.account.level_progress': 'Progreso de nivel',
  'info.account.plus_active': 'Pollazo Plus activo · ',
  'info.account.default_name': 'Cliente Pollazo',

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
  'common.close': 'Close',
  'common.current': 'Current',
  'common.ready': 'Ready',
  'common.pending': 'Pending',
  'common.use': 'Use',
  'common.edit': 'Edit',
  'common.repair': 'Repair',
  'common.help': 'Help',
  'common.understood': 'Got it',
  'common.select': 'Select',
  'common.change': 'Change',
  'common.done': 'Done',
  'common.save': 'Save',
  'nav.home': 'Home',
  'nav.catalog': 'Catalog',
  'nav.orders': 'Orders',
  'nav.cart': 'Cart',
  'nav.info': 'Info',
  'header.catalog': 'Catalog',
  'header.orders': 'My orders',
  'header.cart': 'Cart',
  'header.info': 'Information',
  'header.ranking': 'VIP Ranking',
  'header.home_subtitle': '#1 at the market',
  'header.back_home': 'Home',
  'header.open_ranking': 'Open ranking',
  'header.open_profile': 'Open profile',
  'header.open_cart': 'Open cart',
  'language.saved': 'Language updated',
  'language.card_kicker': 'Language',
  'language.card_title': 'App language',
  'language.card_text': 'Switch the app to your preferred language. Ideal for local customers and tourists in Galápagos.',
  'language.current_label': 'Current language',
  'language.change_button': 'Change language',
  'language.sheet_title': 'Choose your language',
  'language.sheet_subtitle': 'The app will remember your choice for future visits.',
  'language.sheet_note': 'Brand names like La Casa del Pollazo, Pollazo Plus and Pollazo Galapagueño stay unchanged.',
  'info.hero.kicker': 'Official information',
  'info.location.saved': 'Saved location',
  'info.level.sheet_kicker': 'Pollazo levels',
  'info.level.sheet_title': 'How to level up',
  'info.level.sheet_text': 'Your level grows with valid purchase history. It helps understand your progress and prepare future benefits.',
  'info.level.max_reached': 'You reached the highest level.',
  'info.level.remaining': 'You need {points} progress points to level up.',
  'info.level.from_to': 'From {min} pts to {max} pts.',
  'info.level.from_plus': 'From {min} pts and up.',
  'info.level.label': 'Level {level} · {title}',
  'info.level.1.title': 'New Customer',
  'info.level.1.benefit': 'Start your Pollazo history.',
  'info.level.1.reward': 'Your first goal is to register real purchases.',
  'info.level.2.title': 'Pollazo Fan',
  'info.level.2.benefit': 'You are becoming a frequent customer.',
  'info.level.2.reward': 'You may receive better alerts and recommendations.',
  'info.level.3.title': 'Loyal Customer',
  'info.level.3.benefit': 'Your purchase history starts to matter more.',
  'info.level.3.reward': 'A great level for future business promos.',
  'info.level.4.title': 'Gold Customer',
  'info.level.4.benefit': 'High loyalty level.',
  'info.level.4.reward': 'Highlighted profile for special benefits.',
  'info.level.5.title': 'Pollazo Legend',
  'info.level.5.benefit': 'Highest historical customer level.',
  'info.level.5.reward': 'You are one of Pollazo’s strongest customers.',
  'info.account.title': 'My Pollazo account',
  'info.account.subtitle': 'Customer level and profile',
  'info.account.empty': 'Register your name, WhatsApp and location to activate your profile, save addresses and level up.',
  'info.account.level_progress': 'Level progress',
  'info.account.plus_active': 'Pollazo Plus active · ',
  'info.account.default_name': 'Pollazo Customer',
  'info.delivery.title': 'My delivery',
  'info.delivery.add_point': 'Add your delivery point',
  'info.delivery.selected': 'Selected',
  'info.delivery.show_less': 'Show fewer addresses',
  'info.delivery.show_more': 'Show more',
  'info.delivery.save_fast': 'Save Home, Work, Airbnb or another point to order faster.',
  'info.delivery.add_new': 'Add new address',
  'info.notifications.not_available': 'Not available',
  'info.notifications.need_phone': 'First register your WhatsApp to link alerts to your order.',
  'info.notifications.manual_blocked': 'Alerts are blocked. You must allow them manually from phone or browser settings.',
  'info.notifications.ready_notice': 'Done. We will notify you about orders, Plus and important updates.',
  'info.notifications.repaired_notice': 'Alerts repaired. This phone was registered again.',
  'info.notifications.active': 'Active',
  'info.notifications.blocked': 'Blocked',
  'info.notifications.recommended': 'Recommended',
  'info.notifications.register_data': 'Register data',
  'info.notifications.allow_help': 'How to allow',
  'info.notifications.repairing': 'Repairing...',
  'info.notifications.activating': 'Activating...',
  'info.notifications.active_button': 'Alerts active',
  'info.notifications.activate': 'Activate alerts',
  'info.notifications.kicker': 'Important alerts',
  'info.notifications.title': 'Pollazo notifications',
  'info.notifications.text': 'We will notify you about order status, Plus gifts, important changes and useful reminders. No spam.',
  'info.notifications.blocked_message': 'Your phone or browser blocked alerts. For security, permission must be changed manually from settings.',
  'info.notifications.active_message': 'Alerts active. Your phone is ready to receive Pollazo notifications.',
  'info.notifications.permission_kicker': 'Phone permissions',
  'info.notifications.permission_title': 'Enable notifications',
  'info.notifications.permission_text': 'When notifications are blocked, the app cannot show the permission popup again. You must allow it from phone or browser settings.',
  'info.notifications.android_steps_title': 'Android / installed app',
  'info.notifications.android_steps': '1. Long press the La Casa del Pollazo icon. 2. Tap App info. 3. Open Notifications. 4. Enable notifications. 5. Return to Info and tap Repair alerts.',
  'info.notifications.chrome_steps_title': 'Chrome',
  'info.notifications.chrome_steps': '1. Open Chrome. 2. Go to Site settings. 3. Find pollazogalapague-o-psi.vercel.app. 4. Set Notifications to Allow. 5. Return to the app and tap Repair alerts.',
  'info.install.title': 'Install app',
  'info.install.subtitle': 'Fast access from your phone.',
  'info.contact.title': 'Direct contact',
  'info.contact.whatsapp': 'Official WhatsApp',
  'info.contact.attention': 'Immediate support',
  'info.contact.chat': 'Chat',
  'info.contact.phone': 'Phone line',
  'info.contact.call': 'Call',
  'info.hours.title': 'Opening hours',
  'info.hours.value': '7:00 AM – 9:00 PM · Every day',
  'info.location.title': 'Location',
  'info.buy.title': 'Order now',
  'info.buy.subtitle': 'View catalog and build your order',
  'info.team.title': 'Our Team',
  'info.team.subtitle': 'People behind service and support',
  'info.gallery.title': 'Gallery',
  'info.legal.title': 'Legal information and help',
  'info.legal.subtitle': 'Terms, privacy, payments, deliveries and support',
  'info.legal.note': 'Rewards, levels, promotions and benefits may change depending on what the business activates. The app will always show what is available.',
  'info.footer': 'Made for easy shopping in Puerto Ayora',
  'legal.required.title': 'Before continuing',
  'legal.required.subtitle': 'Review and accept to use the app',
  'legal.required.notice': 'To order, save your location, receive order alerts and use benefits, you need to accept these basic rules.',
  'legal.read.title': 'Legal center and help',
  'legal.read.subtitle': 'Check rules, privacy and support',
  'legal.hero.title': 'Easy ordering, clear rules',
  'legal.hero.text': 'Here we explain how orders, payments, deliveries, personal data, benefits, points, notifications and help work.',
  'legal.category.orders': 'Orders',
  'legal.category.orders_text': 'Status, changes and confirmation.',
  'legal.category.payments': 'Payments',
  'legal.category.payments_text': 'Cash, Deuna, transfer and card.',
  'legal.category.data': 'Data',
  'legal.category.data_text': 'Privacy, location and security.',
  'legal.info_title': 'Legal information',
  'legal.help_title': 'Quick help',
  'legal.help.order': 'Problems with my order',
  'legal.help.order_text': 'Check status, changes, cancellations, missing products or delivery coordination.',
  'legal.help.payment': 'Payment problems',
  'legal.help.payment_text': 'Help with receipts, Deuna, transfers, rejected payments or pending payments.',
  'legal.help.location': 'Location or delivery',
  'legal.help.location_text': 'Correct delivery reference, Airbnb, hotel, home or nearby business.',
  'legal.help.notifications': 'Notifications and tracking',
  'legal.help.notifications_text': 'Review order alerts, phone permissions and live tracking.',
  'legal.help.security': 'Account security',
  'legal.help.security_text': 'Report suspicious activity, wrong number or verification problems.',
  'legal.help.data': 'My data',
  'legal.help.data_text': 'Request to update, correct or delete data linked to your WhatsApp.',
  'legal.whatsapp': 'Contact by WhatsApp',
  'legal.update_note': 'These terms may be updated when features, payment methods, promotions, delivery, memberships or business requirements change.',
  'legal.footer_required': 'By continuing you confirm that you understand the rules for use, ordering, delivery, payments and privacy.',
  'legal.footer_read': 'This section is for review only. You already accepted the rules when entering for the first time.',
  'legal.accept': 'Accept and continue',
  'legal.close_reading': 'Close reading',
};

const pt: TranslationMap = {
  ...en,
  'common.close': 'Fechar', 'common.current': 'Atual', 'common.ready': 'Pronta', 'common.pending': 'Pendente', 'common.use': 'Usar', 'common.edit': 'Editar', 'common.repair': 'Reparar', 'common.help': 'Ajuda', 'common.understood': 'Entendi', 'common.change': 'Alterar',
  'nav.home': 'Início', 'nav.catalog': 'Catálogo', 'nav.orders': 'Pedidos', 'nav.cart': 'Carrinho', 'nav.info': 'Info',
  'header.catalog': 'Catálogo', 'header.orders': 'Meus pedidos', 'header.cart': 'Carrinho', 'header.info': 'Informação', 'header.back_home': 'Início',
  'language.saved': 'Idioma atualizado', 'language.card_title': 'Idioma do app', 'language.change_button': 'Alterar idioma', 'language.sheet_title': 'Escolha seu idioma', 'language.sheet_subtitle': 'O app lembrará sua escolha nas próximas visitas.', 'language.current_label': 'Idioma atual',
  'info.hero.kicker': 'Informação oficial', 'info.account.title': 'Minha conta Pollazo', 'info.account.subtitle': 'Nível e perfil do cliente', 'info.account.level_progress': 'Progresso de nível', 'info.delivery.title': 'Minha entrega', 'info.delivery.add_point': 'Adicione seu ponto de entrega', 'info.delivery.selected': 'Selecionada', 'info.delivery.add_new': 'Adicionar novo endereço', 'info.notifications.title': 'Notificações Pollazo', 'info.notifications.activate': 'Ativar avisos', 'info.notifications.active_button': 'Avisos ativos', 'info.contact.title': 'Contato direto', 'info.contact.chat': 'Conversar', 'info.contact.call': 'Ligar', 'info.hours.title': 'Horário de atendimento', 'info.location.title': 'Localização', 'info.buy.title': 'Comprar agora', 'info.team.title': 'Nossa equipe', 'info.gallery.title': 'Galeria', 'info.legal.title': 'Informação legal e ajuda', 'info.footer': 'Feito para comprar fácil em Puerto Ayora',
  'legal.required.title': 'Antes de continuar', 'legal.read.title': 'Centro legal e ajuda', 'legal.accept': 'Aceitar e continuar', 'legal.close_reading': 'Fechar leitura', 'legal.hero.title': 'Compra fácil, regras claras', 'legal.whatsapp': 'Contato por WhatsApp',
};

const fr: TranslationMap = {
  ...en,
  'common.close': 'Fermer', 'common.current': 'Actuel', 'common.ready': 'Prête', 'common.pending': 'En attente', 'common.use': 'Utiliser', 'common.edit': 'Modifier', 'common.repair': 'Réparer', 'common.help': 'Aide', 'common.understood': 'Compris', 'common.change': 'Changer',
  'nav.home': 'Accueil', 'nav.catalog': 'Catalogue', 'nav.orders': 'Commandes', 'nav.cart': 'Panier', 'nav.info': 'Info',
  'header.catalog': 'Catalogue', 'header.orders': 'Mes commandes', 'header.cart': 'Panier', 'header.info': 'Information', 'header.back_home': 'Accueil',
  'language.saved': 'Langue mise à jour', 'language.card_title': 'Langue de l’app', 'language.change_button': 'Changer de langue', 'language.sheet_title': 'Choisissez votre langue', 'language.sheet_subtitle': 'L’app mémorisera votre choix.', 'language.current_label': 'Langue actuelle',
  'info.hero.kicker': 'Information officielle', 'info.account.title': 'Mon compte Pollazo', 'info.account.subtitle': 'Niveau et profil client', 'info.account.level_progress': 'Progression du niveau', 'info.delivery.title': 'Ma livraison', 'info.delivery.add_point': 'Ajoutez votre point de livraison', 'info.delivery.selected': 'Sélectionnée', 'info.delivery.add_new': 'Ajouter une adresse', 'info.notifications.title': 'Notifications Pollazo', 'info.notifications.activate': 'Activer les alertes', 'info.notifications.active_button': 'Alertes actives', 'info.contact.title': 'Contact direct', 'info.contact.chat': 'Discuter', 'info.contact.call': 'Appeler', 'info.hours.title': 'Horaires', 'info.location.title': 'Localisation', 'info.buy.title': 'Commander maintenant', 'info.team.title': 'Notre équipe', 'info.gallery.title': 'Galerie', 'info.legal.title': 'Informations légales et aide', 'info.footer': 'Conçu pour acheter facilement à Puerto Ayora',
  'legal.required.title': 'Avant de continuer', 'legal.read.title': 'Centre légal et aide', 'legal.accept': 'Accepter et continuer', 'legal.close_reading': 'Fermer', 'legal.hero.title': 'Commande facile, règles claires', 'legal.whatsapp': 'Contacter par WhatsApp',
};

const de: TranslationMap = {
  ...en,
  'common.close': 'Schließen', 'common.current': 'Aktuell', 'common.ready': 'Bereit', 'common.pending': 'Ausstehend', 'common.use': 'Nutzen', 'common.edit': 'Bearbeiten', 'common.repair': 'Reparieren', 'common.help': 'Hilfe', 'common.understood': 'Verstanden', 'common.change': 'Ändern',
  'nav.home': 'Start', 'nav.catalog': 'Katalog', 'nav.orders': 'Bestellungen', 'nav.cart': 'Warenkorb', 'nav.info': 'Info',
  'header.catalog': 'Katalog', 'header.orders': 'Meine Bestellungen', 'header.cart': 'Warenkorb', 'header.info': 'Information', 'header.back_home': 'Start',
  'language.saved': 'Sprache aktualisiert', 'language.card_title': 'App-Sprache', 'language.change_button': 'Sprache ändern', 'language.sheet_title': 'Sprache wählen', 'language.sheet_subtitle': 'Die App merkt sich deine Auswahl.', 'language.current_label': 'Aktuelle Sprache',
  'info.hero.kicker': 'Offizielle Information', 'info.account.title': 'Mein Pollazo-Konto', 'info.account.subtitle': 'Kundenlevel und Profil', 'info.account.level_progress': 'Level-Fortschritt', 'info.delivery.title': 'Meine Lieferung', 'info.delivery.add_point': 'Lieferpunkt hinzufügen', 'info.delivery.selected': 'Ausgewählt', 'info.delivery.add_new': 'Neue Adresse hinzufügen', 'info.notifications.title': 'Pollazo-Benachrichtigungen', 'info.notifications.activate': 'Benachrichtigungen aktivieren', 'info.notifications.active_button': 'Benachrichtigungen aktiv', 'info.contact.title': 'Direkter Kontakt', 'info.contact.chat': 'Chatten', 'info.contact.call': 'Anrufen', 'info.hours.title': 'Öffnungszeiten', 'info.location.title': 'Standort', 'info.buy.title': 'Jetzt bestellen', 'info.team.title': 'Unser Team', 'info.gallery.title': 'Galerie', 'info.legal.title': 'Rechtliche Informationen und Hilfe', 'info.footer': 'Gemacht für einfaches Einkaufen in Puerto Ayora',
  'legal.required.title': 'Bevor du fortfährst', 'legal.read.title': 'Rechtscenter und Hilfe', 'legal.accept': 'Akzeptieren und fortfahren', 'legal.close_reading': 'Schließen', 'legal.hero.title': 'Einfach bestellen, klare Regeln', 'legal.whatsapp': 'Per WhatsApp kontaktieren',
};

const it: TranslationMap = {
  ...en,
  'common.close': 'Chiudi', 'common.current': 'Attuale', 'common.ready': 'Pronta', 'common.pending': 'In attesa', 'common.use': 'Usa', 'common.edit': 'Modifica', 'common.repair': 'Ripara', 'common.help': 'Aiuto', 'common.understood': 'Capito', 'common.change': 'Cambia',
  'nav.home': 'Home', 'nav.catalog': 'Catalogo', 'nav.orders': 'Ordini', 'nav.cart': 'Carrello', 'nav.info': 'Info',
  'header.catalog': 'Catalogo', 'header.orders': 'I miei ordini', 'header.cart': 'Carrello', 'header.info': 'Informazioni', 'header.back_home': 'Home',
  'language.saved': 'Lingua aggiornata', 'language.card_title': 'Lingua dell’app', 'language.change_button': 'Cambia lingua', 'language.sheet_title': 'Scegli la lingua', 'language.sheet_subtitle': 'L’app ricorderà la tua scelta.', 'language.current_label': 'Lingua attuale',
  'info.hero.kicker': 'Informazioni ufficiali', 'info.account.title': 'Il mio account Pollazo', 'info.account.subtitle': 'Livello e profilo cliente', 'info.account.level_progress': 'Progresso livello', 'info.delivery.title': 'La mia consegna', 'info.delivery.add_point': 'Aggiungi punto di consegna', 'info.delivery.selected': 'Selezionata', 'info.delivery.add_new': 'Aggiungi indirizzo', 'info.notifications.title': 'Notifiche Pollazo', 'info.notifications.activate': 'Attiva avvisi', 'info.notifications.active_button': 'Avvisi attivi', 'info.contact.title': 'Contatto diretto', 'info.contact.chat': 'Chat', 'info.contact.call': 'Chiama', 'info.hours.title': 'Orari', 'info.location.title': 'Posizione', 'info.buy.title': 'Ordina ora', 'info.team.title': 'Il nostro team', 'info.gallery.title': 'Galleria', 'info.legal.title': 'Informazioni legali e aiuto', 'info.footer': 'Creato per comprare facilmente a Puerto Ayora',
  'legal.required.title': 'Prima di continuare', 'legal.read.title': 'Centro legale e aiuto', 'legal.accept': 'Accetta e continua', 'legal.close_reading': 'Chiudi', 'legal.hero.title': 'Ordini facili, regole chiare', 'legal.whatsapp': 'Contatta via WhatsApp',
};

const zh: TranslationMap = {
  ...en,
  'common.close': '关闭', 'common.current': '当前', 'common.ready': '已准备', 'common.pending': '待处理', 'common.use': '使用', 'common.edit': '编辑', 'common.repair': '修复', 'common.help': '帮助', 'common.understood': '明白', 'common.change': '更改',
  'nav.home': '首页', 'nav.catalog': '目录', 'nav.orders': '订单', 'nav.cart': '购物车', 'nav.info': '信息',
  'header.catalog': '目录', 'header.orders': '我的订单', 'header.cart': '购物车', 'header.info': '信息', 'header.ranking': 'VIP 排行榜', 'header.home_subtitle': '市场第一', 'header.back_home': '首页', 'header.open_ranking': '打开排行榜', 'header.open_profile': '打开个人资料', 'header.open_cart': '打开购物车',
  'language.saved': '语言已更新', 'language.card_kicker': '语言', 'language.card_title': '应用语言', 'language.card_text': '将应用切换到你喜欢的语言。适合本地顾客和加拉帕戈斯游客。', 'language.current_label': '当前语言', 'language.change_button': '更改语言', 'language.sheet_title': '选择语言', 'language.sheet_subtitle': '应用会记住你的选择。', 'language.sheet_note': 'La Casa del Pollazo、Pollazo Plus 和 Pollazo Galapagueño 等品牌名称保持不变。',
  'info.hero.kicker': '官方信息', 'info.location.saved': '已保存位置', 'info.account.title': '我的 Pollazo 账户', 'info.account.subtitle': '客户等级和资料', 'info.account.empty': '注册姓名、WhatsApp 和位置，以启用资料、保存地址并提升等级。', 'info.account.level_progress': '等级进度', 'info.account.plus_active': 'Pollazo Plus 已激活 · ', 'info.account.default_name': 'Pollazo 客户', 'info.delivery.title': '我的配送', 'info.delivery.add_point': '添加配送地点', 'info.delivery.selected': '已选择', 'info.delivery.show_less': '显示更少地址', 'info.delivery.show_more': '显示更多', 'info.delivery.save_fast': '保存家、工作地点、Airbnb 或其他地点，下单更快。', 'info.delivery.add_new': '添加新地址', 'info.notifications.title': 'Pollazo 通知', 'info.notifications.activate': '开启通知', 'info.notifications.active_button': '通知已开启', 'info.contact.title': '直接联系', 'info.contact.chat': '聊天', 'info.contact.call': '拨打', 'info.hours.title': '营业时间', 'info.location.title': '位置', 'info.buy.title': '立即下单', 'info.buy.subtitle': '查看目录并创建订单', 'info.team.title': '我们的团队', 'info.team.subtitle': '服务背后的人员', 'info.gallery.title': '图库', 'info.legal.title': '法律信息和帮助', 'info.footer': '为 Puerto Ayora 轻松购物而做',
  'legal.required.title': '继续之前', 'legal.read.title': '法律中心和帮助', 'legal.accept': '接受并继续', 'legal.close_reading': '关闭', 'legal.hero.title': '轻松下单，规则清晰', 'legal.whatsapp': '通过 WhatsApp 联系',
};

const ja: TranslationMap = {
  ...en,
  'common.close': '閉じる', 'common.current': '現在', 'common.ready': '準備完了', 'common.pending': '保留中', 'common.use': '使う', 'common.edit': '編集', 'common.repair': '修復', 'common.help': 'ヘルプ', 'common.understood': '了解', 'common.change': '変更',
  'nav.home': 'ホーム', 'nav.catalog': 'カタログ', 'nav.orders': '注文', 'nav.cart': 'カート', 'nav.info': '情報',
  'header.catalog': 'カタログ', 'header.orders': '注文履歴', 'header.cart': 'カート', 'header.info': '情報', 'header.ranking': 'VIPランキング', 'header.back_home': 'ホーム',
  'language.saved': '言語を更新しました', 'language.card_title': 'アプリの言語', 'language.change_button': '言語を変更', 'language.sheet_title': '言語を選択', 'language.sheet_subtitle': 'アプリは選択を保存します。', 'language.current_label': '現在の言語',
  'info.hero.kicker': '公式情報', 'info.account.title': 'Pollazo アカウント', 'info.delivery.title': '配送先', 'info.notifications.title': 'Pollazo 通知', 'info.notifications.activate': '通知を有効化', 'info.notifications.active_button': '通知有効', 'info.contact.title': '直接連絡', 'info.buy.title': '今すぐ注文', 'info.team.title': 'チーム', 'info.gallery.title': 'ギャラリー', 'info.legal.title': '法的情報とヘルプ',
  'legal.required.title': '続行する前に', 'legal.read.title': '法的情報とヘルプ', 'legal.accept': '同意して続行', 'legal.close_reading': '閉じる', 'legal.hero.title': '簡単注文、明確なルール', 'legal.whatsapp': 'WhatsAppで連絡',
};

const nl: TranslationMap = {
  ...en,
  'common.close': 'Sluiten', 'common.current': 'Huidig', 'common.ready': 'Klaar', 'common.pending': 'In behandeling', 'common.use': 'Gebruiken', 'common.edit': 'Bewerken', 'common.repair': 'Herstellen', 'common.help': 'Hulp', 'common.understood': 'Begrepen', 'common.change': 'Wijzigen',
  'nav.home': 'Home', 'nav.catalog': 'Catalogus', 'nav.orders': 'Bestellingen', 'nav.cart': 'Winkelwagen', 'nav.info': 'Info',
  'header.catalog': 'Catalogus', 'header.orders': 'Mijn bestellingen', 'header.cart': 'Winkelwagen', 'header.info': 'Informatie', 'header.back_home': 'Home',
  'language.saved': 'Taal bijgewerkt', 'language.card_title': 'App-taal', 'language.change_button': 'Taal wijzigen', 'language.sheet_title': 'Kies je taal', 'language.sheet_subtitle': 'De app onthoudt je keuze.', 'language.current_label': 'Huidige taal',
  'info.hero.kicker': 'Officiële informatie', 'info.account.title': 'Mijn Pollazo-account', 'info.delivery.title': 'Mijn bezorging', 'info.notifications.title': 'Pollazo-meldingen', 'info.notifications.activate': 'Meldingen activeren', 'info.notifications.active_button': 'Meldingen actief', 'info.contact.title': 'Direct contact', 'info.buy.title': 'Nu bestellen', 'info.team.title': 'Ons team', 'info.gallery.title': 'Galerij', 'info.legal.title': 'Juridische informatie en hulp',
  'legal.required.title': 'Voordat je doorgaat', 'legal.read.title': 'Juridisch centrum en hulp', 'legal.accept': 'Accepteren en doorgaan', 'legal.close_reading': 'Sluiten', 'legal.hero.title': 'Eenvoudig bestellen, duidelijke regels', 'legal.whatsapp': 'Contact via WhatsApp',
};

const ru: TranslationMap = {
  ...en,
  'common.close': 'Закрыть', 'common.current': 'Текущий', 'common.ready': 'Готово', 'common.pending': 'Ожидает', 'common.use': 'Использовать', 'common.edit': 'Изменить', 'common.repair': 'Исправить', 'common.help': 'Помощь', 'common.understood': 'Понятно', 'common.change': 'Изменить',
  'nav.home': 'Главная', 'nav.catalog': 'Каталог', 'nav.orders': 'Заказы', 'nav.cart': 'Корзина', 'nav.info': 'Инфо',
  'header.catalog': 'Каталог', 'header.orders': 'Мои заказы', 'header.cart': 'Корзина', 'header.info': 'Информация', 'header.ranking': 'VIP рейтинг', 'header.back_home': 'Главная',
  'language.saved': 'Язык обновлен', 'language.card_title': 'Язык приложения', 'language.change_button': 'Изменить язык', 'language.sheet_title': 'Выберите язык', 'language.sheet_subtitle': 'Приложение запомнит ваш выбор.', 'language.current_label': 'Текущий язык',
  'info.hero.kicker': 'Официальная информация', 'info.account.title': 'Мой аккаунт Pollazo', 'info.delivery.title': 'Моя доставка', 'info.notifications.title': 'Уведомления Pollazo', 'info.notifications.activate': 'Включить уведомления', 'info.notifications.active_button': 'Уведомления активны', 'info.contact.title': 'Прямой контакт', 'info.buy.title': 'Заказать сейчас', 'info.team.title': 'Наша команда', 'info.gallery.title': 'Галерея', 'info.legal.title': 'Правовая информация и помощь',
  'legal.required.title': 'Перед продолжением', 'legal.read.title': 'Правовой центр и помощь', 'legal.accept': 'Принять и продолжить', 'legal.close_reading': 'Закрыть', 'legal.hero.title': 'Легкий заказ, ясные правила', 'legal.whatsapp': 'Связаться через WhatsApp',
};

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
      t: (key: string, params?: TranslationParams) => {
        const text = currentDictionary[key] || dictionaries.es[key] || dictionaries.en[key] || key;
        return applyParams(text, params);
      },
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
      t: (key: string, params?: TranslationParams) => {
        const text = dictionaries.es[key] || dictionaries.en[key] || key;
        return applyParams(text, params);
      },
    };
  }

  return context;
}
