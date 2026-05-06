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

const MAPS_URL =
  'https://maps.app.goo.gl/d5UnTFpGPouAFVyb6?g_st=aw';

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
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
    extraSettings?.logo_url || '/logo-final.png';

  const primaryColor =
    settings?.primary_color || '#f97316';

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 80);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(
        event as BeforeInstallPromptEvent
      );
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS()) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();

      const choice =
        await deferredPrompt.userChoice;

      if (choice.outcome === 'dismissed') {
        setInstallMessage(
          'Instalación cancelada.'
        );
      }

      setDeferredPrompt(null);
      return;
    }

    if (canInstall) {
      onInstall();
      return;
    }

    setInstallMessage(
      'Usa el menú de tu navegador -> Instalar aplicación.'
    );
  };

  const handleSendReview = () => {
    if (userRating === 0) return;

    alert('¡Gracias! Tu opinión fue enviada.');

    setUserRating(0);
    setComment('');
  };

  return (
    <div
      className="bg-white text-gray-950 overflow-x-hidden"
      style={
        {
          '--pollazo-primary': primaryColor,
        } as CSSProperties
      }
    >
      <style>
        {`
          @keyframes pollazoFloat {
            0%, 100% {
              transform: translateY(0px);
            }

            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes pollazoSoftFloat {
            0%, 100% {
              transform: translateY(0px);
            }

            50% {
              transform: translateY(-4px);
            }
          }

          .pollazo-logo-float {
            animation: pollazoFloat 6s ease-in-out infinite;
          }

          .pollazo-soft-float {
            animation: pollazoSoftFloat 8s ease-in-out infinite;
          }

          .pollazo-soft-float-delay {
            animation: pollazoSoftFloat 9s ease-in-out infinite;
            animation-delay: 0.5s;
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

      <section className="relative h-[100svh] overflow-hidden flex flex-col items-center justify-center px-6 py-16 text-center bg-gradient-to-b from-orange-500 via-orange-400 to-orange-300">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/20 blur-3xl" />

          <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-100/30 blur-3xl" />

          <div className="absolute top-1/3 left-1/2 w-48 h-48 -translate-x-1/2 rounded-full bg-yellow-100/20 blur-3xl" />
        </div>

        <div
          className="relative z-10 max-w-md mx-auto space-y-10"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.7s ease',
          }}
        >
          <div className="relative flex justify-center">
            <div className="absolute w-72 h-72 rounded-full bg-white/10 blur-3xl" />

            <img
              src={logoUrl}
              className="relative w-56 h-56 object-contain drop-shadow-[0_35px_45px_rgba(0,0,0,0.35)] pollazo-logo-float"
              onError={(event) => {
                event.currentTarget.src =
                  '/logo-final.png';
              }}
            />
          </div>

          <div className="space-y-4">
            <p className="text-white/80 font-black uppercase tracking-[0.35em] text-xs">
              GALÁPAGOS • ECUADOR
            </p>

            <h1 className="font-black text-5xl text-white leading-none tracking-tight">
              Pollazo El Mirador
            </h1>

            <p className="text-white/90 text-[15px] font-semibold leading-relaxed max-w-xs mx-auto tracking-wide">
              Tu market de confianza con pollo fresco
              enfundado y productos esenciales para tu
              hogar.
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-4">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-4 bg-white text-orange-600 rounded-3xl font-black shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Download size={20} />
              Instalar en mi Celular
            </button>

            {installMessage && (
              <p className="text-white/75 text-xs font-semibold">
                {installMessage}
              </p>
            )}

            <button
              type="button"
              onClick={onContinueWeb}
              className="flex items-center gap-2 text-xs font-bold text-white/75 mx-auto active:opacity-50"
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
            onError={(event) => {
              event.currentTarget.src =
                '/logo-final.png';
            }}
          />

          <div>
            <h1 className="font-black text-sm uppercase tracking-tight text-gray-950">
              Pollazo El Mirador
            </h1>

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-500">
              MARKET ESPECIALIZADO
            </p>
          </div>
        </div>

        <button
          type="button"
          className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Bell
            size={18}
            className="text-orange-500"
          />
        </button>
      </header>

      <main className="px-5 py-10 space-y-16 bg-gradient-to-b from-white via-orange-50/40 to-white">
        <section className="rounded-[42px] p-8 text-white shadow-2xl relative overflow-hidden bg-orange-500">
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center pollazo-soft-float">
              <ShieldCheck size={28} />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 mb-3">
                CALIDAD GARANTIZADA
              </p>

              <h3 className="font-black text-3xl leading-tight mb-4">
                Calidad y Frescura en Galápagos
              </h3>

              <p className="text-sm font-medium leading-relaxed text-white/95">
                Pollazo Galapagueño El Mirador
                ofrece pollo fresco enfundado,
                atención rápida y productos
                esenciales con estándares premium
                para las familias de Puerto Ayora.
              </p>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        </section>

        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-[30px] p-5 shadow-sm border border-orange-100 pollazo-soft-float">
            <Snowflake
              className="text-orange-500 mb-3"
              size={24}
            />

            <p className="text-[10px] font-black uppercase text-gray-400">
              FRESCURA
            </p>

            <p className="font-black text-sm text-gray-900">
              Cada día
            </p>
          </div>

          <div className="bg-white rounded-[30px] p-5 shadow-sm border border-orange-100 pollazo-soft-float-delay">
            <PackageCheck
              className="text-orange-500 mb-3"
              size={24}
            />

            <p className="text-[10px] font-black uppercase text-gray-400">
              CALIDAD
            </p>

            <p className="font-black text-sm text-gray-900">
              Marca propia
            </p>
          </div>

          <div className="bg-white rounded-[30px] p-5 shadow-sm border border-orange-100 pollazo-soft-float">
            <ShoppingBag
              className="text-orange-500 mb-3"
              size={24}
            />

            <p className="text-[10px] font-black uppercase text-gray-400">
              MARKET
            </p>

            <p className="font-black text-sm text-gray-900">
              Confianza
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
              GALERÍA
            </p>

            <h2 className="font-black text-2xl text-gray-950">
              Nuestra Tienda
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 row-span-2 rounded-[32px] overflow-hidden h-60 shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-transform duration-300 pollazo-soft-float">
              <img
                src="https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>

            <div className="rounded-[28px] overflow-hidden h-[114px] shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 pollazo-soft-float-delay">
              <img
                src="https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>

            <div className="rounded-[28px] overflow-hidden h-[114px] shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 pollazo-soft-float">
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
              EQUIPO
            </p>

            <h2 className="font-black text-2xl flex items-center gap-2 text-gray-950">
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
            {STAFF.map((member, index) => (
              <div
                key={member.id}
                className={`flex-shrink-0 snap-center w-72 bg-white rounded-[36px] p-5 border border-orange-100 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform ${
                  index % 2 === 0
                    ? 'pollazo-soft-float'
                    : 'pollazo-soft-float-delay'
                }`}
              >
                <img
                  src={member.photo_url}
                  className="w-20 h-20 rounded-[26px] object-cover"
                  alt=""
                />

                <div>
                  <p className="font-black text-base text-gray-950">
                    {member.name}
                  </p>

                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-950 rounded-[45px] p-8 text-white space-y-7 shadow-2xl">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">
              RESEÑAS
            </p>

            <h2 className="text-2xl font-black">
              ¿Cómo fue tu experiencia?
            </h2>

            <p className="text-gray-500 text-xs">
              Tu opinión nos ayuda a mejorar.
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
            onChange={(event) => setComment(event.target.value)}
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
              UBICACIÓN
            </p>

            <h2 className="font-black text-2xl flex items-center gap-2 text-gray-950">
              <MapPin className="text-red-500" />
              Dónde encontrarnos
            </h2>
          </div>

          <div className="bg-white p-6 rounded-[40px] border border-orange-100 shadow-xl">
            <div className="w-14 h-14 rounded-3xl bg-orange-50 flex items-center justify-center mb-5">
              <MapPin className="text-orange-500" size={28} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2">
              DIRECCIÓN
            </p>

            <h3 className="text-2xl font-black text-gray-950 leading-tight">
              Calle Delfín, El Mirador, Puerto Ayora
            </h3>

            <p className="text-sm font-semibold text-gray-500 mt-3 leading-relaxed">
              Encuentra productos frescos y atención rápida para tu hogar.
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
          <div className="w-full max-w-md bg-white rounded-[32px] p-7 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
            >
              <X size={18} />
            </button>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2">
                  INSTALAR EN IPHONE
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
                      1. Pulsa el botón Compartir
                    </p>

                    <p className="text-sm text-gray-500 font-semibold">
                      Usa el botón inferior de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-orange-50 rounded-3xl p-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                    <PlusSquare className="text-orange-500" size={22} />
                  </div>

                  <div>
                    <p className="font-black text-gray-950">
                      2. Selecciona “Agregar a inicio”
                    </p>

                    <p className="text-sm text-gray-500 font-semibold">
                      Así tendrás la app instalada en tu iPhone.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-4 rounded-3xl bg-orange-500 text-white font-black active:scale-95 transition-transform"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
