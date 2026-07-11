import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, Eye, ShoppingBag, Sparkles } from 'lucide-react';
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

  const sessionId = getSessionId();

  const fetchMetrics = useCallback(async (countVisit = false) => {
    try {
      const response = await fetch('/api/metrics', {
        method: countVisit ? 'POST' : 'GET',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        totalVisits?: number;
        totalOrders?: number;
      };

      if (!response.ok || !result.ok) return;
      setTotalVisits(Number(result.totalVisits || 0));
      setTotalOrders(Number(result.totalOrders || 0));
    } catch (error) {
      console.warn('No se pudieron cargar métricas:', error);
    }
  }, []);

  useEffect(() => {
    const alreadyCounted = sessionStorage.getItem(VISIT_COUNTED_KEY);
    if (!alreadyCounted) {
      sessionStorage.setItem(VISIT_COUNTED_KEY, '1');
      void fetchMetrics(true);
    } else {
      void fetchMetrics(false);
    }
  }, [fetchMetrics]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchMetrics(false);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchMetrics]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setOnlineCount(1);
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
      icon: <Users size={21} className="text-green-500" />,
      bg: 'bg-green-50',
      ring: 'ring-green-100',
      value: onlineCount,
      label: 'En línea ahora',
      dot: true,
    },
    {
      icon: <Eye size={21} className="text-blue-500" />,
      bg: 'bg-blue-50',
      ring: 'ring-blue-100',
      value: totalVisits,
      label: 'Visitas totales',
      dot: false,
    },
    {
      icon: <ShoppingBag size={21} className="text-orange-500" />,
      bg: 'bg-orange-50',
      ring: 'ring-orange-100',
      value: totalOrders,
      label: 'Pedidos confirmados',
      dot: false,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-orange-100 bg-white shadow-sm">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-yellow-200/35 blur-3xl" />

      <div className="relative px-5 pt-5 pb-4 border-b border-orange-50">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-[20px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-100 flex-shrink-0">
            <Sparkles size={21} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.24em]">
              Transparencia
            </p>

            <h3 className="font-black text-gray-950 text-lg uppercase italic leading-none mt-1">
              En tiempo real
            </h3>

            <p className="text-gray-400 text-[11px] font-bold leading-relaxed mt-2">
              Indicadores vivos de actividad y pedidos de La Casa del Pollazo.
            </p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-3">
        {metrics.map(({ icon, bg, ring, value, label, dot }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-start py-5 px-2 gap-2 border-r border-orange-50 last:border-r-0"
          >
            <div className={`relative w-12 h-12 ${bg} ${ring} ring-4 rounded-[22px] flex items-center justify-center`}>
              {icon}

              {dot && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-70 animate-ping" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white" />
                </span>
              )}
            </div>

            <p className="text-gray-950 font-black text-xl leading-none mt-1">
              <AnimatedCount value={value} />
            </p>

            <p className="text-center text-gray-400 text-[9px] font-black uppercase leading-tight px-1">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
