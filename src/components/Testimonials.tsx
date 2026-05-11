import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Send, Trash2, X, User, Sparkles, Trophy, PartyPopper } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext'; 

interface Testimonial {
  id: string;
  author_name: string;
  stars: number;
  comment: string;
  photo_url: string | null;
  created_at: string;
}

const ADMIN_HOLD_MS = 3000;

interface Props {
  onNavigateRanking?: () => void;
}

// ✅ COMPONENTE DE CONFETI PARA CELEBRACIÓN
function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i} 
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: i % 2 === 0 ? '#f97316' : '#fbbf24',
            animationDelay: `${Math.random() * 3}s`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const btnClass = onChange ? 'cursor-pointer active:scale-125 transition-all duration-200' : 'cursor-default';
  return (
    <div className="flex gap-1.5 py-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange?.(s)} className={btnClass}>
          <Star 
            size={onChange ? 26 : 18} 
            className={`${s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'} transition-all`} 
          />
        </button>
      ))}
    </div>
  );
}

function StarStatRow({ star, testimonials }: { star: number, testimonials: Testimonial[] }) {
  const cnt = testimonials.filter(t => t.stars === star).length;
  const pct = testimonials.length > 0 ? (cnt / testimonials.length) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-2 font-bold">{star}</span>
      <Star size={8} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-4 text-right">{cnt}</span>
    </div>
  );
}

