import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: any) => void;
  };
};

type PushSubscriptionJson = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

const cleanPhone = (phone?: string | null) => {
  return String(phone || '').replace(/\D/g, '');
};

const getHeaderValue = (
  headers: Record<string, string | string[] | undefined> | undefined,
  key: string
) => {
  const value = headers?.[key] || headers?.[key.toLowerCase()];

  if (Array.isArray(value)) return value.join(', ');

  return value || '';
};

const getBody = (req: ApiRequest) => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      ok: false,
      error: 'Missing Supabase server env vars',
    });
  }

  const body = getBody(req);

  const customerPhone = cleanPhone(body.customerPhone);
  const subscription = body.subscription as PushSubscriptionJson | undefined;
  const endpoint = String(body.endpoint || subscription?.endpoint || '').trim();
  const oldEndpoint = String(body.oldEndpoint || '').trim();

  if (!customerPhone) {
    return res.status(400).json({
      ok: false,
      error: 'Missing customerPhone',
    });
  }

  if (!subscription || !endpoint) {
    return res.status(400).json({
      ok: false,
      error: 'Missing push subscription',
    });
  }

  if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid push subscription keys',
    });
  }

  const userAgent =
    String(body.userAgent || '').trim() ||
    getHeaderValue(req.headers, 'user-agent') ||
    'unknown';

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  if (oldEndpoint && oldEndpoint !== endpoint) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', oldEndpoint);
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        customer_phone: customerPhone,
        endpoint,
        subscription,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'endpoint',
      }
    )
    .select('id, customer_phone, endpoint, last_seen_at')
    .single();

  if (error) {
    console.error('Error saving push subscription from API:', error);

    return res.status(500).json({
      ok: false,
      error: error.message || 'Could not save push subscription',
      details: error,
    });
  }

  return res.status(200).json({
    ok: true,
    subscription: data,
  });
}
