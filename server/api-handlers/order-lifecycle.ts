import { createClient } from '@supabase/supabase-js';
import {
  getPanelSessionSecret,
  isPanelType,
  readPanelSessionToken,
  verifyPanelSessionToken,
  type PanelType,
} from '../panel-session.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type Body = {
  panel?: string;
  action?: string;
  orderId?: string;
  status?: string;
  paymentStatus?: string;
  reason?: string | null;
};

const ORDER_STATUSES = new Set([
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
]);

const PAYMENT_STATUSES = new Set(['confirmado', 'rechazado', 'contra_entrega']);

const getClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const objectBody = (value: unknown): Body => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Body;
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value ?? '').trim().slice(0, maxLength);
};

const authenticate = async (
  req: ApiRequest,
  panel: PanelType
): Promise<boolean> => {
  const secret = getPanelSessionSecret();
  if (!secret) return false;

  const token = readPanelSessionToken(req.headers, panel);
  if (!token) return false;

  return Boolean(await verifyPanelSessionToken(token, panel, secret));
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = objectBody(req.body);
  const panelValue = cleanText(body.panel, 20);

  if (!isPanelType(panelValue)) {
    return res.status(400).json({ ok: false, error: 'Panel inválido' });
  }

  if (!(await authenticate(req, panelValue))) {
    return res.status(401).json({ ok: false, error: 'Sesión del panel inválida o vencida' });
  }

  const supabase = getClient();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: 'Configuración de servidor incompleta' });
  }

  const action = cleanText(body.action, 40);
  const orderId = cleanText(body.orderId, 100);

  if (!orderId) {
    return res.status(400).json({ ok: false, error: 'Pedido inválido' });
  }

  try {
    if (action === 'transition') {
      const nextStatus = cleanText(body.status, 40);
      const reason = cleanText(body.reason, 500) || null;

      if (!ORDER_STATUSES.has(nextStatus)) {
        return res.status(400).json({ ok: false, error: 'Estado de pedido inválido' });
      }

      const transition = await supabase.rpc('transition_online_order_v3', {
        p_order_id: orderId,
        p_next_status: nextStatus,
        p_actor: panelValue,
        p_reason: reason,
      });

      if (transition.error) throw transition.error;
    } else if (action === 'payment') {
      const paymentStatus = cleanText(body.paymentStatus, 40);

      if (!PAYMENT_STATUSES.has(paymentStatus)) {
        return res.status(400).json({ ok: false, error: 'Estado de pago inválido' });
      }

      if (panelValue === 'delivery' && paymentStatus !== 'confirmado') {
        return res.status(403).json({
          ok: false,
          error: 'El repartidor solo puede confirmar un pago recibido',
        });
      }

      const payment = await supabase.rpc('confirm_online_order_payment_v2', {
        p_order_id: orderId,
        p_next_status: paymentStatus,
        p_actor: panelValue,
      });

      if (payment.error) throw payment.error;
    } else {
      return res.status(400).json({ ok: false, error: 'Acción inválida' });
    }

    const order = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (order.error) throw order.error;

    return res.status(200).json({ ok: true, order: order.data });
  } catch (error) {
    console.error('Order lifecycle action failed:', {
      panel: panelValue,
      action,
      orderId,
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(409).json({
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo actualizar el pedido',
    });
  }
}
