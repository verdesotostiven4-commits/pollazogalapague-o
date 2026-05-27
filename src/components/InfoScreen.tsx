import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import {
  MapPin,
  Clock,
  MessageCircle,
  Phone,
  Heart,
  X,
  ChevronRight,
  Sparkles,
  Star,
  ReceiptText,
  Wallet,
  TrendingUp,
  Crown,
  ShieldCheck,
  PackageCheck,
  BadgeCheck,
  Activity,
} from 'lucide-react';
import Testimonials from './Testimonials';
import LiveMetrics from './LiveMetrics';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import type { Order, Screen } from '../types';

const WHATSAPP = '+593989795628';
const MAPS_URL = 'https://maps.app.goo.gl/uM7jPvwGxzyUeeJYA';
const WA_HELLO = `https://wa.me/${WHATSAPP}?text=Hola%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20La%20Casa%20del%20Pollazo%20El%20Mirador%20%F0%9F%8D%97`;
const LOGO_OFFICIAL = 'https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0';

const teamMembers = [
  { name: 'Edgar Verdesoto', role: 'Encargado', photo: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Mery Loyola', role: 'Encargada', photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Paola', role: 'Parte del equipo', photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Matias Verdesoto', role: 'Parte del equipo', photo: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Stiven Verdesoto', role: 'Marketing', photo: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
];

const galleryPhotos = [
  { url: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Nuestras instalaciones' },
  { url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Nuestros productos' },
  { url: 'https://images.pexels.com/photos/1247755/pexels-photo-1247755.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Pollos frescos' },
  { url: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'El Mirador' },
  { url: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Productos del día' },
  { url: 'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Embutidos premium' },
];

const CUSTOMER_LEVELS = [
  { level: 1, title: 'Cliente Nuevo', minExp: 0, nextExp: 25, emoji: '🐣' },
  { level: 2, title: 'Pollazo Fan', minExp: 25, nextExp: 60, emoji: '🔥' },
  { level: 3, title: 'Cliente Fiel', minExp: 60, nextExp: 120, emoji: '⭐' },
  { level: 4, title: 'VIP del Mirador', minExp: 120, nextExp: 250, emoji: '👑' },
  { level: 5, title: 'Leyenda Pollazo', minExp: 250, nextExp: null, emoji: '🏆' },
];

function cleanPhoneTail(phone?: string | null) {
  return (phone || '').replace(/\D/g, '').slice(-8);
}

function toMoney(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const numeric = Number.parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function getCustomerLevel(exp: number) {
  return (
    [...CUSTOMER_LEVELS]
      .reverse()
      .find(level => exp >= level.minExp) || CUSTOMER_LEVELS[0]
  );
}

function getLevelProgress(exp: number) {
  const level = getCustomerLevel(exp);

  if (!level.nextExp) return 100;

  const currentRange = level.nextExp - level.minExp;
  const currentProgress = exp - level.minExp;

  return Math.min(100, Math.max(0, Math.round((currentProgress / currentRange) * 100)));
}

function formatOrderDate(date?: string | null) {
  if (!date) return '--';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '--';

  return parsed.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
  });
}

function getOrderItemsLabel(order: Order) {
  const items = order.items || [];

  if (items.length === 0) return 'Pedido sin detalle';

  const names = items
    .slice(0, 2)
    .map(item => item.name || item.product?.name || 'Producto')
    .join(', ');

  return items.length > 2 ? `${names} +${items.length - 2}` : names;
}

function getStatusStyle(status: Order['status']) {
  if (status === 'Por Confirmar') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (status === 'Recibido') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'Preparando') return 'bg-purple-50 text-purple-600 border-purple-100';
  if (status === 'Enviado') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (status === 'Entregado') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'Cancelado') return 'bg-red-50 text-red-500 border-red-100';

  return 'bg-gray-50 text-gray-400 border-gray-100';
}

function TeamCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollSpeed = 1.35;
  const tripledMembers = [...teamMembers, ...teamMembers, ...teamMembers];

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return undefined;

    let animationId: number;

    const animate = () => {
      container.scrollLeft += scrollSpeed;

      if (container.scrollLeft >= (container.scrollWidth / 3) * 2) {
        container.scrollLeft = container.scrollWidth / 3;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="py-4 overflow-hidden relative pointer-events-none">
      <div ref={containerRef} className="flex gap-4 px-4 overflow-x-hidden scrollbar-hide">
        {tripledMembers.map((member, i) => (
          <div key={`${member.name}-${i}`} className="flex flex-col items-center gap-2.5 flex-shrink-0" style={{ width: 100 }}>
            <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-[3px] border-orange-500 shadow-lg ring-2 ring-white">
              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-900 leading-tight uppercase">{member.name.split(' ')[0]}</p>
              <p className="text-[9px] text-orange-500 font-bold leading-tight mt-0.5">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/75 border border-white/70 rounded-2xl p-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
        {label}
      </p>
      <p className="text-sm font-black text-gray-900 mt-1 leading-none">
        {value}
      </p>
    </div>
  );
}

interface CustomerHistoryProps {
  onNavigate: (screen: Screen) => void;
}

function CustomerHistoryCard({ onNavigate }: CustomerHistoryProps) {
  const { orders, customers } = useAdmin();
  const {
    customerName,
    customerPhone,
    customerAvatar,
  } = useUser();

  const cleanUserPhone = cleanPhoneTail(customerPhone);

  const customer = useMemo(() => {
    if (!cleanUserPhone) return null;

    return (
      customers.find(current => cleanPhoneTail(current.phone) === cleanUserPhone) || null
    );
  }, [cleanUserPhone, customers]);

  const myOrders = useMemo(() => {
    if (!cleanUserPhone) return [];

    return [...orders]
      .filter(order => cleanPhoneTail(order.customer_phone) === cleanUserPhone)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [cleanUserPhone, orders]);

  const realOrders = useMemo(() => {
    return myOrders.filter(order => order.status !== 'Cancelado' && order.status !== 'Por Confirmar');
  }, [myOrders]);

  const totalSpentFromOrders = useMemo(() => {
    return realOrders.reduce((sum, order) => sum + toMoney(order.total), 0);
  }, [realOrders]);

  const totalSpent = toMoney(customer?.total_spent || totalSpentFromOrders);
  const totalOrders = customer?.total_orders || realOrders.length;
  const exp = customer?.exp || Math.floor(totalSpent);
  const points = customer?.points || 0;
  const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const level = getCustomerLevel(exp);
  const progress = getLevelProgress(exp);
  const nextExp = level.nextExp;

  const topProduct = useMemo(() => {
    const productCount = new Map<string, number>();

    realOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const name = item.name || item.product?.name || 'Producto';
        const quantity = Number(item.quantity || 1);

        productCount.set(name, (productCount.get(name) || 0) + quantity);
      });
    });

    return [...productCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [realOrders]);

  const activeOrders = myOrders.filter(order =>
    ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'].includes(order.status)
  );

  const savingTip = useMemo(() => {
    if (totalOrders === 0) {
      return 'Cuando hagas tus compras, aquí verás consejos simples para ahorrar y organizar mejor tus pedidos.';
    }

    if (averageOrder < 10) {
      return 'Tip: intenta agrupar tus compras desde $10 para aprovechar mejor cada entrega.';
    }

    if (topProduct) {
      return `Tu producto más repetido parece ser ${topProduct}. Pronto podremos avisarte ofertas relacionadas.`;
    }

    return 'Vas bien: tus pedidos ya tienen historial para mostrarte recomendaciones útiles.';
  }, [averageOrder, topProduct, totalOrders]);

  if (!customerPhone) {
    return (
      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <ReceiptText size={22} />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
              Mi Historial Pollazo
            </h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase">
              Tu cuenta y compras
            </p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4 text-center">
          <Crown size={30} className="mx-auto text-orange-500 mb-2" />
          <p className="text-xs font-black text-orange-700 uppercase leading-relaxed">
            Completa tu perfil desde el ícono de usuario para ver tu historial, nivel y beneficios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50 rounded-[34px] border border-orange-100 shadow-sm overflow-hidden p-5 relative">
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-yellow-300/20 rounded-full blur-3xl" />

      <div className="relative flex items-center gap-4 mb-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-[24px] overflow-hidden border-4 border-white shadow-xl bg-white">
            <img
              src={customer?.avatar_url || customerAvatar || LOGO_OFFICIAL}
              alt={customerName || 'Cliente'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-xl px-1.5 py-1 text-[9px] font-black border-2 border-white">
            {level.emoji}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
            Mi Historial Pollazo
          </p>
          <h3 className="font-black text-gray-900 text-lg uppercase italic truncate leading-none mt-1">
            {customer?.name || customerName || 'Cliente Pollazo'}
          </h3>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="bg-white/80 border border-orange-100 text-orange-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
              <Crown size={11} />
              Nivel {level.level}
            </span>

            <span className="bg-white/80 border border-green-100 text-green-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
              <BadgeCheck size={11} />
              {customer?.phone_verified ? 'Verificado' : 'Sin verificar'}
            </span>
          </div>
        </div>
      </div>

      <div className="relative bg-white/70 backdrop-blur-md rounded-[28px] p-4 border border-white/70 mb-4">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-xs font-black text-gray-900 uppercase">
              {level.title}
            </p>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
              {exp.toLocaleString('es-EC')} EXP acumulada
            </p>
          </div>

          {nextExp ? (
            <p className="text-[9px] font-black text-orange-500 uppercase">
              faltan {Math.max(0, nextExp - exp)} EXP
            </p>
          ) : (
            <p className="text-[9px] font-black text-orange-500 uppercase">
              nivel máximo
            </p>
          )}
        </div>

        <div className="h-3 bg-orange-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 mb-4">
        <StatPill
          icon={<Wallet size={18} />}
          label="Gastado"
          value={`$${totalSpent.toFixed(2)}`}
        />
        <StatPill
          icon={<PackageCheck size={18} />}
          label="Pedidos"
          value={`${totalOrders}`}
        />
        <StatPill
          icon={<TrendingUp size={18} />}
          label="Promedio"
          value={`$${averageOrder.toFixed(2)}`}
        />
        <StatPill
          icon={<Activity size={18} />}
          label="Temporada"
          value={`${points} pts`}
        />
      </div>

      <div className="relative bg-white/80 border border-white rounded-[28px] p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={21} />
          </div>
          <div>
            <p className="text-[11px] font-black text-gray-900 uppercase">
              Mi Bolsillo Pollazo
            </p>
            <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-1">
              {savingTip}
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Últimos pedidos
          </p>

          {activeOrders.length > 0 && (
            <span className="text-[8px] font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-full uppercase">
              {activeOrders.length} activo{activeOrders.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {myOrders.length > 0 ? (
          <div className="space-y-2">
            {myOrders.slice(0, 3).map(order => (
              <div key={order.id} className="bg-white/80 border border-white rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
                  <ReceiptText size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-gray-900 uppercase truncate">
                    {order.order_code} · {getOrderItemsLabel(order)}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1">
                    {formatOrderDate(order.created_at)} · ${toMoney(order.total).toFixed(2)}
                  </p>
                </div>

                <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-full border flex-shrink-0 ${getStatusStyle(order.status)}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/70 border border-white rounded-2xl p-4 text-center">
            <p className="text-[11px] font-black text-gray-500 uppercase leading-relaxed">
              Aún no tienes pedidos registrados con este número.
            </p>
            <button
              onClick={() => onNavigate('catalog')}
              className="mt-3 bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform"
            >
              Ver catálogo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  onInstall?: () => void;
  canInstall?: boolean;
  onNavigate: (screen: Screen) => void;
}

export default function InfoScreen({ onNavigate }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const closeLightbox = () => setLightboxIndex(null);

  const prevPhoto = () => {
    setLightboxIndex(prev => (prev === null ? null : (prev - 1 + galleryPhotos.length) % galleryPhotos.length));
  };

  const nextPhoto = () => {
    setLightboxIndex(prev => (prev === null ? null : (prev + 1) % galleryPhotos.length));
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return;

    const dx = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(dx) > 50) {
      if (dx > 0) {
        nextPhoto();
      } else {
        prevPhoto();
      }
    }

    touchStartX.current = null;
  };

  return (
    <div className="bg-gray-50 px-4 py-5 space-y-4 min-h-full pb-20">
      <div className="rounded-[40px] overflow-hidden hero-water shadow-xl">
        <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse blur-xl" />
            <img src={LOGO_OFFICIAL} alt="logo" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
          </div>
          <div>
            <h2 className="text-white font-black text-2xl uppercase tracking-tighter not-italic">
              La Casa del Pollazo
            </h2>
            <div className="flex items-center justify-center gap-1.5 bg-black/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 mt-2">
              <MapPin className="text-yellow-300" size={14} />
              <span className="text-white font-bold text-[10px] uppercase tracking-widest">
                El Mirador
              </span>
            </div>
          </div>
        </div>
      </div>

      <LiveMetrics />

      <CustomerHistoryCard onNavigate={onNavigate} />

      <div className="bg-white rounded-3xl border border-orange-50 shadow-sm overflow-hidden p-1">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest">
            Contacto Directo
          </h3>
          <Sparkles className="text-orange-500" size={16} />
        </div>

        <a href={WA_HELLO} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 active:bg-orange-50 transition-colors">
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-800">WhatsApp Oficial</p>
            <p className="text-xs text-gray-400">Atención inmediata</p>
          </div>
          <span className="text-[10px] text-green-600 font-black bg-green-100 px-3 py-1.5 rounded-full uppercase">
            Chatear
          </span>
        </a>

        <a href={`tel:${WHATSAPP}`} className="flex items-center gap-3 px-4 py-4 active:bg-orange-50 transition-colors">
          <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Phone size={20} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-800">Línea Telefónica</p>
            <p className="text-xs text-gray-400">+593 989 795 628</p>
          </div>
          <span className="text-[10px] text-orange-600 font-black bg-orange-100 px-3 py-1.5 rounded-full uppercase">
            Llamar
          </span>
        </a>
      </div>

      <div className="bg-white rounded-3xl border border-orange-50 shadow-sm overflow-hidden p-1">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-50">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-800 uppercase leading-none">
              Horario de Atención
            </p>
            <p className="text-xs text-gray-500 mt-1">
              7:00 AM – 9:00 PM | Todos los días
            </p>
          </div>
        </div>

        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 active:bg-gray-50 transition-colors">
          <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-800 uppercase leading-none">
              Ubicación
            </p>
            <p className="text-xs text-gray-500 mt-1">
              El Mirador, Puerto Ayora
            </p>
          </div>
          <ChevronRight className="text-gray-300" size={18} />
        </a>
      </div>

      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2 text-center">
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest italic">
            Nuestro <span className="text-orange-500">Equipo</span>
          </h3>
          <p className="text-gray-400 text-[10px] mt-1 uppercase font-medium tracking-tight leading-relaxed">
            LAS MANOS DETRÁS DE UNA BUENA CALIDAD DE SERVICIO
          </p>
        </div>
        <TeamCarousel />
      </div>

      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden p-3">
        <div className="px-3 py-2 flex items-center gap-2 mb-2">
          <Star className="text-orange-500 fill-orange-500" size={14} />
          <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest">
            Galería
          </h3>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2" style={{ height: 180 }}>
            <button onClick={() => setLightboxIndex(0)} className="flex-[2] rounded-3xl overflow-hidden relative active:scale-[0.98] transition-all shadow-md">
              <img src={galleryPhotos[0].url} alt={galleryPhotos[0].caption} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-left">
                <p className="text-white text-[10px] font-black uppercase italic tracking-tighter">
                  {galleryPhotos[0].caption}
                </p>
              </div>
            </button>

            <div className="flex-1 flex flex-col gap-2">
              {[1, 2].map(i => (
                <button key={i} onClick={() => setLightboxIndex(i)} className="flex-1 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all shadow-sm">
                  <img src={galleryPhotos[i].url} alt={galleryPhotos[i].caption} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
                    <p className="text-white text-[8px] font-bold uppercase truncate">
                      {galleryPhotos[i].caption}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2" style={{ height: 100 }}>
            {[3, 4, 5].map(i => (
              <button key={i} onClick={() => setLightboxIndex(i)} className="flex-1 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all shadow-sm">
                <img src={galleryPhotos[i].url} alt={galleryPhotos[i].caption} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
                  <p className="text-white text-[8px] font-bold uppercase truncate">
                    {galleryPhotos[i].caption}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Testimonials onNavigateRanking={() => onNavigate('ranking')} />

      <div className="flex items-center justify-center gap-1.5 py-6 text-gray-300 text-[10px] font-black uppercase tracking-[0.2em]">
        <span>Hecho con</span>
        <Heart size={12} className="text-orange-400 fill-orange-400" />
        <span>en Galápagos</span>
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[35] bg-white/10 backdrop-blur-3xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute top-20 right-6 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center text-gray-900 active:scale-75 transition-all z-[40]"
          >
            <X size={24} />
          </button>

          <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <img
              src={galleryPhotos[lightboxIndex].url}
              alt={galleryPhotos[lightboxIndex].caption}
              className="w-full max-h-[60vh] object-contain rounded-[40px] shadow-2xl border-2 border-white pointer-events-none select-none"
            />

            <div className="mt-6 text-center px-4">
              <p className="text-gray-900 text-base font-black uppercase tracking-tighter italic">
                {galleryPhotos[lightboxIndex].caption}
              </p>

              <div className="flex justify-center gap-2 mt-4">
                {galleryPhotos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === lightboxIndex ? 'w-8 bg-orange-500' : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <p className="text-white text-[9px] mt-8 font-black uppercase tracking-[0.2em] mix-blend-difference">
                ← desliza para cambiar →
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes logoGlowPulse {
          0%, 100% { transform: scale(1); opacity: 0.28; }
          50% { transform: scale(1.3); opacity: 0.1; }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
