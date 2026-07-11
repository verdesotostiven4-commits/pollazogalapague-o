from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

checkout = ROOT / 'src/components/CheckoutBusinessRulesBridge.tsx'
text = checkout.read_text(encoding='utf-8')
text = text.replace(
    "import { isSupabaseConfigured, supabase } from '../lib/supabase';",
    "import { fetchCustomerOrders } from '../utils/customerOrdersApi';",
)
old = """  if (!isSupabaseConfigured || Date.now() - state.lastLookup < 12000) return;
  state.lastLookup = Date.now();

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('customer_phone,status')
      .limit(300);

    if (error || !Array.isArray(data)) return;

    const hasOrder = data.some(row => {
      const samePhone = cleanPhoneTail((row as any).customer_phone) === phoneTail;
      const status = String((row as any).status || '').toLowerCase();
      return samePhone && status !== 'cancelado' && status !== 'cancelled';
    });

    state.hasPreviousOrder = hasOrder;
    if (hasOrder) localStorage.setItem(`${FIRST_ORDER_USED_PREFIX}${phoneTail}`, '1');
  } catch {
    // Si falla Supabase, no bloqueamos la experiencia.
  }
"""
new = """  if (Date.now() - state.lastLookup < 12000) return;
  state.lastLookup = Date.now();

  try {
    const orders = await fetchCustomerOrders();
    const hasOrder = orders.some(order => {
      const status = String(order.status || '').toLowerCase();
      return status !== 'cancelado' && status !== 'cancelled';
    });

    state.hasPreviousOrder = hasOrder;
    if (hasOrder) localStorage.setItem(`${FIRST_ORDER_USED_PREFIX}${phoneTail}`, '1');
  } catch {
    // Si falla la consulta protegida, el servidor validará la promoción al confirmar.
  }
"""
if old in text:
    text = text.replace(old, new)
checkout.write_text(text, encoding='utf-8')

persistent = ROOT / 'src/components/PersistentTrackingCenter.tsx'
text = persistent.read_text(encoding='utf-8')
text = text.replace(
    "import { isSupabaseConfigured, supabase } from '../lib/supabase';",
    "import { fetchCustomerOrders } from '../utils/customerOrdersApi';",
)
old = """  const refreshOrders = useCallback(async () => {
    if (!isSupabaseConfigured || !cleanCustomerPhone) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(60);

      if (error) throw error;

      const mine = (Array.isArray(data) ? data : [])
        .filter(order => cleanPhoneTail(order?.customer_phone) === cleanCustomerPhone)
        .map(order => order as TrackingOrder);

      setOrders(mine);
    } catch (error) {
      console.error('No se pudo cargar el rastreo persistente:', error);
    } finally {
      setLoading(false);
    }
  }, [cleanCustomerPhone]);
"""
new = """  const refreshOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCustomerOrders();
      const mine = data.map(order => order as TrackingOrder);
      setOrders(mine);
    } catch (error) {
      console.error('No se pudo cargar el rastreo protegido:', error);
    } finally {
      setLoading(false);
    }
  }, []);
"""
if old in text:
    text = text.replace(old, new)
persistent.write_text(text, encoding='utf-8')

button = ROOT / 'src/components/TrackingFloatingNoticeButton.tsx'
text = button.read_text(encoding='utf-8')
text = text.replace(
    "import { isSupabaseConfigured, supabase } from '../lib/supabase';",
    "import { fetchCustomerOrders } from '../utils/customerOrdersApi';",
)
old = """  const refreshOrder = useCallback(async () => {
    if (!isSupabaseConfigured || !cleanCustomerPhone) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_code, customer_phone, status, updated_at, created_at')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(40);

      if (error) throw error;

      const mine = (Array.isArray(data) ? data : [])
        .filter(order => cleanPhoneTail(order?.customer_phone) === cleanCustomerPhone)
        .map(order => order as TrackingOrder);

      const active = mine.find(order => ACTIVE_STATUSES.includes(normalizeStatus(order.status))) || null;
      setActiveOrder(active);
    } catch (error) {
      console.error('No se pudo cargar botón de rastreo:', error);
    }
  }, [cleanCustomerPhone]);
"""
new = """  const refreshOrder = useCallback(async () => {
    try {
      const data = await fetchCustomerOrders();
      const mine = data.map(order => order as TrackingOrder);
      const active = mine.find(order => ACTIVE_STATUSES.includes(normalizeStatus(order.status))) || null;
      setActiveOrder(active);
    } catch (error) {
      console.error('No se pudo cargar el botón de rastreo protegido:', error);
    }
  }, []);
"""
if old in text:
    text = text.replace(old, new)
button.write_text(text, encoding='utf-8')
