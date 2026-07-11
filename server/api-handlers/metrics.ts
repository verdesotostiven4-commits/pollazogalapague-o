import { createClient } from '@supabase/supabase-js';
import { installCanonicalSupabaseEnvironment } from '../supabase-env.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => void };
  setHeader: (name: string, value: string | string[]) => void;
};

type DatabaseError = {
  code?: string | null;
  message?: string | null;
};

const attempts = new Map<string, number>();
const VISIT_WINDOW_MS = 30 * 60 * 1000;

const clientKey = (req: ApiRequest) => {
  const forwarded =
    req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(raw || 'unknown').split(',')[0].trim().slice(0, 80);
};

const permissionError = (error?: DatabaseError | null) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('row-level security')
  );
};

const loadMetrics = async (supabase: ReturnType<typeof createClient>) => {
  const result = await supabase
    .from('app_metrics')
    .select('id,value')
    .in('id', ['total_visits', 'total_orders']);

  if (result.error) throw result.error;

  const rows = (result.data || []) as Array<{
    id: string;
    value: number | string | null;
  }>;
  const visits = rows.find(metric => metric.id === 'total_visits');
  const orders = rows.find(metric => metric.id === 'total_orders');

  return {
    totalVisits: Number(visits?.value || 0),
    totalOrders: Number(orders?.value || 0),
  };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const environment = installCanonicalSupabaseEnvironment();
  const key = environment.serverKeyUsable
    ? environment.serverKey
    : environment.publicKey;

  if (!environment.url || !key) {
    return res.status(500).json({
      ok: false,
      error: 'Falta configurar la conexión de Supabase en Vercel.',
      code: 'SUPABASE_CONFIG_MISSING',
    });
  }

  if (environment.projectMatch === false) {
    return res.status(500).json({
      ok: false,
      error: 'La URL y la clave de Supabase pertenecen a proyectos distintos.',
      code: 'SUPABASE_PROJECT_MISMATCH',
    });
  }

  const supabase = createClient(environment.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (req.method === 'POST') {
    const keyOfClient = clientKey(req);
    const previous = attempts.get(keyOfClient) || 0;
    const now = Date.now();

    if (!previous || now - previous >= VISIT_WINDOW_MS) {
      attempts.set(keyOfClient, now);
      const increment = await supabase.rpc('increment_metric', {
        metric_id: 'total_visits',
      });

      if (increment.error) {
        console.warn('Visit metric increment failed:', increment.error);

        if (
          environment.selectedKeyKind === 'public' &&
          permissionError(increment.error)
        ) {
          return res.status(503).json({
            ok: false,
            error:
              'Supabase bloqueó las métricas públicas. Configura la clave privada del mismo proyecto en Vercel.',
            code: 'SUPABASE_SERVER_KEY_REQUIRED',
          });
        }
      }
    }
  } else if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const metrics = await loadMetrics(supabase);
    res.setHeader(
      'Cache-Control',
      'public, max-age=15, stale-while-revalidate=45'
    );
    return res.status(200).json({ ok: true, ...metrics });
  } catch (error) {
    const databaseError = error as DatabaseError;
    console.error('Metrics load failed:', databaseError);

    if (
      environment.selectedKeyKind === 'public' &&
      permissionError(databaseError)
    ) {
      return res.status(503).json({
        ok: false,
        error:
          'Supabase bloqueó la lectura de métricas. Configura la clave privada del mismo proyecto en Vercel.',
        code: 'SUPABASE_SERVER_KEY_REQUIRED',
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'No se pudieron cargar las métricas.',
      code: databaseError.code || 'METRICS_LOAD_FAILED',
    });
  }
}
