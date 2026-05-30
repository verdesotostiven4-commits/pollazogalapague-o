import type { CartItem, PaymentMethod } from '../types';

export const STORE_WHATSAPP = '593989795628';

interface WhatsAppOptions {
  paymentMethod?: PaymentMethod;
  selectedBank?: string | null;
  customerReference?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  deliveryType?: 'domicilio' | 'retiro';
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

  return subtotal >= 10 ? 0 : 1;
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
  const closeMinutes = 21 * 60;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, '');
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
  const deliveryFee = deliveryFeeOf(subtotal);
  const total = Number((subtotal + deliveryFee).toFixed(2));

  const selectedBank =
    options?.selectedBank && BANK_LABELS[options.selectedBank]
      ? BANK_LABELS[options.selectedBank]
      : options?.selectedBank || 'No aplica';

  const locationText = buildLocationText(options);

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
    locationText ? `Entrega:\n${locationText}` : '',
    `Productos:\n${orderItemsText(items)}`,
    `Resumen:\nSubtotal: ${formatMoney(subtotal)}\nDomicilio: ${
      deliveryFee > 0 ? formatMoney(deliveryFee) : 'Gratis'
    }\nTotal: ${formatMoney(total)}`,
    options?.paymentMethod === 'deuna' || options?.paymentMethod === 'transferencia'
      ? `Adjunto o enviaré el comprobante de pago para validación.`
      : `Quedo pendiente de confirmación.`,
  ].filter(Boolean);

  const text = messageSections.join('\n\n');

  return `https://wa.me/${cleanPhone(STORE_WHATSAPP)}?text=${encodeURIComponent(text)}`;
}