export default function Testimonials({ onNavigateRanking }: Props) {
  const { customerName, customerAvatar, customerPhone } = useUser(); 
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
  const holdRafRef = useRef<number>();
  const holdStartRef = useRef<number>(0);

  const getCleanPhone = (p: string) => (p || "").replace(/\D/g, '').slice(-9);

  const checkReviewStatus = useCallback(async () => {
    if (!customerPhone) return;
    const clean = getCleanPhone(customerPhone);
    try {
        const { data } = await supabase.from('customers').select('has_reviewed').ilike('phone', `%${clean}`).maybeSingle();
        if (data) setHasReviewed(!!data.has_reviewed);
    } catch (e) { console.error(e); }
  }, [customerPhone]);

  useEffect(() => { checkReviewStatus(); }, [checkReviewStatus]);

  useEffect(() => {
    if (showForm) {
      setName(customerName || '');
      setPhotoUrl(customerAvatar || '');
    }
  }, [showForm, customerName, customerAvatar]);

  const fetchTestimonials = useCallback(async () => {
    const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setTestimonials(data as Testimonial[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) { setError('Completa tu nombre y comentario.'); return; }
    
    setSubmitting(true);
    setError('');

    try {
        const clean = getCleanPhone(customerPhone || "");
        
        // 1. Enviar Testimonio
        const { error: testErr } = await supabase.from('testimonials').insert({
            author_name: name.trim(),
            stars,
            comment: comment.trim(),
            photo_url: photoUrl.trim() || null,
        });

        if (testErr) throw new Error("Error al publicar opinión.");

        // 2. Sumar Puntos si es la primera vez
        let isFirstTime = false;
        if (customerPhone && !hasReviewed) {
            const { data: user } = await supabase.from('customers').select('id, points').ilike('phone', `%${clean}`).maybeSingle();
            
            if (user) {
                const { error: upError } = await supabase.from('customers').update({ 
                    points: (user.points || 0) + 10, 
                    has_reviewed: true 
                }).eq('id', user.id);

                if (!upError) {
                    setHasReviewed(true);
                    setPointsGainedNow(true);
                    isFirstTime = true;
                }
            }
        }

        setSubmitting(false);
        setSuccess(true);
        setComment('');
        fetchTestimonials();

        // ⏱️ TIEMPO INTELIGENTE: 10 seg si ganó puntos, 5.5 seg si no.
        setTimeout(() => {
            setSuccess(false);
            setPointsGainedNow(false);
            setShowForm(false);
        }, isFirstTime ? 10000 : 5500);

    } catch (err: any) {
        setSubmitting(false);
        setError(err.message);
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
      if (elapsed < ADMIN_HOLD_MS) holdRafRef.current = requestAnimationFrame(tick);
      else { setAdminMode(true); setHoldProgress(0); }
    };
    holdRafRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    setHoldProgress(0);
  };

  const avg = testimonials.length > 0 ? testimonials.reduce((s, t) => s + t.stars, 0) / testimonials.length : 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      
      {/* 🚀 BANNER CAZADOR DE PUNTOS VIP */}
      {!hasReviewed && customerName && (
        <div className="relative overflow-hidden group bg-orange-600">
            {/* Animación de brillo (Shine) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine-banner" />
            
            <div className="relative p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-inner border border-white/10 animate-pulse">
                    <Sparkles size={24} fill="currentColor" />
                </div>
                <div className="flex-1">
                    <p className="text-white font-black text-xs uppercase tracking-tight mb-1 leading-none">¡Gana puntos gratis para ganar premios!</p>
                    <p className="text-white/80 text-[10px] font-bold uppercase leading-tight">
                        Envía tu primera opinión y recibe 
                        <span className="inline-block ml-1.5 bg-yellow-400 text-orange-800 px-2 py-0.5 rounded-md font-black shadow-lg animate-glow-points">+10 PUNTOS</span>
                    </p>
                </div>
            </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between">
        <div className="select-none" onMouseDown={startHold} onMouseUp={cancelHold} onTouchStart={startHold} onTouchEnd={cancelHold}><h3 className="font-black text-gray-900 text-base uppercase tracking-tight italic">Opiniones del Club</h3>{holdProgress > 0 && <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden w-32"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${holdProgress}%`, transition: 'none' }} /></div>}</div>
        <button onClick={() => { setSuccess(false); setPointsGainedNow(false); setShowForm(!showForm); }} className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-black px-4 py-2.5 rounded-2xl active:scale-95 transition-all shadow-lg uppercase">{showForm ? 'Cerrar' : 'Opinar'}</button>
      </div>

      {testimonials.length > 0 && !showForm && (
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-5 bg-gradient-to-br from-orange-50/50 to-white rounded-[32px] px-5 py-5 border border-orange-100">
            <div className="text-center min-w-[64px]">
              <p className="text-4xl font-black text-orange-500 leading-none">{avg.toFixed(1)}</p>
              <div className="flex justify-center mt-2 scale-75 origin-center"><StarRating value={Math.round(avg)} /></div>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">{testimonials.length} opiniones</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map(num => <StarStatRow key={num} star={num} testimonials={testimonials} />)}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="px-5 py-6 border-b border-gray-100 bg-orange-50/20 relative">
          {success ? (
            <div className="flex flex-col items-center py-6 gap-6 animate-in zoom-in duration-500 relative">
              {pointsGainedNow && <Confetti />}
              
              <div className={`w-24 h-24 rounded-[30px] flex items-center justify-center shadow-2xl relative z-10 ${pointsGainedNow ? 'bg-gradient-to-br from-yellow-400 to-orange-600 animate-bounce' : 'bg-green-500'}`}>
                {pointsGainedNow ? <Trophy size={48} className="text-white drop-shadow-md animate-king-bounce" /> : <PartyPopper size={48} className="text-white" />}
              </div>
              
              <div className="text-center space-y-4 relative z-10">
                <p className={`font-black text-xl uppercase tracking-tighter leading-none ${pointsGainedNow ? 'text-orange-700' : 'text-green-700'}`}>
                    {pointsGainedNow ? '¡FELICIDADES!' : '¡Opinión Publicada!'}
                </p>
                
                {pointsGainedNow ? (
                    <div className="space-y-6">
                        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-3xl border-2 border-orange-200">
                            <p className="text-orange-900 text-xs font-black uppercase px-2">Has ganado 10 Puntos por ser parte activa del club.</p>
                        </div>
                        <button 
                          onClick={() => onNavigateRanking?.()} 
                          className="bg-orange-600 text-white px-8 py-5 rounded-full font-black text-sm uppercase shadow-2xl shadow-orange-300 active:scale-95 transition-all flex items-center gap-3 mx-auto border-b-4 border-orange-800 animate-pulse-slow"
                        >
                          RECLAMAR MIS PUNTOS EN RANKING <Trophy size={20} />
                        </button>
                    </div>
                ) : (
                    <p className="text-green-600/70 text-xs font-bold uppercase px-6">¡Gracias por compartir tu experiencia con nosotros!</p>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-orange-100 shadow-sm">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-orange-200 shrink-0">{photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="p-2 text-gray-400" />}</div>
                <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Publicando como:</p><p className="text-sm font-bold text-gray-800 truncate">{name || 'Invitado'}</p></div>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-500 mb-2 font-black uppercase tracking-widest">¿Qué calificación nos das?</p>
                <div className="flex justify-center"><StarRating value={stars} onChange={setStars} /></div>
              </div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Cuéntanos tu experiencia..." maxLength={300} rows={4} className="w-full bg-white border-2 border-orange-50 rounded-2xl px-5 py-4 text-sm text-gray-800 outline-none focus:border-orange-500 transition-all shadow-inner" />
              {error && <p className="text-red-500 text-xs font-black text-center uppercase tracking-tight">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-3 bg-orange-500 text-white font-black py-5 rounded-[22px] shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-60 uppercase text-sm tracking-[0.15em]">{submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={18} /> Publicar opinión</>}</button>
            </form>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {!loading && testimonials.map(t => (
          <div key={t.id} className="flex gap-4 px-5 py-6 hover:bg-gray-50/50 transition-colors">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-100 bg-gray-50 shadow-sm">{t.photo_url ? <img src={t.photo_url} alt={t.author_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500 font-black text-sm uppercase">{t.author_name.charAt(0)}</div>}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1"><p className="text-sm font-bold text-gray-900 truncate tracking-tight">{t.author_name}</p>{adminMode && <button onClick={() => handleDelete(t.id)} className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center border border-red-100 active:scale-75 transition-all"><Trash2 size={13} /></button>}</div>
              <div className="scale-75 origin-left opacity-80 mb-1"><StarRating value={t.stars} /></div>
              <p className="text-gray-600 text-[13px] font-medium leading-relaxed">{t.comment}</p>
              <p className="text-gray-300 text-[9px] mt-2 font-bold uppercase tracking-widest">{new Date(t.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
        
        @keyframes shine-banner { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        .animate-shine-banner { animation: shine-banner 4s infinite linear; }
        
        @keyframes glow-points { 0%, 100% { box-shadow: 0 0 5px #fbbf24; transform: scale(1); } 50% { box-shadow: 0 0 20px #fbbf24; transform: scale(1.05); } }
        .animate-glow-points { animation: glow-points 2s infinite ease-in-out; }
        
        .confetti-piece { 
          position: absolute; width: 8px; height: 8px; top: -10px;
          opacity: 0; animation: confetti-fall 4s ease-out forwards;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        .animate-pulse-slow { animation: pulse-slow 2s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
