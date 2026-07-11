type JsonObject = Record<string, unknown>;

type InsertResult = {
  data: unknown;
  error: unknown;
  count?: number | null;
  status?: number;
  statusText?: string;
};

type FallbackInsert = (
  values: unknown,
  options?: unknown
) => PromiseLike<InsertResult>;

type SecureOrderItem = {
  product_id: string;
  quantity: number;
  custom_price?: number;
};

type StoredIdempotencyEntry = {
  key: string;
  createdAt: number;
};

const IDEMPOTENCY_STORAGE_PREFIX = 'pollazo_secure_order:';
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;
const LAST_ORDER_CODE_KEY = 'pollazo_last_order_code';

const isRecord = (value: unknown): value is JsonObject => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const asString = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const asFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanPhoneTail = (value: unknown) => {
  return asString(value).replace(/\D/g, '').slice(-9);
};

const getSingleOrder = (values: unknown): JsonObject | null => {
  if (Array.isArray(values)) {
    return values.length === 1 && isRecord(values[0]) ? values[0] : null;
  }

  return isRecord(values) ? values : null;
};

const getProductId = (item: JsonObject) => {
  const nestedProduct = isRecord(item.product) ? item.product : null;

  return (
    asString(item.product_id) ||
    asString(item.id) ||
    asString(item.cart_item_id) ||
    asString(nestedProduct?.id)
  );
};

const normalizeItems = (value: unknown): SecureOrderItem[] => {
  if (!Array.isArray(value)) return [];

  const items = value.map(itemValue => {
    if (!isRecord(itemValue)) return null;

    const nestedProduct = isRecord(itemValue.product)
      ? itemValue.product
      : null;
    const productId = getProductId(itemValue);
    const quantity = asFiniteNumber(itemValue.quantity);
    const customPrice =
      asFiniteNumber(itemValue.custom_price) ??
      asFiniteNumber(nestedProduct?.custom_price);

    if (!productId || quantity === null || quantity <= 0) {
      return null;
    }

    const item: SecureOrderItem = {
      product_id: productId,
      quantity: Number(quantity.toFixed(3)),
    };

    if (customPrice !== null && customPrice > 0) {
      item.custom_price = Number(customPrice.toFixed(2));
    }

    return item;
  });

  return items
    .filter((item): item is SecureOrderItem => item !== null)
    .sort((left, right) => {
      const byId = left.product_id.localeCompare(right.product_id);
      if (byId !== 0) return byId;

      const byPrice = (left.custom_price || 0) - (right.custom_price || 0);
      if (byPrice !== 0) return byPrice;

      return left.quantity - right.quantity;
    });
};

const fnv1a = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
};

const randomIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `pollazo:${crypto.randomUUID()}`;
  }

  return `pollazo:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 14)}`;
};

const getStableIdempotencyKey = (
  order: JsonObject,
  items: SecureOrderItem[]
) => {
  const explicitKey = asString(order.idempotency_key);

  if (explicitKey.length >= 16) {
    return explicitKey;
  }

  const fingerprint = JSON.stringify({
    phone: cleanPhoneTail(order.customer_phone),
    items,
    paymentMethod: asString(order.payment_method).toLowerCase(),
    deliveryType: asString(order.delivery_type).toLowerCase() || 'domicilio',
    lat: asFiniteNumber(order.lat),
    lng: asFiniteNumber(order.lng),
    reference: asString(order.reference),
  });
  const storageKey = `${IDEMPOTENCY_STORAGE_PREFIX}${fnv1a(fingerprint)}`;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StoredIdempotencyEntry>;

      if (
        typeof parsed.key === 'string' &&
        parsed.key.length >= 16 &&
        typeof parsed.createdAt === 'number' &&
        now - parsed.createdAt < IDEMPOTENCY_TTL_MS
      ) {
        return parsed.key;
      }
    }

    const key = randomIdempotencyKey();
    const entry: StoredIdempotencyEntry = {
      key,
      createdAt: now,
    };

    localStorage.setItem(storageKey, JSON.stringify(entry));
    return key;
  } catch {
    return randomIdempotencyKey();
  }
};

const makeClientError = (
  message: string,
  code = 'POLLAZO_SECURE_ORDER_INVALID'
) => ({
  name: 'PostgrestError',
  code,
  message,
  details: '',
  hint: '',
});

const allowDevelopmentFallback = () => {
  return (
    import.meta.env.DEV &&
    String(import.meta.env.VITE_ALLOW_LEGACY_ORDER_INSERT || '').toLowerCase() ===
      'true'
  );
};

const rememberOrderCode = (payload: unknown) => {
  if (!isRecord(payload)) return;

  const orderCode = asString(payload.order_code) || asString(payload.orderCode);

  if (!orderCode) return;

  try {
    localStorage.setItem(LAST_ORDER_CODE_KEY, orderCode);
  } catch {
    // localStorage es opcional; la cookie HttpOnly conserva la sesión real.
  }
};

export async function insertOrderSecurely({
  values,
  options,
  fallbackInsert,
}: {
  values: unknown;
  options?: unknown;
  fallbackInsert: FallbackInsert;
}): Promise<InsertResult> {
  const order = getSingleOrder(values);

  if (!order) {
    return {
      data: null,
      error: makeClientError(
        'La creación segura admite un solo pedido por solicitud.'
      ),
      count: null,
      status: 400,
      statusText: 'Bad Request',
    };
  }

  const items = normalizeItems(order.items);

  if (items.length === 0) {
    return {
      data: null,
      error: makeClientError('El pedido no contiene productos válidos.'),
      count: null,
      status: 400,
      statusText: 'Bad Request',
    };
  }

  const customerName =
    asString(order.customer_name) ||
    (typeof window !== 'undefined'
      ? asString(localStorage.getItem('pollazo_customer_name'))
      : '');
  const idempotencyKey = getStableIdempotencyKey(order, items);

  try {
    const response = await fetch('/api/create-order', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        customerPhone: asString(order.customer_phone),
        customerName: customerName || null,
        items,
        paymentMethod: asString(order.payment_method).toLowerCase(),
        deliveryType:
          asString(order.delivery_type).toLowerCase() || 'domicilio',
        lat: asFiniteNumber(order.lat),
        lng: asFiniteNumber(order.lng),
        reference: asString(order.reference) || null,
        idempotencyKey,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as JsonObject;

    if (response.ok && payload.ok === true) {
      rememberOrderCode(payload);

      return {
        data: payload,
        error: null,
        count: null,
        status: response.status || 201,
        statusText: response.statusText || 'Created',
      };
    }

    if (
      allowDevelopmentFallback() &&
      (response.status === 404 || response.status === 503)
    ) {
      console.warn(
        '⚠️ El endpoint seguro no está disponible. Se usa el insert antiguo únicamente porque VITE_ALLOW_LEGACY_ORDER_INSERT=true en desarrollo.'
      );

      return fallbackInsert(values, options);
    }

    return {
      data: null,
      error: makeClientError(
        asString(payload.error) || 'No se pudo crear el pedido.',
        `POLLAZO_CREATE_ORDER_${response.status}`
      ),
      count: null,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    if (allowDevelopmentFallback()) {
      console.warn(
        '⚠️ No se pudo conectar con el endpoint seguro. Se usa el insert antiguo solo en desarrollo autorizado.',
        error
      );

      return fallbackInsert(values, options);
    }

    return {
      data: null,
      error: makeClientError(
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con el servidor seguro.',
        'POLLAZO_CREATE_ORDER_NETWORK'
      ),
      count: null,
      status: 0,
      statusText: 'Network Error',
    };
  }
}
