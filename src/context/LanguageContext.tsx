import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Check, Globe2, X } from 'lucide-react';
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
const OPEN_LANGUAGE_SHEET_CODE = '__open_language_sheet__' as LanguageCode;

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

  return Object.entries(params).reduce(
    (current, [key, value]) => current.split(`{${key}}`).join(String(value)),
    text
  );
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
  'language.card_title': 'Idioma de la app',
  'language.card_text': 'Selecciona cómo quieres ver la app.',
  'language.current_label': 'Idioma actual',
  'language.change_button': 'Cambiar idioma',
  'language.sheet_title': 'Elige tu idioma',
  'language.sheet_subtitle': 'La app guardará tu elección.',
  'language.sheet_note': 'Las marcas se mantienen igual. Los textos de la app cambian según el idioma elegido.',
  'language.quick_change_name': 'Cambiar idioma',
  'language.quick_change_short': 'APP',
  'language.select_aria': 'Seleccionar idioma {language}',
  'info.hero.kicker': 'Información oficial',
  'info.location': 'El Mirador · Puerto Ayora',
  'info.location.saved': 'Ubicación guardada',
  'info.account.title': 'Mi cuenta Pollazo',
  'info.account.subtitle': 'Nivel y perfil del cliente',
  'info.account.empty': 'Registra tu nombre, WhatsApp y ubicación para activar tu perfil, guardar direcciones y subir de nivel.',
  'info.account.level_progress': 'Progreso de nivel',
  'info.account.view_levels': 'Ver niveles',
  'info.account.plus_active': 'Pollazo Plus activo · ',
  'info.account.default_name': 'Cliente Pollazo',
  'info.level.sheet_kicker': 'Niveles Pollazo',
  'info.level.sheet_title': 'Así subes de nivel',
  'info.level.sheet_text': 'Tu nivel sube con tu historial de compras válidas. Sirve para entender tu progreso como cliente y preparar futuros beneficios cuando el negocio los active.',
  'info.level.max_reached': 'Ya llegaste al nivel máximo.',
  'info.level.remaining': 'Te faltan {points} puntos de progreso para subir.',
  'info.level.from_to': 'Desde {min} pts hasta {max} pts.',
  'info.level.from_plus': 'Desde {min} pts en adelante.',
  'info.level.label': 'Nivel {level} · {title}',
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

