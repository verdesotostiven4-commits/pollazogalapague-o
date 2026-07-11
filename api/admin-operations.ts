import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getPanelSessionSecret,
  readPanelSessionToken,
  verifyPanelSessionToken,
} from '../server/panel-session';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => void };
  setHeader: (name: string, value: string | string[]) => void;
};

type Body = {
  action?: string;
  payload?: Record<string, unknown>;
};

const MAX_ITEMS = 100;
const MAX_REPORT_DAYS = 93;

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

const recordValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown, max = 300) =>
  String(value || '').trim().slice(0, max);

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nonNegativeMoney = (value: unknown) =>
  Number(Math.max(0, numberValue(value, 0)).toFixed(2));

const positiveQuantity = (value: unknown) => {
  const parsed = numberValue(value, 0);
  return parsed > 0 && parsed <= 1000 ? Number(parsed.toFixed(3)) : 0;
};

const serverClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const parseDateRange = (payload: Record<string, unknown>) => {
  const start = new Date(text(payload.startDate, 60));
  const end = new Date(text(payload.endDate, 60));

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error('Rango de fechas inválido.');
  }
  if (end <= start) throw new Error('La fecha final debe ser posterior a la inicial.');
  if (end.getTime() - start.getTime() > MAX_REPORT_DAYS * 24 * 60 * 60 * 1000) {
    throw new Error('El reporte no puede superar 93 días.');
  }

  return { start: start.toISOString(), end: end.toISOString() };
};

const loadRegister = async (supabase: SupabaseClient, id: string) => {
  const result = await supabase
    .from('cash_registers')
    .select('id,opening_balance,expected_cash_sales,manual_income,manual_expense,status,opened_at,closed_at')
    .eq('id', id)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data || null;
};

