import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Crown,
  Gift,
  MapPin,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  Repeat2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { getProductDisplay } from '../utils/productI18n';
import type {
  Category,
  LanguageCode,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  Screen,
} from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
  onOpenProfile: () => void;
  onOpenTracking: () => void;
}

type StatusFilter = 'active' | 'delivered' | 'cancelled' | 'all';
type RangeFilter = '7d' | '15d' | '30d' | '3m' | '6m' | 'all';
type RepeatMode = 'replace' | 'add';
type LangText = Partial<Record<LanguageCode, string>> & { es: string; en?: string };
type TextKey = keyof typeof TEXTS;

const WHATSAPP_NUMBER = '593989795628';

const ACTIVE_STATUSES: OrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
];

const TEXTS = {
  guestKicker: { es: 'Mis pedidos', en: 'My orders', pt: 'Meus pedidos', fr: 'Mes commandes', de: 'Meine Bestellungen', it: 'I miei ordini', zh: '我的订单', ja: '注文履歴', nl: 'Mijn bestellingen', ru: 'Мои заказы' },
  guestTitle: { es: 'Tu historial empieza aquí', en: 'Your history starts here', zh: '你的记录从这里开始', ja: '注文履歴はここから始まります' },
  guestText: { es: 'Identifícate una sola vez con tu WhatsApp y tendrás tus pedidos, estados, compras repetidas y ayuda en un solo lugar.', en: 'Identify yourself once with WhatsApp and keep your orders, status updates, repeats and help in one place.', zh: '只需用 WhatsApp 识别一次，即可在一个地方查看订单、状态、重复购买和帮助。', ja: 'WhatsAppで一度登録すると、注文・状態・再注文・ヘルプを一か所で確認できます。' },
  liveStatus: { es: 'Estado en vivo', en: 'Live status', zh: '实时状态', ja: 'ライブ状態' },
  quickRepeat: { es: 'Repite rápido', en: 'Repeat fast', zh: '快速再订', ja: 'すばやく再注文' },
  identify: { es: 'Identificarme con WhatsApp', en: 'Identify with WhatsApp', zh: '使用 WhatsApp 登录', ja: 'WhatsAppで登録' },
  tracking: { es: 'Rastreo', en: 'Tracking', zh: '追踪', ja: '追跡' },
  trackingText: { es: 'Mira si está confirmado, preparando o en camino.', en: 'See if it is confirmed, packing or on the way.', zh: '查看是否已确认、打包或配送中。', ja: '確認済み、準備中、配送中か確認できます。' },
  repeat: { es: 'Repetir', en: 'Repeat', pt: 'Repetir', fr: 'Répéter', de: 'Wiederholen', it: 'Ripeti', zh: '再订', ja: '再注文', nl: 'Herhalen', ru: 'Повторить' },
  repeatText: { es: 'Vuelve a pedir lo mismo sin buscar producto por producto.', en: 'Order the same again without searching item by item.', zh: '无需逐个搜索商品即可再次下单。', ja: '商品を探し直さずに同じ注文ができます。' },
  alerts: { es: 'Avisos', en: 'Alerts', zh: '通知', ja: '通知' },
  alertsText: { es: 'Recibe cambios importantes de tu pedido.', en: 'Receive important order changes.', zh: '接收订单重要变化。', ja: '注文の重要な変更を受け取れます。' },
  safe: { es: 'Seguro', en: 'Safe', zh: '安全', ja: '安全' },
  safeText: { es: 'Tus datos ayudan a entregar mejor y evitar pedidos falsos.', en: 'Your data helps delivery and prevents fake orders.', zh: '你的资料有助于更好配送并避免虚假订单。', ja: '情報により配送がスムーズになり、偽注文を防げます。' },
  tip: { es: 'Tip Pollazo', en: 'Pollazo tip', zh: 'Pollazo 提示', ja: 'Pollazo ヒント' },
  startOrder: { es: 'Primero arma tu pedido', en: 'Build your order first', zh: '先创建你的订单', ja: 'まず注文を作成' },
  startOrderText: { es: 'Puedes mirar el catálogo, agregar productos y registrarte al confirmar. Tu historial se guardará con tu WhatsApp.', en: 'You can browse the catalog, add products and register when confirming. Your history will be saved with WhatsApp.', zh: '你可以浏览目录、添加商品，并在确认时注册。你的记录会通过 WhatsApp 保存。', ja: 'カタログを見て商品を追加し、確認時に登録できます。履歴はWhatsAppに紐づいて保存されます。' },
  viewCatalog: { es: 'Ver catálogo', en: 'View catalog', pt: 'Ver catálogo', fr: 'Voir le catalogue', de: 'Katalog ansehen', it: 'Vedi catalogo', zh: '查看目录', ja: 'カタログを見る', nl: 'Catalogus bekijken', ru: 'Открыть каталог' },
  firstOrderPending: { es: 'Primer pedido pendiente', en: 'First order pending', zh: '等待第一个订单', ja: '最初の注文を待っています' },
  saved: { es: 'Se guarda', en: 'Saved', zh: '已保存', ja: '保存' },
  tracked: { es: 'Se rastrea', en: 'Tracked', zh: '可追踪', ja: '追跡' },
  repeated: { es: 'Se repite', en: 'Repeated', zh: '可再订', ja: '再注文' },
  historyKicker: { es: 'Mi historial Pollazo', en: 'My Pollazo history', zh: '我的 Pollazo 记录', ja: 'Pollazo 注文履歴' },
  historyTitle: { es: 'Mis pedidos', en: 'My orders', zh: '我的订单', ja: '注文履歴' },
  historyText: { es: '{name}aquí puedes ver, repetir y revisar tus compras.', en: '{name}here you can view, repeat and review your purchases.', zh: '{name}这里可以查看、重复和检查你的购买。', ja: '{name}ここで購入履歴の確認・再注文ができます。' },
  refreshOrders: { es: 'Actualizar pedidos', en: 'Refresh orders', zh: '刷新订单', ja: '注文を更新' },
  active: { es: 'Activos', en: 'Active', zh: '进行中', ja: '進行中' },
  delivered: { es: 'Entregados', en: 'Delivered', zh: '已送达', ja: '配達済み' },
  cancelled: { es: 'Cancelados', en: 'Cancelled', zh: '已取消', ja: 'キャンセル' },
  all: { es: 'Todos', en: 'All', zh: '全部', ja: 'すべて' },
  bought: { es: 'Comprado', en: 'Purchased', zh: '已购买', ja: '購入額' },
  favoriteProduct: { es: 'Tu producto más repetido', en: 'Your most repeated product', zh: '你最常购买的商品', ja: 'よく購入する商品' },
  searchPlaceholder: { es: 'Buscar por código, producto o estado...', en: 'Search by code, product or status...', zh: '按编号、商品或状态搜索...', ja: 'コード・商品・状態で検索...' },
  period: { es: 'Periodo', en: 'Period', zh: '期间', ja: '期間' },
  sevenDays: { es: '7 días', en: '7 days', zh: '7 天', ja: '7日' },
  fifteenDays: { es: '15 días', en: '15 days', zh: '15 天', ja: '15日' },
  thirtyDays: { es: '30 días', en: '30 days', zh: '30 天', ja: '30日' },
  threeMonths: { es: '3 meses', en: '3 months', zh: '3 个月', ja: '3か月' },
  sixMonths: { es: '6 meses', en: '6 months', zh: '6 个月', ja: '6か月' },
  clean: { es: 'Limpiar', en: 'Clear', zh: '清除', ja: 'クリア' },
  loading: { es: 'Cargando tus pedidos...', en: 'Loading your orders...', zh: '正在加载订单...', ja: '注文を読み込み中...' },
  noOrders: { es: 'Aún no tienes pedidos', en: 'You do not have orders yet', zh: '你还没有订单', ja: 'まだ注文はありません' },
  noOrdersText: { es: 'Cuando hagas tu primera compra, aparecerá aquí con fecha, estado, detalle, rastreo y opción para repetir.', en: 'When you make your first purchase, it will appear here with date, status, details, tracking and repeat option.', zh: '首次购买后，这里会显示日期、状态、详情、追踪和再订选项。', ja: '最初の購入後、日付・状態・詳細・追跡・再注文がここに表示されます。' },
  noResults: { es: 'No encontramos pedidos', en: 'No orders found', zh: '未找到订单', ja: '注文が見つかりません' },
  noResultsText: { es: 'Prueba cambiando el periodo, limpiando filtros o buscando otro producto.', en: 'Try changing the period, clearing filters or searching for another product.', zh: '请更改期间、清除筛选或搜索其他商品。', ja: '期間変更、フィルター解除、別の商品検索をお試しください。' },
  goCatalog: { es: 'Ir al catálogo', en: 'Go to catalog', zh: '前往目录', ja: 'カタログへ' },
  detail: { es: 'Detalle', en: 'Details', zh: '详情', ja: '詳細' },
  status: { es: 'Estado', en: 'Status', zh: '状态', ja: '状態' },
  view: { es: 'Ver', en: 'View', zh: '查看', ja: '見る' },
  review: { es: 'Opinar', en: 'Review', zh: '评价', ja: 'レビュー' },
  detailTitle: { es: 'Detalle de pedido', en: 'Order details', zh: '订单详情', ja: '注文詳細' },
  order: { es: 'Pedido', en: 'Order', zh: '订单', ja: '注文' },
  plusApplied: { es: 'Plus aplicado', en: 'Plus applied', zh: '已应用 Plus', ja: 'Plus 適用' },
  products: { es: 'Productos', en: 'Products', zh: '商品', ja: '商品' },
  product: { es: 'Producto', en: 'Product', zh: '商品', ja: '商品' },
  moreProducts: { es: '+{count} producto{plural} más', en: '+{count} more product{plural}', zh: '+{count} 件更多商品', ja: '+{count} 点追加' },
  unit: { es: 'Unitario', en: 'Unit', zh: '单价', ja: '単価' },
  plusGifts: { es: 'Regalos Plus', en: 'Plus gifts', zh: 'Plus 礼物', ja: 'Plus ギフト' },
  payment: { es: 'Pago', en: 'Payment', zh: '付款', ja: '支払い' },
  delivery: { es: 'Entrega', en: 'Delivery', zh: '配送', ja: '配送' },
  subtotal: { es: 'Subtotal', en: 'Subtotal', zh: '小计', ja: '小計' },
  deliveryFee: { es: 'Delivery', en: 'Delivery', zh: '配送费', ja: '配送料' },
  free: { es: 'Gratis', en: 'Free', zh: '免费', ja: '無料' },
  total: { es: 'Total', en: 'Total', zh: '总计', ja: '合計' },
  deliveryReference: { es: 'Referencia de entrega', en: 'Delivery reference', zh: '配送参考', ja: '配送メモ' },
  viewStatus: { es: 'Ver estado', en: 'View status', zh: '查看状态', ja: '状態を見る' },
  repeatOrder: { es: 'Repetir pedido', en: 'Repeat order', zh: '重复订单', ja: '注文を再注文' },
  repeatQuestion: { es: '¿Cómo quieres agregarlo?', en: 'How do you want to add it?', zh: '你想如何添加？', ja: 'どのように追加しますか？' },
  repeatHelp: { es: 'Ya tienes productos en el carrito. Puedes reemplazarlos o sumar este pedido a lo que ya tienes.', en: 'You already have products in your cart. You can replace them or add this order to what you have.', zh: '购物车里已有商品。你可以替换或把此订单添加进去。', ja: 'カートに商品があります。置き換えるか、この注文を追加できます。' },
  replaceCart: { es: 'Reemplazar carrito', en: 'Replace cart', zh: '替换购物车', ja: 'カートを置き換える' },
  addToCurrentCart: { es: 'Agregar al carrito actual', en: 'Add to current cart', zh: '添加到当前购物车', ja: '現在のカートに追加' },
  addedToCart: { es: 'Pedido {code} agregado al carrito.', en: 'Order {code} added to cart.', zh: '订单 {code} 已加入购物车。', ja: '注文 {code} をカートに追加しました。' },
  noRepeatProducts: { es: 'Este pedido no tiene productos para repetir.', en: 'This order has no products to repeat.', zh: '此订单没有可重复购买的商品。', ja: 'この注文には再注文できる商品がありません。' },
  statusPorConfirmar: { es: 'Por confirmar', en: 'To confirm', zh: '待确认', ja: '確認待ち' },
  statusRecibido: { es: 'Recibido', en: 'Confirmed', zh: '已确认', ja: '確認済み' },
  statusPreparando: { es: 'Preparando', en: 'Packing', zh: '打包中', ja: '準備中' },
  statusEnviado: { es: 'Enviado', en: 'On the way', zh: '配送中', ja: '配送中' },
  statusEntregado: { es: 'Entregado', en: 'Delivered', zh: '已送达', ja: '配達済み' },
  statusCancelado: { es: 'Cancelado', en: 'Cancelled', zh: '已取消', ja: 'キャンセル' },
  paymentContra: { es: 'Contra entrega', en: 'Pay on delivery', zh: '货到付款', ja: '代金引換' },
  paymentValidating: { es: 'Validando pago', en: 'Validating payment', zh: '正在验证付款', ja: '支払い確認中' },
  paymentConfirmed: { es: 'Pago confirmado', en: 'Payment confirmed', zh: '付款已确认', ja: '支払い確認済み' },
  paymentRejected: { es: 'Pago rechazado', en: 'Payment rejected', zh: '付款被拒绝', ja: '支払い拒否' },
  paymentPending: { es: 'Pago pendiente', en: 'Payment pending', zh: '待付款', ja: '支払い保留中' },
} as const;

