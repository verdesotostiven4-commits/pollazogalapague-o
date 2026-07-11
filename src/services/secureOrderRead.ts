type JsonObject = Record<string, unknown>;

type QueryResult = {
  data: unknown;
  error: unknown;
  count: number | null;
  status: number;
  statusText: string;
};

type ApiPayload = {
  ok?: boolean;
  orders?: unknown;
  error?: string;
};

const makeError = (message: string, code: string) => ({
  name: 'PostgrestError',
  code,
  message,
  details: '',
  hint: '',
});

const currentPanelRoute = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.location.pathname === '/admin' ||
    window.location.pathname === '/repartidor'
  );
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

export function createSecureOrderReadBuilder() {
  let requestedLimit = 60;
  let orderCode = '';
  let orderId = '';

  const execute = async (mode: 'many' | 'maybeSingle' | 'single'): Promise<QueryResult> => {
    const isPanel = currentPanelRoute();
    const endpoint = isPanel ? '/api/admin-orders' : '/api/customer-orders';
    const params = new URLSearchParams({
      limit: String(Math.min(isPanel ? 250 : 60, Math.max(1, requestedLimit))),
    });

    if (orderCode) params.set('orderCode', orderCode);
    if (orderId && isPanel) params.set('orderId', orderId);

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;

      if (!response.ok || payload.ok !== true) {
        if (!isPanel && response.status === 401) {
          return {
            data: mode === 'many' ? [] : null,
            error: null,
            count: 0,
            status: 200,
            statusText: 'OK',
          };
        }

        return {
          data: mode === 'many' ? [] : null,
          error: makeError(
            payload.error || 'No se pudieron cargar los pedidos.',
            `POLLAZO_ORDER_READ_${response.status}`
          ),
          count: null,
          status: response.status,
          statusText: response.statusText,
        };
      }

      const orders = Array.isArray(payload.orders) ? payload.orders : [];

      if (mode === 'many') {
        return {
          data: orders,
          error: null,
          count: orders.length,
          status: response.status || 200,
          statusText: response.statusText || 'OK',
        };
      }

      if (mode === 'single' && orders.length !== 1) {
        return {
          data: null,
          error: makeError(
            orders.length === 0
              ? 'Pedido no encontrado.'
              : 'La consulta devolvió más de un pedido.',
            orders.length === 0 ? 'PGRST116' : 'PGRST123'
          ),
          count: orders.length,
          status: orders.length === 0 ? 406 : 409,
          statusText: orders.length === 0 ? 'Not Acceptable' : 'Conflict',
        };
      }

      return {
        data: orders[0] || null,
        error: null,
        count: orders.length,
        status: response.status || 200,
        statusText: response.statusText || 'OK',
      };
    } catch (error) {
      return {
        data: mode === 'many' ? [] : null,
        error: makeError(
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con el servidor seguro.',
          'POLLAZO_ORDER_READ_NETWORK'
        ),
        count: null,
        status: 0,
        statusText: 'Network Error',
      };
    }
  };

  const builder: JsonObject & PromiseLike<QueryResult> = {
    select: () => builder,
    order: () => builder,
    limit: (value: unknown) => {
      const parsed = Number.parseInt(String(value || ''), 10);
      requestedLimit = Number.isFinite(parsed) ? parsed : requestedLimit;
      return builder;
    },
    eq: (column: unknown, value: unknown) => {
      const safeColumn = cleanText(column, 80);

      if (safeColumn === 'order_code') {
        orderCode = cleanText(value, 80);
      }

      if (safeColumn === 'id') {
        orderId = cleanText(value, 64);
      }

      return builder;
    },
    maybeSingle: () => execute('maybeSingle'),
    single: () => execute('single'),
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => execute('many').then(onfulfilled, onrejected),
  };

  return builder;
}
