export type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  timestamp: number;
  speedMps?: number | null;
  headingDeg?: number | null;
};

export type TrackingAnchors = {
  store: Pick<GeoPoint, 'latitude' | 'longitude'>;
  customer: Pick<GeoPoint, 'latitude' | 'longitude'>;
};

export type TrackingStatus =
  | 'waiting_confirmation'
  | 'packing'
  | 'en_route'
  | 'nearby'
  | 'arrived'
  | 'delivered';

export type TrackingConfig = {
  maxAccuracyM: number;
  departureRadiusM: number;
  nearbyRadiusM: number;
  arrivalRadiusM: number;
  minMovementM: number;
  departureSamples: number;
  nearbySamples: number;
  arrivalSamples: number;
  maxPlausibleSpeedMps: number;
  sendEveryMs: number;
  sendAfterMovementM: number;
};

export type TrackingState = {
  status: TrackingStatus;
  lastAcceptedPoint: GeoPoint | null;
  lastSentPoint: GeoPoint | null;
  path: GeoPoint[];
  acceptedSamples: number;
  rejectedSamples: number;
  sentUpdates: number;
  pendingUploads: number;
  departureStreak: number;
  nearbyStreak: number;
  arrivalStreak: number;
  movingStreak: number;
  distanceFromStoreM: number | null;
  distanceToCustomerM: number | null;
  lastDecision: string;
  lastTransitionAt: number | null;
};

