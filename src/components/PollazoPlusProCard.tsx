import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  Gift,
  Lock,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import type { Screen } from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
}

const PLUS_PRICE = 6.99;

const STORAGE_KEYS = {
  lastCelebrated: 'pollazo_plus_last_celebrated_key',
  infoVisits: 'pollazo_plus_info_visits',
  lastPromoShown: 'pollazo_plus_last_promo_shown',
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
    <div className="bg-white/10 border border-white/10 rounded-[24px] p-3">
      <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-yellow-300 mb-2">
        {icon}
      </div>

      <p className="text-[10px] font-black uppercase text-white leading-tight">
        {title}
      </p>

      <p className="text-[9px] font-bold text-white/45 leading-relaxed mt-1">
        {desc}
      </p>
    </div>
  );
}

function LightBenefit({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white/85 border border-yellow-100 rounded-[24px] p-3 shadow-sm">
      <div className="w-9 h-9 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 mb-2">
        {icon}
      </div>

      <p className="text-[10px] font-black uppercase text-gray-900 leading-tight">
        {title}
      </p>

      <p className="text-[9px] font-bold text-gray-400 leading-relaxed mt-1">
        {desc}
      </p>
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
    <div className="fixed inset-0 z-[13050] flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar términos Pollazo Plus"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/55"
      />

      <section className="relative w-full max-w-md max-h-[58vh] bg-white rounded-t-[34px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
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
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(58vh-76px)]">
          <div className="bg-orange-50 border border-orange-100 rounded-[26px] p-4">
            <p className="text-[11px] font-bold text-orange-800 leading-relaxed">
              Pollazo Plus es una membresía mensual de beneficios para clientes de La Casa del Pollazo. Su objetivo es mejorar la experiencia de compra, entrega y fidelización.
            </p>
          </div>

          {[
            {
              title: 'Pago mensual',
              text: `La membresía tiene un valor de $${PLUS_PRICE.toFixed(2)} mensuales. Cuando se active el pago con tarjeta, el cobro será mensual mientras la membresía esté activa.`,
            },
            {
              title: 'Delivery gratis',
              text: 'El beneficio principal es delivery gratis durante el periodo activo de la membresía, dentro de la zona de cobertura del negocio.',
            },
            {
              title: 'Regalos y beneficios sorpresa',
              text: 'Los regalos, extras, descuentos o beneficios sorpresa dependen de disponibilidad, stock, temporada y decisión del negocio. No se garantizan en todos los pedidos.',
            },
            {
              title: 'Cancelación',
              text: 'Cuando esté activo el pago con tarjeta, el cliente podrá solicitar cancelar la membresía para evitar futuras renovaciones. Los beneficios ya pagados se mantienen hasta el vencimiento del periodo activo.',
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
  );
}

export default function PollazoPlusProCard({ onNavigate }: Props) {
  const { requestMembership } = useAdmin();

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
  const [showEntryPromo, setShowEntryPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const expiresAt = activeMembership?.expires_at || pollazoPlusExpiresAt;
  const expiresLabel = formatDate(expiresAt);
  const daysLeft = getDaysLeft(expiresAt);
  const isExpiredOrCancelled =
    membershipStatus === 'expired' || membershipStatus === 'cancelled';
  const isExpiringSoon =
    hasPollazoPlus && typeof daysLeft === 'number' && daysLeft <= 3;

  const celebrationKey = useMemo(() => {
    if (!hasPollazoPlus) return '';
    return `${activeMembership?.id || 'plus'}-${expiresAt || 'sin-fecha'}`;
  }, [activeMembership?.id, expiresAt, hasPollazoPlus]);

  const openDetailsFromExternalSignal = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.openPlusSignal);
    setNotice('');
    setShowEntryPromo(false);
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
    if (!hasPollazoPlus || !celebrationKey) return;

    const lastCelebrated = localStorage.getItem(STORAGE_KEYS.lastCelebrated);

    if (lastCelebrated === celebrationKey) return;

    const timer = window.setTimeout(() => {
      setShowCelebrate(true);
      localStorage.setItem(STORAGE_KEYS.lastCelebrated, celebrationKey);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [celebrationKey, hasPollazoPlus]);

  useEffect(() => {
    if (hasPollazoPlus || membershipStatus === 'pending') return;

    const hasExternalSignal =
      sessionStorage.getItem(STORAGE_KEYS.openPlusSignal) === '1' ||
      new URLSearchParams(window.location.search).get('plus') === '1';

    if (hasExternalSignal) return;

    const visits = Number(localStorage.getItem(STORAGE_KEYS.infoVisits) || '0') + 1;
    const lastShown = Number(localStorage.getItem(STORAGE_KEYS.lastPromoShown) || '0');
    const twelveHours = 1000 * 60 * 60 * 12;
    const canShowAgain = Date.now() - lastShown > twelveHours;

    localStorage.setItem(STORAGE_KEYS.infoVisits, String(visits));

    if (visits >= 2 && canShowAgain) {
      const timer = window.setTimeout(() => {
        setShowEntryPromo(true);
        localStorage.setItem(STORAGE_KEYS.lastPromoShown, String(Date.now()));
      }, 1100);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [hasPollazoPlus, membershipStatus]);

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
          ? 'Solicitud de renovación Pollazo Plus desde modal profesional. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.'
          : 'Solicitud Pollazo Plus desde modal profesional. Pago con tarjeta pendiente de integración; activar manualmente en admin para pruebas.',
      });

      await refreshMembership();

      setNotice(
        isExpiredOrCancelled
          ? 'Solicitud de renovación enviada. Por ahora el negocio podrá reactivar tu Plus manualmente mientras se integra pago con tarjeta.'
          : 'Solicitud enviada. Por ahora el negocio podrá activar tu Plus manualmente mientras se integra pago con tarjeta.'
      );
    } catch (error) {
      console.error('No se pudo solicitar Pollazo Plus:', error);
      setNotice('No se pudo enviar la solicitud. Intenta otra vez.');
    } finally {
      setLoading(false);
    }
  };

  const openSubscribeModal = () => {
    setNotice('');
    setShowEntryPromo(false);
    setShowDetails(true);
  };

  const subscribeVerb = isExpiredOrCancelled ? 'Renovar' : 'Suscríbete';
  const subscribeButtonLabel = isExpiredOrCancelled
    ? 'Renovar Plus'
    : 'Suscribirme a Plus';

  return (
    <>
      <style>
        {`
          @keyframes plusShine {
            0% { transform: translateX(-120%) rotate(18deg); opacity: 0; }
            20% { opacity: .55; }
            55% { opacity: .35; }
            100% { transform: translateX(180%) rotate(18deg); opacity: 0; }
          }

          @keyframes plusFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }

          @keyframes plusPulseSoft {
            0%, 100% { transform: scale(1); opacity: .8; }
            50% { transform: scale(1.08); opacity: 1; }
          }

          .pollazo-plus-shine::after {
            content: '';
            position: absolute;
            top: -30%;
            left: -35%;
            width: 38%;
            height: 160%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent);
            animation: plusShine 4.5s ease-in-out infinite;
            pointer-events: none;
          }

          .pollazo-plus-float {
            animation: plusFloat 3.8s ease-in-out infinite;
          }

          .pollazo-plus-pulse {
            animation: plusPulseSoft 2.4s ease-in-out infinite;
          }
        `}
      </style>

      {hasPollazoPlus ? (
        <section
          className="relative overflow-hidden rounded-[38px] border border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-white p-5 shadow-lg shadow-orange-100/60 pollazo-plus-shine"
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
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-[0.26em]">
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
                Tu membresía está lista para aplicar delivery gratis, prioridad y sorpresas en pedidos seleccionados.
              </p>

              {isExpiringSoon && (
                <div className="mt-4 bg-orange-50 border border-orange-100 rounded-[24px] p-3 flex gap-2">
                  <AlertCircle size={17} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
                    Tu Plus vence {daysLeft === 0 ? 'hoy' : `en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}. Renueva para mantener delivery gratis.
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <LightBenefit icon={<Truck size={17} />} title="Delivery" desc="Gratis" />
                <LightBenefit icon={<Gift size={17} />} title="Regalos" desc="Sorpresa" />
                <LightBenefit icon={<Sparkles size={17} />} title="Prioridad" desc="VIP" />
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
                  className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center active:scale-90 transition-transform"
                  aria-label="Ver beneficios Pollazo Plus"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : membershipStatus === 'pending' ? (
        <section className="relative overflow-hidden rounded-[38px] border border-orange-100 bg-white p-5 shadow-sm">
          <div className="absolute -right-14 -top-14 w-40 h-40 bg-orange-300/15 rounded-full blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-[24px] bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
              <Clock size={29} />
            </div>

            <div className="flex-1">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.26em]">
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
          className="relative overflow-hidden rounded-[38px] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-2xl shadow-orange-200/50 pollazo-plus-shine"
          onClick={openSubscribeModal}
        >
          <div className="absolute -right-16 -top-20 w-56 h-56 bg-orange-500/25 rounded-full blur-3xl" />
          <div className="absolute -left-14 -bottom-20 w-52 h-52 bg-yellow-400/10 rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="pollazo-plus-float w-14 h-14 rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-950/30 flex-shrink-0">
                <Crown size={29} />
              </div>

              <div className="flex-1">
                <p className="text-[9px] font-black text-yellow-300 uppercase tracking-[0.28em]">
                  {isExpiredOrCancelled ? 'Vuelve a ser Plus' : 'Hazte Plus'}
                </p>

                <h3 className="text-2xl font-black uppercase italic leading-none mt-2">
                  {isExpiredOrCancelled ? 'Renueva tus beneficios' : 'Te conviene ser Pollazo Plus'}
                </h3>

                <p className="text-[11px] font-bold text-white/55 leading-relaxed mt-2">
                  {isExpiredOrCancelled
                    ? 'Recupera envíos gratis ilimitados, prioridad y sorpresas exclusivas en tus pedidos.'
                    : 'Disfruta envíos gratis ilimitados, prioridad y sorpresas exclusivas en tus pedidos.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <BenefitPill icon={<Truck size={17} />} title="Envíos gratis" desc="Durante el mes" />
              <BenefitPill icon={<Gift size={17} />} title="Regalos VIP" desc="Según stock" />
              <BenefitPill icon={<Star size={17} />} title="Exclusivos" desc="Promos Plus" />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-black text-white/35 uppercase tracking-widest">
                  Membresía mensual
                </p>
                <p className="text-2xl font-black text-white leading-none mt-1">
                  ${PLUS_PRICE.toFixed(2)}
                  <span className="text-[10px] text-white/35 font-bold"> / mes</span>
                </p>
              </div>

              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  openSubscribeModal();
                }}
                className="bg-white text-slate-950 rounded-[22px] px-5 py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center gap-2"
              >
                {subscribeVerb}
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}

      {showDetails && (
        <div className="fixed inset-0 z-[13000] flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar Pollazo Plus"
            onClick={() => setShowDetails(false)}
            className="absolute inset-0 bg-slate-950/70"
          />

          <section className="relative w-full max-w-md max-h-[92vh] bg-white rounded-t-[38px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 text-white px-5 pt-5 pb-6 overflow-hidden">
              <div className="absolute -right-16 -top-16 w-52 h-52 bg-orange-500/25 rounded-full blur-3xl" />
              <div className="absolute -left-16 bottom-0 w-44 h-44 bg-yellow-400/10 rounded-full blur-3xl" />

              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90 transition-transform z-10"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>

              <div className="relative pr-12">
                <div className="w-16 h-16 rounded-[26px] bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-950/40 mb-4">
                  <Crown size={34} />
                </div>

                <p className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.28em]">
                  La Casa del Pollazo
                </p>

                <h2 className="text-3xl font-black uppercase italic leading-none mt-2">
                  {hasPollazoPlus
                    ? 'Tus beneficios Pollazo Plus'
                    : isExpiredOrCancelled
                      ? 'Renueva Pollazo Plus'
                      : 'Suscríbete a Pollazo Plus'}
                </h2>

                <p className="text-[12px] font-bold text-white/55 leading-relaxed mt-3">
                  Envíos gratis ilimitados dentro de cobertura, beneficios exclusivos y regalos sorpresa para clientes Plus.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-218px)]">
              <div className="grid grid-cols-2 gap-3">
                <LightBenefit icon={<Truck size={18} />} title="Envíos gratis" desc="A toda la ciudad dentro de zona." />
                <LightBenefit icon={<Gift size={18} />} title="Regalos sorpresa" desc="Extras VIP según disponibilidad." />
                <LightBenefit icon={<Sparkles size={18} />} title="Prioridad" desc="Atención preferente en pedidos." />
                <LightBenefit icon={<Bell size={18} />} title="Avisos Plus" desc="Promos y vencimiento de membresía." />
              </div>

              <div className="bg-slate-950 text-white rounded-[30px] p-4 overflow-hidden relative">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl" />

                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-yellow-300">
                    <CreditCard size={24} />
                  </div>

                  <div className="flex-1">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                      Método de pago
                    </p>
                    <p className="text-sm font-black uppercase mt-1">
                      Tarjeta mensual
                    </p>
                    <p className="text-[10px] font-bold text-white/45 mt-1">
                      Visa / Mastercard. Integración real de tarjeta pendiente.
                    </p>
                  </div>

                  <Lock size={17} className="text-white/35" />
                </div>
              </div>

              {hasPollazoPlus ? (
                <>
                  <div className="bg-green-50 border border-green-100 rounded-[28px] p-4 flex gap-3">
                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-green-700 uppercase">
                        Tu Plus está activo
                      </p>
                      <p className="text-[11px] font-bold text-green-700/70 leading-relaxed mt-1">
                        {expiresLabel
                          ? `Beneficios activos hasta ${expiresLabel}.`
                          : 'Tus beneficios están activos.'}
                      </p>
                    </div>
                  </div>

                  {isExpiringSoon && (
                    <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4 flex gap-3">
                      <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-orange-700 uppercase">
                          Renovación recomendada
                        </p>
                        <p className="text-[11px] font-bold text-orange-700/70 leading-relaxed mt-1">
                          Tu membresía vence {daysLeft === 0 ? 'hoy' : `en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}. Cuando activemos tarjeta podrás renovar desde aquí.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4 flex gap-3">
                    <ShieldCheck size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-orange-700 leading-relaxed">
                      Por ahora, mientras se integra el cobro real con tarjeta, esta solicitud queda para que el admin pueda activar Plus manualmente y seguir probando.
                    </p>
                  </div>

                  {notice && (
                    <div className="bg-blue-50 border border-blue-100 rounded-[24px] p-3">
                      <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed text-center">
                        {notice}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Total
                  </p>
                  <p className="text-3xl font-black text-gray-950 leading-none">
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

              {!hasPollazoPlus && (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading || membershipStatus === 'pending'}
                  className={`w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-[24px] py-4 text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-orange-200 ${
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
              )}

              <p className="text-[9px] font-bold text-gray-400 text-center leading-relaxed mt-3">
                Al continuar aceptas{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="font-black text-gray-900 underline underline-offset-2"
                >
                  términos y condiciones
                </button>
                .
              </p>
            </div>
          </section>
        </div>
      )}

      {showCelebrate && (
        <div className="fixed inset-0 z-[13100] flex items-center justify-center p-5">
          <button
            type="button"
            aria-label="Cerrar felicitación Pollazo Plus"
            onClick={() => setShowCelebrate(false)}
            className="absolute inset-0 bg-slate-950/70"
          />

          <section className="relative w-full max-w-sm bg-white rounded-[38px] p-6 text-center shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <div className="absolute -top-16 -right-10 w-44 h-44 bg-yellow-300/25 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-10 w-44 h-44 bg-orange-400/20 rounded-full blur-3xl" />

            <div className="relative">
              <div className="pollazo-plus-pulse w-24 h-24 rounded-[34px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white mx-auto flex items-center justify-center shadow-2xl shadow-orange-200 mb-5">
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
                <LightBenefit icon={<Truck size={17} />} title="Delivery" desc="Gratis" />
                <LightBenefit icon={<Gift size={17} />} title="Sorpresas" desc="VIP" />
                <LightBenefit icon={<Crown size={17} />} title="Plus" desc="Activo" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCelebrate(false);
                  setShowDetails(true);
                }}
                className="mt-5 w-full bg-slate-950 text-white rounded-[24px] py-4 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-transform"
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
      )}

      {showEntryPromo && (
        <div className="fixed inset-0 z-[13080] flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar promoción Pollazo Plus"
            onClick={() => setShowEntryPromo(false)}
            className="absolute inset-0 bg-slate-950/65"
          />

          <section className="relative w-full max-w-md bg-white rounded-t-[38px] p-5 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <button
              type="button"
              onClick={() => setShowEntryPromo(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Cerrar promoción"
            >
              <X size={18} />
            </button>

            <div className="pr-10">
              <div className="w-16 h-16 rounded-[26px] bg-gradient-to-br from-yellow-400 to-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-200 mb-4">
                <Crown size={34} />
              </div>

              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.28em]">
                Aprovecha ya
              </p>

              <h2 className="text-3xl font-black text-gray-950 uppercase italic leading-none mt-2">
                Ser Plus te conviene
              </h2>

              <p className="text-[12px] font-bold text-gray-500 leading-relaxed mt-3">
                Suscríbete a La Casa del Pollazo y disfruta envíos gratis ilimitados, beneficios exclusivos y sorpresas en tus pedidos.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5">
              <LightBenefit icon={<Truck size={17} />} title="Envíos" desc="Gratis" />
              <LightBenefit icon={<Sparkles size={17} />} title="Promos" desc="Plus" />
              <LightBenefit icon={<Gift size={17} />} title="Regalos" desc="VIP" />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Mensual
                </p>
                <p className="text-3xl font-black text-gray-950 leading-none">
                  ${PLUS_PRICE.toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                onClick={openSubscribeModal}
                className="bg-orange-500 text-white rounded-[24px] px-6 py-4 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-200"
              >
                Suscríbete
              </button>
            </div>
          </section>
        </div>
      )}

      <TermsSheet
        open={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </>
  );
}
