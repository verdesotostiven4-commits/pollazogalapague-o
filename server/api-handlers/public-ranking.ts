import { createClient } from '@supabase/supabase-js';
import {
  getCustomerSessionSecret,
  readCustomerSessionToken,
  verifyCustomerSessionToken,
} from '../customer-session.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type CustomerRow = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  points?: number | null;
  exp?: number | null;
  total_orders?: number | null;
  total_spent?: number | null;
  phone_verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const cleanPhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

const publicName = (value?: string | null) => {
  const parts = String(value || 'Guerrero Pollazo').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Guerrero Pollazo';
  return parts[0] + ' ' + parts[1].charAt(0).toUpperCase() + '.';
};

const publicCustomer = (row: CustomerRow, currentId: string) => ({
  id: row.id || '',
  name: publicName(row.name),
  phone: row.id === currentId ? cleanPhone(row.phone) : null,
  avatar_url: row.avatar_url || null,
  points: Number(row.points || 0),
  exp: Number(row.exp || 0),
  total_orders: Number(row.total_orders || 0),
  total_spent: Number(row.total_spent || 0),
  phone_verified: row.phone_verified === true,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Missing server database configuration' });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const secret = getCustomerSessionSecret();
  const token = secret ? readCustomerSessionToken(req.headers) : '';
  const claims = secret && token ? await verifyCustomerSessionToken(token, secret) : null;

  const rankingResult = await supabase
    .from('customers')
    .select('id,name,phone,avatar_url,points,exp,total_orders,total_spent,phone_verified,created_at,updated_at')
    .or('points.gt.0,exp.gt.0,total_orders.gt.0,total_spent.gt.0')
    .order('points', { ascending: false })
    .order('total_spent', { ascending: false })
    .limit(100);

  if (rankingResult.error) {
    console.error('Public ranking load failed:', rankingResult.error);
    return res.status(500).json({ ok: false, error: 'No se pudo cargar el ranking.' });
  }

  let currentCustomer: CustomerRow | null = null;
  if (claims?.phone) {
    const currentResult = await supabase
      .from('customers')
      .select('id,name,phone,avatar_url,points,exp,total_orders,total_spent,phone_verified,created_at,updated_at')
      .eq('phone', claims.phone)
      .maybeSingle();

    if (!currentResult.error) currentCustomer = currentResult.data as CustomerRow | null;
  }

  const rows = (rankingResult.data || []) as CustomerRow[];
  if (currentCustomer?.id && !rows.some(row => row.id === currentCustomer?.id)) {
    rows.push(currentCustomer);
  }

  const currentId = String(currentCustomer?.id || '');
  const customers = rows
    .map(row => publicCustomer(row, currentId))
    .sort((a, b) => {
      const points = b.points - a.points;
      if (points !== 0) return points;
      const spent = b.total_spent - a.total_spent;
      if (spent !== 0) return spent;
      return b.exp - a.exp;
    });

  return res.status(200).json({
    ok: true,
    customers,
    currentCustomerId: currentId || null,
  });
}
