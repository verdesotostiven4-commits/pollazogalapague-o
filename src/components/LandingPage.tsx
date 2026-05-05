import { useState, useEffect, useMemo } from 'react';
import { 
  Download, Shield, Store, Globe, Loader2, CheckCircle2, 
  Smartphone, MapPin, Share, X, Star, Zap, Bell, Package, 
  ShoppingCart, Send, Trophy, UserCheck, ChevronRight 
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { buildStatusWhatsAppUrl } from '../utils/whatsapp';

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

// --- DATOS DEL PERSONAL (Próxima misión: Pasarlos al Admin) ---
const STAFF = [
  { id: '1', name: 'Stiven', role: 'Director / Fotógrafo', photo_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg' },
  { id: '2', name: 'Doña María', role: 'Chef Principal', photo_url: 'https://images.pexels.com/photos/4253302/pexels-photo-4253302.jpeg' },
  { id: '3', name: 'Carlos', role: 'Maestro Parrillero', photo_url: 'https://images.pexels.com/photos/3814446/pexels-photo-3814446.jpeg' },
];

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  const { products, overrides, extraSettings, settings } = useAdmin();
  const [visible, setVisible] = useState(false);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showMainApp, setShowMainApp] = useState(false); // Estado para cambiar de Splash a App
  
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    setShowMainApp(true);
    onContinueWeb();
  };

  const fadeIn = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  // ═══ VISTA 1: PANTALLA DE INSTALACIÓN (SPLASH) ═══
  if (!showMainApp) {
    return (
      <div className="fixed inset-0 z- overflow-y-auto hero-water">
        {/* Ripples animados (Mantenemos tu diseño original) */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 65%)', animation: 'water-ripple 9s ease-in-out infinite' }} />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(254,240,138,0.3) 0%, transparent 65%)', animation: 'water-ripple-2 12s ease-in-out infinite' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center px-6 pt-14 pb-10 text-center">
          {/* Logo dinámico del Admin */}
          <div className="mb-6 relative">
            <img src={extraSettings.logo_url} className="w-36 h-36 object-contain relative z-10 shadow-2xl" onError={(e) => (e.currentTarget.src = '/logo-final.png')} />
          </div>

          <div style={fadeIn(100)}>
            <h1 className="font-black text-4xl text-white drop-shadow-md">Pollazo El Mirador</h1>
            <p className="font-bold text-sm text-white/80 mt-1">Puerto Ayora, Galápagos</p>
          </div>

          <div className="w-full mt-8 space-y-3" style={fadeIn(200)}>
            <button 
              onClick={onInstall}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white rounded-2xl font-black text-orange-700 shadow-xl active:scale-95 transition-all"
            >
              <Download size={20} />
              <span>Descargar App en mi celular</span>
            </button>
            
            <button onClick={handleContinue} className="flex items-center gap-2 text-xs font-bold text-white/70 mt-4 mx-auto">
              <Globe size={14} /> Continuar en la web por ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ VISTA 2: PÁGINA PRINCIPAL (Página del Negocio) ═══
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24" style={{ '--pollazo-primary': settings.primary_color } as any}>
      
      {/* Header con Logo del Admin */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img 
            src={extraSettings.logo_url} 
            className="w-10 h-10 object-contain rounded-full shadow-sm border-2 border-white" 
            onError={(e) => (e.currentTarget.src = '/logo-final.png')} 
          />
          <h1 className="font-black text-gray-900 text-sm">Pollazo El Mirador</h1>
        </div>
        <button className="p-2 text-gray-400"><Bell size={20}/></button>
      </header>

      <main className="px-4 py-6 space-y-12">
        
        {/* SECCIÓN PERSONAL (ARREGLADA: No se pausa) */}
        <section className="space-y-4">
          <h2 className="font-black text-lg flex items-center gap-2">
            <Zap className="text-orange-500" /> El Equipo Omnipotente
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {STAFF.map(member => (
              <div key={member.id} className="flex-shrink-0 w-60 bg-white rounded-3xl p-4 border border-gray-100 flex items-center gap-4 active:scale-95 transition-transform">
                <img src={member.photo_url} className="w-14 h-14 rounded-2xl object-cover" />
                <div>
                  <p className="font-black text-gray-900 text-xs">{member.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TU GALERÍA BENTO (Mantenemos tu diseño pro) */}
        <section className="space-y-4">
          <h2 className="font-black text-lg">Nuestra cocina, tu mesa</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden h-48">
              <img src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden h-23">
              <img src="https://images.pexels.com/photos/3887985/pexels-photo-3887985.jpeg" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden h-23">
              <img src="https://images.pexels.com/photos/2668308/pexels-photo-2668308.jpeg" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>

        {/* SECCIÓN ESTRELLAS (ARREGLADA: Empieza en 0) */}
        <section className="bg-gray-900 rounded-[40px] p-8 text-white space-y-6 shadow-2xl">
          <div className="text-center">
            <h2 className="text-xl font-black italic">¿Qué tal el Pollazo de hoy?</h2>
            <p className="text-gray-500 text-xs mt-1">Dinos la verdad, Stiven te lee</p>
          </div>
          
          <div className="flex justify-center gap-2">
            {.map((num) => (
              <button key={num} onClick={() => setUserRating(num)} className={`p-2 transition-all ${userRating >= num ? 'text-yellow-400 scale-110' : 'text-gray-700'}`}>
                <Star size={32} fill={userRating >= num ? "currentColor" : "none"} />
              </button>
            ))}
          </div>

          <textarea 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Algún comentario especial?"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />

          <button 
            disabled={userRating === 0}
            className={`w-full py-4 rounded-2xl font-black transition-all ${userRating > 0 ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-700'}`}
          >
            Enviar Comentario
          </button>
        </section>

      </main>

      {/* Navegación inferior (Próxima misión: Conectar las otras pestañas) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 h-20 flex items-center justify-around px-4 z-">
        {['Inicio', 'Menú', 'Puntos', 'Info'].map((tab) => (
          <button key={tab} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black uppercase text-gray-400">{tab}</span>
          </button>
        ))}
      </nav>

      {/* Tu Modal de iOS por si acaso */}
      {showIOSModal && (
        <div className="fixed inset-0 z- bg-black/60 flex items-end p-4" onClick={() => setShowIOSModal(false)}>
          <div className="w-full bg-white rounded-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-black text-lg">Instalar en iPhone</p>
            <p className="text-sm text-gray-500">Pulsa el botón compartir y luego "Agregar al inicio".</p>
            <button onClick={() => setShowIOSModal(false)} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
