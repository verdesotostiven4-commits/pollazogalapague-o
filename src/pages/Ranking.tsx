import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  Trophy,
  Star,
  Crown,
  Medal,
  Sparkles,
  Zap,
  Share2,
  Gift,
  X,
  Target,
  PartyPopper,
  History,
  TimerReset,
  Activity,
  BadgeCheck,
  Lock,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
}

type CustomerRecord = {
  id?: string;
  name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  points?: number | null;
  exp?: number | null;
  total_orders?: number | null;
  total_spent?: number | null;
  phone_verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function RevealOnScroll({ children, delay = 0 }: RevealOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-10 scale-95'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const CUSTOMER_LEVELS = [
  { level: 1, title: 'Cliente Nuevo', minExp: 0, nextExp: 25, emoji: '🐣' },
  { level: 2, title: 'Pollazo Fan', minExp: 25, nextExp: 60, emoji: '🔥' },
  { level: 3, title: 'Cliente Fiel', minExp: 60, nextExp: 120, emoji: '⭐' },
  { level: 4, title: 'VIP del Mirador', minExp: 120, nextExp: 250, emoji: '👑' },
  { level: 5, title: 'Leyenda Pollazo', minExp: 250, nextExp: null, emoji: '🏆' },
];

const DEFAULT_PRIZES = {
  prize_1: '¡Un Pollo Entero!',
  prize_2: '¡Un Queso Fresco!',
  prize_3: 'Bono Descuento $5',
};

function cleanPhone(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '');
}

function cleanPhoneTail(phone?: string | null) {
  return cleanPhone(phone).slice(-9);
}

function safeNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

  const range = level.nextExp - level.minExp;
  const current = exp - level.minExp;

  return Math.min(100, Math.max(0, Math.round((current / range) * 100)));
}

function getNextLevelText(exp: number) {
  const level = getCustomerLevel(exp);

  if (!level.nextExp) {
    return 'Nivel máximo alcanzado';
  }

  const remaining = Math.max(0, level.nextExp - exp);

  return `Faltan ${remaining.toLocaleString('es-EC')} EXP para el siguiente nivel`;
}

function getGuerreroTitle(index: number) {
  if (index === 0) return 'Guerrero Galapagueño';
  if (index === 1) return 'Guerrero de Santa Cruz';
  if (index === 2) return 'Guerrero del Mirador';

  return 'Guerrero';
}

function formatCountdownValue(value: number) {
  return Math.max(0, value).toString().padStart(2, '0');
}

function money(value?: number | null) {
  return Number(value || 0).toFixed(2);
}

function customerFreshness(customer: CustomerRecord) {
  const updated = customer.updated_at ? new Date(customer.updated_at).getTime() : 0;
  const created = customer.created_at ? new Date(customer.created_at).getTime() : 0;

  return Math.max(
    Number.isFinite(updated) ? updated : 0,
    Number.isFinite(created) ? created : 0
  );
}

function mergeCustomerRecord(base: CustomerRecord, candidate: CustomerRecord): CustomerRecord {
  const basePoints = safeNumber(base.points);
  const candidatePoints = safeNumber(candidate.points);
  const baseExp = safeNumber(base.exp);
  const candidateExp = safeNumber(candidate.exp);
  const baseSpent = safeNumber(base.total_spent);
  const candidateSpent = safeNumber(candidate.total_spent);
  const baseOrders = safeNumber(base.total_orders);
  const candidateOrders = safeNumber(candidate.total_orders);

  const candidateLooksBetter =
    candidatePoints > basePoints ||
    candidateExp > baseExp ||
    candidateSpent > baseSpent ||
    candidateOrders > baseOrders ||
    customerFreshness(candidate) > customerFreshness(base);

  return {
    ...base,
    ...candidate,
    id: candidateLooksBetter ? candidate.id || base.id : base.id || candidate.id,
    name: candidateLooksBetter
      ? candidate.name || base.name
      : base.name || candidate.name,
    phone: candidate.phone || base.phone,
    avatar_url: candidateLooksBetter
      ? candidate.avatar_url || base.avatar_url
      : base.avatar_url || candidate.avatar_url,
    points: Math.max(basePoints, candidatePoints),
    exp: Math.max(baseExp, candidateExp),
    total_orders: Math.max(baseOrders, candidateOrders),
    total_spent: Math.max(baseSpent, candidateSpent),
    phone_verified: Boolean(base.phone_verified || candidate.phone_verified),
    created_at: base.created_at || candidate.created_at,
    updated_at:
      customerFreshness(candidate) > customerFreshness(base)
        ? candidate.updated_at || base.updated_at
        : base.updated_at || candidate.updated_at,
  };
}

