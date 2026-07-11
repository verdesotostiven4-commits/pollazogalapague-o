import { createClient } from '@supabase/supabase-js';
import { readPanelSession } from './_panel-session.js';

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

const cleanText = (value: unknown, maxLength: number) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').trim().slice(0, maxLength);
};

const parseLimit = (value: unknown) => {
  const parsed = Number.parseInt(cleanText(value, 10), 10);

  if (!Number.isFinite(parsed)) return 150;

  return Math.min(250, Math.max(1, parsed));
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = readPanelSession(req);

  if (!session) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
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
    });
  }

  const limit = parseLimit(req.query?.limit);
  const orderCode = cleanText(req.query?.orderCode, 80);
  const orderId = cleanText(req.query?.orderId, 64);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (orderCode) query = query.eq('order_code', orderCode);
  if (orderId) query = query.eq('id', orderId);

  if (session.role === 'delivery') {
    query = query.in('status', [
      'Recibido',
      'Preparando',
      'Enviado',
      'Entregado',
    ]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('admin-orders lookup failed:', {
      code: error.code,
      message: error.message,
      role: session.role,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not load orders',
    });
  }

  return res.status(200).json({
    ok: true,
    orders: data || [],
  });
}
