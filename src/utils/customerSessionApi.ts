import type { CustomerMembership, DeliveryAddress } from '../types';

export type CustomerSessionCustomer = {
  phone?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  points?: number | null;
  exp?: number | null;
  is_vip?: boolean | null;
  phone_verified?: boolean | null;
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;
  delivery_addresses?: DeliveryAddress[] | null;
  selected_delivery_address_id?: string | null;
  membership_status?: CustomerMembership['status'] | 'none' | null;
  membership_plan?: string | null;
  membership_started_at?: string | null;
  membership_expires_at?: string | null;
  membership_updated_at?: string | null;
};

export type CustomerSessionAccount = {
  customer: CustomerSessionCustomer | null;
  membership: CustomerMembership | null;
};

export type CustomerProfilePayload = {
  phone?: string;
  name?: string | null;
  avatarUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;
  deliveryAddresses?: DeliveryAddress[];
  selectedDeliveryAddressId?: string | null;
};

const request = async (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  payload?: CustomerProfilePayload
): Promise<CustomerSessionAccount> => {
  const response = await fetch('/api/customer-session', {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    customer?: CustomerSessionCustomer | null;
    membership?: CustomerMembership | null;
  };

  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'No se pudo validar la sesión del cliente.');
  }

  return {
    customer: result.customer || null,
    membership: result.membership || null,
  };
};

export const openCustomerSession = (payload: CustomerProfilePayload) =>
  request('POST', payload);

export const fetchCustomerSession = () => request('GET');

export const updateCustomerSession = (payload: CustomerProfilePayload) =>
  request('PATCH', payload);

export const closeCustomerSession = async () => {
  try {
    await request('DELETE');
  } catch {
    // El cierre local debe continuar aunque el servidor no responda.
  }
};
