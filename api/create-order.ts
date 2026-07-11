import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

type PaymentMethod = 'efectivo' | 'deuna';
type DeliveryType = 'domicilio' | 'retiro';

type CreateOrderItemInput = {
  productId?: string;
  quantity?: number;
  customPrice?: number | null;
};

type CreateOrderInput = {
  idempotencyKey?: string;
  customerPhone?: string;
  customerName?: string | null;
  items?: CreateOrderItemInput[];
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
  price?: string | null;
  unit?: string | null;
  description?: string | null;
  image?: string | null;
  badge?: string | null;
  available?: boolean | null;
  is_variable?: boolean | null;
  track_stock?: boolean | null;
  current_stock?: number | string | null;
};

type ProductOverrideRow = {
  id: string;
  price?: string | null;
  available?: boolean | null;
};

type MembershipRow = {
  id: string;
  customer_phone: string;
  plan_name?: string | null;
  status: string;
  expires_at?: string | null;
};

const MIN_DELIVERY_ORDER = 5;
const FIRST_DELIVERY_FREE_MIN = 10;
const PLUS_FREE_DELIVERY_MIN = 8;
const MAX_ITEMS = 80;
const MAX_QUANTITY = 100;
const MAX_VARIABLE_PRICE = 500;
const encoder = new TextEncoder();

const getBody = (req: ApiRequest): CreateOrderInput => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as CreateOrderInput;
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object' ? (req.body as CreateOrderInput) : {};
};

const cleanPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('593') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `593${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('9')) return `593${digits}`;

  return '';
};

const cleanPhoneTail = (value?: string | null) => {
  return String(value || '').replace(/\D/g, '').slice(-9);
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
};

const toMoney = (value: unknown) => {
  const parsed = Number.parseFloat(
    String(value ?? '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const toQuantity = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return Number(parsed.toFixed(3));
};

const isPaymentMethod = (value: string): value is PaymentMethod => {
  return value === 'efectivo' || value === 'deuna';
};

const isDeliveryType = (value: string): value is DeliveryType => {
  return value === 'domicilio' || value === 'retiro';
};

const getOrderSecret = () => {
  const secret = String(
    process.env.POLLAZO_ORDER_SECRET ||
      process.env.POLLAZO_PANEL_SESSION_SECRET ||
      process.env.CRON_SECRET ||
      ''
  ).trim();

  return secret.length >= 32 ? secret : null;
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
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
};

const getGuayaquilParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    year: map.year || '0000',
    month: map.month || '00',
    day: map.day || '00',
    hour: Number(map.hour || 0),
    minute: Number(map.minute || 0),
  };
};

const isStoreOpen = () => {
  const { hour, minute } = getGuayaquilParts();
  const current = hour * 60 + minute;
  return current >= 7 * 60 && current <= 20 * 60 + 45;
};

const findProduct = (candidateId: string, products: ProductRow[]) => {
  return [...products]
    .filter(product => candidateId === product.id || candidateId.startsWith(`${product.id}-`))
    .sort((a, b) => b.id.length - a.id.length)[0] || null;
};

const activeMembershipForPhone = (
  memberships: MembershipRow[],
  phone: string
) => {
  const tail = cleanPhoneTail(phone);
  const now = Date.now();

  return memberships.find(membership => {
    if (cleanPhoneTail(membership.customer_phone) !== tail) return false;
    if (membership.status !== 'active') return false;
    if (!membership.expires_at) return true;

    const expires = new Date(membership.expires_at).getTime();
    return Number.isFinite(expires) && expires > now;
  }) || null;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const orderSecret = getOrderSecret();

  if (!supabaseUrl || !serviceRoleKey || !orderSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Missing secure order server configuration',
    });
  }

  const input = getBody(req);
  const idempotencyKey = cleanText(input.idempotencyKey, 120);
  const customerPhone = cleanPhone(input.customerPhone);
  const customerName = cleanText(input.customerName, 100) || null;
  const reference = cleanText(input.reference, 240);
  const paymentMethod = cleanText(input.paymentMethod, 30);
  const deliveryType = cleanText(input.deliveryType, 30) || 'domicilio';
  const lat = typeof input.lat === 'number' && Number.isFinite(input.lat) ? input.lat : null;
  const lng = typeof input.lng === 'number' && Number.isFinite(input.lng) ? input.lng : null;
  const rawItems = Array.isArray(input.items) ? input.items.slice(0, MAX_ITEMS) : [];

  if (idempotencyKey.length < 16) {
    return res.status(400).json({ ok: false, error: 'Invalid idempotency key' });
  }
  if (!customerPhone) {
    return res.status(400).json({ ok: false, error: 'Invalid customer phone' });
  }
  if (!isPaymentMethod(paymentMethod)) {
    return res.status(400).json({
      ok: false,
      error: 'Only cash or DeUna on delivery are available',
    });
  }
  if (!isDeliveryType(deliveryType)) {
    return res.status(400).json({ ok: false, error: 'Invalid delivery type' });
  }
  if (rawItems.length === 0) {
    return res.status(400).json({ ok: false, error: 'The cart is empty' });
  }
  if (deliveryType === 'domicilio') {
    if (lat === null || lng === null || !reference) {
      return res.status(400).json({ ok: false, error: 'Missing delivery location' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ ok: false, error: 'Invalid delivery coordinates' });
    }
  }
  if (!isStoreOpen()) {
    return res.status(409).json({
      ok: false,
      error: 'Automatic orders are closed. Hours: 07:00 to 20:45.',
      storeClosed: true,
    });
  }

  const identityDigest = await hmac(orderSecret, `${customerPhone}:${idempotencyKey}`);
  const date = getGuayaquilParts();
  const orderCode = `PZ-${date.day}${date.month}-${identityDigest.slice(0, 10).toUpperCase()}`;
  const trackingToken = await hmac(
    orderSecret,
    `tracking:${customerPhone}:${idempotencyKey}`
  );
  const trackingTokenHash = await sha256(trackingToken);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existingResult = await supabase
    .from('orders')
    .select('*')
    .eq('order_code', orderCode)
    .maybeSingle();

  if (existingResult.data) {
    return res.status(200).json({
      ok: true,
      deduplicated: true,
      order: existingResult.data,
      trackingToken,
    });
  }

  const [productsResult, overridesResult, membershipsResult] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,category,subcategory,price,unit,description,image,badge,available,is_variable,track_stock,current_stock'),
    supabase.from('product_overrides').select('id,price,available'),
    supabase
      .from('customer_memberships')
      .select('id,customer_phone,plan_name,status,expires_at')
      .eq('status', 'active')
      .limit(100),
  ]);

  if (productsResult.error) {
    return res.status(500).json({ ok: false, error: 'Could not load catalog' });
  }

  const products = (productsResult.data || []) as ProductRow[];
  const overrides = new Map<string, ProductOverrideRow>(
    ((overridesResult.data || []) as ProductOverrideRow[]).map(row => [row.id, row])
  );
  const memberships = (membershipsResult.data || []) as MembershipRow[];
  const orderItems: Array<Record<string, unknown>> = [];
  let subtotal = 0;

  for (const rawItem of rawItems) {
    const candidateId = cleanText(rawItem.productId, 160);
    const quantity = toQuantity(rawItem.quantity);

    if (!candidateId || quantity <= 0 || quantity > MAX_QUANTITY) {
      return res.status(400).json({ ok: false, error: 'Invalid cart item' });
    }

    const product = findProduct(candidateId, products);

    if (!product) {
      return res.status(409).json({
        ok: false,
        error: `Product no longer exists: ${candidateId}`,
      });
    }

    const override = overrides.get(product.id);
    const available = product.available !== false && override?.available !== false;

    if (!available) {
      return res.status(409).json({
        ok: false,
        error: `Product unavailable: ${product.name}`,
      });
    }

    if (product.track_stock === true && toQuantity(product.current_stock) < quantity) {
      return res.status(409).json({
        ok: false,
        error: `Insufficient stock for ${product.name}`,
      });
    }

    let unitPrice = 0;
    let customPrice: number | null = null;

    if (product.is_variable === true) {
      customPrice = toMoney(rawItem.customPrice);

      if (customPrice <= 0 || customPrice > MAX_VARIABLE_PRICE) {
        return res.status(400).json({
          ok: false,
          error: `Invalid custom amount for ${product.name}`,
        });
      }

      unitPrice = customPrice;
    } else {
      unitPrice = toMoney(override?.price ?? product.price);

      if (unitPrice <= 0) {
        return res.status(409).json({
          ok: false,
          error: `Product has no valid price: ${product.name}`,
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

  const activeMembership = activeMembershipForPhone(memberships, customerPhone);

  if (deliveryType === 'domicilio') {
    const minimum = activeMembership ? PLUS_FREE_DELIVERY_MIN : MIN_DELIVERY_ORDER;

    if (subtotal < minimum) {
      return res.status(409).json({
        ok: false,
        error: `Minimum delivery order is $${minimum.toFixed(2)}`,
        minimumOrder: minimum,
      });
    }
  }

  const previousOrdersResult = await supabase
    .from('orders')
    .select('id,status')
    .eq('customer_phone', customerPhone)
    .neq('status', 'Cancelado')
    .limit(1);

  const firstValidOrder = (previousOrdersResult.data || []).length === 0;
  let deliveryFee = 0;

  if (deliveryType === 'domicilio' && !activeMembership) {
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
    .single();

  if (!customerResult.error) {
    customerId = customerResult.data?.id || null;
  }

  const payload = {
    order_code: orderCode,
    idempotency_key: idempotencyKey,
    tracking_token_hash: trackingTokenHash,
    customer_id: customerId,
    customer_phone: customerPhone,
    items: orderItems,
    subtotal,
    delivery_fee: deliveryFee,
    delivery_fee_original: deliveryFee,
    delivery_fee_final: deliveryFee,
    service_fee: 0,
    card_fee: 0,
    total,
    status: 'Por Confirmar',
    payment_status: 'contra_entrega',
    provider: false,
    preorder: false,
    payment_method: paymentMethod,
    delivery_type: deliveryType,
    lat,
    lng,
    reference: reference || null,
    membership_applied: Boolean(activeMembership),
    membership_id: activeMembership?.id || null,
    membership_plan: activeMembership?.plan_name || null,
    counted_in_metrics: false,
    is_test_order: false,
    created_at: now,
    updated_at: now,
  };

  const insertResult = await supabase
    .from('orders')
    .insert(payload)
    .select('*')
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      const duplicateResult = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', orderCode)
        .maybeSingle();

      if (duplicateResult.data) {
        return res.status(200).json({
          ok: true,
          deduplicated: true,
          order: duplicateResult.data,
          trackingToken,
        });
      }
    }

    console.error('Secure order insert failed:', insertResult.error);

    return res.status(500).json({
      ok: false,
      error: 'Could not create order securely',
      code: insertResult.error.code || null,
    });
  }

  return res.status(201).json({
    ok: true,
    deduplicated: false,
    order: insertResult.data,
    trackingToken,
  });
}
