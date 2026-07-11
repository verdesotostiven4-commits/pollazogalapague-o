import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => void };
  setHeader: (name: string, value: string | string[]) => void;
};

const attempts = new Map<string, number>();
const VISIT_WINDOW_MS = 30 * 60 * 1000;

const clientKey = (req: ApiRequest) => {
  const forwarded = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(raw || 'unknown').split(',')[0].trim().slice(0, 80);
};

const getClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const loadMetrics = async (supabase: ReturnType<typeof createClient>) => {
  const result = await supabase
    .from('app_metrics')
    .select('id,value')
    .in('id', ['total_visits', 'total_orders']);
  if (result.error) throw result.error;

  const visits = result.data?.find(metric => metric.id === 'total_visits');
  const orders = result.data?.find(metric => metric.id === 'total_orders');

  return {
    totalVisits: Number(visits?.value || 0),
    totalOrders: Number(orders?.value || 0),
  };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const supabase = getClient();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: 'Missing server database configuration' });
  }

  if (req.method === 'POST') {
    const key = clientKey(req);
    const previous = attempts.get(key) || 0;
    const now = Date.now();

    if (!previous || now - previous >= VISIT_WINDOW_MS) {
      attempts.set(key, now);
      const increment = await supabase.rpc('increment_metric', {
        metric_id: 'total_visits',
      });
      if (increment.error) {
        console.warn('Visit metric increment failed:', increment.error);
      }
    }
  } else if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const metrics = await loadMetrics(supabase);
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');
    return res.status(200).json({ ok: true, ...metrics });
  } catch (error) {
    console.error('Metrics load failed:', error);
    return res.status(500).json({ ok: false, error: 'Could not load metrics' });
  }
}
