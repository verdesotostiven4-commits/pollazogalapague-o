export type QueuedTrackingUpdate = {
  deviceToken: string;
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  speedMps?: number | null;
  headingDeg?: number | null;
  capturedAt: string | number;
  batteryPercent?: number | null;
};

const QUEUE_KEY = 'pollazo_delivery_tracking_queue_v1';
const MAX_QUEUE_ITEMS = 240;

const isValidItem = (value: unknown): value is QueuedTrackingUpdate => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<QueuedTrackingUpdate>;
  return Boolean(
    item.deviceToken &&
      item.sessionId &&
      Number.isFinite(Number(item.latitude)) &&
      Number.isFinite(Number(item.longitude)) &&
      Number.isFinite(Number(item.accuracyM)) &&
      item.capturedAt
  );
};

export const readTrackingQueue = (): QueuedTrackingUpdate[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidItem).slice(-MAX_QUEUE_ITEMS) : [];
  } catch {
    return [];
  }
};

export const writeTrackingQueue = (items: QueuedTrackingUpdate[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE_ITEMS)));
  } catch {
    // Si el almacenamiento está lleno, el GPS en línea continúa funcionando.
  }
};

export const enqueueTrackingUpdates = (items: QueuedTrackingUpdate[]) => {
  if (items.length === 0) return readTrackingQueue();
  const queue = [...readTrackingQueue(), ...items].slice(-MAX_QUEUE_ITEMS);
  writeTrackingQueue(queue);
  return queue;
};

export const flushTrackingQueue = async (
  sender: (item: QueuedTrackingUpdate) => Promise<unknown>
) => {
  const queue = readTrackingQueue();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  let sent = 0;
  let index = 0;

  for (; index < queue.length; index += 1) {
    try {
      await sender(queue[index]);
      sent += 1;
    } catch {
      break;
    }
  }

  const remainingItems = queue.slice(index);
  writeTrackingQueue(remainingItems);
  return { sent, remaining: remainingItems.length };
};
