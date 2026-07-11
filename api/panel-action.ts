import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getPanelSessionSecret,
  isPanelType,
  readPanelSessionToken,
  verifyPanelSessionToken,
  type PanelType,
} from '../server/panel-session';

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
  panel?: string;
  action?: string;
  payload?: Record<string, unknown>;
};

const ADMIN_ONLY_ACTIONS = new Set([
  'update_setting',
  'update_extra_settings',
  'finalize_season',
  'delete_season',
  'toggle_season',
  'update_season_winners',
  'set_product_override',
  'upsert_product',
  'delete_product',
  'upsert_customer',
  'add_customer_points',
  'reset_season_points',
  'activate_membership',
  'cancel_membership',
  'expire_membership',
  'add_vip_gift',
  'confirm_order_payment',
]);

const PRODUCT_FIELDS = new Set([
  'id',
  'name',
  'category',
  'subcategory',
  'price',
  'unit',
  'description',
  'image',
  'badge',
  'available',
  'show_in_app',
  'show_in_pos',
  'is_variable',
  'track_stock',
  'current_stock',
  'min_stock',
  'max_stock',
  'reorder_point',
  'stock_unit',
  'created_at',
]);

const EXTRA_SETTING_FIELDS = new Set([
  'logo_url',
  'ranking_title',
  'prize_description',
  'ranking_end_date',
  'winner_photo_url',
  'prize_1',
  'prize_2',
  'prize_3',
  'event_active',
]);

const CUSTOMER_FIELDS = new Set([
  'phone',
  'name',
  'avatar_url',
  'lat',
  'lng',
  'reference',
  'delivery_addresses',
  'selected_delivery_address_id',
  'phone_verified',
  'risk_level',
  'blocked',
  'membership_status',
  'membership_plan',
  'membership_started_at',
  'membership_expires_at',
  'membership_updated_at',
  'is_vip',
]);

const ORDER_STATUSES = new Set([
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
]);

const PAYMENT_STATUSES = new Set([
  'pendiente',
  'validando',
  'confirmado',
  'rechazado',
  'contra_entrega',
]);

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

const cleanText = (value: unknown, max = 240) => {
  return String(value || '').trim().slice(0, max);
};

