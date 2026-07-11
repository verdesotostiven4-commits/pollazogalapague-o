import { createClient } from '@supabase/supabase-js';

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
  customerPhone?: string;
  customerName?: string | null;
  paymentMethod?: string;
  notes?: string | null;
};

const PRICE = 6.99;
const PLAN_KEY = 'pollazo_plus';
const PLAN_NAME = 'Pollazo Plus';
const attempts = new Map<string, number>();

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

const requestKey = (req: ApiRequest, phone: string) => {
  const forwarded = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = String(raw || 'unknown').split(',')[0].trim().slice(0, 80);
  return `${ip}:${phone}`;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = getBody(req);
  const phone = cleanPhone(body.customerPhone);
  const name = cleanText(body.customerName, 100) || null;
  const notes = cleanText(body.notes, 500) || null;
  const paymentMethod = cleanText(body.paymentMethod, 30);

  if (!phone) {
    return res.status(400).json({ ok: false, error: 'Invalid customer phone' });
  }
  if (!['efectivo', 'deuna'].includes(paymentMethod)) {
    return res.status(400).json({
      ok: false,
      error: 'Only cash or DeUna on delivery are available',
    });
  }

  const key = requestKey(req, phone);
  const previous = attempts.get(key) || 0;
  const nowMs = Date.now();
  if (previous && nowMs - previous < 15_000) {
    return res.status(429).json({ ok: false, error: 'Please wait before trying again' });
  }
  attempts.set(key, nowMs);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return res.status(500).json({ ok: false, error: 'Missing server database configuration' });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await supabase
    .from('customer_memberships')
    .select('*')
    .eq('customer_phone', phone)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    console.error('Membership lookup failed:', existing.error);
    return res.status(500).json({ ok: false, error: 'Could not verify membership' });
  }

  if (existing.data) {
    return res.status(200).json({ ok: true, deduplicated: true, membership: existing.data });
  }

  const now = new Date().toISOString();
  const membership = await supabase
    .from('customer_memberships')
    .insert({
      customer_phone: phone,
      customer_name: name,
      plan_key: PLAN_KEY,
      plan_name: PLAN_NAME,
      status: 'pending',
      price: PRICE,
      payment_method: paymentMethod,
      payment_status: 'pendiente',
      notes,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (membership.error) {
    console.error('Membership request failed:', membership.error);
    return res.status(500).json({ ok: false, error: 'Could not create membership request' });
  }

  const payment = await supabase.from('membership_payments').insert({
    membership_id: membership.data.id,
    customer_phone: phone,
    customer_name: name,
    amount: PRICE,
    payment_method: paymentMethod,
    payment_status: 'pendiente',
    notes,
    created_at: now,
    updated_at: now,
  });

  if (payment.error) {
    await supabase.from('customer_memberships').delete().eq('id', membership.data.id);
    console.error('Membership payment record failed:', payment.error);
    return res.status(500).json({ ok: false, error: 'Could not register membership payment' });
  }

  await supabase.from('customers').upsert(
    {
      phone,
      name,
      membership_status: 'pending',
      membership_plan: PLAN_NAME,
      membership_updated_at: now,
      updated_at: now,
    },
    { onConflict: 'phone' }
  );

  return res.status(201).json({
    ok: true,
    deduplicated: false,
    membership: membership.data,
  });
}
