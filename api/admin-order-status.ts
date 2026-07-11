import { createClient } from '@supabase/supabase-js';
import { readPanelSession } from './_panel-session.js';

type OrderStatus =
  | 'Por Confirmar'
  | 'Recibido'
  | 'Preparando'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

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

type StatusPayload = {
  orderId?: unknown;
  status?: unknown;
  cancelledReason?: unknown;
};

const ADMIN_STATUSES = new Set<OrderStatus>([
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
]);

const DELIVERY_STATUSES = new Set<OrderStatus>(['Enviado', 'Entregado']);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseBody = (body: unknown): StatusPayload => {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as StatusPayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof body === 'object' ? (body as StatusPayload) : {};
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const isOrderStatus = (value: string): value is OrderStatus => {
  return ADMIN_STATUSES.has(value as OrderStatus);
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
    return { status: 400, message: 'Estado de pedido inválido.' };
  }

  return { status: 500, message: 'No se pudo actualizar el pedido.' };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const session = readPanelSession(req);

  if (!session) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized',
    });
  }

  const payload = parseBody(req.body);
  const orderId = cleanText(payload.orderId, 64);
  const status = cleanText(payload.status, 40);
  const cancelledReason = cleanText(payload.cancelledReason, 500);

  if (!UUID_PATTERN.test(orderId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid orderId',
    });
  }

  if (!isOrderStatus(status)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid order status',
    });
  }

  const allowedStatuses =
    session.role === 'admin' ? ADMIN_STATUSES : DELIVERY_STATUSES;

  if (!allowedStatuses.has(status)) {
    return res.status(403).json({
      ok: false,
      error: 'This panel cannot set the requested status',
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

  const { data, error } = await supabase.rpc('set_order_status_v1', {
    p_order_id: orderId,
    p_status: status,
    p_cancelled_reason:
      status === 'Cancelado' ? cancelledReason || null : null,
  });

  const mappedError = mapSupabaseError(error);

  if (mappedError) {
    console.error('admin-order-status failed:', {
      code: error?.code,
      message: error?.message,
      role: session.role,
      orderId,
      status,
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
