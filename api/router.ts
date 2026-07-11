import handler0 from '../server/api-handlers/admin-operations.js';
import handler1 from '../server/api-handlers/check-memberships.js';
import handler2 from '../server/api-handlers/create-order.js';
import handler3 from '../server/api-handlers/customer-orders.js';
import handler4 from '../server/api-handlers/customer-session.js';
import handler5 from '../server/api-handlers/logout-panel-session.js';
import handler6 from '../server/api-handlers/metrics.js';
import handler7 from '../server/api-handlers/panel-action.js';
import handler8 from '../server/api-handlers/panel-data.js';
import handler9 from '../server/api-handlers/public-data.js';
import handler10 from '../server/api-handlers/register-push.js';
import handler11 from '../server/api-handlers/request-membership.js';
import handler12 from '../server/api-handlers/send-push.js';
import handler13 from '../server/api-handlers/testimonials.js';
import handler14 from '../server/api-handlers/verify-panel-pin.js';
import handler15 from '../server/api-handlers/verify-panel-session.js';

type ApiRequest = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
};

type ApiHandler = (req: any, res: any) => unknown | Promise<unknown>;

const handlers: Record<string, ApiHandler> = {
  'admin-operations': handler0,
  'check-memberships': handler1,
  'create-order': handler2,
  'customer-orders': handler3,
  'customer-session': handler4,
  'logout-panel-session': handler5,
  'metrics': handler6,
  'panel-action': handler7,
  'panel-data': handler8,
  'public-data': handler9,
  'register-push': handler10,
  'request-membership': handler11,
  'send-push': handler12,
  'testimonials': handler13,
  'verify-panel-pin': handler14,
  'verify-panel-session': handler15,
};

const resolveRoute = (req: ApiRequest): string => {
  const rawRoute = req.query?.route;
  const fromQuery = Array.isArray(rawRoute)
    ? rawRoute.join('/')
    : String(rawRoute || '');

  if (fromQuery) {
    return fromQuery.replace(/^\/+|\/+$/g, '');
  }

  try {
    const pathname = new URL(req.url || '/', 'https://pollazo.local').pathname;
    return pathname.replace(/^\/api\//, '').replace(/^\/+|\/+$/g, '');
  } catch {
    return '';
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const route = resolveRoute(req);
  const selected = handlers[route];

  if (!selected) {
    return res.status(404).json({
      ok: false,
      error: 'API route not found',
    });
  }

  return selected(req, res);
}
