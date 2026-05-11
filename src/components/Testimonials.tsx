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

// ✅ ESTRELLAS MEJORADAS: Resaltan y tienen brillo dorado al seleccionar
function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const btnClass = onChange ? 'cursor-pointer active:scale-125 transition-all duration-300' : 'cursor-default';
  
  return (
    <div className="flex gap-1.5 py-1">
      {[1, 2, 3, 4, 5].map((num) => (
        <button key={num} type="button" onClick={() => onChange?.(num)} className={btnClass}>
          <Star 
            size={num <= value ? 24 : 18} 
            className={`transition-all duration-300 ${
              num <= value 
                ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' 
                : 'text-gray-200 fill-gray-100'
            }`} 
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
      <span className="text-[10px] text-gray-500 w-2">{star}</span>
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
  const [hasReviewed, setHasReviewed] = useState(false);
  
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

  // Verificar si ya comentó para ocultar el banner
  useEffect(() => {
    async function checkReview() {
      if (!customerPhone) return;
      const { data } = await supabase.from('customers').select('has_reviewed').eq('whatsapp', customerPhone).single();
      if (data) setHasReviewed(data.has_reviewed);
    }
    checkReview();
  }, [customerPhone]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) { setError('Completa tu nombre y comentario.'); return; }
    
    setSubmitting(true);
    setError('');

    // 1. Guardar testimonio
    const { error: err } = await supabase.from('testimonials').insert({
      author_name: name.trim(),
      stars,
      comment: comment.trim(),
      photo_url: photoUrl.trim() || null,
      customer_phone: customerPhone
    });

    if (err) {
      setSubmitting(false);
      setError('Error al enviar. Intenta de nuevo.');
      return;
    }

    // 2. Si es su primer comentario, darle puntos
    if (!hasReviewed && customerPhone) {
        const { data: customer } = await supabase.from('customers').select('points').eq('whatsapp', customerPhone).single();
        await supabase.from('customers').update({ 
            points: (customer?.points || 0) + 10,
            has_reviewed: true 
        }).eq('whatsapp', customerPhone);
        setHasReviewed(true);
    }

    setSubmitting(false);
    setSuccess(true);
    setComment('');
    setTimeout(() => { setSuccess(false); setShowForm(false); }, 3500);
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
      
      {/* 🎁 BANNER DE PUNTOS (Solo si no ha comentado) */}
      {!hasReviewed && !showForm && (
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 flex items-center gap-3 animate-in fade-in duration-500">
           <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white shrink-0">
              <Sparkles size={20} fill="currentColor" className="animate-pulse" />
           </div>
           <div className="flex-1">
              <p className="text-white font-black text-[11px] uppercase tracking-tight leading-none">¡Gana puntos hoy!</p>
              <p className="text-white/90 text-[10px] font-bold mt-1">Danos tu opinión y recibe <span className="underline">+10 PUNTOS</span> al instante.</p>
           </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div
          className="select-none"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
        >
          <h3 className="font-black text-gray-900 text-base italic uppercase tracking-tighter">Opiniones de clientes</h3>
          {holdProgress > 0 && (
            <div className="h-0.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden w-32">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${holdProgress}%`, transition: 'none' }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {adminMode && (
            <button onClick={() => setAdminMode(false)} className="text-[10px] text-red-400 font-semibold bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              Salir admin
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-orange-500 text-white text-[10px] font-black uppercase px-3.5 py-2.5 rounded-xl shadow-lg shadow-orange-100 active:scale-95 transition-all"
          >
            <Star size={12} className="fill-white" />
            {showForm ? 'Cerrar' : 'Opinar'}
          </button>
        </div>
      </div>

      {testimonials.length > 0 && !showForm && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-4 bg-gradient-to-br from-orange-50 to-white rounded-2xl px-4 py-4 border border-orange-100/50">
            <div className="text-center min-w-[64px]">
              <p className="text-4xl font-black text-orange-500 leading-none">{avg.toFixed(1)}</p>
              <div className="flex justify-center mt-2 scale-75 origin-center">
                <StarRating value={Math.round(avg)} />
              </div>
              <p className="text-[9px] text-gray-400 mt-1 font-bold uppercase">{testimonials.length} opiniones</p>
            </div>
            <div className="flex-1 space-y-1">
              <StarStatRow star={5} testimonials={testimonials} />
              <StarStatRow star={4} testimonials={testimonials} />
              <StarStatRow star={3} testimonials={testimonials} />
              <StarStatRow star={2} testimonials={testimonials} />
              <StarStatRow star={1} testimonials={testimonials} />
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="px-4 py-5 border-b border-gray-100 bg-orange-50/20">
          {success ? (
            <div className="flex flex-col items-center py-6 gap-3 animate-in zoom-in duration-300">
              <div className="w-14 h-14 bg-green-500 rounded-3xl flex items-center justify-center shadow-xl shadow-green-100 rotate-12">
                <Star size={30} className="text-white fill-white" />
              </div>
              <div className="text-center px-4">
                 <p className="text-green-700 font-black text-sm uppercase tracking-tight">¡Opinión Publicada!</p>
                 <p className="text-green-800/60 text-[11px] font-bold mt-1">
                    {hasReviewed 
                      ? "Has ganado 10 puntos, revisa el ranking al lado de tu foto de perfil. 🏆" 
                      : "¡Gracias por tu valiosa opinión! ⭐"}
                 </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-orange-100 shadow-sm">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-orange-200">
                  {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="p-2 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Publicando como:</p>
                  <p className="text-sm font-bold text-gray-800 truncate mt-1">{name || 'Invitado'}</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-[10px] text-gray-500 mb-2 font-black uppercase tracking-widest">¿Cuántas estrellas nos das?</p>
                <div className="flex justify-center">
                  <StarRating value={stars} onChange={setStars} />
                </div>
              </div>

              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Cuéntanos tu experiencia con el Pollazo..."
                maxLength={300}
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 resize-none shadow-sm transition-all"
              />
              {error && <p className="text-red-500 text-xs font-black text-center uppercase tracking-tighter">{error}</p>}
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-black py-4.5 rounded-[20px] shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-60 uppercase text-[11px] tracking-[0.15em]"
              >
                <Send size={14} />
                {submitting ? 'Enviando...' : 'Publicar mi opinión'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-50 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <span className="text-4xl grayscale opacity-20">💬</span>
            <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Aún no hay opiniones</p>
          </div>
        ) : (
          testimonials.map(t => (
            <div key={t.id} className="flex gap-4 px-4 py-5 hover:bg-orange-50/20 transition-colors">
              <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-orange-50 bg-gray-50">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.author_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500 font-black text-sm">
                    {t.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{t.author_name}</p>
                  {adminMode && (
                    <button onClick={() => handleDelete(t.id)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-75">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="scale-75 origin-left opacity-90 -mt-1 -mb-1">
                    <StarRating value={t.stars} />
                </div>
                <p className="text-gray-600 text-[13px] font-medium leading-relaxed mt-1">{t.comment}</p>
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
