export type RiderAvailability = 'available' | 'busy' | 'offline' | 'disabled';

export type RiderDevice = {
  id: string;
  name: string;
  token: string;
  enabled: boolean;
  maxOrders: number;
  activeOrderIds: string[];
  lastSeenAt: number;
  gpsPermission: 'granted' | 'prompt' | 'denied';
  batteryPercent?: number | null;
};

export type DispatchOrder = {
  id: string;
  code: string;
  customer: string;
  ageMinutes: number;
  distanceKm: number;
  needsCascada?: boolean;
  assignedDeviceId?: string | null;
};

export type DispatchResult = {
  devices: RiderDevice[];
  orders: DispatchOrder[];
  events: string[];
};

const OFFLINE_AFTER_MS = 45_000;

export function createDeviceToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(12);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

export function deviceStatus(device: RiderDevice, now = Date.now()): RiderAvailability {
  if (!device.enabled) return 'disabled';
  if (now - device.lastSeenAt > OFFLINE_AFTER_MS) return 'offline';
  if (device.activeOrderIds.length >= Math.max(1, device.maxOrders)) return 'busy';
  return 'available';
}

export function deviceInviteUrl(origin: string, token: string) {
  const safeOrigin = origin.replace(/\/$/, '');
  return `${safeOrigin}/repartidor?device=${encodeURIComponent(token)}`;
}

const orderPriority = (order: DispatchOrder) => {
  const cascadaCost = order.needsCascada ? 0.65 : 0;
  return order.ageMinutes * 5 - order.distanceKm - cascadaCost;
};

export function autoAssignOrders(
  sourceOrders: DispatchOrder[],
  sourceDevices: RiderDevice[],
  now = Date.now()
): DispatchResult {
  const orders = sourceOrders.map(order => ({ ...order }));
  const devices = sourceDevices.map(device => ({
    ...device,
    activeOrderIds: [...device.activeOrderIds],
  }));
  const events: string[] = [];

  const pending = orders
    .filter(order => !order.assignedDeviceId)
    .sort((a, b) => orderPriority(b) - orderPriority(a));

  for (const order of pending) {
    const candidates = devices
      .filter(device => {
        const status = deviceStatus(device, now);
        return (
          (status === 'available' || status === 'busy') &&
          device.gpsPermission !== 'denied' &&
          device.activeOrderIds.length < Math.max(1, device.maxOrders)
        );
      })
      .sort((a, b) => {
        if (a.activeOrderIds.length !== b.activeOrderIds.length) {
          return a.activeOrderIds.length - b.activeOrderIds.length;
        }
        return b.lastSeenAt - a.lastSeenAt;
      });

    const device = candidates[0];
    if (!device) {
      events.push(`${order.code}: quedó en espera porque no hay repartidor con capacidad.`);
      continue;
    }

    order.assignedDeviceId = device.id;
    device.activeOrderIds.push(order.id);
    events.push(`${order.code}: asignado a ${device.name}.`);
  }

  return { devices, orders, events };
}

export function claimOrder(
  orderId: string,
  deviceId: string,
  sourceOrders: DispatchOrder[],
  sourceDevices: RiderDevice[],
  now = Date.now()
): DispatchResult {
  const orders = sourceOrders.map(order => ({ ...order }));
  const devices = sourceDevices.map(device => ({
    ...device,
    activeOrderIds: [...device.activeOrderIds],
  }));
  const events: string[] = [];

  const order = orders.find(item => item.id === orderId);
  const device = devices.find(item => item.id === deviceId);

  if (!order || !device) {
    return { devices, orders, events: ['No se encontró el pedido o el dispositivo.'] };
  }

  if (order.assignedDeviceId) {
    const owner = devices.find(item => item.id === order.assignedDeviceId);
    return {
      devices,
      orders,
      events: [`${order.code}: ya fue tomado por ${owner?.name || 'otro repartidor'}.`],
    };
  }

  const status = deviceStatus(device, now);
  if (status === 'offline' || status === 'disabled') {
    return { devices, orders, events: [`${device.name}: no está disponible.`] };
  }

  if (device.activeOrderIds.length >= Math.max(1, device.maxOrders)) {
    return { devices, orders, events: [`${device.name}: alcanzó su capacidad máxima.`] };
  }

  order.assignedDeviceId = device.id;
  device.activeOrderIds.push(order.id);
  events.push(`${order.code}: tomado correctamente por ${device.name}.`);

  return { devices, orders, events };
}

export function releaseCompletedOrder(
  orderId: string,
  sourceOrders: DispatchOrder[],
  sourceDevices: RiderDevice[]
): DispatchResult {
  const orders = sourceOrders.filter(order => order.id !== orderId);
  const devices = sourceDevices.map(device => ({
    ...device,
    activeOrderIds: device.activeOrderIds.filter(id => id !== orderId),
  }));

  return {
    orders,
    devices,
    events: ['Entrega cerrada manualmente y capacidad liberada.'],
  };
}
