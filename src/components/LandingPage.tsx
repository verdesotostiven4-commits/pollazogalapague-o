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

  const handleContinueWeb = () => {
    setShowMainApp(true);
    onContinueWeb();
  };

  const handleSendReview = async () => {
    if (userRating === 0) return;

    alert('¡Gracias por tu comentario! Stiven lo recibirá pronto.');
    setUserRating(0);
    setComment('');
  };

  const fadeIn = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  if (!showMainApp) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto hero-water">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 65%)',
              animation: 'water-ripple 9s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(254,240,138,0.3) 0%, transparent 65%)',
              animation: 'water-ripple-2 12s ease-in-out infinite',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center px-6 pt-14 pb-10 text-center">
          <div className="mb-6 relative" style={fadeIn(0)}>
            <img
              src={logoUrl}
              className="w-40 h-40 object-contain drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = '/logo-final.png';
              }}
              alt="Pollazo El Mirador"
            />
          </div>

          <div style={fadeIn(100)}>
            <h1 className="font-black text-4xl text-white drop-shadow-md">
              Pollazo El Mirador
            </h1>
            <p className="font-bold text-sm text-white/80 mt-1 uppercase tracking-widest">
              Puerto Ayora, Galápagos
            </p>
          </div>

          <div className="w-full mt-8 space-y-3" style={fadeIn(200)}>
            <button
              onClick={onInstall}
              className="w-full py-4 bg-white rounded-2xl font-black text-orange-700 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Download size={20} />
              {canInstall ? 'Descargar Aplicación' : 'Instalar Aplicación'}
            </button>

            <button
              onClick={handleContinueWeb}
              className="flex items-center gap-2 text-xs font-bold text-white/70 mt-4 mx-auto"
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
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.currentTarget.src = '/logo-final.png';
            }}
            alt="Pollazo El Mirador"
          />
          <h1 className="font-black text-gray-900 text-sm italic">
            Pollazo El Mirador
          </h1>
        </div>

        <button className="p-2 text-gray-400">
          <Bell size={20} />
        </button>
      </header>

      <main className="px-4 py-6 space-y-10">
        <section className="space-y-4">
          <h2 className="font-black text-lg flex items-center gap-2 text-gray-800">
            <Zap className="text-orange-500" size={20} />
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
                className="flex-shrink-0 snap-center w-64 bg-white rounded-3xl p-4 border border-gray-100 flex items-center gap-4 shadow-sm active:scale-95 transition-transform"
              >
                <img
                  src={m.photo_url}
                  className="w-14 h-14 rounded-2xl object-cover"
                  alt={m.name}
                />
                <div>
                  <p className="font-black text-gray-900 text-xs">{m.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                    {m.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-[35px] p-6 text-white shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <h3 className="font-black text-lg mb-2">
            Tradición en El Mirador 🍗
          </h3>
          <p className="text-sm font-medium opacity-90 leading-relaxed">
            Desde hace años, El Pollazo ha sido el punto de encuentro. No solo
            servimos comida, servimos tradición directamente a tu mesa.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-black text-lg text-gray-800">
            Nuestra cocina, tu mesa
          </h2>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden h-48 shadow-sm">
              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"
                className="w-full h-full object-cover"
                alt="Galería principal"
              />
            </div>

            <div className="rounded-2xl overflow-hidden h-24 shadow-sm">
              <img
                src="https://images.pexels.com/photos/3887985/pexels-photo-3887985.jpeg"
                className="w-full h-full object-cover"
                alt="Galería secundaria"
              />
            </div>

            <div className="rounded-2xl overflow-hidden h-24 shadow-sm">
              <img
                src="https://images.pexels.com/photos/2668308/pexels-photo-2668308.jpeg"
                className="w-full h-full object-cover"
                alt="Galería secundaria"
              />
            </div>
          </div>
        </section>

        <section className="bg-gray-900 rounded-[40px] p-8 text-white space-y-6 shadow-2xl">
          <div className="text-center">
            <h2 className="text-xl font-black italic">
              ¿Qué tal el Pollazo de hoy?
            </h2>
            <p className="text-gray-500 text-xs mt-1 text-balance">
              Tu opinión le llega directamente a Stiven para mejorar
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
                  size={36}
                  fill={userRating >= num ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Algún comentario especial sobre el servicio?"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />

          <button
            type="button"
            disabled={userRating === 0}
            onClick={handleSendReview}
            className={`w-full py-4 rounded-2xl font-black transition-all ${
              userRating > 0
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900'
                : 'bg-white/5 text-gray-700'
            }`}
          >
            Enviar Comentario
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="font-black text-lg flex items-center gap-2">
            <MapPin className="text-red-500" />
            Dónde encontrarnos
          </h2>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <p className="text-sm font-bold text-gray-600 italic text-center">
              El Mirador, Calle Delfín. Puerto Ayora.
            </p>

            <div className="h-32 bg-gray-100 rounded-2xl overflow-hidden">
              <img
                src="https://images.pexels.com/photos/461077/pexels-photo-461077.jpeg"
                className="w-full h-full object-cover opacity-50 grayscale"
                alt="Mapa referencia"
              />
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 h-20 flex items-center justify-around px-4 z-40">
        {['Inicio', 'Menú', 'Puntos', 'Info'].map((t) => (
          <button key={t} className="flex flex-col items-center gap-1">
            <div
              className={`w-1 h-1 rounded-full mb-1 ${
                t === 'Inicio' ? 'bg-orange-500' : 'bg-transparent'
              }`}
            />
            <span
              className={`text-[10px] font-black uppercase ${
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
