import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Star,
  Send,
  Trash2,
  User,
  Sparkles,
  Trophy,
  PartyPopper,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useAdmin } from '../context/AdminContext';

interface Testimonial {
  id: string;
  author_name: string;
  stars: number;
  comment: string;
  photo_url: string | null;
  created_at: string;
}

interface CustomerReviewRow {
  id: string;
  phone?: string | null;
  points?: number | null;
  exp?: number | null;
  total_spent?: number | null;
  has_reviewed?: boolean | null;
  updated_at?: string | null;
}

const ADMIN_HOLD_MS = 3000;
const REVIEW_STORAGE_PREFIX = 'pollazo_has_reviewed_';

interface Props {
  onNavigateRanking?: () => void;
}

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={
            {
              left: '50%',
              top: '40%',
              backgroundColor: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#fbbf24' : '#ffffff',
              animationDelay: `${Math.random() * 0.5}s`,
              '--x': `${(Math.random() - 0.5) * 400}px`,
              '--y': `${(Math.random() - 0.2) * 400}px`,
            } as React.CSSProperties & { '--x': string; '--y': string }
          }
        />
      ))}
    </div>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  const btnClass = onChange
    ? 'cursor-pointer active:scale-125 transition-all duration-200'
    : 'cursor-default';

  return (
    <div className="flex gap-1.5 py-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={btnClass}
          aria-label={`${s} estrellas`}
        >
          <Star
            size={onChange ? 26 : 18}
            className={`${
              s <= value
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-200 fill-gray-100'
            } transition-all`}
          />
        </button>
      ))}
    </div>
  );
}

function StarStatRow({
  star,
  testimonials,
}: {
  star: number;
  testimonials: Testimonial[];
}) {
  const cnt = testimonials.filter(t => t.stars === star).length;
  const pct = testimonials.length > 0 ? (cnt / testimonials.length) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-2 font-bold">{star}</span>
      <Star size={8} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-4 text-right">{cnt}</span>
    </div>
  );
}

