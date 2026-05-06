import { useState, useEffect, type CSSProperties } from 'react';
import {
  Download,
  Globe,
  Bell,
  Star,
  Zap,
  MapPin,
  ShoppingBag,
  ShieldCheck,
  Snowflake,
  PackageCheck,
  ExternalLink,
  Share,
  PlusSquare,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STAFF = [
  {
    id: '1',
    name: 'Mery',
    role: 'Gerente',
    photo_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
  },
  {
    id: '2',
    name: 'Paola',
    role: 'Cajera',
    photo_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
  },
  {
    id: '3',
    name: 'Matias',
    role: 'Especialista en Aves',
    photo_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
  },
  {
    id: '4',
    name: 'Stiven',
    role: 'Atención / Fotografía',
    photo_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
  },
  {
    id: '5',
    name: 'Edgar',
    role: 'Reponedor',
    photo_url: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
  },
];

const MAPS_URL = 'https://maps.app.goo.gl/v3J9Pz8LhY8jVnC2A';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function LandingPage({
  onInstall,
  canInstall,
  onContinueWeb,
}: Props) {
  const admin = useAdmin() as any;
  const settings = admin?.settings;
  const extraSettings = admin?.extraSettings;

  const [visible, setVisible] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const logoUrl =
    extraSettings?.logo_url?.trim() || '/logo-final.png';

  const primaryColor =
    settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const fadeIn = (delay: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
  });

  const handleInstallClick = async () => {
    if (isIOS()) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();

      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'dismissed') {
        setInstallMessage('Instalación cancelada.');
      }

      setDeferredPrompt(null);
      return;
    }

    if (canInstall) {
      onInstall();
      return;
    }

    setInstallMessage(
      'Tu navegador no permite instalar la app automáticamente.'
    );
  };

  const handleSendReview = () => {
    if (userRating === 0) return;

    alert('¡Gracias! Tu opinión fue enviada correctamente.');
    setUserRating(0);
    setComment('');
  };

  return (
    <div
      className="min-h-screen bg-white text-gray-950 pb-24"
      style={{ '--pollazo-primary': primaryColor } as CSSProperties}
    >
      <style>
        {`
          @keyframes pollazoFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-14px);
            }
          }

          @keyframes pollazoSoftFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-7px);
            }
          }

          @keyframes pollazoIconFloat {
            0%, 100% {
              transform: translateY(0) scale(1);
            }
            50% {
              transform: translateY(-5px) scale(1.04);
            }
          }

          .pollazo-logo-float {
            animation: pollazoFloat 6s ease-in-out infinite;
          }

          .pollazo-soft-float {
            animation: pollazoSoftFloat 7s ease-in-out infinite;
          }

          .pollazo-soft-float-delay {
            animation: pollazoSoftFloat 7.6s ease-in-out infinite;
            animation-delay: 0.8s;
          }

          .pollazo-icon-float {
            animation: pollazoIconFloat 5s ease-in-out infinite;
          }

          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }

          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      <section className="relative min-h-screen hero-water overflow-hidden flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-500/25 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 -translate-x-1/2 rounded-full bg-orange-200/25 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md mx-auto space-y-10">
          <div
            style={fadeIn(0)}
            className="relative mx-auto flex items-center justify-center"
          >
            <div className="absolute w-64 h-64 rounded-full bg-orange-300/20 blur-3xl" />

            <img
              src={logoUrl}
              className="relative w-56 h-56 object-contain mx-auto drop-shadow-[0_32px_50px_rgba(0,0,0,0.35)] pollazo-logo-float"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <div style={fadeIn(140)} className="space-y-4">
            <p className="text-white/80 font-black uppercase tracking-widest text-xs">
              Galápagos • Ecuador
            </p>

            <h1 className="font-black text-5xl text-white drop-shadow-lg leading-none tracking-tight">
              Pollazo El Mirador
            </h1>

            <p className="text-white/85 text-[15px] font-semibold leading-relaxed max-w-xs mx-auto tracking-wide">
              Frescura en cada funda, productos esenciales y una experiencia rápida para comprar mejor.
            </p>
          </div>

          <div
            className="w-full max-w-xs mx-auto space-y-4"
            style={fadeIn(280)}
          >
            <button
              onClick={handleInstallClick}
              className="w-full py-4 bg-white text-orange-600 rounded-3xl font-black shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Download size={20} />
              Instalar en mi Celular
            </button>

            {installMessage && (
              <p className="text-white/75 text-xs font-semibold px-3">
                {installMessage}
              </p>
            )}

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

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-orange-100 h-16 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />

          <div>
            <h1 className="font-black text-gray-950 text-sm uppercase tracking-tight">
              Pollazo El Mirador
            </h1>

            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
              Market especializado
            </p>
          </div>
        </div>

        <button className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center active:scale-95 transition-transform">
          <Bell size={18} className="text-orange-500" />
        </button>
      </header>

      <main className="px-5 py-10 space-y-16 bg-gradient-to-b from-white via-orange-50/40 to-white">
        <section
          className="rounded-[42px] p-8 text-white shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: '#f97316' }}
        >
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center pollazo-icon-float">
              <ShieldCheck size={28} />
            </div>

            <div>
              <p className="text-[10px] font-black text-white/75 uppercase tracking-[0.28em] mb-3">
                Calidad garantizada
              </p>

              <h3 className="font-black text-3xl mb-4 leading-tight">
                Calidad y Frescura en Galápagos
              </h3>

              <p className="text-sm font-medium opacity-95 leading-relaxed">
                Pollazo Galapagueño El Mirador es tu market de confianza:
                pollo fresco enfundado, productos de primera necesidad y atención
                rápida para las familias de Puerto Ayora.
              </p>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl" />
        </section>

        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-[32px] p-5 shadow-sm border border-orange-100 pollazo-soft-float">
            <Snowflake className="text-orange-500 mb-3" size={24} />

            <p className="text-[10px] font-black uppercase text-gray-400">
              Frescura
            </p>

            <p className="font-black text-sm text-gray-900">
              En cada funda
            </p>
          </div>

          <div className="bg-white rounded-[32px] p-5 shadow-sm border border-orange-100 pollazo-soft-float-delay">
            <PackageCheck className="text-orange-500 mb-3" size={24} />

            <p className="text-[10px] font-black uppercase text-gray-400">
              Control
            </p>

            <p className="font-black text-sm text-gray-900">
              Marca propia
            </p>
          </div>

          <div className="bg-white rounded-[32px] p-5 shadow-sm border border-orange-100 pollazo-soft-float">
            <ShoppingBag className="text-orange-500 mb-3" size={24} />

            <p className="text-[10px] font-black uppercase text-gray-400">
              Market
            </p>

            <p className="font-black text-sm text-gray-900">
              Compra fácil
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
              Galería
            </p>

            <h2 className="font-black text-2xl text-gray-900">
              Nuestra Tienda
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 row-span-2 rounded-[32px] overflow-hidden h-60 shadow-xl active:scale-[0.98] hover:scale-[1.01] transition-transform duration-300 pollazo-soft-float">
              <img
                src="https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>

            <div className="rounded-[28px] overflow-hidden h-[114px] shadow-md active:scale-95 hover:scale-[1.03] transition-transform duration-300 pollazo-soft-float-delay">
              <img
                src="https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>

            <div className="rounded-[28px] overflow-hidden h-[114px] shadow-md active:scale-95 hover:scale-[1.03] transition-transform duration-300 pollazo-soft-float">
              <img
                src="https://images.pexels.com/photos/3962285/pexels-photo-3962285.jpeg"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
              Atención
            </p>

            <h2 className="font-black text-2xl flex items-center gap-2 text-gray-900">
              <Zap className="text-orange-500" />
              Nuestro Equipo Especializado
            </h2>
          </div>

          <div
            className="flex gap-4 overflow-x-auto pb-5 no-scrollbar snap-x snap-mandatory"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
            }}
          >
            {STAFF.map((m, index) => (
              <div
                key={m.id}
                className={`flex-shrink-0 snap-center w-72 bg-white rounded-[36px] p-5 border border-orange-100 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform ${
                  index % 2 === 0
                    ? 'pollazo-soft-float'
                    : 'pollazo-soft-float-delay'
                }`}
              >
                <img
                  src={m.photo_url}
                  className="w-20 h-20 rounded-[26px] object-cover shadow-inner"
                  alt=""
                />

                <div>
                  <p className="font-black text-gray-950 text-base">
                    {m.name}
                  </p>

                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-relaxed">
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

            <h2 className="text-2xl font-black">
              ¿Cómo fue tu experiencia?
            </h2>

            <p className="text-gray-500 text-xs">
              Tu opinión nos ayuda a mejorar la atención y el servicio.
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setUserRating(num)}
                className={`p-1 transition-all active:scale-90 ${
                  userRating >= num
                    ? 'text-yellow-400 scale-110'
                    : 'text-gray-700'
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
            placeholder="¿Algún comentario sobre tu compra?"
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

          <div className="bg-white p-6 rounded-[40px] border border-orange-100 shadow-xl">
            <div className="w-14 h-14 rounded-3xl bg-orange-50 flex items-center justify-center mb-5">
              <MapPin className="text-orange-500" size={28} />
            </div>

            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em] mb-2">
              Dirección
            </p>

            <h3 className="text-2xl font-black text-gray-950 leading-tight">
              Calle Delfín, El Mirador, Puerto Ayora
            </h3>

            <p className="text-sm font-semibold text-gray-500 mt-3 leading-relaxed">
              Visítanos para comprar pollo fresco enfundado y productos esenciales
              para tu hogar.
            </p>

            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full py-5 rounded-3xl bg-orange-500 text-white font-black flex items-center justify-center gap-3 shadow-lg shadow-orange-200 active:scale-95 transition-transform"
            >
              ¿Cómo llegar? Ver en Google Maps
              <ExternalLink size={18} />
            </a>
          </div>
        </section>
      </main>

      {showIOSModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[36px] p-7 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
            >
              <X size={18} />
            </button>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em] mb-2">
                  Instalar en iPhone
                </p>

                <h2 className="text-2xl font-black text-gray-950 leading-tight">
                  Agrega la app a tu pantalla de inicio
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-orange-50 rounded-3xl p-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                    <Share className="text-orange-500" size={22} />
                  </div>

                  <div>
                    <p className="font-black text-gray-950">
                      Pulsa el botón Compartir
                    </p>

                    <p className="text-sm text-gray-500 font-semibold">
