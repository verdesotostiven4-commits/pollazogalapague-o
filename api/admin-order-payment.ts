import { createClient } from '@supabase/supabase-js';
import { readPanelSession } from './_panel-session.js';

type PaymentStatus =
  | 'pendiente'
  | 'validando'
  | 'confirmado'
  | 'rechazado'
  | 'contra_entrega';

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

type PaymentPayload = {
  orderId?: unknown;
  paymentStatus?: unknown;
};

const PAYMENT_STATUSES = new Set<PaymentStatus>([
  'pendiente',
  'validando',
  'confirmado',
  'rechazado',
  'contra_entrega',
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseBody = (body: unknown): PaymentPayload => {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as PaymentPayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof body === 'object' ? (body as PaymentPayload) : {};
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const isPaymentStatus = (value: string): value is PaymentStatus => {
  return PAYMENT_STATUSES.has(value as PaymentStatus);
};

const mapSupabaseError = (error: { code?: string; message?: string } | null) => {
  if (!error) return null;

  if (error.code === 'P0002') {
    return { status: 404, message: 'Pedido no encontrado.' };
  }

  if (error.code === '42501') {
    return { status: 403, message: 'Operación no autorizada.' };
  }

  if (error.code === '22023') {
    return { status: 400, message: 'Estado de pago inválido.' };
  }

  return { status: 500, message: 'No se pudo actualizar el pago.' };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const session = readPanelSession(req, 'admin');

  if (!session) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized',
    });
  }

  const payload = parseBody(req.body);
  const orderId = cleanText(payload.orderId, 64);
  const paymentStatus = cleanText(payload.paymentStatus, 40).toLowerCase();

  if (!UUID_PATTERN.test(orderId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid orderId',
    });
  }

  if (!isPaymentStatus(paymentStatus)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payment status',
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

  const { data, error } = await supabase.rpc(
    'set_order_payment_status_v1',
    {
      p_order_id: orderId,
      p_payment_status: paymentStatus,
    }
  );

  const mappedError = mapSupabaseError(error);

  if (mappedError) {
    console.error('admin-order-payment failed:', {
      code: error?.code,
      message: error?.message,
      orderId,
      paymentStatus,
    });

    return res.status(mappedError.status).json({
      ok: false,
      error: mappedError.message,
    });
  }

  return res.status(200).json({
    ok: true,
    order: data,
  });
}
