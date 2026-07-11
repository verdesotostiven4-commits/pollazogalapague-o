import { createClient } from '@supabase/supabase-js';
import {
  readCustomerSession,
  serializeClearedCustomerSessionCookie,
} from './_customer-session.js';

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

  if (!Number.isFinite(parsed)) return 60;

  return Math.min(60, Math.max(1, parsed));
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const session = readCustomerSession(req);

  if (!session) {
    res.setHeader('Set-Cookie', serializeClearedCustomerSessionCookie());

    return res.status(401).json({
      ok: false,
      error: 'Customer session required',
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
    });
  }

  const limit = parseLimit(req.query?.limit);
  const orderCode = cleanText(req.query?.orderCode, 80);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let query = supabase
    .from('orders')
    .select(
      [
        'id',
        'order_code',
        'customer_phone',
        'customer_name',
        'items',
        'subtotal',
        'delivery_fee',
        'total',
        'status',
        'payment_method',
        'payment_status',
        'delivery_type',
        'reference',
        'membership_applied',
        'membership_plan',
        'bonus_items',
        'vip_gift_message',
        'confirmed_at',
        'delivered_at',
        'cancelled_at',
        'cancelled_reason',
        'created_at',
        'updated_at',
      ].join(', ')
    )
    .or(
      `customer_phone.eq.${session.phone},customer_phone.like.%${session.phoneTail}`
    )
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (orderCode) {
    query = query.eq('order_code', orderCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('customer-orders lookup failed:', {
      code: error.code,
      message: error.message,
      phoneTail: session.phoneTail,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not load customer orders',
    });
  }

  const orders = (data || []).filter(order => {
    const tail = String(order.customer_phone || '')
      .replace(/\D/g, '')
      .slice(-9);

    return tail === session.phoneTail;
  });

  return res.status(200).json({
    ok: true,
    orders,
  });
}
