import type { CartItem, OrderStatus, PaymentMethod } from '../types';

export const WHATSAPP = '593989795628';
export const STORE_WHATSAPP = WHATSAPP;

const APP_URL = 'https://pollazogalapague-o.vercel.app';
const FIRST_DELIVERY_PROMO_KEY = 'pollazo_first_delivery_free_active';

interface WhatsAppOptions {
  paymentMethod?: PaymentMethod;
  selectedBank?: string | null;
  customerReference?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  deliveryType?: 'domicilio' | 'retiro';

  // Pollazo Plus: solo con membresía activa el delivery va gratis.
  hasPollazoPlus?: boolean;
}

const BANK_LABELS: Record<string, string> = {
  pichincha: 'Banco Pichincha',
  guayaquil: 'Banco Guayaquil',
  pacifico: 'Banco del Pacífico',
  austro: 'Banco del Austro',
  otros: 'Produbanco / Otros Bancos',
  Ninguno: 'No aplica',
};

export function numericPrice(value?: string | number | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Number(value.toFixed(2)) : 0;
  }

  const clean = String(value || '')
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');

  const parsed = Number.parseFloat(clean);

  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
}

export function isFixedPrice(value?: string | number | null): boolean {
  return numericPrice(value) > 0;
}

export function itemUnitPrice(item: CartItem): number {
  if (typeof item.product.custom_price === 'number' && item.product.custom_price > 0) {
    return Number(item.product.custom_price.toFixed(2));
  }

  if (typeof item.custom_price === 'number' && item.custom_price > 0) {
    return Number(item.custom_price.toFixed(2));
  }

  if (typeof item.price === 'number' && item.price > 0) {
    return Number(item.price.toFixed(2));
  }

  return numericPrice(item.product.price);
}

export function subtotalOf(items: CartItem[]): number {
  const subtotal = items.reduce((sum, item) => {
    return sum + itemUnitPrice(item) * item.quantity;
  }, 0);

  return Number(subtotal.toFixed(2));
}

export function deliveryFeeOf(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;

  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage.getItem(FIRST_DELIVERY_PROMO_KEY) === '1' &&
      subtotal >= 10
    ) {
      return 0;
    }
  } catch {
    // localStorage opcional.
  }

  if (subtotal < 5) return 0;
  if (subtotal < 8) return 2;

  return 1.5;
}

export function orderCode(): string {
  const date = new Date();

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `PZ-${day}${month}-${random}`;
}

export function isStoreOpen(date = new Date()): boolean {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const openMinutes = 7 * 60;
  const lastAutomaticOrderMinutes = 20 * 60 + 45;

  return currentMinutes >= openMinutes && currentMinutes <= lastAutomaticOrderMinutes;
}

function cleanPhoneNumber(phone?: string | null): string {
  return String(phone || '').replace(/\D/g, '');
}

