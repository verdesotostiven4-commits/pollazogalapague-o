import { CartItem, OrderStatus } from '../types';

export const WHATSAPP = '+593989795628';

export const isFixedPrice = (price: string | undefined) => {
  const p = price ?? '';
  return p.startsWith('$') && !Number.isNaN(Number.parseFloat(p.replace('$', '')));
};

export const numericPrice = (price?: string) => isFixedPrice(price) ? Number.parseFloat((price ?? '0').replace('$', '')) : 0;
export const subtotalOf = (items: CartItem[]) => items.reduce((sum, i) => sum + numericPrice(i.product.price) * i.quantity, 0);
export const deliveryFeeOf = (subtotal: number) => subtotal > 0 && subtotal < 10 ? 1.5 : 0;
export const orderCode = () => `#PLZ-${Math.floor(1000 + Math.random() * 9000)}`;

export function isStoreOpen(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 7 && h < 21;
}

export function buildWhatsAppUrl(items: CartItem[], phone?: string, code = orderCode(), preorder = !isStoreOpen()): string {
  const fixedItems = items.filter(i => isFixedPrice(i.product.price));
  const consultItems = items.filter(i => !isFixedPrice(i.product.price));
  const allItems = [...fixedItems, ...consultItems];
  const subtotal = subtotalOf(items);
  const delivery = deliveryFeeOf(subtotal);
  const total = subtotal + delivery;

  const lines: string[] = [];
  lines.push(`🛒 *NUEVO PEDIDO ${code} - La Casa del Pollazo*`);
  if (preorder) lines.push('⏰ *Tipo:* Pre-pedido (local cerrado ahora)');
  lines.push('');
  lines.push(`📱 *Celular cliente:* ${phone || '_________________'}`);
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
  lines.push('📍 *Dirección:* _________________');
  lines.push('');
  lines.push('_Enviado desde la App Oficial 📱_');
  return `https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildStatusWhatsAppUrl(phone: string, code: string, status: OrderStatus): string {
  const clean = phone.replace(/\D/g, '');
  const messages: Record<OrderStatus, string> = {
    Recibido: `Hola, tu pedido ${code} fue recibido correctamente. Te avisaremos cuando pase a preparación.`,
    Preparando: `Hola, tu pedido ${code} ya está en preparación.`,
    Enviado: `Hola, tu pedido ${code} ya salió para entrega.`,
    Entregado: `Gracias por tu compra. Tu pedido ${code} fue entregado.`,
    Cancelado: `Hola, necesitamos cancelar o revisar tu pedido ${code}. Por favor contáctanos.`,
  };
  return `https://wa.me/${clean}?text=${encodeURIComponent(messages[status])}`;
}
