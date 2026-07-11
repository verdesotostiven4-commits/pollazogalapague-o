import { createClient } from '@supabase/supabase-js';
import { products as seedProducts } from '../../src/data/products.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type PaymentMethod = 'efectivo' | 'deuna';
type DeliveryType = 'domicilio' | 'retiro';

type InputItem = {
  productId?: string;
  quantity?: number;
  customPrice?: number | null;
};

type InputBody = {
  idempotencyKey?: string;
  customerPhone?: string;
  customerName?: string | null;
  items?: InputItem[];
  paymentMethod?: string;
  deliveryType?: string;
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  price?: string | number | null;
  unit?: string | null;
  description?: string | null;
  image?: string | null;
  badge?: string | null;
  available?: boolean | null;
  is_variable?: boolean | null;
};

type OverrideRow = {
  id: string;
  price?: string | number | null;
  available?: boolean | null;
};

type MembershipRow = {
  id: string;
  customer_phone: string;
  plan_name?: string | null;
  status: string;
  expires_at?: string | null;
};

type DatabaseError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const MIN_DELIVERY_ORDER = 5;
const FIRST_DELIVERY_FREE_MIN = 10;
const PLUS_FREE_DELIVERY_MIN = 8;
const MAX_ITEMS = 80;
const MAX_QUANTITY = 100;
const MAX_VARIABLE_PRICE = 500;
const encoder = new TextEncoder();

const bodyOf = (req: ApiRequest): InputBody => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as InputBody;
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object' ? (req.body as InputBody) : {};
};

const cleanText = (value: unknown, maxLength: number) =>
  String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

const cleanPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('593') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `593${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 9) return `593${digits}`;

  return '';
};

const phoneTail = (value?: string | null) =>
  String(value || '').replace(/\D/g, '').slice(-9);

const money = (value: unknown) => {
  const parsed = Number.parseFloat(
    String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const quantityOf = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return Number(parsed.toFixed(3));
};

const normalizePaymentMethod = (value: unknown): PaymentMethod | '' => {
  const clean = cleanText(value, 30).toLowerCase();

  if (clean === 'efectivo' || clean === 'cash' || clean === 'contra_entrega') {
    return 'efectivo';
  }

  if (clean === 'deuna' || clean === 'de una') {
    return 'deuna';
  }

  return '';
};

const normalizeDeliveryType = (value: unknown): DeliveryType | '' => {
  const clean = cleanText(value, 30).toLowerCase();

  if (clean === 'domicilio' || clean === 'delivery') return 'domicilio';
  if (clean === 'retiro' || clean === 'pickup') return 'retiro';

  return '';
};

const validSecret = (value: unknown) => {
  const secret = String(value || '').trim();
  return secret.length >= 16 ? secret : '';
};

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';

  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const hmac = async (secret: string, value: string) => {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const digest = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(value)
  );

  return bytesToBase64Url(new Uint8Array(digest));
};

const sha256 = async (value: string) => {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(value)
  );

  return bytesToBase64Url(new Uint8Array(digest));
};

const guayaquilParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    month: map.month || '00',
    day: map.day || '00',
    hour: Number(map.hour || 0),
    minute: Number(map.minute || 0),
  };
};

const storeOpen = () => {
  const { hour, minute } = guayaquilParts();
  const current = hour * 60 + minute;

  return current >= 7 * 60 && current <= 20 * 60 + 45;
};

const isSchemaCompatibilityError = (error?: DatabaseError | null) => {
  if (!error) return false;

  const code = String(error.code || '').toUpperCase();
  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('could not find') && message.includes('column')) ||
    message.includes('schema cache')
  );
};

const findProduct = (candidateId: string, products: ProductRow[]) =>
  [...products]
    .filter(
      product =>
        candidateId === product.id || candidateId.startsWith(`${product.id}-`)
    )
    .sort((a, b) => b.id.length - a.id.length)[0] || null;

const activeMembership = (
  memberships: MembershipRow[],
  customerPhone: string
) => {
  const tail = phoneTail(customerPhone);
  const now = Date.now();

  return (
    memberships.find(membership => {
      if (phoneTail(membership.customer_phone) !== tail) return false;
      if (membership.status !== 'active') return false;
      if (!membership.expires_at) return true;

      const expires = new Date(membership.expires_at).getTime();
      return Number.isFinite(expires) && expires > now;
    }) || null
  );
};

const seedCatalog = (): ProductRow[] =>
  seedProducts.map(source => {
    const product = source as unknown as Record<string, unknown>;

    return {
      id: cleanText(product.id, 160),
      name: cleanText(product.name, 180) || 'Producto',
      category: cleanText(product.category, 120) || 'Productos',
      subcategory: cleanText(product.subcategory, 120) || null,
      price:
        typeof product.price === 'number' || typeof product.price === 'string'
          ? product.price
          : null,
      unit: cleanText(product.unit, 80) || null,
      description: cleanText(product.description, 500) || null,
      image: cleanText(product.image, 1000) || null,
      badge: cleanText(product.badge, 120) || null,
      available: product.available !== false,
      is_variable: product.is_variable === true,
    };
  });

const loadRemoteProducts = async (supabase: any) => {
  const full = await supabase
    .from('products')
    .select(
      'id,name,category,subcategory,price,unit,description,image,badge,available,is_variable'
    );

  if (!full.error) {
    return {
      rows: (full.data || []) as ProductRow[],
      error: null as DatabaseError | null,
    };
  }

  if (!isSchemaCompatibilityError(full.error)) {
    return {
      rows: [] as ProductRow[],
      error: full.error as DatabaseError,
    };
  }

  const minimal = await supabase
    .from('products')
    .select('id,name,category,price,available');

  return {
    rows: minimal.error ? [] : ((minimal.data || []) as ProductRow[]),
    error: (minimal.error || null) as DatabaseError | null,
  };
};

const mergeCatalog = (remote: ProductRow[]) => {
  const map = new Map<string, ProductRow>();

  seedCatalog().forEach(product => {
    if (product.id) map.set(product.id, product);
  });

  remote.forEach(product => {
    const id = cleanText(product.id, 160);
    if (!id) return;

    const previous = map.get(id);

    map.set(id, {
      ...previous,
      ...product,
      id,
      name: cleanText(product.name || previous?.name, 180) || id,
      category:
        cleanText(product.category || previous?.category, 120) || 'Productos',
    });
  });

  return Array.from(map.values());
};

const selectExistingOrder = async (
  supabase: any,
  idempotencyKey: string,
  orderCode: string
) => {
  const byIdempotency = await supabase
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (!byIdempotency.error && byIdempotency.data) {
    return byIdempotency.data;
  }

  const byCode = await supabase
    .from('orders')
    .select('*')
    .eq('order_code', orderCode)
    .maybeSingle();

  return byCode.error ? null : byCode.data || null;
};

const insertOrderWithCompatibility = async (
  supabase: any,
  payloads: Array<{ mode: string; payload: Record<string, unknown> }>,
  idempotencyKey: string,
  orderCode: string
) => {
  let lastError: DatabaseError | null = null;

  for (const attempt of payloads) {
    const result = await supabase
      .from('orders')
      .insert(attempt.payload)
      .select('*')
      .single();

    if (!result.error && result.data) {
      return {
        order: result.data,
        mode: attempt.mode,
        error: null as DatabaseError | null,
      };
    }

    const error = (result.error || null) as DatabaseError | null;
    lastError = error;

    if (String(error?.code || '') === '23505') {
      const duplicate = await selectExistingOrder(
        supabase,
        idempotencyKey,
        orderCode
      );

      if (duplicate) {
        return {
          order: duplicate,
          mode: `${attempt.mode}-duplicate`,
          error: null as DatabaseError | null,
        };
      }
    }

    if (!isSchemaCompatibilityError(error)) {
      break;
    }
  }

  return {
    order: null,
    mode: 'failed',
    error: lastError,
  };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serverKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serverKey) {
    return res.status(500).json({
      ok: false,
      error: 'La conexión con la base de datos no está configurada.',
      code: 'ORDER_DATABASE_CONFIG_MISSING',
    });
  }

  const input = bodyOf(req);
  const idempotencyKey = cleanText(input.idempotencyKey, 120);
  const customerPhone = cleanPhone(input.customerPhone);
  const customerName = cleanText(input.customerName, 100) || null;
  const reference = cleanText(input.reference, 240);
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const deliveryType =
    normalizeDeliveryType(input.deliveryType) || 'domicilio';
  const lat =
    typeof input.lat === 'number' && Number.isFinite(input.lat)
      ? input.lat
      : null;
  const lng =
    typeof input.lng === 'number' && Number.isFinite(input.lng)
      ? input.lng
      : null;
  const rawItems = Array.isArray(input.items)
    ? input.items.slice(0, MAX_ITEMS)
    : [];

  if (idempotencyKey.length < 16) {
    return res.status(400).json({
      ok: false,
      error: 'No se pudo generar la clave segura del pedido.',
      code: 'INVALID_IDEMPOTENCY_KEY',
    });
  }

  if (!customerPhone) {
    return res.status(400).json({
      ok: false,
      error: 'El número de WhatsApp no es válido.',
      code: 'INVALID_CUSTOMER_PHONE',
    });
  }

  if (!paymentMethod) {
    return res.status(400).json({
      ok: false,
      error: 'Selecciona efectivo o DeUna al recibir.',
      code: 'INVALID_PAYMENT_METHOD',
    });
  }

  if (rawItems.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'El carrito está vacío.',
      code: 'EMPTY_CART',
    });
  }

  if (deliveryType === 'domicilio') {
    if (lat === null || lng === null || !reference) {
      return res.status(400).json({
        ok: false,
        error: 'Completa la ubicación y referencia de entrega.',
        code: 'MISSING_DELIVERY_LOCATION',
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        ok: false,
        error: 'La ubicación de entrega no es válida.',
        code: 'INVALID_DELIVERY_COORDINATES',
      });
    }
  }

  if (!storeOpen()) {
    return res.status(409).json({
      ok: false,
      error: 'Los pedidos automáticos se reciben de 07:00 a 20:45.',
      code: 'STORE_CLOSED',
      storeClosed: true,
    });
  }

  const secret =
    [
      process.env.POLLAZO_ORDER_SECRET,
      process.env.POLLAZO_PANEL_SESSION_SECRET,
      process.env.CRON_SECRET,
    ]
      .map(validSecret)
      .find(Boolean) || `pollazo-orders:${serverKey}`;

  const digest = await hmac(secret, `${customerPhone}:${idempotencyKey}`);
  const date = guayaquilParts();
  const generatedCode = `PZ-${date.day}${date.month}-${digest
    .slice(0, 10)
    .toUpperCase()}`;
  const orderCode = /^PZ-[A-Z0-9-]+$/i.test(idempotencyKey)
    ? idempotencyKey.toUpperCase()
    : generatedCode;
  const trackingToken = await hmac(
    secret,
    `tracking:${customerPhone}:${idempotencyKey}`
  );
  const trackingTokenHash = await sha256(trackingToken);

  const supabase = createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await selectExistingOrder(
    supabase,
    idempotencyKey,
    orderCode
  );

  if (existing) {
    return res.status(200).json({
      ok: true,
      deduplicated: true,
      order: existing,
      trackingToken,
    });
  }

  const [productsResult, overridesResult, membershipsResult] =
    await Promise.all([
      loadRemoteProducts(supabase),
      supabase.from('product_overrides').select('id,price,available'),
      supabase
        .from('customer_memberships')
        .select('id,customer_phone,plan_name,status,expires_at')
        .eq('status', 'active')
        .limit(100),
    ]);

  if (productsResult.error && seedProducts.length === 0) {
    console.error('Order catalog query failed:', productsResult.error);

    return res.status(500).json({
      ok: false,
      error: 'No se pudo consultar el catálogo para crear el pedido.',
      code: productsResult.error.code || 'CATALOG_QUERY_FAILED',
    });
  }

  const products = mergeCatalog(productsResult.rows);
  const overrides = new Map<string, OverrideRow>(
    ((overridesResult.data || []) as OverrideRow[]).map(row => [
      String(row.id),
      row,
    ])
  );
  const memberships = membershipsResult.error
    ? []
    : ((membershipsResult.data || []) as MembershipRow[]);

  const orderItems: Array<Record<string, unknown>> = [];
  let subtotal = 0;

  for (const rawItem of rawItems) {
    const candidateId = cleanText(rawItem.productId, 160);
    const quantity = quantityOf(rawItem.quantity);

    if (!candidateId || quantity <= 0 || quantity > MAX_QUANTITY) {
      return res.status(400).json({
        ok: false,
        error: 'Uno de los productos del carrito no es válido.',
        code: 'INVALID_CART_ITEM',
      });
    }

    const product = findProduct(candidateId, products);

    if (!product) {
      return res.status(409).json({
        ok: false,
        error: 'Uno de los productos ya no está disponible en el catálogo.',
        code: 'PRODUCT_NOT_FOUND',
      });
    }

    const override = overrides.get(product.id);
    const available =
      product.available !== false && override?.available !== false;

    if (!available) {
      return res.status(409).json({
        ok: false,
        error: `${product.name} no está disponible en este momento.`,
        code: 'PRODUCT_UNAVAILABLE',
      });
    }

    let unitPrice = 0;
    let customPrice: number | null = null;

    if (product.is_variable === true) {
      customPrice = money(rawItem.customPrice);

      if (customPrice <= 0 || customPrice > MAX_VARIABLE_PRICE) {
        return res.status(400).json({
          ok: false,
          error: `Revisa el valor ingresado para ${product.name}.`,
          code: 'INVALID_CUSTOM_PRICE',
        });
      }

      unitPrice = customPrice;
    } else {
      unitPrice = money(override?.price ?? product.price);

      if (unitPrice <= 0) {
        return res.status(409).json({
          ok: false,
          error: `${product.name} todavía no tiene un precio válido.`,
          code: 'INVALID_PRODUCT_PRICE',
        });
      }
    }

    const lineSubtotal = Number((unitPrice * quantity).toFixed(2));
    subtotal = Number((subtotal + lineSubtotal).toFixed(2));

    orderItems.push({
      id: product.id,
      product_id: product.id,
      cart_item_id: candidateId,
      name: product.name,
      quantity,
      price: unitPrice,
      price_text: `$${unitPrice.toFixed(2)}`,
      custom_price: customPrice,
      subtotal: lineSubtotal,
      category: product.category,
      image: product.image || null,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        subcategory: product.subcategory || null,
        price: `$${unitPrice.toFixed(2)}`,
        unit: product.unit || null,
        description: product.description || null,
        image: product.image || null,
        badge: product.badge || null,
        custom_price: customPrice,
        available: true,
      },
    });
  }

  const membership = activeMembership(memberships, customerPhone);

  if (deliveryType === 'domicilio') {
    const minimum = membership
      ? PLUS_FREE_DELIVERY_MIN
      : MIN_DELIVERY_ORDER;

    if (subtotal < minimum) {
      return res.status(409).json({
        ok: false,
        error: `El pedido mínimo para domicilio es $${minimum.toFixed(2)}.`,
        code: 'MINIMUM_ORDER_NOT_REACHED',
        minimumOrder: minimum,
      });
    }
  }

  const previousOrders = await supabase
    .from('orders')
    .select('id')
    .eq('customer_phone', customerPhone)
    .neq('status', 'Cancelado')
    .limit(1);

  const firstValidOrder =
    !previousOrders.error && (previousOrders.data || []).length === 0;
  let deliveryFee = 0;

  if (deliveryType === 'domicilio' && !membership) {
    if (firstValidOrder && subtotal >= FIRST_DELIVERY_FREE_MIN) {
      deliveryFee = 0;
    } else if (subtotal < 8) {
      deliveryFee = 2;
    } else {
      deliveryFee = 1.5;
    }
  }

  const total = Number((subtotal + deliveryFee).toFixed(2));
  const now = new Date().toISOString();

  let customerId: string | null = null;
  const customerResult = await supabase
    .from('customers')
    .upsert(
      {
        phone: customerPhone,
        name: customerName,
        lat,
        lng,
        reference: reference || null,
        updated_at: now,
      },
      { onConflict: 'phone' }
    )
    .select('id')
    .maybeSingle();

  if (!customerResult.error) {
    customerId = customerResult.data?.id || null;
  } else {
    console.warn(
      'Customer upsert skipped while creating order:',
      customerResult.error.code || customerResult.error.message
    );
  }

  const commonPayload = {
    order_code: orderCode,
    customer_phone: customerPhone,
    items: orderItems,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    status: 'Por Confirmar',
    payment_status:
      paymentMethod === 'efectivo' ? 'contra_entrega' : 'validando',
    provider: false,
    preorder: false,
    payment_method: paymentMethod,
    delivery_type: deliveryType,
    lat,
    lng,
    reference: reference || null,
    created_at: now,
    updated_at: now,
  };

  const securePayload = {
    ...commonPayload,
    idempotency_key: idempotencyKey,
    tracking_token_hash: trackingTokenHash,
    customer_id: customerId,
    delivery_fee_original: deliveryFee,
    delivery_fee_final: deliveryFee,
    service_fee: 0,
    card_fee: 0,
    membership_applied: Boolean(membership),
    membership_id: membership?.id || null,
    membership_plan: membership?.plan_name || null,
    counted_in_metrics: false,
    is_test_order: false,
  };

  const compatiblePayload = {
    ...commonPayload,
    delivery_fee_original: deliveryFee,
    delivery_fee_final: deliveryFee,
    service_fee: 0,
    card_fee: 0,
    membership_applied: Boolean(membership),
    membership_id: membership?.id || null,
    membership_plan: membership?.plan_name || null,
    counted_in_metrics: false,
    is_test_order: false,
  };

  const legacyPayload = {
    order_code: orderCode,
    customer_phone: customerPhone,
    items: orderItems,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    status: 'Por Confirmar',
    payment_status:
      paymentMethod === 'efectivo' ? 'contra_entrega' : 'validando',
    provider: false,
    preorder: false,
    payment_method: paymentMethod,
    delivery_type: deliveryType,
    lat,
    lng,
    reference: reference || null,
    created_at: now,
    updated_at: now,
  };

  const inserted = await insertOrderWithCompatibility(
    supabase,
    [
      { mode: 'secure', payload: securePayload },
      { mode: 'compatible', payload: compatiblePayload },
      { mode: 'legacy', payload: legacyPayload },
    ],
    idempotencyKey,
    orderCode
  );

  if (!inserted.order) {
    console.error('Order insert failed:', inserted.error);

    return res.status(500).json({
      ok: false,
      error: 'No se pudo guardar el pedido en la base de datos.',
      code: inserted.error?.code || 'ORDER_INSERT_FAILED',
      stage: inserted.mode,
    });
  }

  return res.status(201).json({
    ok: true,
    deduplicated: inserted.mode.includes('duplicate'),
    compatibilityMode: inserted.mode !== 'secure',
    order: inserted.order,
    trackingToken,
  });
}