const STATUS_FILTERS: Array<{ id: StatusFilter; labelKey: TextKey }> = [
  { id: 'active', labelKey: 'active' },
  { id: 'delivered', labelKey: 'delivered' },
  { id: 'cancelled', labelKey: 'cancelled' },
  { id: 'all', labelKey: 'all' },
];

const RANGE_FILTERS: Array<{ id: RangeFilter; labelKey: TextKey }> = [
  { id: '7d', labelKey: 'sevenDays' },
  { id: '15d', labelKey: 'fifteenDays' },
  { id: '30d', labelKey: 'thirtyDays' },
  { id: '3m', labelKey: 'threeMonths' },
  { id: '6m', labelKey: 'sixMonths' },
  { id: 'all', labelKey: 'all' },
];

const pickText = (entry: LangText, language: LanguageCode) => entry[language] || entry.en || entry.es;

const tx = (language: LanguageCode, key: TextKey, params?: Record<string, string | number>) => {
  const base = pickText(TEXTS[key], language);
  if (!params) return base;

  return Object.entries(params).reduce(
    (current, [paramKey, value]) => current.replaceAll(`{${paramKey}}`, String(value)),
    base
  );
};

const localeOf = (language: LanguageCode) => {
  if (language === 'es') return 'es-EC';
  if (language === 'zh') return 'zh-CN';
  if (language === 'ja') return 'ja-JP';
  if (language === 'pt') return 'pt-BR';
  if (language === 'fr') return 'fr-FR';
  if (language === 'de') return 'de-DE';
  if (language === 'it') return 'it-IT';
  if (language === 'nl') return 'nl-NL';
  if (language === 'ru') return 'ru-RU';
  return 'en-US';
};

