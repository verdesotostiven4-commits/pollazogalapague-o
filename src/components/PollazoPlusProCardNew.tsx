import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  Crown,
  Gift,
  Headphones,
  HelpCircle,
  Lock,
  ShieldCheck,
  Sparkles,
  Truck,
  WalletCards,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import type { Screen } from '../types';
import { STORE_WHATSAPP } from '../utils/whatsapp';

interface Props {
  onNavigate: (screen: Screen) => void;
}

type DetailsView = 'subscribe' | 'active' | 'cancel';
type SavingTab = 'month' | 'total';

type OrderLike = {
  customer_phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  membership_applied?: boolean | null;
  delivery_fee?: number | string | null;
  delivery_fee_final?: number | string | null;
  order_code?: string | null;
};

const PLUS_PRICE = 6.99;
const DELIVERY_SAMPLE_PRICE = 1.5;
const OPEN_PLUS_SIGNAL = 'pollazo_open_plus';
const LAST_CELEBRATED_KEY = 'pollazo_plus_last_celebrated_key_v2';

const cleanDigits = (value?: string | null) => String(value || '').replace(/\D/g, '').slice(-9);

const toNumber = (value: unknown) => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, ''));

  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: number) => `$${Math.max(0, value).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const monthLabel = (date = new Date()) =>
  date.toLocaleDateString('es-EC', { month: 'long' }).replace(/^./, letter => letter.toUpperCase());

const isSameMonth = (date: Date, base = new Date()) =>
  date.getFullYear() === base.getFullYear() && date.getMonth() === base.getMonth();

const getDaysLeft = (value?: string | null) => {
  if (!value) return null;
  const expires = new Date(value).getTime();
  if (Number.isNaN(expires)) return null;
  return Math.max(0, Math.ceil((expires - Date.now()) / (1000 * 60 * 60 * 24)));
};

const savingFromOrder = (order: OrderLike) => {
  if (!order.membership_applied) return 0;

  const original = toNumber(order.delivery_fee);
  const final = toNumber(order.delivery_fee_final);
  const diff = original > final ? original - final : 0;

  return Math.max(diff, original > 0 && final === 0 ? original : 0, DELIVERY_SAMPLE_PRICE);
};

const openWhatsApp = (message: string) => {
  const phone = String(STORE_WHATSAPP || '').replace(/\D/g, '');
  if (!phone) return;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};

const playPlusSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
    gain.connect(context.destination);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.1);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.1);
      oscillator.stop(context.currentTime + index * 0.1 + 0.16);
    });

    window.setTimeout(() => {
      context.close().catch(() => undefined);
    }, 800);
  } catch {
    // Decorativo: si el navegador bloquea audio, no afecta la app.
  }
};

function PortalLayer({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

function PlusBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-orange-600 shadow-lg shadow-orange-950/10">
      <Crown size={18} />
      <span className="text-sm font-black italic lowercase">plus</span>
    </div>
  );
}

function BenefitTile({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-[24px] border border-orange-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase leading-tight text-gray-950">{title}</p>
      <p className="mt-1 text-[9px] font-bold leading-snug text-gray-500">{desc}</p>
    </div>
  );
}

function TermsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const terms = [
    ['Pago mensual', `Pollazo Plus tiene un valor de ${money(PLUS_PRICE)} mensuales. Por ahora se registra una solicitud y el negocio puede activarla manualmente. Cuando se conecte pago con tarjeta, el cobro será mensual mientras la membresía esté activa.`],
    ['Delivery gratis', 'El beneficio principal es delivery gratis durante el periodo activo, dentro de la zona de cobertura del negocio.'],
    ['Beneficios especiales', 'Los regalos, extras o descuentos dependen de disponibilidad, stock, temporada y decisión del negocio. No se garantizan en todos los pedidos.'],
    ['Cancelación', 'El cliente puede solicitar cancelar la membresía. Los beneficios ya activados se mantienen hasta el vencimiento del periodo correspondiente.'],
    ['Uso correcto', 'La membresía es personal para el número de WhatsApp registrado. El negocio puede pausar o cancelar beneficios si detecta abuso, datos falsos o mal uso del servicio.'],
  ];

  return (
    <PortalLayer>
      <div className="fixed inset-0 z-[2147483647] flex items-end bg-gray-950/55 backdrop-blur-[1px] pollazo-plus-fade">
        <button type="button" aria-label="Cerrar términos" className="absolute inset-0 cursor-default" onClick={onClose} />

        <section className="relative z-10 flex h-[58dvh] max-h-[540px] w-full flex-col rounded-t-[34px] bg-white text-gray-950 shadow-2xl pollazo-plus-sheet">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-200" />
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-6 pb-4 pt-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-orange-500">Pollazo Plus</p>
              <h3 className="mt-1 text-2xl font-black uppercase italic leading-none text-gray-950">Condiciones</h3>
            </div>
            <button type="button" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-500 transition-transform active:scale-90" aria-label="Cerrar términos">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 pb-[calc(env(safe-area-inset-bottom)+22px)]">
            <div className="rounded-[26px] border border-orange-100 bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
              <p className="text-[12px] font-black leading-relaxed text-orange-800">
                Pollazo Plus es una membresía mensual para comprar más cómodo: delivery gratis dentro de cobertura, prioridad y beneficios especiales.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {terms.map(([title, text]) => (
                <div key={title} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="text-sm font-black uppercase text-gray-950">{title}</p>
                  <p className="mt-2 text-[12px] font-bold leading-relaxed text-gray-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PortalLayer>
  );
}

export default function PollazoPlusProCardNew({ onNavigate }: Props) {
  const { orders, requestMembership, cancelMembership } = useAdmin();
  const {
    customerPhone,
    customerName,
    hasPollazoPlus,
    membershipStatus,
    activeMembership,
    pollazoPlusExpiresAt,
    refreshMembership,
  } = useUser();

  const [showDetails, setShowDetails] = useState(false);
  const [detailsView, setDetailsView] = useState<DetailsView>('subscribe');
  const [savingTab, setSavingTab] = useState<SavingTab>('month');
  const [showTerms, setShowTerms] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const expiresAt = activeMembership?.expires_at || pollazoPlusExpiresAt;
  const expiresLabel = formatDate(expiresAt);
  const daysLeft = getDaysLeft(expiresAt);
  const isExpiredOrCancelled = membershipStatus === 'expired' || membershipStatus === 'cancelled';
  const isPending = membershipStatus === 'pending';
  const monthName = monthLabel();

  const customerOrders = useMemo(() => {
    const phoneTail = cleanDigits(customerPhone);
    if (!phoneTail) return [] as OrderLike[];

    return (orders as OrderLike[]).filter(order => cleanDigits(order.customer_phone) === phoneTail);
  }, [customerPhone, orders]);

  const savingStats = useMemo(() => {
    const plusOrders = customerOrders
      .map(order => {
        const created = new Date(order.created_at || order.updated_at || '');
        return {
          order,
          created,
          saving: savingFromOrder(order),
        };
      })
      .filter(item => item.saving > 0 && !Number.isNaN(item.created.getTime()));

    const monthOrders = plusOrders.filter(item => isSameMonth(item.created));
    const monthSaving = monthOrders.reduce((sum, item) => sum + item.saving, 0);
    const totalSaving = plusOrders.reduce((sum, item) => sum + item.saving, 0);

    return {
      monthSaving,
      totalSaving,
      monthOrders,
      plusOrders,
      lastOrder: plusOrders[0]?.order,
    };
  }, [customerOrders]);

  const currentSaving = savingTab === 'month' ? savingStats.monthSaving : savingStats.totalSaving;
  const currentOrders = savingTab === 'month' ? savingStats.monthOrders : savingStats.plusOrders;
  const savingTitle = savingTab === 'month' ? `Ahorro ${monthName.toLowerCase()}` : 'Ahorro acumulado';
  const savingSubtitle = savingTab === 'month'
    ? 'Lo que Pollazo Plus te ahorró este mes.'
    : 'Todo lo que has ahorrado con Pollazo Plus.';

  const celebrationKey = useMemo(() => {
    if (!hasPollazoPlus) return '';
    return `${activeMembership?.id || 'plus'}-${expiresAt || 'sin-fecha'}`;
  }, [activeMembership?.id, expiresAt, hasPollazoPlus]);

  const openDetails = useCallback((view?: DetailsView) => {
    setNotice('');
    setDetailsView(view || (hasPollazoPlus ? 'active' : 'subscribe'));
    setShowDetails(true);
  }, [hasPollazoPlus]);

  const openDetailsFromExternalSignal = useCallback(() => {
    sessionStorage.removeItem(OPEN_PLUS_SIGNAL);
    openDetails(hasPollazoPlus ? 'active' : 'subscribe');
    window.setTimeout(() => refreshMembership().catch(() => undefined), 150);
  }, [hasPollazoPlus, openDetails, refreshMembership]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpenFromUrl = params.get('plus') === '1' || params.has('membershipReminder') || params.has('membershipId');
    const shouldOpenFromSession = sessionStorage.getItem(OPEN_PLUS_SIGNAL) === '1';

    if (shouldOpenFromUrl || shouldOpenFromSession) openDetailsFromExternalSignal();
  }, [openDetailsFromExternalSignal]);

  useEffect(() => {
    const handleOpenPlus = () => openDetailsFromExternalSignal();
    window.addEventListener('pollazo:open-plus', handleOpenPlus);
    return () => window.removeEventListener('pollazo:open-plus', handleOpenPlus);
  }, [openDetailsFromExternalSignal]);

  useEffect(() => {
    if (!hasPollazoPlus || !celebrationKey) return undefined;
    const lastCelebrated = localStorage.getItem(LAST_CELEBRATED_KEY);
    if (lastCelebrated === celebrationKey) return undefined;

    const timer = window.setTimeout(() => {
      setShowCelebrate(true);
      localStorage.setItem(LAST_CELEBRATED_KEY, celebrationKey);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [celebrationKey, hasPollazoPlus]);

  useEffect(() => {
    if (!showCelebrate) return;
    playPlusSound();
    try {
      navigator.vibrate?.([35, 25, 35, 40, 70]);
    } catch {
      // Vibración opcional.
    }
  }, [showCelebrate]);

  useEffect(() => {
    if (!showDetails && !showTerms && !showCelebrate) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showDetails, showTerms, showCelebrate]);

  const handleSubscribe = async () => {
    if (!customerPhone) {
      setShowDetails(false);
      onNavigate('cart');
      return;
    }

    setLoading(true);
    setNotice('');

    try {
      await requestMembership({
        customerPhone,
        customerName,
        paymentMethod: 'tarjeta',
        notes: isExpiredOrCancelled
          ? 'Solicitud de renovación Pollazo Plus desde pantalla profesional. Pago con tarjeta pendiente; activar manualmente en admin.'
          : 'Solicitud Pollazo Plus desde pantalla profesional. Pago con tarjeta pendiente; activar manualmente en admin.',
      });
      await refreshMembership();
      setNotice(isExpiredOrCancelled ? 'Solicitud de renovación enviada.' : 'Solicitud enviada. El negocio podrá activar tu Plus.');
    } catch (error) {
      console.error('No se pudo solicitar Pollazo Plus:', error);
      setNotice('No se pudo enviar la solicitud. Intenta otra vez.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!activeMembership?.id) {
      setNotice('No encontramos una membresía activa para cancelar.');
      setDetailsView('active');
      return;
    }

    setLoading(true);
    setNotice('');

    try {
      await cancelMembership(activeMembership.id, 'Cancelación solicitada por el cliente desde confirmación Pollazo Plus.');
      await refreshMembership();
      setDetailsView('active');
      setNotice('Tu solicitud de cancelación fue registrada. El negocio revisará tu membresía.');
    } catch (error) {
      console.error('No se pudo cancelar Pollazo Plus:', error);
      setNotice('No se pudo registrar la cancelación. Intenta otra vez.');
    } finally {
      setLoading(false);
    }
  };

  const handleNeedHelp = () => {
    openWhatsApp(`Hola, necesito ayuda con mi membresía Pollazo Plus.${customerName ? ` Soy ${customerName}.` : ''}${customerPhone ? ` Mi número registrado es ${customerPhone}.` : ''}`);
  };

  const subscribeButtonLabel = isExpiredOrCancelled ? 'Renovar Pollazo Plus' : 'Suscribirme a Plus';
  const subscriptionTitle = isExpiredOrCancelled ? 'Renueva tus beneficios Plus' : 'Pide sin pagar delivery';
  const subscriptionDescription = isExpiredOrCancelled
    ? 'Recupera delivery gratis dentro de cobertura, prioridad y beneficios especiales en pedidos seleccionados.'
    : 'Activa delivery gratis dentro de cobertura, prioridad y beneficios especiales en pedidos seleccionados.';

  return (
    <>
      <style>
        {`
          @keyframes pollazoPlusShine { 0% { transform: translateX(-120%) rotate(18deg); opacity: 0; } 18% { opacity: .5; } 48% { opacity: .25; } 100% { transform: translateX(180%) rotate(18deg); opacity: 0; } }
          @keyframes pollazoPlusFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          @keyframes pollazoPlusPop { 0% { transform: translateY(18px) scale(.94); opacity: 0; filter: blur(8px); } 70% { transform: translateY(-3px) scale(1.012); opacity: 1; filter: blur(0); } 100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); } }
          @keyframes pollazoPlusFade { 0% { opacity: 0; } 100% { opacity: 1; } }
          @keyframes pollazoPlusSheet { 0% { transform: translateY(100%); opacity: .7; } 100% { transform: translateY(0); opacity: 1; } }
          @keyframes pollazoPlusConfetti { 0% { transform: translate3d(0, -14px, 0) rotate(0deg); opacity: 0; } 14% { opacity: 1; } 100% { transform: translate3d(var(--x), 120px, 0) rotate(240deg); opacity: 0; } }
          .pollazo-plus-shine::after { content: ''; position: absolute; top: -35%; left: -45%; width: 42%; height: 175%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.86), transparent); animation: pollazoPlusShine 4.8s ease-in-out infinite; pointer-events: none; }
          .pollazo-plus-float { animation: pollazoPlusFloat 3.8s ease-in-out infinite; }
          .pollazo-plus-pop { animation: pollazoPlusPop 440ms cubic-bezier(.18,.89,.32,1.22) both; }
          .pollazo-plus-fade { animation: pollazoPlusFade 180ms ease-out both; }
          .pollazo-plus-sheet { animation: pollazoPlusSheet 320ms cubic-bezier(.16,1,.3,1) both; }
          .pollazo-plus-confetti { animation: pollazoPlusConfetti 920ms ease-out both; }
        `}
      </style>

      {hasPollazoPlus ? (
        <section className="pollazo-plus-shine relative overflow-hidden rounded-[36px] border border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-white p-5 shadow-lg shadow-orange-100/60 transition-transform active:scale-[0.99]" onClick={() => openDetails('active')}>
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-yellow-300/25 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="pollazo-plus-float flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white shadow-xl shadow-orange-300/50"><Crown size={29} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-orange-600">Pollazo Plus</p>
                <span className="rounded-full bg-green-500 px-2 py-1 text-[7px] font-black uppercase text-white">Activo</span>
              </div>
              <h3 className="mt-2 text-xl font-black uppercase italic leading-none text-gray-950">Envíos gratis activados</h3>
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-500">Toca para ver tu ahorro, beneficios y gestión de membresía.</p>
            </div>
            <ChevronRight className="mt-2 text-orange-500" size={20} />
          </div>
        </section>
      ) : isPending ? (
        <section className="relative overflow-hidden rounded-[36px] border border-orange-100 bg-white p-5 shadow-sm transition-transform active:scale-[0.99]" onClick={() => openDetails('subscribe')}>
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[24px] bg-orange-50 text-orange-500"><CalendarDays size={29} /></div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-orange-500">Pollazo Plus</p>
              <h3 className="mt-2 text-xl font-black uppercase italic leading-none text-gray-950">Solicitud en revisión</h3>
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-500">Cuando el negocio confirme la activación, tu app cambiará en tiempo real.</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="pollazo-plus-shine relative overflow-hidden rounded-[36px] border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-yellow-50 p-5 shadow-xl shadow-orange-100/70 transition-transform active:scale-[0.99]" onClick={() => openDetails('subscribe')}>
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="pollazo-plus-float flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white shadow-xl shadow-orange-200/70"><Crown size={29} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-orange-500">{isExpiredOrCancelled ? 'Vuelve a ser Plus' : 'Hazte Plus'}</p>
                <h3 className="mt-2 text-2xl font-black uppercase italic leading-none text-gray-950">{isExpiredOrCancelled ? 'Renueva tus beneficios' : 'Ser Plus te conviene'}</h3>
                <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-500">Delivery gratis durante el mes, prioridad y beneficios especiales.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <BenefitTile icon={<Truck size={17} />} title="Envíos gratis" desc="Todo el mes" />
              <BenefitTile icon={<Gift size={17} />} title="Sorpresas" desc="Según stock" />
              <BenefitTile icon={<ShieldCheck size={17} />} title="Prioridad" desc="Atención Plus" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-[28px] border border-orange-100 bg-white/90 p-3 shadow-sm">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Membresía mensual</p>
                <p className="mt-1 text-2xl font-black leading-none text-orange-600">{money(PLUS_PRICE)}<span className="text-[10px] font-bold text-gray-400"> / mes</span></p>
              </div>
              <button type="button" onClick={event => { event.stopPropagation(); openDetails('subscribe'); }} className="rounded-[22px] bg-gradient-to-r from-orange-500 to-yellow-400 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 active:scale-95">Ver Plus</button>
            </div>
          </div>
        </section>
      )}

      {showDetails && (
        <PortalLayer>
          <div className="fixed inset-0 z-[200000] flex flex-col bg-white text-gray-950 pollazo-plus-fade">
            {detailsView === 'cancel' && hasPollazoPlus ? (
              <>
                <div className="relative flex-shrink-0 overflow-hidden rounded-b-[34px] bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 px-6 pb-6 pt-[calc(env(safe-area-inset-top)+18px)] text-white">
                  <button type="button" onClick={() => setDetailsView('active')} className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur active:scale-90" aria-label="Volver"><ArrowLeft size={24} /></button>
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/80">Antes de cancelar</p>
                  <h2 className="mt-3 text-[32px] font-black uppercase italic leading-[0.92]">¿Seguro quieres dejar Plus?</h2>
                  <p className="mt-4 text-sm font-bold leading-relaxed text-white/92">Tu membresía ya te ayuda a ahorrar en delivery y mantener prioridad en tus pedidos.</p>
                </div>
                <main className="flex-1 overflow-hidden px-6 py-5">
                  <div className="rounded-[28px] border border-orange-100 bg-orange-50 p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500">Ahorro registrado</p>
                    <p className="mt-2 text-4xl font-black text-gray-950">{money(savingStats.totalSaving)}</p>
                    <p className="mt-1 text-[11px] font-bold text-gray-500">Con delivery gratis aplicado en tus pedidos.</p>
                  </div>
                  {notice && <div className="mt-4 rounded-[22px] border border-orange-100 bg-orange-50 p-3 text-[11px] font-bold text-orange-700">{notice}</div>}
                </main>
                <footer className="flex-shrink-0 space-y-3 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4 shadow-[0_-16px_36px_rgba(15,23,42,0.06)]">
                  <button type="button" onClick={() => setDetailsView('active')} className="h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 active:scale-95">Seguir con Plus</button>
                  <button type="button" disabled={loading} onClick={handleConfirmCancel} className="h-14 w-full rounded-[24px] bg-gray-100 text-sm font-black uppercase tracking-widest text-gray-700 active:scale-95 disabled:opacity-60">{loading ? 'Procesando...' : 'Confirmar solicitud de cancelación'}</button>
                </footer>
              </>
            ) : hasPollazoPlus && detailsView === 'active' ? (
              <>
                <div className="relative flex-shrink-0 overflow-hidden rounded-b-[34px] bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 px-6 pb-5 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
                  <button type="button" onClick={() => setShowDetails(false)} className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-950 shadow-lg active:scale-90" aria-label="Cerrar Pollazo Plus"><X size={24} /></button>
                  <PlusBadge />
                  <p className="mt-5 text-[9px] font-black uppercase tracking-[0.28em] text-white/80">La Casa del Pollazo</p>
                  <h2 className="mt-2 text-[30px] font-black uppercase italic leading-[0.92]">Tu Plus está activo</h2>
                  <p className="mt-3 text-sm font-bold leading-relaxed text-white/92">Revisa tu ahorro, beneficios y opciones de gestión.</p>
                </div>

                <main className="flex-1 overflow-hidden px-6 py-5">
                  <div className="rounded-[30px] border border-orange-100 bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-2 rounded-[22px] bg-orange-50 p-1">
                      <button type="button" onClick={() => setSavingTab('month')} className={`rounded-[18px] px-3 py-3 text-[11px] font-black transition-all ${savingTab === 'month' ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-100' : 'text-gray-500'}`}>Ahorro {monthName.toLowerCase()}</button>
                      <button type="button" onClick={() => setSavingTab('total')} className={`rounded-[18px] px-3 py-3 text-[11px] font-black transition-all ${savingTab === 'total' ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-100' : 'text-gray-500'}`}>Ahorro acumulado</button>
                    </div>

                    <div className="px-3 py-5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-orange-500">{savingTitle}</p>
                      <p className="mt-2 text-[46px] font-black leading-none text-gray-950">{money(currentSaving)}</p>
                      <p className="mt-2 text-[12px] font-black text-orange-600">{currentSaving > 0 ? '¡Estás aprovechando Plus!' : 'Aún no hay ahorro registrado'}</p>
                      <p className="mt-1 text-[10px] font-bold text-gray-400">{savingSubtitle}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-black text-gray-950">Ahorraste en este local</p>
                        <p className="mt-1 text-[10px] font-bold text-gray-500">{currentOrders.length > 0 ? `${currentOrders.length} pedido${currentOrders.length === 1 ? '' : 's'} con delivery gratis` : 'Compra con Plus para ver tu ahorro aquí'}</p>
                      </div>
                      <span className="text-lg font-black text-orange-600">+ {money(currentSaving)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <BenefitTile icon={<Truck size={17} />} title="Delivery gratis" desc="Dentro de cobertura" />
                    <BenefitTile icon={<ShieldCheck size={17} />} title="Prioridad" desc="Atención preferente" />
                    <BenefitTile icon={<Gift size={17} />} title="Sorpresas" desc="Según disponibilidad" />
                    <BenefitTile icon={<Bell size={17} />} title="Avisos" desc="Estados y recordatorios" />
                  </div>

                  <button type="button" onClick={() => setShowTerms(true)} className="mt-4 flex w-full items-center justify-between rounded-[26px] border border-gray-100 bg-white p-4 text-left shadow-sm active:scale-[0.99]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"><CalendarDays size={21} /></div>
                      <div>
                        <p className="text-[12px] font-black text-gray-950">Condiciones de tu membresía</p>
                        <p className="text-[10px] font-bold text-gray-500">Cobertura, beneficios y uso correcto</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                  </button>

                  {notice && <div className="mt-3 rounded-[22px] border border-orange-100 bg-orange-50 p-3 text-[11px] font-bold text-orange-700">{notice}</div>}
                </main>

                <footer className="flex-shrink-0 space-y-3 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4 shadow-[0_-16px_36px_rgba(15,23,42,0.06)]">
                  <button type="button" onClick={handleNeedHelp} className="h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 active:scale-95"><span className="inline-flex items-center gap-2"><Headphones size={18} /> Necesito ayuda</span></button>
                  <button type="button" onClick={() => { setNotice(''); setDetailsView('cancel'); }} className="h-14 w-full rounded-[24px] bg-gray-100 text-sm font-black uppercase tracking-widest text-gray-700 active:scale-95">Solicitar cancelación</button>
                </footer>
              </>
            ) : (
              <>
                <div className="relative flex-shrink-0 overflow-hidden rounded-b-[34px] bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 px-6 pb-5 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
                  <button type="button" onClick={() => setShowDetails(false)} className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-950 shadow-lg active:scale-90" aria-label="Cerrar Pollazo Plus"><X size={24} /></button>
                  <PlusBadge />
                  <p className="mt-5 text-[9px] font-black uppercase tracking-[0.28em] text-white/80">La Casa del Pollazo</p>
                  <h2 className="mt-2 text-[30px] font-black uppercase italic leading-[0.92]">{subscriptionTitle}</h2>
                  <p className="mt-3 text-sm font-bold leading-relaxed text-white/92">{subscriptionDescription}</p>
                </div>
                <main className="flex-1 overflow-hidden px-6 py-5">
                  <div className="grid grid-cols-2 gap-3">
                    <BenefitTile icon={<Truck size={17} />} title="Delivery gratis" desc="Todo el mes" />
                    <BenefitTile icon={<ShieldCheck size={17} />} title="Prioridad" desc="Atención preferente" />
                    <BenefitTile icon={<Gift size={17} />} title="Beneficios" desc="Sorpresas según stock" />
                    <BenefitTile icon={<Lock size={17} />} title="Sin contrato" desc="Puedes solicitar cancelar" />
                  </div>
                  <div className="mt-4 rounded-[28px] border border-orange-100 bg-orange-50 p-4">
                    <div className="flex items-start gap-3">
                      <WalletCards className="mt-0.5 flex-shrink-0 text-orange-500" size={24} />
                      <div>
                        <p className="text-[13px] font-black text-gray-950">Pago de membresía</p>
                        <p className="mt-1 text-[11px] font-bold leading-relaxed text-gray-500">Por ahora se registra una solicitud para que el admin active Plus. Luego conectaremos el cobro real con tarjeta.</p>
                      </div>
                    </div>
                  </div>
                  {notice && <div className="mt-3 rounded-[22px] border border-orange-100 bg-orange-50 p-3 text-[11px] font-bold text-orange-700">{notice}</div>}
                </main>
                <footer className="flex-shrink-0 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-[0_-16px_36px_rgba(15,23,42,0.06)]">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Suscripción mensual</p>
                      <p className="mt-1 text-[34px] font-black leading-none text-orange-600">{money(PLUS_PRICE)}<span className="text-[12px] font-bold text-gray-400"> / mes</span></p>
                    </div>
                    <div className="text-right"><p className="text-[10px] font-black uppercase text-green-600">Sin contrato</p><p className="mt-1 text-[10px] font-bold text-gray-400">Cancela cuando quieras</p></div>
                  </div>
                  <button type="button" disabled={loading || isPending} onClick={handleSubscribe} className="h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 active:scale-95 disabled:opacity-55"><span className="inline-flex items-center gap-2"><Crown size={18} /> {isPending ? 'Solicitud pendiente' : subscribeButtonLabel}</span></button>
                  <button type="button" onClick={() => setShowTerms(true)} className="mt-3 w-full text-center text-[10px] font-bold text-gray-400">Al continuar, aceptas <span className="font-black text-orange-600 underline">términos y condiciones.</span></button>
                </footer>
              </>
            )}
          </div>
        </PortalLayer>
      )}

      {showCelebrate && hasPollazoPlus && (
        <PortalLayer>
          <div className="fixed inset-0 z-[250000] flex items-center justify-center bg-gray-950/45 px-6 backdrop-blur-[2px] pollazo-plus-fade">
            <div className="relative w-full max-w-[390px] overflow-hidden rounded-[36px] bg-white p-8 text-center shadow-2xl pollazo-plus-pop">
              <button type="button" onClick={() => setShowCelebrate(false)} className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-500 active:scale-90" aria-label="Cerrar celebración"><X size={22} /></button>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-xl shadow-orange-200"><Sparkles size={38} /></div>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Felicidades</p>
              <h3 className="mt-3 text-3xl font-black uppercase italic leading-none text-gray-950">Ya eres Pollazo Plus</h3>
              <p className="mt-4 text-sm font-bold leading-relaxed text-gray-500">Tu delivery gratis quedó activado. Desde ahora puedes aprovechar beneficios especiales.</p>
              <button type="button" onClick={() => { setShowCelebrate(false); openDetails('active'); }} className="mt-6 h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 active:scale-95">Ver mis beneficios</button>
              <button type="button" onClick={() => setShowCelebrate(false)} className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400">Cerrar</button>
            </div>
          </div>
        </PortalLayer>
      )}

      <TermsSheet open={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}
