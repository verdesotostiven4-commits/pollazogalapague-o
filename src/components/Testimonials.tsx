import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Send, Trash2, X, User, Sparkles } from 'lucide-react';
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

// ✅ ESTRELLAS INTERACTIVAS CON ANIMACIÓN
function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const btnClass = onChange ? 'cursor-pointer active:scale-75 transition-all duration-200' : 'cursor-default';
  
  return (
    <div className="flex gap-2 p-2 bg-gray-50 rounded-2xl w-fit">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`${btnClass} ${star <= (hover || value) ? 'scale-110' : 'scale-100 opacity-40'}`}
        >
          <Star 
            size={28} 
            className={`transition-colors ${star <= (hover || value) ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-300 fill-gray-200'}`} 
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

export default function Testimonials() {
  const { customerName, customerAvatar, customerPhone } = useUser(); 
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
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

  useEffect(() => {
    if (showForm) {
      setName(customerName || '');
      setPhotoUrl(customerAvatar || '');
    }
  }, [showForm, customerName, customerAvatar]);

  const fetchTestimonials = useCallback(async () => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setTestimonials(data as Testimonial[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  // ✅ FUNCIÓN MÁGICA PARA LOS 10 PUNTOS (Anti-trampa)
  const awardReviewPoints = async () => {
    if (!customerPhone) return;

    try {
      // 1. Verificamos si el usuario ya recibió puntos por comentar
      const { data: customer } = await supabase
        .from('customers')
        .select('has_reviewed, points')
        .eq('whatsapp', customerPhone)
        .single();

      if (customer && !customer.has_reviewed) {
        // 2. Sumamos 10 puntos y marcamos que ya comentó
        await supabase
          .from('customers')
          .update({ 
            points: (customer.points || 0) + 10,
            has_reviewed: true 
          })
          .eq('whatsapp', customerPhone);
      }
    } catch (e) {
      console.error("Error al asignar puntos:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) { setError('Completa tu nombre y comentario.'); return; }
    
    setSubmitting(true);
    setError('');

    const { error: err } = await supabase.from('testimonials').insert({
      author_name: name.trim(),
      stars,
      comment: comment.trim(),
      photo_url: photoUrl.trim() || null,
      customer_phone: customerPhone // Guardamos referencia para saber quién comentó
    });

    if (err) {
      setSubmitting(false);
      setError('Error al enviar. Intenta de nuevo.');
      return;
    }

    // ✅ Asignar puntos al éxito
    await awardReviewPoints();

    setSubmitting(false);
    setSuccess(true);
    setComment('');
    setTimeout(() => { 
      setSuccess(false); 
      setShowForm(false); 
    }, 2500);
    fetchTestimonials();
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
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    setHoldProgress(0);
  };

  const avg = testimonials.length > 0
    ? testimonials.reduce((s, t) => s + t.stars, 0) / testimonials.length
    : 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between bg-white">
        <div
          className="select-none"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
        >
          <h3 className="font-black text-gray-900 text-base uppercase tracking-tight italic">Opiniones Reales</h3>
          {holdProgress > 0 && (
            <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden w-32">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${holdProgress}%`, transition: 'none' }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {adminMode && (
            <button onClick={() => setAdminMode(false)} className="text-[10px] text-red-500 font-black bg-red-50 px-3 py-1.5 rounded-full uppercase tracking-tighter border border-red-100">
              Cerrar Admin
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showForm ? 'bg-gray-100 text-gray-500' : 'bg-orange-500 text-white shadow-lg shadow-orange-200 active:scale-95'}`}
          >
            {showForm ? <X size={14} /> : <Sparkles size={14} fill="currentColor" />}
            {showForm ? 'Cancelar' : 'Opinar'}
          </button>
        </div>
      </div>

      {testimonials.length > 0 && !showForm && (
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-5 bg-gradient-to-br from-orange-50/50 to-white rounded-[32px] px-5 py-5 border border-orange-100/50">
            <div className="text-center min-w-[70px]">
              <p className="text-4xl font-black text-orange-500 leading-none drop-shadow-sm">{avg.toFixed(1)}</p>
              <div className="flex justify-center mt-2 scale-75 origin-center">
                <StarRating value={Math.round(avg)} />
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">{testimonials.length} opiniones</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map(num => (
                <StarStatRow key={num} star={num} testimonials={testimonials} />
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="px-5 py-6 border-b border-gray-100 bg-orange-50/20">
          {success ? (
            <div className="flex flex-col items-center py-8 gap-4 animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-500 rounded-3xl flex items-center justify-center shadow-xl shadow-green-100 rotate-12">
                <Star size={32} className="text-white fill-white" />
              </div>
              <div className="text-center">
                <p className="text-green-600 font-black text-lg uppercase tracking-tight">¡Gracias por tu aporte!</p>
                <p className="text-green-800/60 text-xs font-bold uppercase mt-1">Tus 10 puntos han sido sumados.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-3 bg-white p-4 rounded-3xl border border-orange-100 shadow-sm">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border-2 border-orange-200 shrink-0">
                  {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="p-3 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estás publicando como:</p>
                  <p className="text-base font-bold text-gray-800 truncate">{name || 'Visitante'}</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-3 font-black uppercase tracking-widest">¿Qué puntuación nos das?</p>
                <div className="flex justify-center">
                  <StarRating value={stars} onChange={setStars} />
                </div>
              </div>

              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Cuéntanos... ¿Qué tal estuvo tu pedido?"
                maxLength={300}
                rows={4}
                className="w-full bg-white border-2 border-orange-100 rounded-[28px] px-5 py-4 text-sm text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 resize-none shadow-inner transition-all"
              />

              {error && <p className="text-red-500 text-xs font-black text-center uppercase tracking-tighter">{error}</p>}
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 bg-orange-500 text-white font-black py-5 rounded-[28px] shadow-xl shadow-orange-200 active:scale-95 transition-all disabled:opacity-60 uppercase text-sm tracking-[0.2em]"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Send size={18} /> Publicar Opinión</>
                )}
              </button>
              
              <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">Al publicar recibirás +10 puntos automáticamente</p>
            </form>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-50 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <MessageCircle size={30} className="text-gray-200" />
            </div>
            <p className="text-gray-300 font-black uppercase text-[10px] tracking-[0.3em]">Aún no hay opiniones</p>
          </div>
        ) : (
          testimonials.map(t => (
            <div key={t.id} className="flex gap-4 px-5 py-6 hover:bg-orange-50/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-orange-50 bg-gray-50 shadow-sm">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.author_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600 font-black text-base uppercase">
                    {t.author_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{t.author_name}</p>
                  {adminMode && (
                    <button onClick={() => handleDelete(t.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100 active:scale-75 transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="scale-75 origin-left opacity-90 mb-2">
                    <StarRating value={t.stars} />
                </div>
                <p className="text-gray-600 text-[13px] leading-relaxed font-medium">{t.comment}</p>
                <p className="text-gray-300 text-[9px] mt-3 font-black uppercase tracking-widest">
                  {new Date(t.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