const cleanPhone = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('593') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `593${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('9')) return `593${digits}`;
  return '';
};

const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const objectValue = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const pick = (source: Record<string, unknown>, allowed: Set<string>) => {
  const result: Record<string, unknown> = {};

  Object.entries(source).forEach(([key, value]) => {
    if (allowed.has(key)) result[key] = value;
  });

  return result;
};

const getServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const ensureAdmin = (panel: PanelType, action: string) => {
  if (ADMIN_ONLY_ACTIONS.has(action) && panel !== 'admin') {
    throw new Error('Admin authorization required');
  }
};

const updateSetting = async (
  supabase: SupabaseClient,
  payload: Record<string, unknown>
) => {
  const key = cleanText(payload.key, 80);
  const value = cleanText(payload.value, 1000);

  if (!['announcement', 'primary_color', 'banner_link', 'prize_1', 'prize_2', 'prize_3'].includes(key)) {
    throw new Error('Invalid setting key');
  }

  const result = await supabase.from('app_settings').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });

  if (result.error) throw result.error;
  return { key, value };
};

const updateExtraSettings = async (
  supabase: SupabaseClient,
  payload: Record<string, unknown>
) => {
  const patch = pick(objectValue(payload.patch), EXTRA_SETTING_FIELDS);
  const now = new Date().toISOString();

  const current = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'global')
    .maybeSingle();

  if (current.error) throw current.error;

  const next = {
    ...(current.data || {}),
    ...patch,
    id: 'global',
    updated_at: now,
  };

  const save = await supabase.from('settings').upsert(next);
  if (save.error) throw save.error;

  for (const key of ['prize_1', 'prize_2', 'prize_3']) {
    if (!(key in patch)) continue;
    const prize = await supabase.from('app_settings').upsert({
      key,
      value: cleanText(patch[key], 500),
      updated_at: now,
    });
    if (prize.error) throw prize.error;
  }

  return next;
};

const runAction = async (
  supabase: SupabaseClient,
  panel: PanelType,
  action: string,
  payload: Record<string, unknown>
): Promise<unknown> => {
  ensureAdmin(panel, action);
  const now = new Date().toISOString();

  switch (action) {
    case 'update_setting':
      return updateSetting(supabase, payload);

    case 'update_extra_settings':
      return updateExtraSettings(supabase, payload);

    case 'finalize_season': {
      const winners = Array.isArray(payload.winners) ? payload.winners.slice(0, 20) : [];
      const result = await supabase
        .from('seasons')
        .insert({
          name: cleanText(payload.name, 140),
          prize: cleanText(payload.prize, 300),
          winners,
          is_published: false,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (result.error) throw result.error;
      return result.data;
    }

    case 'delete_season': {
      const id = cleanText(payload.id, 100);
      const result = await supabase.from('seasons').delete().eq('id', id);
      if (result.error) throw result.error;
      return { id };
    }

    case 'toggle_season': {
      const id = cleanText(payload.id, 100);
      const result = await supabase
        .from('seasons')
        .update({ is_published: payload.published === true, updated_at: now })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    }

    case 'update_season_winners': {
      const id = cleanText(payload.id, 100);
      const winners = Array.isArray(payload.winners) ? payload.winners.slice(0, 20) : [];
      const result = await supabase
        .from('seasons')
        .update({ winners, updated_at: now })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    }

    case 'set_product_override': {
      const id = cleanText(payload.id, 160);
      if (!id) throw new Error('Missing product id');
      const result = await supabase
        .from('product_overrides')
        .upsert({
          id,
          price: payload.price === null ? null : cleanText(payload.price, 60),
          available: payload.available !== false,
          updated_at: now,
        })
        .select('*')
        .single();
      if (result.error) throw result.error;
      return result.data;
    }

    case 'upsert_product': {
      const product = pick(objectValue(payload.product), PRODUCT_FIELDS);
      const id = cleanText(product.id, 160);
      const name = cleanText(product.name, 180);
      if (!id || !name) throw new Error('Invalid product');

      product.id = id;
      product.name = name;
      product.updated_at = now;
      product.available = product.available !== false;
      product.current_stock = finiteNumber(product.current_stock, 0);
      product.min_stock = finiteNumber(product.min_stock, 0);
      product.max_stock = finiteNumber(product.max_stock, 0);
      product.reorder_point = finiteNumber(product.reorder_point, 0);

      const result = await supabase
        .from('products')
        .upsert(product)
        .select('*')
        .single();
      if (result.error) throw result.error;
      return result.data;
    }

    case 'delete_product': {
      const id = cleanText(payload.id, 160);
      const result = await supabase.from('products').delete().eq('id', id);
      if (result.error) throw result.error;
      return { id };
    }

    case 'upsert_customer': {
      const customer = pick(objectValue(payload.customer), CUSTOMER_FIELDS);
      const phone = cleanPhone(customer.phone);
      const id = cleanText(payload.id, 100);

      if (!phone && !id) throw new Error('Invalid customer');
      if (phone) customer.phone = phone;
      customer.updated_at = now;

      const query = id
        ? supabase.from('customers').update(customer).eq('id', id)
        : supabase.from('customers').upsert(customer, { onConflict: 'phone' });
      const result = await query.select('*').maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    }

    case 'add_customer_points': {
      const id = cleanText(payload.id, 100);
      const pointsToAdd = Math.max(0, Math.floor(finiteNumber(payload.points, 0)));
      const current = await supabase
        .from('customers')
        .select('id,points,exp')
        .eq('id', id)
        .single();
      if (current.error) throw current.error;
      const result = await supabase
        .from('customers')
        .update({
          points: Math.max(0, finiteNumber(current.data.points, 0) + pointsToAdd),
          exp: Math.max(0, finiteNumber(current.data.exp, 0) + pointsToAdd),
          updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (result.error) throw result.error;
      return result.data;
    }

    case 'reset_season_points': {
      const result = await supabase
        .from('customers')
        .update({ points: 0, updated_at: now })
        .gte('points', 0);
      if (result.error) throw result.error;
      return { reset: true };
    }

    case 'activate_membership': {
      const membershipId = cleanText(payload.membershipId, 100);
      const membership = await supabase
        .from('customer_memberships')
        .select('*')
        .eq('id', membershipId)
        .single();
      if (membership.error) throw membership.error;

      const startedAt = new Date();
      const expiresAt = new Date(startedAt);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);
      const paymentMethod = ['efectivo', 'deuna'].includes(cleanText(payload.paymentMethod, 30))
        ? cleanText(payload.paymentMethod, 30)
        : cleanText(membership.data.payment_method, 30) || 'efectivo';

      const expireOthers = await supabase
        .from('customer_memberships')
        .update({ status: 'expired', updated_at: now })
        .eq('customer_phone', membership.data.customer_phone)
        .eq('status', 'active')
        .neq('id', membershipId);
      if (expireOthers.error) throw expireOthers.error;

      const updateMembership = await supabase
        .from('customer_memberships')
        .update({
          status: 'active',
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_method: paymentMethod,
          payment_status: 'confirmado',
          updated_at: now,
        })
        .eq('id', membershipId)
        .select('*')
        .single();
      if (updateMembership.error) throw updateMembership.error;

      const payment = await supabase
        .from('membership_payments')
        .update({
          payment_status: 'confirmado',
          payment_method: paymentMethod,
          period_start: startedAt.toISOString(),
          period_end: expiresAt.toISOString(),
          confirmed_at: now,
          confirmed_by: 'admin',
          updated_at: now,
        })
        .eq('membership_id', membershipId);
      if (payment.error) throw payment.error;

      const phone = cleanPhone(membership.data.customer_phone);
      if (phone) {
        const customer = await supabase.from('customers').upsert(
          {
            phone,
            name: membership.data.customer_name || null,
            is_vip: true,
            membership_status: 'active',
            membership_plan: membership.data.plan_name || 'Pollazo Plus',
            membership_started_at: startedAt.toISOString(),
            membership_expires_at: expiresAt.toISOString(),
            membership_updated_at: now,
            updated_at: now,
          },
          { onConflict: 'phone' }
        );
        if (customer.error) throw customer.error;
      }

      return updateMembership.data;
    }

    case 'cancel_membership':
    case 'expire_membership': {
      const membershipId = cleanText(payload.membershipId, 100);
      const status = action === 'cancel_membership' ? 'cancelled' : 'expired';
      const membership = await supabase
        .from('customer_memberships')
        .select('*')
        .eq('id', membershipId)
        .single();
      if (membership.error) throw membership.error;

      const update = await supabase
        .from('customer_memberships')
        .update({
          status,
          notes:
            action === 'cancel_membership'
              ? cleanText(payload.notes, 500) || membership.data.notes || null
              : membership.data.notes || null,
          updated_at: now,
        })
        .eq('id', membershipId)
        .select('*')
        .single();
      if (update.error) throw update.error;

      const phone = cleanPhone(membership.data.customer_phone);
      if (phone) {
        const customer = await supabase
          .from('customers')
          .update({
            membership_status: status,
            membership_plan: membership.data.plan_name || null,
            membership_updated_at: now,
            is_vip: false,
            updated_at: now,
          })
          .eq('phone', phone);
        if (customer.error) throw customer.error;
      }

      return update.data;
    }

    case 'transition_order': {
      const orderId = cleanText(payload.orderId, 100);
      const nextStatus = cleanText(payload.status, 40);

      if (!ORDER_STATUSES.has(nextStatus)) throw new Error('Invalid order status');
      if (
        panel === 'delivery' &&
        !['Enviado', 'Entregado'].includes(nextStatus)
      ) {
        throw new Error('Delivery role cannot perform this transition');
      }

      const transition = await supabase.rpc('transition_online_order_v2', {
        p_order_id: orderId,
        p_next_status: nextStatus,
        p_actor: panel,
      });
      if (transition.error) throw transition.error;

      const order = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (order.error) throw order.error;

      return { transition: transition.data, order: order.data };
    }

    case 'confirm_order_payment': {
      const orderId = cleanText(payload.orderId, 100);
      const status = cleanText(payload.paymentStatus, 40);
      if (!PAYMENT_STATUSES.has(status)) throw new Error('Invalid payment status');

      const update = await supabase
        .from('orders')
        .update({ payment_status: status, updated_at: now })
        .eq('id', orderId)
        .select('*')
        .single();
      if (update.error) throw update.error;
      return update.data;
    }

    case 'add_vip_gift': {
      const orderId = cleanText(payload.orderId, 100);
      const gift = objectValue(payload.gift);
      const itemName = cleanText(gift.item_name, 180);
      const quantity = Math.max(1, Math.floor(finiteNumber(gift.quantity, 1)));
      if (!itemName) throw new Error('Missing gift item');

      const order = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (order.error) throw order.error;

      const giftPayload = {
        order_id: order.data.id,
        order_code: order.data.order_code,
        customer_phone: order.data.customer_phone,
        item_name: itemName,
        quantity,
        reason: cleanText(gift.reason, 300) || 'Regalo Pollazo Plus',
        message:
          cleanText(gift.message, 500) ||
          `Te agregamos ${quantity} ${itemName} de regalo por ser parte de Pollazo Plus 🎁`,
        added_by_admin: cleanText(gift.added_by_admin, 100) || 'admin',
        created_at: now,
      };

      const inserted = await supabase
        .from('order_bonus_items')
        .insert(giftPayload)
        .select('*')
        .single();
      if (inserted.error) throw inserted.error;

      const existing = Array.isArray(order.data.bonus_items) ? order.data.bonus_items : [];
      const nextBonusItems = [...existing, inserted.data];
      const update = await supabase
        .from('orders')
        .update({
          bonus_items: nextBonusItems,
          vip_gift_message: inserted.data.message,
          updated_at: now,
        })
        .eq('id', orderId)
        .select('*')
        .single();
      if (update.error) throw update.error;

      return { gift: inserted.data, order: update.data };
    }

    default:
      throw new Error('Unsupported panel action');
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = getBody(req);
  const panel = cleanText(body.panel, 30);
  const action = cleanText(body.action, 80);
  const payload = objectValue(body.payload);

  if (!isPanelType(panel) || !action) {
    return res.status(400).json({ ok: false, error: 'Invalid panel action' });
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

  try {
    const data = await runAction(supabase, panel, action, payload);
    return res.status(200).json({ ok: true, action, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Panel action failed';
    console.error(`Panel action ${action} failed:`, error);

    const status = message.includes('authorization') ? 403 : 400;
    return res.status(status).json({ ok: false, error: message });
  }
}
