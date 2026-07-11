const STORAGE_KEY = 'pollazo_order_credentials_v1';

export type OrderCredential = {
  orderCode: string;
  trackingToken: string;
  createdAt: string;
};

const readCredentials = (): OrderCredential[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item.orderCode === 'string' && typeof item.trackingToken === 'string')
      .map(item => ({
        orderCode: String(item.orderCode).slice(0, 100),
        trackingToken: String(item.trackingToken).slice(0, 200),
        createdAt: String(item.createdAt || new Date().toISOString()),
      }))
      .slice(-50);
  } catch {
    return [];
  }
};

export const saveOrderCredential = (
  orderCode: string,
  trackingToken: string
) => {
  if (!orderCode || !trackingToken) return;

  const current = readCredentials().filter(item => item.orderCode !== orderCode);
  current.push({
    orderCode,
    trackingToken,
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(-50)));
};

export const getOrderCredentials = () => readCredentials();

export const getOrderCredential = (orderCode?: string | null) => {
  const code = String(orderCode || '').trim();
  return readCredentials().find(item => item.orderCode === code) || null;
};
