import { useState, useEffect, type CSSProperties } from 'react';
import { Download, Globe, Bell, Star, Zap, MapPin } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

const STAFF = [
  { id: '1', name: 'Stiven', role: 'Director / Fotógrafo', photo_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg' },
  { id: '2', name: 'Doña María', role: 'Chef Principal', photo_url: 'https://images.pexels.com/photos/4253302/pexels-photo-4253302.jpeg' },
  { id: '3', name: 'Carlos', role: 'Maestro Parrillero', photo_url: 'https://images.pexels.com/photos/3814446/pexels-photo-3814446.jpeg' },
];

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  const { settings, extraSettings } = useAdmin();
  const [visible, setVisible] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  const logoUrl = extraSettings?.logo_url || '/logo-final.png';
  const primaryColor = settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSendReview = () => {
    if (userRating === 0) return;
    alert('¡Gracias! Stiven revisará tu comentario.');
    setUserRating(0);
    setComment('');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24" style={{ '--pollazo-primary': primaryColor } as CSSProperties}>
      
      {/* ═══ SECCIÓN 1: HERO / SPLASH (Ahora es parte del scroll) ═══ */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center text-center px-6 hero-water overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 transition-all duration-1000" style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.9)' }}>
          <img 
            src={logoUrl} 
            className="w-44 h-44 object-contain mx-auto drop-shadow-2xl mb-6" 
            onError={(e) => (e.currentTarget.src = '/logo-final.png')} 
          />
          <h1 className="font-black text-5xl text-white drop-shadow-lg italic">Pollazo El Mirador</h1>
          <p className="text-white/80 font-bold tracking-[0.2em] mt-2 uppercase text-sm">Galápagos • Ecuador</p>
          
          <div className="mt-10 space-y-4">
            <button onClick={onInstall} className="bg-white text-orange-600 px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 mx-auto active:scale-95 transition-transform">
              <Download size={20} /> {canInstall ? 'Descargar Aplicación' : 'Instalar en celular'}
            </button>
            <p className="text-white/50 text-[10px] font-bold uppercase animate-bounce mt-4">Desliza para ver el menú ↓</p>
          </div>
        </div>
      </section>

      {/* ═══ SECCIÓN 2: HEADER PEQUEÑO (Aparece al bajar) ═══ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} className="w-8 h-8 object-contain" onError={(e) => (e.currentTarget.src = '/logo-final.png')} />
          <span className="font-black text-xs italic uppercase">Pollazo El Mirador</span>
        </div>
        <Bell size={18} className="text-gray-400" />
      </header>

      {/* ═══ SECCIÓN 3: CONTENIDO (Historia, Galería, Equipo) ═══ */}
      <main className="px-4 py-10 space-y-12">
        
        {/* Historia */}
        <section className="bg-orange-500 rounded-[40px] p-8 text-white shadow-xl shadow-orange-200">
           <h3 className="font-black text-2xl mb-3">Tradición en El Mirador 🍗</h3>
           <p className="font-medium opacity-95 leading-relaxed">Desde hace años, El Pollazo ha sido el punto de encuentro en la isla. No solo servimos comida, servimos el sabor de nuestra tierra.</p>
        </section>

        {/* Galería Bento */}
        <section className="space-y-4">
          <h2 className="font-black text-xl text-gray-800">Nuestra cocina, tu mesa</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 row-span-2 rounded-3xl overflow-hidden h-56 shadow-md">
              <img src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-3xl overflow-hidden h-26 shadow-sm">
              <img src="https://images.pexels.com/photos/3887985/pexels-photo-3887985.jpeg" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-3xl overflow-hidden h-26 shadow-sm">
              <img src="https://images.pexels.com/photos/2668308/pexels-photo-2668308.jpeg" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>

        {/* Equipo */}
        <section className="space-y-4">
          <h2 className="font-black text-xl flex items-center gap-2 text-gray-800"><Zap className="text-orange-500" /> El Equipo Omnipotente</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {STAFF.map((m) => (
              <div key={m.id} className="flex-shrink-0 w-64 bg-white rounded-[32px] p-5 border border-gray-100 flex items-center gap-4 shadow-sm">
                <img src={m.photo_url} className="w-16 h-16 rounded-2xl object-cover" />
                <div>
                  <p className="font-black text-gray-900 text-sm">{m.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mapa */}
        <section className="space-y-4">
           <h2 className="font-black text-xl flex items-center gap-2"><MapPin className="text-red-500" /> Encuéntranos</h2>
           <div className="bg-white p-2 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="h-40 bg-gray-100 rounded-[28px] overflow-hidden">
                 <img src="https://images.pexels.com/photos/461077/pexels-photo-461077.jpeg" className="w-full h-full object-cover opacity-40 grayscale" />
              </div>
              <p className="text-xs font-bold text-gray-400 text-center py-3">Calle Delfín, El Mirador, Puerto Ayora</p>
           </div>
        </section>

        {/* Estrellas */}
        <section className="bg-gray-900 rounded-[45px] p-8 text-white space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black italic">¿Qué tal el Pollazo?</h2>
            <p className="text-gray-500 text-xs mt-1">Dinos la verdad, Stiven te lee</p>
          </div>
          <div className="flex justify-center gap-2">
            {.map((num) => (
              <button key={num} onClick={() => setUserRating(num)} className={`p-1 transition-all ${userRating >= num ? 'text-yellow-400 scale-110' : 'text-gray-700'}`}>
                <Star size={36} fill={userRating >= num ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Algún comentario especial?"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />
          <button
            disabled={userRating === 0}
            onClick={handleSendReview}
            className={`w-full py-5 rounded-2xl font-black transition-all ${userRating > 0 ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-700'}`}
          >
            Enviar Comentario
          </button>
        </section>
      </main>

      {/* Navegación */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 h-20 flex items-center justify-around px-4 z-40">
        {['Inicio', 'Menú', 'Puntos', 'Info'].map((t) => (
          <button key={t} className="flex flex-col items-center gap-1">
            <div className={`w-1 h-1 rounded-full mb-1 ${t === 'Inicio' ? 'bg-orange-500' : 'bg-transparent'}`} />
            <span className={`text-[10px] font-black uppercase ${t === 'Inicio' ? 'text-orange-500' : 'text-gray-400'}`}>{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
