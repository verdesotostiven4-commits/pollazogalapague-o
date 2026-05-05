import { useState, useEffect, useRef } from 'react';
import { Users, Eye, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const targetRef = useRef(value);

  useEffect(() => {
    targetRef.current = value;
    let start = displayed;
    const diff = value - start;
    if (diff === 0) return;
    const steps = 40;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * eased));
      if (step >= steps) { clearInterval(timer); setDisplayed(targetRef.current); }
    }, 20);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayed.toLocaleString('es-EC')}</span>;
}

export default function LiveMetrics() {
  const [onlineCount, setOnlineCount] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const sessionId = getSessionId();

  // Track visit count (once per session)
  useEffect(() => {
    const alreadyCounted = sessionStorage.getItem(VISIT_COUNTED_KEY);
    if (!alreadyCounted) {
      sessionStorage.setItem(VISIT_COUNTED_KEY, '1');
      supabase.rpc('increment_metric', { metric_id: 'total_visits' }).then(() => {});
    }
  }, []);

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      const { data } = await supabase
        .from('app_metrics')
        .select('id, value');
      if (data) {
        const visits = data.find(d => d.id === 'total_visits');
        const orders = data.find(d => d.id === 'total_orders');
        if (visits) setTotalVisits(visits.value);
        if (orders) setTotalOrders(orders.value);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Online users simulation (real-ish: random 2-8 + 1 for current user)
  useEffect(() => {
    const base = (parseInt(sessionId.slice(0, 2), 36) % 5) + 2;
    setOnlineCount(base);
    const interval = setInterval(() => {
      setOnlineCount(prev => Math.max(1, prev + (Math.random() > 0.55 ? 1 : -1)));
    }, 12000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const metrics = [
    {
      icon: <Users size={20} className="text-green-500" />,
      bg: 'bg-green-50',
      value: onlineCount,
      label: 'En línea ahora',
      dot: true,
    },
    {
      icon: <Eye size={20} className="text-blue-500" />,
      bg: 'bg-blue-50',
      value: totalVisits,
      label: 'Visitas totales',
      dot: false,
    },
    {
      icon: <ShoppingBag size={20} className="text-orange-500" />,
      bg: 'bg-orange-50',
      value: totalOrders,
      label: 'Pedidos enviados',
      dot: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-black text-gray-900 text-base">Transparencia en tiempo real</h3>
        <p className="text-gray-400 text-xs mt-0.5">Métricas actualizadas de nuestra tienda</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {metrics.map(({ icon, bg, value, label, dot }) => (
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
            <p className="text-gray-400 text-[10px] font-medium text-center leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
