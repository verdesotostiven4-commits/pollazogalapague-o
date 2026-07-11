from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'src/context/AdminContext.tsx'
text = path.read_text(encoding='utf-8')

text = text.replace(
    "import { saveOrderCredential } from '../utils/orderCredentials';",
    "import { getOrderCredentials, saveOrderCredential } from '../utils/orderCredentials';",
)

start = text.index('  const load = useCallback(async () => {')
end = text.index('\n  const updateSetting = useCallback', start)

replacement = r'''  const load = useCallback(async () => {
    setLoading(true);

    try {
      const path = window.location.pathname;
      const panel = path === '/admin' ? 'admin' : path === '/repartidor' ? 'delivery' : null;
      const dataResponse = await fetch(
        panel ? `/api/panel-data?panel=${encodeURIComponent(panel)}` : '/api/public-data',
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        }
      );

      const data = (await dataResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        products?: Product[];
        overrides?: ProductOverride[];
        appSettings?: Array<{ key: string; value: string }>;
        settings?: Partial<ExtraSettings> | null;
        seasons?: Season[];
        customers?: ExtendedCustomer[];
        orders?: ExtendedOrder[];
        memberships?: CustomerMembership[];
        membershipPayments?: MembershipPayment[];
        orderBonusItems?: OrderBonusItem[];
      };

      if (!dataResponse.ok || !data.ok) {
        throw new Error(data.error || 'No se pudieron cargar los datos de la aplicación.');
      }

      setRemoteProducts(Array.isArray(data.products) ? data.products : []);

      const overrideMap: Record<string, ProductOverride> = {};
      (Array.isArray(data.overrides) ? data.overrides : []).forEach(row => {
        if (!row?.id) return;
        overrideMap[row.id] = {
          id: row.id,
          price: row.price ?? null,
          available: row.available !== false,
        };
      });
      setOverrides(overrideMap);

      const nextSettings: AppSettings = { ...DEFAULT_SETTINGS };
      const prizeSettings: Partial<ExtraSettings> = {};

      (Array.isArray(data.appSettings) ? data.appSettings : []).forEach(setting => {
        if (!setting?.key) return;

        if (setting.key in nextSettings) {
          nextSettings[setting.key as keyof AppSettings] = setting.value;
        }

        if (
          setting.key === 'prize_1' ||
          setting.key === 'prize_2' ||
          setting.key === 'prize_3'
        ) {
          prizeSettings[setting.key] = setting.value;
        }
      });

      setSettings(nextSettings);
      document.documentElement.style.setProperty(
        '--pollazo-primary',
        nextSettings.primary_color
      );
      setExtraSettings({
        ...DEFAULT_EXTRA,
        ...(data.settings || {}),
        ...prizeSettings,
      });
      setSeasons(Array.isArray(data.seasons) ? data.seasons : []);

      if (panel) {
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setMemberships(Array.isArray(data.memberships) ? data.memberships : []);
        setMembershipPayments(
          Array.isArray(data.membershipPayments) ? data.membershipPayments : []
        );
        setOrderBonusItems(
          Array.isArray(data.orderBonusItems) ? data.orderBonusItems : []
        );
      } else {
        setCustomers([]);
        setMemberships([]);
        setMembershipPayments([]);
        setOrderBonusItems([]);

        const credentials = getOrderCredentials();
        const ordersResponse = await fetch('/api/customer-orders', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credentials }),
        });
        const ordersPayload = (await ordersResponse.json().catch(() => ({}))) as {
          ok?: boolean;
          orders?: ExtendedOrder[];
        };

        setOrders(
          ordersResponse.ok && ordersPayload.ok && Array.isArray(ordersPayload.orders)
            ? ordersPayload.orders
            : []
        );
      }
    } catch (error) {
      console.error('❌ Error cargando datos protegidos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const panel =
      window.location.pathname === '/admin'
        ? 'admin'
        : window.location.pathname === '/repartidor'
          ? 'delivery'
          : null;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    const interval = window.setInterval(
      refresh,
      panel === 'delivery' ? 5000 : panel === 'admin' ? 10000 : 60000
    );

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);
'''

text = text[:start] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
