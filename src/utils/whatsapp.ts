import type { CartItem, OrderStatus, PaymentMethod, Product } from '../types';

export const WHATSAPP = '+593989795628';

const APP_URL = 'https://pollazogalapagueno.vercel.app';

interface WhatsAppOrderOptions {
  paymentMethod?: PaymentMethod | null;
  selectedBank?: string | null;
  serviceFee?: number;
  cardFee?: number;
}

const toMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const cleanPhoneNumber = (phone: string): string => phone.replace(/\D/g, '');

const readStoredPaymentMethod = (): PaymentMethod | null => {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem('selectedPaymentMethod');

  if (
    value === 'efectivo' ||
    value === 'deuna' ||
    value === 'transferencia' ||
    value === 'tarjeta'
  ) {
    return value;
  }

  return null;
};

const readStoredBank = (): string | null => {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem('selectedBank');

  if (!value || value === 'Ninguno') return null;

  return value;
};

export const numericPrice = (price?: string) => {
  const raw = String(price || '').trim();

  if (!raw) return 0;

  const normalized = raw
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');

  const numeric = Number.parseFloat(normalized);

  return Number.isNaN(numeric) ? 0 : toMoney(numeric);
};

export const isFixedPrice = (price: string | undefined) => {
  const numeric = numericPrice(price);
  return numeric > 0;
};

export const productUnitPrice = (product: Product): number => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return toMoney(product.custom_price);
  }

  return toMoney(numericPrice(product.price));
};

export const itemUnitPrice = (item: CartItem): number => {
  if (typeof item.product?.custom_price === 'number' && item.product.custom_price > 0) {
    return toMoney(item.product.custom_price);
  }

  if (typeof item.custom_price === 'number' && item.custom_price > 0) {
    return toMoney(item.custom_price);
  }

  if (typeof item.price === 'number' && item.price > 0) {
    return toMoney(item.price);
  }

  return productUnitPrice(item.product);
};

export const itemHasKnownPrice = (item: CartItem): boolean => {
  return itemUnitPrice(item) > 0;
};

export const subtotalOf = (items: CartItem[]) => {
  return toMoney(
    items.reduce((sum, item) => {
      return sum + itemUnitPrice(item) * item.quantity;
    }, 0)
  );
};

export const deliveryFeeOf = (subtotal: number) => {
  return subtotal > 0 && subtotal < 10 ? 1.5 : 0;
};

export const orderCode = () => `#PLZ-${Math.floor(1000 + Math.random() * 9000)}`;

export function isStoreOpen(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 7 && h < 21;
}

const getProductName = (item: CartItem): string => {
  return item.product?.name || item.name || 'Producto';
};

const getPriceLabel = (item: CartItem): string => {
  const unitPrice = itemUnitPrice(item);

  if (typeof item.product?.custom_price === 'number' && item.product.custom_price > 0) {
    return `$${unitPrice.toFixed(2)} elegido`;
  }

  if (unitPrice > 0) {
    return `$${unitPrice.toFixed(2)} c/u`;
  }

  return 'Precio a consultar';
};

const getLineSubtotal = (item: CartItem): string => {
  const unitPrice = itemUnitPrice(item);

  if (unitPrice <= 0) {
    return '';
  }

  return ` = $${toMoney(unitPrice * item.quantity).toFixed(2)}`;
};

const paymentMethodLabel = (method?: PaymentMethod | null) => {
  if (method === 'efectivo') return 'Efectivo / contra entrega';
  if (method === 'deuna') return 'Deuna';
  if (method === 'transferencia') return 'Transferencia bancaria';
  if (method === 'tarjeta') return 'Tarjeta';
  return 'No definido';
};

const bankLabel = (bank?: string | null) => {
  if (bank === 'pichincha') return 'Banco Pichincha';
  if (bank === 'guayaquil') return 'Banco Guayaquil';
  if (bank === 'pacifico') return 'Banco del Pacífico';
  if (bank === 'austro') return 'Banco del Austro';
  if (bank === 'otros') return 'Produbanco / Otros Bancos';
  return null;
};

const getPaymentInstructions = (method?: PaymentMethod | null, selectedBank?: string | null) => {
  if (method === 'efectivo') {
    return [
      '💵 *Pago:* Efectivo / contra entrega',
      '🕒 *Estado:* Pedido por confirmar',
      'El negocio revisará disponibilidad antes de preparar el pedido.',
    ];
  }

  if (method === 'deuna') {
    return [
      '📲 *Pago:* Deuna',
      '🕒 *Estado:* Pago en validación',
      'Adjunto/enviaré el comprobante por WhatsApp para validar el pago.',
    ];
  }

  if (method === 'transferencia') {
    const bank = bankLabel(selectedBank);

    return [
      '🏦 *Pago:* Transferencia bancaria',
      bank ? `🏛️ *Banco de origen:* ${bank}` : '',
      '🕒 *Estado:* Pago en validación',
      'Adjunto/enviaré el comprobante por WhatsApp para validar el pago.',
    ].filter(Boolean);
  }

  if (method === 'tarjeta') {
    return [
      '💳 *Pago:* Tarjeta',
      '🕒 *Estado:* Pago en validación',
      'El pedido será confirmado cuando el pago sea aprobado.',
    ];
  }

  return [
    '🕒 *Estado:* Pedido por confirmar',
    'El negocio revisará disponibilidad y método de pago antes de prepararlo.',
  ];
};

