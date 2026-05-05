import { useState, useEffect, type CSSProperties } from 'react';
import { Download, Globe, Bell, Star, Zap, MapPin, ChefHat } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

const STAFF = [
  {
    id: '1',
    name: 'Stiven',
    role: 'Dirección visual / Fotografía',
    photo_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
  },
  {
    id: '2',
    name: 'Doña María',
    role: 'Chef principal',
    photo_url: 'https://images.pexels.com/photos/4253302/pexels-photo-4253302.jpeg',
  },
  {
    id: '3',
    name: 'Carlos',
    role: 'Maestro parrillero',
    photo_url: 'https://images.pexels.com/photos/3814446/pexels-photo-3814446.jpeg',
  },
];

const MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.1587637845615!2d-90.3129528!3d-0.742398!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9abd65675e47f7d3%3A0x6b44558e8749a0a4!2sEl%20Mirador!5e0!3m2!1ses!2sec!4v1714945000000!5m2!1ses!2sec';

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  const admin = useAdmin() as any;
  const settings = admin.settings;
  const extraSettings = admin.extraSettings;

  const [visible, setVisible] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  const logoUrl = extraSettings?.logo_url || '/logo-final.png';
  const primaryColor = settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const fadeIn = (delay: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
  });

  const handleSendReview = () => {
    if (userRating === 0) return;

    alert('¡Gracias! Tu opinión le llegará a Stiven.');
    setUserRating(0);
    setComment('');
  };

  return (
    <div
      className="min-h-screen bg-[#f8f7f4] text-gray-950 pb-24"
      style={{ '--pollazo-primary': primaryColor } as CSSProperties}
    >
      <section className="relative min-h-screen hero-water overflow-hidden flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/15 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-500/25 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 -translate-x-1/2 rounded-full bg-yellow-200/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md mx-auto space-y-9">
          <div style={fadeIn(0)}>
            <img
              src={logoUrl}
              className="w-52 h-52 object-contain mx-auto drop-shadow-[0_28px_45px_rgba(0,0,0,0.35)]"
              onError={(e) => {
                e.currentTarget.src = '/logo-final.png';
              }}
              alt="Pollazo El Mirador"
            />
          </div>

          <div style={fadeIn(120)} className="space-y-3">
            <p className="text-white/70 font-black uppercase tracking-[0.35em] text-[10px]">
              Galápagos • Ecuador
            </p>
            <h1 className="font-black text-5xl text-white italic drop-shadow-lg leading-none">
              Pollazo El Mirador
            </h1>
            <p className="text-white/80 text-sm font-bold leading-relaxed max-w-xs mx-auto">
              Sabor de casa, pollo dorado y una experiencia pensada para pedir fácil desde tu celular.
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4" style={fadeIn(240)}>
            <button
              onClick={onInstall}
              className="w-full py-4 bg-white text-orange-600 rounded-3xl font-black shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Download size={20} />
              {canInstall ? 'Descargar App' : 'Instalar en mi Celular'}
            </button>

            <button
              onClick={onContinueWeb}
              className="flex items-center gap-2 text-xs font-bold text-white/70 mx-auto active:opacity-50"
            >
              <Globe size={14} />
              Continuar en la web
            </button>
          </div>
        </div>
      </section>

      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-100 h-16 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.currentTarget.src = '/logo-final.png';
            }}
            alt="Pollazo El Mirador"
          />
          <div>
            <h1 className="font-black text-gray-950 text-sm italic uppercase tracking-tighter">
              Pollazo El Mirador
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Puerto Ayora
            </p>
          </div>
        </div>

        <button className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
          <Bell size={18} className="text-gray-500" />
        </button>
      </header>

      <main className="px-5 py-10 space-y-14">
        <section
          className="rounded-[42px] p-8 text-white shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <ChefHat size={24} />
            </div>

            <div>
              <h3 className="font-black text-2xl mb-3 italic">
                Tradición en El Mirador 🍗
              </h3>
              <p className="text-sm font-medium opacity-95 leading-relaxed">
                Desde hace años, El Pollazo ha sido el punto de encuentro en la isla.
                No solo servimos comida: servimos el sabor de nuestra tierra, el cariño
                de nuestra gente y ese pollo dorado que siempre provoca volver.
              </p>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl" />
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
                Galería
              </p>
              <h2 className="font-black text-2xl text-gray-900">
                Nuestra cocina, tu mesa
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 row-span-2 rounded-[32px] overflow-hidden h-60 shadow-xl active:scale-[0.98] hover:scale-[1.01] transition-transform duration-300">
              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"
                className="w-full h-full object-cover"
                alt="Pollo asado"
              />
            </div>

            <div className="rounded-[28px] overflow-hidden h-[114px] shadow-md active:scale-95 hover:scale-[1.03] transition-transform duration-300">
              <img
                src="https://images.pexels.com/photos/3887985/pexels-photo-3887985.jpeg"
                className="w-full h-full object-cover"
                alt="Combo de comida"
              />
            </div>

            <div className="rounded-[28px] overflow-hidden h-[114px] shadow-md active:scale-95 hover:scale-[1.03] transition-transform duration-300">
              <img
                src="https://images.pexels.com/photos/2668308/pexels-photo-2668308.jpeg"
                className="w-full h-full object-cover"
                alt="Plato especial"
              />
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
              Equipo
            </p>
            <h2 className="font-black text-2xl flex items-center gap-2 text-gray-900">
              <Zap className="text-orange-500" />
              Maestros del Sabor
            </h2>
          </div>

          <div
            className="flex gap-4 overflow-x-auto pb-5 no-scrollbar snap-x snap-mandatory"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
            }}
          >
            {STAFF.map((m) => (
              <div
                key={m.id}
                className="flex-shrink-0 snap-center w-72 bg-white rounded-[36px] p-5 border border-gray-100 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                <img
                  src={m.photo_url}
                  className="w-20 h-20 rounded-[26px] object-cover shadow-inner"
                  alt={m.name}
                />

                <div>
                  <p className="font-black text-gray-950 text-base">{m.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    {m.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-950 rounded-[45px] p-8 text-white space-y-7 shadow-2xl">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.25em]">
              Reseñas
            </p>
            <h2 className="text-2xl font-black italic">
              ¿Qué tal el Pollazo de hoy?
            </h2>
            <p className="text-gray-500 text-xs">
              Tu opinión le llega directamente a Stiven
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setUserRating(num)}
                className={`p-1 transition-all active:scale-90 ${
                  userRating >= num ? 'text-yellow-400 scale-110' : 'text-gray-700'
                }`}
              >
                <Star
                  size={42}
                  fill={userRating >= num ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Algún comentario especial?"
            className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-sm font-bold placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />

          <button
            type="button"
            disabled={userRating === 0}
            onClick={handleSendReview}
            className={`w-full py-5 rounded-3xl font-black transition-all ${
              userRating > 0
                ? 'bg-orange-500 text-white shadow-lg active:scale-95'
                : 'bg-white/5 text-gray-800 cursor-not-allowed'
            }`}
          >
            Enviar Comentario
          </button>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
              Ubicación
            </p>
            <h2 className="font-black text-2xl flex items-center gap-2 text-gray-900">
              <MapPin className="text-red-500" />
              Dónde encontrarnos
            </h2>
          </div>

          <div className="bg-white p-3 rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
            <div className="h-72 rounded-[32px] overflow-hidden bg-gray-100">
              <iframe
                src={MAP_EMBED_URL}
                className="w-full h-full border-0"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa de ubicación Pollazo El Mirador"
              />
            </div>

            <div className="px-3 py-5">
              <p className="text-center text-sm font-black text-gray-700">
                Calle Delfín, El Mirador, Puerto Ayora.
              </p>
              <p className="text-center text-xs font-bold text-gray-400 mt-1">
                Visítanos o pide desde la app.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
