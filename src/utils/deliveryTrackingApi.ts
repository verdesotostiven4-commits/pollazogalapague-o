export type TrackingStatus =
  | 'packing'
  | 'en_route'
  | 'nearby'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type TrackingDevice = {
  id: string;
  name: string;
  enabled: boolean;
  max_orders: number;
  last_seen_at?: string | null;
  battery_percent?: number | null;
  online?: boolean;
  load?: number;
  activeOrders?: Array<{
    id: string;
    device_id: string;
    order_code: string;
    status: TrackingStatus;
    updated_at?: string | null;
  }>;
};

export type TrackingSession = {
  id: string;
  device_id: string;
  order_code: string;
  status: TrackingStatus;
  store_lat: number;
  store_lng: number;
  customer_lat: number;
  customer_lng: number;
  customer_reference?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
  current_accuracy_m?: number | null;
  last_captured_at?: string | null;
  updated_at?: string | null;
};

export type TrackingPoint = {
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  speed_mps?: number | null;
  heading_deg?: number | null;
  captured_at: string;
};

export type PublicTracking = {
  ok: true;
  active: boolean;
  order: {
    orderCode: string;
    status: string;
    updatedAt?: string | null;
  };
  tracking?: {
    id: string;
    status: TrackingStatus;
    riderName: string;
    store: { latitude: number; longitude: number };
    customer: { latitude: number; longitude: number; reference?: string };
    current: {
      latitude: number;
      longitude: number;
      accuracyM?: number | null;
      speedMps?: number | null;
      headingDeg?: number | null;
      capturedAt?: string | null;
    } | null;
    startedAt?: string | null;
    updatedAt?: string | null;
    completedAt?: string | null;
    path: TrackingPoint[];
  };
};

type ApiResult<T> = T & {
  ok?: boolean;
  error?: string;
  code?: string;
  setupRequired?: boolean;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as ApiResult<T>;
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.error || 'No se pudo completar la operación de rastreo.');
    Object.assign(error, {
      status: response.status,
      code: payload.code,
      setupRequired: payload.setupRequired,
    });
    throw error;
  }
  return payload as T;
};

export const trackingPost = async <T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> => {
  const response = await fetch('/api/delivery-tracking', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return parseResponse<T>(response);
};

export const readPublicTracking = async (
  orderCode: string,
  trackingToken: string,
  signal?: AbortSignal
) => {
  const params = new URLSearchParams({
    action: 'public',
    orderCode,
    trackingToken,
  });
  const response = await fetch(`/api/delivery-tracking?${params.toString()}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  return parseResponse<PublicTracking>(response);
};

export const trackingStatusLabel = (status?: TrackingStatus | null) => {
  if (status === 'packing') return 'Empacando';
  if (status === 'en_route') return 'En camino';
  if (status === 'nearby') return 'Ya casi llega';
  if (status === 'arrived') return 'Llegó al destino';
  if (status === 'delivered') return 'Entregado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Sin rastreo';
};
