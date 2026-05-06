import { CartItem, OrderStatus } from '../types';

// Tu número configurado
export const WHATSAPP = '+593989795628';
const APP_URL = 'https://pollazogalapagueno.vercel.app';

export const isFixedPrice = (price: string | undefined) => {
  const p = price ?? '';
  return p.startsWith('$') && !Number.isNaN(Number.parseFloat(p.replace('$', '')));
};

export const numericPrice = (price?: string) => isFixedPrice(price) ? Number.parseFloat((price ?? '0').replace('$', '')) : 0;
export const subtotalOf = (items: CartItem[]) => items.reduce((sum, i) => sum + numericPrice(i.product.price) * i.quantity, 0);

// Mantenemos tu lógica de envío: Gratis a partir de $10
export const deliveryFeeOf = (subtotal: number) => (subtotal > 0 && subtotal < 10 ? 1.5 : 0);
export const orderCode = () => `#PLZ-${Math.floor(1000 + Math.random() * 9000)}`;

export function isStoreOpen(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 7 && h < 21;
}

// 1. Mensaje inicial del cliente (con el link de seguimiento)
export function buildWhatsAppUrl(items: CartItem[], phone?: string, code = orderCode(), preorder = !isStoreOpen()): string {
  const fixedItems = items.filter(i => isFixedPrice(i.product.price));
  const consultItems = items.filter(i => !isFixedPrice(i.product.price));
  const allItems = [...fixedItems, ...consultItems];
  const subtotal = subtotalOf(items);
  const delivery = deliveryFeeOf(subtotal);
  const total = subtotal + delivery;

  const lines: string[] = [];
  lines.push(`🛒 *NUEVO PEDIDO ${code}*`);
  lines.push(`📍 *La Casa del Pollazo El Mirador*`);
  if (preorder) lines.push('⏰ *Tipo:* Pre-pedido (local cerrado)');
  lines.push('');
  lines.push(`📱 *Cliente:* ${phone || '_________________'}`);
  lines.push('');
  lines.push('📋 *Detalle:*');
  allItems.forEach(i => {
    const priceLabel = isFixedPrice(i.product.price) ? `${i.product.price} c/u` : 'Precio a consultar';
    lines.push(`• ${i.quantity}x ${i.product.name} (${priceLabel})`);
  });
  lines.push('');

  if (subtotal > 0) {
    lines.push(`Subtotal: $${subtotal.toFixed(2)}`);
    lines.push(delivery > 0 ? `Delivery: $${delivery.toFixed(2)}` : 'Delivery: GRATIS');
    lines.push(`💰 *Total: $${total.toFixed(2)}*`);
  } else {
    lines.push('💰 *Total:* A confirmar');
  }

  if (consultItems.length > 0) lines.push('_(Hay productos con precio a confirmar)_');
  lines.push('');
  lines.push('📍 *Dirección de entrega:* _________________');
  lines.push('');
  lines.push(`🚀 *Sigue el progreso en vivo aquí:*`);
  lines.push(`${APP_URL}`); // El cliente puede volver a la app con un toque
  lines.push('');
  lines.push('_Enviado desde la App Oficial 📱_');

  return `https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
}

// 2. Mensaje que tú envías al cliente desde el Admin (Notificar)
export function buildStatusWhatsAppUrl(phone: string, code: string, status: OrderStatus): string {
  const clean = phone.replace(/\D/g, '');
  
  const statusConfig: Record<OrderStatus, { emoji: string; msg: string }> = {
    Recibido: { emoji: '✅', msg: '¡Confirmado! Ya tenemos tu pedido en nuestro sistema.' },
    Preparando: { emoji: '👨‍🍳', msg: '¡Buenas noticias! Tu pedido ya está en preparación.' },
    Enviado: { emoji: '🛵', msg: '¡Tu pedido va en camino! Prepárate para recibirlo.' },
    Entregado: { emoji: '😋', msg: '¡Pedido entregado! Que disfrutes mucho tu pollazo.' },
    Cancelado: { emoji: '❌', msg: 'Tu pedido ha sido cancelado. Escríbenos si tienes dudas.' },
  };

  const { emoji, msg } = statusConfig[status];

  const lines: string[] = [];
  lines.push(`${emoji} *ACTUALIZACIÓN ORDEN ${code}*`);
  lines.push('');
  lines.push(msg);
  lines.push('');
  lines.push(`📲 *Mira el estado en tiempo real aquí:*`);
  lines.push(`${APP_URL}`);
  lines.push('');
  lines.push(`_Pollazo El Mirador - Puerto Ayora_`);

  return `https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`;
}
