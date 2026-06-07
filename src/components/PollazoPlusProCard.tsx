import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Bell,
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
  Star,
  Truck,
  WalletCards,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import type { Screen } from '../types';

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

function PortalLayer({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}

function PollazoBenefit({
  icon,
  title,
  desc,
  tone = 'light',
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  tone?: 'light' | 'warm' | 'green';
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-green-50 border-green-100 text-green-700'
      : tone === 'warm'
        ? 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-100 text-orange-500'
        : 'bg-white/95 border-orange-100 text-orange-500';

  return (
    <div className={`rounded-[24px] p-3 border shadow-sm ${toneClass}`}>
      <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-2">
        {icon}
      </div>

      <p className="text-[10px] font-black uppercase text-gray-950 leading-tight">
        {title}
      </p>

      <p className="text-[9px] font-bold text-gray-500 leading-relaxed mt-1">
        {desc}
      </p>
    </div>
  );
}

function BenefitLine({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] bg-white border border-orange-50 p-3 shadow-sm">
      <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
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

function TermsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <PortalLayer>
      <div className="fixed inset-0 z-[15020] flex items-end justify-center">
        <button
          type="button"
          aria-label="Cerrar términos Pollazo Plus"
          onClick={onClose}
          className="absolute inset-0 bg-black/25"
        />

        <section className="relative w-full max-w-md max-h-[70dvh] bg-white rounded-t-[34px] shadow-2xl overflow-hidden animate-[pollazoSheetIn_260ms_cubic-bezier(.2,.9,.2,1)]">
          <div className="sticky top-0 bg-white border-b border-orange-50 px-5 py-4 flex items-center justify-between z-10">
            <div>
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">
                Pollazo Plus
              </p>
              <h3 className="text-lg font-black text-gray-950 uppercase italic leading-none mt-1">
                Términos y condiciones
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

          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(70dvh-76px)]">
            <div className="bg-orange-50 border border-orange-100 rounded-[26px] p-4">
              <p className="text-[11px] font-bold text-orange-800 leading-relaxed">
                Pollazo Plus es una membresía mensual de beneficios para clientes de La Casa del Pollazo. Está pensada para compras más cómodas, delivery gratis y beneficios sorpresa.
              </p>
            </div>

            {[
              {
                title: 'Pago mensual',
                text: `La membresía tiene un valor de $${PLUS_PRICE.toFixed(2)} mensuales. Cuando se active el pago con tarjeta, el cobro será mensual mientras la membresía esté activa.`,
              },
              {
                title: 'Delivery gratis',
                text: 'El beneficio principal es delivery gratis durante el periodo activo, dentro de la zona de cobertura del negocio.',
              },
              {
                title: 'Regalos y beneficios sorpresa',
                text: 'Los regalos, extras o descuentos dependen de disponibilidad, stock, temporada y decisión del negocio. No se garantizan en todos los pedidos.',
              },
              {
                title: 'Cancelación',
                text: 'Cuando esté activo el pago con tarjeta, el cliente podrá solicitar cancelar la membresía para evitar futuras renovaciones. Los beneficios ya pagados se mantienen hasta el vencimiento.',
              },
              {
                title: 'Uso correcto',
                text: 'La membresía es personal para el número de WhatsApp registrado. El negocio puede revisar, pausar o cancelar beneficios si detecta abuso, datos falsos o mal uso del servicio.',
              },
            ].map(item => (
              <div key={item.title} className="border-b border-gray-100 pb-4 last:border-0">
                <p className="text-xs font-black text-gray-950 uppercase">
                  {item.title}
                </p>
                <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-1">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalLayer>
  );
}

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
  const [showTerms, setShowTerms] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const expiresAt = activeMembership?.expires_at || pollazoPlusExpiresAt;
  const expiresLabel = formatDate(expiresAt);
  const daysLeft = getDaysLeft(expiresAt);

  const isExpiredOrCancelled =
    membershipStatus === 'expired' || membershipStatus === 'cancelled';

  const isExpiringSoon =
    hasPollazoPlus && typeof daysLeft === 'number' && daysLeft <= 3;

  const estimatedMonthSaving = useMemo(() => {
    return DELIVERY_SAMPLE_PRICE * 4;
  }, []);

  const celebrationKey = useMemo(() => {
    if (!hasPollazoPlus) return '';
    return `${activeMembership?.id || 'plus'}-${expiresAt || 'sin-fecha'}`;
  }, [activeMembership?.id, expiresAt, hasPollazoPlus]);

  const openDetailsFromExternalSignal = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.openPlusSignal);
    setNotice('');
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
          ? 'Solicitud de renovación Pollazo Plus desde pantalla profesional. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.'
          : 'Solicitud Pollazo Plus desde pantalla profesional. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.',
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

  const handleCancel = async () => {
    if (!activeMembership?.id) {
      setNotice('No encontramos una membresía activa para cancelar.');
      return;
    }

    setLoading(true);
    setNotice('');

    try {
      await cancelMembership(
        activeMembership.id,
        'Cancelación solicitada por el cliente desde la pantalla Pollazo Plus.'
      );
      await refreshMembership();
      setNotice('Tu solicitud de cancelación fue registrada.');
    } catch (error) {
      console.error('No se pudo cancelar Pollazo Plus:', error);
      setNotice('No se pudo registrar la cancelación. Intenta otra vez.');
    } finally {
      setLoading(false);
    }
  };

  const openSubscribeModal = () => {
    setNotice('');
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
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }

          @keyframes pollazoPlusPop {
            0% { transform: scale(.92); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes pollazoSheetIn {
            0% { transform: translateY(100%); opacity: .72; }
            100% { transform: translateY(0); opacity: 1; }
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
            animation: pollazoPlusPop 220ms ease-out both;
          }
        `}
      </style>

      {hasPollazoPlus ? (
        <section
          className="relative overflow-hidden rounded-[36px] border border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-white p-5 shadow-lg shadow-orange-100/60 pollazo-plus-shine active:scale-[0.99] transition-transform"
          onClick={() => setShowDetails(true)}
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
                Tu membresía está lista para aplicar delivery gratis, prioridad y regalos sorpresa en pedidos seleccionados.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <PollazoBenefit icon={<Truck size={17} />} title="Delivery" desc="Gratis" />
                <PollazoBenefit icon={<Gift size={17} />} title="Regalos" desc="Sorpresa" />
                <PollazoBenefit icon={<Sparkles size={17} />} title="Prioridad" desc="VIP" />
              </div>

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
      ) : membershipStatus === 'pending' ? (
        <section
          className="relative overflow-hidden rounded-[36px] border border-orange-100 bg-white p-5 shadow-sm active:scale-[0.99] transition-transform"
          onClick={() => setShowDetails(true)}
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

              <div className="mt-4 bg-orange-50 border border-orange-100 rounded-[24px] p-4 flex gap-3">
                <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
                  Al activarse tendrás delivery gratis por 30 días.
                </p>
              </div>
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
                    ? 'Recupera delivery gratis, prioridad y sorpresas exclusivas en tus pedidos.'
                    : 'Delivery gratis durante el mes, prioridad y sorpresas exclusivas para clientes frecuentes.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <PollazoBenefit icon={<Truck size={17} />} title="Envíos gratis" desc="Todo el mes" tone="warm" />
              <PollazoBenefit icon={<Gift size={17} />} title="Regalos VIP" desc="Según stock" tone="warm" />
              <PollazoBenefit icon={<Star size={17} />} title="Exclusivos" desc="Promos Plus" tone="warm" />
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
          <div className="fixed inset-0 z-[15000] flex items-end justify-center bg-black/35">
            <button
              type="button"
              aria-label="Cerrar Pollazo Plus"
              onClick={() => setShowDetails(false)}
              className="absolute inset-0"
            />

            <section className="relative w-full max-w-md h-[min(94dvh,780px)] bg-white rounded-t-[34px] shadow-2xl overflow-hidden flex flex-col animate-[pollazoSheetIn_280ms_cubic-bezier(.2,.9,.2,1)]">
              <div className="relative bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 text-white px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-6 overflow-hidden flex-shrink-0">
                <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/18 rounded-full blur-3xl" />
                <div className="absolute -left-16 bottom-0 w-44 h-44 bg-yellow-200/25 rounded-full blur-3xl" />

                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="absolute top-[calc(env(safe-area-inset-top)+14px)] right-5 w-12 h-12 rounded-full bg-white/22 text-white flex items-center justify-center active:scale-90 transition-transform z-10"
                  aria-label="Cerrar"
                >
                  <X size={22} />
                </button>

                <div className="relative pr-14">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white text-orange-600 px-4 py-2 shadow-lg mb-5">
                    <Crown size={18} />
                    <span className="text-sm font-black italic lowercase">plus</span>
                  </div>

                  <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.28em]">
                    La Casa del Pollazo
                  </p>

                  <h2 className="text-[34px] font-black uppercase italic leading-none mt-2 max-w-[260px]">
                    {hasPollazoPlus
                      ? 'Tu Pollazo Plus está activo'
                      : isExpiredOrCancelled
                        ? 'Renueva tus beneficios Plus'
                        : 'Pide sin pagar delivery'}
                  </h2>

                  <p className="text-[13px] font-bold text-white/90 leading-relaxed mt-3 max-w-[290px]">
                    {hasPollazoPlus
                      ? 'Revisa tus beneficios, vigencia y opciones de gestión desde un solo lugar.'
                      : 'Activa delivery gratis dentro de cobertura, prioridad y sorpresas VIP en pedidos seleccionados.'}
                  </p>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 bg-white">
                {hasPollazoPlus ? (
                  <div className="p-5 space-y-5">
                    <div className="rounded-[30px] bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 p-5 text-center">
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">
                        Ahorro potencial mensual
                      </p>
                      <p className="text-5xl font-black text-orange-600 leading-none mt-3">
                        ${estimatedMonthSaving.toFixed(2)}
                      </p>
                      <p className="text-[11px] font-bold text-gray-500 mt-2">
                        Basado en 4 deliveries de ${DELIVERY_SAMPLE_PRICE.toFixed(2)}. El ahorro real depende de tus pedidos.
                      </p>
                    </div>

                    <div>
                      <p className="text-lg font-black text-gray-950 mb-3">
                        Tus beneficios exclusivos
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <PollazoBenefit icon={<Truck size={18} />} title="Delivery gratis" desc="Dentro de cobertura" tone="green" />
                        <PollazoBenefit icon={<Gift size={18} />} title="Regalos VIP" desc="Según disponibilidad" />
                        <PollazoBenefit icon={<Sparkles size={18} />} title="Prioridad" desc="Atención preferente" />
                        <PollazoBenefit icon={<Bell size={18} />} title="Avisos Plus" desc="Promos y vencimiento" />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-gray-950">
                            Gestionar suscripción
                          </p>
                          <p className="text-[11px] font-bold text-gray-500 mt-1">
                            Vigencia, beneficios y cancelación.
                          </p>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>

                      <div className="rounded-[22px] bg-white border border-gray-100 p-3 flex items-center justify-between gap-3">
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
                      <div className="bg-blue-50 border border-blue-100 rounded-[24px] p-3">
                        <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed text-center">
                          {notice}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 gap-3">
                      <BenefitLine icon={<Truck size={21} />} title="Delivery gratis todo el mes" desc="Aplica dentro de la zona de cobertura de La Casa del Pollazo." />
                      <BenefitLine icon={<Gift size={21} />} title="Regalos y extras VIP" desc="El negocio puede agregarte sorpresas cuando haya stock disponible." />
                      <BenefitLine icon={<ShieldCheck size={21} />} title="Prioridad y avisos" desc="Recibe atención preferente y recordatorios importantes de tu membresía." />
                      <BenefitLine icon={<Lock size={21} />} title="Sin contrato forzoso" desc="Podrás solicitar cancelar cuando quieras." />
                    </div>

                    <div className="rounded-[30px] bg-orange-50 border border-orange-100 p-4">
                      <div className="flex items-start gap-3">
                        <WalletCards size={22} className="text-orange-500 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-sm font-black text-gray-950">
                            Pago de membresía
                          </p>
                          <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-1">
                            Por ahora se registra una solicitud para que el admin active Plus. Luego conectaremos el cobro real con tarjeta.
                          </p>
                        </div>
                      </div>
                    </div>

                    {notice && (
                      <div className="bg-blue-50 border border-blue-100 rounded-[24px] p-3">
                        <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed text-center">
                          {notice}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-orange-50 bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] flex-shrink-0">
                {hasPollazoPlus ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setNotice('Escríbenos por WhatsApp si necesitas ayuda con tu membresía Plus.')}
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[24px] py-4 text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-orange-200"
                    >
                      <HelpCircle size={18} />
                      Necesito ayuda
                    </button>

                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="w-full bg-gray-100 text-gray-700 rounded-[24px] py-4 text-[12px] font-black uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {loading ? 'Procesando...' : 'Solicitar cancelación'}
                    </button>
                  </div>
                ) : (
                  <>
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
                      disabled={loading || membershipStatus === 'pending'}
                      className={`w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[24px] py-4 text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-orange-200 ${
                        loading || membershipStatus === 'pending' ? 'opacity-60 cursor-wait' : ''
                      }`}
                    >
                      <Crown size={18} />
                      {membershipStatus === 'pending'
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
                  </>
                )}
              </div>
            </section>
          </div>
        </PortalLayer>
      )}

      {showCelebrate && (
        <PortalLayer>
          <div className="fixed inset-0 z-[15040] flex items-center justify-center p-5 bg-black/25">
            <button
              type="button"
              aria-label="Cerrar felicitación Pollazo Plus"
              onClick={() => setShowCelebrate(false)}
              className="absolute inset-0"
            />

            <section className="relative w-full max-w-sm bg-white rounded-[38px] p-6 text-center shadow-2xl overflow-hidden pollazo-plus-pop">
              <div className="absolute -top-16 -right-10 w-44 h-44 bg-yellow-300/25 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-10 w-44 h-44 bg-orange-400/20 rounded-full blur-3xl" />

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
                  Tu delivery gratis quedó activado. Desde ahora tus pedidos pueden recibir beneficios VIP y sorpresas.
                </p>

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <PollazoBenefit icon={<Truck size={17} />} title="Delivery" desc="Gratis" />
                  <PollazoBenefit icon={<Gift size={17} />} title="Sorpresas" desc="VIP" />
                  <PollazoBenefit icon={<Crown size={17} />} title="Plus" desc="Activo" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCelebrate(false);
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

      <TermsSheet
        open={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </>
  );
}
