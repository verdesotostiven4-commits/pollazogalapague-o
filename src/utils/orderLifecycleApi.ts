import type { Order, OrderStatus, PaymentStatus } from '../types';

export type LifecyclePanel = 'admin' | 'delivery';

type LifecycleResponse = {
  ok?: boolean;
  error?: string;
  order?: Order;
};

const request = async (
  panel: LifecyclePanel,
  payload: Record<string, unknown>
): Promise<Order> => {
  const response = await fetch('/api/order-lifecycle', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ panel, ...payload }),
  });

  const result = (await response.json().catch(() => ({}))) as LifecycleResponse;

  if (!response.ok || !result.ok || !result.order) {
    throw new Error(result.error || 'No se pudo actualizar el pedido.');
  }

  return result.order;
};

export const transitionOrder = (
  panel: LifecyclePanel,
  orderId: string,
  status: OrderStatus,
  reason?: string | null
) => {
  return request(panel, {
    action: 'transition',
    orderId,
    status,
    reason: reason || null,
  });
};

export const updateOrderPayment = (
  panel: LifecyclePanel,
  orderId: string,
  paymentStatus: Extract<PaymentStatus, 'confirmado' | 'rechazado' | 'contra_entrega'>
) => {
  return request(panel, {
    action: 'payment',
    orderId,
    paymentStatus,
  });
};
