import type { SupabaseClient } from '@supabase/supabase-js';
import { getDeliveryDeviceByToken } from '../delivery-tracking-auth.js';
import { sendDeliveryTrackingPush } from '../delivery-tracking-push.js';
import {
  TRACKING_LIMITS,
  cleanTrackingText,
  finiteTrackingNumber,
  missingTrackingSchema,
  trackingDistanceM,
  validTrackingCoordinate,
} from '../delivery-tracking-utils.js';
import { trackingSetupRequired } from './delivery-tracking-public.js';

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
};

type Body = {
  deviceToken?: string;
  sessionId?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  speedMps?: number | null;
  headingDeg?: number | null;
  capturedAt?: string | number;
  batteryPercent?: number | null;
};

type SessionRow = {
  id: string;
  order_code: string;
  device_id: string;
  status: 'packing' | 'en_route' | 'nearby' | 'arrived' | 'delivered' | 'cancelled';
  store_lat: number;
  store_lng: number;
  customer_lat: number;
  customer_lng: number;
  current_lat?: number | null;
  current_lng?: number | null;
  last_captured_at?: string | null;
  departure_streak: number;
  nearby_streak: number;
  arrival_streak: number;
  accepted_samples: number;
  rejected_samples: number;
};

const rejectPoint = async (
  supabase: SupabaseClient,
  session: SessionRow,
  res: ApiResponse,
  reason: string
) => {
  await supabase
    .from('delivery_sessions')
    .update({
      rejected_samples: session.rejected_samples + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  return res.status(202).json({
    ok: true,
    accepted: false,
    reason,
  });
};

export const trackingHeartbeat = async (
  body: Body,
  res: ApiResponse,
  supabase: SupabaseClient
) => {
  const lookup = await getDeliveryDeviceByToken(
    supabase,
    body.deviceToken || ''
  );

  if (lookup.error) {
    if (missingTrackingSchema(lookup.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo validar el dispositivo.',
    });
  }

  if (!lookup.device || !lookup.device.enabled) {
    return res.status(403).json({
      ok: false,
      error: 'Dispositivo no autorizado.',
    });
  }

  const latitude = finiteTrackingNumber(body.latitude);
  const longitude = finiteTrackingNumber(body.longitude);
  const accuracyM = finiteTrackingNumber(body.accuracyM);
  const battery = finiteTrackingNumber(body.batteryPercent);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    last_seen_at: now,
    updated_at: now,
  };

  if (validTrackingCoordinate(latitude, longitude)) {
    patch.current_lat = latitude;
    patch.current_lng = longitude;
    patch.current_accuracy_m = accuracyM;
  }

  if (battery !== null) {
    patch.battery_percent = Math.max(0, Math.min(100, Math.round(battery)));
  }

  const update = await supabase
    .from('delivery_devices')
    .update(patch)
    .eq('id', lookup.device.id)
    .select('id,name,enabled,max_orders,last_seen_at,battery_percent')
    .single();

  if (update.error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo actualizar el dispositivo.',
    });
  }

  return res.status(200).json({ ok: true, device: update.data });
};