export type ProcessGpsResult = {
  state: TrackingState;
  accepted: boolean;
  transitioned: boolean;
  shouldNotifyCustomer: boolean;
};

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  maxAccuracyM: 60,
  departureRadiusM: 130,
  nearbyRadiusM: 180,
  arrivalRadiusM: 45,
  minMovementM: 8,
  departureSamples: 3,
  nearbySamples: 2,
  arrivalSamples: 2,
  maxPlausibleSpeedMps: 45,
  sendEveryMs: 5_000,
  sendAfterMovementM: 10,
};

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function haversineDistanceM(
  first: Pick<GeoPoint, 'latitude' | 'longitude'>,
  second: Pick<GeoPoint, 'latitude' | 'longitude'>
) {
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLng = toRadians(second.longitude - first.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointAtDistance(
  origin: Pick<GeoPoint, 'latitude' | 'longitude'>,
  distanceM: number,
  bearingDeg: number
): Pick<GeoPoint, 'latitude' | 'longitude'> {
  const angularDistance = distanceM / EARTH_RADIUS_M;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(origin.latitude);
  const lng1 = toRadians(origin.longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: ((toDegrees(lng2) + 540) % 360) - 180,
  };
}

export function createTrackingState(): TrackingState {
  return {
    status: 'waiting_confirmation',
    lastAcceptedPoint: null,
    lastSentPoint: null,
    path: [],
    acceptedSamples: 0,
    rejectedSamples: 0,
    sentUpdates: 0,
    pendingUploads: 0,
    departureStreak: 0,
    nearbyStreak: 0,
    arrivalStreak: 0,
    movingStreak: 0,
    distanceFromStoreM: null,
    distanceToCustomerM: null,
    lastDecision: 'Esperando confirmación manual del pedido.',
    lastTransitionAt: null,
  };
}

export function confirmOrder(state: TrackingState, timestamp = Date.now()): TrackingState {
  if (state.status !== 'waiting_confirmation') return state;
  return {
    ...state,
    status: 'packing',
    lastDecision: 'Pedido confirmado manualmente. El sistema vigila la salida real del local.',
    lastTransitionAt: timestamp,
  };
}

export function markDelivered(state: TrackingState, timestamp = Date.now()): TrackingState {
  if (state.status === 'waiting_confirmation' || state.status === 'delivered') return state;
  return {
    ...state,
    status: 'delivered',
    lastDecision: 'Entrega confirmada manualmente por el repartidor.',
    lastTransitionAt: timestamp,
  };
}

const smoothPoint = (previous: GeoPoint | null, next: GeoPoint): GeoPoint => {
  if (!previous) return next;

  const accuracyWeight = clamp(1 - next.accuracyM / 100, 0.2, 0.78);
  return {
    ...next,
    latitude: previous.latitude + (next.latitude - previous.latitude) * accuracyWeight,
    longitude: previous.longitude + (next.longitude - previous.longitude) * accuracyWeight,
  };
};

const rejectSample = (state: TrackingState, decision: string): ProcessGpsResult => ({
  accepted: false,
  transitioned: false,
  shouldNotifyCustomer: false,
  state: {
    ...state,
    rejectedSamples: state.rejectedSamples + 1,
    departureStreak: 0,
    nearbyStreak: 0,
    arrivalStreak: 0,
    lastDecision: decision,
  },
});

export function processGpsSample(
  state: TrackingState,
  rawPoint: GeoPoint,
  anchors: TrackingAnchors,
  online: boolean,
  config: TrackingConfig = DEFAULT_TRACKING_CONFIG
): ProcessGpsResult {
  if (!Number.isFinite(rawPoint.latitude) || !Number.isFinite(rawPoint.longitude)) {
    return rejectSample(state, 'Lectura ignorada: coordenadas inválidas.');
  }

  if (!Number.isFinite(rawPoint.accuracyM) || rawPoint.accuracyM <= 0) {
    return rejectSample(state, 'Lectura ignorada: el teléfono no informó precisión.');
  }

  if (rawPoint.accuracyM > config.maxAccuracyM) {
    return rejectSample(
      state,
      `GPS débil: precisión de ${Math.round(rawPoint.accuracyM)} m. No se cambió el pedido.`
    );
  }

  const previous = state.lastAcceptedPoint;
  if (previous && rawPoint.timestamp <= previous.timestamp) {
    return rejectSample(state, 'Lectura ignorada: llegó fuera de orden.');
  }

  const rawMovementM = previous ? haversineDistanceM(previous, rawPoint) : 0;
  const elapsedSeconds = previous
    ? Math.max(0.001, (rawPoint.timestamp - previous.timestamp) / 1000)
    : 0;
  const calculatedSpeedMps = previous ? rawMovementM / elapsedSeconds : 0;
  const reportedSpeedMps = Math.max(0, Number(rawPoint.speedMps || 0));
  const effectiveSpeedMps = Math.max(calculatedSpeedMps, reportedSpeedMps);

  if (previous && effectiveSpeedMps > config.maxPlausibleSpeedMps) {
    return rejectSample(
      state,
      `Salto imposible ignorado: ${Math.round(effectiveSpeedMps * 3.6)} km/h.`
    );
  }

  const point = smoothPoint(previous, rawPoint);
  const movementM = previous ? haversineDistanceM(previous, point) : 0;
  const distanceFromStoreM = haversineDistanceM(point, anchors.store);
  const distanceToCustomerM = haversineDistanceM(point, anchors.customer);
  const moving = movementM >= config.minMovementM || effectiveSpeedMps >= 1.2;

  const departureStreak =
    state.status === 'packing' && moving && distanceFromStoreM >= config.departureRadiusM
      ? state.departureStreak + 1
      : 0;

  const nearbyStreak =
    (state.status === 'en_route' || state.status === 'nearby') &&
    distanceToCustomerM <= config.nearbyRadiusM
      ? state.nearbyStreak + 1
      : 0;

  const arrivalStreak =
    (state.status === 'en_route' || state.status === 'nearby' || state.status === 'arrived') &&
    distanceToCustomerM <= config.arrivalRadiusM
      ? state.arrivalStreak + 1
      : 0;

  let nextStatus = state.status;
  let decision = `Ubicación válida · ${Math.round(distanceFromStoreM)} m del local · ${Math.round(distanceToCustomerM)} m del cliente.`;

  if (state.status === 'packing' && departureStreak >= config.departureSamples) {
    nextStatus = 'en_route';
    decision = 'Salida confirmada con varias lecturas: el pedido cambió automáticamente a En camino.';
  } else if (
    (state.status === 'en_route' || state.status === 'nearby') &&
    arrivalStreak >= config.arrivalSamples
  ) {
    nextStatus = 'arrived';
    decision = 'Llegada detectada. El pedido espera confirmación manual de Entregado.';
  } else if (state.status === 'en_route' && nearbyStreak >= config.nearbySamples) {
    nextStatus = 'nearby';
    decision = 'El repartidor entró al radio del cliente: Ya casi llega.';
  }

  const transitioned = nextStatus !== state.status;
  const shouldTransmit =
    !state.lastSentPoint ||
    rawPoint.timestamp - state.lastSentPoint.timestamp >= config.sendEveryMs ||
    haversineDistanceM(state.lastSentPoint, point) >= config.sendAfterMovementM;

  const pendingUploads = shouldTransmit && !online ? state.pendingUploads + 1 : state.pendingUploads;
  const sentUpdates = shouldTransmit && online ? state.sentUpdates + 1 : state.sentUpdates;
  const lastSentPoint = shouldTransmit && online ? point : state.lastSentPoint;

  return {
    accepted: true,
    transitioned,
    shouldNotifyCustomer: transitioned && (nextStatus === 'en_route' || nextStatus === 'nearby'),
    state: {
      ...state,
      status: nextStatus,
      lastAcceptedPoint: point,
      lastSentPoint,
      path: [...state.path, point].slice(-120),
      acceptedSamples: state.acceptedSamples + 1,
      sentUpdates,
      pendingUploads,
      departureStreak,
      nearbyStreak,
      arrivalStreak,
      movingStreak: moving ? state.movingStreak + 1 : 0,
      distanceFromStoreM,
      distanceToCustomerM,
      lastDecision: decision,
      lastTransitionAt: transitioned ? rawPoint.timestamp : state.lastTransitionAt,
    },
  };
}

export function flushPendingUpdates(state: TrackingState): TrackingState {
  if (state.pendingUploads === 0) return state;
  return {
    ...state,
    sentUpdates: state.sentUpdates + state.pendingUploads,
    pendingUploads: 0,
    lastSentPoint: state.lastAcceptedPoint || state.lastSentPoint,
    lastDecision: 'La conexión volvió y las ubicaciones pendientes se sincronizaron.',
  };
}

export function statusLabel(status: TrackingStatus) {
  switch (status) {
    case 'waiting_confirmation':
      return 'Por confirmar';
    case 'packing':
      return 'Empacando';
    case 'en_route':
      return 'En camino';
    case 'nearby':
      return 'Ya casi llega';
    case 'arrived':
      return 'Llegó al destino';
    case 'delivered':
      return 'Entregado';
  }
}

export function buildDemoRoute(
  anchors: TrackingAnchors,
  startTimestamp = Date.now()
): GeoPoint[] {
  const route: GeoPoint[] = [];
  const steps = 14;

  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const noiseM = index % 3 === 0 ? 4 : -3;
    const base = {
      latitude:
        anchors.store.latitude +
        (anchors.customer.latitude - anchors.store.latitude) * ratio,
      longitude:
        anchors.store.longitude +
        (anchors.customer.longitude - anchors.store.longitude) * ratio,
    };
    const noisy = pointAtDistance(base, Math.abs(noiseM), noiseM >= 0 ? 70 : 250);

    route.push({
      ...noisy,
      accuracyM: index === 4 ? 125 : 10 + (index % 4) * 4,
      timestamp: startTimestamp + index * 6_000,
      speedMps: index === 0 ? 0 : index >= steps - 1 ? 0.8 : 5.2,
      headingDeg: 80,
    });
  }

  return route;
}
