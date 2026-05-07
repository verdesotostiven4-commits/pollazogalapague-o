import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Send, Trash2, X, User } from 'lucide-react';
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

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {/* ✅ FIX: Se restauró el array que faltaba en el error de Vercel */}
      {.map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={onChange ? 'cursor-pointer active:scale-90 transition-transform' : 'cursor-default'}
        >
          <Star
            size={18}
            className={n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'}
          />
        </button>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const { customerName, customerAvatar } = useUser(); 
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

  const avg = testimonials.length > 0
    ? testimonials.reduce((s, t) => s + t.stars, 0) / testimonials.length
    : 0;

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

    const { error: err } = await supabase.from('testimonials').insert({
      author_name: name.trim(),
      stars,
      comment: comment.trim(),
      photo_url: photoUrl.trim() || null,
    });

    setSubmitting(false);
    if (err) { setError('Error al enviar. Intenta de nuevo.'); return; }
    
    setSuccess(true);
    setComment('');
    setTimeout(() => { setSuccess(false); setShowForm(false); }, 2000);
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div
          className="select-none"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
        >
          <h3 className="font-black text-gray-900 text-base">Opiniones de clientes</h3>
          {holdProgress > 0 && (
            <div className="h-0.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden w-32">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${holdProgress}%`, transition: 'none' }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {adminMode && (
            <button onClick={() => setAdminMode(false)} className="text-[10px] text-red-400 font-semibold bg-red-50 px-2 py-1 rounded-lg">
              Salir admin
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <Star size={11} className="fill-white" />
            {showForm ? 'Cerrar' : 'Opinar'}
          </button>
        </div>
      </div>

      {testimonials.length > 0 && !showForm && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl px-4 py-3.5 border border-orange-100">
            <div className="text-center min-w-[64px]">
              <p className="text-4xl font-black text-orange-500 leading-none">{avg.toFixed(1)}</p>
              <div className="flex justify-center mt-1">
                <StarRating value={Math.round(avg)} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{testimonials.length} opinión{testimonials.length !== 1 ? 'es' : ''}</p>
            </div>
            <div className="flex-1 space-y-1">
              {.map(star => {
                const cnt = testimonials.filter(t => t.stars === star).length;
                const pct = testimonials.length > 0 ? (cnt / testimonials.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-2">{star}</span>
                    <Star size={8} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 w-4 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="px-4 py-4 border-b border-gray-100 bg-orange-50/30">
          {success ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Star size={22} className="text-green-500 fill-green-500" />
              </div>
              <p className="text-green-700 font-bold text-sm">¡Gracias por tu opinión!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-orange-100">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-orange-200">
                  {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="p-2 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Publicando como:</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{name || 'Invitado'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 font-black uppercase tracking-tighter">¿Cuántas estrellas nos das?</p>
                <StarRating value={stars} onChange={setStars} />
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Cuéntanos tu experiencia..."
                maxLength={300}
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-500 resize-none shadow-sm"
              />
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 uppercase text-xs tracking-widest"
              >
                <Send size={14} />
                {submitting ? 'Enviando...' : 'Publicar mi opinión'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-gray-400 text-sm font-medium">Sé el primero en opinar</p>
          </div>
        ) : (
          testimonials.map(t => (
            <div key={t.id} className="flex gap-3 px-4 py-4 hover:bg-gray-50/50 transition-colors">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-100 bg-gray-50">
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
                  <p className="text-sm font-bold text-gray-900 truncate">{t.author_name}</p>
                  {adminMode && (
                    <button onClick={() => handleDelete(t.id)} className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <StarRating value={t.stars} />
                <p className="text-gray-600 text-xs mt-1.5">{t.comment}</p>
                <p className="text-gray-300 text-[10px] mt-2 font-medium">
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
