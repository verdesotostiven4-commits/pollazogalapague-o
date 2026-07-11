import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

const parseLimit = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw || ''), 10);

  if (!Number.isFinite(parsed)) return 100;

  return Math.min(100, Math.max(1, parsed));
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, avatar_url, points, exp, is_vip, created_at, updated_at')
    .order('points', { ascending: false })
    .order('exp', { ascending: false })
    .limit(parseLimit(req.query?.limit));

  if (error) {
    console.error('public-leaderboard failed:', {
      code: error.code,
      message: error.message,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not load leaderboard',
    });
  }

  const customers = (data || []).map(customer => ({
    ...customer,
    phone: '',
  }));

  return res.status(200).json({ ok: true, customers });
}
