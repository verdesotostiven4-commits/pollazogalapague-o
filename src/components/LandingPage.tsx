import { useState, useEffect, type CSSProperties } from 'react';
import {
  Download,
  Globe,
  Bell,
  Star,
  Zap,
  MapPin,
  ShieldCheck,
  ExternalLink,
  Share,
  PlusSquare,
  X,
  Loader2
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
  { id: '1', name: 'Mery', role: 'Gerente', photo_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg' },
  { id: '2', name: 'Paola', role: 'Cajera', photo_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg' },
  { id: '3', name: 'Matias', role: 'Especialista en Aves', photo_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg' },
  { id: '4', name: 'Stiven', role: 'Atención / Fotografía', photo_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg' },
  { id: '5', name: 'Edgar', role: 'Reponedor', photo_url: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg' },
];

const LOGO_OFFICIAL = "https://blogger.googleusercontent.com/img/a/AVvXsEin3pN4YDaHP3IxmNrtpbD2swEb9qpEJOsOmbbbtAmlaSgSicNgZbB9jYTdfdX4oiDOBORD4h5oDSRlFbzw6-3B6c2sFH7s3T0tla5kFjCe6treln_EPQ5a2i7V-ghUqJyTeVztj1ORThqO-G-eqO1eyDxo3MsEsoiBW60fatCa7SNeVHtJd-a3vLrjhtg";
const MAPS_URL = 'https://maps.app.goo.gl/d5UnTFpGPouAFVyb6?g_st=aw';

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  const admin = useAdmin() as any;
  const settings = admin?.settings;
  const extraSettings = admin?.extraSettings;

  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  const logoUrl = extraSettings?.logo_url || LOGO_OFFICIAL;
  const primaryColor = settings?.primary_color || '#f97316';

  useEffect(() => {
    const checkPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (checkPWA) setIsStandalone(true);

    const timer = setTimeout(() => setVisible(true), 100);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (/iPhone|iPad|iPod/.test(window.navigator.userAgent)) {
      setShowIOSModal(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'dismissed') setInstallMessage('Instalación cancelada.');
      setDeferredPrompt(null);
      return;
    }
    setInstallMessage('Usa el menú de tu navegador para instalar la App.');
    onInstall();
  };

  const handleSendReview = () => {
    if (userRating === 0) return;
    alert('¡Gracias! Tu opinión fue enviada.');
    setUserRating(0);
    setComment('');
  };

  return (
    <div className="bg-white text-gray-950 overflow-x-hidden min-h-screen font-sans" style={{ '--pollazo-primary': primaryColor } as CSSProperties}>
      <style>
        {`
          @keyframes pollazoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .pollazo-logo-float { animation: pollazoFloat 6s ease-in-out infinite; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          * { font-style: normal !important; text-decoration: none !important; }
        `}
      </style>

      {/* HERO / SPLASH */}
      {!isStandalone && (
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-orange-500 via-orange-400 to-orange-300">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-32 w-[460px] h-[460px] rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-32 -right-28 w-[420px] h-[420px] rounded-full bg-orange-100/30 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-md mx-auto space-y-10" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}>
            <div className="relative flex justify-center">
              <img src={logoUrl} className="relative w-52 h-52 object-contain drop-shadow-2xl pollazo-logo-float" alt="" />
            </div>

            <div className="space-y-4">
              <p className="text-white/80 font-black uppercase tracking-[0.35em] text-[10px]">GALÁPAGOS • ECUADOR</p>
              <h1 className="font-black text-5xl text-white leading-none tracking-tighter">Pollazo El Mirador</h1>
              <p className="text-white/90 text-sm font-semibold max-w-xs mx-auto">Tu market con pollo fresco enfundado y productos esenciales.</p>
            </div>

            <div className="w-full max-w-xs mx-auto space-y-4">
              <button onClick={handleInstallClick} className="w-full py-4 bg-white text-orange-600 rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {!deferredPrompt && !/iPhone|iPad|iPod/.test(window.navigator.userAgent) ? (
                  <><Loader2 size={20} className="animate-spin" /> Preparando...</>
                ) : (
                  <><Download size={20} /> Instalar App</>
                )}
              </button>
              <button onClick={onContinueWeb} className="text-xs font-bold text-white/75 mx-auto flex items-center gap-2 justify-center active:opacity-50 transition-transform hover:scale-105">
  <Globe size={14} /> Continuar en la web
</button>
              {installMessage && <p className="text-white/75 text-[10px] font-bold uppercase mt-2">{installMessage}</p>}
            </div>
          </div>
        </section>
      )}

      {/* HEADER STICKY */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-orange-100 h-16 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <img src={logoUrl} className="w-10 h-10 object-contain" alt="" />
          <div>
            <h1 className="font-black text-xs uppercase text-gray-950">Pollazo El Mirador</h1>
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">MARKET ESPECIALIZADO</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center transition-transform active:scale-90"><Bell size={18} className="text-orange-500" /></button>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="px-5 py-10 space-y-16">
        <section className="rounded-[40px] p-8 text-white shadow-2xl bg-orange-500 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <ShieldCheck size={32} />
            <h3 className="font-black text-2xl leading-tight">Calidad y Frescura en Galápagos</h3>
            <p className="text-sm opacity-90 font-medium">Atención premium y productos de primera necesidad.</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        </section>

        {/* Galería */}
        <section className="space-y-5">
          <h2 className="font-black text-2xl text-gray-950">Nuestra Tienda</h2>
          <div className="grid grid-cols-3 gap-3 h-64">
            <div className="col-span-2 rounded-[32px] overflow-hidden shadow-xl">
              <img src="https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg" className="w-full h-full object-cover" alt="" />
            </div>
            <div className="space-y-3">
              <div className="h-[120px] rounded-[24px] overflow-hidden shadow-md"><img src="https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg" className="w-full h-full object-cover" alt="" /></div>
              <div className="h-[120px] rounded-[24px] overflow-hidden shadow-md"><img src="https://images.pexels.com/photos/3962285/pexels-photo-3962285.jpeg" className="w-full h-full object-cover" alt="" /></div>
            </div>
          </div>
        </section>

        {/* Staff */}
        <section className="space-y-5">
          <h2 className="font-black text-2xl flex items-center gap-2"><Zap className="text-orange-500" /> Nuestro Equipo</h2>
          <div className="flex gap-4 overflow-x-auto pb-5 no-scrollbar snap-x">
            {STAFF.map((member) => (
              <div key={member.id} className="flex-shrink-0 snap-center w-64 bg-white rounded-[32px] p-5 border border-orange-100 flex items-center gap-4 shadow-sm">
                <img src={member.photo_url} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                <div>
                  <p className="font-black text-sm text-gray-950">{member.name}</p>
                  <p className="text-[9px] font-bold uppercase text-orange-500">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RESEÑAS CON ARRAY.OF PARA EVITAR EL BUG DE COPIADO */}
        <section className="bg-gray-950 rounded-[40px] p-8 text-white space-y-6">
          <h2 className="text-xl font-black text-center">¿Cómo fue tu experiencia?</h2>
          <div className="flex justify-center gap-2">
            {Array.of(1, 2, 3, 4, 5).map((num) => (
              <button 
                key={num} 
                onClick={() => setUserRating(num)} 
                className={`p-1 transition-all ${userRating >= num ? 'text-yellow-400 scale-110' : 'text-gray-700'}`}
              >
                <Star size={32} fill={userRating >= num ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            placeholder="¿Algún comentario adicional?" 
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500" 
            rows={3} 
          />
          <button 
            disabled={userRating === 0} 
            onClick={handleSendReview} 
            className={`w-full py-4 rounded-2xl font-black transition-all ${userRating > 0 ? 'bg-orange-500 text-white shadow-lg active:scale-95' : 'bg-white/5 text-gray-800 cursor-not-allowed'}`}
          >
            Enviar Opinión
          </button>
        </section>

        {/* Ubicación */}
        <section className="bg-white p-6 rounded-[40px] border border-orange-100 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center"><MapPin className="text-orange-500" size={24} /></div>
          <h3 className="text-xl font-black text-gray-950">Calle Delfín, El Mirador, Puerto Ayora</h3>
          <p className="text-xs font-semibold text-gray-500 leading-relaxed">Los mejores pollos de la isla y productos para tu hogar.</p>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg shadow-orange-200">
            ¿Cómo llegar? <ExternalLink size={18} />
          </a>
        </section>
      </main>

      {/* MODAL IOS (USANDO CLASE ESTÁNDAR Z-50 PARA EVITAR EL BUG) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[32px] p-7 shadow-2xl relative">
            <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center transition-transform active:scale-90"><X size={18} /></button>
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-950 leading-tight">Instalar en iPhone</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-orange-50 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"><Share className="text-orange-500" size={20} /></div>
                  <p className="font-black text-[13px] text-gray-950">1. Pulsa el botón 'Compartir' en Safari.</p>
                </div>
                <div className="flex items-center gap-4 bg-orange-50 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"><PlusSquare className="text-orange-500" size={20} /></div>
                  <p className="font-black text-[13px] text-gray-950">2. Selecciona 'Agregar a inicio'.</p>
                </div>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black transition-transform active:scale-95">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
