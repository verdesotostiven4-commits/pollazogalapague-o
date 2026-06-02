import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from 'react';
import {
  AlertCircle,
  BadgeCheck,
  BellRing,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Heart,
  Home,
  Info as InfoIcon,
  MapPin,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Trash2,
  Umbrella,
  X,
} from 'lucide-react';
import Testimonials from './Testimonials';
import LiveMetrics from './LiveMetrics';
import LegalModal from './LegalModal';
import PollazoPlusProCard from './PollazoPlusProCard';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import {
  getPushPermission,
  isPushSupported,
  registerPushNotifications,
} from '../utils/pushNotifications';
import type {
  DeliveryAddress,
  DeliveryAddressLabel,
  Screen,
} from '../types';

const WHATSAPP = '+593989795628';
const MAPS_URL = 'https://maps.app.goo.gl/uM7jPvwGxzyUeeJYA';
const WA_HELLO = `https://wa.me/${WHATSAPP}?text=Hola%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20La%20Casa%20del%20Pollazo%20El%20Mirador%20%F0%9F%8D%97`;
const LOGO_OFFICIAL =
  'https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0';

const teamMembers = [
  {
    name: 'Edgar Verdesoto',
    role: 'Encargado',
    photo:
      'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Mery Loyola',
    role: 'Encargada',
    photo:
      'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Paola',
    role: 'Parte del equipo',
    photo:
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Matias Verdesoto',
    role: 'Parte del equipo',
    photo:
      'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Stiven Verdesoto',
    role: 'Marketing',
    photo:
      'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
];

const galleryPhotos = [
  {
    url: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Nuestras instalaciones',
  },
  {
    url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Nuestros productos',
  },
  {
    url: 'https://images.pexels.com/photos/1247755/pexels-photo-1247755.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Pollos frescos',
  },
  {
    url: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'El Mirador',
  },
  {
    url: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Productos del día',
  },
  {
    url: 'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Embutidos premium',
  },
];

const CUSTOMER_LEVELS = [
  {
    level: 1,
    title: 'Cliente Nuevo',
    minExp: 0,
    nextExp: 25,
    emoji: '🐣',
    benefit: 'Empieza tu historial Pollazo.',
    reward: 'Tu primera meta es registrar compras reales.',
  },
  {
    level: 2,
    title: 'Pollazo Fan',
    minExp: 25,
    nextExp: 60,
    emoji: '🔥',
    benefit: 'Ya eres cliente frecuente.',
    reward: 'Podrás recibir mejores avisos y recomendaciones.',
  },
  {
    level: 3,
    title: 'Cliente Fiel',
    minExp: 60,
    nextExp: 120,
    emoji: '⭐',
    benefit: 'Tu historial empieza a pesar más.',
    reward: 'Nivel ideal para futuras promos del negocio.',
  },
  {
    level: 4,
    title: 'Cliente Oro',
    minExp: 120,
    nextExp: 250,
    emoji: '👑',
    benefit: 'Nivel alto de fidelidad.',
    reward: 'Perfil destacado para beneficios especiales.',
  },
  {
    level: 5,
    title: 'Leyenda Pollazo',
    minExp: 250,
    nextExp: null,
    emoji: '🏆',
    benefit: 'Nivel máximo de cliente histórico.',
    reward: 'Eres de los clientes más fuertes del Pollazo.',
  },
];

const EDIT_ADDRESS_STORAGE_KEY = 'pollazo_edit_delivery_address_id';

function cleanPhoneTail(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '').slice(-9);
}

