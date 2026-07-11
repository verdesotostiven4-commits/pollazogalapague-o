import { createClient } from '@supabase/supabase-js';
import {
  getPanelSessionSecret,
  isPanelType,
  readPanelSessionToken,
  verifyPanelSessionToken,
} from '../panel-session';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

const queryValue = (req: ApiRequest, key: string) => {
  const value = req.query?.[key];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

const getServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const panel = queryValue(req, 'panel');

  if (!isPanelType(panel)) {
    return res.status(400).json({ ok: false, error: 'Invalid panel' });
  }

  const secret = getPanelSessionSecret();
  const supabase = getServerClient();

  if (!secret || !supabase) {
    return res.status(500).json({ ok: false, error: 'Missing secure panel configuration' });
  }

  const token = readPanelSessionToken(req.headers, panel);
  const claims = await verifyPanelSessionToken(token, panel, secret);

  if (!claims) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const publicQueries = [
    supabase.from('products').select('*').order('created_at', { ascending: true }),
    supabase.from('product_overrides').select('id,price,available'),
    supabase.from('app_settings').select('key,value'),
    supabase.from('settings').select('*').eq('id', 'global').maybeSingle(),
    supabase.from('seasons').select('*').order('created_at', { ascending: false }),
  ] as const;

  const [products, overrides, appSettings, settings, seasons] = await Promise.all(publicQueries);

  if (products.error || overrides.error || appSettings.error || settings.error || seasons.error) {
    console.error(
      'Panel public data failed:',
      products.error || overrides.error || appSettings.error || settings.error || seasons.error
    );
    return res.status(500).json({ ok: false, error: 'Could not load panel catalog data' });
  }

  if (panel === 'delivery') {
    const ordersResult = await supabase
      .from('orders')
      .select('*')
      .in('status', ['Preparando', 'Enviado'])
      .order('created_at', { ascending: true })
      .limit(100);

    if (ordersResult.error) {
      console.error('Delivery order data failed:', ordersResult.error);
      return res.status(500).json({ ok: false, error: 'Could not load delivery orders' });
    }

    const phones = Array.from(
      new Set(
        (ordersResult.data || [])
          .map(order => String(order.customer_phone || '').trim())
          .filter(Boolean)
      )
    );

    const customersResult = phones.length
      ? await supabase
          .from('customers')
          .select('id,phone,name,avatar_url,lat,lng,reference,delivery_addresses,selected_delivery_address_id')
          .in('phone', phones)
      : { data: [], error: null };

    if (customersResult.error) {
      console.error('Delivery customer data failed:', customersResult.error);
      return res.status(500).json({ ok: false, error: 'Could not load delivery customers' });
    }

    return res.status(200).json({
      ok: true,
      panel,
      products: products.data || [],
      overrides: overrides.data || [],
      appSettings: appSettings.data || [],
      settings: settings.data || null,
      seasons: seasons.data || [],
      customers: customersResult.data || [],
      orders: ordersResult.data || [],
      memberships: [],
      membershipPayments: [],
      orderBonusItems: [],
    });
  }

  const [customers, orders, memberships, membershipPayments, orderBonusItems] =
    await Promise.all([
      supabase.from('customers').select('*').order('points', { ascending: false }).limit(500),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(250),
      supabase
        .from('customer_memberships')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('membership_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('order_bonus_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

  const sensitiveError =
    customers.error ||
    orders.error ||
    memberships.error ||
    membershipPayments.error ||
    orderBonusItems.error;

  if (sensitiveError) {
    console.error('Admin panel data failed:', sensitiveError);
    return res.status(500).json({ ok: false, error: 'Could not load admin data' });
  }

  return res.status(200).json({
    ok: true,
    panel,
    products: products.data || [],
    overrides: overrides.data || [],
    appSettings: appSettings.data || [],
    settings: settings.data || null,
    seasons: seasons.data || [],
    customers: customers.data || [],
    orders: orders.data || [],
    memberships: memberships.data || [],
    membershipPayments: membershipPayments.data || [],
    orderBonusItems: orderBonusItems.data || [],
  });
}
