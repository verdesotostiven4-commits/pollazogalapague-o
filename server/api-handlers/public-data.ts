import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

const getServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabase = getServerClient();

  if (!supabase) {
    return res.status(500).json({ ok: false, error: 'Missing server database configuration' });
  }

  const [products, overrides, appSettings, settings, seasons] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: true }),
    supabase.from('product_overrides').select('id,price,available'),
    supabase.from('app_settings').select('key,value'),
    supabase.from('settings').select('*').eq('id', 'global').maybeSingle(),
    supabase
      .from('seasons')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const firstError =
    products.error || overrides.error || appSettings.error || settings.error || seasons.error;

  if (firstError) {
    console.error('Public data query failed:', firstError);
    return res.status(500).json({ ok: false, error: 'Could not load public data' });
  }

  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');

  return res.status(200).json({
    ok: true,
    products: products.data || [],
    overrides: overrides.data || [],
    appSettings: appSettings.data || [],
    settings: settings.data || null,
    seasons: seasons.data || [],
  });
}