function paymentLabel(method?: PaymentMethod) {
  if (method === 'efectivo') return 'Efectivo / contra entrega';
  if (method === 'deuna') return 'Deuna';
  if (method === 'transferencia') return 'Transferencia bancaria';
  if (method === 'tarjeta') return 'Tarjeta';

  return 'No definido';
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function orderItemsText(items: CartItem[]) {
  if (items.length === 0) return 'Sin productos';

  return items
    .map((item, index) => {
      const price = itemUnitPrice(item);
      const subtotal = price * item.quantity;

      const priceText =
        price > 0
          ? `${formatMoney(price)} c/u · ${formatMoney(subtotal)}`
          : 'Precio por confirmar';

      return `${index + 1}. ${item.product.name}\n   Cantidad: ${item.quantity}\n   ${priceText}`;
    })
    .join('\n\n');
}

function buildLocationText(options?: WhatsAppOptions) {
  if (!options) return '';

  const parts: string[] = [];

  if (options.deliveryType) {
    parts.push(
      `Tipo de entrega: ${
        options.deliveryType === 'retiro' ? 'Retiro' : 'Domicilio'
      }`
    );
  }

  if (options.customerReference) {
    parts.push(`Referencia: ${options.customerReference}`);
  }

  if (
    typeof options.customerLat === 'number' &&
    Number.isFinite(options.customerLat) &&
    typeof options.customerLng === 'number' &&
    Number.isFinite(options.customerLng)
  ) {
    parts.push(
      `Ubicación: ${options.customerLat.toFixed(6)}, ${options.customerLng.toFixed(6)}`
    );

    parts.push(
      `Mapa: https://www.google.com/maps?q=${options.customerLat},${options.customerLng}`
    );
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

export function buildWhatsAppUrl(
  items: CartItem[],
  customerPhone: string,
  customerName: string,
  code: string,
  preorder = false,
  options?: WhatsAppOptions
): string {
  const subtotal = subtotalOf(items);
  const deliveryBase = deliveryFeeOf(subtotal);
  const hasPollazoPlus = options?.hasPollazoPlus === true;
  const deliveryFee = hasPollazoPlus ? 0 : deliveryBase;
  const total = Number((subtotal + deliveryFee).toFixed(2));

  const selectedBank =
    options?.selectedBank && BANK_LABELS[options.selectedBank]
      ? BANK_LABELS[options.selectedBank]
      : options?.selectedBank || 'No aplica';

  const locationText = buildLocationText(options);

  const deliveryText = hasPollazoPlus
    ? 'Gratis por Pollazo Plus 👑'
    : deliveryFee === 0
      ? 'Gratis por promoción de bienvenida 🎁'
      : formatMoney(deliveryFee);

  const messageSections = [
    `Hola, soy ${customerName || 'cliente'} 👋`,
    `Necesito ayuda con mi pedido registrado en la app.`,
    `Código: ${code}`,
    preorder
      ? `Estado de horario: Pedido programado / tienda fuera de horario`
      : `Estado de horario: Tienda abierta`,
    `WhatsApp del cliente: ${customerPhone}`,
    hasPollazoPlus ? `Membresía: Pollazo Plus activo 👑` : '',
    deliveryFee === 0 && !hasPollazoPlus ? `Promoción: primer delivery gratis aplicado 🎁` : '',
    `Método de pago: ${paymentLabel(options?.paymentMethod)}`,
    options?.paymentMethod === 'transferencia'
      ? `Banco del cliente: ${selectedBank}`
      : '',
    locationText ? `Entrega:\n${locationText}` : '',
    `Productos:\n${orderItemsText(items)}`,
    `Resumen:\nSubtotal: ${formatMoney(subtotal)}\nDomicilio: ${deliveryText}\nTotal: ${formatMoney(total)}`,
    options?.paymentMethod === 'deuna' || options?.paymentMethod === 'transferencia'
      ? `Adjunto o enviaré el comprobante de pago para validación.`
      : `Quedo pendiente de confirmación.`,
  ].filter(Boolean);

  const text = messageSections.join('\n\n');

  return `https://wa.me/${cleanPhoneNumber(STORE_WHATSAPP)}?text=${encodeURIComponent(text)}`;
}

export function buildStatusWhatsAppUrl(
  customerPhone: string,
  code: string,
  status: OrderStatus
): string {
  const statusMessage: Record<OrderStatus, string> = {
    'Por Confirmar': 'recibimos tu solicitud y estamos validando disponibilidad',
    Recibido: 'tu pedido fue confirmado y ya está registrado',
    Preparando: 'tu pedido se está preparando',
    Enviado: 'tu pedido salió para entrega',
    Entregado: 'tu pedido fue entregado. ¡Gracias por comprar en Pollazo!',
    Cancelado: 'tu pedido fue cancelado. Escríbenos si necesitas ayuda',
  };

  const text = [
    'Hola 👋',
    `Actualización de tu pedido ${code}:`,
    statusMessage[status],
    '',
    `Estado actual: ${status}.`,
    `Puedes revisar la app: ${APP_URL}`,
  ].join('\n');

  return `https://wa.me/${cleanPhoneNumber(customerPhone)}?text=${encodeURIComponent(text)}`;
}
