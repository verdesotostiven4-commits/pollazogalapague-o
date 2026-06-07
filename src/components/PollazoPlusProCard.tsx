import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Gift,
  HelpCircle,
  Lock,
  PartyPopper,
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
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
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
    // El sonido es decorativo. Si el navegador lo bloquea, la app sigue normal.
  }
};

function PortalLayer({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}

function MiniBenefit({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[24px] bg-white border border-orange-100 p-3 shadow-sm">
      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-[10px] font-black text-gray-950 uppercase leading-tight">
        {title}
      </p>
      <p className="text-[9px] font-bold text-gray-500 leading-snug mt-1">
        {desc}
      </p>
    </div>
  );
}

function BenefitRow({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] bg-white border border-orange-100 p-3 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-black text-gray-950 uppercase leading-tight">
          {title}
        </p>
        <p className="text-[10px] font-bold text-gray-500 leading-snug mt-1">
          {desc}
        </p>
      </div>
    </div>
  );
}

function TermsScreen({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <PortalLayer>
      <div className="fixed inset-0 z-[2147483647] bg-white text-gray-950 flex flex-col">
        <div className="px-6 pt-[calc(env(safe-area-inset-top)+22px)] pb-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-gray-50 text-gray-950 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Cerrar términos"
          >
            <X size={24} />
          </button>

          <div className="text-center">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">
              Pollazo Plus
            </p>
            <h3 className="text-base font-black uppercase leading-none mt-1">
              Términos
            </h3>
          </div>

          <div className="w-12" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-[calc(env(safe-area-inset-bottom)+28px)] space-y-5">
          <div className="rounded-[28px] bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 p-5">
            <p className="text-[12px] font-black text-orange-800 leading-relaxed">
              Pollazo Plus es una membresía mensual de beneficios para clientes de La Casa del Pollazo. Está pensada para compras más cómodas, delivery gratis dentro de cobertura y beneficios sorpresa.
            </p>
          </div>

          {[
            {
              title: 'Pago mensual',
              text: `La membresía tiene un valor de $${PLUS_PRICE.toFixed(2)} mensuales. Por ahora se registra una solicitud y el negocio puede activarla manualmente. Cuando se conecte pago con tarjeta, el cobro será mensual mientras la membresía esté activa.`,
            },
            {
              title: 'Delivery gratis',
              text: 'El beneficio principal es delivery gratis durante el periodo activo, dentro de la zona de cobertura del negocio.',
            },
            {
              title: 'Beneficios sorpresa',
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
          ].map(item => (
            <div key={item.title} className="border-b border-gray-100 pb-5 last:border-0">
              <p className="text-sm font-black text-gray-950 uppercase">
                {item.title}
              </p>
              <p className="text-[12px] font-bold text-gray-500 leading-relaxed mt-2">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PortalLayer>
  );
}

type DetailsView = 'overview' | 'cancel';

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
  const [detailsView, setDetailsView] = useState<DetailsView>('overview');
  const [showTerms, setShowTerms] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const expiresAt = activeMembership?.expires_at || pollazoPlusExpiresAt;
  const expiresLabel = formatDate(expiresAt);
  const daysLeft = getDaysLeft(expiresAt);

  const isExpiredOrCancelled =
    membershipStatus === 'expired' || membershipStatus === 'cancelled';

  const isPending = membershipStatus === 'pending';

  const isExpiringSoon =
    hasPollazoPlus && typeof daysLeft === 'number' && daysLeft <= 3;

  const estimatedMonthSaving = useMemo(() => DELIVERY_SAMPLE_PRICE * 4, []);

  const celebrationKey = useMemo(() => {
    if (!hasPollazoPlus) return '';
    return `${activeMembership?.id || 'plus'}-${expiresAt || 'sin-fecha'}`;
  }, [activeMembership?.id, expiresAt, hasPollazoPlus]);

  const openDetailsFromExternalSignal = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.openPlusSignal);
    setNotice('');
    setDetailsView('overview');
    setShowDetails(true);

    window.setTimeout(() => {
      refreshMembership().catch(() => undefined);
    }, 150);
  }, [refreshMembership]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const shouldOpenFromUrl =
      params.get('plus') === '1' ||
      params.has('membershipReminder') ||
      params.has('membershipId');

    const shouldOpenFromSession =
      sessionStorage.getItem(STORAGE_KEYS.openPlusSignal) === '1';

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
    }, 500);

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
          ? 'Solicitud de renovación Pollazo Plus desde pantalla completa. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.'
          : 'Solicitud Pollazo Plus desde pantalla completa. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.',
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
      setDetailsView('overview');
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
      setDetailsView('overview');
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

  const openSubscribeModal = () => {
    setNotice('');
    setDetailsView('overview');
    setShowDetails(true);
  };

  const subscribeVerb = isExpiredOrCancelled ? 'Renovar' : 'Suscríbete';

  const subscribeButtonLabel = isExpiredOrCancelled
    ? 'Renovar Pollazo Plus'
    : 'Suscribirme a Plus';

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
            0% { transform: translateY(22px) scale(.92); opacity: 0; filter: blur(8px); }
            70% { transform: translateY(-3px) scale(1.015); opacity: 1; filter: blur(0); }
            100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
          }

          @keyframes pollazoPlusFade {
            0% { opacity: 0; }
            100% { opacity: 1; }
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
            animation: pollazoPlusShine 4.6s ease-in-out infinite;
            pointer-events: none;
          }

          .pollazo-plus-float {
            animation: pollazoPlusFloat 3.8s ease-in-out infinite;
          }

          .pollazo-plus-pop {
            animation: pollazoPlusPop 460ms cubic-bezier(.18,.89,.32,1.22) both;
          }

          .pollazo-plus-fade {
            animation: pollazoPlusFade 180ms ease-out both;
          }

          .pollazo-plus-confetti {
            animation: pollazoPlusConfetti 920ms ease-out both;
          }
        `}
      </style>

      {hasPollazoPlus ? (
        <section
          className="relative overflow-hidden rounded-[36px] border border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-white p-5 shadow-lg shadow-orange-100/60 pollazo-plus-shine active:scale-[0.99] transition-transform"
          onClick={() => {
            setDetailsView('overview');
            setShowDetails(true);
          }}
        >
          <div className="absolute -right-14 -top-14 w-44 h-44 bg-yellow-300/25 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-16 w-40 h-40 bg-orange-400/15 rounded-full blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="pollazo-plus-float w-14 h-14 rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-300/50 flex-shrink-0">
              <Crown size={29} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-[0.24em]">
                  Pollazo Plus
                </p>

                <span className="bg-green-500 text-white text-[7px] font-black px-2 py-1 rounded-full uppercase">
                  Activo
                </span>

                {isExpiringSoon && (
                  <span className="bg-orange-500 text-white text-[7px] font-black px-2 py-1 rounded-full uppercase animate-pulse">
                    Vence pronto
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none mt-2">
                Envíos gratis activados
              </h3>

              <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">
                Tu membresía está lista para aplicar delivery gratis, prioridad y beneficios especiales en pedidos seleccionados.
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                    Vigencia
                  </p>
                  <p className="text-[11px] font-black text-orange-600 uppercase mt-1">
                    {expiresLabel || 'Activa'}
                    {daysLeft !== null ? ` · ${daysLeft} día${daysLeft === 1 ? '' : 's'}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setDetailsView('overview');
                    setShowDetails(true);
                  }}
                  className="w-10 h-10 rounded-2xl bg-white text-orange-500 border border-orange-100 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
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
          className="relative overflow-hidden rounded-[36px] border border-orange-100 bg-white p-5 shadow-sm active:scale-[0.99] transition-transform"
          onClick={() => {
            setDetailsView('overview');
            setShowDetails(true);
          }}
        >
          <div className="absolute -right-14 -top-14 w-40 h-40 bg-orange-300/15 rounded-full blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-[24px] bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
              <Clock size={29} />
            </div>

            <div className="flex-1">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">
                Pollazo Plus
              </p>

              <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none mt-2">
                Solicitud en revisión
              </h3>

              <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">
                Tu solicitud ya está enviada. Cuando el negocio confirme la activación, tu app cambiará en tiempo real.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section
          className="relative overflow-hidden rounded-[36px] border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-yellow-50 p-5 shadow-xl shadow-orange-100/70 pollazo-plus-shine active:scale-[0.99] transition-transform"
          onClick={openSubscribeModal}
        >
          <div className="absolute -right-16 -top-20 w-56 h-56 bg-orange-300/25 rounded-full blur-3xl" />
          <div className="absolute -left-14 -bottom-20 w-52 h-52 bg-yellow-300/25 rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="pollazo-plus-float w-14 h-14 rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-200/70 flex-shrink-0">
                <Crown size={29} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.28em]">
                  {isExpiredOrCancelled ? 'Vuelve a ser Plus' : 'Hazte Plus'}
                </p>

                <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">
                  {isExpiredOrCancelled ? 'Renueva tus beneficios' : 'Ser Plus te conviene'}
                </h3>

                <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">
                  {isExpiredOrCancelled
                    ? 'Recupera delivery gratis, prioridad y beneficios especiales en tus pedidos.'
                    : 'Delivery gratis durante el mes, prioridad y beneficios especiales para clientes frecuentes.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniBenefit icon={<Truck size={17} />} title="Envíos gratis" desc="Todo el mes" />
              <MiniBenefit icon={<Gift size={17} />} title="Sorpresas" desc="Según stock" />
              <MiniBenefit icon={<Star size={17} />} title="Exclusivos" desc="Promos Plus" />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[28px] bg-white/90 border border-orange-100 p-3 shadow-sm">
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  Membresía mensual
                </p>
                <p className="text-2xl font-black text-orange-600 leading-none mt-1">
                  ${PLUS_PRICE.toFixed(2)}
                  <span className="text-[10px] text-gray-400 font-bold"> / mes</span>
                </p>
              </div>

              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  openSubscribeModal();
                }}
                className="bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[22px] px-5 py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center gap-2 shadow-lg shadow-orange-200"
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
          <div className="fixed inset-0 z-[200000] bg-white text-gray-950 flex flex-col pollazo-plus-fade">
            {detailsView === 'cancel' && hasPollazoPlus ? (
              <>
                <div className="relative bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 text-white px-6 pt-[calc(env(safe-area-inset-top)+18px)] pb-8 overflow-hidden flex-shrink-0 rounded-b-[34px]">
                  <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/18 rounded-full blur-3xl" />
                  <button
                    type="button"
                    onClick={() => setDetailsView('overview')}
                    className="relative z-10 w-12 h-12 rounded-full bg-white text-gray-950 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                    aria-label="Volver a beneficios"
                  >
                    <ArrowLeft size={24} />
                  </button>

                  <div className="relative mt-8">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.24em]">
                      Antes de cancelar
                    </p>
                    <h2 className="text-[34px] font-black uppercase italic leading-none mt-2 max-w-[320px]">
                      ¿Seguro que quieres pausar tu Plus?
                    </h2>
                    <p className="text-[14px] font-bold text-white/90 leading-relaxed mt-3 max-w-[320px]">
                      Revisa lo que dejas de aprovechar antes de enviar la solicitud.
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-7 pb-44">
                  <div className="rounded-[32px] bg-orange-50 border border-orange-100 p-5">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.22em]">
                      Ahorro estimado este mes
                    </p>
                    <div className="flex items-end justify-between gap-4 mt-3">
                      <p className="text-5xl font-black text-orange-600 leading-none">
                        ${estimatedMonthSaving.toFixed(2)}
                      </p>
                      <Truck size={34} className="text-orange-400" />
                    </div>
                    <p className="text-[12px] font-bold text-orange-800/70 leading-relaxed mt-3">
                      Si haces varios pedidos al mes, el delivery gratis puede cubrir buena parte de tu membresía.
                    </p>
                  </div>

                  <div className="mt-7 space-y-4">
                    <h3 className="text-2xl font-black text-gray-950">
                      Al cancelar dejarías de tener
                    </h3>
                    <div className="space-y-3">
                      <BenefitRow icon={<Truck size={22} />} title="Delivery gratis" desc="Ya no se aplicaría en próximos pedidos." />
                      <BenefitRow icon={<Sparkles size={22} />} title="Prioridad" desc="Tus pedidos volverían al flujo normal." />
                      <BenefitRow icon={<Gift size={22} />} title="Beneficios sorpresa" desc="No recibirías extras seleccionados para clientes Plus." />
                    </div>
                  </div>
                </div>

                <div className="fixed left-0 right-0 bottom-0 z-[200001] bg-white/95 backdrop-blur-xl border-t border-orange-50 px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-18px_38px_rgba(15,23,42,0.08)]">
                  <div className="space-y-3 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={() => setDetailsView('overview')}
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[26px] py-4 text-[12px] font-black uppercase tracking-widest active:scale-[0.98] transition-all shadow-xl shadow-orange-200"
                    >
                      Seguir con Plus
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmCancel}
                      disabled={loading}
                      className="w-full bg-gray-100 text-gray-700 rounded-[26px] py-4 text-[12px] font-black uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {loading ? 'Procesando...' : 'Confirmar solicitud de cancelación'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 text-white px-6 pt-[calc(env(safe-area-inset-top)+18px)] pb-7 overflow-hidden flex-shrink-0 rounded-b-[34px]">
                  <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/18 rounded-full blur-3xl" />
                  <div className="absolute -left-16 bottom-0 w-44 h-44 bg-yellow-200/25 rounded-full blur-3xl" />

                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="relative z-10 w-12 h-12 rounded-full bg-white text-gray-950 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                    aria-label="Cerrar"
                  >
                    <X size={24} />
                  </button>

                  <div className="relative mt-5">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white text-orange-600 px-4 py-2 shadow-lg mb-5">
                      <Crown size={18} />
                      <span className="text-sm font-black italic lowercase">plus</span>
                    </div>

                    <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.28em]">
                      La Casa del Pollazo
                    </p>

                    <h2 className="text-[36px] font-black uppercase italic leading-none mt-2 max-w-[320px]">
                      {hasPollazoPlus
                        ? 'Tu Pollazo Plus está activo'
                        : isExpiredOrCancelled
                          ? 'Renueva tus beneficios Plus'
                          : 'Pide sin pagar delivery'}
                    </h2>

                    <p className="text-[14px] font-bold text-white/90 leading-relaxed mt-3 max-w-[320px]">
                      {hasPollazoPlus
                        ? 'Revisa tus beneficios, ahorro, vigencia y opciones de gestión desde un solo lugar.'
                        : 'Activa delivery gratis dentro de cobertura, prioridad y beneficios especiales en pedidos seleccionados.'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white px-6 py-6 pb-36">
                  {hasPollazoPlus ? (
                    <div className="space-y-5 pollazo-plus-pop">
                      <div className="rounded-[32px] bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.22em]">
                              Ahorro estimado mensual
                            </p>
                            <p className="text-5xl font-black text-orange-600 leading-none mt-3">
                              ${estimatedMonthSaving.toFixed(2)}
                            </p>
                            <p className="text-[11px] font-bold text-gray-500 mt-2 leading-relaxed">
                              Referencia basada en 4 deliveries de ${DELIVERY_SAMPLE_PRICE.toFixed(2)}.
                            </p>
                          </div>
                          <div className="w-14 h-14 rounded-[24px] bg-white text-orange-500 flex items-center justify-center shadow-sm">
                            <Truck size={28} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <MiniBenefit icon={<Truck size={18} />} title="Delivery gratis" desc="Dentro de cobertura" />
                        <MiniBenefit icon={<Sparkles size={18} />} title="Prioridad" desc="Atención preferente" />
                        <MiniBenefit icon={<Gift size={18} />} title="Sorpresas" desc="Según disponibilidad" />
                        <MiniBenefit icon={<Bell size={18} />} title="Avisos Plus" desc="Promos y vencimiento" />
                      </div>

                      <div className="rounded-[30px] border border-gray-100 bg-gray-50 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-black text-gray-950">
                              Tu suscripción
                            </h3>
                            <p className="text-[12px] font-bold text-gray-500 mt-1">
                              Plan mensual, vigencia y estado actual.
                            </p>
                          </div>
                          <CheckCircle2 size={26} className="text-green-500" />
                        </div>

                        <div className="mt-4 rounded-[24px] bg-white border border-gray-100 p-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Plan mensual
                            </p>
                            <p className="text-sm font-black text-gray-950 mt-1">
                              ${PLUS_PRICE.toFixed(2)} / mes
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-green-600 uppercase">
                              Activo
                            </p>
                            <p className="text-[10px] font-bold text-gray-500 mt-1">
                              {expiresLabel || 'Vigente'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {notice && (
                        <div className="bg-blue-50 border border-blue-100 rounded-[24px] p-4">
                          <p className="text-[11px] font-black text-blue-700 uppercase leading-relaxed text-center">
                            {notice}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5 pollazo-plus-pop">
                      <div className="space-y-3">
                        <BenefitRow icon={<Truck size={22} />} title="Delivery gratis todo el mes" desc="Aplica dentro de la zona de cobertura de La Casa del Pollazo." />
                        <BenefitRow icon={<Gift size={22} />} title="Beneficios sorpresa" desc="El negocio puede agregarte sorpresas cuando haya stock disponible." />
                        <BenefitRow icon={<ShieldCheck size={22} />} title="Prioridad y avisos" desc="Recibe atención preferente y recordatorios importantes de tu membresía." />
                        <BenefitRow icon={<Lock size={22} />} title="Sin contrato forzoso" desc="Podrás solicitar cancelar cuando quieras." />
                      </div>

                      <div className="rounded-[30px] bg-orange-50 border border-orange-100 p-5">
                        <div className="flex items-start gap-3">
                          <WalletCards size={22} className="text-orange-500 flex-shrink-0 mt-1" />
                          <div>
                            <p className="text-sm font-black text-gray-950">
                              Pago de membresía
                            </p>
                            <p className="text-[12px] font-bold text-gray-500 leading-relaxed mt-1">
                              Por ahora se registra una solicitud para que el admin active Plus. Luego conectaremos el cobro real con tarjeta.
                            </p>
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="bg-yellow-50 border border-yellow-100 rounded-[24px] p-4 flex gap-3">
                          <AlertCircle size={19} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] font-black text-yellow-800 uppercase leading-relaxed">
                            Tu solicitud ya está pendiente de revisión por el negocio.
                          </p>
                        </div>
                      )}

                      {notice && (
                        <div className="bg-blue-50 border border-blue-100 rounded-[24px] p-4">
                          <p className="text-[11px] font-black text-blue-700 uppercase leading-relaxed text-center">
                            {notice}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="fixed left-0 right-0 bottom-0 z-[200001] bg-white/95 backdrop-blur-xl border-t border-orange-50 px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-18px_38px_rgba(15,23,42,0.08)]">
                  {hasPollazoPlus ? (
                    <div className="space-y-3 max-w-md mx-auto">
                      <button
                        type="button"
                        onClick={handleNeedHelp}
                        className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[26px] py-4 text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-orange-200"
                      >
                        <HelpCircle size={18} />
                        Necesito ayuda
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNotice('');
                          setDetailsView('cancel');
                        }}
                        disabled={loading}
                        className="w-full bg-gray-100 text-gray-700 rounded-[26px] py-4 text-[12px] font-black uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        Solicitar cancelación
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto">
                      <div className="flex items-end justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Suscripción mensual
                          </p>
                          <p className="text-3xl font-black text-orange-600 leading-none">
                            ${PLUS_PRICE.toFixed(2)}
                            <span className="text-[11px] text-gray-400 font-bold"> / mes</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-black text-green-600 uppercase">
                            Sin contrato
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 mt-1">
                            Cancela cuando quieras
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSubscribe}
                        disabled={loading || isPending}
                        className={`w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[26px] py-4 text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-orange-200 ${
                          loading || isPending ? 'opacity-60 cursor-wait' : ''
                        }`}
                      >
                        <Crown size={18} />
                        {isPending
                          ? 'Solicitud pendiente'
                          : loading
                            ? 'Procesando...'
                            : subscribeButtonLabel}
                      </button>

                      <p className="text-[9px] font-bold text-gray-400 text-center leading-relaxed mt-3">
                        Al continuar aceptas{' '}
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="font-black text-orange-600 underline underline-offset-2"
                        >
                          términos y condiciones
                        </button>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </PortalLayer>
      )}

      {showCelebrate && (
        <PortalLayer>
          <div className="fixed inset-0 z-[200010] flex items-center justify-center p-5 bg-black/35 pollazo-plus-fade">
            <button
              type="button"
              aria-label="Cerrar felicitación Pollazo Plus"
              onClick={() => setShowCelebrate(false)}
              className="absolute inset-0"
            />

            <section className="relative w-full max-w-sm bg-white rounded-[38px] p-6 text-center shadow-2xl overflow-hidden pollazo-plus-pop">
              <div className="absolute -top-16 -right-10 w-44 h-44 bg-yellow-300/25 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-10 w-44 h-44 bg-orange-400/20 rounded-full blur-3xl" />
              {[...Array(12)].map((_, index) => (
                <span
                  key={index}
                  className="pollazo-plus-confetti absolute top-5 left-1/2 w-2 h-3 rounded-sm bg-orange-400"
                  style={{
                    '--x': `${(index - 5.5) * 18}px`,
                    animationDelay: `${index * 38}ms`,
                    background: index % 3 === 0 ? '#facc15' : index % 3 === 1 ? '#fb923c' : '#f97316',
                  } as React.CSSProperties}
                />
              ))}

              <div className="relative">
                <div className="w-24 h-24 rounded-[34px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white mx-auto flex items-center justify-center shadow-2xl shadow-orange-200 mb-5 pollazo-plus-float">
                  <PartyPopper size={44} />
                </div>

                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.28em]">
                  Felicidades
                </p>

                <h2 className="text-3xl font-black text-gray-950 uppercase italic leading-none mt-2">
                  Ya eres Pollazo Plus
                </h2>

                <p className="text-[12px] font-bold text-gray-500 leading-relaxed mt-3">
                  Tu delivery gratis quedó activado. Desde ahora tus pedidos pueden recibir prioridad y beneficios especiales.
                </p>

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <MiniBenefit icon={<Truck size={17} />} title="Delivery" desc="Gratis" />
                  <MiniBenefit icon={<Sparkles size={17} />} title="Prioridad" desc="Activa" />
                  <MiniBenefit icon={<Crown size={17} />} title="Plus" desc="Listo" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCelebrate(false);
                    setDetailsView('overview');
                    setShowDetails(true);
                  }}
                  className="mt-5 w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[24px] py-4 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-100"
                >
                  Ver mis beneficios
                </button>

                <button
                  type="button"
                  onClick={() => setShowCelebrate(false)}
                  className="mt-3 text-[10px] font-black text-gray-400 uppercase"
                >
                  Cerrar
                </button>
              </div>
            </section>
          </div>
        </PortalLayer>
      )}

      <TermsScreen
        open={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </>
  );
}
