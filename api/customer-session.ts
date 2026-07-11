import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  buildCustomerSessionCookie,
  buildExpiredCustomerSessionCookie,
  createCustomerSessionToken,
  getCustomerSessionSecret,
  readCustomerSessionToken,
  verifyCustomerSessionToken,
} from '../server/customer-session';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

type Body = {
  phone?: string;
  name?: string | null;
  avatarUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;
  deliveryAddresses?: unknown;
  selectedDeliveryAddressId?: string | null;
};

const getBody = (req: ApiRequest): Body => {
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

const cleanPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('593') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `593${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('9')) return `593${digits}`;
  return '';
};

const cleanText = (value: unknown, max: number) => {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
};

const coordinate = (value: unknown, min: number, max: number) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

const sanitizeAddresses = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;

  return value.slice(0, 20).map((raw, index) => {
    const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      id: cleanText(item.id, 100) || `address-${index + 1}`,
      label: cleanText(item.label, 40) || 'Otro',
      reference: cleanText(item.reference, 240),
      lat: coordinate(item.lat, -90, 90),
      lng: coordinate(item.lng, -180, 180),
      is_default: item.is_default === true,
      created_at: cleanText(item.created_at, 60) || undefined,
      updated_at: new Date().toISOString(),
    };
  });
};

const getServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const loadAccount = async (supabase: SupabaseClient, phone: string) => {
  const [customer, membership] = await Promise.all([
    supabase.from('customers').select('*').eq('phone', phone).maybeSingle(),
    supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_phone', phone)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (customer.error) throw customer.error;
  if (membership.error) throw membership.error;

  return {
    customer: customer.data || null,
    membership: membership.data || null,
  };
};

const safeProfilePatch = (body: Body) => {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ('name' in body) patch.name = cleanText(body.name, 100) || null;
  if ('avatarUrl' in body) patch.avatar_url = cleanText(body.avatarUrl, 1000) || null;
  if ('lat' in body) patch.lat = coordinate(body.lat, -90, 90);
  if ('lng' in body) patch.lng = coordinate(body.lng, -180, 180);
  if ('reference' in body) patch.reference = cleanText(body.reference, 240) || null;

  const addresses = sanitizeAddresses(body.deliveryAddresses);
  if (addresses !== undefined) patch.delivery_addresses = addresses;

  if ('selectedDeliveryAddressId' in body) {
    patch.selected_delivery_address_id =
      cleanText(body.selectedDeliveryAddressId, 100) || null;
  }

  return patch;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const secret = getCustomerSessionSecret();
  const supabase = getServerClient();

  if (!secret || !supabase) {
    return res.status(500).json({ ok: false, error: 'Missing secure customer configuration' });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', buildExpiredCustomerSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST') {
    const body = getBody(req);
    const phone = cleanPhone(body.phone);

    if (!phone) {
      return res.status(400).json({ ok: false, error: 'Invalid customer phone' });
    }

    const existingToken = readCustomerSessionToken(req.headers);
    const existingClaims = await verifyCustomerSessionToken(existingToken, secret);

    if (existingClaims && existingClaims.phone !== phone) {
      return res.status(409).json({
        ok: false,
        error: 'Close the current customer session before changing phone',
      });
    }

    const patch = {
      phone,
      ...safeProfilePatch(body),
    };

    const upsert = await supabase
      .from('customers')
      .upsert(patch, { onConflict: 'phone' })
      .select('*')
      .single();

    if (upsert.error) {
      console.error('Customer session upsert failed:', upsert.error);
      return res.status(500).json({ ok: false, error: 'Could not save customer profile' });
    }

    const { token, claims } = await createCustomerSessionToken(phone, secret);
    res.setHeader('Set-Cookie', buildCustomerSessionCookie(token));

    const account = await loadAccount(supabase, phone);

    return res.status(200).json({
      ok: true,
      expiresAt: claims.expiresAt,
      ...account,
    });
  }

  const token = readCustomerSessionToken(req.headers);
  const claims = await verifyCustomerSessionToken(token, secret);

  if (!claims) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const account = await loadAccount(supabase, claims.phone);
      return res.status(200).json({ ok: true, ...account });
    } catch (error) {
      console.error('Customer account load failed:', error);
      return res.status(500).json({ ok: false, error: 'Could not load customer account' });
    }
  }

  if (req.method === 'PATCH') {
    const body = getBody(req);
    const patch = safeProfilePatch(body);
    const update = await supabase
      .from('customers')
      .update(patch)
      .eq('phone', claims.phone)
      .select('*')
      .single();

    if (update.error) {
      console.error('Customer profile update failed:', update.error);
      return res.status(500).json({ ok: false, error: 'Could not update customer profile' });
    }

    const account = await loadAccount(supabase, claims.phone);
    return res.status(200).json({ ok: true, ...account });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
