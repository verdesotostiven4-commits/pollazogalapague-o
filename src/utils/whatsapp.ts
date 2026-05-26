import type { CartItem, OrderStatus, Product } from '../types';

export const WHATSAPP = '+593989795628';

const APP_URL = 'https://pollazogalapagueno.vercel.app';

const toMoney = (value: number): number => Number(value.toFixed(2));

const cleanPhoneNumber = (phone: string): string => phone.replace(/\D/g, '');

export const isFixedPrice = (price: string | undefined) => {
  const p = price ?? '';
  return p.startsWith('$') && !Number.isNaN(Number.parseFloat(p.replace('$', '')));
};

export const numericPrice = (price?: string) => {
  return isFixedPrice(price)
    ? Number.parseFloat((price ?? '0').replace('$', ''))
    : 0;
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

const getPriceLabel = (item: CartItem): string => {
  const unitPrice = itemUnitPrice(item);

  if (typeof item.product.custom_price === 'number' && item.product.custom_price > 0) {
    return `$${unitPrice.toFixed(2)} elegido`;
  }

  if (isFixedPrice(item.product.price)) {
    return `${item.product.price} c/u`;
  }

  return 'Precio a consultar';
};

const getLineSubtotal = (item: CartItem): string => {
  const unitPrice = itemUnitPrice(item);

  if (unitPrice <= 0) {
    return '';
  }

  return ` = $${(unitPrice * item.quantity).toFixed(2)}`;
};

// 1. Mensaje inicial del cliente mejorado
export function buildWhatsAppUrl(
  items: CartItem[],
  phone: string,
  name: string,
  code = orderCode(),
  preorder = !isStoreOpen()
): string {
  const subtotal = subtotalOf(items);
  const delivery = deliveryFeeOf(subtotal);
  const total = subtotal + delivery;
  const hasConsultItems = items.some(item => !itemHasKnownPrice(item));

  const lines: string[] = [];

  lines.push(`🛒 *NUEVO PEDIDO ${code}*`);
  lines.push('📍 *La Casa del Pollazo El Mirador*');

  if (preorder) {
    lines.push('⏰ *Tipo:* Pre-pedido (local cerrado)');
  }

  lines.push('');
  lines.push(`👤 *Cliente:* ${name || 'Sin nombre'}`);
  lines.push(`📱 *Teléfono:* ${phone || 'Sin teléfono'}`);
  lines.push('');
  lines.push('📋 *Detalle:*');

  items.forEach(item => {
    const productName = item.product?.name || item.name || 'Producto';
    const priceLabel = getPriceLabel(item);
    const lineSubtotal = getLineSubtotal(item);

    lines.push(`• ${item.quantity}x ${productName} (${priceLabel})${lineSubtotal}`);
  });

  lines.push('');

  if (subtotal > 0) {
    lines.push(`Subtotal: $${subtotal.toFixed(2)}`);
    lines.push(delivery > 0 ? `Delivery: $${delivery.toFixed(2)}` : 'Delivery: GRATIS');
    lines.push(`💰 *Total: $${total.toFixed(2)}*`);
  }

  if (hasConsultItems) {
    lines.push('');
    lines.push('📝 *Nota:* Hay productos con precio a consultar. Por favor confirmar disponibilidad y valor final.');
  }

  lines.push('');
  lines.push('⚠️ *IMPORTANTE:*');
  lines.push('1. Envía tu *Ubicación Actual* 📍');
  lines.push('2. Envía el *Comprobante de Pago* si es transferencia o indica si pagas en *Efectivo* 💵');
  lines.push('');
  lines.push('_Enviado desde la App Oficial 📱_');

  return `https://wa.me/${cleanPhoneNumber(WHATSAPP)}?text=${encodeURIComponent(lines.join('\n'))}`;
}

// 2. Mensaje de notificación para cambios de estado del pedido
export function buildStatusWhatsAppUrl(phone: string, code: string, status: OrderStatus): string {
  const clean = cleanPhoneNumber(phone);

  const statusConfig: Record<OrderStatus, { emoji: string; msg: string }> = {
    'Por Confirmar': {
      emoji: '🕒',
      msg: 'Recibimos tu pedido y está pendiente de confirmación. Enseguida lo revisamos.',
    },
    Recibido: {
      emoji: '✅',
      msg: '¡Confirmado! Ya tenemos tu pedido en el sistema.',
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
      msg: '¡Pedido entregado! Que disfrutes mucho tu pollazo.',
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
  lines.push('📲 *Mira el estado en vivo aquí:*');
  lines.push(APP_URL);
  lines.push('');
  lines.push('_Pollazo El Mirador_');

  return `https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`;
}