const en: TranslationMap = { ...es,
  'common.close': 'Close', 'common.current': 'Current', 'common.ready': 'Ready', 'common.pending': 'Pending', 'common.use': 'Use', 'common.edit': 'Edit', 'common.repair': 'Repair', 'common.help': 'Help', 'common.understood': 'Got it',
  'nav.home': 'Home', 'nav.catalog': 'Catalog', 'nav.orders': 'Orders', 'nav.cart': 'Cart', 'nav.info': 'Info',
  'header.catalog': 'Catalog', 'header.orders': 'My orders', 'header.cart': 'Cart', 'header.info': 'Information', 'header.ranking': 'VIP Ranking', 'header.home_subtitle': '#1 at the market', 'header.back_home': 'Home', 'header.open_ranking': 'Open ranking', 'header.open_profile': 'Open profile', 'header.open_cart': 'Open cart',
  'language.saved': 'Language updated', 'language.card_kicker': 'Language', 'language.card_title': 'App language', 'language.card_text': 'Choose how you want to view the app.', 'language.current_label': 'Current language', 'language.change_button': 'Change language', 'language.sheet_title': 'Choose your language', 'language.sheet_subtitle': 'The app will remember your choice.', 'language.sheet_note': 'Brand names stay the same. App texts change according to the selected language.', 'language.quick_change_name': 'Change language', 'language.select_aria': 'Select language {language}',
  'info.hero.kicker': 'Official information', 'info.location.saved': 'Saved location', 'info.account.title': 'My Pollazo account', 'info.account.subtitle': 'Customer level and profile', 'info.account.empty': 'Register your name, WhatsApp and location to activate your profile, save addresses and level up.', 'info.account.level_progress': 'Level progress', 'info.account.view_levels': 'View levels', 'info.account.plus_active': 'Pollazo Plus active · ', 'info.account.default_name': 'Pollazo Customer',
  'info.delivery.title': 'My delivery', 'info.delivery.add_point': 'Add your delivery point', 'info.delivery.selected': 'Selected', 'info.delivery.show_less': 'Show fewer addresses', 'info.delivery.show_more': 'Show more', 'info.delivery.save_fast': 'Save Home, Work, Airbnb or another point to order faster.', 'info.delivery.add_new': 'Add new address',
  'info.install.title': 'Install app', 'info.install.subtitle': 'Fast access from your phone.', 'info.contact.title': 'Direct contact', 'info.contact.whatsapp': 'Official WhatsApp', 'info.contact.attention': 'Immediate support', 'info.contact.chat': 'Chat', 'info.contact.phone': 'Phone line', 'info.contact.call': 'Call', 'info.hours.title': 'Opening hours', 'info.hours.value': '7:00 AM – 9:00 PM · Every day', 'info.location.title': 'Location', 'info.buy.title': 'Order now', 'info.buy.subtitle': 'View catalog and build your order', 'info.team.title': 'Our Team', 'info.team.subtitle': 'People behind service and support', 'info.gallery.title': 'Gallery', 'info.legal.title': 'Legal information and help', 'info.legal.subtitle': 'Terms, privacy, payments, deliveries and support', 'info.footer': 'Made for easy shopping in Puerto Ayora',
  'legal.required.title': 'Before continuing', 'legal.required.subtitle': 'Review and accept to use the app', 'legal.required.notice': 'To order, save your location, receive order alerts and use benefits, you need to accept these basic rules.', 'legal.read.title': 'Legal center and help', 'legal.read.subtitle': 'Check rules, privacy and support', 'legal.hero.title': 'Easy ordering, clear rules', 'legal.whatsapp': 'Contact by WhatsApp', 'legal.accept': 'Accept and continue', 'legal.close_reading': 'Close reading',
};

