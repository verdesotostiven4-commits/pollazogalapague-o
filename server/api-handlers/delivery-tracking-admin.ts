import type { SupabaseClient } from '@supabase/supabase-js';
import { getDeliveryDeviceByToken } from '../delivery-tracking-auth.js';
import {
  cleanTrackingText,
  createTrackingToken,
  finiteTrackingNumber,
  missingTrackingSchema,
  trackingHash,
  validTrackingCoordinate,
} from '../delivery-tracking-utils.js';
import { trackingSetupRequired } from './delivery-tracking-public.js';

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
};

type Body = {
  name?: string;
  maxOrders?: number;
  deviceId?: string;
  enabled?: boolean;
  deviceToken?: string;
  orderCode?: string;
  storeLat?: number;
  storeLng?: number;
};

const activeStatuses = ['packing', 'en_route', 'nearby', 'arrived'];

export const listTrackingDevices = async (
  res: ApiResponse,
  supabase: SupabaseClient
) => {
  const devicesResult = await supabase
    .from('delivery_devices')
    .select(
      'id,name,enabled,max_orders,last_seen_at,current_lat,current_lng,current_accuracy_m,battery_percent,created_at,updated_at'
    )
    .order('created_at', { ascending: true });

  if (devicesResult.error) {
    if (missingTrackingSchema(devicesResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudieron consultar los dispositivos.',
    });
  }

  const sessionsResult = await supabase
    .from('delivery_sessions')
    .select(
      'id,device_id,order_code,status,store_lat,store_lng,customer_lat,customer_lng,customer_reference,current_lat,current_lng,current_accuracy_m,last_captured_at,updated_at'
    )
    .in('status', activeStatuses);

  if (sessionsResult.error) {
    if (missingTrackingSchema(sessionsResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudieron consultar las entregas activas.',
    });
  }

  const sessions = sessionsResult.data || [];
  const devices = (devicesResult.data || []).map(device => {
    const activeOrders = sessions.filter(session => session.device_id === device.id);
    const lastSeen = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;

    return {
      ...device,
      online: Boolean(lastSeen && Date.now() - lastSeen <= 45_000),
      load: activeOrders.length,
      activeOrders,
    };
  });

  return res.status(200).json({ ok: true, devices });
};

export const createTrackingDevice = async (
  body: Body,
  res: ApiResponse,
  supabase: SupabaseClient
) => {
  const name = cleanTrackingText(body.name, 100);
  const maxOrders = Math.max(
    1,
    Math.min(8, Math.round(Number(body.maxOrders) || 3))
  );

  if (!name) {
    return res.status(400).json({
      ok: false,
      error: 'Escribe un nombre para el dispositivo.',
    });
  }

  const deviceToken = createTrackingToken();
  const tokenHash = await trackingHash(deviceToken);
  const result = await supabase
    .from('delivery_devices')
    .insert({
      name,
      token_hash: tokenHash,
      max_orders: maxOrders,
      enabled: true,
    })
    .select('id,name,enabled,max_orders,created_at')
    .single();

  if (result.error) {
    if (missingTrackingSchema(result.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo crear el dispositivo.',
    });
  }

  return res.status(201).json({
    ok: true,
    device: result.data,
    deviceToken,
    invitePath: `/repartidor?device=${encodeURIComponent(deviceToken)}`,
    warning: 'El enlace se muestra una sola vez.',
  });
};