export default function Testimonials({ onNavigateRanking }: Props) {
  const { customerName, customerAvatar, customerPhone } = useUser();
  const { extraSettings } = useAdmin();

  const seasonActive = extraSettings?.event_active !== false;

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [pointsGainedNow, setPointsGainedNow] = useState(false);

  const [name, setName] = useState('');
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const getCleanPhone = useCallback((phone?: string | null) => {
    return String(phone || '').replace(/\D/g, '').slice(-9);
  }, []);

  const reviewStorageKey = useMemo(() => {
    const clean = getCleanPhone(customerPhone);

    return clean ? `${REVIEW_STORAGE_PREFIX}${clean}` : '';
  }, [customerPhone, getCleanPhone]);

  const readLocalReviewed = useCallback(() => {
    if (!reviewStorageKey) return false;

    return localStorage.getItem(reviewStorageKey) === '1';
  }, [reviewStorageKey]);

  const markLocalReviewed = useCallback(() => {
    if (!reviewStorageKey) return;

    localStorage.setItem(reviewStorageKey, '1');
  }, [reviewStorageKey]);

  const checkReviewStatus = useCallback(async () => {
    if (!customerPhone) {
      setHasReviewed(false);
      return;
    }

    if (readLocalReviewed()) {
      setHasReviewed(true);
    }

    if (!isSupabaseConfigured) return;

    const clean = getCleanPhone(customerPhone);

    if (!clean) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, has_reviewed')
        .ilike('phone', `%${clean}`)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('No se pudo verificar estado de opinión:', error);
        return;
      }

      const customer = data?.[0] as { id: string; has_reviewed?: boolean | null } | undefined;

      if (customer?.has_reviewed) {
        setHasReviewed(true);
        markLocalReviewed();
        return;
      }

      if (!readLocalReviewed()) {
        setHasReviewed(false);
      }
    } catch {
      // Si Supabase falla temporalmente, usamos localStorage solo para ocultar el banner,
      // pero el premio real se decide en servidor al publicar.
    }
  }, [customerPhone, getCleanPhone, markLocalReviewed, readLocalReviewed]);

  const fetchTestimonials = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTestimonials(data as Testimonial[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    checkReviewStatus();
  }, [checkReviewStatus]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  useEffect(() => {
    if (showForm) {
      setName(customerName || '');
      setPhotoUrl(customerAvatar || '');
      setError('');
    }
  }, [showForm, customerName, customerAvatar]);

  const findCustomerForReview = useCallback(async () => {
    if (!isSupabaseConfigured || !customerPhone) return null;

    const clean = getCleanPhone(customerPhone);

    if (!clean) return null;

    const { data, error } = await supabase
      .from('customers')
      .select('id, phone, points, exp, total_spent, has_reviewed, updated_at')
      .ilike('phone', `%${clean}`)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('No se pudo buscar cliente para opinión:', error);
      return null;
    }

    return (data?.[0] as CustomerReviewRow | undefined) || null;
  }, [customerPhone, getCleanPhone]);

  const markReviewedOnServerSafely = useCallback(async () => {
    if (!isSupabaseConfigured || !customerPhone) {
      return {
        marked: false,
        awardedPoints: false,
      };
    }

    const clean = getCleanPhone(customerPhone);

    if (!clean) {
      return {
        marked: false,
        awardedPoints: false,
      };
    }

    const normalizedPhone = customerPhone.replace(/\D/g, '');
    const now = new Date().toISOString();

    try {
      const user = await findCustomerForReview();

      if (user?.id) {
        if (user.has_reviewed === true) {
          return {
            marked: true,
            awardedPoints: false,
          };
        }

        const nextPoints = seasonActive ? Number(user.points || 0) + 10 : Number(user.points || 0);

        const { data: updatedRows, error: updateError } = await supabase
          .from('customers')
          .update({
            points: nextPoints,
            has_reviewed: true,
            updated_at: now,
          })
          .eq('id', user.id)
          .or('has_reviewed.is.null,has_reviewed.eq.false')
          .select('id, points, has_reviewed')
          .limit(1);

        if (updateError) {
          console.warn('No se pudo actualizar has_reviewed/puntos:', updateError);
          return {
            marked: false,
            awardedPoints: false,
          };
        }

        const updated = updatedRows?.[0];

        if (!updated) {
          return {
            marked: true,
            awardedPoints: false,
          };
        }

        return {
          marked: true,
          awardedPoints: seasonActive,
        };
      }

      const basePayload = {
        phone: normalizedPhone,
        name: customerName || name.trim() || null,
        avatar_url: customerAvatar || photoUrl.trim() || null,
        points: seasonActive ? 10 : 0,
        has_reviewed: true,
        updated_at: now,
      };

      const { error: upsertError } = await supabase
        .from('customers')
        .upsert(basePayload, { onConflict: 'phone' });

      if (upsertError) {
        console.warn('No se pudo crear cliente para opinión:', upsertError);
        return {
          marked: false,
          awardedPoints: false,
        };
      }

      return {
        marked: true,
        awardedPoints: seasonActive,
      };
    } catch (serverError) {
      console.warn('Error inesperado marcando opinión:', serverError);

      return {
        marked: false,
        awardedPoints: false,
      };
    }
  }, [
    customerAvatar,
    customerName,
    customerPhone,
    findCustomerForReview,
    getCleanPhone,
    name,
    photoUrl,
    seasonActive,
  ]);

  const playRewardSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      audio.play().catch(() => undefined);
    } catch {
      // El sonido es opcional.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !comment.trim()) {
      setError('Completa tu nombre y comentario.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('No se pudo conectar para publicar la opinión.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: testErr } = await supabase.from('testimonials').insert({
        author_name: name.trim(),
        stars,
        comment: comment.trim(),
        photo_url: photoUrl.trim() || null,
        customer_phone: customerPhone ? customerPhone.replace(/\D/g, '') : null,
      });

      if (testErr) {
        throw new Error('Error al publicar opinión.');
      }

      let awardedPoints = false;

      if (customerPhone) {
        const result = await markReviewedOnServerSafely();

        if (result.marked) {
          markLocalReviewed();
          setHasReviewed(true);
        }

        awardedPoints = result.awardedPoints;
      }

      if (awardedPoints) {
        setPointsGainedNow(true);
        playRewardSound();
      } else {
        setPointsGainedNow(false);
      }

      setSubmitting(false);
      setSuccess(true);
      setComment('');
      fetchTestimonials();

      window.setTimeout(() => {
        setSuccess(false);
        setPointsGainedNow(false);
        setShowForm(false);
      }, awardedPoints ? 9000 : 4500);
    } catch (err: any) {
      setSubmitting(false);
      setError(err?.message || 'No se pudo publicar tu opinión.');
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('testimonials').delete().eq('id', id);
    setTestimonials(prev => prev.filter(t => t.id !== id));
  };

  const startHold = () => {
    holdStartRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current;
      const pct = Math.min(100, (elapsed / ADMIN_HOLD_MS) * 100);

      setHoldProgress(pct);

      if (elapsed < ADMIN_HOLD_MS) {
        holdRafRef.current = requestAnimationFrame(tick);
      } else {
        setAdminMode(true);
        setHoldProgress(0);
      }
    };

    holdRafRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current);
    }

    setHoldProgress(0);
  };

  const avg =
    testimonials.length > 0
      ? testimonials.reduce((s, t) => s + t.stars, 0) / testimonials.length
      : 0;

  const showRewardBanner =
    seasonActive &&
    !hasReviewed &&
    Boolean(customerName.trim()) &&
    Boolean(customerPhone.trim());

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {showRewardBanner && (
        <div className="relative overflow-hidden group bg-orange-600">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent -translate-x-full animate-gold-sweep" />

          <div className="relative p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-inner border border-white/10 animate-pulse">
              <Sparkles size={24} fill="currentColor" />
            </div>

            <div className="flex-1">
              <p className="text-white font-black text-xs uppercase tracking-tight mb-1 leading-none drop-shadow-sm">
                ¡Suma puntos de temporada!
              </p>
              <p className="text-white/80 text-[10px] font-bold uppercase leading-tight">
                Tu primera opinión en el Club Pollazo te regala
                <span className="inline-block ml-2 bg-yellow-400 text-orange-900 px-2 py-0.5 rounded-md font-black shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-glow-points">
                  +10 PUNTOS
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between">
        <div
          className="select-none"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
        >
          <h3 className="font-black text-gray-900 text-base uppercase tracking-tight italic">
            Opiniones del Club
          </h3>

          {holdProgress > 0 && (
            <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden w-32">
              <div
                className="h-full bg-orange-500 rounded-full"
                style={{ width: `${holdProgress}%`, transition: 'none' }}
              />
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setSuccess(false);
            setPointsGainedNow(false);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-black px-4 py-2.5 rounded-2xl active:scale-95 transition-all shadow-lg uppercase"
        >
          {showForm ? 'Cerrar' : 'Opinar'}
        </button>
      </div>

      {testimonials.length > 0 && !showForm && (
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-5 bg-gradient-to-br from-orange-50/50 to-white rounded-[32px] px-5 py-5 border border-orange-100">
            <div className="text-center min-w-[64px]">
              <p className="text-4xl font-black text-orange-500 leading-none">
                {avg.toFixed(1)}
              </p>
              <div className="flex justify-center mt-2 scale-75 origin-center">
                <StarRating value={Math.round(avg)} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">
                {testimonials.length} opiniones
              </p>
            </div>

            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map(num => (
                <StarStatRow key={num} star={num} testimonials={testimonials} />
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="px-5 py-6 border-b border-gray-100 bg-orange-50/20 relative min-h-[300px] flex items-center justify-center">
          {success ? (
            <div className="flex flex-col items-center py-6 gap-6 animate-award-boom relative w-full">
              {pointsGainedNow && <Confetti />}

              <div
                className={`w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl relative z-10 ${
                  pointsGainedNow
                    ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 animate-king-bounce'
                    : 'bg-green-500'
                }`}
              >
                {pointsGainedNow ? (
                  <Trophy
                    size={50}
                    className="text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
                  />
                ) : (
                  <PartyPopper size={50} className="text-white" />
                )}
              </div>

              <div className="text-center space-y-4 relative z-10">
                <p
                  className={`font-black text-2xl uppercase tracking-tighter leading-none italic ${
                    pointsGainedNow ? 'text-orange-700' : 'text-green-700'
                  }`}
                >
                  {pointsGainedNow ? '¡Felicidades!' : '¡Publicado!'}
                </p>

                {pointsGainedNow ? (
                  <div className="space-y-6">
                    <p className="text-orange-900 text-[11px] font-black uppercase tracking-widest leading-tight px-4">
                      Ganaste +10 puntos de temporada.
                      <br />
                      ¡Gracias por apoyar al Club Pollazo!
                    </p>

                    <button
                      onClick={() => onNavigateRanking?.()}
                      className="bg-orange-600 text-white px-6 py-4 rounded-full font-black text-xs uppercase shadow-xl border-b-4 border-orange-800 active:scale-95 transition-all flex items-center gap-3 mx-auto relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                      Ver ranking <Trophy size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="text-green-600/70 text-xs font-bold uppercase px-6 italic">
                    ¡Gracias por compartir tu experiencia!
                  </p>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-orange-100 shadow-sm">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-orange-200 shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    <User className="p-2 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                    Publicando como:
                  </p>
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {name || 'Invitado'}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[11px] text-gray-500 mb-2 font-black uppercase tracking-widest">
                  Danos tu calificación
                </p>
                <div className="flex justify-center">
                  <StarRating value={stars} onChange={setStars} />
                </div>
              </div>

              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="¿Cómo estuvo tu experiencia?..."
                maxLength={300}
                rows={4}
                className="w-full bg-white border-2 border-orange-50 rounded-2xl px-5 py-4 text-sm text-gray-800 outline-none focus:border-orange-500 transition-all shadow-inner"
              />

              {error && (
                <p className="text-center text-[10px] font-black text-red-500 uppercase leading-relaxed">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 bg-orange-500 text-white font-black py-5 rounded-[22px] shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-60 uppercase text-sm tracking-[0.15em]"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} /> Publicar opinión
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {!loading &&
          testimonials.map(t => (
            <div
              key={t.id}
              className="flex gap-4 px-5 py-6 hover:bg-gray-50/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-100 bg-gray-50 shadow-sm">
                {t.photo_url ? (
                  <img
                    src={t.photo_url}
                    alt={t.author_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500 font-black text-sm uppercase">
                    {t.author_name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-900 truncate tracking-tight">
                    {t.author_name}
                  </p>

                  {adminMode && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center border border-red-100 active:scale-75 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="scale-75 origin-left opacity-80 mb-1">
                  <StarRating value={t.stars} />
                </div>

                <p className="text-gray-600 text-[13px] font-medium leading-relaxed">
                  {t.comment}
                </p>

                <p className="text-gray-300 text-[9px] mt-2 font-bold uppercase tracking-widest">
                  {new Date(t.created_at).toLocaleDateString('es-EC', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          ))}
      </div>

      <style>{`
        @keyframes gold-sweep {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }

        .animate-gold-sweep {
          animation: gold-sweep 4s infinite linear;
        }

        @keyframes glow-points {
          0%, 100% {
            box-shadow: 0 0 5px #fbbf24;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 25px #fbbf24;
            transform: scale(1.05);
          }
        }

        .animate-glow-points {
          animation: glow-points 2s infinite ease-in-out;
        }

        @keyframes award-boom {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.2) rotate(5deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        .animate-award-boom {
          animation: award-boom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          opacity: 0;
          animation: confetti-burst 4s ease-out forwards;
        }

        @keyframes confetti-burst {
          0% {
            transform: translate(0, 0) rotate(0);
            opacity: 1;
          }
          100% {
            transform: translate(var(--x), var(--y)) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes king-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-king-bounce {
          animation: king-bounce 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