const cleanPhoneTail = (phone?: string | null) => String(phone || '').replace(/\D/g, '').slice(-9);

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value || '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => toNumber(value).toFixed(2);

const getOrderDate = (order: Order) => order.created_at || order.updated_at || '';

const formatDate = (value: string | null | undefined, language: LanguageCode) => {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return language === 'es' ? 'Sin fecha' : 'No date';

  return date.toLocaleDateString(localeOf(language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (value: string | null | undefined, language: LanguageCode) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString(localeOf(language), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: language === 'es' || language === 'en',
  });
};

const rangeToMs = (range: RangeFilter) => {
  const day = 24 * 60 * 60 * 1000;
  if (range === '7d') return day * 7;
  if (range === '15d') return day * 15;
  if (range === '30d') return day * 30;
  if (range === '3m') return day * 90;
  if (range === '6m') return day * 180;
  return Infinity;
};

const statusTone = (status: OrderStatus) => {
  if (status === 'Por Confirmar') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (status === 'Recibido') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'Preparando') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (status === 'Enviado') return 'bg-purple-50 text-purple-600 border-purple-100';
  if (status === 'Entregado') return 'bg-green-50 text-green-600 border-green-100';
  return 'bg-red-50 text-red-500 border-red-100';
};

const statusIcon = (status: OrderStatus) => {
  if (status === 'Entregado') return <CheckCircle2 size={15} />;
  if (status === 'Cancelado') return <XCircle size={15} />;
  if (status === 'Enviado') return <Truck size={15} />;
  if (status === 'Preparando') return <ShoppingBag size={15} />;
  return <Clock3 size={15} />;
};

