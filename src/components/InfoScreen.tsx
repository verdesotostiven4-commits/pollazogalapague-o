import { useState, useRef, useEffect } from 'react';
import { MapPin, Clock, MessageCircle, Phone, Heart, Truck, X, ChevronLeft, ChevronRight, Download, Sparkles, Star } from 'lucide-react';
import Testimonials from './Testimonials';
import LiveMetrics from './LiveMetrics';

const WHATSAPP = '+593989795628';
const MAPS_URL = 'https://maps.app.goo.gl/uM7jPvwGxzyUeeJYA';
const WA_HELLO = `https://wa.me/${WHATSAPP}?text=Hola%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20La%20Casa%20del%20Pollazo%20El%20Mirador%20%F0%9F%8D%97`;
const LOGO_OFFICIAL = "https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0";

const teamMembers = [
  { name: 'Edgar Verdesoto', role: 'Encargado', photo: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Mery Loyola', role: 'Encargada', photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Paola', role: 'Parte del equipo', photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Matias Verdesoto', role: 'Parte del equipo', photo: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
  { name: 'Stiven Verdesoto', role: 'Marketing', photo: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' },
];

const galleryPhotos = [
  { url: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Nuestras instalaciones' },
  { url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Nuestros productos' },
  { url: 'https://images.pexels.com/photos/1247755/pexels-photo-1247755.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Pollos frescos' },
  { url: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'El Mirador' },
  { url: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Productos del día' },
  { url: 'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Embutidos premium' },
];

// 🔥 CARRUSEL 100% AUTOMÁTICO E INFINITO (Sin intervención manual)
function TeamCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollSpeed = 1.2; // ✅ Más rápido

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;
    const animate = () => {
      container.scrollLeft += scrollSpeed;
      // Reinicio infinito suave (usa el doble de elementos para que no se vea el salto)
      if (container.scrollLeft >= container.scrollWidth / 2) {
        container.scrollLeft = 0;
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const doubledMembers = [...teamMembers, ...teamMembers];

  return (
    <div className="py-4 overflow-hidden relative">
      <div
        ref={containerRef}
        className="flex gap-4 px-4 overflow-x-hidden scrollbar-hide pointer-events-none"
      >
        {doubledMembers.map((member, i) => (
          <div key={`${member.name}-${i}`} className="flex flex-col items-center gap-2.5 flex-shrink-0" style={{ width: 100 }}>
            <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-[3px] border-orange-500 shadow-lg ring-2 ring-white">
              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-900 leading-tight uppercase">{member.name.split(' ')[0]}</p>
              <p className="text-[9px] text-orange-500 font-bold leading-tight mt-0.5">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  onInstall?: () => void;
  canInstall?: boolean;
}

export default function InfoScreen({ onInstall, canInstall }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex(prev => prev === null ? null : (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
  const nextPhoto = () => setLightboxIndex(prev => prev === null ? null : (prev + 1) % galleryPhotos.length);

  return (
    <div className="bg-gray-50 px-4 py-5 space-y-4 min-h-full pb-20">

      {/* BRAND CARD */}
      <div className="rounded-[40px] overflow-hidden hero-water shadow-xl">
        <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse blur-xl" />
            <img src={LOGO_OFFICIAL} alt="logo" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
          </div>
          <div>
            <h2 className="text-white font-black text-2xl uppercase tracking-tighter not-italic">
              La Casa del Pollazo
            </h2>
            <div className="flex items-center justify-center gap-1.5 bg-black/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 mt-2">
                <MapPin className="text-yellow-300" size={14} />
                <span className="text-white font-bold text-[10px] uppercase tracking-widest">El Mirador</span>
            </div>
          </div>
        </div>
      </div>

      <LiveMetrics />

      {/* CONTACT */}
      <div className="bg-white rounded-3xl border border-orange-50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest">Contacto Directo</h3>
          <Sparkles className="text-orange-500" size={16} />
        </div>
        <a href={WA_HELLO} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 active:bg-orange-50 transition-colors">
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-800">WhatsApp Oficial</p>
            <p className="text-xs text-gray-400">Atención inmediata</p>
          </div>
          <span className="text-[10px] text-green-600 font-black bg-green-100 px-3 py-1.5 rounded-full uppercase">Chatear</span>
        </a>
        <a href={`tel:${WHATSAPP}`} className="flex items-center gap-3 px-4 py-4 active:bg-orange-50 transition-colors">
          <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Phone size={20} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-800">Línea Telefónica</p>
            <p className="text-xs text-gray-400">+593 989 795 628</p>
          </div>
          <span className="text-[10px] text-orange-600 font-black bg-orange-100 px-3 py-1.5 rounded-full uppercase">Llamar</span>
        </a>
      </div>

      {/* HOURS + LOCATION */}
      <div className="bg-white rounded-3xl border border-orange-50 shadow-sm overflow-hidden p-1">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-50">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-800 uppercase leading-none">Horario de Atención</p>
            <p className="text-xs text-gray-500 mt-1">7:00 AM – 9:00 PM | Todos los días</p>
          </div>
        </div>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 active:bg-gray-50 transition-colors">
          <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-800 uppercase leading-none">Ubicación</p>
            <p className="text-xs text-gray-500 mt-1">El Mirador, Puerto Ayora</p>
          </div>
          <ChevronRight className="text-gray-300" size={18} />
        </a>
      </div>

      {/* TEAM SECTION */}
      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2 text-center">
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest italic">Nuestro Equipo</h3>
          <p className="text-gray-400 text-[10px] mt-1 uppercase font-bold">Las manos detrás del sabor</p>
        </div>
        <TeamCarousel />
      </div>

      {/* GALLERY */}
      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden p-3">
        <div className="px-3 py-2 flex items-center gap-2 mb-2">
            <Star className="text-orange-500 fill-orange-500" size={14} />
            <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest">Galería</h3>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2" style={{ height: 180 }}>
            <button onClick={() => setLightboxIndex(0)} className="flex-[2] rounded-3xl overflow-hidden relative active:scale-[0.98] transition-all shadow-md">
              <img src={galleryPhotos[0].url} alt={galleryPhotos[0].caption} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-left">
                <p className="text-white text-[10px] font-black uppercase italic">{galleryPhotos[0].caption}</p>
              </div>
            </button>
            <div className="flex-1 flex flex-col gap-2">
              {[1, 2].map(i => (
                <button key={i} onClick={() => setLightboxIndex(i)} className="flex-1 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all shadow-sm">
                  <img src={galleryPhotos[i].url} alt={galleryPhotos[i].caption} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2" style={{ height: 100 }}>
            {[3, 4, 5].map(i => (
              <button key={i} onClick={() => setLightboxIndex(i)} className="flex-1 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all shadow-sm">
                <img src={galleryPhotos[i].url} alt={galleryPhotos[i].caption} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🎁 BANNER DE PUNTOS POR COMENTAR */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 rounded-[28px] shadow-lg flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0">
          <Star size={24} fill="currentColor" className="animate-spin-slow" />
        </div>
        <div className="flex-1">
          <p className="text-white font-black text-xs uppercase tracking-tight">¡Gana puntos hoy!</p>
          <p className="text-white/90 text-[10px] font-bold">Danos tu opinión abajo y recibe <span className="underline">+10 PUNTOS</span> para el Ranking.</p>
        </div>
      </div>

      <Testimonials />

      {canInstall && (
        <button
          onClick={onInstall}
          className="w-full flex items-center justify-between font-black px-6 py-5 rounded-[28px] shadow-lg active:scale-[0.96] transition-all text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 10px 30px rgba(234,88,12,0.3)' }}
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Download size={22} />
            </div>
            <div className="text-left leading-tight">
              <div className="text-sm uppercase tracking-tighter">Instalar App</div>
              <div className="text-white/70 text-[9px] font-bold uppercase tracking-widest">Acceso directo en tu móvil</div>
            </div>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-2xl text-[10px] uppercase relative z-10">¡Obtener!</div>
        </button>
      )}

      <div className="flex items-center justify-center gap-1.5 py-6 text-gray-300 text-[10px] font-black uppercase tracking-[0.2em]">
        <span>Hecho con</span>
        <Heart size={12} className="text-orange-400 fill-orange-400" />
        <span>en Galápagos</span>
      </div>

      {/* ✅ LIGHTBOX: Desenfoque REDUCIDO (No cubre toda la pantalla) y Claro */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-x-0 bottom-0 top-[56px] z-[100] bg-white/30 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300" 
          onClick={closeLightbox}
        >
          {/* BOTÓN CERRAR */}
          <button 
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-6 right-6 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center text-gray-900 active:scale-75 transition-all z-[110]"
          >
            <X size={24} />
          </button>

          <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <img 
              src={galleryPhotos[lightboxIndex].url} 
              alt={galleryPhotos[lightboxIndex].caption}
              className="w-full max-h-[60vh] object-contain rounded-[40px] shadow-2xl border-2 border-white pointer-events-none select-none" 
            />
            <div className="mt-6 text-center px-4">
                <p className="text-gray-900 text-base font-black uppercase tracking-tighter italic">
                    {galleryPhotos[lightboxIndex].caption}
                </p>
                <div className="flex justify-center gap-2 mt-4">
                    {galleryPhotos.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === lightboxIndex ? 'w-8 bg-orange-500' : 'w-2 bg-gray-300'}`} />
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes logoGlowPulse {
          0%, 100% { transform: scale(1); opacity: 0.28; }
          50% { transform: scale(1.3); opacity: 0.1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