export const updateTrackingLocation = async (
  body: Body,
  res: ApiResponse,
  supabase: SupabaseClient
) => {
  const lookup = await getDeliveryDeviceByToken(
    supabase,
    body.deviceToken || ''
  );

  if (lookup.error) {
    if (missingTrackingSchema(lookup.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo validar el dispositivo.',
    });
  }

  if (!lookup.device || !lookup.device.enabled) {
    return res.status(403).json({
      ok: false,
      error: 'Dispositivo no autorizado.',
    });
  }

  const sessionId = cleanTrackingText(body.sessionId, 100);
  const latitude = finiteTrackingNumber(body.latitude);
  const longitude = finiteTrackingNumber(body.longitude);
  const accuracyM = finiteTrackingNumber(body.accuracyM);
  const speedMps = Math.max(0, finiteTrackingNumber(body.speedMps) || 0);
  const headingDeg = finiteTrackingNumber(body.headingDeg);
  const capturedAt = new Date(body.capturedAt || Date.now());

  if (!sessionId || !validTrackingCoordinate(latitude, longitude) || accuracyM === null) {
    return res.status(400).json({
      ok: false,
      error: 'La lectura GPS no es válida.',
    });
  }

  if (Number.isNaN(capturedAt.getTime())) {
    return res.status(400).json({
      ok: false,
      error: 'La hora de la lectura no es válida.',
    });
  }

  const sessionResult = await supabase
    .from('delivery_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('device_id', lookup.device.id)
    .maybeSingle();

  if (sessionResult.error) {
    if (missingTrackingSchema(sessionResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo consultar la entrega.',
    });
  }

  if (!sessionResult.data) {
    return res.status(404).json({
      ok: false,
      error: 'Entrega no encontrada.',
    });
  }

  const session = sessionResult.data as SessionRow;

  if (session.status === 'delivered' || session.status === 'cancelled') {
    return res.status(409).json({
      ok: false,
      error: 'La entrega ya está cerrada.',
    });
  }

  const lastTime = session.last_captured_at
    ? new Date(session.last_captured_at).getTime()
    : 0;

  if (lastTime && capturedAt.getTime() <= lastTime) {
    return rejectPoint(supabase, session, res, 'Lectura fuera de orden.');
  }

  if (accuracyM <= 0 || accuracyM > TRACKING_LIMITS.maxAccuracyM) {
    return rejectPoint(supabase, session, res, 'Precisión insuficiente.');
  }

  const previous =
    typeof session.current_lat === 'number' &&
    typeof session.current_lng === 'number'
      ? {
          latitude: session.current_lat,
          longitude: session.current_lng,
        }
      : null;

  const current = {
    latitude: latitude as number,
    longitude: longitude as number,
  };
  const movementM = previous ? trackingDistanceM(previous, current) : 0;
  const elapsedSeconds = lastTime
    ? Math.max(0.001, (capturedAt.getTime() - lastTime) / 1000)
    : 0;
  const calculatedSpeed = previous ? movementM / elapsedSeconds : 0;
  const effectiveSpeed = Math.max(calculatedSpeed, speedMps);

  if (previous && effectiveSpeed > TRACKING_LIMITS.maxSpeedMps) {
    return rejectPoint(supabase, session, res, 'Salto imposible detectado.');
  }

  const distanceFromStore = trackingDistanceM(current, {
    latitude: session.store_lat,
    longitude: session.store_lng,
  });
  const distanceToCustomer = trackingDistanceM(current, {
    latitude: session.customer_lat,
    longitude: session.customer_lng,
  });
  const moving =
    movementM >= TRACKING_LIMITS.minMovementM || effectiveSpeed >= 1.2;

  const departureStreak =
    session.status === 'packing' &&
    moving &&
    distanceFromStore >= TRACKING_LIMITS.departureRadiusM
      ? session.departure_streak + 1
      : 0;

  const nearbyStreak =
    (session.status === 'en_route' || session.status === 'nearby') &&
    distanceToCustomer <= TRACKING_LIMITS.nearbyRadiusM
      ? session.nearby_streak + 1
      : 0;

  const arrivalStreak =
    (session.status === 'en_route' ||
      session.status === 'nearby' ||
      session.status === 'arrived') &&
    distanceToCustomer <= TRACKING_LIMITS.arrivalRadiusM
      ? session.arrival_streak + 1
      : 0;

  let nextStatus = session.status;

  if (session.status === 'packing' && departureStreak >= 3) {
    nextStatus = 'en_route';
  } else if (
    (session.status === 'en_route' || session.status === 'nearby') &&
    arrivalStreak >= 2
  ) {
    nextStatus = 'arrived';
  } else if (session.status === 'en_route' && nearbyStreak >= 2) {
    nextStatus = 'nearby';
  }

  const now = new Date().toISOString();
  const insertLocation = await supabase.from('delivery_locations').insert({
    session_id: session.id,
    latitude,
    longitude,
    accuracy_m: accuracyM,
    speed_mps: speedMps || null,
    heading_deg: headingDeg,
    captured_at: capturedAt.toISOString(),
  });

  if (insertLocation.error) {
    if (missingTrackingSchema(insertLocation.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo guardar la ubicación.',
    });
  }

  const updateSession = await supabase
    .from('delivery_sessions')
    .update({
      status: nextStatus,
      current_lat: latitude,
      current_lng: longitude,
      current_accuracy_m: accuracyM,
      current_speed_mps: speedMps || null,
      current_heading_deg: headingDeg,
      last_captured_at: capturedAt.toISOString(),
      departure_streak: departureStreak,
      nearby_streak: nearbyStreak,
      arrival_streak: arrivalStreak,
      accepted_samples: session.accepted_samples + 1,
      updated_at: now,
    })
    .eq('id', session.id)
    .select('*')
    .single();

  if (updateSession.error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo actualizar la entrega.',
    });
  }

  const devicePatch: Record<string, unknown> = {
    last_seen_at: now,
    current_lat: latitude,
    current_lng: longitude,
    current_accuracy_m: accuracyM,
    updated_at: now,
  };

  const battery = finiteTrackingNumber(body.batteryPercent);
  if (battery !== null) {
    devicePatch.battery_percent = Math.max(
      0,
      Math.min(100, Math.round(battery))
    );
  }

  await supabase
    .from('delivery_devices')
    .update(devicePatch)
    .eq('id', lookup.device.id);

  const transitioned = nextStatus !== session.status;

  if (transitioned && nextStatus === 'en_route') {
    await supabase
      .from('orders')
      .update({ status: 'Enviado', updated_at: now })
      .eq('order_code', session.order_code);
  }

  if (transitioned && nextStatus === 'nearby') {
    void sendDeliveryTrackingPush(supabase, session.order_code, 'nearby');
  }

  if (transitioned && nextStatus === 'arrived') {
    void sendDeliveryTrackingPush(supabase, session.order_code, 'arrived');
  }

  return res.status(200).json({
    ok: true,
    accepted: true,
    transitioned,
    status: nextStatus,
    session: updateSession.data,
    distances: {
      fromStoreM: Math.round(distanceFromStore),
      toCustomerM: Math.round(distanceToCustomer),
    },
  });
};

