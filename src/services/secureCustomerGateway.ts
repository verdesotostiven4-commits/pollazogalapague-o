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
  customer?: unknown;
  customers?: unknown;
  error?: string;
  missingEnv?: boolean;
};

type MutationOperation = 'upsert' | 'update' | 'insert';

const isRecord = (value: unknown): value is JsonObject => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

  return window.location.pathname === '/admin';
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const normalizePhone = (value: unknown) => {
  const digits = cleanText(value, 40).replace(/\D/g, '');

  if (digits.startsWith('593') && digits.length >= 11) {
    return digits.slice(0, 15);
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }

  if (digits.startsWith('9') && digits.length === 9) {
    return `593${digits}`;
  }

  return digits.slice(0, 15);
};

const failedResult = (
  status: number,
  statusText: string,
  message: string,
  code: string,
  single: boolean
): QueryResult => ({
  data: single ? null : [],
  error: makeError(message, code),
  count: null,
  status,
  statusText,
});

const requestJson = async (
  url: string,
  init?: RequestInit
): Promise<{ response: Response; payload: ApiPayload }> => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  const payload = (await response.json().catch(() => ({}))) as ApiPayload;

  return { response, payload };
};

export function createSecureCustomerReadBuilder() {
  let requestedLimit = 500;
  let customerId = '';
  let phone = '';

  const execute = async (mode: 'many' | 'maybeSingle' | 'single'): Promise<QueryResult> => {
    const panel = currentPanelRoute();
    const single = mode !== 'many';

    try {
      if (panel) {
        const params = new URLSearchParams({
          limit: String(Math.min(1000, Math.max(1, requestedLimit))),
        });

        if (customerId) params.set('customerId', customerId);
        if (phone) params.set('phone', phone);

        const { response, payload } = await requestJson(
          `/api/admin-customers?${params.toString()}`
        );

        if (!response.ok || payload.ok !== true) {
          return failedResult(
            response.status,
            response.statusText,
            payload.error || 'No se pudieron cargar los clientes.',
            `POLLAZO_CUSTOMER_READ_${response.status}`,
            single
          );
        }

        const customers = Array.isArray(payload.customers)
          ? payload.customers
          : [];

        if (!single) {
          return {
            data: customers,
            error: null,
            count: customers.length,
            status: response.status,
            statusText: response.statusText,
          };
        }

        if (mode === 'single' && customers.length !== 1) {
          return failedResult(
            customers.length === 0 ? 406 : 409,
            customers.length === 0 ? 'Not Acceptable' : 'Conflict',
            customers.length === 0
              ? 'Cliente no encontrado.'
              : 'La consulta devolvió más de un cliente.',
            customers.length === 0 ? 'PGRST116' : 'PGRST123',
            true
          );
        }

        return {
          data: customers[0] || null,
          error: null,
          count: customers.length,
          status: response.status,
          statusText: response.statusText,
        };
      }

      if (phone || customerId) {
        const { response, payload } = await requestJson('/api/customer-profile');

        if (response.status === 401) {
          return {
            data: single ? null : [],
            error: null,
            count: 0,
            status: 200,
            statusText: 'OK',
          };
        }

        if (!response.ok || payload.ok !== true) {
          return failedResult(
            response.status,
            response.statusText,
            payload.error || 'No se pudo cargar el perfil.',
            `POLLAZO_CUSTOMER_PROFILE_${response.status}`,
            single
          );
        }

        const customer = isRecord(payload.customer)
          ? payload.customer
          : null;
        const requestedTail = normalizePhone(phone).slice(-9);
        const returnedTail = normalizePhone(customer?.phone).slice(-9);
        const matchesRequestedPhone =
          !requestedTail || requestedTail === returnedTail;
        const safeCustomer = matchesRequestedPhone ? customer : null;

        return {
          data: single ? safeCustomer : safeCustomer ? [safeCustomer] : [],
          error: null,
          count: safeCustomer ? 1 : 0,
          status: response.status,
          statusText: response.statusText,
        };
      }

      const params = new URLSearchParams({
        limit: String(Math.min(100, Math.max(1, requestedLimit))),
      });
      const { response, payload } = await requestJson(
        `/api/public-leaderboard?${params.toString()}`
      );

      if (!response.ok || payload.ok !== true) {
        return failedResult(
          response.status,
          response.statusText,
          payload.error || 'No se pudo cargar el ranking.',
          `POLLAZO_LEADERBOARD_${response.status}`,
          single
        );
      }

      const customers = Array.isArray(payload.customers)
        ? payload.customers
        : [];

      return {
        data: single ? customers[0] || null : customers,
        error: null,
        count: customers.length,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      return failedResult(
        0,
        'Network Error',
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con el servidor seguro.',
        'POLLAZO_CUSTOMER_READ_NETWORK',
        single
      );
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

      if (safeColumn === 'id') customerId = cleanText(value, 64);
      if (safeColumn === 'phone') phone = normalizePhone(value);

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

export function createSecureCustomerMutationBuilder(
  operation: MutationOperation,
  value: unknown
) {
  const patch = isRecord(value) ? value : {};
  let customerId = cleanText(patch.id, 64);
  let phone = normalizePhone(patch.phone);

  const execute = async (single: boolean): Promise<QueryResult> => {
    const panel = currentPanelRoute();

    try {
      const endpoint = panel ? '/api/admin-customer' : '/api/customer-profile';
      const body = panel
        ? {
            operation: operation === 'insert' ? 'upsert' : operation,
            customerId: customerId || null,
            phone: phone || null,
            patch,
          }
        : patch;
      const { response, payload } = await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!response.ok || payload.ok !== true) {
        return failedResult(
          response.status,
          response.statusText,
          payload.error || 'No se pudo actualizar el cliente.',
          payload.missingEnv
            ? 'POLLAZO_SERVER_NOT_CONFIGURED'
            : `POLLAZO_CUSTOMER_WRITE_${response.status}`,
          single
        );
      }

      const customer = payload.customer ?? null;

      return {
        data: single ? customer : customer ? [customer] : [],
        error: null,
        count: customer ? 1 : 0,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      return failedResult(
        0,
        'Network Error',
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con el servidor seguro.',
        'POLLAZO_CUSTOMER_WRITE_NETWORK',
        single
      );
    }
  };

  const builder: JsonObject & PromiseLike<QueryResult> = {
    select: () => builder,
    eq: (column: unknown, filterValue: unknown) => {
      const safeColumn = cleanText(column, 80);

      if (safeColumn === 'id') customerId = cleanText(filterValue, 64);
      if (safeColumn === 'phone') phone = normalizePhone(filterValue);

      return builder;
    },
    maybeSingle: () => execute(true),
    single: () => execute(true),
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => execute(false).then(onfulfilled, onrejected),
  };

  return builder;
}

export function createRejectedCustomerDeleteBuilder() {
  const result: QueryResult = {
    data: null,
    error: makeError(
      'La eliminación directa de clientes está deshabilitada para proteger el historial.',
      'POLLAZO_CUSTOMER_DELETE_DISABLED'
    ),
    count: null,
    status: 403,
    statusText: 'Forbidden',
  };

  const builder: JsonObject & PromiseLike<QueryResult> = {
    eq: () => builder,
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };

  return builder;
}
