from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
admin_path = ROOT / 'src/context/AdminContext.tsx'
text = admin_path.read_text(encoding='utf-8')

text = text.replace(
    "import { getOrderCredentials, saveOrderCredential } from '../utils/orderCredentials';",
    "import { getOrderCredentials, saveOrderCredential } from '../utils/orderCredentials';\nimport { runPanelAction } from '../utils/panelApi';",
)


def replace_between(start_marker: str, end_marker: str, replacement: str) -> None:
    global text
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    text = text[:start] + replacement + text[end:]


replace_between(
    '  const upsertCustomer = useCallback',
    '\n  const addCustomerPoints = useCallback',
    r'''  const upsertCustomer = useCallback(
    async (
      phone: string,
      name?: string | null,
      avatar_url?: string | null,
      locationPatch?: CustomerLocationPatch
    ) => {
      if (window.location.pathname !== '/admin') return null;

      const clean = normalizeEcuadorPhone(phone);
      if (!clean) return null;

      const existingCustomer = findBestCustomerByPhone(customers, clean);
      const customer = {
        phone: clean,
        name: name ?? existingCustomer?.name ?? null,
        avatar_url: avatar_url ?? existingCustomer?.avatar_url ?? null,
        lat: locationPatch?.lat ?? existingCustomer?.lat ?? null,
        lng: locationPatch?.lng ?? existingCustomer?.lng ?? null,
        reference: locationPatch?.reference ?? existingCustomer?.reference ?? null,
      };

      const data = await runPanelAction<ExtendedCustomer | null>('upsert_customer', {
        id: existingCustomer?.id || null,
        customer,
      });
      await load();
      return data;
    },
    [customers, load]
  );
''',
)

replace_between(
    '  const addCustomerPoints = useCallback',
    '\n  const resetSeasonPoints = useCallback',
    r'''  const addCustomerPoints = useCallback(
    async (customerId: string, pointsToAdd: number) => {
      await runPanelAction('add_customer_points', {
        id: customerId,
        points: Math.max(0, pointsToAdd),
      });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const resetSeasonPoints = useCallback',
    '\n  const requestMembership = useCallback',
    r'''  const resetSeasonPoints = useCallback(async () => {
    await runPanelAction('reset_season_points');
    await load();
  }, [load]);
''',
)

replace_between(
    '  const requestMembership = useCallback',
    '\n  const activateMembership = useCallback',
    r'''  const requestMembership = useCallback(
    async (input: MembershipRequestInput) => {
      const response = await fetch('/api/request-membership', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        membership?: CustomerMembership;
      };

      if (!response.ok || !result.ok || !result.membership) {
        throw new Error(result.error || 'No se pudo solicitar Pollazo Plus.');
      }

      if (window.location.pathname === '/admin') {
        await load();
      }

      return result.membership;
    },
    [load]
  );
''',
)

replace_between(
    '  const activateMembership = useCallback',
    '\n  const cancelMembership = useCallback',
    r'''  const activateMembership = useCallback(
    async (membershipId: string, paymentMethod?: PaymentMethod | null) => {
      await runPanelAction('activate_membership', { membershipId, paymentMethod });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const cancelMembership = useCallback',
    '\n  const expireMembership = useCallback',
    r'''  const cancelMembership = useCallback(
    async (membershipId: string, notes?: string | null) => {
      if (window.location.pathname !== '/admin') {
        throw new Error('La cancelación debe ser revisada por el administrador.');
      }
      await runPanelAction('cancel_membership', { membershipId, notes });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const expireMembership = useCallback',
    '\n  const createOrder = useCallback',
    r'''  const expireMembership = useCallback(
    async (membershipId: string) => {
      await runPanelAction('expire_membership', { membershipId });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const countOrderForMetricsAndCustomer = useCallback',
    '\n  const updateOrderStatus = useCallback',
    '',
)

replace_between(
    '  const updateOrderStatus = useCallback',
    '\n  const addVipGiftToOrder = useCallback',
    r'''  const updateOrderStatus = useCallback(
    async (orderId: string, status: ExtendedOrder['status']) => {
      const currentOrder = orders.find(order => order.id === orderId);
      const result = await runPanelAction<{ order: ExtendedOrder }>('transition_order', {
        orderId,
        status,
      });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );

        if (currentOrder) {
          void sendOrderPushNotification(
            result.order,
            result.order.status,
            result.order.payment_status || currentOrder.payment_status || 'pendiente'
          );
        }
      }

      await load();
    },
    [load, orders]
  );
''',
)

replace_between(
    '  const addVipGiftToOrder = useCallback',
    '\n  return (',
    r'''  const addVipGiftToOrder = useCallback(
    async (orderId: string, gift: VipGiftInput) => {
      const result = await runPanelAction<{
        gift: OrderBonusItem;
        order: ExtendedOrder;
      }>('add_vip_gift', { orderId, gift });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );
      }

      const currentOrder = orders.find(order => order.id === orderId);
      if (currentOrder && result.gift) {
        void sendVipGiftPushNotification(currentOrder, {
          ...gift,
          item_name: result.gift.item_name,
          quantity: result.gift.quantity,
          message: result.gift.message || gift.message,
        });
      }

      await load();
    },
    [load, orders]
  );
''',
)

admin_path.write_text(text, encoding='utf-8')

app_path = ROOT / 'src/App.tsx'
app = app_path.read_text(encoding='utf-8')
app = app.replace(
    "  const { createOrder, upsertCustomer, orders, products, loading, refreshData } = useAdmin();",
    "  const { createOrder, orders, products, loading, refreshData } = useAdmin();",
)
legacy_profile_write = """
    void (async () => {
      try {
        await upsertCustomer(u.whatsapp, u.name, u.avatarUrl, {
          lat: u.lat,
          lng: u.lng,
          reference: u.reference || null,
        });
      } catch (error) {
        console.error('Error perfil:', error);
      }
    })();
"""
app = app.replace(legacy_profile_write, '\n')
app_path.write_text(app, encoding='utf-8')
