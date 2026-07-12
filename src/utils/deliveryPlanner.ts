export type SimOrderStatus =
  | 'confirmado'
  | 'empacando'
  | 'listo'
  | 'en_camino'
  | 'cerca'
  | 'entregado';

export type SimOrder = {
  id: string;
  code: string;
  customer: string;
  ageMinutes: number;
  distanceKm: number;
  needsCascada?: boolean;
  status: SimOrderStatus;
  assignedRiderId?: string | null;
};

export type SimRider = {
  id: string;
  name: string;
  active: boolean;
  maxOrders: number;
  distanceFromMiradorM: number;
  distanceFromCustomerM?: number;
  moving: boolean;
  gpsAccuracyM: number;
};

export type DeliveryAssignment = {
  riderId: string;
  orderIds: string[];
  stops: Array<'mirador' | 'cascada' | string>;
  estimatedKm: number;
};

const orderPriority = (order: SimOrder) => {
  const cascadaPenalty = order.needsCascada ? 0.25 : 0;
  return order.ageMinutes * 4 - order.distanceKm - cascadaPenalty;
};

export function planDeliveries(
  orders: SimOrder[],
  riders: SimRider[]
): DeliveryAssignment[] {
  const available = riders
    .filter(rider => rider.active)
    .map(rider => ({ rider, orders: [] as SimOrder[], load: 0 }));

  if (available.length === 0) return [];

  const readyOrders = orders
    .filter(order => order.status === 'listo' && !order.assignedRiderId)
    .sort((a, b) => orderPriority(b) - orderPriority(a));

  readyOrders.forEach(order => {
    const target = [...available]
      .filter(slot => slot.orders.length < Math.max(1, slot.rider.maxOrders))
      .sort((a, b) => a.load - b.load)[0];

    if (!target) return;

    target.orders.push(order);
    target.load += order.distanceKm + (order.needsCascada ? 0.7 : 0);
  });

  return available
    .filter(slot => slot.orders.length > 0)
    .map(slot => {
      const cascadaNeeded = slot.orders.some(order => order.needsCascada);
      const stops: DeliveryAssignment['stops'] = ['mirador'];

      if (cascadaNeeded) stops.push('cascada');
      slot.orders.forEach(order => stops.push(order.id));

      return {
        riderId: slot.rider.id,
        orderIds: slot.orders.map(order => order.id),
        stops,
        estimatedKm: Number(
          (
            slot.orders.reduce((sum, order) => sum + order.distanceKm, 0) +
            (cascadaNeeded ? 0.7 : 0)
          ).toFixed(1)
        ),
      };
    });
}

export function deriveAutomaticStatus(
  order: SimOrder,
  rider?: SimRider | null
): SimOrderStatus {
  if (!rider || !rider.active) return order.status;
  if (order.status === 'entregado') return 'entregado';
  if (order.status === 'confirmado') return 'empacando';
  if (order.status === 'empacando') return 'listo';

  const reliableGps = rider.gpsAccuracyM > 0 && rider.gpsAccuracyM <= 60;
  if (!reliableGps) return order.status;

  if (
    (order.status === 'listo' || order.status === 'en_camino') &&
    rider.moving &&
    rider.distanceFromMiradorM >= 120
  ) {
    if (
      typeof rider.distanceFromCustomerM === 'number' &&
      rider.distanceFromCustomerM <= 180
    ) {
      return 'cerca';
    }

    return 'en_camino';
  }

  if (
    (order.status === 'en_camino' || order.status === 'cerca') &&
    typeof rider.distanceFromCustomerM === 'number' &&
    rider.distanceFromCustomerM <= 180
  ) {
    return 'cerca';
  }

  return order.status;
}

export function statusLabel(status: SimOrderStatus) {
  switch (status) {
    case 'confirmado':
      return 'Confirmado';
    case 'empacando':
      return 'Empacando';
    case 'listo':
      return 'Listo para ruta';
    case 'en_camino':
      return 'En camino';
    case 'cerca':
      return 'Ya casi llega';
    case 'entregado':
      return 'Entregado';
  }
}
