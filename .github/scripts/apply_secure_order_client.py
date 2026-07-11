from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

admin_path = ROOT / 'src/context/AdminContext.tsx'
admin = admin_path.read_text(encoding='utf-8')

if "../utils/orderCredentials" not in admin:
    admin = admin.replace(
        "import { products as seedProducts, categories as seedCategories } from '../data/products';\n",
        "import { products as seedProducts, categories as seedCategories } from '../data/products';\nimport { saveOrderCredential } from '../utils/orderCredentials';\n",
    )

admin = admin.replace(
    "  createOrder: (order: CreateOrderInput) => Promise<void>;",
    "  createOrder: (order: CreateOrderInput) => Promise<ExtendedOrder | null>;",
)

start_marker = '  const createOrder = useCallback('
end_marker = '\n  const countOrderForMetricsAndCustomer'
start = admin.index(start_marker)
end = admin.index(end_marker, start)

new_create_order = '''  const createOrder = useCallback(
    async (order: CreateOrderInput): Promise<ExtendedOrder | null> => {
      const idempotencyKey = String(order.order_code || '').trim();

      if (!idempotencyKey) {
        throw new Error('No se pudo generar la clave segura del pedido.');
      }

      const customerPhone = normalizeEcuadorPhone(order.customer_phone);
      const customer = findBestCustomerByPhone(customers, customerPhone);
      const items = Array.isArray(order.items) ? order.items : [];

      const response = await fetch('/api/create-order', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotencyKey,
          customerPhone,
          customerName: customer?.name || null,
          items: items.map(item => ({
            productId:
              item.product_id ||
              item.product?.id ||
              item.cart_item_id ||
              item.id ||
              '',
            quantity: Number(item.quantity || 1),
            customPrice:
              typeof item.custom_price === 'number'
                ? item.custom_price
                : typeof item.product?.custom_price === 'number'
                  ? item.product.custom_price
                  : null,
          })),
          paymentMethod: order.payment_method,
          deliveryType: order.delivery_type || 'domicilio',
          lat: typeof order.lat === 'number' ? order.lat : Number(order.lat),
          lng: typeof order.lng === 'number' ? order.lng : Number(order.lng),
          reference: order.reference || null,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        order?: ExtendedOrder;
        trackingToken?: string;
        minimumOrder?: number;
        storeClosed?: boolean;
      };

      if (!response.ok || !result.ok || !result.order) {
        const error = new Error(result.error || 'No se pudo registrar el pedido de forma segura.');
        Object.assign(error, {
          status: response.status,
          minimumOrder: result.minimumOrder,
          storeClosed: result.storeClosed,
        });
        throw error;
      }

      if (result.trackingToken) {
        saveOrderCredential(result.order.order_code, result.trackingToken);
      }

      setOrders(prev => {
        const withoutDuplicate = prev.filter(item => item.id !== result.order?.id);
        return result.order ? [result.order, ...withoutDuplicate] : withoutDuplicate;
      });

      return result.order;
    },
    [customers]
  );
'''

admin = admin[:start] + new_create_order + admin[end:]
admin_path.write_text(admin, encoding='utf-8')

app_path = ROOT / 'src/App.tsx'
app = app_path.read_text(encoding='utf-8')

old_first = "        await createOrder(buildOrderPayload(code, 'Por Confirmar'));"
new_first = "        const createdOrder = await createOrder(buildOrderPayload(code, 'Por Confirmar'));\n        const officialCode = createdOrder?.order_code || code;\n        setActiveOrderCode(officialCode);\n        return officialCode;"
if old_first in app:
    app = app.replace(old_first, new_first, 1)

app = app.replace(
    "    return code;\n  };\n\n  const handleEarlySave",
    "    return activeOrderCode || code;\n  };\n\n  const handleEarlySave",
    1,
)

old_second = "      await createOrder(buildOrderPayload(code, 'Por Confirmar'));"
new_second = "      const createdOrder = await createOrder(buildOrderPayload(code, 'Por Confirmar'));\n      setActiveOrderCode(createdOrder?.order_code || code);"
if old_second in app:
    app = app.replace(old_second, new_second, 1)

app_path.write_text(app, encoding='utf-8')
