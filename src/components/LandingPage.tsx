import { useState, useEffect, type CSSProperties } from 'react';
import {
  Download,
  Globe,
  Bell,
  Star,
  Zap,
  MapPin,
} from 'lucide-react';
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
    role: 'Director / Fotógrafo',
    photo_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
  },
  {
    id: '2',
    name: 'Doña María',
    role: 'Chef Principal',
    photo_url: 'https://images.pexels.com/photos/4253302/pexels-photo-4253302.jpeg',
  },
  {
    id: '3',
    name: 'Carlos',
    role: 'Maestro Parrillero',
    photo_url: 'https://images.pexels.com/photos/3814446/pexels-photo-3814446.jpeg',
  },
];

export default function LandingPage({
  onInstall,
  canInstall,
  onContinueWeb,
}: Props) {
  const { settings, extraSettings } = useAdmin();

  const [visible, setVisible] = useState(false);
  const [showMainApp, setShowMainApp] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  const logoUrl = extraSettings?.logo_url || '/logo-final.png';
  const primaryColor = settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    setShowMainApp(true);
    onContinueWeb();
  };

  const handleSendReview = () => {
    if (userRating === 0) return;

    alert('¡Gracias! Tu opinión le llegará a Stiven.');
    setUserRating(0);
    setComment('');
  };

  const fadeIn = (delay: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  if (!showMainApp) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto hero-water flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 text-center space-y-8">
          <div className="relative" style={fadeIn(0)}>
            <img
              src={logoUrl}
              className="w-44 h-44 object-contain mx-auto drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = '/logo-final.png';
              }}
              alt="Pollazo El Mirador"
            />
          </div>

          <div style={fadeIn(100)} className="space-y-2">
            <h1 className="font-black text-4xl text-white italic drop-shadow-lg">
              Pollazo El Mirador
            </h1>
            <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">
              Galápagos • Ecuador
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4" style={fadeIn(200)}>
            <button
              onClick={onInstall}
              className="w-full py-4 bg-white text-orange-600 rounded-2xl font-black shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Download size={20} />
              {canInstall ? 'Descargar App' : 'Instalar en mi Celular'}
            </button>

            <button
              onClick={handleContinue}
              className="flex items-center gap-2 text-xs font-bold text-white/60 mx-auto active:opacity-50"
            >
              <Globe size={14} />
              Continuar en la web por ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900 pb-24"
      style={{ '--pollazo-primary': primaryColor } as CSSProperties}
    >
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            className="w-9 h-9 object-contain"
            onError={(e) => {
              e.currentTarget.src = '/logo-final.png';
            }}
            alt="Pollazo El Mirador"
          />

          <h1 className="font-black text-gray-900 text-sm italic uppercase tracking-tighter">
            Pollazo El Mirador
          </h1>
        </div>

        <Bell size={20} className="text-gray-400" />
      </header>

      <main className="px-4 py-8 space-y-12">
        <section className="bg-orange-500 rounded-[40px] p-8 text-white shadow-xl shadow-orange-100 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-black text-2xl mb-2 italic">
              Tradición en El Mirador 🍗
            </h3>
            <p className="text-sm font-medium opacity-90 leading-relaxed">
              Desde hace años, El Pollazo ha sido el punto de encuentro en la
              isla. No solo servimos comida, servimos el sabor de nuestra tierra
              directamente a tu mesa.
            </p>
          </div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        </section>

        <section className="space-y-4">
          <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">
            Nuestra cocina, tu mesa
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 row-span-2 rounded-3xl overflow-hidden h-52 shadow-md">
              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"
                className="w-full h-full object-cover"
                alt="Pollo 1"
              />
            </div>

            <div className="rounded-3xl overflow-hidden h-24 shadow-sm">
              <img
                src="https://images.pexels.com/photos/3887985/pexels-photo-3887985.jpeg"
                className="w-full h-full object-cover"
                alt="Pollo 2"
              />
            </div>

            <div className="rounded-3xl overflow-hidden h-24 shadow-sm">
              <img
                src="https://images.pexels.com/photos/2668308/pexels-photo-2668308.jpeg"
                className="w-full h-full object-cover"
                alt="Pollo 3"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-black text-xl flex items-center gap-2 text-gray-800">
            <Zap className="text-orange-500" />
            El Equipo Omnipotente
          </h2>

          <div
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
            }}
          >
            {STAFF.map((m) => (
              <div
                key={m.id}
                className="flex-shrink-0 snap-center w-64 bg-white rounded-[32px] p-5 border border-gray-100 flex items-center gap-4 shadow-sm active:scale-95 transition-transform"
              >
                <img
                  src={m.photo_url}
                  className="w-16 h-16 rounded-2xl object-cover shadow-inner"
                  alt={m.name}
                />

                <div>
                  <p className="font-black text-gray-900 text-sm">{m.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {m.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-black text-xl flex items-center gap-2 text-gray-800">
            <MapPin className="text-red-500" />
            Dónde encontrarnos
          </h2>

          <div className="bg-white p-2 rounded-[35px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-40 bg-gray-100 rounded-[30px] overflow-hidden">
              <img
                src="https://images.pexels.com/photos/461077/pexels-photo-461077.jpeg"
                className="w-full h-full object-cover opacity-50 grayscale"
                alt="Mapa"
              />
            </div>

            <p className="text-center py-4 text-xs font-bold text-gray-400 italic">
              Calle Delfín, El Mirador, Puerto Ayora.
            </p>
          </div>
        </section>

        <section className="bg-gray-900 rounded-[45px] p-8 text-white space-y-6 shadow-2xl">
          <div className="text-center space-y-1">
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
                className={`p-1 transition-all ${
                  userRating >= num
                    ? 'text-yellow-400 scale-110'
                    : 'text-gray-700'
                }`}
              >
                <Star
                  size={38}
                  fill={userRating >= num ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Algún comentario especial?"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />

          <button
            type="button"
            disabled={userRating === 0}
            onClick={handleSendReview}
            className={`w-full py-5 rounded-2xl font-black transition-all ${
              userRating > 0
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white/5 text-gray-800'
            }`}
          >
            Enviar Comentario
          </button>
        </section>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 h-20 flex items-center justify-around px-4 z-40">
        {['Inicio', 'Menú', 'Puntos', 'Info'].map((t) => (
          <button key={t} className="flex flex-col items-center gap-1 group">
            <div
              className={`w-1 h-1 rounded-full mb-1 ${
                t === 'Inicio' ? 'bg-orange-500' : 'bg-transparent'
              }`}
            />
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                t === 'Inicio' ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              {t}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
