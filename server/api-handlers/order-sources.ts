import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureTrackingPanel } from '../delivery-tracking-auth.js';
import {
  cleanTrackingText,
  getTrackingClient,
  missingTrackingSchema,
} from '../delivery-tracking-utils.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type Body = {
  action?: string;
  orderCode?: string;
  productId?: string;
  itemName?: string;
  plannedSource?: string;
  actualSource?: string;
  reason?: string;
  eventId?: string;
};

const SOURCES = new Set(['mirador', 'cascada']);

const bodyOf = (req: ApiRequest): Body => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Body;
    } catch {
      return {};
    }
  }
  return typeof req.body === 'object' ? (req.body as Body) : {};
};

const queryValue = (req: ApiRequest, key: string) => {
  const value = req.query?.[key];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

const setupRequired = (res: ApiResponse) =>
  res.status(503).json({
    ok: false,
    setupRequired: true,
    code: 'ORDER_SOURCES_SETUP_REQUIRED',
    error: 'Falta activar el registro interno de origen de productos.',
  });

const validateOrder = async (
  supabase: SupabaseClient,
  orderCode: string,
  productId: string,
  itemName: string
) => {
  const result = await supabase
    .from('orders')
    .select('order_code,items,status')
    .eq('order_code', orderCode)
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) return { valid: false, error: 'Pedido no encontrado.' };
  if (['Entregado', 'Cancelado'].includes(String(result.data.status || ''))) {
    return { valid: false, error: 'El pedido ya está cerrado.' };
  }

  const items = Array.isArray(result.data.items) ? result.data.items : [];
  const normalizedName = itemName.toLowerCase();
  const found = items.some((item: any) => {
    const currentId = cleanTrackingText(
      item?.product_id || item?.product?.id || item?.cart_item_id || item?.id,
      180
    ).toLowerCase();
    const currentName = cleanTrackingText(
      item?.name || item?.product?.name,
      180
    ).toLowerCase();
    return Boolean(
      (productId && currentId === productId.toLowerCase()) ||
        (normalizedName && currentName === normalizedName)
    );
  });

  return found
    ? { valid: true as const }
    : { valid: false as const, error: 'El producto no pertenece a este pedido.' };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const supabase = getTrackingClient();
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: 'Falta la conexión privada con Supabase.',
    });
  }

  const panel = await ensureTrackingPanel(req.headers, ['admin', 'delivery']);
  if (!panel) {
    return res.status(401).json({ ok: false, error: 'Sesión de panel requerida.' });
  }

  if (req.method === 'GET') {
    const orderCodes = cleanTrackingText(queryValue(req, 'orderCodes'), 4000)
      .split(',')
      .map(code => cleanTrackingText(code, 120).toUpperCase())
      .filter(Boolean)
      .slice(0, 60);

    let query = supabase
      .from('order_source_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250);

    if (orderCodes.length > 0) {
      query = query.in('order_code', orderCodes);
    }

    const result = await query;
    if (result.error) {
      if (missingTrackingSchema(result.error)) return setupRequired(res);
      return res.status(500).json({
        ok: false,
        error: 'No se pudo consultar el origen de los productos.',
      });
    }

    return res.status(200).json({ ok: true, events: result.data || [] });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (panel !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'Solo el administrador puede cambiar el origen de un producto.',
    });
  }

  const body = bodyOf(req);
  const action = cleanTrackingText(body.action, 40);

  if (action === 'delete_event') {
    const eventId = cleanTrackingText(body.eventId, 100);
    if (!eventId) {
      return res.status(400).json({ ok: false, error: 'Falta el registro.' });
    }

    const removed = await supabase
      .from('order_source_events')
      .delete()
      .eq('id', eventId);

    if (removed.error) {
      if (missingTrackingSchema(removed.error)) return setupRequired(res);
      return res.status(500).json({ ok: false, error: 'No se pudo corregir el registro.' });
    }

    return res.status(200).json({ ok: true, deleted: eventId });
  }

  if (action !== 'record_source') {
    return res.status(404).json({ ok: false, error: 'Acción no encontrada.' });
  }

  const orderCode = cleanTrackingText(body.orderCode, 120).toUpperCase();
  const productId = cleanTrackingText(body.productId, 180);
  const itemName = cleanTrackingText(body.itemName, 180);
  const plannedSource = cleanTrackingText(body.plannedSource, 30).toLowerCase();
  const actualSource = cleanTrackingText(body.actualSource, 30).toLowerCase();
  const reason = cleanTrackingText(body.reason, 500);

  if (
    !orderCode ||
    !itemName ||
    !SOURCES.has(plannedSource) ||
    !SOURCES.has(actualSource)
  ) {
    return res.status(400).json({
      ok: false,
      error: 'Los datos del producto o de la sucursal no son válidos.',
    });
  }

  if (plannedSource !== actualSource && !reason) {
    return res.status(400).json({
      ok: false,
      error: 'Escribe por qué se cambió la sucursal del producto.',
    });
  }

  try {
    const validation = await validateOrder(
      supabase,
      orderCode,
      productId,
      itemName
    );
    if (!validation.valid) {
      return res.status(409).json({ ok: false, error: validation.error });
    }
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo validar el pedido.' });
  }

  const inserted = await supabase
    .from('order_source_events')
    .insert({
      order_code: orderCode,
      product_id: productId || null,
      item_name: itemName,
      planned_source: plannedSource,
      actual_source: actualSource,
      reason: reason || null,
      changed_by: 'admin',
    })
    .select('*')
    .single();

  if (inserted.error) {
    if (missingTrackingSchema(inserted.error)) return setupRequired(res);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo guardar el origen del producto.',
    });
  }

  return res.status(201).json({ ok: true, event: inserted.data });
}
