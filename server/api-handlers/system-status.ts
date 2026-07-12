import { createClient } from '@supabase/supabase-js';
import { installCanonicalSupabaseEnvironment } from '../supabase-env.js';

type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

const safeCode = (error: { code?: string | null } | null) =>
  error?.code ? String(error.code) : null;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const environment = installCanonicalSupabaseEnvironment();
  const key = environment.serverKeyUsable
    ? environment.serverKey
    : environment.publicKey;

  if (!environment.url || !key) {
    return res.status(200).json({
      ok: true,
      healthy: false,
      environment: {
        urlConfigured: Boolean(environment.url),
        publicKeyConfigured: environment.hasPublicKey,
        serverKeyConfigured: environment.hasServerKey,
        serverKeyUsable: environment.serverKeyUsable,
        selectedKeyKind: environment.selectedKeyKind,
        projectMatch: environment.projectMatch,
      },
      database: {
        reachable: false,
        productsReadable: false,
        metricsReadable: false,
        ordersReadable: false,
        deliveryTrackingReady: false,
      },
      recommendation: 'Revisa las variables de Supabase en Vercel.',
    });
  }

  const supabase = createClient(environment.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [products, metrics, orders, deliveryTracking] = await Promise.all([
    supabase.from('products').select('id').limit(1),
    supabase.from('app_metrics').select('id').limit(1),
    supabase.from('orders').select('id').limit(1),
    supabase.from('delivery_sessions').select('id').limit(1),
  ]);

  const productsReadable = !products.error;
  const metricsReadable = !metrics.error;
  const ordersReadable = !orders.error;
  const deliveryTrackingReady = !deliveryTracking.error;
  const healthy =
    environment.projectMatch !== false &&
    productsReadable &&
    metricsReadable &&
    ordersReadable;

  let recommendation = 'La conexión está lista.';

  if (environment.projectMatch === false) {
    recommendation =
      'La URL y la clave son de proyectos distintos. Usa datos del mismo proyecto de Supabase.';
  } else if (
    !environment.serverKeyUsable &&
    (!metricsReadable || !ordersReadable)
  ) {
    recommendation =
      'Falta una clave privada válida del mismo proyecto. Usa SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY.';
  } else if (!healthy) {
    recommendation =
      'La base respondió, pero alguna tabla o permiso necesita revisión.';
  } else if (!deliveryTrackingReady) {
    recommendation =
      'La aplicación principal está lista. El rastreo GPS espera la migración de la Fase 6.';
  }

  return res.status(200).json({
    ok: true,
    healthy,
    environment: {
      urlConfigured: Boolean(environment.url),
      urlSource: environment.urlSource,
      publicKeyConfigured: environment.hasPublicKey,
      publicKeySource: environment.publicKeySource,
      serverKeyConfigured: environment.hasServerKey,
      serverKeySource: environment.serverKeySource,
      serverKeyUsable: environment.serverKeyUsable,
      selectedKeyKind: environment.selectedKeyKind,
      selectedKeySource: environment.selectedKeySource,
      projectMatch: environment.projectMatch,
    },
    database: {
      reachable: productsReadable || metricsReadable || ordersReadable,
      productsReadable,
      productsCode: safeCode(products.error),
      metricsReadable,
      metricsCode: safeCode(metrics.error),
      ordersReadable,
      ordersCode: safeCode(orders.error),
      deliveryTrackingReady,
      deliveryTrackingCode: safeCode(deliveryTracking.error),
    },
    recommendation,
  });
}
