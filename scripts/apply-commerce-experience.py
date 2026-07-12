from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'No se encontró bloque en {path}: {old[:160]!r}')
    write(path, source.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, flags: int = re.S) -> None:
    source = read(path)
    updated, count = re.subn(pattern, replacement, source, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'No se pudo aplicar patrón en {path}: {pattern[:140]!r}')
    write(path, updated)


# -----------------------------------------------------------------------------
# WhatsApp y precios compartidos
# -----------------------------------------------------------------------------
whatsapp = read('src/utils/whatsapp.ts')
whatsapp = whatsapp.replace(
    "import type { CartItem, OrderStatus, PaymentMethod } from '../types';",
    "import type { CartItem, OrderStatus, PaymentMethod } from '../types';\nimport { calculateOrderPricing } from './commerce';",
    1,
)
whatsapp = whatsapp.replace("const FIRST_DELIVERY_PROMO_KEY = 'pollazo_first_delivery_free_active';\n", '', 1)
whatsapp = whatsapp.replace(
    "\n  // Pollazo Plus: solo con membresía activa el delivery va gratis.\n  hasPollazoPlus?: boolean;\n",
    '\n',
    1,
)
whatsapp, count = re.subn(
    r"export function deliveryFeeOf\(subtotal: number\): number \{.*?\n\}",
    """export function deliveryFeeOf(
  subtotal: number,
  customerLat?: number | null,
  customerLng?: number | null
): number {
  return calculateOrderPricing({ subtotal, customerLat, customerLng }).deliveryFeeFinal;
}""",
    whatsapp,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo reemplazar deliveryFeeOf')

build_whatsapp = r"export function buildWhatsAppUrl\(.*?\n\}\n\nexport function buildStatusWhatsAppUrl"
new_build_whatsapp = """export function buildWhatsAppUrl(
  items: CartItem[],
  customerPhone: string,
  customerName: string,
  code: string,
  preorder = false,
  options?: WhatsAppOptions
): string {
  const subtotal = subtotalOf(items);
  const pricing = calculateOrderPricing({
    subtotal,
    customerLat: options?.customerLat,
    customerLng: options?.customerLng,
  });

  const selectedBank =
    options?.selectedBank && BANK_LABELS[options.selectedBank]
      ? BANK_LABELS[options.selectedBank]
      : options?.selectedBank || 'No aplica';

  const locationText = buildLocationText(options);
  const deliveryText = pricing.freeDeliveryApplied
    ? 'Gratis por pedido grande 🎁'
    : formatMoney(pricing.deliveryFeeFinal);
  const smallOrderText =
    pricing.smallOrderFee > 0
      ? `\\nRecargo pedido pequeño: ${formatMoney(pricing.smallOrderFee)}`
      : '';

  const messageSections = [
    `Hola, soy ${customerName || 'cliente'} 👋`,
    `Necesito ayuda con mi pedido registrado en la app.`,
    `Código: ${code}`,
    preorder
      ? `Estado de horario: Pedido programado / tienda fuera de horario`
      : `Estado de horario: Tienda abierta`,
    `WhatsApp del cliente: ${customerPhone}`,
    `Método de pago: ${paymentLabel(options?.paymentMethod)}`,
    options?.paymentMethod === 'transferencia'
      ? `Banco del cliente: ${selectedBank}`
      : '',
    locationText ? `Entrega:\\n${locationText}` : '',
    `Productos:\\n${orderItemsText(items)}`,
    `Resumen:\\nSubtotal: ${formatMoney(subtotal)}\\nDomicilio: ${deliveryText}${smallOrderText}\\nTotal: ${formatMoney(pricing.total)}`,
    options?.paymentMethod === 'transferencia'
      ? `Adjunto o enviaré el comprobante de pago para validación.`
      : `Quedo pendiente de confirmación.`,
  ].filter(Boolean);

  const text = messageSections.join('\\n\\n');

  return `https://wa.me/${cleanPhoneNumber(STORE_WHATSAPP)}?text=${encodeURIComponent(text)}`;
}

export function buildStatusWhatsAppUrl"""
whatsapp, count = re.subn(build_whatsapp, new_build_whatsapp, whatsapp, count=1, flags=re.S)
if count != 1:
    raise RuntimeError('No se pudo reemplazar buildWhatsAppUrl')
whatsapp = whatsapp.replace(
    "const APP_URL = 'https://pollazogalapague-o.vercel.app';",
    "const APP_URL = 'https://pollazogalapague-o-phi.vercel.app';",
    1,
)
write('src/utils/whatsapp.ts', whatsapp)


# -----------------------------------------------------------------------------
# App: sin Plus, precios por zona y mínimo real
# -----------------------------------------------------------------------------
app = read('src/App.tsx')
app = app.replace(
    "  deliveryFeeOf,\n  isStoreOpen,",
    "  isStoreOpen,\n  subtotalOf,",
    1,
)
app = app.replace(
    "} from './utils/whatsapp';",
    "} from './utils/whatsapp';\nimport { calculateOrderPricing, MIN_ORDER_SUBTOTAL } from './utils/commerce';",
    1,
)
app = app.replace("const PLUS_OPEN_SIGNAL_KEY = 'pollazo_open_plus';\n", '', 1)
app = app.replace(
    "    value === 'efectivo' ||\n    value === 'deuna' ||\n    value === 'transferencia' ||\n    value === 'tarjeta'",
    "    value === 'efectivo' ||\n    value === 'transferencia'",
    1,
)
app, count = re.subn(
    r"const getInitialPaymentStatus = \(paymentMethod\?: PaymentMethod\): AppPaymentStatus => \{.*?\n\};",
    """const getInitialPaymentStatus = (paymentMethod?: PaymentMethod): AppPaymentStatus => {
  if (paymentMethod === 'efectivo') return 'contra_entrega';
  if (paymentMethod === 'transferencia') return 'validando';
  return 'pendiente';
};""",
    app,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo simplificar getInitialPaymentStatus')
app = app.replace(
    "    hasPollazoPlus,\n    activeMembership,\n    membershipPlan,\n",
    '',
    1,
)
app, count = re.subn(
    r"\n  const openPlusFromNotification = useCallback\(\(\) => \{.*?\n  \}, \[refreshData\]\);",
    '',
    app,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar openPlusFromNotification')
app, count = re.subn(
    r"\n  useEffect\(\(\) => \{\n    const params = new URLSearchParams\(window\.location\.search\);\n    const shouldOpenPlus =.*?\n  \}, \[openPlusFromNotification\]\);",
    '',
    app,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar deep link Plus')
app = app.replace(
    "\n      if (data?.type === 'POLLAZO_OPEN_PLUS') {\n        openPlusFromNotification();\n      }\n",
    '\n',
    1,
)
app = app.replace(
    "  }, [openPlusFromNotification, openTrackingFromNotification]);",
    "  }, [openTrackingFromNotification]);",
    1,
)
app, count = re.subn(
    r"  const buildOrderPayload = \(code: string, status: OrderStatus = 'Por Confirmar'\) => \{.*?\n  \};",
    """  const buildOrderPayload = (code: string, status: OrderStatus = 'Por Confirmar') => {
    const detailedItems = normalizeItemsForOrder(items, products);
    const subtotal = toMoney(
      detailedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
    );
    const pricing = calculateOrderPricing({
      subtotal,
      customerLat,
      customerLng,
    });
    const paymentMethod = getStoredPaymentMethod();
    const paymentStatus = getInitialPaymentStatus(paymentMethod);

    return {
      order_code: code,
      customer_phone: customerPhone,
      items: detailedItems,
      subtotal,
      delivery_fee: pricing.deliveryFeeFinal,
      delivery_fee_original: pricing.deliveryFeeOriginal,
      delivery_fee_final: pricing.deliveryFeeFinal,
      // Se reutiliza esta columna existente para el recargo de pedido pequeño.
      service_fee: pricing.smallOrderFee,
      card_fee: 0,
      total: pricing.total,
      status,
      payment_status: paymentStatus,
      preorder: !isStoreOpen(),
      payment_method: paymentMethod,
      delivery_type: 'domicilio' as const,
      lat: customerLat,
      lng: customerLng,
      reference: customerReference.trim(),
      membership_applied: false,
      membership_id: null,
      membership_plan: null,
      counted_in_metrics: false,
      is_test_order: false,
      created_at: new Date().toISOString(),
    };
  };""",
    app,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo reemplazar buildOrderPayload')
app = app.replace(
    "    if (!getStoredPaymentMethod()) {",
    "    if (subtotalOf(items) < MIN_ORDER_SUBTOTAL) {\n      throw new Error(`La compra mínima es de $${MIN_ORDER_SUBTOTAL.toFixed(2)}.`);\n    }\n\n    if (!getStoredPaymentMethod()) {",
    1,
)
app = app.replace(
    "    const shouldOpenPlus =\n      params.get('plus') === '1' ||\n      params.has('membershipReminder') ||\n      params.has('membershipId');\n\n    return isPWA || isDismissed || shouldOpenTracking || shouldOpenPlus;",
    "    return isPWA || isDismissed || shouldOpenTracking;",
    1,
)
write('src/App.tsx', app)


# -----------------------------------------------------------------------------
# Carrito: mínimo, recargo, zonas, ETA y solo efectivo/transferencia
# -----------------------------------------------------------------------------
cart = read('src/components/CartScreen.tsx')
cart = cart.replace('  CheckCircle2,\n', '  CheckCircle2,\n  Clock3,\n', 1)
cart = cart.replace('  Crown,\n', '', 1)
cart = cart.replace('  Gift,\n', '', 1)
cart = cart.replace('  QrCode,\n', '', 1)
cart = cart.replace(
    "import { deliveryFeeOf, isFixedPrice } from '../utils/whatsapp';",
    "import { isFixedPrice } from '../utils/whatsapp';\nimport {\n  calculateOrderPricing,\n  estimateCartEta,\n  MIN_ORDER_SUBTOTAL,\n  zoneLabel,\n} from '../utils/commerce';",
    1,
)
cart = cart.replace(
    "type SupportedPaymentMethod = Extract<PaymentMethod, 'efectivo' | 'deuna' | 'transferencia'>;",
    "type SupportedPaymentMethod = Extract<PaymentMethod, 'efectivo' | 'transferencia'>;",
    1,
)
cart = cart.replace("const BUSINESS_DEUNA_PHONE = '0989795628';\n", '', 1)
cart = cart.replace("const PLUS_OPEN_SIGNAL_KEY = 'pollazo_open_plus';\n", '', 1)
cart, count = re.subn(
    r"\nconst formatShortDate = \(value\?: string \| null, language: LanguageCode = 'es'\) => \{.*?\n\};",
    '',
    cart,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar formatShortDate')
cart, count = re.subn(
    r"\nfunction PollazoPlusSmartHint\(\{.*?\n\}\n\nfunction getTranslatedProduct",
    "\nfunction getTranslatedProduct",
    cart,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar PollazoPlusSmartHint')
cart = cart.replace(
    "    customerReference,\n    hasPollazoPlus,\n    activeMembership,\n    pollazoPlusExpiresAt,\n",
    "    customerReference,\n",
    1,
)
cart = cart.replace(
    "  const subtotal = toMoney(total);\n  const deliveryFeeOriginal = deliveryFeeOf(subtotal);\n  const deliveryFee = hasPollazoPlus ? 0 : deliveryFeeOriginal;\n  const deliverySavings = Math.max(0, deliveryFeeOriginal - deliveryFee);\n  const finalTotal = toMoney(subtotal + deliveryFee);\n  const plusExpiresLabel = formatShortDate(activeMembership?.expires_at || pollazoPlusExpiresAt, language);",
    """  const subtotal = toMoney(total);
  const pricing = calculateOrderPricing({
    subtotal,
    customerLat,
    customerLng,
  });
  const deliveryFeeOriginal = pricing.deliveryFeeOriginal;
  const deliveryFee = pricing.deliveryFeeFinal;
  const smallOrderFee = pricing.smallOrderFee;
  const finalTotal = pricing.total;""",
    1,
)
cart = cart.replace(
    "  const isPaymentReady = paymentMethod === 'efectivo' || (canUseDigitalPayment && paymentMethod === 'deuna') || (canUseDigitalPayment && paymentMethod === 'transferencia' && selectedBank !== null);",
    "  const eta = estimateCartEta({ customerLat, customerLng, totalUnits });\n  const isPaymentReady = pricing.minimumReached && (paymentMethod === 'efectivo' || (canUseDigitalPayment && paymentMethod === 'transferencia' && selectedBank !== null));",
    1,
)
cart = cart.replace(
    "  const pendingActionText = !hasProfile || !hasLocation\n    ? tx(language, 'completeDelivery')",
    "  const pendingActionText = !pricing.minimumReached\n    ? `Agrega $${pricing.amountMissingForMinimum.toFixed(2)} para llegar al mínimo`\n    : !hasProfile || !hasLocation\n      ? tx(language, 'completeDelivery')",
    1,
)
cart, count = re.subn(
    r"\n  const handleOpenPlusInfo = \(\) => \{.*?\n  \};",
    '',
    cart,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar handleOpenPlusInfo')
cart = cart.replace(
    "    if ((method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment) {",
    "    if (method === 'transferencia' && !canUseDigitalPayment) {",
    1,
)
cart = cart.replace(
    "    if ((paymentMethod === 'deuna' || paymentMethod === 'transferencia') && !canUseDigitalPayment) {",
    "    if (paymentMethod === 'transferencia' && !canUseDigitalPayment) {",
    1,
)
cart = cart.replace(
    "    if (!paymentMethod) {",
    "    if (!pricing.minimumReached) {\n      triggerDryTap();\n      showNotice(`La compra mínima es de $${MIN_ORDER_SUBTOTAL.toFixed(2)}.`);\n      return;\n    }\n\n    if (!paymentMethod) {",
    1,
)
cart = cart.replace(
    "    const blockedByConsult = (method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment;",
    "    const blockedByConsult = method === 'transferencia' && !canUseDigitalPayment;",
    1,
)
cart = cart.replace("    if (paymentMethod === 'deuna') return 'Deuna';\n", '', 1)
cart, count = re.subn(
    r"\n        \{hasPollazoPlus && \(.*?\n        \)\}\n\n        \{!hasPollazoPlus && subtotal > 0 && deliveryFeeOriginal > 0 && !isOrderSaved && \(.*?\n        \)\}",
    '',
    cart,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudieron retirar tarjetas Plus')
cart, count = re.subn(
    r"\n            \{renderPaymentButton\(\n              'deuna',.*?\n            \)\}",
    '',
    cart,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar botón Deuna')
cart, count = re.subn(
    r"\n          \{isOrderSaved && paymentMethod === 'deuna' && \(.*?\n          \)\}",
    '',
    cart,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar bloque QR Deuna')

pricing_card_anchor = """        {actionNotice && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">"""
pricing_card = """        {hasProfile && hasLocation && (
          <section className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-3 text-white">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">
                <Clock3 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">Entrega estimada</p>
                <p className="text-lg font-black leading-none">{eta.label}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-white/75">{zoneLabel(pricing.zone)}</p>
                <p className="text-sm font-black">{pricing.freeDeliveryApplied ? 'GRATIS' : `$${deliveryFee.toFixed(2)}`}</p>
              </div>
            </div>

            <div className="space-y-2 p-4">
              {!pricing.minimumReached && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase text-red-600">Compra mínima: $5,00</p>
                  <p className="mt-1 text-[10px] font-bold text-red-500">Agrega ${pricing.amountMissingForMinimum.toFixed(2)} más para continuar.</p>
                </div>
              )}

              {pricing.minimumReached && smallOrderFee > 0 && (
                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase text-yellow-700">Recargo por pedido pequeño: $0,60</p>
                  <p className="mt-1 text-[10px] font-bold text-yellow-700/80">Agrega ${pricing.amountMissingForNoSmallOrderFee.toFixed(2)} para quitar el recargo.</p>
                </div>
              )}

              {pricing.freeDeliveryApplied && (
                <div className="rounded-2xl border border-green-100 bg-green-50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase text-green-700">Pedido grande: entrega gratis aplicada</p>
                </div>
              )}
            </div>
          </section>
        )}

        {actionNotice && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">"""
if pricing_card_anchor not in cart:
    raise RuntimeError('No se encontró ancla para tarjeta de precios')
cart = cart.replace(pricing_card_anchor, pricing_card, 1)

summary_pattern = r"            \{subtotal > 0 && \(\n              <div className=\"flex justify-between text-sm\">\n                <span className=\"text-gray-500\">\{tx\(language, 'deliveryFee'\)\}</span>.*?\n            \{subtotal > 0 && \(\n              <div className=\"flex justify-between text-sm pt-2 border-t border-gray-200\">"
summary_replacement = """            {subtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{tx(language, 'deliveryFee')}</span>
                <span className="text-right font-bold">
                  {pricing.freeDeliveryApplied && deliveryFeeOriginal > 0 && (
                    <span className="block text-[10px] text-gray-400 line-through">${deliveryFeeOriginal.toFixed(2)}</span>
                  )}
                  <span className={pricing.freeDeliveryApplied ? 'text-green-600 font-black' : 'text-gray-800'}>
                    {pricing.freeDeliveryApplied ? tx(language, 'free') : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </span>
              </div>
            )}

            {smallOrderFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Recargo pedido pequeño</span>
                <span className="font-bold text-gray-800">${smallOrderFee.toFixed(2)}</span>
              </div>
            )}

            {subtotal > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">"""
cart, count = re.subn(summary_pattern, summary_replacement, cart, count=1, flags=re.S)
if count != 1:
    raise RuntimeError('No se pudo reemplazar resumen de delivery')
cart = re.sub(
    r"\n              \{hasPollazoPlus && deliverySavings > 0 && \(.*?\n              \)\}",
    '',
    cart,
    count=1,
    flags=re.S,
)
cart = cart.replace(
    "            {hasPollazoPlus && <p className=\"text-[9px] font-black text-orange-500 uppercase mt-1\">{tx(language, 'plusActiveShort')}</p>}\n",
    '',
    1,
)
write('src/components/CartScreen.tsx', cart)


# -----------------------------------------------------------------------------
# Inicio: promociones reales y volver a comprar
# -----------------------------------------------------------------------------
home = read('src/components/HomeScreen.tsx')
home = home.replace(
    "import { Category, Screen } from '../types';",
    "import type { Category, Order, Screen } from '../types';",
    1,
)
home = home.replace(
    "  const { customerName } = useUser();\n  const { products } = useAdmin();",
    "  const { customerName, customerPhone } = useUser();\n  const { products, orders } = useAdmin();",
    1,
)
home = home.replace(
    "  const bestsellers = useMemo(() => {",
    """  const reorderProducts = useMemo(() => {
    const phone = String(customerPhone || '').replace(/\\D/g, '').slice(-9);
    if (!phone) return [];

    const recent = ((orders || []) as Order[])
      .filter(order => String(order.customer_phone || '').replace(/\\D/g, '').slice(-9) === phone)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 4);
    const ids = new Set<string>();
    const names = new Set<string>();

    recent.forEach(order => {
      (order.items || []).forEach(item => {
        if (item.product_id) ids.add(String(item.product_id));
        if (item.name) names.add(String(item.name).trim().toLowerCase());
      });
    });

    return products
      .filter(product => ids.has(product.id) || names.has(product.name.trim().toLowerCase()))
      .slice(0, 6);
  }, [customerPhone, orders, products]);

  const promotionProducts = useMemo(() => {
    const tagged = products.filter(product => /oferta|promo|off|descuento/i.test(String(product.badge || '')));
    return (tagged.length > 0 ? tagged : products.filter(product => product.available !== false)).slice(0, 6);
  }, [products]);

  const bestsellers = useMemo(() => {""",
    1,
)
insert_anchor = """      {pairs.length > 0 && (
        <div className="px-6 py-6">"""
insert_sections = """      {reorderProducts.length > 0 && (
        <section className="px-6 py-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500">Para ti</p>
              <h3 className="mt-1 text-xl font-black uppercase italic text-slate-950">Vuelve a comprar</h3>
            </div>
            <button type="button" onClick={() => onNavigate('orders')} className="rounded-full bg-orange-50 px-3 py-2 text-[9px] font-black uppercase text-orange-600 active:scale-95">Tus pedidos</button>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {reorderProducts.map(product => (
              <div key={`reorder-${product.id}`} className="min-w-[46%] snap-start">
                <ProductCard product={product} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {promotionProducts.length > 0 && (
        <section className="px-6 py-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-green-600">Descubre algo nuevo</p>
              <h3 className="mt-1 text-xl font-black uppercase italic text-slate-950">Promociones de hoy</h3>
            </div>
            <button type="button" onClick={() => onNavigate('catalog')} className="rounded-full bg-green-50 px-3 py-2 text-[9px] font-black uppercase text-green-700 active:scale-95">Ver todo</button>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {promotionProducts.map(product => (
              <div key={`promo-${product.id}`} className="min-w-[46%] snap-start">
                <ProductCard product={product} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {pairs.length > 0 && (
        <div className="px-6 py-6">"""
if insert_anchor not in home:
    raise RuntimeError('No se encontró ancla para secciones de inicio')
home = home.replace(insert_anchor, insert_sections, 1)
write('src/components/HomeScreen.tsx', home)


# -----------------------------------------------------------------------------
# Rastreo: hora estimada real y mapa desde el primer momento
# -----------------------------------------------------------------------------
tracking = read('src/components/OrderTracking.tsx')
tracking = tracking.replace(
    "import OrderTrackingLiveMap from './OrderTrackingLiveMap';",
    "import OrderTrackingLiveMap from './OrderTrackingLiveMap';\nimport { estimateArrivalWindow, FREE_DELIVERY_THRESHOLD } from '../utils/commerce';",
    1,
)
tracking = tracking.replace(
    "  reference?: string | null;",
    "  reference?: string | null;\n  lat?: number | string | null;\n  lng?: number | string | null;\n  service_fee?: number | string | null;",
    1,
)
tracking, count = re.subn(
    r"\nconst etaFor = \(order: OrderLike\) => \{.*?\n\};",
    '',
    tracking,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar etaFor')
tracking = tracking.replace(
    "  const itemCount = activeOrder ? countItems(activeOrder) : 0;\n  const deliveryAmount",
    """  const itemCount = activeOrder ? countItems(activeOrder) : 0;
  const arrivalWindow = activeOrder
    ? estimateArrivalWindow({
        status: activeOrder.status,
        customerLat: toNumber(activeOrder.lat),
        customerLng: toNumber(activeOrder.lng),
        totalUnits: itemCount,
      })
    : null;
  const deliveryAmount""",
    1,
)
tracking, count = re.subn(
    r"  const delivery = activeOrder\?\.membership_applied.*?\n  const deliveryText = activeOrder\?\.membership_applied.*?\n      : 'Delivery gratis';",
    """  const subtotalAmount = toNumber(activeOrder?.subtotal);
  const delivery = deliveryAmount > 0
    ? money(deliveryAmount)
    : subtotalAmount >= FREE_DELIVERY_THRESHOLD
      ? 'Gratis'
      : 'Incluido';
  const deliveryText = deliveryAmount > 0
    ? `Delivery ${money(deliveryAmount)}`
    : subtotalAmount >= FREE_DELIVERY_THRESHOLD
      ? 'Envío gratis por pedido grande'
      : 'Delivery incluido';""",
    tracking,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo reemplazar etiqueta de delivery en rastreo')
tracking = tracking.replace(
    "                  orderStatus={activeOrder.status}\n                />",
    "                  orderStatus={activeOrder.status}\n                  customerLat={toNumber(activeOrder.lat)}\n                  customerLng={toNumber(activeOrder.lng)}\n                />",
    1,
)
tracking = tracking.replace(
    "                  <p className=\"text-[14px] font-black uppercase leading-tight text-slate-950\">{etaFor(activeOrder)}</p>\n                  <p className=\"mt-0.5 text-[9px] font-bold leading-tight text-slate-400\">\n                    {activeOrder.status === 'Por Confirmar' ? 'Al confirmar.' : 'Estimado.'}\n                  </p>",
    """                  <p className="text-[13px] font-black uppercase leading-tight text-slate-950">
                    {activeOrder.status === 'Entregado'
                      ? 'Entregado'
                      : activeOrder.status === 'Cancelado'
                        ? 'Cancelado'
                        : arrivalWindow?.label || 'Calculando'}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold leading-tight text-slate-400">
                    {activeOrder.status === 'Por Confirmar' ? 'Hora aproximada.' : 'Se recalcula automáticamente.'}
                  </p>""",
    1,
)
write('src/components/OrderTracking.tsx', tracking)


# Mapa completo desde que nace el pedido.
write(
    'src/components/OrderTrackingLiveMap.tsx',
    """import { Bike, Clock3, MapPinned, RefreshCw, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  readPublicTracking,
  trackingStatusLabel,
  type PublicTracking,
} from '../utils/deliveryTrackingApi';
import { getOrderCredential } from '../utils/orderCredentials';
import { STORE_LOCATION } from '../utils/commerce';
import InteractiveRasterMap, {
  type RasterLatLng,
  type RasterMarker,
} from './InteractiveRasterMap';

interface Props {
  orderCode: string;
  orderStatus?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
}

const validPoint = (lat: unknown, lng: unknown): RasterLatLng | null => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { lat: latitude, lng: longitude };
};

const fitView = (points: RasterLatLng[]) => {
  if (points.length === 0) return { center: STORE_LOCATION, zoom: 15 };
  const lats = points.map(point => point.lat);
  const lngs = points.map(point => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, (maxLng - minLng) * 0.95);

  let zoom = 18;
  if (span > 0.08) zoom = 12;
  else if (span > 0.04) zoom = 13;
  else if (span > 0.02) zoom = 14;
  else if (span > 0.01) zoom = 15;
  else if (span > 0.005) zoom = 16;
  else if (span > 0.0025) zoom = 17;

  return {
    center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
    zoom,
  };
};

const relativeTime = (value?: string | null) => {
  if (!value) return 'Esperando ubicación';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Actualizando';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds} s`;
  return `Hace ${Math.floor(seconds / 60)} min`;
};

export default function OrderTrackingLiveMap({
  orderCode,
  orderStatus,
  customerLat,
  customerLng,
}: Props) {
  const credential = useMemo(() => getOrderCredential(orderCode), [orderCode]);
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(Boolean(credential));
  const [error, setError] = useState('');
  const [viewCenter, setViewCenter] = useState<RasterLatLng>(STORE_LOCATION);
  const [viewZoom, setViewZoom] = useState(15);
  const manualViewRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!credential) {
        setLoading(false);
        return;
      }

      try {
        const result = await readPublicTracking(orderCode, credential.trackingToken, signal);
        setTracking(result);
        setError('');
      } catch (cause) {
        if ((cause as Error)?.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el GPS del pedido.');
      } finally {
        setLoading(false);
      }
    },
    [credential, orderCode]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);

  const trackingData = tracking?.tracking;
  const store = trackingData
    ? validPoint(trackingData.store.latitude, trackingData.store.longitude)
    : STORE_LOCATION;
  const customer = trackingData
    ? validPoint(trackingData.customer.latitude, trackingData.customer.longitude)
    : validPoint(customerLat, customerLng);
  const rider = trackingData?.current
    ? validPoint(trackingData.current.latitude, trackingData.current.longitude)
    : null;

  const path = useMemo(() => {
    const values = (trackingData?.path || [])
      .map(point => validPoint(point.latitude, point.longitude))
      .filter((point): point is RasterLatLng => Boolean(point));

    if (values.length === 0 && store) values.push(store);
    if (rider && !values.some(point => point.lat === rider.lat && point.lng === rider.lng)) values.push(rider);
    if (!rider && customer && !values.some(point => point.lat === customer.lat && point.lng === customer.lng)) values.push(customer);
    return values.slice(-120);
  }, [customer, rider, store, trackingData?.path]);

  const markers = useMemo<RasterMarker[]>(() => {
    const result: RasterMarker[] = [];
    if (store) result.push({ id: 'store', position: store, kind: 'store', label: 'El Mirador' });
    if (customer) result.push({ id: 'customer', position: customer, kind: 'customer', label: 'Tu entrega' });
    if (rider) result.push({ id: 'rider', position: rider, kind: 'rider', label: 'Repartidor' });
    return result;
  }, [customer, rider, store]);

  useEffect(() => {
    if (manualViewRef.current) return;
    const points = [store, customer, rider].filter((point): point is RasterLatLng => Boolean(point));
    const fitted = fitView(points);
    setViewCenter(fitted.center);
    setViewZoom(fitted.zoom);
  }, [customer, rider, store]);

  if (!customer) {
    return (
      <div className="mt-3 rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <MapPinned size={16} className="text-slate-400" />
          <p className="text-[9px] font-bold text-slate-500">Falta una ubicación válida para dibujar la ruta.</p>
        </div>
      </div>
    );
  }

  const active = Boolean(tracking?.active && trackingData);
  const capturedAt = active
    ? trackingData?.current?.capturedAt || trackingData?.updatedAt || tracking?.order.updatedAt
    : null;
  const statusText = active && trackingData
    ? `${trackingStatusLabel(trackingData.status)} · ${trackingData.riderName}`
    : orderStatus === 'Enviado'
      ? 'Esperando la primera ubicación del repartidor'
      : 'Ruta estimada · preparando tu pedido';

  return (
    <div className="mt-3 overflow-hidden rounded-[19px] border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-blue-50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl text-white shadow-md ${active ? 'bg-blue-600 shadow-blue-100' : 'bg-orange-500 shadow-orange-100'}`}>
            {active ? <Bike size={15} /> : <MapPinned size={15} />}
          </div>
          <div className="min-w-0">
            <p className={`text-[8px] font-black uppercase tracking-[0.14em] ${active ? 'text-blue-600' : 'text-orange-600'}`}>
              {active ? 'Mapa en vivo' : 'Mapa del pedido'}
            </p>
            <p className="truncate text-[10px] font-black text-slate-900">{statusText}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 text-[7px] font-black uppercase text-slate-400">
          {loading ? <RefreshCw size={11} className="animate-spin" /> : <Clock3 size={11} />}
          {active ? relativeTime(capturedAt) : 'Desde ahora'}
        </div>
      </div>

      <div className="relative h-[190px] bg-slate-100">
        <InteractiveRasterMap
          center={viewCenter}
          zoom={viewZoom}
          minZoom={12}
          maxZoom={19}
          markers={markers}
          path={path}
          showControls
          interactive
          onViewChange={(nextCenter, nextZoom, final) => {
            setViewCenter(nextCenter);
            setViewZoom(nextZoom);
            if (final) manualViewRef.current = true;
          }}
        />
      </div>

      {!active && (
        <div className="bg-orange-50 px-3 py-2 text-[8px] font-bold text-orange-700">
          La línea muestra la ruta estimada entre El Mirador y tu punto. La moto aparecerá cuando un repartidor sea asignado.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 text-[8px] font-bold text-red-600">
          <WifiOff size={13} /> {error}
        </div>
      )}
    </div>
  );
}
""",
)


# -----------------------------------------------------------------------------
# Información: retirar la tarjeta Plus sobrante
# -----------------------------------------------------------------------------
info = read('src/components/InfoScreen.tsx')
info = info.replace("import PollazoPlusProCard from './PollazoPlusProCard';\n", '', 1)
write('src/components/InfoScreen.tsx', info)


# -----------------------------------------------------------------------------
# Manifest, splash y caché
# -----------------------------------------------------------------------------
manifest = read('public/manifest.json')
manifest = manifest.replace('/?appVersion=9', '/?appVersion=10')
manifest = manifest.replace('/pollazo-splash-icon.svg?v=9', '/pollazo-splash-clean-v10.svg')
write('public/manifest.json', manifest)

index = read('index.html')
index = index.replace('/manifest.json?v=9', '/manifest.json?v=10')
index = index.replace('/pollazo-splash-icon.svg?v=9', '/pollazo-splash-clean-v10.svg')
write('index.html', index)

sw = read('public/sw.js')
if "pollazo-cache-clean-v45" not in sw:
    raise RuntimeError('Versión de Service Worker inesperada')
sw = sw.replace('pollazo-cache-clean-v45', 'pollazo-cache-clean-v46', 1)
write('public/sw.js', sw)

print('Experiencia comercial, ETA, mapa inicial y splash aplicados correctamente.')