function toMoney(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const numeric = Number.parseFloat(
    String(value || '0')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );

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

function getNextLevelText(exp: number) {
  const level = getCustomerLevel(exp);

  if (!level.nextExp) {
    return 'Ya llegaste al nivel máximo.';
  }

  const remaining = Math.max(0, level.nextExp - exp);

  return `Te faltan ${remaining.toLocaleString('es-EC')} puntos de progreso para subir.`;
}

function AddressIcon({
  label,
  size = 17,
}: {
  label: DeliveryAddressLabel;
  size?: number;
}) {
  if (label === 'Casa') return <Home size={size} />;
  if (label === 'Trabajo') return <Building2 size={size} />;
  if (label === 'Airbnb') return <Umbrella size={size} />;

  return <MapPinned size={size} />;
}

function formatAddressCoords(address: DeliveryAddress) {
  const rawAddress = address as unknown as {
    lat?: number | string | null;
    lng?: number | string | null;
  };

  const lat =
    typeof rawAddress.lat === 'number'
      ? rawAddress.lat
      : Number.parseFloat(String(rawAddress.lat || ''));

  const lng =
    typeof rawAddress.lng === 'number'
      ? rawAddress.lng
      : Number.parseFloat(String(rawAddress.lng || ''));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Ubicación guardada';
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function TeamCarousel() {
  const doubledMembers = [...teamMembers, ...teamMembers];

  return (
    <div className="py-4 overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div className="pollazo-team-track flex gap-4 px-4 w-max">
        {doubledMembers.map((member, index) => (
          <div
            key={`${member.name}-${index}`}
            className="flex flex-col items-center gap-2.5 flex-shrink-0"
            style={{ width: 104 }}
          >
            <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-[3px] border-orange-500 shadow-lg ring-2 ring-white bg-orange-50">
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="text-center">
              <p className="text-[10px] font-black text-gray-900 leading-tight uppercase">
                {member.name.split(' ')[0]}
              </p>
              <p className="text-[9px] text-orange-500 font-bold leading-tight mt-0.5 line-clamp-2">
                {member.role}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pollazoTeamLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .pollazo-team-track {
          animation: pollazoTeamLoop 24s linear infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}

function InfoHero({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[42px] bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 shadow-2xl shadow-orange-100">
      <div className="absolute inset-0 hero-water opacity-90" />
      <div className="absolute -top-24 -right-20 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-20 w-64 h-64 bg-yellow-200/30 rounded-full blur-3xl" />

      <div className="relative px-5 pt-7 pb-4 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse blur-xl" />
          <img
            src={LOGO_OFFICIAL}
            alt="La Casa del Pollazo"
            className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl"
          />
        </div>

        <div>
          <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.28em]">
            Información oficial
          </p>

          <h2 className="text-white font-black text-3xl uppercase tracking-tighter italic leading-none mt-2">
            La Casa del Pollazo
          </h2>

          <div className="inline-flex items-center justify-center gap-1.5 bg-white/18 px-4 py-1.5 rounded-full border border-white/20 mt-3">
            <MapPin className="text-yellow-100" size={14} />
            <span className="text-white font-black text-[10px] uppercase tracking-widest">
              El Mirador · Puerto Ayora
            </span>
          </div>
        </div>
      </div>

      <div className="relative px-3 pb-3 pt-1">
        <PollazoPlusProCard onNavigate={onNavigate} />
      </div>
    </section>
  );
}

function LevelGuideSheet({
  open,
  onClose,
  exp,
}: {
  open: boolean;
  onClose: () => void;
  exp: number;
}) {
  if (!open) return null;

  const currentLevel = getCustomerLevel(exp);

  return (
    <div className="fixed inset-0 z-[12060] flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar información de niveles"
        onClick={onClose}
        className="absolute inset-0 bg-orange-950/25"
      />

      <section className="relative w-full max-w-md max-h-[70dvh] bg-white rounded-t-[34px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        <div className="px-5 py-4 border-b border-orange-50 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">
              Niveles Pollazo
            </p>
            <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none mt-1">
              Así subes de nivel
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(70dvh-74px)] space-y-3">
          <div className="bg-orange-50 border border-orange-100 rounded-[26px] p-4">
            <p className="text-[11px] font-bold text-orange-700 leading-relaxed">
              Tu nivel sube con tu historial de compras válidas. Sirve para entender tu progreso como cliente y preparar futuros beneficios cuando el negocio los active.
            </p>
          </div>

          {CUSTOMER_LEVELS.map(level => {
            const active = currentLevel.level === level.level;

            return (
              <div
                key={level.level}
                className={`rounded-[24px] border p-4 flex gap-3 ${
                  active
                    ? 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200 shadow-sm'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
                  {level.emoji}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-black text-gray-950 uppercase">
                      Nivel {level.level} · {level.title}
                    </p>

                    {active && (
                      <span className="bg-orange-500 text-white text-[7px] font-black px-2 py-1 rounded-full uppercase">
                        Actual
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-bold text-gray-500 mt-1 leading-relaxed">
                    Desde {level.minExp} pts
                    {level.nextExp ? ` hasta ${level.nextExp - 1} pts` : ' en adelante'}.
                  </p>

                  <p className="text-[10px] font-black text-orange-600 uppercase mt-2 leading-relaxed">
                    {level.reward}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CustomerAccountCard() {
  const { customers = [] } = useAdmin();
  const {
    customerName,
    customerPhone,
    customerAvatar,
    hasPollazoPlus,
  } = useUser();

  const [showLevelGuide, setShowLevelGuide] = useState(false);

  const customerNameText = String(customerName || '');
  const customerPhoneText = String(customerPhone || '');
  const cleanUserPhone = cleanPhoneTail(customerPhoneText);

  const customer = useMemo(() => {
    if (!cleanUserPhone) return null;

    const samePhoneCustomers = customers.filter(
      current => cleanPhoneTail(current.phone) === cleanUserPhone
    );

    if (samePhoneCustomers.length === 0) return null;

    return samePhoneCustomers.sort((a, b) => {
      const pointDiff = toMoney(b.points) - toMoney(a.points);

      if (pointDiff !== 0) return pointDiff;

      const spentDiff = toMoney(b.total_spent) - toMoney(a.total_spent);

      if (spentDiff !== 0) return spentDiff;

      return toMoney(b.exp) - toMoney(a.exp);
    })[0];
  }, [cleanUserPhone, customers]);

  const exp = toMoney(customer?.exp || customer?.total_spent || 0);
  const level = getCustomerLevel(exp);
  const progress = getLevelProgress(exp);
  const nextLevelText = getNextLevelText(exp);

  if (!customerPhoneText) {
    return (
      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <BadgeCheck size={22} />
          </div>

          <div>
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
              Mi cuenta Pollazo
            </h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase">
              Nivel y perfil del cliente
            </p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-[26px] p-4 text-center">
          <BadgeCheck size={32} className="mx-auto text-orange-500 mb-3" />
          <p className="text-xs font-black text-orange-700 uppercase leading-relaxed">
            Registra tu nombre, WhatsApp y ubicación para activar tu perfil, guardar direcciones y subir de nivel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-orange-50 via-white to-yellow-50 rounded-[34px] border border-orange-100 shadow-sm overflow-hidden p-4 relative">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-300/20 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-3 mb-4">
          <div className="relative">
            <img
              src={
                customerAvatar ||
                customer?.avatar_url ||
                `https://api.dicebear.com/8.x/adventurer/svg?seed=${customerNameText || customerPhoneText}`
              }
              className="w-14 h-14 rounded-[22px] object-cover border-4 border-white shadow-md"
              alt={customerNameText || 'Cliente'}
            />

            <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg border-2 border-white shadow-sm">
              {hasPollazoPlus ? '👑' : level.emoji}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.22em]">
              Mi cuenta Pollazo
            </p>

            <h3 className="text-lg font-black text-gray-900 uppercase italic truncate leading-none mt-1">
              {customerNameText || customer?.name || 'Cliente Pollazo'}
            </h3>

            <p className="text-[10px] font-bold text-gray-500 mt-1">
              {hasPollazoPlus ? 'Pollazo Plus activo · ' : ''}
              Nivel {level.level} · {level.title}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLevelGuide(true)}
          className="relative w-full bg-white/90 border border-white rounded-[28px] p-4 shadow-sm text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex justify-between items-start gap-3 mb-3">
            <div className="flex gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 text-xl flex items-center justify-center flex-shrink-0">
                {level.emoji}
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-900 uppercase">
                  Progreso de nivel
                </p>
                <p className="text-[10px] font-bold text-gray-500 mt-1 leading-relaxed">
                  {level.benefit}
                </p>
              </div>
            </div>

            <span className="text-[9px] font-black text-orange-500 uppercase bg-orange-50 px-2.5 py-1 rounded-full flex-shrink-0">
              {progress}%
            </span>
          </div>

          <div className="h-3 bg-orange-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-[9px] font-black text-gray-400 uppercase leading-relaxed">
              {nextLevelText}
            </p>

            <span className="text-[9px] font-black text-orange-600 uppercase flex items-center gap-1">
              Ver niveles
              <ChevronRight size={13} />
            </span>
          </div>
        </button>
      </div>

      <LevelGuideSheet
        open={showLevelGuide}
        onClose={() => setShowLevelGuide(false)}
        exp={exp}
      />
    </>
  );
}

function DeliveryAddressesPanel({
  onChangeLocation,
}: {
  onChangeLocation?: () => void;
}) {
  const {
    customerLat,
    customerLng,
    customerReference,
    deliveryAddresses,
    selectedDeliveryAddressId,
    selectedDeliveryAddress,
    selectDeliveryAddress,
    deleteDeliveryAddress,
  } = useUser();

  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const safeAddresses = Array.isArray(deliveryAddresses) ? deliveryAddresses : [];
  const customerReferenceText = String(customerReference || '');

  const hasDeliveryLocation =
    typeof customerLat === 'number' &&
    Number.isFinite(customerLat) &&
    typeof customerLng === 'number' &&
    Number.isFinite(customerLng) &&
    customerReferenceText.trim().length > 0;

  const sortedAddresses = useMemo(() => {
    return [...safeAddresses].sort((a, b) => {
      if (a.id === selectedDeliveryAddressId) return -1;
      if (b.id === selectedDeliveryAddressId) return 1;
      return 0;
    });
  }, [safeAddresses, selectedDeliveryAddressId]);

  const visibleAddresses = showAllAddresses ? sortedAddresses : sortedAddresses.slice(0, 2);
  const hiddenAddressCount = Math.max(0, sortedAddresses.length - visibleAddresses.length);

  const openLocationEditor = () => {
    onChangeLocation?.();
  };

  const handleEditAddress = (address: DeliveryAddress) => {
    sessionStorage.setItem(EDIT_ADDRESS_STORAGE_KEY, address.id);
    selectDeliveryAddress(address.id);

    window.setTimeout(() => {
      openLocationEditor();
    }, 80);
  };

  return (
    <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-orange-50 flex items-start gap-3">
        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Navigation size={20} className="text-orange-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-800 uppercase leading-none">
                Mi entrega
              </p>

              <p className="text-xs text-gray-500 mt-1 truncate">
                {selectedDeliveryAddress
                  ? `${selectedDeliveryAddress.label} · ${selectedDeliveryAddress.reference}`
                  : hasDeliveryLocation
                    ? customerReferenceText
                    : 'Agrega tu punto de entrega'}
              </p>
            </div>

            <span
              className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase flex-shrink-0 ${
                hasDeliveryLocation
                  ? 'bg-green-100 text-green-600'
                  : 'bg-orange-100 text-orange-600'
              }`}
            >
              {hasDeliveryLocation ? 'Lista' : 'Pendiente'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {sortedAddresses.length > 0 ? (
          <div className="space-y-2.5">
            {visibleAddresses.map(address => {
              const active = address.id === selectedDeliveryAddressId;

              return (
                <div
                  key={address.id}
                  className={`rounded-[24px] border p-3 transition-all ${
                    active
                      ? 'bg-orange-50 border-orange-200 shadow-sm'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectDeliveryAddress(address.id)}
                    className="w-full text-left flex items-start gap-3 active:scale-[0.99] transition-transform"
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        active
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                          : 'bg-white text-slate-400 border border-slate-100'
                      }`}
                    >
                      <AddressIcon label={address.label} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-900 uppercase truncate">
                          {address.label}
                        </p>

                        {active && (
                          <span className="bg-green-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase">
                            Actual
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] font-bold text-slate-500 leading-relaxed mt-1 line-clamp-2">
                        {address.reference}
                      </p>

                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-wider mt-1">
                        {formatAddressCoords(address)}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => selectDeliveryAddress(address.id)}
                      className={`flex-1 rounded-2xl py-2.5 text-[9px] font-black uppercase active:scale-95 transition-all ${
                        active
                          ? 'bg-orange-500 text-white'
                          : 'bg-white text-slate-600 border border-slate-100'
                      }`}
                    >
                      {active ? 'Seleccionada' : 'Usar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditAddress(address)}
                      className="flex-1 rounded-2xl py-2.5 text-[9px] font-black uppercase bg-white text-orange-600 border border-orange-100 active:scale-95 transition-all"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteDeliveryAddress(address.id)}
                      className="w-11 h-10 rounded-2xl bg-white text-red-400 border border-red-50 flex items-center justify-center active:scale-95 transition-all"
                      aria-label={`Eliminar ${address.label}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {sortedAddresses.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllAddresses(current => !current)}
                className="w-full bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl py-3 text-[10px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                {showAllAddresses ? (
                  <>
                    <ChevronUp size={14} />
                    Mostrar menos direcciones
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    Mostrar {hiddenAddressCount} más
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-4 text-center">
            <MapPinned size={24} className="mx-auto text-orange-500 mb-2" />
            <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
              Guarda Casa, Trabajo, Airbnb u otro punto para pedir más rápido.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={openLocationEditor}
          className="mt-3 w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[22px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-100"
        >
          <Plus size={15} />
          Agregar nueva dirección
        </button>
      </div>
    </div>
  );
}

function NotificationInfoCard({
  onChangeLocation,
}: {
  onChangeLocation?: () => void;
}) {
  const { customerPhone } = useUser();

  const [permission, setPermission] = useState<NotificationPermission>(() => getPushPermission());
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  const supported = isPushSupported();
  const customerPhoneText = String(customerPhone || '');
  const hasPhone = customerPhoneText.trim().length > 0;
  const enabled = permission === 'granted';
  const blocked = permission === 'denied';

  useEffect(() => {
    const syncPermission = () => {
      setPermission(getPushPermission());
    };

    syncPermission();

    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  useEffect(() => {
    if (!supported || !hasPhone || permission !== 'granted') return undefined;

    const syncKey = `pollazo_push_auto_synced_${customerPhoneText}`;

    if (sessionStorage.getItem(syncKey) === '1') return undefined;

    sessionStorage.setItem(syncKey, '1');

    let cancelled = false;

    const syncDevice = async () => {
      try {
        const result = await registerPushNotifications(customerPhoneText);

        if (cancelled) return;

        setPermission(getPushPermission());

        if (!result.ok && result.reason) {
          setNotice(result.reason);
        }
      } catch (error) {
        console.warn('No se pudo sincronizar avisos automáticamente:', error);
      }
    };

    syncDevice();

    return () => {
      cancelled = true;
    };
  }, [customerPhoneText, hasPhone, permission, supported]);

  const handleActivate = async () => {
    setNotice('');

    if (!supported) {
      setNotice('Este navegador no permite avisos push web.');
      return;
    }

    if (!hasPhone) {
      setNotice('Primero registra tu WhatsApp para asociar los avisos a tu pedido.');
      onChangeLocation?.();
      return;
    }

    if (blocked) {
      setShowPermissionHelp(true);
      setNotice('Los avisos están bloqueados. Debes permitirlos manualmente desde ajustes del celular o navegador.');
      return;
    }

    try {
      setLoading(true);

      const result = await registerPushNotifications(customerPhoneText);

      setPermission(getPushPermission());

      if (result.ok) {
        setNotice('Listo. Te avisaremos sobre pedidos, Plus y cambios importantes.');
      } else {
        setNotice(result.reason || 'No se pudo activar avisos en este dispositivo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    setNotice('');

    if (!supported || !hasPhone) {
      setNotice('Primero registra tu WhatsApp para reparar avisos.');
      return;
    }

    if (blocked) {
      setShowPermissionHelp(true);
      return;
    }

    try {
      setLoading(true);

      const result = await registerPushNotifications(customerPhoneText, {
        forceRefresh: true,
      });

      setPermission(getPushPermission());

      if (result.ok) {
        setNotice('Avisos reparados. Este celular quedó registrado nuevamente.');
      } else {
        setNotice(result.reason || 'No se pudo reparar avisos en este dispositivo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = !supported
    ? 'No disponible'
    : enabled
      ? 'Activos'
      : blocked
        ? 'Bloqueados'
        : 'Recomendado';

  const statusClass = !supported
    ? 'bg-gray-100 text-gray-500'
    : enabled
      ? 'bg-green-100 text-green-600'
      : blocked
        ? 'bg-red-100 text-red-500'
        : 'bg-orange-100 text-orange-600';

  const mainButtonLabel = !supported
    ? 'No disponible'
    : !hasPhone
      ? 'Registrar datos'
      : blocked
        ? 'Ver cómo permitir'
        : loading
          ? enabled
            ? 'Reparando...'
            : 'Activando...'
          : enabled
            ? 'Avisos activos'
            : 'Activar avisos';

  return (
    <>
      <section className="relative overflow-hidden bg-white rounded-[32px] border border-orange-50 shadow-sm">
        <div className="absolute -right-12 -top-12 w-36 h-36 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -left-12 -bottom-12 w-36 h-36 bg-yellow-200/25 rounded-full blur-3xl" />

        <div className="relative p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-[22px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-100 flex-shrink-0">
              <BellRing size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.22em]">
                    Avisos importantes
                  </p>

                  <h3 className="text-base font-black text-gray-950 uppercase italic leading-none mt-1">
                    Notificaciones Pollazo
                  </h3>
                </div>

                <span className={`text-[8px] font-black uppercase px-2.5 py-1.5 rounded-full flex-shrink-0 ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>

              <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-3">
                Te avisaremos sobre el estado de tu pedido, regalos Plus, cambios importantes y recordatorios útiles. Sin spam.
              </p>
            </div>
          </div>

          {blocked && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-[24px] p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] font-black text-red-600 uppercase leading-relaxed">
                Tu celular o navegador bloqueó los avisos. Por seguridad, el permiso debe cambiarse manualmente desde ajustes.
              </p>
            </div>
          )}

          {enabled && (
            <div className="mt-4 bg-green-50 border border-green-100 rounded-[24px] p-3 flex items-start gap-2">
              <ShieldCheck size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] font-black text-green-700 uppercase leading-relaxed">
                Avisos activos. Tu celular está listo para recibir notificaciones del Pollazo.
              </p>
            </div>
          )}

          {notice && (
            <div className="mt-4 bg-orange-50 border border-orange-100 rounded-[24px] p-3">
              <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed text-center">
                {notice}
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={enabled ? undefined : handleActivate}
              disabled={loading || !supported || enabled}
              className={`flex-1 rounded-[22px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                enabled
                  ? 'bg-green-50 text-green-600 border border-green-100'
                  : blocked || !supported
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-100'
              }`}
            >
              <BellRing size={15} className={loading ? 'animate-pulse' : ''} />
              {mainButtonLabel}
            </button>

            {enabled && (
              <button
                type="button"
                onClick={handleRepair}
                disabled={loading}
                className="rounded-[22px] px-4 py-3 text-[9px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100 active:scale-95 transition-transform disabled:opacity-60"
              >
                Reparar
              </button>
            )}

            {blocked && (
              <button
                type="button"
                onClick={() => setShowPermissionHelp(true)}
                className="rounded-[22px] px-4 py-3 text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-100 active:scale-95 transition-transform"
              >
                Ayuda
              </button>
            )}
          </div>
        </div>
      </section>

      {showPermissionHelp && (
        <div className="fixed inset-0 z-[13080] flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar ayuda de permisos"
            onClick={() => setShowPermissionHelp(false)}
            className="absolute inset-0 bg-orange-950/25"
          />

          <section className="relative w-full max-w-md bg-white rounded-t-[34px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
            <div className="px-5 py-4 border-b border-orange-50 flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">
                  Permisos del celular
                </p>

                <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none mt-1">
                  Activa notificaciones
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowPermissionHelp(false)}
                className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-red-50 border border-red-100 rounded-[26px] p-4 flex gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-red-700 leading-relaxed">
                  Cuando una notificación queda bloqueada, la app no puede abrir otra vez el permiso automático. Debes permitirlo desde los ajustes del celular o del navegador.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-[26px] p-4">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">
                  Android / app instalada
                </p>

                <div className="space-y-2 text-[11px] font-bold text-orange-800 leading-relaxed">
                  <p>1. Mantén presionado el ícono de La Casa del Pollazo.</p>
                  <p>2. Toca Información de la app.</p>
                  <p>3. Entra a Notificaciones.</p>
                  <p>4. Activa Permitir notificaciones.</p>
                  <p>5. Vuelve a Info y toca Reparar avisos.</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded-[26px] p-4">
                <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3">
                  Chrome
                </p>

                <div className="space-y-2 text-[11px] font-bold text-yellow-800 leading-relaxed">
                  <p>1. Abre Chrome.</p>
                  <p>2. Entra a Configuración del sitio.</p>
                  <p>3. Busca pollazogalapague-o-psi.vercel.app.</p>
                  <p>4. Cambia Notificaciones a Permitir.</p>
                  <p>5. Vuelve a la app y toca Reparar avisos.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPermissionHelp(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[24px] py-4 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-100"
              >
                Entendido
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

interface Props {
  onInstall?: () => void;
  canInstall?: boolean;
  onNavigate: (screen: Screen) => void;
  onChangeLocation?: () => void;
}

export default function InfoScreen({ onInstall, canInstall, onNavigate, onChangeLocation }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const closeLightbox = () => setLightboxIndex(null);

  const prevPhoto = () => {
    setLightboxIndex(prev =>
      prev === null ? null : (prev - 1 + galleryPhotos.length) % galleryPhotos.length
    );
  };

  const nextPhoto = () => {
    setLightboxIndex(prev =>
      prev === null ? null : (prev + 1) % galleryPhotos.length
    );
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) return;

    const dx = touchStartX.current - event.changedTouches[0].clientX;

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
    <div className="bg-gradient-to-b from-orange-50/65 via-white to-white px-4 py-5 space-y-4 min-h-full pb-24">
      <InfoHero onNavigate={onNavigate} />

      <LiveMetrics />

      <CustomerAccountCard />

      <DeliveryAddressesPanel onChangeLocation={onChangeLocation} />

      <NotificationInfoCard onChangeLocation={onChangeLocation} />

      {canInstall && onInstall && (
        <button
          type="button"
          onClick={onInstall}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[28px] p-4 shadow-xl shadow-orange-100 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
            <Sparkles size={22} className="text-white" />
          </div>

          <div className="text-left">
            <p className="text-xs font-black uppercase">
              Instalar app
            </p>
            <p className="text-[10px] font-bold text-white/80 mt-1">
              Acceso rápido desde tu celular.
            </p>
          </div>
        </button>
      )}

      <div className="bg-white rounded-3xl border border-orange-50 shadow-sm overflow-hidden p-1">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest">
            Contacto directo
          </h3>
          <Sparkles className="text-orange-500" size={16} />
        </div>

        <a
          href={WA_HELLO}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 active:bg-orange-50 transition-colors"
        >
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MessageCircle size={20} className="text-green-600" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-black text-gray-800">
              WhatsApp Oficial
            </p>
            <p className="text-xs text-gray-400">
              Atención inmediata
            </p>
          </div>

          <span className="text-[10px] text-green-600 font-black bg-green-100 px-3 py-1.5 rounded-full uppercase">
            Chatear
          </span>
        </a>

        <a
          href={`tel:${WHATSAPP}`}
          className="flex items-center gap-3 px-4 py-4 active:bg-orange-50 transition-colors"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Phone size={20} className="text-orange-500" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-black text-gray-800">
              Línea Telefónica
            </p>
            <p className="text-xs text-gray-400">
              +593 989 795 628
            </p>
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
              Horario de atención
            </p>
            <p className="text-xs text-gray-500 mt-1">
              7:00 AM – 9:00 PM · Todos los días
            </p>
          </div>
        </div>

        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 active:bg-gray-50 transition-colors"
        >
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

        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="w-full flex items-center gap-3 px-4 py-4 active:bg-orange-50 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Store size={20} className="text-orange-500" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-black text-gray-800 uppercase leading-none">
              Comprar ahora
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ver catálogo y armar pedido
            </p>
          </div>

          <ChevronRight className="text-gray-300" size={18} />
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2 text-center">
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest italic">
            Nuestro <span className="text-orange-500">Equipo</span>
          </h3>
          <p className="text-gray-400 text-[10px] mt-1 uppercase font-medium tracking-tight leading-relaxed">
            Personas detrás de la atención y servicio
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
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="flex-[2] rounded-3xl overflow-hidden relative active:scale-[0.98] transition-all shadow-md"
            >
              <img
                src={galleryPhotos[0].url}
                alt={galleryPhotos[0].caption}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-left">
                <p className="text-white text-[10px] font-black uppercase italic tracking-tighter">
                  {galleryPhotos[0].caption}
                </p>
              </div>
            </button>

            <div className="flex-1 flex flex-col gap-2">
              {[1, 2].map(index => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setLightboxIndex(index)}
                  className="flex-1 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all shadow-sm"
                >
                  <img
                    src={galleryPhotos[index].url}
                    alt={galleryPhotos[index].caption}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[3, 4, 5].map(index => (
              <button
                type="button"
                key={index}
                onClick={() => setLightboxIndex(index)}
                className="h-24 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all shadow-sm"
              >
                <img
                  src={galleryPhotos[index].url}
                  alt={galleryPhotos[index].caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Testimonials />

      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLegalModal(true)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-orange-50 transition-colors"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Scale size={20} className="text-orange-500" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-black text-gray-800 uppercase leading-none">
              Información legal y ayuda
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Términos, privacidad, pagos, entregas y soporte
            </p>
          </div>

          <ChevronRight className="text-gray-300" size={18} />
        </button>

        <div className="px-5 pb-5">
          <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-4 flex gap-3">
            <InfoIcon size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-orange-700 leading-relaxed">
              Los premios, niveles, promociones y beneficios pueden cambiar según lo que active el negocio. La app siempre mostrará lo disponible.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center px-4 py-3">
        <div className="inline-flex items-center gap-2 text-gray-400">
          <Heart size={14} className="text-orange-400 fill-orange-400" />
          <p className="text-[10px] font-bold uppercase">
            Hecho para comprar fácil en Puerto Ayora
          </p>
        </div>
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[11000] bg-black/85 flex items-center justify-center p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-[calc(env(safe-area-inset-top)+18px)] right-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90 transition-transform z-10"
            aria-label="Cerrar galería"
          >
            <X size={22} />
          </button>

          <button
            type="button"
            onClick={prevPhoto}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90 transition-transform z-10"
            aria-label="Foto anterior"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            onClick={nextPhoto}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90 transition-transform z-10"
            aria-label="Foto siguiente"
          >
            <ChevronRight size={24} />
          </button>

          <div className="w-full max-w-lg">
            <img
              src={galleryPhotos[lightboxIndex].url}
              alt={galleryPhotos[lightboxIndex].caption}
              className="w-full max-h-[70vh] object-contain rounded-[28px] shadow-2xl"
            />

            <p className="text-white text-center text-xs font-black uppercase tracking-widest mt-4">
              {galleryPhotos[lightboxIndex].caption}
            </p>
          </div>
        </div>
      )}

      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />
    </div>
  );
}