const zh: TranslationMap = { ...en,
  'common.close': '关闭', 'common.current': '当前', 'common.ready': '已就绪', 'common.pending': '待处理', 'common.use': '使用', 'common.edit': '编辑', 'common.repair': '修复', 'common.help': '帮助', 'common.understood': '明白',
  'nav.home': '首页', 'nav.catalog': '目录', 'nav.orders': '订单', 'nav.cart': '购物车', 'nav.info': '信息',
  'header.catalog': '目录', 'header.orders': '我的订单', 'header.cart': '购物车', 'header.info': '信息', 'header.ranking': 'VIP 排行榜', 'header.home_subtitle': '市场第一', 'header.back_home': '首页', 'header.open_ranking': '打开排行榜', 'header.open_profile': '打开个人资料', 'header.open_cart': '打开购物车',
  'language.saved': '语言已更新', 'language.card_kicker': '语言', 'language.card_title': '应用语言', 'language.card_text': '选择你想使用的语言。', 'language.current_label': '当前语言', 'language.change_button': '更改语言', 'language.sheet_title': '选择语言', 'language.sheet_subtitle': '应用会记住你的选择。', 'language.sheet_note': '品牌名称保持不变。应用文字会根据所选语言显示。', 'language.quick_change_name': '更改语言', 'language.quick_change_short': '应用', 'language.select_aria': '选择语言 {language}',
  'info.hero.kicker': '官方信息', 'info.location.saved': '已保存位置', 'info.account.title': 'Pollazo 账户', 'info.account.subtitle': '客户等级和资料', 'info.account.empty': '注册姓名、WhatsApp 和位置，以启用资料、保存地址并提升等级。', 'info.account.level_progress': '等级进度', 'info.account.view_levels': '查看等级', 'info.account.default_name': 'Pollazo 客户',
  'info.level.sheet_kicker': 'Pollazo 等级', 'info.level.sheet_title': '如何提升等级', 'info.level.sheet_text': '等级会随着有效购买记录提升。', 'info.level.max_reached': '你已达到最高等级。', 'info.level.remaining': '还差 {points} 点即可升级。',
  'info.delivery.title': '配送地址', 'info.delivery.add_point': '添加配送地点', 'info.delivery.selected': '已选择', 'info.delivery.show_less': '显示更少地址', 'info.delivery.show_more': '显示更多', 'info.delivery.save_fast': '保存常用地址，下单更快。', 'info.delivery.add_new': '添加新地址',
  'info.notifications.active': '已开启', 'info.notifications.kicker': '重要通知', 'info.notifications.title': 'Pollazo 通知', 'info.notifications.text': '我们会通知订单状态、Plus 礼物和重要提醒，不发送垃圾信息。', 'info.notifications.active_message': '通知已开启。你的手机可以接收 Pollazo 通知。',
  'info.contact.title': '直接联系', 'info.contact.whatsapp': '官方 WhatsApp', 'info.contact.attention': '即时客服', 'info.contact.chat': '聊天', 'info.contact.phone': '电话', 'info.contact.call': '拨打', 'info.hours.title': '营业时间', 'info.location.title': '位置', 'info.buy.title': '立即下单', 'info.buy.subtitle': '查看目录并创建订单', 'info.team.title': '我们的团队', 'info.team.subtitle': '服务背后的人员', 'info.gallery.title': '图库', 'info.legal.title': '法律信息和帮助', 'info.footer': '为 Puerto Ayora 轻松购物而做',
  'legal.required.title': '继续之前', 'legal.read.title': '法律中心和帮助', 'legal.accept': '接受并继续', 'legal.close_reading': '关闭', 'legal.hero.title': '轻松下单，规则清晰', 'legal.whatsapp': '通过 WhatsApp 联系',
};

const ja: TranslationMap = { ...en,
  'common.close': '閉じる', 'common.current': '現在', 'common.ready': '準備完了', 'common.pending': '保留中', 'common.use': '使う', 'common.edit': '編集', 'common.repair': '修復', 'common.help': 'ヘルプ', 'common.understood': '了解',
  'nav.home': 'ホーム', 'nav.catalog': 'カタログ', 'nav.orders': '注文', 'nav.cart': 'カート', 'nav.info': '情報',
  'header.catalog': 'カタログ', 'header.orders': '注文履歴', 'header.cart': 'カート', 'header.info': '情報', 'header.ranking': 'VIPランキング', 'header.home_subtitle': '市場で一番', 'header.back_home': 'ホーム', 'header.open_ranking': 'ランキングを開く', 'header.open_profile': 'プロフィールを開く', 'header.open_cart': 'カートを開く',
  'language.saved': '言語を更新しました', 'language.card_kicker': '言語', 'language.card_title': 'アプリの言語', 'language.card_text': '表示する言語を選択します。', 'language.current_label': '現在の言語', 'language.change_button': '言語を変更', 'language.sheet_title': '言語を選択', 'language.sheet_subtitle': 'アプリは選択を保存します。', 'language.sheet_note': 'ブランド名はそのまま表示されます。アプリの文章は選択した言語で表示されます。', 'language.quick_change_name': '言語を変更', 'language.quick_change_short': 'アプリ', 'language.select_aria': '{language} を選択',
  'info.hero.kicker': '公式情報', 'info.account.title': 'Pollazo アカウント', 'info.account.subtitle': 'お客様レベルとプロフィール', 'info.account.empty': '名前、WhatsApp、場所を登録してプロフィールを有効にします。', 'info.account.level_progress': 'レベル進捗', 'info.account.view_levels': 'レベルを見る', 'info.account.default_name': 'Pollazo お客様',
  'info.level.sheet_kicker': 'Pollazo レベル', 'info.level.sheet_title': 'レベルアップ方法', 'info.level.sheet_text': '有効な購入履歴に応じてレベルが上がります。', 'info.level.max_reached': '最高レベルに到達しました。', 'info.level.remaining': '次のレベルまであと {points} ポイントです。',
  'info.delivery.title': '配送先', 'info.delivery.add_point': '配送先を追加', 'info.delivery.selected': '選択中', 'info.delivery.show_less': '少なく表示', 'info.delivery.show_more': 'もっと表示', 'info.delivery.save_fast': 'よく使う配送先を保存すると注文が早くなります。', 'info.delivery.add_new': '新しい住所を追加',
  'info.notifications.active': '有効', 'info.notifications.kicker': '重要なお知らせ', 'info.notifications.title': 'Pollazo 通知', 'info.notifications.text': '注文状況、Plusギフト、重要なお知らせを通知します。迷惑通知は送りません。', 'info.notifications.active_message': '通知は有効です。この端末で Pollazo の通知を受け取れます。',
  'info.contact.title': '直接連絡', 'info.contact.whatsapp': '公式 WhatsApp', 'info.contact.attention': 'すぐに対応', 'info.contact.chat': 'チャット', 'info.contact.phone': '電話', 'info.contact.call': '電話する', 'info.hours.title': '営業時間', 'info.location.title': '場所', 'info.buy.title': '今すぐ注文', 'info.buy.subtitle': 'カタログを見て注文を作成', 'info.team.title': 'チーム', 'info.team.subtitle': 'サービスを支える人たち', 'info.gallery.title': 'ギャラリー', 'info.legal.title': '法的情報とヘルプ', 'info.footer': 'Puerto Ayora で簡単に買い物するために',
  'legal.required.title': '続行する前に', 'legal.read.title': '法的情報とヘルプ', 'legal.accept': '同意して続行', 'legal.close_reading': '閉じる', 'legal.hero.title': '簡単注文、明確なルール', 'legal.whatsapp': 'WhatsAppで連絡',
};

