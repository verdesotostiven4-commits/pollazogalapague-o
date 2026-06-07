import React, { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Gift,
  Headphones,
  HelpCircle,
  Lock,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Star,
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

const PLUS_PRICE = 6.99;
const DELIVERY_SAMPLE_PRICE = 1.5;

const STORAGE_KEYS = {
  lastCelebrated: 'pollazo_plus_last_celebrated_key',
  openPlusSignal: 'pollazo_open_plus',
};

const formatDate = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getDaysLeft = (value?: string | null) => {
  if (!value) return null;

  const expires = new Date(value).getTime();

  if (Number.isNaN(expires)) return null;

  const diff = expires - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const openWhatsApp = (message: string) => {
  const cleanPhone = String(STORE_WHATSAPP || '').replace(/\D/g, '');

  if (!cleanPhone) return;

  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
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
    gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.58);
    gain.connect(context.destination);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.11);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.11);
      oscillator.stop(context.currentTime + index * 0.11 + 0.18);
    });

    window.setTimeout(() => {
      context.close().catch(() => undefined);
    }, 900);
  } catch {
    // Sonido decorativo: si el navegador lo bloquea, la app sigue funcionando.
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

function BenefitTile({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
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

function BenefitPill({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-orange-100 bg-white p-3 shadow-sm">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase leading-tight text-gray-950">{title}</p>
        <p className="mt-1 text-[10px] font-bold leading-snug text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function TermsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const terms = [
    {
      title: 'Pago mensual',
      text: `Pollazo Plus tiene un valor de $${PLUS_PRICE.toFixed(2)} mensuales. Por ahora se registra una solicitud y el negocio puede activarla manualmente. Cuando se conecte pago con tarjeta, el cobro será mensual mientras la membresía esté activa.`,
    },
    {
      title: 'Delivery gratis',
      text: 'El beneficio principal es delivery gratis durante el periodo activo, dentro de la zona de cobertura del negocio.',
    },
    {
      title: 'Beneficios especiales',
      text: 'Los regalos, extras o descuentos dependen de disponibilidad, stock, temporada y decisión del negocio. No se garantizan en todos los pedidos.',
    },
    {
      title: 'Cancelación',
      text: 'El cliente puede solicitar cancelar la membresía. Los beneficios ya activados se mantienen hasta el vencimiento del periodo correspondiente.',
    },
    {
      title: 'Uso correcto',
      text: 'La membresía es personal para el número de WhatsApp registrado. El negocio puede revisar, pausar o cancelar beneficios si detecta abuso, datos falsos o mal uso del servicio.',
    },
  ];

  return (
    <PortalLayer>
      <div className="fixed inset-0 z-[2147483647] flex items-end bg-gray-950/55 backdrop-blur-[1px] pollazo-plus-fade">
        <button
          type="button"
          aria-label="Cerrar términos"
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />

        <section className="relative z-10 flex h-[62dvh] max-h-[560px] w-full flex-col rounded-t-[34px] bg-white text-gray-950 shadow-2xl pollazo-plus-sheet">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-200" />

          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-6 pb-4 pt-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-orange-500">Pollazo Plus</p>
              <h3 className="mt-1 text-2xl font-black uppercase italic leading-none text-gray-950">Condiciones</h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-500 transition-transform active:scale-90"
              aria-label="Cerrar términos"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 pb-[calc(env(safe-area-inset-bottom)+22px)]">
            <div className="rounded-[26px] border border-orange-100 bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
              <p className="text-[12px] font-black leading-relaxed text-orange-800">
                Pollazo Plus es una membresía mensual de beneficios para clientes de La Casa del Pollazo: delivery gratis dentro de cobertura, prioridad y beneficios especiales.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {terms.map(item => (
                <div key={item.title} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="text-sm font-black uppercase text-gray-950">{item.title}</p>
                  <p className="mt-2 text-[12px] font-bold leading-relaxed text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PortalLayer>
  );
}

type DetailsView = 'subscribe' | 'active' | 'cancel';

export default function PollazoPlusProCard({ onNavigate }: Props) {
  const { requestMembership, cancelMembership } = useAdmin();

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
  const [showTerms, setShowTerms] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const expiresAt = activeMembership?.expires_at || pollazoPlusExpiresAt;
  const expiresLabel = formatDate(expiresAt);
  const daysLeft = getDaysLeft(expiresAt);
  const isExpiredOrCancelled = membershipStatus === 'expired' || membershipStatus === 'cancelled';
  const isPending = membershipStatus === 'pending';
  const isExpiringSoon = hasPollazoPlus && typeof daysLeft === 'number' && daysLeft <= 3;
  const estimatedMonthSaving = useMemo(() => DELIVERY_SAMPLE_PRICE * 4, []);

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
    sessionStorage.removeItem(STORAGE_KEYS.openPlusSignal);
    openDetails(hasPollazoPlus ? 'active' : 'subscribe');

    window.setTimeout(() => {
      refreshMembership().catch(() => undefined);
    }, 150);
  }, [hasPollazoPlus, openDetails, refreshMembership]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const shouldOpenFromUrl =
      params.get('plus') === '1' ||
      params.has('membershipReminder') ||
      params.has('membershipId');

    const shouldOpenFromSession = sessionStorage.getItem(STORAGE_KEYS.openPlusSignal) === '1';

    if (shouldOpenFromUrl || shouldOpenFromSession) {
      openDetailsFromExternalSignal();
    }
  }, [openDetailsFromExternalSignal]);

  useEffect(() => {
    const handleOpenPlus = () => {
      openDetailsFromExternalSignal();
    };

    window.addEventListener('pollazo:open-plus', handleOpenPlus);

    return () => {
      window.removeEventListener('pollazo:open-plus', handleOpenPlus);
    };
  }, [openDetailsFromExternalSignal]);

  useEffect(() => {
    if (!hasPollazoPlus || !celebrationKey) return undefined;

    const lastCelebrated = localStorage.getItem(STORAGE_KEYS.lastCelebrated);

    if (lastCelebrated === celebrationKey) return undefined;

    const timer = window.setTimeout(() => {
      setShowCelebrate(true);
      localStorage.setItem(STORAGE_KEYS.lastCelebrated, celebrationKey);
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
          ? 'Solicitud de renovación Pollazo Plus desde pantalla completa compacta. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.'
          : 'Solicitud Pollazo Plus desde pantalla completa compacta. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.',
      });

      await refreshMembership();

      setNotice(
        isExpiredOrCancelled
          ? 'Solicitud de renovación enviada. El negocio podrá reactivar tu Plus manualmente mientras se integra el pago con tarjeta.'
          : 'Solicitud enviada. El negocio podrá activar tu Plus manualmente mientras se integra el pago con tarjeta.'
      );
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
      await cancelMembership(
        activeMembership.id,
        'Cancelación solicitada por el cliente desde confirmación Pollazo Plus.'
      );
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
    openWhatsApp(
      `Hola, necesito ayuda con mi membresía Pollazo Plus.${customerName ? ` Soy ${customerName}.` : ''}${customerPhone ? ` Mi número registrado es ${customerPhone}.` : ''}`
    );
  };

  const subscribeVerb = isExpiredOrCancelled ? 'Renovar' : 'Suscríbete';
  const subscribeButtonLabel = isExpiredOrCancelled ? 'Renovar Pollazo Plus' : 'Suscribirme a Plus';

  const subscriptionTitle = isExpiredOrCancelled
    ? 'Renueva tus beneficios Plus'
    : 'Pide sin pagar delivery';

  const subscriptionDescription = isExpiredOrCancelled
    ? 'Recupera delivery gratis dentro de cobertura, prioridad y beneficios especiales en pedidos seleccionados.'
    : 'Activa delivery gratis dentro de cobertura, prioridad y beneficios especiales en pedidos seleccionados.';

  return (
    <>
      <style>
        {`
          @keyframes pollazoPlusShine {
            0% { transform: translateX(-120%) rotate(18deg); opacity: 0; }
            18% { opacity: .5; }
            48% { opacity: .25; }
            100% { transform: translateX(180%) rotate(18deg); opacity: 0; }
          }

          @keyframes pollazoPlusFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }

          @keyframes pollazoPlusPop {
            0% { transform: translateY(18px) scale(.94); opacity: 0; filter: blur(8px); }
            70% { transform: translateY(-3px) scale(1.012); opacity: 1; filter: blur(0); }
            100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
          }

          @keyframes pollazoPlusFade {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }

          @keyframes pollazoPlusSheet {
            0% { transform: translateY(100%); opacity: .7; }
            100% { transform: translateY(0); opacity: 1; }
          }

          @keyframes pollazoPlusConfetti {
            0% { transform: translate3d(0, -14px, 0) rotate(0deg); opacity: 0; }
            14% { opacity: 1; }
            100% { transform: translate3d(var(--x), 120px, 0) rotate(240deg); opacity: 0; }
          }

          .pollazo-plus-shine::after {
            content: '';
            position: absolute;
            top: -35%;
            left: -45%;
            width: 42%;
            height: 175%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.86), transparent);
            animation: pollazoPlusShine 4.8s ease-in-out infinite;
            pointer-events: none;
          }

          .pollazo-plus-float { animation: pollazoPlusFloat 3.8s ease-in-out infinite; }
          .pollazo-plus-pop { animation: pollazoPlusPop 440ms cubic-bezier(.18,.89,.32,1.22) both; }
          .pollazo-plus-fade { animation: pollazoPlusFade 180ms ease-out both; }
          .pollazo-plus-sheet { animation: pollazoPlusSheet 320ms cubic-bezier(.16,1,.3,1) both; }
          .pollazo-plus-confetti { animation: pollazoPlusConfetti 920ms ease-out both; }
        `}
      </style>

      {hasPollazoPlus ? (
        <section
          className="pollazo-plus-shine relative overflow-hidden rounded-[36px] border border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-white p-5 shadow-lg shadow-orange-100/60 transition-transform active:scale-[0.99]"
          onClick={() => openDetails('active')}
        >
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-yellow-300/25 blur-3xl" />
          <div className="absolute -left-12 -bottom-16 h-40 w-40 rounded-full bg-orange-400/15 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="pollazo-plus-float flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white shadow-xl shadow-orange-300/50">
              <Crown size={29} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-orange-600">Pollazo Plus</p>
                <span className="rounded-full bg-green-500 px-2 py-1 text-[7px] font-black uppercase text-white">Activo</span>
                {isExpiringSoon && (
                  <span className="animate-pulse rounded-full bg-orange-500 px-2 py-1 text-[7px] font-black uppercase text-white">Vence pronto</span>
                )}
              </div>

              <h3 className="mt-2 text-xl font-black uppercase italic leading-none text-gray-950">Envíos gratis activados</h3>
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-500">
                Tu membresía aplica delivery gratis, prioridad y beneficios especiales.
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Vigencia</p>
                  <p className="mt-1 text-[11px] font-black uppercase text-orange-600">
                    {expiresLabel || 'Activa'}{daysLeft !== null ? ` · ${daysLeft} día${daysLeft === 1 ? '' : 's'}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    openDetails('active');
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white text-orange-500 shadow-sm transition-transform active:scale-90"
                  aria-label="Ver beneficios Pollazo Plus"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : isPending ? (
        <section
          className="relative overflow-hidden rounded-[36px] border border-orange-100 bg-white p-5 shadow-sm transition-transform active:scale-[0.99]"
          onClick={() => openDetails('subscribe')}
        >
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-orange-300/15 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[24px] bg-orange-50 text-orange-500">
              <Clock size={29} />
            </div>

            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-orange-500">Pollazo Plus</p>
              <h3 className="mt-2 text-xl font-black uppercase italic leading-none text-gray-950">Solicitud en revisión</h3>
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-500">
                Tu solicitud ya está enviada. Cuando el negocio confirme la activación, tu app cambiará en tiempo real.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section
          className="pollazo-plus-shine relative overflow-hidden rounded-[36px] border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-yellow-50 p-5 shadow-xl shadow-orange-100/70 transition-transform active:scale-[0.99]"
          onClick={() => openDetails('subscribe')}
        >
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-300/25 blur-3xl" />
          <div className="absolute -left-14 -bottom-20 h-52 w-52 rounded-full bg-yellow-300/25 blur-3xl" />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="pollazo-plus-float flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white shadow-xl shadow-orange-200/70">
                <Crown size={29} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-orange-500">{isExpiredOrCancelled ? 'Vuelve a ser Plus' : 'Hazte Plus'}</p>
                <h3 className="mt-2 text-2xl font-black uppercase italic leading-none text-gray-950">{isExpiredOrCancelled ? 'Renueva tus beneficios' : 'Ser Plus te conviene'}</h3>
                <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-500">
                  {isExpiredOrCancelled
                    ? 'Recupera delivery gratis, prioridad y beneficios especiales en tus pedidos.'
                    : 'Delivery gratis durante el mes, prioridad y beneficios especiales para clientes frecuentes.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <BenefitTile icon={<Truck size={17} />} title="Envíos gratis" desc="Todo el mes" />
              <BenefitTile icon={<Gift size={17} />} title="Sorpresas" desc="Según stock" />
              <BenefitTile icon={<Star size={17} />} title="Prioridad" desc="Atención Plus" />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[28px] border border-orange-100 bg-white/90 p-3 shadow-sm">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Membresía mensual</p>
                <p className="mt-1 text-2xl font-black leading-none text-orange-600">
                  ${PLUS_PRICE.toFixed(2)}<span className="text-[10px] font-bold text-gray-400"> / mes</span>
                </p>
              </div>

              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  openDetails('subscribe');
                }}
                className="flex items-center gap-2 rounded-[22px] bg-gradient-to-r from-orange-500 to-yellow-400 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 transition-transform active:scale-95"
              >
                {subscribeVerb}
                <ChevronRight size={15} />
              </button>
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
                  <button
                    type="button"
                    onClick={() => setDetailsView('active')}
                    className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur transition-transform active:scale-90"
                    aria-label="Volver"
                  >
                    <ArrowLeft size={24} />
                  </button>

                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/80">Antes de cancelar</p>
                  <h2 className="mt-3 text-[34px] font-black uppercase italic leading-[0.92]">¿Seguro quieres dejar Plus?</h2>
                  <p className="mt-4 text-sm font-bold leading-relaxed text-white/92">
                    Tu membresía ya te ayuda a ahorrar en delivery y mantener prioridad en tus pedidos.
                  </p>
                </div>

                <main className="flex-1 overflow-hidden px-6 py-5">
                  <div className="rounded-[28px] border border-orange-100 bg-orange-50 p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500">Ahorro estimado</p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-black text-gray-950">${estimatedMonthSaving.toFixed(2)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-500">Si haces 4 pedidos al mes</p>
                      </div>
                      <Truck className="text-orange-500" size={34} />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <BenefitTile icon={<Truck size={17} />} title="Delivery" desc="Gratis dentro de cobertura" />
                    <BenefitTile icon={<Bell size={17} />} title="Avisos" desc="Recordatorios Plus" />
                    <BenefitTile icon={<Gift size={17} />} title="Beneficios" desc="Según disponibilidad" />
                    <BenefitTile icon={<ShieldCheck size={17} />} title="Prioridad" desc="Atención preferente" />
                  </div>

                  {notice && (
                    <div className="mt-4 rounded-[22px] border border-orange-100 bg-orange-50 p-3 text-[11px] font-bold text-orange-700">
                      {notice}
                    </div>
                  )}
                </main>

                <footer className="flex-shrink-0 space-y-3 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4 shadow-[0_-16px_36px_rgba(15,23,42,0.06)]">
                  <button
                    type="button"
                    onClick={() => setDetailsView('active')}
                    className="h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 transition-transform active:scale-95"
                  >
                    Seguir con Plus
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleConfirmCancel}
                    className="h-14 w-full rounded-[24px] bg-gray-100 text-sm font-black uppercase tracking-widest text-gray-700 transition-transform active:scale-95 disabled:opacity-60"
                  >
                    {loading ? 'Procesando...' : 'Confirmar solicitud de cancelación'}
                  </button>
                </footer>
              </>
            ) : hasPollazoPlus && detailsView === 'active' ? (
              <>
                <div className="relative flex-shrink-0 overflow-hidden rounded-b-[34px] bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 px-6 pb-6 pt-[calc(env(safe-area-inset-top)+18px)] text-white">
                  <div className="absolute -right-16 -top-14 h-52 w-52 rounded-full bg-yellow-300/20 blur-3xl" />
                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-950 shadow-lg transition-transform active:scale-90"
                    aria-label="Cerrar Pollazo Plus"
                  >
                    <X size={24} />
                  </button>

                  <PlusBadge />
                  <p className="mt-7 text-[9px] font-black uppercase tracking-[0.28em] text-white/80">La Casa del Pollazo</p>
                  <h2 className="mt-3 text-[34px] font-black uppercase italic leading-[0.92]">Tu Plus está activo</h2>
                  <p className="mt-4 text-sm font-bold leading-relaxed text-white/92">
                    Revisa tu ahorro, beneficios, vigencia y opciones de gestión desde un solo lugar.
                  </p>
                </div>

                <main className="flex-1 overflow-hidden px-6 py-5">
                  <div className="grid grid-cols-[1.1fr_.9fr] gap-3">
                    <div className="rounded-[28px] bg-orange-50 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500">Ahorro estimado</p>
                      <p className="mt-2 text-4xl font-black text-gray-950">${estimatedMonthSaving.toFixed(2)}</p>
                      <p className="mt-1 text-[10px] font-bold text-gray-500">4 deliveries al mes</p>
                    </div>
                    <div className="rounded-[28px] bg-gray-50 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">Vigencia</p>
                      <p className="mt-2 text-sm font-black uppercase leading-tight text-gray-950">{expiresLabel || 'Activa'}</p>
                      {daysLeft !== null && <p className="mt-1 text-[10px] font-bold text-gray-500">{daysLeft} día{daysLeft === 1 ? '' : 's'} restantes</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <BenefitTile icon={<Truck size={17} />} title="Delivery gratis" desc="Dentro de cobertura" />
                    <BenefitTile icon={<ShieldCheck size={17} />} title="Prioridad" desc="Atención preferente" />
                    <BenefitTile icon={<Gift size={17} />} title="Sorpresas" desc="Según disponibilidad" />
                    <BenefitTile icon={<Bell size={17} />} title="Avisos" desc="Estados y recordatorios" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="mt-4 flex w-full items-center justify-between rounded-[26px] border border-gray-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                        <CalendarDays size={21} />
                      </div>
                      <div>
                        <p className="text-[12px] font-black text-gray-950">Condiciones de tu membresía</p>
                        <p className="text-[10px] font-bold text-gray-500">Cobertura, beneficios y uso correcto</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                  </button>

                  {notice && (
                    <div className="mt-3 rounded-[22px] border border-orange-100 bg-orange-50 p-3 text-[11px] font-bold text-orange-700">
                      {notice}
                    </div>
                  )}
                </main>

                <footer className="flex-shrink-0 space-y-3 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4 shadow-[0_-16px_36px_rgba(15,23,42,0.06)]">
                  <button
                    type="button"
                    onClick={handleNeedHelp}
                    className="h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 transition-transform active:scale-95"
                  >
                    <span className="inline-flex items-center gap-2"><Headphones size={18} /> Necesito ayuda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice('');
                      setDetailsView('cancel');
                    }}
                    className="h-14 w-full rounded-[24px] bg-gray-100 text-sm font-black uppercase tracking-widest text-gray-700 transition-transform active:scale-95"
                  >
                    Solicitar cancelación
                  </button>
                </footer>
              </>
            ) : (
              <>
                <div className="relative flex-shrink-0 overflow-hidden rounded-b-[34px] bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 px-6 pb-6 pt-[calc(env(safe-area-inset-top)+18px)] text-white">
                  <div className="absolute -right-16 -top-14 h-52 w-52 rounded-full bg-yellow-300/20 blur-3xl" />

                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-950 shadow-lg transition-transform active:scale-90"
                    aria-label="Cerrar Pollazo Plus"
                  >
                    <X size={24} />
                  </button>

                  <PlusBadge />
                  <p className="mt-7 text-[9px] font-black uppercase tracking-[0.28em] text-white/80">La Casa del Pollazo</p>
                  <h2 className="mt-3 text-[34px] font-black uppercase italic leading-[0.92]">{subscriptionTitle}</h2>
                  <p className="mt-4 text-sm font-bold leading-relaxed text-white/92">{subscriptionDescription}</p>
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
                        <p className="mt-1 text-[11px] font-bold leading-relaxed text-gray-500">
                          Por ahora se registra una solicitud para que el admin active Plus. Luego conectaremos el cobro real con tarjeta.
                        </p>
                      </div>
                    </div>
                  </div>

                  {notice && (
                    <div className="mt-3 rounded-[22px] border border-orange-100 bg-orange-50 p-3 text-[11px] font-bold text-orange-700">
                      {notice}
                    </div>
                  )}
                </main>

                <footer className="flex-shrink-0 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-[0_-16px_36px_rgba(15,23,42,0.06)]">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Suscripción mensual</p>
                      <p className="mt-1 text-[34px] font-black leading-none text-orange-600">
                        ${PLUS_PRICE.toFixed(2)}<span className="text-[12px] font-bold text-gray-400"> / mes</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-green-600">Sin contrato</p>
                      <p className="mt-1 text-[10px] font-bold text-gray-400">Cancela cuando quieras</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading || isPending}
                    onClick={handleSubscribe}
                    className="h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 transition-transform active:scale-95 disabled:opacity-55"
                  >
                    <span className="inline-flex items-center gap-2"><Crown size={18} /> {isPending ? 'Solicitud pendiente' : subscribeButtonLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="mt-3 w-full text-center text-[10px] font-bold text-gray-400"
                  >
                    Al continuar, aceptas <span className="font-black text-orange-600 underline">términos y condiciones.</span>
                  </button>
                </footer>
              </>
            )}
          </div>
        </PortalLayer>
      )}

      {showCelebrate && hasPollazoPlus && (
        <PortalLayer>
          <div className="fixed inset-0 z-[210000] flex items-center justify-center bg-gray-950/55 px-6 backdrop-blur-sm pollazo-plus-fade">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[36px] bg-white p-6 text-center shadow-2xl pollazo-plus-pop">
              <button
                type="button"
                onClick={() => setShowCelebrate(false)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-500 transition-transform active:scale-90"
                aria-label="Cerrar celebración Pollazo Plus"
              >
                <X size={22} />
              </button>

              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 overflow-hidden">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span
                    key={index}
                    className="pollazo-plus-confetti absolute top-5 h-2 w-2 rounded-full bg-orange-400"
                    style={
                      {
                        left: `${8 + index * 5.7}%`,
                        '--x': `${index % 2 === 0 ? '-' : ''}${26 + index * 3}px`,
                        animationDelay: `${index * 38}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>

              <div className="mx-auto mt-7 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white shadow-xl shadow-orange-200">
                <PartyPopper size={42} />
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">Felicidades</p>
              <h3 className="mt-3 text-3xl font-black uppercase italic leading-none text-gray-950">Ya eres Pollazo Plus</h3>
              <p className="mx-auto mt-4 max-w-[280px] text-sm font-bold leading-relaxed text-gray-500">
                Tu delivery gratis quedó activado. Desde ahora podrás recibir prioridad y beneficios especiales.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <MiniCelebrate icon={<Truck size={18} />} title="Delivery" desc="Gratis" />
                <MiniCelebrate icon={<Gift size={18} />} title="Beneficios" desc="Especiales" />
                <MiniCelebrate icon={<Crown size={18} />} title="Plus" desc="Activo" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCelebrate(false);
                  openDetails('active');
                }}
                className="mt-6 h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 transition-transform active:scale-95"
              >
                Ver mis beneficios
              </button>

              <button
                type="button"
                onClick={() => setShowCelebrate(false)}
                className="mt-4 text-xs font-black uppercase tracking-wider text-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        </PortalLayer>
      )}

      <TermsSheet open={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}

function MiniCelebrate({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[22px] border border-orange-100 bg-white p-3 shadow-sm">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
        {icon}
      </div>
      <p className="mt-3 text-[9px] font-black uppercase leading-tight text-gray-950">{title}</p>
      <p className="mt-1 text-[9px] font-bold text-gray-500">{desc}</p>
    </div>
  );
}
