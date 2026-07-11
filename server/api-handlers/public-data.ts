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

type QueryError = {
  code?: string | null;
  message?: string | null;
};

type Warning = {
  source: string;
  code: string;
};

const PUBLIC_PRODUCT_FIELDS = [
  'id',
  'name',
  'category',
  'subcategory',
  'price',
  'unit',
  'description',
  'image',
  'badge',
  'available',
  'show_in_app',
  'show_in_pos',
  'is_variable',
].join(',');

const getSafeErrorCode = (error: QueryError | null): string => {
  if (!error) return 'QUERY_FAILED';

  if (error.code) {
    return String(error.code);
  }

  const message = String(error.message || '').toLowerCase();

  if (message.includes('fetch failed') || message.includes('network')) {
    return 'CONNECTION_FAILED';
  }

  if (message.includes('invalid api key') || message.includes('jwt')) {
    return 'INVALID_API_KEY';
  }

  if (message.includes('permission denied') || message.includes('row-level security')) {
    return 'PERMISSION_DENIED';
  }

  if (message.includes('does not exist') || message.includes('not found')) {
    return 'TABLE_NOT_FOUND';
  }

  return 'QUERY_FAILED';
};

const getPublicClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const toWarning = (source: string, error: QueryError | null): Warning | null => {
  if (!error) return null;

  return {
    source,
    code: getSafeErrorCode(error),
  };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabase = getPublicClient();

  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: 'Missing public database configuration',
    });
  }

  const [products, overrides, appSettings, settings, seasons] = await Promise.all([
    supabase
      .from('products')
      .select(PUBLIC_PRODUCT_FIELDS)
      .eq('show_in_app', true),
    supabase.from('product_overrides').select('*'),
    supabase.from('app_settings').select('*'),
    supabase.from('settings').select('*').eq('id', 'global').maybeSingle(),
    supabase
      .from('seasons')
      .select('*')
      .eq('is_published', true)
      .limit(20),
  ]);

  if (products.error) {
    console.error('Public products query failed:', products.error);

    return res.status(500).json({
      ok: false,
      error: 'Could not load products',
      source: 'products',
      code: getSafeErrorCode(products.error),
    });
  }

  const warnings = [
    toWarning('product_overrides', overrides.error),
    toWarning('app_settings', appSettings.error),
    toWarning('settings', settings.error),
    toWarning('seasons', seasons.error),
  ].filter((warning): warning is Warning => Boolean(warning));

  if (warnings.length > 0) {
    console.warn('Optional public data queries failed:', {
      warnings,
      overridesError: overrides.error,
      appSettingsError: appSettings.error,
      settingsError: settings.error,
      seasonsError: seasons.error,
    });
  }

  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');

  return res.status(200).json({
    ok: true,
    products: products.data || [],
    overrides: overrides.error ? [] : overrides.data || [],
    appSettings: appSettings.error ? [] : appSettings.data || [],
    settings: settings.error ? null : settings.data || null,
    seasons: seasons.error ? [] : seasons.data || [],
    warnings,
  });
}
