import type { OrderStatus } from '../types';

export const STORE_LOCATION = {
  lat: -0.7439,
  lng: -90.3131,
} as const;

export const PUERTO_AYORA_BOUNDS = {
  latMin: -0.765,
  latMax: -0.728,
  lngMin: -90.345,
  lngMax: -90.295,
} as const;

export const MIN_ORDER_SUBTOTAL = 5;
export const SMALL_ORDER_THRESHOLD = 10;
export const SMALL_ORDER_FEE = 0.6;
export const FREE_DELIVERY_THRESHOLD = 50;

export type DeliveryZone = 'cercana' | 'media' | 'lejana';

export interface OrderPricing {
  subtotal: number;
  roadDistanceKm: number | null;
  zone: DeliveryZone;
  deliveryFeeOriginal: number;
  deliveryFeeFinal: number;
  smallOrderFee: number;
  freeDeliveryApplied: boolean;
  minimumReached: boolean;
  amountMissingForMinimum: number;
  amountMissingForNoSmallOrderFee: number;
  total: number;
}

export interface EtaEstimate {
  minMinutes: number;
  maxMinutes: number;
  label: string;
}

export interface ArrivalWindow {
  from: Date;
  to: Date;
  label: string;
}

const toMoney = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(2)) : 0;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const isInsidePuertoAyora = (lat?: number | null, lng?: number | null) =>
  typeof lat === 'number' &&
  Number.isFinite(lat) &&
  typeof lng === 'number' &&
  Number.isFinite(lng) &&
  lat >= PUERTO_AYORA_BOUNDS.latMin &&
  lat <= PUERTO_AYORA_BOUNDS.latMax &&
  lng >= PUERTO_AYORA_BOUNDS.lngMin &&
  lng <= PUERTO_AYORA_BOUNDS.lngMax;

