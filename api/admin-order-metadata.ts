import { createClient } from '@supabase/supabase-js';
import { readPanelSession } from './_panel-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

type MetadataPayload = {
  orderId?: unknown;
  bonusItems?: unknown;
  vipGiftMessage?: unknown;
};

type BonusItem = {
  item_name: string;
  quantity: number;
  reason: string | null;
  message: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseBody = (body: unknown): MetadataPayload => {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as MetadataPayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof body === 'object'
    ? (body as MetadataPayload)
    : {};
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const normalizeBonusItems = (value: unknown): BonusItem[] | null => {
  if (!Array.isArray(value) || value.length > 20) return null;

  const normalized: BonusItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

    const record = item as Record<string, unknown>;
    const itemName = cleanText(record.item_name, 160);
    const quantity = Number(record.quantity);

    if (!itemName || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100) {
      return null;
    }

    normalized.push({
      item_name: itemName,
      quantity: Math.floor(quantity),
      reason: cleanText(record.reason, 240) || null,
      message: cleanText(record.message, 500) || null,
    });
  }

  return normalized;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = readPanelSession(req, 'admin');

  if (!session) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const payload = parseBody(req.body);
  const orderId = cleanText(payload.orderId, 64);
  const bonusItems = normalizeBonusItems(payload.bonusItems);
  const vipGiftMessage = cleanText(payload.vipGiftMessage, 500);

  if (!UUID_PATTERN.test(orderId)) {
    return res.status(400).json({ ok: false, error: 'Invalid orderId' });
  }

  if (bonusItems === null) {
    return res.status(400).json({ ok: false, error: 'Invalid bonus items' });
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
      missingEnv: true,
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
    .from('orders')
    .update({
      bonus_items: bonusItems,
      vip_gift_message: vipGiftMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('admin-order-metadata failed:', {
      code: error.code,
      message: error.message,
      orderId,
    });

    return res.status(500).json({
      ok: false,
      error: 'No se pudo actualizar el regalo del pedido.',
    });
  }

  if (!data) {
    return res.status(404).json({ ok: false, error: 'Pedido no encontrado.' });
  }

  return res.status(200).json({ ok: true, order: data });
}
