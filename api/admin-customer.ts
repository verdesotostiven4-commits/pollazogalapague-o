import { createClient } from '@supabase/supabase-js';
import { normalizeCustomerPhone } from './_customer-session.js';
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

type MutationPayload = {
  operation?: unknown;
  customerId?: unknown;
  phone?: unknown;
  patch?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RISK_LEVELS = new Set(['normal', 'confiable', 'riesgoso', 'bloqueado']);
const MEMBERSHIP_STATUSES = new Set([
  'none',
  'pending',
  'active',
  'expired',
  'cancelled',
]);

const parseBody = (body: unknown): MutationPayload => {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as MutationPayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof body === 'object' ? (body as MutationPayload) : {};
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const finiteNumber = (
  value: unknown,
  minimum: number,
  maximum: number,
  integer = false
) => {
  const number = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    return null;
  }

  return integer ? Math.floor(number) : number;
};

const safeDate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const sanitizePatch = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  const phone = normalizeCustomerPhone(source.phone);
  if (phone.slice(-9).length === 9) patch.phone = phone;

  if ('name' in source) patch.name = cleanText(source.name, 120) || null;
  if ('avatar_url' in source) {
    patch.avatar_url = cleanText(source.avatar_url, 500) || null;
  }

  if ('points' in source) {
    const points = finiteNumber(source.points, 0, 1_000_000_000, true);
    if (points !== null) patch.points = points;
  }

  if ('exp' in source) {
    const exp = finiteNumber(source.exp, 0, 1_000_000_000, true);
    if (exp !== null) patch.exp = exp;
  }

  if ('total_spent' in source) {
    const totalSpent = finiteNumber(source.total_spent, 0, 1_000_000_000);
    if (totalSpent !== null) patch.total_spent = Number(totalSpent.toFixed(2));
  }

  if ('total_orders' in source) {
    const totalOrders = finiteNumber(source.total_orders, 0, 10_000_000, true);
    if (totalOrders !== null) patch.total_orders = totalOrders;
  }

  for (const field of ['is_vip', 'phone_verified', 'blocked'] as const) {
    if (field in source && typeof source[field] === 'boolean') {
      patch[field] = source[field];
    }
  }

  if ('risk_level' in source) {
    const risk = cleanText(source.risk_level, 30).toLowerCase();
    if (RISK_LEVELS.has(risk)) patch.risk_level = risk;
  }

  if ('lat' in source) {
    patch.lat = finiteNumber(source.lat, -90, 90);
  }

  if ('lng' in source) {
    patch.lng = finiteNumber(source.lng, -180, 180);
  }

  if ('reference' in source) {
    patch.reference = cleanText(source.reference, 500) || null;
  }

  if ('delivery_addresses' in source) {
    patch.delivery_addresses = Array.isArray(source.delivery_addresses)
      ? source.delivery_addresses.slice(0, 10)
      : [];
  }

  if ('selected_delivery_address_id' in source) {
    patch.selected_delivery_address_id =
      cleanText(source.selected_delivery_address_id, 80) || null;
  }

  if ('membership_status' in source) {
    const status = cleanText(source.membership_status, 30).toLowerCase();
    if (MEMBERSHIP_STATUSES.has(status)) patch.membership_status = status;
  }

  if ('membership_plan' in source) {
    patch.membership_plan = cleanText(source.membership_plan, 120) || null;
  }

  for (const field of [
    'membership_started_at',
    'membership_expires_at',
    'membership_updated_at',
    'last_order_at',
  ] as const) {
    if (field in source) patch[field] = safeDate(source[field]);
  }

  patch.updated_at = new Date().toISOString();

  return patch;
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
  const operation = cleanText(payload.operation, 20).toLowerCase();
  const customerId = cleanText(payload.customerId, 64);
  const requestPhone = normalizeCustomerPhone(payload.phone);
  const patch = sanitizePatch(payload.patch);

  if (operation !== 'update' && operation !== 'upsert') {
    return res.status(400).json({ ok: false, error: 'Invalid operation' });
  }

  if (!patch) {
    return res.status(400).json({ ok: false, error: 'Invalid customer patch' });
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

  let result;

  if (operation === 'upsert') {
    const phone = normalizeCustomerPhone(patch.phone || requestPhone);

    if (phone.slice(-9).length !== 9) {
      return res.status(400).json({ ok: false, error: 'Invalid customer phone' });
    }

    result = await supabase
      .from('customers')
      .upsert(
        {
          ...patch,
          phone,
        },
        { onConflict: 'phone' }
      )
      .select('*')
      .maybeSingle();
  } else if (UUID_PATTERN.test(customerId)) {
    result = await supabase
      .from('customers')
      .update(patch)
      .eq('id', customerId)
      .select('*')
      .maybeSingle();
  } else {
    const phone = normalizeCustomerPhone(requestPhone || patch.phone);

    if (phone.slice(-9).length !== 9) {
      return res.status(400).json({ ok: false, error: 'Missing customer identifier' });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('customers')
      .select('id')
      .or(`phone.eq.${phone},phone.like.%${phone.slice(-9)}`)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      return res.status(500).json({ ok: false, error: 'Could not find customer' });
    }

    if (!existing?.id) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }

    result = await supabase
      .from('customers')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();
  }

  if (result.error) {
    console.error('admin-customer mutation failed:', {
      code: result.error.code,
      message: result.error.message,
      operation,
      customerId,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not update customer',
    });
  }

  if (!result.data) {
    return res.status(404).json({ ok: false, error: 'Customer not found' });
  }

  return res.status(200).json({ ok: true, customer: result.data });
}