export const straightDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) => {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const approximateRoadDistanceKm = (lat?: number | null, lng?: number | null) => {
  if (!isInsidePuertoAyora(lat, lng)) return null;

  const direct = straightDistanceKm(
    STORE_LOCATION.lat,
    STORE_LOCATION.lng,
    lat as number,
    lng as number
  );

  // Puerto Ayora tiene calles cortas e irregulares. Este factor evita prometer
  // la distancia en línea recta como si fuera la ruta real.
  return Number((direct * 1.22).toFixed(2));
};

export const deliveryZoneForDistance = (distanceKm?: number | null): DeliveryZone => {
  if (distanceKm === null || distanceKm === undefined) return 'cercana';
  if (distanceKm <= 1.5) return 'cercana';
  if (distanceKm <= 3) return 'media';
  return 'lejana';
};

export const deliveryFeeForDistance = (distanceKm?: number | null) => {
  const zone = deliveryZoneForDistance(distanceKm);
  if (zone === 'cercana') return 1.5;
  if (zone === 'media') return 1.75;
  return 2;
};

export const smallOrderFeeFor = (subtotal: number) => {
  if (!Number.isFinite(subtotal) || subtotal < MIN_ORDER_SUBTOTAL) return 0;
  return subtotal < SMALL_ORDER_THRESHOLD ? SMALL_ORDER_FEE : 0;
};

export const calculateOrderPricing = ({
  subtotal,
  customerLat,
  customerLng,
}: {
  subtotal: number;
  customerLat?: number | null;
  customerLng?: number | null;
}): OrderPricing => {
  const cleanSubtotal = toMoney(Math.max(0, Number(subtotal) || 0));
  const roadDistanceKm = approximateRoadDistanceKm(customerLat, customerLng);
  const zone = deliveryZoneForDistance(roadDistanceKm);
  const deliveryFeeOriginal = cleanSubtotal > 0 ? deliveryFeeForDistance(roadDistanceKm) : 0;
  const freeDeliveryApplied = cleanSubtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFeeFinal = freeDeliveryApplied ? 0 : deliveryFeeOriginal;
  const smallOrderFee = smallOrderFeeFor(cleanSubtotal);
  const total = toMoney(cleanSubtotal + deliveryFeeFinal + smallOrderFee);

  return {
    subtotal: cleanSubtotal,
    roadDistanceKm,
    zone,
    deliveryFeeOriginal: toMoney(deliveryFeeOriginal),
    deliveryFeeFinal: toMoney(deliveryFeeFinal),
    smallOrderFee: toMoney(smallOrderFee),
    freeDeliveryApplied,
    minimumReached: cleanSubtotal >= MIN_ORDER_SUBTOTAL,
    amountMissingForMinimum: toMoney(Math.max(0, MIN_ORDER_SUBTOTAL - cleanSubtotal)),
    amountMissingForNoSmallOrderFee: toMoney(
      Math.max(0, SMALL_ORDER_THRESHOLD - cleanSubtotal)
    ),
    total,
  };
};

export const estimateCartEta = ({
  customerLat,
  customerLng,
  totalUnits = 1,
  queueDepth = 0,
}: {
  customerLat?: number | null;
  customerLng?: number | null;
  totalUnits?: number;
  queueDepth?: number;
}): EtaEstimate => {
  const distanceKm = approximateRoadDistanceKm(customerLat, customerLng);
  const zone = deliveryZoneForDistance(distanceKm);

  let minMinutes = zone === 'cercana' ? 15 : zone === 'media' ? 20 : 25;
  let maxMinutes = zone === 'cercana' ? 25 : zone === 'media' ? 35 : 45;

  const units = Math.max(1, Math.round(totalUnits || 1));
  if (units >= 8) {
    minMinutes += 3;
    maxMinutes += 5;
  }
  if (units >= 16) {
    minMinutes += 4;
    maxMinutes += 7;
  }

  const queueExtra = Math.min(20, Math.max(0, Math.round(queueDepth)) * 4);
  minMinutes += queueExtra;
  maxMinutes += queueExtra;

  return {
    minMinutes,
    maxMinutes,
    label: `${minMinutes}–${maxMinutes} min`,
  };
};

const statusAdjustment = (status?: OrderStatus | string | null) => {
  if (status === 'Enviado') return { min: 0, max: -12 };
  if (status === 'Preparando') return { min: 0, max: -6 };
  if (status === 'Recibido') return { min: 0, max: -2 };
  return { min: 0, max: 0 };
};

const formatClock = (date: Date) =>
  date.toLocaleTimeString('es-EC', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const estimateArrivalWindow = ({
  status,
  customerLat,
  customerLng,
  totalUnits = 1,
  queueDepth = 0,
  now = new Date(),
  anchor = null,
}: {
  status?: OrderStatus | string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  totalUnits?: number;
  queueDepth?: number;
  now?: Date;
  anchor?: Date | string | null;
}): ArrivalWindow | null => {
  if (status === 'Entregado' || status === 'Cancelado') return null;

  const eta = estimateCartEta({
    customerLat,
    customerLng,
    totalUnits,
    queueDepth,
  });
  const adjustment = statusAdjustment(status);
  const minMinutes = Math.max(6, eta.minMinutes + adjustment.min);
  const maxMinutes = Math.max(minMinutes + 5, eta.maxMinutes + adjustment.max);
  const parsedAnchor = anchor instanceof Date ? anchor : anchor ? new Date(anchor) : null;
  const base = parsedAnchor && Number.isFinite(parsedAnchor.getTime()) ? parsedAnchor : now;
  let from = new Date(base.getTime() + minMinutes * 60_000);
  let to = new Date(base.getTime() + maxMinutes * 60_000);

  if (to.getTime() < now.getTime()) {
    from = new Date(now.getTime() + 5 * 60_000);
    to = new Date(now.getTime() + Math.max(12, maxMinutes - minMinutes + 8) * 60_000);
  }

  return {
    from,
    to,
    label: `${formatClock(from)}–${formatClock(to)}`,
  };
};

export const zoneLabel = (zone: DeliveryZone) => {
  if (zone === 'media') return 'Zona media';
  if (zone === 'lejana') return 'Zona lejana';
  return 'Zona cercana';
};