const statusLabel = (status: OrderStatus, language: LanguageCode) => {
  if (status === 'Por Confirmar') return tx(language, 'statusPorConfirmar');
  if (status === 'Recibido') return tx(language, 'statusRecibido');
  if (status === 'Preparando') return tx(language, 'statusPreparando');
  if (status === 'Enviado') return tx(language, 'statusEnviado');
  if (status === 'Entregado') return tx(language, 'statusEntregado');
  return tx(language, 'statusCancelado');
};

const paymentLabel = (status: PaymentStatus | null | undefined, language: LanguageCode) => {
  if (status === 'contra_entrega') return tx(language, 'paymentContra');
  if (status === 'validando') return tx(language, 'paymentValidating');
  if (status === 'confirmado') return tx(language, 'paymentConfirmed');
  if (status === 'rechazado') return tx(language, 'paymentRejected');
  return tx(language, 'paymentPending');
};

const paymentTone = (status: PaymentStatus | null | undefined) => {
  if (status === 'confirmado') return 'text-green-600 bg-green-50 border-green-100';
  if (status === 'validando') return 'text-blue-600 bg-blue-50 border-blue-100';
  if (status === 'rechazado') return 'text-red-500 bg-red-50 border-red-100';
  if (status === 'contra_entrega') return 'text-orange-600 bg-orange-50 border-orange-100';
  return 'text-gray-500 bg-gray-50 border-gray-100';
};

const isActiveOrder = (order: Order) => ACTIVE_STATUSES.includes(order.status);

const getOrderItemsCount = (order: Order) => {
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
};

const getItemUnitPrice = (item: OrderItem) => {
  const quantity = Math.max(1, Number(item.quantity || 1));
  const direct =
    toNumber(item.custom_price) ||
    toNumber(item.price) ||
    toNumber(item.product?.custom_price) ||
    toNumber(item.product?.price);

  if (direct > 0) return direct;

  const subtotal = toNumber(item.subtotal);
  return subtotal > 0 ? subtotal / quantity : 0;
};

const normalizeCategory = (value: unknown): Category => {
  const category = String(value || '').trim();
  const validCategories: Category[] = [
    'Pollos',
    'Embutidos',
    'Lácteos y refrigerados',
    'Abarrotes y básicos',
    'Salsas, aliños y aceites',
    'Bebidas',
    'Frutas y verduras',
    'Snacks y dulces',
    'Cuidado personal',
    'Limpieza y hogar',
  ];

  return validCategories.includes(category as Category) ? (category as Category) : 'Abarrotes y básicos';
};

const productFromOrderItem = (item: OrderItem, index: number, orderCode = 'order'): Product => {
  const unitPrice = getItemUnitPrice(item);
  const snapshot = item.product;
  const id = item.product_id || item.cart_item_id || snapshot?.id || item.id || `repeat-${orderCode}-${index}`;
  const customPrice =
    toNumber(item.custom_price) > 0
      ? toNumber(item.custom_price)
      : toNumber(snapshot?.custom_price) > 0
        ? toNumber(snapshot?.custom_price)
        : undefined;

  return {
    ...(snapshot || {}),
    id: String(id),
    name: item.name || snapshot?.name || 'Producto',
    category: normalizeCategory(item.category || snapshot?.category),
    subcategory: snapshot?.subcategory || null,
    description: snapshot?.description || null,
    unit: snapshot?.unit || null,
    badge: snapshot?.badge || null,
    price: unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : item.price_text || snapshot?.price || 'Consultar precio',
    image: item.image || snapshot?.image || null,
    custom_price: customPrice,
    available: true,
  };
};

const productFromName = (name: string): Product => ({
  id: `name-${name}`,
  name: name || 'Producto',
  category: 'Abarrotes y básicos',
  price: null,
  image: null,
  available: true,
});

function MiniFeature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="bg-white/90 border border-white rounded-[24px] p-3 shadow-sm">
      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-[10px] font-black text-gray-950 uppercase leading-tight">{title}</p>
      <p className="text-[9px] font-bold text-gray-400 leading-relaxed mt-1">{text}</p>
    </div>
  );
}