export const completeTrackingSession = async (
  body: Body,
  res: ApiResponse,
  supabase: SupabaseClient
) => {
  const lookup = await getDeliveryDeviceByToken(
    supabase,
    body.deviceToken || ''
  );

  if (lookup.error) {
    if (missingTrackingSchema(lookup.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo validar el dispositivo.',
    });
  }

  if (!lookup.device || !lookup.device.enabled) {
    return res.status(403).json({
      ok: false,
      error: 'Dispositivo no autorizado.',
    });
  }

  const sessionId = cleanTrackingText(body.sessionId, 100);
  const sessionResult = await supabase
    .from('delivery_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('device_id', lookup.device.id)
    .maybeSingle();

  if (sessionResult.error) {
    if (missingTrackingSchema(sessionResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo consultar la entrega.',
    });
  }

  if (!sessionResult.data) {
    return res.status(404).json({
      ok: false,
      error: 'Entrega no encontrada.',
    });
  }

  const session = sessionResult.data as SessionRow;

  if (session.status !== 'arrived') {
    return res.status(409).json({
      ok: false,
      code: 'ARRIVAL_REQUIRED',
      error: 'Primero debe detectarse la llegada al cliente.',
    });
  }

  const now = new Date().toISOString();
  const update = await supabase
    .from('delivery_sessions')
    .update({
      status: 'delivered',
      completed_at: now,
      updated_at: now,
    })
    .eq('id', session.id)
    .select('*')
    .single();

  if (update.error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo cerrar la entrega.',
    });
  }

  await supabase
    .from('orders')
    .update({
      status: 'Entregado',
      delivered_at: now,
      updated_at: now,
    })
    .eq('order_code', session.order_code);

  return res.status(200).json({ ok: true, session: update.data });
};
