import React, { useState, useEffect } from 'react';
import { Star, Loader2, Download, MapPin, X, Share } from 'lucide-react';

// Tipado estricto para el evento nativo de instalación PWA
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const LandingPage: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // 1. DETECCIÓN STANDALONE
    const checkStandalone = () => {
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    };
    
    // Verificación inicial
    checkStandalone();
    
    // Escuchar cambios de display-mode en tiempo real
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // 2. DETECCIÓN DE ENTORNO IOS (Safari no soporta beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 3. CAPTURA DEL EVENTO DE INSTALACIÓN
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir que el mini-infobar aparezca en móviles
      e.preventDefault();
      // Guardar el evento para dispararlo luego
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cleanup de eventos
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Datos del Staff con fotos de Pexels
  const staffMembers = [
    { name: 'Mery', role: 'Gerente', img: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400' },
    { name: 'Paola', role: 'Cajera', img: 'https://images.pexels.com/photos/762041/pexels-photo-762041.jpeg?auto=compress&cs=tinysrgb&w=400' },
    { name: 'Matias', role: 'Aves', img: 'https://images.pexels.com/photos/280453/pexels-photo-280453.jpeg?auto=compress&cs=tinysrgb&w=400' },
    { name: 'Stiven', role: 'Fotos', img: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=400' },
    { name: 'Edgar', role: 'Reponedor', img: 'https://images.pexels.com/photos/316681/pexels-photo-316681.jpeg?auto=compress&cs=tinysrgb&w=400' },
  ];

  // Renderizado dinámico del botón de instalación
  const renderInstallContent = () => {
    if (isIOS) {
      return (
        <>
          <Download className="w-5 h-5 mr-2" />
          Instalar en iPhone
        </>
      );
    }
    if (!deferredPrompt) {
      return (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Preparando Instalación...
        </>
      );
    }
    return (
      <>
        <Download className="w-5 h-5 mr-2" />
        Instalar Aplicación
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 not-italic flex flex-col">
      
      {/* SECCIÓN SPLASH/HERO: Oculta automáticamente en modo standalone */}
      {!isStandalone && (
        <section className="flex flex-col items-center justify-center px-4 py-12 bg-[#f97316] text-white shrink-0">
          <img 
            src="https://blogger.googleusercontent.com/img/a/AVvXsEin3pN4YDaHP3IxmNrtpbD2swEb9qpEJOsOmbbbtAmlaSgSicNgZbB9jYTdfdX4oiDOBORD4h5oDSRlFbzw6-3B6c2sFH7s3T0tla5kFjCe6treln_EPQ5a2i7V-ghUqJyTeVztj1ORThqO-G-eqO1eyDxo3MsEsoiBW60fatCa7SNeVHtJd-a3vLrjhtg" 
            alt="Logo Principal" 
            className="w-48 h-48 object-contain mb-8 rounded-2xl shadow-xl bg-white p-2"
          />
          <h1 className="text-3xl font-bold mb-6 text-center tracking-tight">
            Bienvenido a Nuestra App
          </h1>
          <button
            onClick={handleInstallClick}
            disabled={!isIOS && !deferredPrompt}
            className="flex items-center justify-center px-8 py-4 bg-white text-[#f97316] font-bold rounded-full shadow-lg hover:bg-gray-50 active:scale-95 disabled:opacity-80 disabled:cursor-wait transition-all duration-200"
          >
            {renderInstallContent()}
          </button>
        </section>
      )}

      {/* CONTENIDO PRINCIPAL DE LA APP */}
      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
        
        {/* SECCIÓN MAPA */}
        <section className="p-8 flex flex-col items-center text-center border-b border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-[#f97316] uppercase tracking-wide">
            Visítanos
          </h2>
          <a
            href="https://maps.app.goo.gl/d5UnTFpGPouAFVyb6?g_st=aw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 bg-[#f97316] text-white font-bold rounded-xl shadow hover:bg-orange-600 transition-colors"
          >
            <MapPin className="w-6 h-6 mr-3" />
            Abrir en Google Maps
          </a>
        </section>

        {/* SECCIÓN RESEÑAS CON SINTAXIS ESTRICTA */}
        <section className="p-8 flex flex-col items-center text-center border-b border-gray-100 bg-gray-50">
          <h2 className="text-2xl font-bold mb-4 text-[#f97316] uppercase tracking-wide">
            Reseñas
          </h2>
          <div className="flex justify-center space-x-1 mb-4 text-[#f97316]">
            {/* REGLA ANTIBUGS: Array explícito */}
            {[1, 2, 3, 4, 5].map((num) => (
              <Star key={num} className="w-8 h-8 fill-current" />
            ))}
          </div>
          <p className="text-lg text-gray-700 font-medium">
            "El mejor servicio y atención de la zona. 100% recomendado."
          </p>
        </section>

        {/* SECCIÓN STAFF */}
        <section className="p-8">
          <h2 className="text-2xl font-bold mb-8 text-center text-[#f97316] uppercase tracking-wide">
            Nuestro Equipo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {staffMembers.map((member, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-28 h-28 mb-4 rounded-full p-1 bg-[#f97316] shadow-md">
                  <img 
                    src={member.img} 
                    alt={`Foto de ${member.name}, ${member.role}`} 
                    className="w-full h-full object-cover rounded-full border-4 border-white" 
                  />
                </div>
                <span className="font-bold text-xl text-gray-900">{member.name}</span>
                <span className="text-base text-[#f97316] font-semibold">{member.role}</span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* MODAL INSTRUCCIONES IOS */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm relative flex flex-col items-center text-center shadow-2xl pb-10">
            <button 
              onClick={() => setShowIOSModal(false)} 
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-orange-100 text-[#f97316] rounded-2xl flex items-center justify-center mb-6">
              <Download className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Instalar App</h3>
            <p className="mb-6 text-gray-600 text-base leading-relaxed">
              Para instalar en iPhone, pulsa el botón de <strong>Compartir</strong> <Share className="inline w-4 h-4 mx-1" /> en la barra inferior de Safari y selecciona la opción rectilínea de <strong>"Agregar a la pantalla de inicio"</strong>.
            </p>
            <button 
              onClick={() => setShowIOSModal(false)} 
              className="w-full py-4 bg-[#f97316] text-white font-bold rounded-xl shadow-md hover:bg-orange-600 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default LandingPage;
