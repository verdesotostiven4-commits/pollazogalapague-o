import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

type OrderCredentialInput = {
  orderCode?: string;
  trackingToken?: string;
};

type DatabaseError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const encoder = new TextEncoder();
const MAX_CREDENTIALS = 50;

const getBody = (req: ApiRequest): { credentials?: OrderCredentialInput[] } => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as { credentials?: OrderCredentialInput[] };
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object'
    ? (req.body as { credentials?: OrderCredentialInput[] })
    : {};
};

const cleanCode = (value: unknown) =>
  String(value || '').trim().slice(0, 100);

const cleanToken = (value: unknown) =>
  String(value || '').trim().slice(0, 240);

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';

  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const sha256 = async (value: string) => {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(value)
  );

  return bytesToBase64Url(new Uint8Array(digest));
};

const isSchemaCompatibilityError = (error?: DatabaseError | null) => {
  if (!error) return false;

  const code = String(error.code || '').toUpperCase();
  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('could not find') && message.includes('column')) ||
    message.includes('schema cache')
  );
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({
      ok: false,
      error: 'Missing server database configuration',
    });
  }

  const credentials = (Array.isArray(getBody(req).credentials)
    ? getBody(req).credentials
    : []
  )
    .slice(0, MAX_CREDENTIALS)
    .map(item => ({
      orderCode: cleanCode(item.orderCode),
      trackingToken: cleanToken(item.trackingToken),
    }))
    .filter(item => item.orderCode && item.trackingToken.length >= 20);

  if (credentials.length === 0) {
    return res.status(200).json({ ok: true, orders: [] });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = await Promise.all(
    credentials.map(async credential => {
      const trackingHash = await sha256(credential.trackingToken);

      const secureResult = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', credential.orderCode)
        .eq('tracking_token_hash', trackingHash)
        .maybeSingle();

      if (!secureResult.error && secureResult.data) {
        return secureResult.data;
      }

      if (
        secureResult.error &&
        !isSchemaCompatibilityError(secureResult.error)
      ) {
        console.warn(
          'Customer secure order lookup failed:',
          secureResult.error.code || secureResult.error.message
        );
      }

      const legacyResult = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', credential.orderCode)
        .maybeSingle();

      if (legacyResult.error || !legacyResult.data) {
        if (legacyResult.error) {
          console.warn(
            'Customer legacy order lookup failed:',
            legacyResult.error.code || legacyResult.error.message
          );
        }

        return null;
      }

      const storedHash = String(
        (legacyResult.data as Record<string, unknown>).tracking_token_hash || ''
      ).trim();

      if (storedHash && storedHash !== trackingHash) {
        return null;
      }

      return legacyResult.data;
    })
  );

  const unique = new Map<string, Record<string, unknown>>();

  results.forEach(order => {
    if (!order || typeof order.id !== 'string') return;
    unique.set(order.id, order as Record<string, unknown>);
  });

  const orders = Array.from(unique.values()).sort((a, b) => {
    return String(b.created_at || '').localeCompare(
      String(a.created_at || '')
    );
  });

  return res.status(200).json({ ok: true, orders });
}
