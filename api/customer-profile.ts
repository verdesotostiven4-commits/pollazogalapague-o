import { createClient } from '@supabase/supabase-js';
import { readCustomerSession } from './_customer-session.js';

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

type ProfilePayload = {
  name?: unknown;
  avatar_url?: unknown;
  lat?: unknown;
  lng?: unknown;
  reference?: unknown;
  delivery_addresses?: unknown;
  selected_delivery_address_id?: unknown;
};

type DeliveryAddress = {
  id: string;
  label: 'Casa' | 'Trabajo' | 'Airbnb' | 'Otro';
  reference: string;
  lat: number;
  lng: number;
  is_default: boolean;
};

const PROFILE_COLUMNS = [
  'id',
  'phone',
  'name',
  'avatar_url',
  'points',
  'exp',
  'is_vip',
  'phone_verified',
  'lat',
  'lng',
  'reference',
  'delivery_addresses',
  'selected_delivery_address_id',
  'membership_status',
  'membership_plan',
  'membership_started_at',
  'membership_expires_at',
  'membership_updated_at',
  'created_at',
  'updated_at',
].join(', ');

const parseBody = (body: unknown): ProfilePayload => {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as ProfilePayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof body === 'object' ? (body as ProfilePayload) : {};
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const finiteCoordinate = (
  value: unknown,
  minimum: number,
  maximum: number
) => {
  if (value === null || value === undefined || value === '') return null;

  const number = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? number
    : null;
};

const normalizeAddresses = (value: unknown): DeliveryAddress[] | null => {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > 10) return [];

  const allowedLabels = new Set(['Casa', 'Trabajo', 'Airbnb', 'Otro']);
  const addresses: DeliveryAddress[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

    const record = item as Record<string, unknown>;
    const id = cleanText(record.id, 80);
    const rawLabel = cleanText(record.label, 30);
    const label = allowedLabels.has(rawLabel)
      ? (rawLabel as DeliveryAddress['label'])
      : 'Otro';
    const reference = cleanText(record.reference, 500);
    const lat = finiteCoordinate(record.lat, -90, 90);
    const lng = finiteCoordinate(record.lng, -180, 180);

    if (!id || !reference || lat === null || lng === null) continue;

    addresses.push({
      id,
      label,
      reference,
      lat,
      lng,
      is_default: record.is_default === true,
    });
  }

  return addresses;
};

const getSupabase = () => {
  const supabaseUrl =
    String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  ).trim();

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = readCustomerSession(req);

  if (!session) {
    return res.status(401).json({
      ok: false,
      error: 'Customer session required',
    });
  }

  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'Server database access is not configured',
    });
  }

  const { data: existing, error: lookupError } = await supabase
    .from('customers')
    .select('id, phone')
    .or(`phone.eq.${session.phone},phone.like.%${session.phoneTail}`)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error('customer-profile lookup failed:', {
      code: lookupError.code,
      message: lookupError.message,
      phoneTail: session.phoneTail,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not load customer profile',
    });
  }

  if (req.method === 'POST') {
    const payload = parseBody(req.body);
    const patch: Record<string, unknown> = {
      phone: session.phone,
      updated_at: new Date().toISOString(),
    };

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
      patch.name = cleanText(payload.name, 120) || null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'avatar_url')) {
      patch.avatar_url = cleanText(payload.avatar_url, 500) || null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'lat')) {
      patch.lat = finiteCoordinate(payload.lat, -90, 90);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'lng')) {
      patch.lng = finiteCoordinate(payload.lng, -180, 180);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'reference')) {
      patch.reference = cleanText(payload.reference, 500) || null;
    }

    const addresses = normalizeAddresses(payload.delivery_addresses);

    if (addresses !== null) {
      patch.delivery_addresses = addresses;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        'selected_delivery_address_id'
      )
    ) {
      const selectedId = cleanText(payload.selected_delivery_address_id, 80);
      patch.selected_delivery_address_id = selectedId || null;
    }

    let mutation;

    if (existing?.id) {
      mutation = supabase
        .from('customers')
        .update(patch)
        .eq('id', existing.id)
        .select(PROFILE_COLUMNS)
        .maybeSingle();
    } else {
      mutation = supabase
        .from('customers')
        .insert(patch)
        .select(PROFILE_COLUMNS)
        .maybeSingle();
    }

    const { data, error } = await mutation;

    if (error) {
      console.error('customer-profile update failed:', {
        code: error.code,
        message: error.message,
        phoneTail: session.phoneTail,
      });

      return res.status(500).json({
        ok: false,
        error: 'Could not update customer profile',
      });
    }

    return res.status(200).json({ ok: true, customer: data });
  }

  if (!existing?.id) {
    return res.status(200).json({ ok: true, customer: null });
  }

  const { data, error } = await supabase
    .from('customers')
    .select(PROFILE_COLUMNS)
    .eq('id', existing.id)
    .maybeSingle();

  if (error) {
    console.error('customer-profile read failed:', {
      code: error.code,
      message: error.message,
      phoneTail: session.phoneTail,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not load customer profile',
    });
  }

  return res.status(200).json({ ok: true, customer: data });
}
