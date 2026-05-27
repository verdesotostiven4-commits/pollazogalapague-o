import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, Eye, ShoppingBag, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const ONLINE_KEY = 'pollazo_session_id';
const VISIT_COUNTED_KEY = 'pollazo_visit_counted';

function getSessionId(): string {
  let id = sessionStorage.getItem(ONLINE_KEY);

  if (!id) {
    id = Math.random().toString(36).slice(2);
    sessionStorage.setItem(ONLINE_KEY, id);
  }

  return id;
}

function AnimatedCount({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const targetRef = useRef(value);

  useEffect(() => {
    targetRef.current = value;

    const start = displayedRef.current;
    const diff = value - start;

    if (diff === 0) return undefined;

    const steps = 38;
    let step = 0;

    const timer = window.setInterval(() => {
      step += 1;

      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(start + diff * eased);

      displayedRef.current = nextValue;
      setDisplayed(nextValue);

      if (step >= steps) {
        displayedRef.current = targetRef.current;
        setDisplayed(targetRef.current);
        window.clearInterval(timer);
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [value]);

  return <span>{displayed.toLocaleString('es-EC')}</span>;
}

export default function LiveMetrics() {
  const [onlineCount, setOnlineCount] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [presenceReady, setPresenceReady] = useState(false);

  const sessionId = getSessionId();

  const fetchMetrics = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from('app_metrics')
        .select('id, value');

      if (error) {
        console.warn('No se pudieron cargar métricas:', error);
        return;
      }

      const visits = data?.find(metric => metric.id === 'total_visits');
      const orders = data?.find(metric => metric.id === 'total_orders');

      setTotalVisits(Number(visits?.value || 0));
      setTotalOrders(Number(orders?.value || 0));
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const alreadyCounted = sessionStorage.getItem(VISIT_COUNTED_KEY);

    if (!alreadyCounted) {
      sessionStorage.setItem(VISIT_COUNTED_KEY, '1');

      supabase
        .rpc('increment_metric', { metric_id: 'total_visits' })
        .then(({ error }) => {
          if (error) {
            console.warn('No se pudo incrementar total_visits:', error);
          }
        });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const safeFetch = async () => {
      if (!mounted) return;
      await fetchMetrics();
    };

    safeFetch();

    const interval = window.setInterval(safeFetch, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [fetchMetrics]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('pollazo_live_metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_metrics' },
        payload => {
          const row = payload.new as { id?: string; value?: number | string };

          if (row?.id === 'total_visits') {
            setTotalVisits(Number(row.value || 0));
            setLastUpdated(new Date());
          }

          if (row?.id === 'total_orders') {
            setTotalOrders(Number(row.value || 0));
            setLastUpdated(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setOnlineCount(1);
      setPresenceReady(false);
      return undefined;
    }

    const channel = supabase.channel('pollazo_presence_online', {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    const updateOnlineCount = () => {
      const presenceState = channel.presenceState();
      const activeSessions = Object.keys(presenceState).length;

      setOnlineCount(Math.max(1, activeSessions));
      setPresenceReady(true);
    };

    channel
      .on('presence', { event: 'sync' }, updateOnlineCount)
      .on('presence', { event: 'join' }, updateOnlineCount)
      .on('presence', { event: 'leave' }, updateOnlineCount)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            session_id: sessionId,
            online_at: new Date().toISOString(),
          });

          updateOnlineCount();
        }
      });

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        channel
          .track({
            session_id: sessionId,
            online_at: new Date().toISOString(),
          })
          .then(updateOnlineCount)
          .catch(() => undefined);
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      document.removeEventListener('visibilitychange', visibilityHandler);
      channel.untrack().catch(() => undefined);
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const metrics = [
    {
      icon: <Users size={20} className="text-green-500" />,
      bg: 'bg-green-50',
      value: onlineCount,
      label: 'En línea ahora',
      sublabel: presenceReady ? 'sesiones activas' : 'conectando',
      dot: true,
    },
    {
      icon: <Eye size={20} className="text-blue-500" />,
      bg: 'bg-blue-50',
      value: totalVisits,
      label: 'Visitas totales',
      sublabel: 'sesiones',
      dot: false,
    },
    {
      icon: <ShoppingBag size={20} className="text-orange-500" />,
      bg: 'bg-orange-50',
      value: totalOrders,
      label: 'Pedidos confirmados',
      sublabel: 'reales',
      dot: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gray-900 text-base">
            Transparencia en tiempo real
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Indicadores actualizados de nuestra tienda
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMetrics}
          className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1.5 active:scale-95 transition-all"
          aria-label="Actualizar métricas"
        >
          <RefreshCw
            size={12}
            className={`text-orange-500 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span className="text-[8px] font-black uppercase text-gray-400">
            Live
          </span>
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {metrics.map(({ icon, bg, value, label, sublabel, dot }) => (
          <div key={label} className="flex flex-col items-center py-4 px-2 gap-2">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center relative`}>
              {icon}

              {dot && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
              )}
            </div>

            <p className="text-gray-900 font-black text-lg leading-none">
              <AnimatedCount value={value} />
            </p>

            <div className="text-center leading-tight">
              <p className="text-gray-400 text-[10px] font-bold">
                {label}
              </p>
              <p className="text-gray-300 text-[8px] font-black uppercase mt-0.5">
                {sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>

      {lastUpdated && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 text-center">
          <p className="text-[9px] font-bold text-gray-400 uppercase">
            Última actualización:{' '}
            {lastUpdated.toLocaleTimeString('es-EC', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}
