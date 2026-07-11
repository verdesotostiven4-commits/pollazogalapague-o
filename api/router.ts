type ApiRequest = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
};

type ApiHandler = (req: any, res: any) => unknown | Promise<unknown>;
type HandlerModule = { default: ApiHandler };
type HandlerLoader = () => Promise<HandlerModule>;

const handlers: Record<string, HandlerLoader> = {
  'admin-operations': () => import('../server/api-handlers/admin-operations.js'),
  'check-memberships': () => import('../server/api-handlers/check-memberships.js'),
  'create-order': () => import('../server/api-handlers/create-order-v2.js'),
  'customer-orders': () => import('../server/api-handlers/customer-orders.js'),
  'customer-session': () => import('../server/api-handlers/customer-session.js'),
  'logout-panel-session': () => import('../server/api-handlers/logout-panel-session.js'),
  'metrics': () => import('../server/api-handlers/metrics.js'),
  'order-lifecycle': () => import('../server/api-handlers/order-lifecycle.js'),
  'panel-action': () => import('../server/api-handlers/panel-action.js'),
  'panel-data': () => import('../server/api-handlers/panel-data.js'),
  'public-data': () => import('../server/api-handlers/public-data.js'),
  'register-push': () => import('../server/api-handlers/register-push.js'),
  'request-membership': () => import('../server/api-handlers/request-membership.js'),
  'send-push': () => import('../server/api-handlers/send-push.js'),
  'testimonials': () => import('../server/api-handlers/testimonials.js'),
  'verify-panel-pin': () => import('../server/api-handlers/verify-panel-pin.js'),
  'verify-panel-session': () => import('../server/api-handlers/verify-panel-session.js'),
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
  const loadHandler = handlers[route];

  if (!loadHandler) {
    return res.status(404).json({
      ok: false,
      error: 'API route not found',
    });
  }

  try {
    const module = await loadHandler();
    return await module.default(req, res);
  } catch (error) {
    console.error('API route runtime failure:', {
      route,
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      ok: false,
      error: 'API route failed to start',
      route,
    });
  }
}