const pt: TranslationMap = { ...en, 'common.close': 'Fechar', 'common.current': 'Atual', 'nav.home': 'Início', 'nav.catalog': 'Catálogo', 'nav.orders': 'Pedidos', 'nav.cart': 'Carrinho', 'header.orders': 'Meus pedidos', 'header.info': 'Informação', 'header.back_home': 'Início', 'language.card_title': 'Idioma do app', 'language.card_text': 'Escolha como deseja ver o app.', 'language.change_button': 'Alterar idioma', 'language.sheet_title': 'Escolha seu idioma', 'language.quick_change_name': 'Alterar idioma', 'info.account.title': 'Minha conta Pollazo', 'info.account.view_levels': 'Ver níveis', 'info.delivery.title': 'Minha entrega', 'info.buy.title': 'Comprar agora', 'info.legal.title': 'Informação legal e ajuda', 'legal.accept': 'Aceitar e continuar' };
const fr: TranslationMap = { ...en, 'common.close': 'Fermer', 'common.current': 'Actuel', 'nav.home': 'Accueil', 'nav.catalog': 'Catalogue', 'nav.orders': 'Commandes', 'nav.cart': 'Panier', 'header.orders': 'Mes commandes', 'header.info': 'Information', 'header.back_home': 'Accueil', 'language.card_title': 'Langue de l’app', 'language.card_text': 'Choisissez comment afficher l’app.', 'language.change_button': 'Changer de langue', 'language.sheet_title': 'Choisissez votre langue', 'language.quick_change_name': 'Changer de langue', 'info.account.title': 'Mon compte Pollazo', 'info.account.view_levels': 'Voir les niveaux', 'info.delivery.title': 'Ma livraison', 'info.buy.title': 'Commander maintenant', 'info.legal.title': 'Informations légales et aide', 'legal.accept': 'Accepter et continuer' };
const de: TranslationMap = { ...en, 'common.close': 'Schließen', 'common.current': 'Aktuell', 'nav.home': 'Start', 'nav.catalog': 'Katalog', 'nav.orders': 'Bestellungen', 'nav.cart': 'Warenkorb', 'header.orders': 'Meine Bestellungen', 'header.info': 'Information', 'header.back_home': 'Start', 'language.card_title': 'App-Sprache', 'language.card_text': 'Wähle aus, wie du die App sehen möchtest.', 'language.change_button': 'Sprache ändern', 'language.sheet_title': 'Sprache wählen', 'language.quick_change_name': 'Sprache ändern', 'info.account.title': 'Mein Pollazo-Konto', 'info.account.view_levels': 'Level ansehen', 'info.delivery.title': 'Meine Lieferung', 'info.buy.title': 'Jetzt bestellen', 'info.legal.title': 'Rechtliche Informationen und Hilfe', 'legal.accept': 'Akzeptieren und fortfahren' };
const it: TranslationMap = { ...en, 'common.close': 'Chiudi', 'common.current': 'Attuale', 'nav.catalog': 'Catalogo', 'nav.orders': 'Ordini', 'nav.cart': 'Carrello', 'header.orders': 'I miei ordini', 'header.info': 'Informazioni', 'language.card_title': 'Lingua dell’app', 'language.card_text': 'Scegli come visualizzare l’app.', 'language.change_button': 'Cambia lingua', 'language.sheet_title': 'Scegli la lingua', 'language.quick_change_name': 'Cambia lingua', 'info.account.title': 'Il mio account Pollazo', 'info.account.view_levels': 'Vedi livelli', 'info.delivery.title': 'La mia consegna', 'info.buy.title': 'Ordina ora', 'info.legal.title': 'Informazioni legali e aiuto', 'legal.accept': 'Accetta e continua' };
const nl: TranslationMap = { ...en, 'common.close': 'Sluiten', 'common.current': 'Huidig', 'nav.catalog': 'Catalogus', 'nav.orders': 'Bestellingen', 'nav.cart': 'Winkelwagen', 'header.orders': 'Mijn bestellingen', 'header.info': 'Informatie', 'language.card_title': 'App-taal', 'language.card_text': 'Kies hoe je de app wilt bekijken.', 'language.change_button': 'Taal wijzigen', 'language.sheet_title': 'Kies je taal', 'language.quick_change_name': 'Taal wijzigen', 'info.account.title': 'Mijn Pollazo-account', 'info.account.view_levels': 'Niveaus bekijken', 'info.delivery.title': 'Mijn bezorging', 'info.buy.title': 'Nu bestellen', 'info.legal.title': 'Juridische informatie en hulp', 'legal.accept': 'Accepteren en doorgaan' };
const ru: TranslationMap = { ...en, 'common.close': 'Закрыть', 'common.current': 'Текущий', 'nav.home': 'Главная', 'nav.catalog': 'Каталог', 'nav.orders': 'Заказы', 'nav.cart': 'Корзина', 'nav.info': 'Инфо', 'header.orders': 'Мои заказы', 'header.info': 'Информация', 'header.back_home': 'Главная', 'language.card_title': 'Язык приложения', 'language.card_text': 'Выберите язык отображения приложения.', 'language.change_button': 'Изменить язык', 'language.sheet_title': 'Выберите язык', 'language.quick_change_name': 'Изменить язык', 'info.account.title': 'Мой аккаунт Pollazo', 'info.account.view_levels': 'Посмотреть уровни', 'info.delivery.title': 'Моя доставка', 'info.buy.title': 'Заказать сейчас', 'info.legal.title': 'Правовая информация и помощь', 'legal.accept': 'Принять и продолжить' };

