import { createClient } from '@supabase/supabase-js';
import {
  getCustomerSessionSecret,
  readCustomerSessionToken,
  verifyCustomerSessionToken,
} from '../customer-session';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader?: (name: string, value: string | string[]) => void;
};

type PushSubscriptionJson = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type Body = {
  action?: string;
  customerPhone?: string;
  subscription?: PushSubscriptionJson;
  endpoint?: string;
  oldEndpoint?: string | null;
  userAgent?: string;
};

const cleanPhone = (phone?: string | null) =>
  String(phone || '').replace(/\D/g, '');

const getHeaderValue = (
  headers: Record<string, string | string[] | undefined> | undefined,
  key: string
) => {
  const value = headers?.[key] || headers?.[key.toLowerCase()];
  return Array.isArray(value) ? value.join(', ') : value || '';
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader?.('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const customerSecret = getCustomerSessionSecret();

  if (!supabaseUrl || !serviceRoleKey || !customerSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Missing secure push server configuration',
    });
  }

  const token = readCustomerSessionToken(req.headers);
  const claims = await verifyCustomerSessionToken(token, customerSecret);

  if (!claims) {
    return res.status(401).json({
      ok: false,
      error: 'Inicia sesión para administrar notificaciones.',
    });
  }

  const body = getBody(req);
  const endpoint = String(body.endpoint || body.subscription?.endpoint || '').trim();
  const oldEndpoint = String(body.oldEndpoint || '').trim();
  const action = String(body.action || 'upsert').trim();
  const customerPhone = cleanPhone(body.customerPhone);

  if (customerPhone && customerPhone !== claims.phone) {
    return res.status(403).json({ ok: false, error: 'Customer phone mismatch' });
  }

  if (!endpoint) {
    return res.status(400).json({ ok: false, error: 'Missing endpoint' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'delete') {
    const deleted = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('customer_phone', claims.phone);

    if (deleted.error) {
      console.error('Push subscription delete failed:', deleted.error);
      return res.status(500).json({ ok: false, error: 'Could not delete subscription' });
    }

    return res.status(200).json({ ok: true, endpoint });
  }

  const subscription = body.subscription;
  if (!subscription?.keys?.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ ok: false, error: 'Invalid push subscription keys' });
  }

  const userAgent =
    String(body.userAgent || '').trim().slice(0, 500) ||
    getHeaderValue(req.headers, 'user-agent').slice(0, 500) ||
    'unknown';

  if (oldEndpoint && oldEndpoint !== endpoint) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', oldEndpoint)
      .eq('customer_phone', claims.phone);
  }

  const saved = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        customer_phone: claims.phone,
        endpoint,
        subscription,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )
    .select('id,customer_phone,endpoint,last_seen_at')
    .single();

  if (saved.error) {
    console.error('Push subscription save failed:', saved.error);
    return res.status(500).json({
      ok: false,
      error: saved.error.message || 'Could not save push subscription',
    });
  }

  return res.status(200).json({ ok: true, subscription: saved.data });
}
