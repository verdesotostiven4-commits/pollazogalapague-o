import { getOrderCredentials } from './orderCredentials';
import type { Order } from '../types';

export const fetchCustomerOrders = async (): Promise<Order[]> => {
  const credentials = getOrderCredentials();

  if (credentials.length === 0) return [];

  const response = await fetch('/api/customer-orders', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credentials }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    orders?: Order[];
  };

  if (!response.ok || !result.ok || !Array.isArray(result.orders)) {
    return [];
  }

  return result.orders;
};
