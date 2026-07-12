import {
  enqueueTrackingUpdates,
  flushTrackingQueue,
  type QueuedTrackingUpdate,
} from './deliveryTrackingQueue';

export type TrackingStatus =
  | 'packing'
  | 'en_route'
  | 'nearby'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

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

export type TrackingDevice = {
  id: string;
  name: string;
  enabled: boolean;
  max_orders: number;
  last_seen_at?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
  current_accuracy_m?: number | null;
  battery_percent?: number | null;
  online?: boolean;
  load?: number;
  activeOrders?: TrackingSession[];
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

type TrackingError = Error & {
  status?: number;
  code?: string;
  setupRequired?: boolean;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as ApiResult<T>;
  if (!response.ok || payload.ok === false) {
    const error = new Error(
      payload.error || 'No se pudo completar la operación de rastreo.'
    ) as TrackingError;
    error.status = response.status;
    error.code = payload.code;
    error.setupRequired = payload.setupRequired;
    throw error;
  }
  return payload as T;
};

const postTrackingRequest = async <T>(
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

const asQueuedUpdate = (
  payload: Record<string, unknown>
): QueuedTrackingUpdate | null => {
  const candidate = payload as Partial<QueuedTrackingUpdate>;
  if (
    !candidate.deviceToken ||
    !candidate.sessionId ||
    !Number.isFinite(Number(candidate.latitude)) ||
    !Number.isFinite(Number(candidate.longitude)) ||
    !Number.isFinite(Number(candidate.accuracyM)) ||
    !candidate.capturedAt
  ) {
    return null;
  }

  return {
    deviceToken: String(candidate.deviceToken),
    sessionId: String(candidate.sessionId),
    latitude: Number(candidate.latitude),
    longitude: Number(candidate.longitude),
    accuracyM: Number(candidate.accuracyM),
    speedMps:
      candidate.speedMps === null || candidate.speedMps === undefined
        ? null
        : Number(candidate.speedMps),
    headingDeg:
      candidate.headingDeg === null || candidate.headingDeg === undefined
        ? null
        : Number(candidate.headingDeg),
    capturedAt: candidate.capturedAt,
    batteryPercent:
      candidate.batteryPercent === null || candidate.batteryPercent === undefined
        ? null
        : Number(candidate.batteryPercent),
  };
};

const permanentQueueStatuses = new Set([400, 401, 403, 404, 409, 410, 422]);

const flushPendingLocations = async () => {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;

  await flushTrackingQueue(async item => {
    try {
      await postTrackingRequest(
        'update_location',
        item as unknown as Record<string, unknown>
      );
    } catch (cause) {
      const status = Number((cause as TrackingError)?.status || 0);

      // Una sesión entregada, cancelada o eliminada no debe bloquear para siempre
      // las ubicaciones más nuevas que estén detrás en la cola.
      if (permanentQueueStatuses.has(status)) return;
      throw cause;
    }
  });
};

export const trackingPost = async <T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> => {
  if (action === 'update_location') {
    const queuedUpdate = asQueuedUpdate(payload);

    if (typeof navigator !== 'undefined' && !navigator.onLine && queuedUpdate) {
      enqueueTrackingUpdates([queuedUpdate]);
      return {
        ok: true,
        accepted: false,
        queued: true,
        reason: 'Ubicación guardada hasta recuperar internet.',
      } as T;
    }

    try {
      await flushPendingLocations();
      return await postTrackingRequest<T>(action, payload);
    } catch (cause) {
      const status = Number((cause as TrackingError)?.status || 0);
      if (!status && queuedUpdate) {
        enqueueTrackingUpdates([queuedUpdate]);
        return {
          ok: true,
          accepted: false,
          queued: true,
          reason: 'Ubicación guardada por conexión inestable.',
        } as T;
      }
      throw cause;
    }
  }

  try {
    await flushPendingLocations();
  } catch {
    // La cola se reintentará en la próxima petición o al recuperar conexión.
  }

  return postTrackingRequest<T>(action, payload);
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