function normalizeRankingCustomers(customers: CustomerRecord[]) {
  const map = new Map<string, CustomerRecord>();

  customers.forEach(customer => {
    const phoneKey = cleanPhoneTail(customer.phone);
    const fallbackKey = `id:${customer.id || customer.name || Math.random()}`;
    const key = phoneKey || fallbackKey;

    const current = map.get(key);

    if (!current) {
      map.set(key, customer);
      return;
    }

    map.set(key, mergeCustomerRecord(current, customer));
  });

  return Array.from(map.values()).sort((a, b) => {
    const pointsDiff = safeNumber(b.points) - safeNumber(a.points);

    if (pointsDiff !== 0) return pointsDiff;

    const spentDiff = safeNumber(b.total_spent) - safeNumber(a.total_spent);

    if (spentDiff !== 0) return spentDiff;

    return safeNumber(b.exp) - safeNumber(a.exp);
  });
}

export default function Ranking() {
  const { customers = [], extraSettings, seasons = [], loading, refreshData } = useAdmin();
  const { customerPhone } = useUser();

  const hallOfFameRef = useRef<HTMLDivElement>(null);
  const myRowRef = useRef<HTMLDivElement>(null);

  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });
  const [showRadar, setShowRadar] = useState(false);
  const [isInHallOfFame, setIsInHallOfFame] = useState(false);
  const [showPrizeDetails, setShowPrizeDetails] = useState(false);
  const [alertButton, setAlertButton] = useState(false);

  const eventActive = extraSettings?.event_active !== false;
  const hasEndDate = Boolean(extraSettings?.ranking_end_date);
  const cleanUserPhone = cleanPhoneTail(customerPhone);

  const prizes = {
    prize_1: extraSettings?.prize_1 || DEFAULT_PRIZES.prize_1,
    prize_2: extraSettings?.prize_2 || DEFAULT_PRIZES.prize_2,
    prize_3: extraSettings?.prize_3 || DEFAULT_PRIZES.prize_3,
  };

  useEffect(() => {
    if (refreshData) refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (extraSettings?.ranking_end_date && !loading && eventActive) {
      const lastSeen = localStorage.getItem('pollazo_last_prize_seen');

      if (lastSeen !== extraSettings.ranking_end_date) {
        window.setTimeout(() => setShowPrizeDetails(true), 1200);
      }
    }
  }, [eventActive, extraSettings?.ranking_end_date, loading]);

  const handleClosePrizes = () => {
    setShowPrizeDetails(false);
    setAlertButton(true);
    localStorage.setItem('pollazo_last_prize_seen', extraSettings?.ranking_end_date || '');
    window.setTimeout(() => setAlertButton(false), 2400);
  };

  useEffect(() => {
    if (!extraSettings?.ranking_end_date || !eventActive) {
      setTimeLeft({ d: '0', h: '0', m: '0', s: '0' });
      return undefined;
    }

    const updateCountdown = () => {
      const target = new Date(extraSettings.ranking_end_date || '').getTime();
      const diff = target - new Date().getTime();

      if (!target || Number.isNaN(target) || diff <= 0) {
        setTimeLeft({ d: '0', h: '0', m: '0', s: '0' });
        return;
      }

      setTimeLeft({
        d: formatCountdownValue(Math.floor(diff / (1000 * 60 * 60 * 24))),
        h: formatCountdownValue(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
        m: formatCountdownValue(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))),
        s: formatCountdownValue(Math.floor((diff % (1000 * 60)) / 1000)),
      });
    };

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [eventActive, extraSettings?.ranking_end_date]);

  const ranking = useMemo(() => {
    return normalizeRankingCustomers(customers as CustomerRecord[]);
  }, [customers]);

  const myRankIndex = ranking.findIndex(customer => {
    return cleanUserPhone && cleanPhoneTail(customer.phone) === cleanUserPhone;
  });

  const myData = myRankIndex !== -1 ? ranking[myRankIndex] : null;

  const publishedSeasons = useMemo(() => {
    return seasons
      .filter(season => season.is_published)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [seasons]);

  const nextUp = myRankIndex > 0 ? ranking[myRankIndex - 1] : null;
  const pointsToLeap = nextUp ? Math.max(0, safeNumber(nextUp.points) - safeNumber(myData?.points) + 1) : 0;
  const nextUpName = nextUp?.name?.split(' ')[0] || 'Líder';

  const myExp = safeNumber(myData?.exp);
  const myLevel = getCustomerLevel(myExp);
  const myLevelProgress = getLevelProgress(myExp);
  const myNextLevelText = getNextLevelText(myExp);

  useEffect(() => {
    if (!eventActive || !myData || myRankIndex === -1) {
      setShowRadar(false);
      return undefined;
    }

    const row = myRowRef.current;
    const hall = hallOfFameRef.current;

    if (!row) {
      setShowRadar(false);
      return undefined;
    }

    const rowObserver = new IntersectionObserver(
      ([entry]) => {
        setShowRadar(!entry.isIntersecting);
      },
      {
        threshold: 0.25,
        rootMargin: '-80px 0px -120px 0px',
      }
    );

    const hallObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInHallOfFame(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    rowObserver.observe(row);

    if (hall) hallObserver.observe(hall);

    return () => {
      rowObserver.disconnect();
      hallObserver.disconnect();
    };
  }, [eventActive, myData, myRankIndex, ranking.length]);

  const scrollToMyRank = () => {
    if (myRowRef.current) {
      myRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const shareMyRank = (e: MouseEvent) => {
    e.stopPropagation();

    const appUrl = window.location.origin;
    const text = eventActive
      ? `¡Mira! Soy el Guerrero #${myRankIndex + 1} en el Ranking VIP de Pollazo El Mirador 🍗🔥.\nTengo ${(safeNumber(myData?.points)).toLocaleString('es-EC')} puntos de temporada y ${myExp.toLocaleString('es-EC')} EXP permanente.\n¡Atrévete a superarme! 😎\n\n${appUrl}`
      : `Estoy en La Casa del Pollazo 🍗🔥. Pronto vuelve una nueva temporada del Ranking VIP. Mi EXP permanente sigue creciendo.\n\n${appUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-10">
        <Zap className="text-orange-500 animate-bounce mb-4" size={48} />
        <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">
          Sincronizando puntos...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-44 max-w-4xl mx-auto bg-slate-50 overflow-x-hidden">
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 pt-10 rounded-b-[60px] shadow-2xl text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Trophy className="absolute -bottom-10 -right-10 rotate-12" size={150} />
        </div>

        <Trophy size={60} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-bounce" />

        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 mb-4">
          {eventActive ? (
            <>
              <Activity size={13} className="text-green-300" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                Temporada activa
              </span>
            </>
          ) : (
            <>
              <Lock size={13} className="text-yellow-300" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                Temporada pausada
              </span>
            </>
          )}
        </div>

        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-1">
          {extraSettings?.ranking_title || 'Ranking VIP'}
        </h1>

        <p className="text-white/75 text-[10px] font-bold uppercase tracking-widest mb-5">
          {eventActive
            ? 'Compite por puntos de temporada'
            : 'La EXP sigue acumulándose, pero los puntos de temporada están pausados'}
        </p>

        <button
          type="button"
          onClick={() => setShowPrizeDetails(true)}
          className={`inline-flex flex-col items-center gap-1 bg-black/20 px-6 py-2.5 rounded-3xl mb-8 border border-white/10 transition-all shadow-inner hover:bg-black/30 ${
            alertButton ? 'animate-alert-glow' : 'active:scale-95'
          }`}
        >
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-yellow-300 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em]">
              Ver premios de temporada
            </p>
          </div>
          <p className="text-white font-black italic text-[9px] uppercase opacity-70">
            Haz clic para descubrir
          </p>
        </button>

        {eventActive && hasEndDate ? (
          <div className="flex justify-center gap-2">
            {[
              { v: timeLeft.d, l: 'DÍAS' },
              { v: timeLeft.h, l: 'HRS' },
              { v: timeLeft.m, l: 'MIN' },
              { v: timeLeft.s, l: 'SEG' },
            ].map((t, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 min-w-[70px] border border-white/20">
                <p className="text-xl font-black text-yellow-300 tabular-nums">{t.v}</p>
                <p className="text-[7px] font-black opacity-70 tracking-widest uppercase">{t.l}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/20 border border-white/10 rounded-[28px] p-4 max-w-xs mx-auto">
            <TimerReset size={24} className="mx-auto text-yellow-300 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
              {eventActive
                ? 'Próximamente se configurará la fecha final'
                : 'Pronto anunciaremos una nueva temporada'}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 -mt-5 relative z-20 space-y-4">
        {myData ? (
          <div className="bg-white rounded-[34px] border border-orange-100 shadow-xl p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={myData.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${myData.name}`}
                  className="w-16 h-16 rounded-[24px] object-cover border-4 border-orange-100 shadow-sm"
                  alt={myData.name || 'Cliente'}
                />
                <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-xl px-1.5 py-1 text-[9px] font-black border-2 border-white">
                  {myLevel.emoji}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">
                  Mi progreso
                </p>
                <h2 className="text-lg font-black text-slate-900 uppercase italic truncate leading-none mt-1">
                  {myData.name || 'Guerrero Pollazo'}
                </h2>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-orange-50 rounded-2xl p-2 border border-orange-100">
                    <p className="text-[7px] font-black text-orange-500 uppercase">
                      Puesto
                    </p>
                    <p className="font-black text-slate-900 text-sm">#{myRankIndex + 1}</p>
                  </div>

                  <div className="bg-yellow-50 rounded-2xl p-2 border border-yellow-100">
                    <p className="text-[7px] font-black text-yellow-600 uppercase">
                      Temporada
                    </p>
                    <p className="font-black text-slate-900 text-sm">
                      {safeNumber(myData.points).toLocaleString('es-EC')}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase">
                      Nivel
                    </p>
                    <p className="font-black text-slate-900 text-sm">
                      {myLevel.level}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={shareMyRank}
                className="p-3 bg-orange-500 text-white rounded-2xl active:scale-90 transition-all shadow-lg shadow-orange-200"
                aria-label="Compartir ranking"
              >
                <Share2 size={18} />
              </button>
            </div>

            <div className="mt-4 bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[10px] font-black text-slate-800 uppercase">
                    {myLevel.title}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400">
                    {myExp.toLocaleString('es-EC')} EXP permanente · {myNextLevelText}
                  </p>
                </div>

                <span className="text-[9px] font-black text-orange-500 uppercase">
                  {myLevelProgress}%
                </span>
              </div>

              <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-700"
                  style={{ width: `${myLevelProgress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <ShoppingBag size={14} />
                  <p className="text-[8px] font-black uppercase">
                    Compras válidas
                  </p>
                </div>
                <p className="font-black text-slate-900 text-sm">
                  {safeNumber(myData.total_orders).toLocaleString('es-EC')}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Wallet size={14} />
                  <p className="text-[8px] font-black uppercase">
                    Total histórico
                  </p>
                </div>
                <p className="font-black text-slate-900 text-sm">
                  ${money(myData.total_spent)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[34px] border border-orange-100 shadow-xl p-6 text-center">
            <BadgeCheck size={34} className="text-orange-500 mx-auto mb-3" />
            <h3 className="font-black text-slate-900 uppercase italic">
              Aún no apareces en el ranking
            </h3>
            <p className="text-xs font-bold text-slate-500 leading-relaxed mt-2">
              Cuando hagas compras válidas, tu perfil empezará a sumar EXP permanente. Si hay temporada activa, también podrás competir por puntos y premios.
            </p>
          </div>
        )}

        <div className="bg-slate-950 rounded-[32px] p-5 text-white shadow-xl border border-orange-500/20">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-900/30">
              <Sparkles size={21} className="text-white" />
            </div>

            <div>
              <h3 className="font-black uppercase italic text-sm">
                ¿Cómo funciona?
              </h3>
              <p className="text-[10px] font-bold text-white/65 leading-relaxed mt-1">
                La <span className="text-yellow-300">EXP permanente</span> sube con tus compras válidas y no se borra. Los <span className="text-orange-300">puntos de temporada</span> solo cuentan cuando el negocio activa un concurso con premios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {!eventActive && (
        <div className="mx-4 mt-6 bg-white border border-orange-100 rounded-[32px] p-5 text-center shadow-sm">
          <BadgeCheck size={32} className="text-orange-500 mx-auto mb-3" />
          <h3 className="font-black text-slate-900 uppercase italic text-lg">
            Ranking en pausa
          </h3>
          <p className="text-xs font-bold text-slate-500 leading-relaxed mt-2">
            El dueño puede activar una nueva temporada desde el admin. Tus compras seguirán sumando EXP para tu nivel, pero los puntos de concurso no se sumarán hasta que haya evento activo.
          </p>
        </div>
      )}

      <div className="px-4 mt-12 space-y-5">
        {ranking.length === 0 && (
          <div className="bg-white rounded-[34px] border border-orange-100 p-8 text-center shadow-sm">
            <Trophy size={44} className="mx-auto text-orange-300 mb-4" />
            <p className="font-black text-slate-900 uppercase">
              Aún no hay guerreros en ranking
            </p>
            <p className="text-xs font-bold text-slate-400 mt-2">
              Cuando existan clientes con puntos, aparecerán aquí.
            </p>
          </div>
        )}

        {ranking.slice(0, 3).map((customer, index) => {
          const isMe = cleanUserPhone && cleanPhoneTail(customer.phone) === cleanUserPhone;

          return (
            <RevealOnScroll key={customer.id || `${customer.phone}-${index}`} delay={index * 100}>
              <div
                ref={isMe ? myRowRef : null}
                className={`relative flex items-center gap-3 p-5 rounded-[40px] border-4 transition-all overflow-hidden scroll-mt-28 ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-xl scale-[1.03] z-20 animate-vip-shine'
                    : index === 1
                      ? 'bg-white border-slate-200 shadow-lg'
                      : 'bg-white border-orange-100 shadow-md'
                } ${isMe ? 'ring-4 ring-orange-500 ring-offset-4' : ''}`}
              >
                <div className="shrink-0 w-10 flex justify-center">
                  {index === 0 ? (
                    <Crown className="text-yellow-500 animate-king-bounce drop-shadow-md" size={40} />
                  ) : index === 1 ? (
                    <Medal className="text-slate-400" size={32} />
                  ) : (
                    <Medal className="text-orange-400" size={32} />
                  )}
                </div>

                <div className="relative shrink-0">
                  <img
                    src={customer.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${customer.name}`}
                    className="w-16 h-16 aspect-square rounded-[24px] object-cover border-2 border-white shadow-sm"
                    alt={customer.name || 'Guerrero'}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white italic shadow-md">
                    #{index + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black italic text-base text-slate-900 leading-tight break-words">
                    {customer.name || 'Guerrero'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={10} className="text-orange-500 fill-orange-500" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {getGuerreroTitle(index)}
                    </p>
                  </div>
                  <p className="text-[8px] font-black text-slate-300 uppercase mt-1">
                    {safeNumber(customer.exp).toLocaleString('es-EC')} EXP permanente
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-xl font-black leading-none ${index === 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                    {safeNumber(customer.points).toLocaleString('es-EC')}
                  </p>
                  <p className="text-[7px] font-black text-slate-400 uppercase mt-1">
                    PTS temporada
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      <div className="px-4 mt-8 space-y-3">
        {ranking.slice(3).map((customer, index) => {
          const actualIndex = index + 3;
          const isMe = cleanUserPhone && cleanPhoneTail(customer.phone) === cleanUserPhone;

          return (
            <RevealOnScroll key={customer.id || `${customer.phone}-${actualIndex}`} delay={index * 50}>
              <div
                ref={isMe ? myRowRef : null}
                className={`flex items-center gap-3 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all scroll-mt-28 ${
                  isMe ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                }`}
              >
                <span className="w-7 text-center font-black text-slate-300 text-sm italic">
                  #{actualIndex + 1}
                </span>

                <img
                  src={customer.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${customer.name}`}
                  className="w-12 h-12 aspect-square rounded-2xl object-cover border border-slate-100"
                  alt={customer.name || 'Guerrero'}
                />

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm break-words">
                    {customer.name}
                  </p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                    {getGuerreroTitle(actualIndex)}
                  </p>
                  <p className="text-[8px] font-black text-slate-300 uppercase mt-0.5">
                    {safeNumber(customer.exp).toLocaleString('es-EC')} EXP
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-lg leading-none">
                      {safeNumber(customer.points).toLocaleString('es-EC')}
                    </p>
                    <p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">
                      PTS temporada
                    </p>
                  </div>

                  {isMe && (
                    <button type="button" onClick={shareMyRank} className="p-2 bg-orange-500 text-white rounded-xl active:scale-75 transition-all shadow-sm">
                      <Share2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      <div ref={hallOfFameRef} className="mt-40 scroll-mt-10 px-5 pb-20">
        <div className="text-center mb-16 animate-in fade-in duration-1000">
          <Sparkles className="mx-auto text-orange-500 mb-4 animate-spin-slow" size={32} />
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter text-center">
            Salón de la Fama
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic text-center">
            Leyendas Inmortales 🏝️
          </p>
        </div>

        {publishedSeasons.length === 0 ? (
          <div className="bg-white rounded-[40px] border border-orange-100 p-8 text-center shadow-sm">
            <History size={38} className="mx-auto text-orange-300 mb-4" />
            <p className="text-slate-900 font-black uppercase">
              Aún no hay temporadas publicadas
            </p>
            <p className="text-xs font-bold text-slate-400 mt-2 leading-relaxed">
              Cuando finalices una temporada desde el admin, los ganadores aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-24">
            {publishedSeasons.map((season, seasonIndex) => (
              <div key={season.id} className="relative bg-slate-950 rounded-[60px] p-8 shadow-2xl border-2 border-orange-500/20">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-3 rounded-3xl font-black shadow-2xl z-30 border-2 border-slate-950 text-center flex flex-col items-center min-w-[140px]">
                  <span className="text-[8px] uppercase tracking-widest opacity-80 leading-none mb-1">
                    Temporada
                  </span>
                  <span className="text-lg italic tracking-widest leading-none">
                    #{publishedSeasons.length - seasonIndex}
                  </span>
                </div>

                <div className="text-center pt-8 mb-10">
                  <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter mb-2">
                    {season.name}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {(season.winners || []).slice(0, 3).map((winner: any, idx: number) => (
                    <div
                      key={idx}
                      className={`relative rounded-[40px] p-1 group ${
                        idx === 0
                          ? 'bg-gradient-to-tr from-yellow-300 via-yellow-600 to-yellow-300 animate-diamond-glow'
                          : idx === 1
                            ? 'bg-gradient-to-tr from-slate-200 via-slate-400 to-slate-200 animate-silver-glow'
                            : 'bg-orange-900/50 border-2 border-orange-700'
                      }`}
                    >
                      {idx === 0 && (
                        <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 fill-yellow-400 animate-crown-float drop-shadow-2xl z-40" size={42} />
                      )}

                      <div className="bg-slate-900 rounded-[38px] overflow-hidden flex flex-col h-full relative aspect-square shadow-inner">
                        <img
                          src={winner.photo_url || `https://api.dicebear.com/8.x/shapes/svg?seed=${winner.name}&backgroundColor=1e293b`}
                          className="w-full h-full object-cover absolute inset-0 grayscale-[15%] group-hover:grayscale-0 transition-all duration-500 z-0"
                          alt="Ganador"
                        />

                        <div className="absolute bottom-0 left-0 right-0 pt-20 pb-5 px-4 text-center bg-gradient-to-t from-black via-black/60 to-transparent z-20">
                          <p className="text-white font-black italic text-lg tracking-tighter mb-0.5 drop-shadow-md">
                            {winner.name}
                          </p>
                          <p className="text-orange-400 font-black text-xs uppercase drop-shadow-md">
                            {winner.points?.toLocaleString()} PTS
                          </p>
                          {winner.prize_won && (
                            <p className="text-[8px] font-bold uppercase text-white/70 mt-1 drop-shadow-md truncate">
                              {winner.prize_won}
                            </p>
                          )}
                        </div>

                        <div
                          className={`absolute top-4 right-4 z-20 p-1.5 rounded-full shadow-lg ${
                            idx === 0
                              ? 'bg-yellow-500 border border-yellow-300'
                              : idx === 1
                                ? 'bg-slate-300 border border-slate-100'
                                : 'bg-orange-700 border border-orange-500'
                          }`}
                        >
                          <Medal
                            size={20}
                            className={
                              idx === 0
                                ? 'text-slate-900'
                                : idx === 1
                                  ? 'text-slate-800'
                                  : 'text-white'
                            }
                          />
                        </div>

                        {idx === 0 && (
                          <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-[38px]">
                            <div className="absolute top-0 left-0 w-[150%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] animate-glass-shine" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPrizeDetails && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[50px] overflow-hidden shadow-2xl border-4 border-orange-500 animate-in zoom-in-95 relative">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-center text-white relative">
              <button type="button" onClick={handleClosePrizes} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full active:scale-75">
                <X size={20} />
              </button>
              <PartyPopper size={48} className="mx-auto mb-4 text-yellow-300 animate-bounce" />
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                Premios
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">
                Recompensas de Temporada
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 bg-yellow-50 p-4 rounded-[30px] border-2 border-yellow-200">
                <div className="w-14 h-14 rounded-xl bg-yellow-400 text-yellow-950 flex items-center justify-center border-2 border-yellow-300 shadow-sm">
                  <Crown size={28} className="fill-yellow-950" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-yellow-600 uppercase">
                    Campeón Oro
                  </p>
                  <p className="text-sm font-black text-slate-800 uppercase italic">
                    {prizes.prize_1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[30px] border-2 border-slate-200">
                <div className="w-14 h-14 rounded-xl bg-slate-300 text-slate-800 flex items-center justify-center border-2 border-slate-200 shadow-sm">
                  <Medal size={28} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase">
                    Guerrero Plata
                  </p>
                  <p className="text-sm font-black text-slate-800 uppercase italic">
                    {prizes.prize_2}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-[30px] border-2 border-orange-200">
                <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center font-black text-white text-xl border-2 border-orange-300">
                  3°
                </div>
                <div>
                  <p className="text-[9px] font-black text-orange-600 uppercase">
                    Guerrero Bronce
                  </p>
                  <p className="text-sm font-black text-slate-800 uppercase italic">
                    {prizes.prize_3}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-4">
                <p className="text-[10px] font-black text-slate-500 uppercase leading-relaxed text-center">
                  {eventActive
                    ? 'Los puntos de temporada se suman solo en pedidos válidos mientras el evento esté activo. La EXP permanente no se borra.'
                    : 'La temporada está pausada. Los premios se activarán cuando el negocio inicie un nuevo evento. Tu EXP permanente sigue existiendo.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClosePrizes}
                className="w-full bg-slate-950 text-white py-5 rounded-full font-black uppercase text-xs active:scale-95 border-b-4 border-slate-700 shadow-xl"
              >
                ¡Entendido! 🍗🔥
              </button>
            </div>
          </div>
        </div>
      )}

      {myData && showRadar && !isInHallOfFame && (
        <div className="fixed bottom-3 right-4 z-[10001] flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 fade-in duration-500">
          {nextUp && (
            <div className="bg-slate-900 text-white text-[9px] font-black py-1.5 px-4 rounded-full border border-orange-500 shadow-2xl animate-bounce flex items-center gap-2">
              <Target size={10} className="text-orange-500" />
              <span>
                {myRankIndex === 1 ? (
                  <>
                    ¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de ser LEYENDA SUPREMA!
                  </>
                ) : myRankIndex === 3 ? (
                  <>
                    ¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de entrar al TOP 3!
                  </>
                ) : (
                  <>
                    ¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de alcanzar a {nextUpName}!
                  </>
                )}
              </span>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <button type="button" onClick={shareMyRank} className="bg-white text-orange-500 p-2.5 rounded-full shadow-2xl border border-orange-100 active:scale-75 transition-all">
              <Share2 size={16} />
            </button>

            <button
              type="button"
              onClick={scrollToMyRank}
              className="flex items-center bg-orange-400 backdrop-blur-md text-white rounded-full p-1.5 pr-5 shadow-2xl border-2 border-white active:scale-90 transition-transform"
            >
              <div className="relative shrink-0">
                <img
                  src={myData.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${myData.name}`}
                  className="w-8 h-8 rounded-full border border-white/80 object-cover"
                  alt={myData.name || 'Cliente'}
                />
                <div className="absolute -top-1 -left-1 bg-white text-orange-600 text-[8px] font-black h-4 w-4 flex items-center justify-center rounded-full border border-orange-400">
                  {myRankIndex + 1}
                </div>
              </div>

              <div className="ml-2 text-left leading-none">
                <div className="flex items-center gap-1.5">
                  <p className="text-[7px] font-black text-slate-900 uppercase tracking-widest mb-0.5 opacity-90">
                    {myRankIndex < 3 ? '¡ERES LEYENDA! 🎉' : 'Ver mi puesto'}
                  </p>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-white font-black text-xs italic">
                    {safeNumber(myData.points).toLocaleString('es-EC')}
                  </p>
                  <p className="text-[7px] font-black text-white/80 uppercase">
                    PTS
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes alert-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(250, 204, 21, 0); }
          25% { transform: scale(1.1) rotate(-2deg); box-shadow: 0 0 40px rgba(250, 204, 21, 1); }
          50% { transform: scale(1.1) rotate(2deg); box-shadow: 0 0 40px rgba(250, 204, 21, 1); }
          75% { transform: scale(1.1) rotate(-2deg); box-shadow: 0 0 40px rgba(250, 204, 21, 1); }
        }

        @keyframes diamond-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(234,179,8,0.4); border-color: #fbbf24; }
          50% { box-shadow: 0 0 45px rgba(234,179,8,0.9); border-color: #fff; }
        }

        @keyframes silver-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(203,213,225,0.4); }
          50% { box-shadow: 0 0 35px rgba(203,213,225,0.7); }
        }

        @keyframes crown-float {
          0%, 100% { transform: translate(-50%, 0) rotate(-5deg); }
          50% { transform: translate(-50%, -12px) rotate(5deg); }
        }

        @keyframes king-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes vip-shine {
          0% { box-shadow: 0 0 15px rgba(250,204,21,0.2); }
          50% { box-shadow: 0 0 35px rgba(250,204,21,0.5); }
          100% { box-shadow: 0 0 15px rgba(250,204,21,0.2); }
        }

        @keyframes glass-shine {
          0%, 10% { transform: translateX(-150%) skewX(-25deg); }
          90%, 100% { transform: translateX(200%) skewX(-25deg); }
        }

        .animate-alert-glow {
          animation: alert-glow 0.8s ease-in-out 3;
          z-index: 50;
          position: relative;
        }

        .animate-diamond-glow {
          animation: diamond-glow 2s infinite ease-in-out;
        }

        .animate-silver-glow {
          animation: silver-glow 2s infinite ease-in-out;
        }

        .animate-crown-float {
          animation: crown-float 3s infinite ease-in-out;
        }

        .animate-king-bounce {
          animation: king-bounce 3s infinite ease-in-out;
        }

        .animate-vip-shine {
          animation: vip-shine 3s infinite ease-in-out;
        }

        .animate-spin-slow {
          animation: spin 15s linear infinite;
        }

        .animate-glass-shine {
          animation: glass-shine 4s ease-in-out infinite;
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
