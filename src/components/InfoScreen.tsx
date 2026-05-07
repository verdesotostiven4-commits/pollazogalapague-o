import { useState, useRef, useEffect } from 'react';
import { MapPin, Clock, MessageCircle, Phone, Heart, Truck, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Testimonials from './Testimonials';
import LiveMetrics from './LiveMetrics';

const WHATSAPP = '+593989795628';
const MAPS_URL = 'https://maps.app.goo.gl/uM7jPvwGxzyUeeJYA';
const WA_HELLO = `https://wa.me/${WHATSAPP}?text=Hola%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20La%20Casa%20del%20Pollazo%20El%20Mirador%20%F0%9F%8D%97`;

const teamMembers = [
  {
    name: 'Edgar Verdesoto',
    role: 'Encargado',
    photo: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Mery Loyola',
    role: 'Encargada',
    photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Paola',
    role: 'Parte del equipo',
    photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Matias Verdesoto',
    role: 'Parte del equipo',
    photo: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
  {
    name: 'Stiven Verdesoto',
    role: 'Marketing',
    photo: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  },
];

const galleryPhotos = [
  { url: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Nuestras instalaciones' },
  { url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Nuestros productos' },
  { url: 'https://images.pexels.com/photos/1247755/pexels-photo-1247755.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Pollos frescos' },
  { url: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'El Mirador' },
  { url: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Productos del día' },
  { url: 'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=600', caption: 'Embutidos premium' },
];

// Very slow auto-scroll team carousel
function TeamCarousel() {
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const animRef = useRef<number>();
  const pausedRef = useRef(false);
  const resumeRef = useRef<ReturnType<typeof setTimeout>>();
  const CARD_W = 96 + 16; // w-24 + gap-4
  const SPEED = 0.08; // extremely slow
  const doubled = [...teamMembers, ...teamMembers];

  useEffect(() => {
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        offsetRef.current += SPEED * dt;
        if (offsetRef.current >= CARD_W * teamMembers.length) offsetRef.current = 0;
        setOffset(offsetRef.current);
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, []);

  const pause = () => {
    pausedRef.current = true;
    if (resumeRef.current) clearTimeout(resumeRef.current);
  };

  const resume = () => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => { pausedRef.current = false; }, 3000);
  };

  return (
    <div
      className="overflow-hidden py-4"
      onTouchStart={pause}
      onTouchEnd={resume}
      onMouseDown={pause}
      onMouseUp={resume}
      onMouseLeave={resume}
    >
      <div
        className="flex gap-4 px-4"
        style={{ transform: `translateX(-${offset}px)`, willChange: 'transform' }}
      >
        {doubled.map((member, i) => (
          <div key={`${member.name}-${i}`} className="flex flex-col items-center gap-2.5 flex-shrink-0" style={{ width: 96 }}>
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
              style={{
                border: '4px solid #f97316',
                boxShadow: '0 0 0 3px white, 0 4px 16px rgba(249,115,22,0.4)',
              }}
            >
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={e => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=f97316&color=fff&size=128`;
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-gray-900 leading-tight text-center" style={{ maxWidth: 96 }}>
                {member.name.split(' ')[0]}
              </p>
              <p className="text-[10px] text-orange-500 font-semibold leading-tight mt-0.5 text-center">{member.role}</p>
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
    <div className="bg-gray-50 px-4 py-5 space-y-4 min-h-full">

      {/* BRAND CARD — matches Home hero */}
      <div className="rounded-3xl overflow-hidden hero-water">
        <div className="px-5 py-6 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full" style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 70%)',
              animation: 'logoGlowPulse 2.8s ease-in-out infinite',
            }} />
            <img src="/logo-final.png" alt="logo" className="w-20 h-20 object-contain relative z-10 drop-shadow-xl" />
          </div>
          <div>
            <h2 className="text-white font-black text-xl leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              La Casa del Pollazo
            </h2>
            <p className="text-white/90 font-bold text-sm mt-0.5">El Mirador</p>
            <p className="text-white/70 text-xs mt-1">Puerto Ayora, Galápagos</p>
          </div>
        </div>
      </div>

      {/* LIVE METRICS */}
      <LiveMetrics />

      {/* CONTACT */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Contacto</h3>
        </div>
        <a href={WA_HELLO} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageCircle size={18} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">WhatsApp</p>
            <p className="text-xs text-gray-400">+593 989 795 628</p>
          </div>
          <span className="text-xs text-green-500 font-semibold bg-green-50 px-2 py-1 rounded-lg">Abrir</span>
        </a>
        <a href={`tel:${WHATSAPP}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Phone size={18} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Llamar</p>
            <p className="text-xs text-gray-400">+593 989 795 628</p>
          </div>
          <span className="text-xs text-orange-500 font-semibold bg-orange-50 px-2 py-1 rounded-lg">Llamar</span>
        </a>
      </div>

      {/* HOURS + LOCATION + DELIVERY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">7:00 AM – 8/9 PM</p>
            <p className="text-xs text-gray-500">Todos los días de la semana</p>
          </div>
        </div>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 active:bg-gray-50 transition-colors">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">El Mirador, Calle Delfín</p>
            <p className="text-xs text-gray-500">Puerto Ayora, Santa Cruz</p>
          </div>
          <span className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-lg">Mapa</span>
        </a>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Truck size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Puerto Ayora</p>
            <p className="text-xs text-gray-500">Delivery a domicilio disponible</p>
          </div>
        </div>
      </div>

      {/* TEAM CAROUSEL */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-1 text-center">
          <h3 className="font-black text-gray-900 text-base">Las personas detrás</h3>
          <p className="text-orange-500 font-bold text-xs mt-0.5">Nuestro equipo</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">Somos una familia comprometida con traerte lo mejor de Galápagos.</p>
        </div>
        <TeamCarousel />
      </div>

      {/* BENTO GALLERY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Galería fotográfica</h3>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex gap-2" style={{ height: 180 }}>
            <button onClick={() => setLightboxIndex(0)} className="flex-[2] rounded-2xl overflow-hidden relative active:opacity-90 transition-opacity group">
              <img src={galleryPhotos[0].url} alt={galleryPhotos[0].caption} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-3 py-2.5">
                <p className="text-white text-xs font-bold">{galleryPhotos[0].caption}</p>
              </div>
            </button>
            <div className="flex-1 flex flex-col gap-2">
              {[1, 2].map(i => (
                <button key={i} onClick={() => setLightboxIndex(i)} className="flex-1 rounded-xl overflow-hidden relative active:opacity-90 transition-opacity">
                  <img src={galleryPhotos[i].url} alt={galleryPhotos[i].caption} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                    <p className="text-white text-[10px] font-bold truncate">{galleryPhotos[i].caption}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2" style={{ height: 110 }}>
            {[3, 4, 5].map(i => (
              <button key={i} onClick={() => setLightboxIndex(i)} className="flex-1 rounded-xl overflow-hidden relative active:opacity-90 transition-opacity">
                <img src={galleryPhotos[i].url} alt={galleryPhotos[i].caption} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                  <p className="text-white text-[10px] font-bold truncate">{galleryPhotos[i].caption}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <Testimonials />

      {/* PWA INSTALL */}
      {canInstall && (
        <button
          onClick={onInstall}
          className="w-full flex items-center justify-between font-bold px-5 py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform text-white"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316, #f59e0b)', boxShadow: '0 6px 24px rgba(249,115,22,0.35)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Download size={20} />
            </div>
            <div className="text-left">
              <div className="font-black text-sm">Instalar Aplicación</div>
              <div className="text-white/80 text-xs">Acceso rápido desde tu pantalla</div>
            </div>
          </div>
          <div className="text-white/80 text-xs font-semibold bg-white/20 rounded-lg px-2 py-1">Instalar</div>
        </button>
      )}

      {/* FOOTER */}
      <div className="flex items-center justify-center gap-1.5 py-4 text-gray-300 text-xs">
        <span>Hecho con</span>
        <Heart size={11} className="text-orange-400" />
        <span>en Galápagos</span>
      </div>

      {/* LIGHTBOX */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/92 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={e => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm active:bg-white/20">
            <X size={20} />
          </button>
          <button onClick={e => { e.stopPropagation(); prevPhoto(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm active:bg-white/20">
            <ChevronLeft size={22} />
          </button>
          <div className="px-14 w-full" onClick={e => e.stopPropagation()}>
            <img src={galleryPhotos[lightboxIndex].url} alt={galleryPhotos[lightboxIndex].caption}
              className="w-full max-h-[70vh] object-contain rounded-2xl" />
            <p className="text-white/90 text-sm font-bold text-center mt-4">{galleryPhotos[lightboxIndex].caption}</p>
            <div className="flex justify-center gap-1.5 mt-3">
              {galleryPhotos.map((_, i) => (
                <button key={i} onClick={() => setLightboxIndex(i)}
                  className={`rounded-full transition-all duration-200 ${i === lightboxIndex ? 'w-5 h-1.5 bg-orange-400' : 'w-1.5 h-1.5 bg-white/30'}`}
                />
              ))}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); nextPhoto(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm active:bg-white/20">
            <ChevronRight size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
