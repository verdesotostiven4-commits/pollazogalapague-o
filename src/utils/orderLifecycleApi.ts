import type { Order, OrderStatus, PaymentStatus } from '../types';

export type LifecyclePanel = 'admin' | 'delivery';

type LifecycleResponse = {
  ok?: boolean;
  error?: string;
  order?: Order;
};

const renewPanelSession = async (panel: LifecyclePanel) => {
  const response = await fetch('/api/verify-panel-pin', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ panel }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'No se pudo renovar la sesión del panel.');
  }
};

const performRequest = async (
  panel: LifecyclePanel,
  payload: Record<string, unknown>
) => {
  const response = await fetch('/api/order-lifecycle', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ panel, ...payload }),
  });

  const result = (await response.json().catch(() => ({}))) as LifecycleResponse;
  return { response, result };
};

const request = async (
  panel: LifecyclePanel,
  payload: Record<string, unknown>
): Promise<Order> => {
  let attempt = await performRequest(panel, payload);

  if (attempt.response.status === 401) {
    await renewPanelSession(panel);
    attempt = await performRequest(panel, payload);
  }

  if (!attempt.response.ok || !attempt.result.ok || !attempt.result.order) {
    throw new Error(attempt.result.error || 'No se pudo actualizar el pedido.');
  }

  return attempt.result.order;
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
