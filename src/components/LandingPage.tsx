import { useState, useEffect } from 'react';
import { Download, Shield, Store, Globe, Loader2, CheckCircle2, Smartphone, MapPin, Share, X } from 'lucide-react';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

type InstallState = 'idle' | 'waiting' | 'success';

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const LOGO_URL = '/logo-final.png';



export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  const [visible, setVisible] = useState(false);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = () => setInstallState('success');
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installState !== 'idle') return;
    if (isIOS()) {
      setShowIOSModal(true);
      return;
    }
    setInstallState('waiting');
    await onInstall();
    // Reset after 12s if appinstalled never fires
    const t = setTimeout(() => {
      setInstallState(prev => (prev === 'waiting' ? 'idle' : prev));
    }, 12000);
    return () => clearTimeout(t);
  };

  const fadeIn = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto hero-water">

      {/* Moving ripple overlays */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full" style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 65%)',
          animation: 'water-ripple 9s ease-in-out infinite',
        }} />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full" style={{
          background: 'radial-gradient(circle, rgba(254,240,138,0.3) 0%, transparent 65%)',
          animation: 'water-ripple-2 12s ease-in-out infinite',
        }} />
        <div className="absolute top-[45%] right-[-10%] w-56 h-56 rounded-full" style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)',
          animation: 'water-ripple 16s ease-in-out infinite reverse',
        }} />
      </div>

      <div className="relative z-10 flex flex-col">

        {/* ═══ HERO SECTION ═══ */}
        <div className="flex flex-col items-center px-6 pt-14 pb-10">

          {/* Logo */}
          <div
            className="mb-6 relative"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(-36px) scale(0.75)',
              transition: 'opacity 0.7s cubic-bezier(0.34,1.56,0.64,1), transform 0.7s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 68%)',
                animation: 'logoGlowPulse 2.6s ease-in-out infinite',
                transform: 'scale(1.4)',
              }}
            />
            <img
              src={LOGO_URL}
              alt="La Casa del Pollazo"
              className="w-36 h-36 object-contain relative z-10"
              style={{
                filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))',
                animation: 'splashFloat 3.4s ease-in-out infinite',
              }}
            />
          </div>

          {/* Title */}
          <div className="text-center mb-2" style={fadeIn(100)}>
            <h1 className="font-black leading-tight" style={{ fontSize: '2rem', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
              La Casa del Pollazo
            </h1>
            <p className="font-bold text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              El Mirador · Puerto Ayora, Galápagos
            </p>
            <p className="font-semibold text-base mt-1.5" style={{ color: '#431407', textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}>
              Lo mejor para cada cliente.
            </p>
          </div>

          {/* Install CTA */}
          <div className="w-full mt-6 space-y-3" style={fadeIn(200)}>
            {installState === 'success' ? (
              <div
                className="w-full rounded-3xl px-5 py-6 flex flex-col items-center gap-3 text-center"
                style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
              >
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-500" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-black text-lg text-gray-900">¡Instalación Exitosa!</p>
                  <p className="text-green-600 font-bold text-sm mt-0.5">La app fue instalada</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-start gap-2 text-left">
                  <Smartphone size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 font-medium leading-snug">
                    Revisa tu pantalla de inicio o reinicia tu celular para encontrar la app.
                  </p>
                </div>
                <button onClick={onContinueWeb} className="text-sm font-semibold text-orange-600 underline underline-offset-2">
                  Abrir en el navegador
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleInstallClick}
                  disabled={installState === 'waiting'}
                  className="btn-shimmer w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl font-black text-[15px] active:scale-[0.97] transition-transform"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: '#c2410c',
                    boxShadow: '0 6px 32px rgba(0,0,0,0.18)',
                  }}
                >
                  {installState === 'waiting' ? (
                    <>
                      <Loader2 size={20} className="animate-spin text-orange-500 flex-shrink-0" />
                      <span>Iniciando descarga... Por favor espere</span>
                    </>
                  ) : (
                    <>
                      <Download size={20} className="flex-shrink-0" />
                      <span>Descargar Aplicación del Pollazo en mi celular</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  {[
                    { icon: <Shield size={12} />, text: 'App Segura' },
                    { icon: <Store size={12} />, text: 'Sin tienda de apps' },
                  ].map(b => (
                    <div key={b.text} className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                      style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)', color: '#431407' }}>
                      {b.icon}
                      <span className="text-xs font-semibold">{b.text}</span>
                    </div>
                  ))}
                </div>

                {!canInstall && installState === 'idle' && (
                  <p className="text-xs text-center px-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Abre en <strong>Chrome</strong> (Android) o <strong>Safari</strong> (iOS) → "Agregar a pantalla de inicio"
                  </p>
                )}
              </>
            )}
          </div>

          {/* Continue web */}
          {installState !== 'success' && (
            <button
              onClick={onContinueWeb}
              className="flex items-center gap-1.5 text-xs font-medium mt-6 active:opacity-60 transition-opacity"
              style={{
                color: 'rgba(255,255,255,0.7)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.55s ease 0.45s',
              }}
            >
              <Globe size={12} />
              Continuar en la web por ahora
            </button>
          )}
        </div>

        {/* ═══ HISTORIA SECTION ═══ */}
        <div
          className="mx-4 mb-6 rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.35)',
            ...fadeIn(300),
          }}
        >
          <div className="px-5 py-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🍗</span>
              <h2 className="font-black text-lg" style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.15)' }}>
                Tradición en El Mirador
              </h2>
            </div>
            <p className="text-sm leading-relaxed font-medium" style={{ color: 'rgba(255,255,255,0.88)' }}>
              Desde hace años La Casa del Pollazo ha sido un punto de encuentro en El Mirador. No solo entregamos un buen servicio, servimos tradición directamente a tu casa.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-8 h-8 bg-white/25 rounded-xl flex items-center justify-center">
                <span className="text-base">⭐</span>
              </div>
              <div className="w-8 h-8 bg-white/25 rounded-xl flex items-center justify-center">
                <span className="text-base">🏠</span>
              </div>
              <div className="w-8 h-8 bg-white/25 rounded-xl flex items-center justify-center">
                <span className="text-base">🚀</span>
              </div>
              <span className="text-xs font-semibold ml-1" style={{ color: 'rgba(255,255,255,0.75)' }}>Calidad · Tradición · Rapidez</span>
            </div>
          </div>
        </div>

        {/* ═══ BENTO GALLERY ═══ */}
        <div className="mx-4 mb-6" style={fadeIn(400)}>
          <h2 className="font-black text-base mb-3" style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.15)' }}>
            Nuestra cocina, tu mesa
          </h2>
          <div className="grid grid-cols-3 gap-2" style={{ gridTemplateRows: 'auto auto auto' }}>
            {/* Large featured */}
            <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden" style={{ minHeight: 180 }}>
              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Pollo asado"
                className="w-full h-full object-cover"
                style={{ minHeight: 180 }}
              />
            </div>
            {/* Small tiles */}
            <div className="col-span-1 row-span-1 rounded-2xl overflow-hidden" style={{ minHeight: 87 }}>
              <img
                src="https://images.pexels.com/photos/3887985/pexels-photo-3887985.jpeg?auto=compress&cs=tinysrgb&w=300"
                alt="Local"
                className="w-full h-full object-cover"
                style={{ minHeight: 87 }}
              />
            </div>
            <div className="col-span-1 row-span-1 rounded-2xl overflow-hidden" style={{ minHeight: 87 }}>
              <img
                src="https://images.pexels.com/photos/2668308/pexels-photo-2668308.jpeg?auto=compress&cs=tinysrgb&w=300"
                alt="Bebidas"
                className="w-full h-full object-cover"
                style={{ minHeight: 87 }}
              />
            </div>
            {/* Bottom wide */}
            <div className="col-span-3 rounded-2xl overflow-hidden" style={{ minHeight: 100 }}>
              <img
                src="https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=700"
                alt="Productos frescos"
                className="w-full h-full object-cover"
                style={{ minHeight: 100 }}
              />
            </div>
          </div>
        </div>

        {/* ═══ UBICACIÓN ═══ */}
        <div
          className="mx-4 mb-10 rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.35)',
            ...fadeIn(500),
          }}
        >
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={18} style={{ color: '#fff' }} />
              <h2 className="font-black text-base" style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.15)' }}>
                Dónde encontrarnos
              </h2>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
              El Mirador, Calle Delfín
            </p>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Puerto Ayora, Santa Cruz, Galápagos
            </p>
            {/* Map embed placeholder */}
            <a
              href="https://maps.app.goo.gl/uM7jPvwGxzyUeeJYA"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl overflow-hidden relative"
              style={{ height: 140 }}
            >
              <img
                src="https://images.pexels.com/photos/461077/pexels-photo-461077.jpeg?auto=compress&cs=tinysrgb&w=700"
                alt="Mapa"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                <div className="bg-white rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
                  <MapPin size={16} className="text-red-500" />
                  <span className="font-bold text-sm text-gray-800">Ver en Google Maps</span>
                </div>
              </div>
            </a>
          </div>
        </div>

      </div>

      {/* ═══ iOS INSTALL MODAL ═══ */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-[400] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm mx-4 mb-6 rounded-3xl overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 -4px 40px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ background: '#E67E22' }}>
              <p className="font-black text-white text-base">Instalar en iPhone</p>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                <X size={15} className="text-white" />
              </button>
            </div>
            {/* Steps */}
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-white text-sm" style={{ background: '#E67E22' }}>1</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-snug">Pulsa el botón Compartir de Safari</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="rounded-lg p-1.5" style={{ background: '#f0f0f0' }}>
                      <Share size={16} className="text-gray-600" />
                    </div>
                    <p className="text-xs text-gray-500">El cuadro con flecha hacia arriba en la barra inferior</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-white text-sm" style={{ background: '#E67E22' }}>2</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-snug">Desliza y pulsa <span className="font-black">"Agregar al inicio"</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">Desplázate hacia abajo en el menú de opciones</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-white text-sm" style={{ background: '#E67E22' }}>3</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-snug">Confirma pulsando <span className="font-black">"Agregar"</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">El ícono del Pollazo aparecerá en tu pantalla de inicio</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3.5 rounded-2xl font-black text-white text-sm"
                style={{ background: '#E67E22' }}
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
