import { createClient } from '@supabase/supabase-js';
import {
  createCustomerSessionToken,
  hasCustomerSessionSecret,
  normalizeCustomerPhone,
  serializeCustomerSessionCookie,
} from './_customer-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

type CreateOrderPayload = {
  customerPhone?: unknown;
  customerName?: unknown;
  items?: unknown;
  paymentMethod?: unknown;
  deliveryType?: unknown;
  lat?: unknown;
  lng?: unknown;
  reference?: unknown;
  idempotencyKey?: unknown;
};

const MAX_ATTEMPTS = 12;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

const parseBody = (body: unknown): CreateOrderPayload => {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as CreateOrderPayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof body === 'object'
    ? (body as CreateOrderPayload)
    : {};
};

const getHeader = (req: ApiRequest, name: string) => {
  const entry = Object.entries(req.headers || {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );

  if (!entry) return '';

  const value = entry[1];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const finiteNumber = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const getRateLimitKey = (req: ApiRequest, phoneTail: string) => {
  const forwarded =
    getHeader(req, 'x-forwarded-for') ||
    getHeader(req, 'x-real-ip') ||
    'unknown';
  const ip = forwarded.split(',')[0].trim().slice(0, 80);

  return `${ip}:${phoneTail}`;
};

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      ),
    };
  }

  current.count += 1;
  attempts.set(key, current);

  return { allowed: true, retryAfterSeconds: 0 };
};

const mapRpcError = (error: { code?: string; message?: string } | null) => {
  if (!error) return null;

  if (error.code === '22023') {
    return { status: 400, message: error.message || 'Datos del pedido inválidos.' };
  }

  if (error.code === '23505') {
    return { status: 409, message: error.message || 'Pedido duplicado.' };
  }

  if (error.code === '42501') {
    return { status: 403, message: error.message || 'Pedido no autorizado.' };
  }

  if (error.code === 'P0001') {
    return { status: 409, message: error.message || 'El pedido no puede procesarse.' };
  }

  if (error.code === 'PGRST202' || error.code === '42883') {
    return {
      status: 503,
      message: 'La creación segura de pedidos todavía no está activada en Supabase.',
    };
  }

  return { status: 500, message: 'No se pudo crear el pedido.' };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  if (!hasCustomerSessionSecret()) {
    return res.status(503).json({
      ok: false,
      error: 'Customer session is not configured',
      missingEnv: true,
    });
  }

  const payload = parseBody(req.body);
  const customerPhone = normalizeCustomerPhone(payload.customerPhone);
  const phoneTail = customerPhone.slice(-9);
  const customerName = cleanText(payload.customerName, 120);
  const paymentMethod = cleanText(payload.paymentMethod, 30).toLowerCase();
  const deliveryType =
    cleanText(payload.deliveryType, 30).toLowerCase() || 'domicilio';
  const reference = cleanText(payload.reference, 500);
  const idempotencyKey = cleanText(payload.idempotencyKey, 160);
  const lat = finiteNumber(payload.lat);
  const lng = finiteNumber(payload.lng);

  if (phoneTail.length !== 9) {
    return res.status(400).json({ ok: false, error: 'Número de WhatsApp inválido.' });
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return res.status(400).json({ ok: false, error: 'El pedido no contiene productos.' });
  }

  if (payload.items.length > 50) {
    return res.status(400).json({ ok: false, error: 'El pedido contiene demasiados productos.' });
  }

  if (paymentMethod !== 'efectivo' && paymentMethod !== 'deuna') {
    return res.status(400).json({
      ok: false,
      error: 'Método de pago no disponible. Usa efectivo o DeUna al recibir.',
    });
  }

  if (deliveryType !== 'domicilio' && deliveryType !== 'retiro') {
    return res.status(400).json({ ok: false, error: 'Tipo de entrega inválido.' });
  }

  if (idempotencyKey.length < 16) {
    return res.status(400).json({ ok: false, error: 'Clave de pedido inválida.' });
  }

  const rateLimit = checkRateLimit(getRateLimitKey(req, phoneTail));

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));

    return res.status(429).json({
      ok: false,
      error: 'Demasiados intentos. Espera un momento antes de volver a enviar.',
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const supabaseUrl =
    String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  ).trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({
      ok: false,
      error: 'Server database access is not configured',
      missingEnv: true,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.rpc('create_online_order_v2', {
    p_customer_phone: customerPhone,
    p_customer_name: customerName || null,
    p_items: payload.items,
    p_payment_method: paymentMethod,
    p_delivery_type: deliveryType,
    p_lat: lat,
    p_lng: lng,
    p_reference: reference || null,
    p_idempotency_key: idempotencyKey,
  });

  const mappedError = mapRpcError(error);

  if (mappedError) {
    console.error('create-order failed:', {
      code: error?.code,
      message: error?.message,
      phoneTail,
      idempotencyKey,
    });

    return res.status(mappedError.status).json({
      ok: false,
      error: mappedError.message,
    });
  }

  const session = createCustomerSessionToken(customerPhone);
  res.setHeader('Set-Cookie', serializeCustomerSessionCookie(session.token));

  return res.status(201).json({
    ...(data && typeof data === 'object' ? data : {}),
    ok: true,
    customerSessionExpiresAt: session.expiresAt,
  });
}
