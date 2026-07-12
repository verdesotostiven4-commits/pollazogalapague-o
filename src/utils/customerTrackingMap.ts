export type PublicTrackingStatus =
  | 'packing'
  | 'en_route'
  | 'nearby'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type PublicTrackingPoint = {
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  speed_mps?: number | null;
  heading_deg?: number | null;
  captured_at?: string | null;
};

export type PublicTrackingPayload = {
  ok: boolean;
  active?: boolean;
  error?: string;
  code?: string;
  setupRequired?: boolean;
  order?: {
    orderCode: string;
    status: string;
    updatedAt?: string | null;
  };
  tracking?: {
    id: string;
    status: PublicTrackingStatus;
    riderName: string;
    store: { latitude: number; longitude: number };
    customer: {
      latitude: number;
      longitude: number;
      reference?: string | null;
    };
    current?: {
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
    path: PublicTrackingPoint[];
  };
};

export const trackingStatusUi = {
  packing: {
    label: 'Empacando',
    message: 'Estamos preparando tu pedido con cuidado.',
    progress: 28,
  },
  en_route: {
    label: 'En camino',
    message: 'Tu pedido salió del local y va hacia ti.',
    progress: 58,
  },
  nearby: {
    label: 'Ya casi llega',
    message: 'El repartidor está muy cerca de tu ubicación.',
    progress: 84,
  },
  arrived: {
    label: 'Llegó al destino',
    message: 'Revisa la entrada o comunícate con el repartidor.',
    progress: 94,
  },
  delivered: {
    label: 'Entregado',
    message: 'Tu pedido fue entregado. ¡Gracias por elegirnos!',
    progress: 100,
  },
  cancelled: {
    label: 'Cancelado',
    message: 'El rastreo de este pedido fue cancelado.',
    progress: 0,
  },
} as const;

export const interpolateCoordinate = (
  from: [number, number],
  to: [number, number],
  progress: number
): [number, number] => {
  const safe = Math.max(0, Math.min(1, progress));
  return [
    from[0] + (to[0] - from[0]) * safe,
    from[1] + (to[1] - from[1]) * safe,
  ];
};

export const formatTrackingTime = (value?: string | null) => {
  if (!value) return 'Sin actualización';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin actualización';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 8) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds} s`;
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  return date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