export function buildWhatsAppUrl(
  items: CartItem[],
  phone: string,
  name: string,
  code = orderCode(),
  preorder = !isStoreOpen(),
  options: WhatsAppOrderOptions = {}
): string {
  const paymentMethod = options.paymentMethod ?? readStoredPaymentMethod();
  const selectedBank = options.selectedBank ?? readStoredBank();

  const subtotal = subtotalOf(items);
  const delivery = deliveryFeeOf(subtotal);
  const serviceFee = toMoney(options.serviceFee || 0);
  const cardFee = toMoney(options.cardFee || 0);
  const total = toMoney(subtotal + delivery + serviceFee + cardFee);
  const hasConsultItems = items.some(item => !itemHasKnownPrice(item));

  const lines: string[] = [];

  lines.push(`🛒 *NUEVO PEDIDO ${code}*`);
  lines.push('📍 *La Casa del Pollazo El Mirador*');
  lines.push('🕒 *Estado inicial:* POR CONFIRMAR');

  if (preorder) {
    lines.push('⏰ *Tipo:* Pre-pedido (local cerrado)');
  }

  lines.push('');
  lines.push(`👤 *Cliente:* ${name || 'Sin nombre'}`);
  lines.push(`📱 *Teléfono:* ${phone || 'Sin teléfono'}`);
  lines.push('');
  lines.push('📋 *Detalle:*');

  items.forEach(item => {
    const productName = getProductName(item);
    const priceLabel = getPriceLabel(item);
    const lineSubtotal = getLineSubtotal(item);

    lines.push(`• ${item.quantity}x ${productName} (${priceLabel})${lineSubtotal}`);
  });

  lines.push('');

  if (subtotal > 0) {
    lines.push(`Subtotal: $${subtotal.toFixed(2)}`);
    lines.push(delivery > 0 ? `Delivery: $${delivery.toFixed(2)}` : 'Delivery: GRATIS');

    if (serviceFee > 0) {
      lines.push(`Tarifa de servicio: $${serviceFee.toFixed(2)}`);
    }

    if (cardFee > 0) {
      lines.push(`Recargo tarjeta: $${cardFee.toFixed(2)}`);
    }

    lines.push(`💰 *Total estimado: $${total.toFixed(2)}*`);
  }

  if (hasConsultItems) {
    lines.push('');
    lines.push('📝 *Nota:* Hay productos con precio a consultar. Confirmar disponibilidad y valor final antes de preparar.');
  }

  lines.push('');
  lines.push('💳 *Método de pago:*');
  lines.push(`• ${paymentMethodLabel(paymentMethod)}`);

  getPaymentInstructions(paymentMethod, selectedBank).forEach(line => {
    lines.push(line);
  });

  lines.push('');
  lines.push('⚠️ *IMPORTANTE:*');
  lines.push('1. Este pedido queda *por confirmar* hasta validar disponibilidad y/o pago.');
  lines.push('2. Si pagas por Deuna o transferencia, envía el *comprobante de pago* aquí.');
  lines.push('3. Si pagas en efectivo, espera confirmación del negocio antes de la preparación.');
  lines.push('');
  lines.push('_Enviado desde la App Oficial 📱_');

  return `https://wa.me/${cleanPhoneNumber(WHATSAPP)}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildStatusWhatsAppUrl(phone: string, code: string, status: OrderStatus): string {
  const clean = cleanPhoneNumber(phone);

  const statusConfig: Record<OrderStatus, { emoji: string; msg: string }> = {
    'Por Confirmar': {
      emoji: '🕒',
      msg: 'Recibimos tu pedido y está pendiente de confirmación. Estamos revisando disponibilidad y/o pago.',
    },
    Recibido: {
      emoji: '✅',
      msg: '¡Confirmado! El negocio aceptó tu pedido. Ahora sí empieza el seguimiento de entrega.',
    },
    Preparando: {
      emoji: '👨‍🍳',
      msg: '¡Buenas noticias! Tu pedido ya se está preparando.',
    },
    Enviado: {
      emoji: '🛵',
      msg: '¡Tu pedido va en camino! Prepárate para recibirlo.',
    },
    Entregado: {
      emoji: '😋',
      msg: '¡Pedido entregado! Gracias por comprar en La Casa del Pollazo.',
    },
    Cancelado: {
      emoji: '❌',
      msg: 'Tu pedido ha sido cancelado. Escríbenos si tienes dudas.',
    },
  };

  const { emoji, msg } = statusConfig[status];

  const lines: string[] = [];

  lines.push(`${emoji} *ACTUALIZACIÓN ORDEN ${code}*`);
  lines.push('');
  lines.push(msg);
  lines.push('');

  if (status === 'Por Confirmar') {
    lines.push('🕒 Apenas confirmemos disponibilidad y/o pago, se activará el tiempo estimado en la app.');
  }

  if (status === 'Recibido') {
    lines.push('✅ Ya puedes revisar el tiempo estimado desde la app.');
  }

  lines.push('');
  lines.push('📲 *Mira el estado en vivo aquí:*');
  lines.push(APP_URL);
  lines.push('');
  lines.push('_Pollazo El Mirador_');

  return `https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`;
}