function GuestOrdersScreen({
  onOpenProfile,
  onNavigate,
  language,
}: {
  onOpenProfile: () => void;
  onNavigate: (screen: Screen) => void;
  language: LanguageCode;
}) {
  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-5 pb-32 space-y-4">
      <section className="relative overflow-hidden rounded-[42px] bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 text-white p-6 shadow-2xl shadow-orange-100">
        <div className="absolute -right-20 -top-20 w-56 h-56 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-24 w-56 h-56 bg-yellow-200/25 rounded-full blur-3xl" />

        <div className="relative">
          <div className="w-17 h-17 rounded-[28px] bg-white/20 border border-white/25 flex items-center justify-center mb-5 shadow-inner">
            <ReceiptText size={38} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">{tx(language, 'guestKicker')}</p>
          <h1 className="text-4xl font-black uppercase italic leading-none mt-2 tracking-tight">{tx(language, 'guestTitle')}</h1>
          <p className="text-sm font-bold text-white/85 leading-relaxed mt-4">{tx(language, 'guestText')}</p>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <div className="bg-white/15 border border-white/20 rounded-2xl p-3">
              <p className="text-xl font-black leading-none">1</p>
              <p className="text-[8px] font-black uppercase text-white/75 mt-1">{tx(language, 'liveStatus')}</p>
            </div>
            <div className="bg-white/15 border border-white/20 rounded-2xl p-3">
              <p className="text-xl font-black leading-none">2</p>
              <p className="text-[8px] font-black uppercase text-white/75 mt-1">{tx(language, 'quickRepeat')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            className="mt-6 w-full bg-white text-orange-600 rounded-[26px] px-6 py-4 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-700/10 flex items-center justify-center gap-2"
          >
            <UserCheck size={17} />
            {tx(language, 'identify')}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MiniFeature icon={<Truck size={19} />} title={tx(language, 'tracking')} text={tx(language, 'trackingText')} />
        <MiniFeature icon={<Repeat2 size={19} />} title={tx(language, 'repeat')} text={tx(language, 'repeatText')} />
        <MiniFeature icon={<BellRing size={19} />} title={tx(language, 'alerts')} text={tx(language, 'alertsText')} />
        <MiniFeature icon={<ShieldCheck size={19} />} title={tx(language, 'safe')} text={tx(language, 'safeText')} />
      </section>

      <section className="bg-white rounded-[32px] border border-orange-100 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-[22px] bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
            <Sparkles size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{tx(language, 'tip')}</p>
            <h2 className="text-base font-black text-gray-950 uppercase italic leading-none mt-1">{tx(language, 'startOrder')}</h2>
            <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">{tx(language, 'startOrderText')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="mt-4 w-full bg-orange-50 text-orange-600 border border-orange-100 rounded-[22px] py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {tx(language, 'viewCatalog')}
          <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  kind = 'default',
  language,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  kind?: 'default' | 'no-orders';
  language: LanguageCode;
}) {
  if (kind === 'no-orders') {
    return (
      <section className="relative overflow-hidden bg-white rounded-[36px] border border-orange-100 p-6 text-center shadow-sm">
        <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 w-44 h-44 rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="relative">
          <div className="w-22 h-22 rounded-[34px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-100">
            <PackageSearch size={40} />
          </div>
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.26em]">{tx(language, 'firstOrderPending')}</p>
          <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">{title}</h3>
          <p className="text-sm font-bold text-gray-500 leading-relaxed mt-4">{message}</p>
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
              <ReceiptText size={18} className="mx-auto text-orange-500 mb-1" />
              <p className="text-[7px] font-black text-orange-600 uppercase">{tx(language, 'saved')}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
              <Truck size={18} className="mx-auto text-yellow-700 mb-1" />
              <p className="text-[7px] font-black text-yellow-700 uppercase">{tx(language, 'tracked')}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
              <Repeat2 size={18} className="mx-auto text-green-600 mb-1" />
              <p className="text-[7px] font-black text-green-600 uppercase">{tx(language, 'repeated')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAction}
            className="mt-6 w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-6 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {actionLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-[32px] border border-orange-100 p-8 text-center shadow-sm">
      <div className="w-20 h-20 rounded-[30px] bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-5">
        <PackageSearch size={36} />
      </div>
      <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none">{title}</h3>
      <p className="text-sm font-bold text-gray-400 leading-relaxed mt-3">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-6 bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-6 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-transform"
      >
        {actionLabel}
      </button>
    </section>
  );
}

