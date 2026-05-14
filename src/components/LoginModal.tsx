import React, { useEffect, useRef, useState } from 'react';
import { Camera, User, Phone, X, Sparkles, Check, MapPin, Navigation, ArrowRight, ArrowLeft } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '@/context/UserContext';

// 🛡️ Declaración para que TypeScript reconozca Leaflet (cargado vía CDN en index.html)
declare const L: any;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: {
    name: string;
    whatsapp: string;
    avatarUrl: string;
    lat: number | null;
    lng: number | null;
    reference: string;
  }) => void;
}

const DEFAULT_AVATAR = PRESET_AVATARS[0].url;
// 📍 Coordenadas iniciales por defecto (Puerto Ayora, Galápagos)
const DEFAULT_CENTER = { lat: -0.7439, lng: -90.3131 };

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);

  const { 
    customerName, customerPhone, customerAvatar, 
    customerLat, customerLng, customerReference 
  } = useUser();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  // 1. 🔥 LÓGICA DE INICIALIZACIÓN DEL MAPA
  useEffect(() => {
    if (step === 2 && mapContainerRef.current && !mapInstance.current) {
      // Pequeño timeout para esperar que la animación del Modal termine
      setTimeout(() => {
        if (!mapContainerRef.current) return;

        const startLat = lat || DEFAULT_CENTER.lat;
        const startLng = lng || DEFAULT_CENTER.lng;

        // Crear instancia del mapa
        mapInstance.current = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 16,
          zoomControl: false
        });

        // Capa de OpenStreetMap (Gratis y rápida)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(mapInstance.current);

        // Actualizar coordenadas cuando el usuario arrastra el mapa
        mapInstance.current.on('move', () => {
          const center = mapInstance.current.getCenter();
          setLat(center.lat);
          setLng(center.lng);
        });

        // Asegurar que el mapa ocupe todo el contenedor
        mapInstance.current.invalidateSize();
      }, 300);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [step]);

  useEffect(() => {
    PRESET_AVATARS.forEach((av) => {
      const img = new Image();
      img.src = av.url;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || DEFAULT_AVATAR);
    setLat(customerLat);
    setLng(customerLng);
    setReference(customerReference || '');
    setStep(1);
    setError('');
  }, [isOpen, customerName, customerPhone, customerAvatar, customerLat, customerLng, customerReference]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const SIZE = 400;
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, SIZE, SIZE);
        setAvatar(canvas.toDataURL('image/jpeg', 0.8));
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    setError('');
    if (!navigator.geolocation) {
      setError('Tu celular no soporta GPS');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        
        // Mover el mapa suavemente a la ubicación GPS
        if (mapInstance.current) {
          mapInstance.current.flyTo([latitude, longitude], 18);
        }
        setIsLocating(false);
      },
      () => {
        setError('Activa el GPS para encontrarte');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleNextStep = () => {
    if (!name.trim() || !whatsapp.trim()) {
      setError('Escribe tu nombre y WhatsApp');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSave = () => {
    if (!reference.trim()) {
      setError('Danos una referencia (ej: casa azul)');
      return;
    }
    onLogin({ 
      name: name.trim(), 
      whatsapp: whatsapp.trim(), 
      avatarUrl: avatar,
      lat,
      lng,
      reference: reference.trim()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md rounded-[50px] shadow-[0_20px_100px_-20px_rgba(0,0,0,0.3)] border border-white flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 pb-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200">
              {step === 1 ? <Sparkles size={18} className="text-white fill-white" /> : <MapPin size={18} className="text-white" />}
            </div>
            <div className="text-left leading-tight">
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                {step === 1 ? 'Únete al Club' : 'Punto de Entrega'}
              </h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {step === 1 ? 'REGÍSTRATE Y GANA PREMIOS 🍗' : 'MUEVE EL MAPA HASTA TU CASA 🛵'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-75 transition-all"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pt-2 space-y-5">
          {step === 1 ? (
            /* PASO 1: PERFIL */
            <div className="animate-in slide-in-from-left duration-300">
              <div className="bg-gradient-to-br from-orange-50/50 to-white p-5 rounded-[35px] border border-orange-100/50 shadow-inner flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="h-24 w-24 rounded-[32px] overflow-hidden ring-[6px] ring-white shadow-xl bg-white group">
                    <img src={avatar} className="h-full w-full object-cover transition-transform group-hover:scale-110" alt="Preview" />
                    {isProcessing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-[32px]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white animate-bounce"><Check size={14} strokeWidth={4} /></div>
                </div>

                <div className="w-full space-y-2.5">
                  <div className="relative group">
                    <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                    <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Tu Nombre o Alias" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm" />
                  </div>
                  <div className="relative group">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                    <input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} inputMode="tel" placeholder="Tu # de WhatsApp" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">Personaliza tu Avatar</h3>
                <div className="grid grid-cols-4 gap-3 px-1">
                  <button onClick={()=>fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 active:scale-95 transition-all hover:bg-orange-50">
                    <Camera size={18}/>
                    <span className="text-[6px] font-black uppercase mt-0.5">Galería</span>
                  </button>
                  {PRESET_AVATARS.map(item => (
                    <button key={item.id} onClick={()=>setAvatar(item.url)} className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-95 overflow-hidden ${avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10' : 'border-transparent opacity-80'}`}><img src={item.url} className="h-full w-full object-cover" alt={item.id} /></button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* PASO 2: MAPA INTERACTIVO */
            <div className="animate-in slide-in-from-right duration-300 space-y-5">
              <div className="relative h-64 w-full rounded-[40px] overflow-hidden border-4 border-white shadow-xl bg-slate-100">
                {/* 🗺️ Contenedor de Leaflet */}
                <div ref={mapContainerRef} className="h-full w-full z-0" />
                
                {/* 📍 PIN CENTRAL FIJO (Estilo PedidosYa) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none mb-4">
                  <div className="relative flex flex-col items-center">
                    <div className="bg-orange-500 p-2 rounded-full shadow-[0_10px_20px_rgba(249,115,22,0.4)] border-2 border-white animate-bounce">
                      <MapPin size={24} className="text-white fill-white" />
                    </div>
                    <div className="w-2 h-2 bg-black/20 rounded-full blur-[2px] mt-1" />
                  </div>
                </div>

                {/* 🧭 BOTÓN GPS FLOTANTE */}
                <button 
                  onClick={handleGetLocation}
                  className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-2xl shadow-lg transition-all ${isLocating ? 'bg-orange-500 animate-spin text-white' : 'bg-white text-orange-500 active:scale-75'}`}
                >
                  <Navigation size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Añade Referencias</h3>
                <textarea 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: Casa amarilla de 2 pisos, frente al parque..."
                  className="w-full h-24 rounded-[25px] bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 transition-all resize-none shadow-inner"
                />
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* FOOTER */}
        <div className="p-6 pt-2 bg-white flex-shrink-0 border-t border-slate-50 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="p-4 rounded-2xl bg-slate-100 text-slate-500 active:scale-90 transition-all">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex-1 flex flex-col">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3 animate-bounce">{error}</p>}
            <button 
              onClick={step === 1 ? handleNextStep : handleSave} 
              className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 h-16 text-[12px] font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700 flex items-center justify-center gap-2"
            >
              {step === 1 ? (
                <>CONTINUAR A UBICACIÓN <ArrowRight size={16}/></>
              ) : (
                isProcessing ? 'PROCESANDO...' : '¡LISTO PARA EL POLLAZO! 🚀'
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .leaflet-container { font-family: inherit; }`}</style>
    </div>
  );
}
