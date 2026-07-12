import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, LoaderCircle, PackageSearch, RefreshCw, Store } from 'lucide-react';
import type { Order, OrderItem } from '../types';

type Source = 'mirador' | 'cascada';
type SourceEvent = {
  id: string;
  order_code: string;
  product_id?: string | null;
  item_name: string;
  planned_source: Source;
  actual_source: Source;
  reason?: string | null;
  created_at: string;
};

const productIdOf = (item: OrderItem) =>
  String(item.product_id || item.product?.id || item.cart_item_id || item.id || '').trim().toLowerCase();
const itemNameOf = (item: OrderItem) => String(item.name || item.product?.name || 'Producto').trim();
const plannedOf = (item: OrderItem): Source => productIdOf(item).startsWith('cascada-') ? 'cascada' : 'mirador';
const keyOf = (orderCode: string, item: OrderItem) =>
  `${orderCode.toUpperCase()}::${productIdOf(item) || itemNameOf(item).toLowerCase()}`;
const labelOf = (source: Source) => source === 'cascada' ? 'La Cascada' : 'El Mirador';

export default function AdminOrderSourceControl() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<SourceEvent[]>([]);
  const [expanded, setExpanded] = useState('');
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState('');

  const activeOrders = useMemo(
    () => orders
      .filter(order => ['Recibido', 'Preparando', 'Enviado'].includes(order.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]
  );

  const latestByItem = useMemo(() => {
    const map = new Map<string, SourceEvent>();
    events.forEach(event => {
      const key = `${event.order_code.toUpperCase()}::${String(event.product_id || '').toLowerCase() || event.item_name.toLowerCase()}`;
      if (!map.has(key)) map.set(key, event);
    });
    return map;
  }, [events]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const panelResponse = await fetch('/api/panel-data?panel=admin', {
        credentials: 'same-origin', cache: 'no-store',
      });
      const panel = await panelResponse.json().catch(() => ({})) as { ok?: boolean; error?: string; orders?: Order[] };
      if (!panelResponse.ok || !panel.ok) throw new Error(panel.error || 'No se pudieron cargar los pedidos.');
      const nextOrders = Array.isArray(panel.orders) ? panel.orders : [];
      setOrders(nextOrders);

      const codes = nextOrders
        .filter(order => ['Recibido', 'Preparando', 'Enviado'].includes(order.status))
        .map(order => order.order_code)
        .filter(Boolean)
        .slice(0, 60);
      if (codes.length === 0) {
        setEvents([]); setSetupRequired(false); setError(''); return;
      }

      const response = await fetch(`/api/order-sources?orderCodes=${encodeURIComponent(codes.join(','))}`, {
        credentials: 'same-origin', cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({})) as {
        ok?: boolean; error?: string; setupRequired?: boolean; events?: SourceEvent[];
      };
      if (payload.setupRequired) {
        setSetupRequired(true); setEvents([]); setError(''); return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo cargar el control de sucursales.');
      setEvents(Array.isArray(payload.events) ? payload.events : []);
      setSetupRequired(false); setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el control de sucursales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const record = async (order: Order, item: OrderItem, actualSource: Source) => {
    const productId = productIdOf(item);
    const itemName = itemNameOf(item);
    const plannedSource = plannedOf(item);
    const key = keyOf(order.order_code, item);
    let reason = '';

    if (plannedSource !== actualSource) {
      const answer = window.prompt(
        actualSource === 'cascada' ? '¿Por qué se buscó en La Cascada?' : '¿Por qué volvió a El Mirador?',
        actualSource === 'cascada' ? 'No disponible en El Mirador' : 'Disponible nuevamente en El Mirador'
      );
      if (answer === null) return;
      reason = answer.trim();
      if (!reason) { setError('Escribe el motivo del cambio.'); return; }
    }

    setSaving(key); setError('');
    try {
      const response = await fetch('/api/order-sources', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_source', orderCode: order.order_code, productId, itemName, plannedSource, actualSource, reason }),
      });
      const payload = await response.json().catch(() => ({})) as {
        ok?: boolean; error?: string; setupRequired?: boolean; event?: SourceEvent;
      };
      if (payload.setupRequired) { setSetupRequired(true); return; }
      if (!response.ok || !payload.ok || !payload.event) throw new Error(payload.error || 'No se pudo guardar la sucursal.');
      setEvents(previous => [payload.event as SourceEvent, ...previous]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la sucursal.');
    } finally {
      setSaving('');
    }
  };

  return (
    <section className="mt-5 rounded-[30px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600"><PackageSearch size={20} /></div>
          <div>
            <h3 className="text-xs font-black uppercase italic">Origen real de productos</h3>
            <p className="mt-1 text-[9px] font-bold text-gray-400">Control interno Mirador / Cascada.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600" aria-label="Actualizar origen">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {(setupRequired || error) && (
        <div className={`mt-4 flex items-start gap-2 rounded-2xl border p-3 ${setupRequired ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-red-100 bg-red-50 text-red-600'}`}>
          <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
          <p className="text-[10px] font-bold leading-relaxed">{setupRequired ? 'Falta activar la tabla de auditoría de sucursales en Supabase.' : error}</p>
        </div>
      )}

      {!loading && !setupRequired && activeOrders.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-gray-200 p-5 text-center text-[10px] font-bold text-gray-400">No hay pedidos activos.</p>
      )}

      {!setupRequired && <div className="mt-4 space-y-2">
        {activeOrders.map(order => {
          const open = expanded === order.order_code;
          return <article key={order.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
            <button type="button" onClick={() => setExpanded(open ? '' : order.order_code)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
              <div><p className="text-[10px] font-black uppercase">{order.order_code}</p><p className="mt-1 text-[8px] font-bold uppercase text-gray-400">{order.status} · {(order.items || []).length} productos</p></div>
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {open && <div className="space-y-2 border-t border-gray-100 bg-white p-3">
              {(order.items || []).map((item, index) => {
                const key = keyOf(order.order_code, item);
                const planned = plannedOf(item);
                const latest = latestByItem.get(key);
                const actual = latest?.actual_source || planned;
                const busy = saving === key;
                return <div key={`${key}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="text-[10px] font-black uppercase">{itemNameOf(item)}</p><p className="mt-1 text-[8px] font-bold uppercase text-gray-400">Previsto: {labelOf(planned)}</p></div>
                    <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${actual === 'cascada' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>Real: {labelOf(actual)}</span>
                  </div>
                  {latest?.reason && <p className="mt-2 rounded-xl bg-white px-3 py-2 text-[8px] font-bold text-gray-500">Motivo: {latest.reason}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['mirador', 'cascada'] as Source[]).map(source => <button key={source} type="button" disabled={busy} onClick={() => void record(order, item, source)} className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-[8px] font-black uppercase disabled:opacity-40 ${source === 'cascada' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {busy ? <LoaderCircle size={12} className="animate-spin" /> : <Store size={12} />}{labelOf(source)}
                    </button>)}
                  </div>
                </div>;
              })}
            </div>}
          </article>;
        })}
      </div>}
    </section>
  );
}
