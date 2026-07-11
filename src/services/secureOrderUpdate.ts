type JsonObject = Record<string, unknown>;

type SecureUpdateResult = {
  data: unknown;
  error: unknown;
  count: number | null;
  status: number;
  statusText: string;
};

type ApiResponsePayload = {
  ok?: boolean;
  order?: unknown;
  error?: string;
  missingEnv?: boolean;
};

const isRecord = (value: unknown): value is JsonObject => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const asString = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const makeError = (
  message: string,
  code: string,
  details = ''
) => ({
  name: 'PostgrestError',
  code,
  message,
  details,
  hint: '',
});

const failedResult = (
  status: number,
  statusText: string,
  message: string,
  code: string
): SecureUpdateResult => ({
  data: null,
  error: makeError(message, code),
  count: null,
  status,
  statusText,
});

const requestOrderUpdate = async (
  endpoint: string,
  body: JsonObject
): Promise<SecureUpdateResult> => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response
      .json()
      .catch(() => ({}))) as ApiResponsePayload;

    if (!response.ok || payload.ok !== true) {
      return failedResult(
        response.status,
        response.statusText || 'Request failed',
        payload.error || 'No se pudo actualizar el pedido.',
        payload.missingEnv
          ? 'POLLAZO_SERVER_NOT_CONFIGURED'
          : `POLLAZO_ORDER_UPDATE_${response.status}`
      );
    }

    return {
      data: payload.order ?? null,
      error: null,
      count: null,
      status: response.status || 200,
      statusText: response.statusText || 'OK',
    };
  } catch (error) {
    return failedResult(
      0,
      'Network Error',
      error instanceof Error
        ? error.message
        : 'No se pudo conectar con el servidor seguro.',
      'POLLAZO_ORDER_UPDATE_NETWORK'
    );
  }
};

export const isProtectedOrderUpdate = (patch: unknown) => isRecord(patch);

export const createSecureOrderUpdateBuilder = (patch: unknown) => {
  const safePatch = isRecord(patch) ? patch : {};

  return {
    async eq(column: string, value: unknown): Promise<SecureUpdateResult> {
      if (column !== 'id') {
        return failedResult(
          400,
          'Bad Request',
          'La actualización segura requiere filtrar por el ID exacto del pedido.',
          'POLLAZO_ORDER_UPDATE_FILTER'
        );
      }

      const orderId = asString(value);

      if (!orderId) {
        return failedResult(
          400,
          'Bad Request',
          'Falta el ID del pedido.',
          'POLLAZO_ORDER_UPDATE_ID'
        );
      }

      if (Object.prototype.hasOwnProperty.call(safePatch, 'status')) {
        const status = asString(safePatch.status);

        if (!status) {
          return failedResult(
            400,
            'Bad Request',
            'Falta el estado del pedido.',
            'POLLAZO_ORDER_STATUS_MISSING'
          );
        }

        return requestOrderUpdate('/api/admin-order-status', {
          orderId,
          status,
          cancelledReason: asString(safePatch.cancelled_reason) || null,
        });
      }

      if (Object.prototype.hasOwnProperty.call(safePatch, 'payment_status')) {
        const paymentStatus = asString(safePatch.payment_status).toLowerCase();

        if (!paymentStatus) {
          return failedResult(
            400,
            'Bad Request',
            'Falta el estado del pago.',
            'POLLAZO_PAYMENT_STATUS_MISSING'
          );
        }

        return requestOrderUpdate('/api/admin-order-payment', {
          orderId,
          paymentStatus,
        });
      }

      if (
        Object.prototype.hasOwnProperty.call(safePatch, 'bonus_items') ||
        Object.prototype.hasOwnProperty.call(safePatch, 'vip_gift_message')
      ) {
        return requestOrderUpdate('/api/admin-order-metadata', {
          orderId,
          bonusItems: Array.isArray(safePatch.bonus_items)
            ? safePatch.bonus_items
            : [],
          vipGiftMessage: asString(safePatch.vip_gift_message) || null,
        });
      }

      return failedResult(
        403,
        'Forbidden',
        'Esta actualización de pedido no está permitida desde el navegador.',
        'POLLAZO_ORDER_UPDATE_NOT_ALLOWED'
      );
    },
  };
};