export const updateTrackingDevice = async (
  body: Body,
  res: ApiResponse,
  supabase: SupabaseClient
) => {
  const deviceId = cleanTrackingText(body.deviceId, 100);
  if (!deviceId) {
    return res.status(400).json({
      ok: false,
      error: 'Falta el dispositivo.',
    });
  }

  const currentResult = await supabase
    .from('delivery_devices')
    .select('id,name,enabled,max_orders')
    .eq('id', deviceId)
    .maybeSingle();

  if (currentResult.error) {
    if (missingTrackingSchema(currentResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo consultar el dispositivo.',
    });
  }

  if (!currentResult.data) {
    return res.status(404).json({
      ok: false,
      error: 'Dispositivo no encontrado.',
    });
  }

  const activeResult = await supabase
    .from('delivery_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .in('status', activeStatuses);

  if (activeResult.error) {
    if (missingTrackingSchema(activeResult.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo revisar la carga del dispositivo.',
    });
  }

  const activeCount = activeResult.count || 0;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.enabled === 'boolean') {
    if (!body.enabled && activeCount > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Primero finaliza las entregas activas antes de deshabilitar este celular.',
      });
    }
    patch.enabled = body.enabled;
  }

  if (body.maxOrders !== undefined) {
    const nextMax = Math.max(1, Math.min(8, Math.round(Number(body.maxOrders) || 1)));
    if (nextMax < activeCount) {
      return res.status(409).json({
        ok: false,
        error: `Este celular ya tiene ${activeCount} entregas activas.`,
      });
    }
    patch.max_orders = nextMax;
  }

  if (body.name !== undefined) {
    const nextName = cleanTrackingText(body.name, 100);
    if (!nextName) {
      return res.status(400).json({
        ok: false,
        error: 'El nombre del dispositivo no puede quedar vacío.',
      });
    }
    patch.name = nextName;
  }

  const update = await supabase
    .from('delivery_devices')
    .update(patch)
    .eq('id', deviceId)
    .select('id,name,enabled,max_orders,last_seen_at,battery_percent,updated_at')
    .single();

  if (update.error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo actualizar el dispositivo.',
    });
  }

  return res.status(200).json({ ok: true, device: update.data });
};

export const startTrackingSession = async (
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

  const orderCode = cleanTrackingText(body.orderCode, 120).toUpperCase();
  const storeLat = finiteTrackingNumber(body.storeLat);
  const storeLng = finiteTrackingNumber(body.storeLng);

  if (!orderCode || !validTrackingCoordinate(storeLat, storeLng)) {
    return res.status(400).json({
      ok: false,
      error: 'Falta el pedido o la ubicación del local.',
    });
  }

  const orderResult = await supabase
    .from('orders')
    .select('order_code,status,lat,lng,reference,delivery_type')
    .eq('order_code', orderCode)
    .maybeSingle();

  if (orderResult.error || !orderResult.data) {
    return res.status(404).json({
      ok: false,
      error: 'Pedido no encontrado.',
    });
  }

  if (orderResult.data.status === 'Por Confirmar') {
    return res.status(409).json({
      ok: false,
      code: 'ORDER_REQUIRES_CONFIRMATION',
      error: 'Primero confirma manualmente el pedido.',
    });
  }

  if (['Entregado', 'Cancelado'].includes(orderResult.data.status)) {
    return res.status(409).json({
      ok: false,
      error: 'Este pedido ya está cerrado.',
    });
  }

  const customerLat = finiteTrackingNumber(orderResult.data.lat);
  const customerLng = finiteTrackingNumber(orderResult.data.lng);

  if (!validTrackingCoordinate(customerLat, customerLng)) {
    return res.status(409).json({
      ok: false,
      error: 'El pedido no tiene una ubicación válida.',
    });
  }

  const activeCount = await supabase
    .from('delivery_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', lookup.device.id)
    .in('status', activeStatuses);

  if (activeCount.error) {
    if (missingTrackingSchema(activeCount.error)) return trackingSetupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo revisar la capacidad del repartidor.',
    });
  }

  if ((activeCount.count || 0) >= lookup.device.max_orders) {
    return res.status(409).json({
      ok: false,
      error: 'Este repartidor alcanzó su capacidad máxima.',
    });
  }

  const now = new Date().toISOString();
  const insert = await supabase
    .from('delivery_sessions')
    .insert({
      order_code: orderCode,
      device_id: lookup.device.id,
      status: 'packing',
      store_lat: storeLat,
      store_lng: storeLng,
      customer_lat: customerLat,
      customer_lng: customerLng,
      customer_reference:
        cleanTrackingText(orderResult.data.reference, 300) || null,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insert.error) {
    if (missingTrackingSchema(insert.error)) return trackingSetupRequired(res);

    if (String(insert.error.code || '') === '23505') {
      return res.status(409).json({
        ok: false,
        error: 'Este pedido ya está asignado a otro repartidor.',
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'No se pudo iniciar el rastreo.',
    });
  }

  if (orderResult.data.status === 'Recibido') {
    await supabase
      .from('orders')
      .update({ status: 'Preparando', updated_at: now })
      .eq('order_code', orderCode);
  }

  await supabase
    .from('delivery_devices')
    .update({ last_seen_at: now, updated_at: now })
    .eq('id', lookup.device.id);

  return res.status(201).json({
    ok: true,
    session: insert.data,
  });
};