function OrderMiniItems({ order, language }: { order: Order; language: LanguageCode }) {
  const visibleItems = (order.items || []).slice(0, 3);
  const hiddenCount = Math.max(0, (order.items || []).length - visibleItems.length);

  return (
    <div className="space-y-1.5">
      {visibleItems.map((item, index) => {
        const product = productFromOrderItem(item, index, order.order_code);
        const display = getProductDisplay(product, language);

        return (
          <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 text-[10px] font-bold">
            <span className="min-w-0 truncate text-gray-600">
              <span className="font-black text-orange-500">{Number(item.quantity || 1)}x</span>{' '}
              {display.name}
            </span>
            <span className="text-gray-400 font-black flex-shrink-0">
              ${money(item.subtotal || getItemUnitPrice(item) * Number(item.quantity || 1))}
            </span>
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <p className="text-[9px] font-black text-orange-500 uppercase">
          {tx(language, 'moreProducts', { count: hiddenCount, plural: hiddenCount === 1 ? '' : 's' })}
        </p>
      )}
    </div>
  );
}

function OrderDetailSheet({
  order,
  onClose,
  onRepeat,
  onFeedback,
  onOpenTracking,
  language,
}: {
  order: Order | null;
  onClose: () => void;
  onRepeat: (order: Order) => void;
  onFeedback: (order: Order) => void;
  onOpenTracking: () => void;
  language: LanguageCode;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[12000] flex items-end justify-center">
      <button type="button" aria-label="Cerrar detalle de pedido" onClick={onClose} className="absolute inset-0 bg-orange-950/25" />

      <section className="relative w-full max-w-md max-h-[88vh] bg-white rounded-t-[38px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 text-white p-5 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-36 h-36 bg-white/20 rounded-full blur-2xl" />
          <button type="button" onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform z-10" aria-label="Cerrar">
            <X size={19} />
          </button>
          <div className="relative pr-12">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/75">{tx(language, 'detailTitle')}</p>
            <h2 className="text-2xl font-black uppercase italic leading-none mt-2">{order.order_code || tx(language, 'order')}</h2>
            <p className="text-[11px] font-bold text-white/80 mt-2">
              {formatDate(getOrderDate(order), language)} · {formatTime(getOrderDate(order), language)}
            </p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white/20 border border-white/25 rounded-full px-3 py-1.5 text-[9px] font-black uppercase">
                {statusIcon(order.status)}
                {statusLabel(order.status, language)}
              </span>
              {order.membership_applied && (
                <span className="inline-flex items-center gap-1 bg-yellow-200 text-yellow-900 border border-yellow-100 rounded-full px-3 py-1.5 text-[9px] font-black uppercase">
                  <Crown size={12} />
                  {tx(language, 'plusApplied')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(88vh-210px)] space-y-4">
          <div className="bg-orange-50/70 border border-orange-100 rounded-[28px] p-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">{tx(language, 'products')}</p>
            <div className="space-y-2">
              {(order.items || []).map((item, index) => {
                const quantity = Number(item.quantity || 1);
                const lineTotal = toNumber(item.subtotal || getItemUnitPrice(item) * quantity);
                const product = productFromOrderItem(item, index, order.order_code);
                const display = getProductDisplay(product, language);

                return (
                  <div key={`${item.name}-${index}`} className="bg-white rounded-2xl border border-orange-100 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-gray-900 uppercase truncate">{quantity}x {display.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 mt-1">{tx(language, 'unit')} ${money(getItemUnitPrice(item))}</p>
                    </div>
                    <span className="text-sm font-black text-orange-600">${money(lineTotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {Array.isArray(order.bonus_items) && order.bonus_items.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-[28px] p-4">
              <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Gift size={14} />
                {tx(language, 'plusGifts')}
              </p>
              <div className="space-y-2">
                {order.bonus_items.map((gift, index) => (
                  <div key={`${gift.item_name}-${index}`} className="bg-white rounded-2xl p-3 border border-yellow-100">
                    <p className="text-[11px] font-black text-gray-900 uppercase">{Number(gift.quantity || 1)}x {gift.item_name}</p>
                    {gift.message && <p className="text-[10px] font-bold text-gray-400 mt-1">{gift.message}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase">{tx(language, 'payment')}</p>
              <p className={`mt-2 inline-flex px-2 py-1 rounded-xl border text-[9px] font-black uppercase ${paymentTone(order.payment_status)}`}>{paymentLabel(order.payment_status, language)}</p>
            </div>
            <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase">{tx(language, 'delivery')}</p>
              <p className="text-[11px] font-black text-gray-700 uppercase mt-2">{order.delivery_type || 'domicilio'}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[28px] p-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span>{tx(language, 'subtotal')}</span>
                <span>${money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span>{tx(language, 'deliveryFee')}</span>
                <span>{toNumber(order.delivery_fee_final ?? order.delivery_fee) <= 0 ? tx(language, 'free') : `$${money(order.delivery_fee_final ?? order.delivery_fee)}`}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-xs font-black text-gray-900 uppercase">{tx(language, 'total')}</span>
                <span className="text-2xl font-black text-orange-600">${money(order.total)}</span>
              </div>
            </div>
          </div>

          {order.reference && (
            <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-4">
              <p className="text-[9px] font-black text-orange-600 uppercase">{tx(language, 'deliveryReference')}</p>
              <p className="text-[11px] font-bold text-orange-800 mt-1 leading-relaxed">{order.reference}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onRepeat(order)} className="bg-orange-50 text-orange-600 border border-orange-100 rounded-[22px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Repeat2 size={16} />
            {tx(language, 'repeat')}
          </button>
          {isActiveOrder(order) ? (
            <button type="button" onClick={() => { onClose(); onOpenTracking(); }} className="bg-orange-500 text-white rounded-[22px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-100">
              <Truck size={16} />
              {tx(language, 'viewStatus')}
            </button>
          ) : (
            <button type="button" onClick={() => onFeedback(order)} className="bg-green-500 text-white rounded-[22px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-100">
              <MessageCircle size={16} />
              {tx(language, 'review')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function RepeatChoiceSheet({
  order,
  onClose,
  onConfirm,
  language,
}: {
  order: Order | null;
  onClose: () => void;
  onConfirm: (mode: RepeatMode) => void;
  language: LanguageCode;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[12100] flex items-end justify-center">
      <button type="button" aria-label="Cerrar repetir pedido" onClick={onClose} className="absolute inset-0 bg-orange-950/25" />
      <section className="relative w-full max-w-md bg-white rounded-t-[34px] p-5 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-90 transition-transform" aria-label="Cerrar">
          <X size={18} />
        </button>
        <div className="pr-10">
          <div className="w-14 h-14 rounded-[24px] bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Repeat2 size={28} />
          </div>
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">{tx(language, 'repeatOrder')}</p>
          <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">{tx(language, 'repeatQuestion')}</h3>
          <p className="text-[12px] font-bold text-gray-500 mt-3 leading-relaxed">{tx(language, 'repeatHelp')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 mt-5">
          <button type="button" onClick={() => onConfirm('replace')} className="w-full bg-orange-500 text-white rounded-[24px] py-4 font-black uppercase text-xs tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-100">
            {tx(language, 'replaceCart')}
          </button>
          <button type="button" onClick={() => onConfirm('add')} className="w-full bg-orange-50 text-orange-600 border border-orange-100 rounded-[24px] py-4 font-black uppercase text-xs tracking-widest active:scale-95 transition-transform">
            {tx(language, 'addToCurrentCart')}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function OrdersScreen({
  onNavigate,
  onOpenProfile,
  onOpenTracking,
}: Props) {
  const { orders, loading, refreshData } = useAdmin();
  const { addItem, clearCart, items: cartItems } = useCart();
  const { customerPhone, customerName } = useUser();
  const { language } = useLanguage();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('30d');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [repeatTarget, setRepeatTarget] = useState<Order | null>(null);
  const [notice, setNotice] = useState('');

  const cleanCustomerPhone = cleanPhoneTail(customerPhone);

  const customerOrders = useMemo(() => {
    if (!cleanCustomerPhone) return [];

    return [...(orders || [])]
      .filter(order => cleanPhoneTail(order.customer_phone) === cleanCustomerPhone)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || '').getTime();
        const dateB = new Date(b.created_at || b.updated_at || '').getTime();
        return dateB - dateA;
      });
  }, [cleanCustomerPhone, orders]);

  const stats = useMemo(() => {
    const delivered = customerOrders.filter(order => order.status === 'Entregado');
    const active = customerOrders.filter(isActiveOrder);
    const cancelled = customerOrders.filter(order => order.status === 'Cancelado');
    const spent = delivered.reduce((sum, order) => sum + toNumber(order.total), 0);
    const productMap = new Map<string, number>();

    delivered.forEach(order => {
      (order.items || []).forEach(item => {
        const name = item.name || item.product?.name || 'Producto';
        const quantity = Number(item.quantity || 1);
        productMap.set(name, (productMap.get(name) || 0) + quantity);
      });
    });

    const favorite = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    return { active: active.length, delivered: delivered.length, cancelled: cancelled.length, spent, favorite };
  }, [customerOrders]);

  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const rangeMs = rangeToMs(rangeFilter);
    const query = search.trim().toLowerCase();

    return customerOrders.filter(order => {
      if (statusFilter === 'active' && !isActiveOrder(order)) return false;
      if (statusFilter === 'delivered' && order.status !== 'Entregado') return false;
      if (statusFilter === 'cancelled' && order.status !== 'Cancelado') return false;

      if (Number.isFinite(rangeMs)) {
        const orderTime = new Date(getOrderDate(order)).getTime();
        if (!orderTime || Number.isNaN(orderTime) || now - orderTime > rangeMs) return false;
      }

      if (!query) return true;

      const haystack = [
        order.order_code,
        statusLabel(order.status, language),
        order.status,
        paymentLabel(order.payment_status, language),
        order.payment_status,
        order.total,
        order.reference,
        ...(order.items || []).map((item, index) => {
          const product = productFromOrderItem(item, index, order.order_code);
          return `${item.name || item.product?.name || ''} ${getProductDisplay(product, language).name}`;
        }),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [customerOrders, language, rangeFilter, search, statusFilter]);

  const handleRepeatNow = (order: Order, mode: RepeatMode) => {
    if (mode === 'replace') clearCart();

    (order.items || []).forEach((item, index) => {
      const product = productFromOrderItem(item, index, order.order_code);
      const quantity = Math.max(1, Number(item.quantity || 1));
      addItem(product, quantity);
    });

    setRepeatTarget(null);
    setSelectedOrder(null);
    setNotice(tx(language, 'addedToCart', { code: order.order_code || '' }).trim());

    window.setTimeout(() => {
      setNotice('');
      onNavigate('cart');
    }, 650);
  };

  const requestRepeat = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      setNotice(tx(language, 'noRepeatProducts'));
      return;
    }

    if (cartItems.length > 0) {
      setRepeatTarget(order);
      return;
    }

    handleRepeatNow(order, 'replace');
  };

  const handleFeedback = (order: Order) => {
    const message = encodeURIComponent(
      `Hola, quiero opinar sobre mi pedido ${order.order_code || ''} en La Casa del Pollazo.`
    );

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const resetFilters = () => {
    setStatusFilter('active');
    setRangeFilter('30d');
    setSearch('');
  };

  if (!cleanCustomerPhone) {
    return <GuestOrdersScreen onOpenProfile={onOpenProfile} onNavigate={onNavigate} language={language} />;
  }

  const favoriteProductName = stats.favorite
    ? getProductDisplay(productFromName(stats.favorite), language).name
    : '';

  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-4 pb-32 space-y-4">
      <section className="relative overflow-hidden rounded-[36px] bg-white border border-orange-100 p-5 shadow-sm">
        <div className="absolute -right-14 -top-14 w-44 h-44 bg-orange-200/35 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">{tx(language, 'historyKicker')}</p>
              <h1 className="text-3xl font-black text-gray-950 uppercase italic leading-none mt-2">{tx(language, 'historyTitle')}</h1>
              <p className="text-[12px] font-bold text-gray-500 mt-2 leading-relaxed">
                {tx(language, 'historyText', { name: customerName ? `${customerName}, ` : '' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshData()}
              className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center active:scale-90 transition-transform border border-orange-100"
              aria-label={tx(language, 'refreshOrders')}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="bg-orange-50 border border-orange-100 rounded-[22px] p-3">
              <p className="text-xl font-black text-orange-600 leading-none">{stats.active}</p>
              <p className="text-[8px] font-black text-orange-500 uppercase mt-2">{tx(language, 'active')}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-[22px] p-3">
              <p className="text-xl font-black text-green-600 leading-none">{stats.delivered}</p>
              <p className="text-[8px] font-black text-green-600 uppercase mt-2">{tx(language, 'delivered')}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-[22px] p-3">
              <p className="text-xl font-black text-yellow-700 leading-none">${money(stats.spent)}</p>
              <p className="text-[8px] font-black text-yellow-700 uppercase mt-2">{tx(language, 'bought')}</p>
            </div>
          </div>

          {stats.favorite && (
            <div className="mt-3 bg-white border border-orange-100 rounded-[24px] p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <Star size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase">{tx(language, 'favoriteProduct')}</p>
                <p className="text-[11px] font-black text-gray-900 uppercase truncate mt-1">{favoriteProductName}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {notice && (
        <div className="bg-green-50 border border-green-100 rounded-[24px] p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          <p className="text-[11px] font-black text-green-700 uppercase leading-relaxed">{notice}</p>
        </div>
      )}

      <section className="bg-white rounded-[32px] border border-orange-100 p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={tx(language, 'searchPlaceholder')}
            className="w-full bg-orange-50/60 border border-orange-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-gray-800 outline-none focus:border-orange-300"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                statusFilter === filter.id
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                  : 'bg-white text-gray-400 border-gray-100'
              }`}
            >
              {tx(language, filter.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="flex-shrink-0 flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase px-2">
            <CalendarDays size={13} />
            {tx(language, 'period')}
          </div>
          {RANGE_FILTERS.map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setRangeFilter(filter.id)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                rangeFilter === filter.id
                  ? 'bg-yellow-400 text-yellow-950 border-yellow-400'
                  : 'bg-gray-50 text-gray-400 border-gray-100'
              }`}
            >
              {tx(language, filter.labelKey)}
            </button>
          ))}
          {(statusFilter !== 'active' || rangeFilter !== '30d' || search) && (
            <button type="button" onClick={resetFilters} className="flex-shrink-0 px-3.5 py-2.5 rounded-xl bg-gray-900 text-white text-[9px] font-black uppercase">
              {tx(language, 'clean')}
            </button>
          )}
        </div>
      </section>

      {loading && customerOrders.length === 0 ? (
        <section className="bg-white rounded-[32px] border border-orange-100 p-8 text-center shadow-sm">
          <RefreshCw size={34} className="mx-auto text-orange-500 animate-spin mb-4" />
          <p className="text-xs font-black text-gray-500 uppercase">{tx(language, 'loading')}</p>
        </section>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={customerOrders.length === 0 ? tx(language, 'noOrders') : tx(language, 'noResults')}
          message={customerOrders.length === 0 ? tx(language, 'noOrdersText') : tx(language, 'noResultsText')}
          actionLabel={customerOrders.length === 0 ? tx(language, 'goCatalog') : tx(language, 'clean')}
          onAction={customerOrders.length === 0 ? () => onNavigate('catalog') : resetFilters}
          kind={customerOrders.length === 0 ? 'no-orders' : 'default'}
          language={language}
        />
      ) : (
        <section className="space-y-3">
          {filteredOrders.map(order => {
            const itemCount = getOrderItemsCount(order);
            const active = isActiveOrder(order);

            return (
              <article key={order.id} className="bg-white rounded-[32px] border border-orange-100 p-4 shadow-sm active:scale-[0.99] transition-transform">
                <button type="button" onClick={() => setSelectedOrder(order)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase ${statusTone(order.status)}`}>
                          {statusIcon(order.status)}
                          {statusLabel(order.status, language)}
                        </span>
                        {order.membership_applied && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100 text-[8px] font-black uppercase">
                            <Crown size={11} />
                            Plus
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-gray-950 uppercase mt-3 leading-none">{order.order_code || tx(language, 'order')}</h3>
                      <p className="text-[10px] font-bold text-gray-400 mt-2">
                        {formatDate(getOrderDate(order), language)} · {formatTime(getOrderDate(order), language)} · {tx(language, 'unitsSummary' as TextKey, { count: itemCount }) || `${itemCount} ${tx(language, 'products').toLowerCase()}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-orange-600 leading-none">${money(order.total)}</p>
                      <p className={`inline-flex mt-2 px-2 py-1 rounded-lg border text-[8px] font-black uppercase ${paymentTone(order.payment_status)}`}>
                        {paymentLabel(order.payment_status, language)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 bg-orange-50/60 border border-orange-100/70 rounded-[24px] p-3">
                    <OrderMiniItems order={order} language={language} />
                  </div>
                </button>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button type="button" onClick={() => setSelectedOrder(order)} className="bg-gray-50 text-gray-600 border border-gray-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1">
                    <ChevronDown size={14} />
                    {tx(language, 'detail')}
                  </button>
                  <button type="button" onClick={() => requestRepeat(order)} className="bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1">
                    <Repeat2 size={14} />
                    {tx(language, 'repeat')}
                  </button>
                  {active ? (
                    <button type="button" onClick={onOpenTracking} className="bg-orange-500 text-white rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-lg shadow-orange-100">
                      <Truck size={14} />
                      {tx(language, 'status')}
                    </button>
                  ) : order.status === 'Entregado' ? (
                    <button type="button" onClick={() => handleFeedback(order)} className="bg-green-50 text-green-600 border border-green-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1">
                      <MessageCircle size={14} />
                      {tx(language, 'review')}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setSelectedOrder(order)} className="bg-red-50 text-red-500 border border-red-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1">
                      <AlertCircle size={14} />
                      {tx(language, 'view')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <OrderDetailSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRepeat={requestRepeat}
        onFeedback={handleFeedback}
        onOpenTracking={onOpenTracking}
        language={language}
      />

      <RepeatChoiceSheet
        order={repeatTarget}
        onClose={() => setRepeatTarget(null)}
        onConfirm={mode => {
          if (repeatTarget) handleRepeatNow(repeatTarget, mode);
        }}
        language={language}
      />
    </div>
  );
}