const dictionaries: Record<LanguageCode, TranslationMap> = { es, en, pt, fr, de, it, zh, ja, nl, ru };
const LanguageContext = createContext<LanguageContextValue | null>(null);

function LanguageSheet({
  currentLanguage,
  onClose,
  onSelect,
  t,
}: {
  currentLanguage: LanguageCode;
  onClose: () => void;
  onSelect: (language: LanguageCode) => void;
  t: (key: string, params?: TranslationParams) => string;
}) {
  const currentOption = LANGUAGE_OPTIONS.find(option => option.code === currentLanguage) || LANGUAGE_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-[15000] flex items-end justify-center">
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="absolute inset-0 bg-orange-100/70" />
      <section className="relative w-full max-w-md max-h-[78dvh] bg-white rounded-t-[38px] shadow-2xl border border-white overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        <div className="absolute -top-24 -right-16 h-52 w-52 rounded-full bg-orange-300/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-yellow-300/25 blur-3xl" />
        <div className="relative px-5 pt-5 pb-4 border-b border-orange-50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[22px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-100 flex-shrink-0">
              <Globe2 size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">{t('language.card_kicker')}</p>
              <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none mt-1">{t('language.sheet_title')}</h3>
              <p className="text-[10px] font-bold text-gray-500 mt-2 leading-relaxed">{t('language.sheet_subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0" aria-label={t('common.close')}>
            <X size={19} />
          </button>
        </div>
        <div className="relative p-4 overflow-y-auto max-h-[calc(78dvh-128px)] space-y-2">
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 rounded-[28px] p-4 mb-3 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm">{currentOption.flag}</div>
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-widest text-orange-500">{t('language.current_label')}</p>
              <p className="text-sm font-black text-gray-950 uppercase truncate">{currentOption.nativeName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGE_OPTIONS.map(option => {
              const active = option.code === currentLanguage;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => onSelect(option.code)}
                  aria-label={t('language.select_aria', { language: option.nativeName })}
                  className={`rounded-[24px] p-3 text-left border active:scale-[0.98] transition-all ${active ? 'bg-gradient-to-br from-orange-500 to-yellow-400 border-orange-300 text-white shadow-lg shadow-orange-100' : 'bg-white border-orange-50 text-gray-700 shadow-sm'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{option.flag}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-black uppercase truncate ${active ? 'text-white' : 'text-gray-950'}`}>{option.shortLabel} · {option.nativeName}</p>
                      <p className={`text-[8px] font-black uppercase tracking-widest mt-1 truncate ${active ? 'text-white/80' : 'text-gray-400'}`}>{active ? t('common.current') : option.name}</p>
                    </div>
                    {active && <Check size={16} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-3 mt-3">
            <p className="text-[10px] font-bold text-orange-700 leading-relaxed">{t('language.sheet_note')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => detectBrowserLanguage());
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const currentDictionary = dictionaries[language] || dictionaries.es;
    const currentLanguageOption = LANGUAGE_OPTIONS.find(option => option.code === language) || LANGUAGE_OPTIONS[0];
    const translate = (key: string, params?: TranslationParams) => applyParams(currentDictionary[key] || dictionaries.es[key] || dictionaries.en[key] || key, params);

    return {
      language,
      languages: [
        currentLanguageOption,
        {
          code: OPEN_LANGUAGE_SHEET_CODE,
          name: translate('language.sheet_title'),
          nativeName: translate('language.quick_change_name'),
          shortLabel: translate('language.quick_change_short'),
          flag: '🌐',
        },
      ],
      setLanguage: (nextLanguage: LanguageCode) => {
        if (nextLanguage === OPEN_LANGUAGE_SHEET_CODE) {
          setShowLanguageSheet(true);
          return;
        }
        if (isLanguageCode(nextLanguage)) setLanguageState(nextLanguage);
      },
      t: translate,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {showLanguageSheet && (
        <LanguageSheet
          currentLanguage={language}
          onClose={() => setShowLanguageSheet(false)}
          onSelect={nextLanguage => {
            setLanguageState(nextLanguage);
            setShowLanguageSheet(false);
          }}
          t={value.t}
        />
      )}
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
      t: (key: string, params?: TranslationParams) => applyParams(dictionaries.es[key] || dictionaries.en[key] || key, params),
    };
  }
  return context;
}