const run = async (
  supabase: SupabaseClient,
  action: string,
  payload: Record<string, unknown>
): Promise<unknown> => {
  switch (action) {
    case 'inventory_load': {
      const products = await supabase.from('products').select('*').order('name', { ascending: true });
      if (products.error) throw products.error;
      return { products: products.data || [] };
    }

    case 'inventory_movements': {
      const productId = text(payload.productId, 160);
      const limit = Math.min(100, Math.max(1, Math.floor(numberValue(payload.limit, 12))));
      if (!productId) throw new Error('Producto inválido.');
      const result = await supabase.rpc('get_product_stock_movements_v1', {
        p_product_id: productId,
        p_limit: limit,
      });
      if (result.error) throw result.error;
      return { movements: result.data || [] };
    }

    case 'inventory_settings': {
      const productId = text(payload.productId, 160);
      if (!productId) throw new Error('Producto inválido.');
      const result = await supabase
        .from('products')
        .update({
          barcode: text(payload.barcode, 120) || null,
          cost_price: nonNegativeMoney(payload.costPrice),
          stock_minimum: Math.max(0, numberValue(payload.stockMinimum, 0)),
          track_stock: payload.trackStock === true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select('*')
        .single();
      if (result.error) throw result.error;
      return { product: result.data };
    }

    case 'inventory_adjust': {
      const productId = text(payload.productId, 160);
      const delta = numberValue(payload.delta, 0);
      if (!productId || delta === 0 || Math.abs(delta) > 100000) {
        throw new Error('Ajuste de inventario inválido.');
      }
      const result = await supabase.rpc('adjust_product_stock_v1', {
        p_product_id: productId,
        p_delta: delta,
        p_description: text(payload.description, 500) || null,
        p_created_by: 'admin',
      });
      if (result.error) throw result.error;
      return { stock: result.data };
    }

    case 'pos_load': {
      const operator = text(payload.operator, 100) || 'admin';
      const [products, register] = await Promise.all([
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase
          .from('cash_registers')
          .select('id,opening_balance,expected_cash_sales,manual_income,manual_expense,status,opened_at')
          .eq('opened_by', operator)
          .eq('status', 'open')
          .maybeSingle(),
      ]);
      if (products.error) throw products.error;
      if (register.error) throw register.error;
      return { products: products.data || [], register: register.data || null };
    }

    case 'pos_register': {
      const registerId = text(payload.registerId, 100);
      if (!registerId) throw new Error('Caja inválida.');
      return { register: await loadRegister(supabase, registerId) };
    }

    case 'pos_open_register': {
      const openingBalance = nonNegativeMoney(payload.openingBalance);
      const operator = text(payload.operator, 100) || 'admin';
      const result = await supabase.rpc('open_cash_register_v1', {
        p_opening_balance: openingBalance,
        p_opened_by: operator,
        p_notes: text(payload.notes, 500) || null,
      });
      if (result.error) throw result.error;
      const id = String(result.data || '');
      return { register: id ? await loadRegister(supabase, id) : null };
    }

    case 'pos_close_register': {
      const registerId = text(payload.registerId, 100);
      if (!registerId) throw new Error('Caja inválida.');
      const result = await supabase.rpc('close_cash_register_v1', {
        p_cash_register_id: registerId,
        p_real_balance_cash: nonNegativeMoney(payload.realCash),
        p_notes: text(payload.notes, 800) || null,
      });
      if (result.error) throw result.error;
      return { registerId: result.data };
    }

    case 'pos_create_sale': {
      const registerId = text(payload.registerId, 100);
      const rawItems = Array.isArray(payload.items) ? payload.items.slice(0, MAX_ITEMS) : [];
      const rawPayments = Array.isArray(payload.payments) ? payload.payments.slice(0, 8) : [];
      if (!registerId || rawItems.length === 0 || rawPayments.length === 0) {
        throw new Error('Venta POS incompleta.');
      }

      const itemInputs = rawItems.map(raw => {
        const item = recordValue(raw);
        return {
          productId: text(item.product_id ?? item.productId, 160),
          quantity: positiveQuantity(item.quantity),
          requestedPrice: nonNegativeMoney(item.unit_price ?? item.unitPrice),
        };
      });
      if (itemInputs.some(item => !item.productId || item.quantity <= 0)) {
        throw new Error('Productos POS inválidos.');
      }

      const productIds = Array.from(new Set(itemInputs.map(item => item.productId)));
      const productsResult = await supabase
        .from('products')
        .select('id,name,price,available,is_variable,track_stock,current_stock')
        .in('id', productIds);
      if (productsResult.error) throw productsResult.error;
      const products = new Map(
        (productsResult.data || []).map(product => [String(product.id), product])
      );

      const items = itemInputs.map(item => {
        const product = products.get(item.productId);
        if (!product) throw new Error(`Producto no encontrado: ${item.productId}`);
        if (product.available === false) throw new Error(`Producto no disponible: ${product.name}`);
        const officialPrice = nonNegativeMoney(product.price);
        const unitPrice = product.is_variable === true ? item.requestedPrice : officialPrice;
        if (unitPrice <= 0 || unitPrice > 5000) {
          throw new Error(`Precio inválido para ${product.name}`);
        }
        return {
          product_id: product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
          product_name: product.name,
        };
      });

      const allowedMethods = new Set(['cash', 'deuna', 'transfer', 'card', 'mixed', 'other']);
      const payments = rawPayments.map(raw => {
        const payment = recordValue(raw);
        const method = text(payment.method, 30);
        const amount = nonNegativeMoney(payment.amount);
        if (!allowedMethods.has(method) || amount <= 0) {
          throw new Error('Pago POS inválido.');
        }
        return {
          method,
          amount,
          reference: text(payment.reference, 200) || null,
        };
      });

      const result = await supabase.rpc('create_pos_sale_v1', {
        p_cash_register_id: registerId,
        p_customer_id: null,
        p_customer_name: text(payload.customerName, 140) || 'Consumidor final',
        p_customer_phone: text(payload.customerPhone, 30) || null,
        p_sold_by: text(payload.operator, 100) || 'admin',
        p_items: items,
        p_payments: payments,
        p_discount_amount: nonNegativeMoney(payload.discountAmount),
        p_notes: text(payload.notes, 800) || null,
      });
      if (result.error) throw result.error;
      return { saleId: result.data, register: await loadRegister(supabase, registerId) };
    }

    case 'pos_report': {
      const range = parseDateRange(payload);
      const result = await supabase.rpc('get_pos_report_v1', {
        p_start_date: range.start,
        p_end_date: range.end,
      });
      if (result.error) throw result.error;
      return { report: result.data || {} };
    }

    case 'pos_void_sale': {
      const saleId = text(payload.saleId, 100);
      const reason = text(payload.reason, 500);
      if (!saleId || !reason) throw new Error('Venta o motivo inválido.');
      const result = await supabase.rpc('void_pos_sale_v1', {
        p_pos_sale_id: saleId,
        p_reason: reason,
        p_voided_by: 'admin',
      });
      if (result.error) throw result.error;
      return { saleId: result.data };
    }

    case 'delete_test_order': {
      const orderId = text(payload.orderId, 100);
      if (!orderId) throw new Error('Pedido inválido.');
      const order = await supabase
        .from('orders')
        .select('id,is_test_order,order_code,status')
        .eq('id', orderId)
        .single();
      if (order.error) throw order.error;
      const isTest = order.data.is_test_order === true || String(order.data.order_code || '').startsWith('TEST-');
      if (!isTest) throw new Error('Solo se pueden borrar pedidos marcados como prueba.');
      if (!['Por Confirmar', 'Cancelado'].includes(String(order.data.status || ''))) {
        throw new Error('El pedido de prueba debe estar sin confirmar o cancelado.');
      }
      const deleted = await supabase.from('orders').delete().eq('id', orderId);
      if (deleted.error) throw deleted.error;
      return { orderId };
    }

    default:
      throw new Error('Operación administrativa no soportada.');
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const secret = getPanelSessionSecret();
  const supabase = serverClient();
  if (!secret || !supabase) {
    return res.status(500).json({ ok: false, error: 'Missing secure admin configuration' });
  }

  const token = readPanelSessionToken(req.headers, 'admin');
  const claims = await verifyPanelSessionToken(token, 'admin', secret);
  if (!claims) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const body = getBody(req);
  const action = text(body.action, 80);
  const payload = recordValue(body.payload);

  try {
    const data = await run(supabase, action, payload);
    return res.status(200).json({ ok: true, action, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin operation failed';
    console.error(`Admin operation ${action} failed:`, error);
    return res.status(400).json({ ok: false, error: message });
  }
}
