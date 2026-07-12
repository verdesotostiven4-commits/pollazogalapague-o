import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cleanTrackingText,
  missingTrackingSchema,
  trackingHash,
} from '../delivery-tracking-utils.js';

type ApiRequest = {
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
};

const queryValue = (req: ApiRequest, key: string) => {
  const value = req.query?.[key];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

export const trackingSetupRequired = (res: ApiResponse) =>
  res.status(503).json({
    ok: false,
    code: 'DELIVERY_TRACKING_SETUP_REQUIRED',
    error: 'El módulo de rastreo está preparado, pero falta aplicar su migración en Supabase.',
    setupRequired: true,
  });

export const readPublicTracking = async (
  req: ApiRequest,
  res: ApiResponse,
  supabase: SupabaseClient
) => {
  const orderCode = cleanTrackingText(queryValue(req, 'orderCode'), 120).toUpperCase();
  const trackingToken = cleanTrackingText(queryValue(req, 'trackingToken'), 500);

  if (!orderCode || trackingToken.length < 20) {
    return res.status(400).json({
      ok: false,
      error: 'Faltan los datos seguros del rastreo.',
    });
  }

  const orderResult = await supabase
    .from('orders')
    .select('order_code,status,tracking_token_hash,updated_at')
    .eq('order_code', orderCode)
    .maybeSingle();

  if (orderResult.error) {
    return res.status(500).json({ ok: false, error: 'No se pudo validar el pedido.' });
  }

  const expectedHash = cleanTrackingText(orderResult.data?.tracking_token_hash, 500);
  const providedHash = await trackingHash(trackingToken);

  if (!orderResult.data || !expectedHash || expectedHash !== providedHash) {
    return res.status(404).json({ ok: false, error: 'Rastreo no encontrado.' });
  }

  const sessionResult = await supabase
    .from('delivery_sessions')
    .select('*,delivery_devices(name)')
    .eq('order_code', orderCode)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionResult.error) {
    if (missingTrackingSchema(sessionResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({ ok: false, error: 'No se pudo consultar el recorrido.' });
  }

  if (!sessionResult.data) {
    return res.status(200).json({
      ok: true,
      active: false,
      order: {
        orderCode,
        status: orderResult.data.status,
        updatedAt: orderResult.data.updated_at,
      },
    });
  }

  const session = sessionResult.data as any;
  const locationsResult = await supabase
    .from('delivery_locations')
    .select('latitude,longitude,accuracy_m,speed_mps,heading_deg,captured_at')
    .eq('session_id', session.id)
    .order('captured_at', { ascending: true })
    .limit(120);

  if (locationsResult.error) {
    if (missingTrackingSchema(locationsResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({ ok: false, error: 'No se pudo consultar la ruta.' });
  }

  return res.status(200).json({
    ok: true,
    active: session.status !== 'delivered' && session.status !== 'cancelled',
    order: {
      orderCode,
      status: orderResult.data.status,
      updatedAt: orderResult.data.updated_at,
    },
    tracking: {
      id: session.id,
      status: session.status,
      riderName: session.delivery_devices?.name || 'Repartidor Pollazo',
      store: {
        latitude: session.store_lat,
        longitude: session.store_lng,
      },
      customer: {
        latitude: session.customer_lat,
        longitude: session.customer_lng,
        reference: session.customer_reference || '',
      },
      current:
        typeof session.current_lat === 'number' && typeof session.current_lng === 'number'
          ? {
              latitude: session.current_lat,
              longitude: session.current_lng,
              accuracyM: session.current_accuracy_m,
              speedMps: session.current_speed_mps,
              headingDeg: session.current_heading_deg,
              capturedAt: session.last_captured_at,
            }
          : null,
      startedAt: session.started_at,
      updatedAt: session.updated_at,
      completedAt: session.completed_at,
      path: locationsResult.data || [],
    },
  });
};
