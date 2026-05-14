import React, { useEffect, useRef, useState } from 'react';
import { Camera, User, Phone, X, Sparkles, Check, MapPin, Navigation, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '@/context/UserContext';

// 🛡️ Declaración para Leaflet (CDN)
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
const DEFAULT_CENTER = { lat: -0.7439, lng: -90.3131 };

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);

  const { customerName, customerPhone, customerAvatar, customerLat, customerLng, customerReference } = useUser();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [address, setAddress] = useState('Ubicando...');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. 🔥 Función para buscar el nombre de la calle (Reverse Geocoding)
  const getStreetName = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const street = data.address.road || data.address.pedestrian || data.address.suburb || "Ubicación sin nombre";
      setAddress(street);
    } catch (e) {
      setAddress("Punto seleccionado");
    }
  };

  // 2. 🔥 Función para buscar lugares específicos
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery} Puerto Ayora Galapagos&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat: newLat, lon: newLon } = data[0];
        mapInstance.current.flyTo([newLat, newLon], 18);
      }
    } catch (e) {
      console.error("Error en búsqueda");
    }
  };

  useEffect(() => {
    if (step === 2 && mapContainerRef.current && !mapInstance.current) {
      setTimeout(() => {
        if (!mapContainerRef.current) return;
        const startLat = lat || DEFAULT_CENTER.lat;
        const startLng = lng || DEFAULT_CENTER.lng;

        mapInstance.current = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 16,
          zoomControl: false
        });

        // ✅ MAPA MODERNO: Estilo CartoDB Positron (Limpio y actual)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '©OpenStreetMap'
        }).addTo(mapInstance.current);

        mapInstance.current.on('movestart', () => setIsMoving(true));
        
        mapInstance.current.on('moveend', () => {
          setIsMoving(false);
          const center = mapInstance.current.getCenter();
          setLat(center.lat);
          setLng(center.lng);
          getStreetName(center.lat, center.lng);
        });

        getStreetName(startLat, startLng);
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
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || DEFAULT_AVATAR);
    setLat(customerLat);
    setLng(customerLng);
    setReference(customerReference || '');
    setStep(1);
    setError('');
  }, [isOpen]);

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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        if (mapInstance.current) mapInstance.current.flyTo([latitude, longitude], 18);
        setIsLocating(false);
      },
      () => {
        setError('Activa el GPS');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = () => {
    if (!reference.trim()) {
      setError('Danos una referencia (ej: casa azul)');
      return;
    }
    onLogin({ name: name.trim(), whatsapp: whatsapp.trim(), avatarUrl: avatar, lat, lng, reference: reference.trim() });
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
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-75 transition-all"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pt-2 space-y-5">
          {step === 1 ? (
            /* PASO 1: PERFIL - INTACTO */
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
                    <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Tu Nombre o Alias" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none" />
                  </div>
                  <div className="relative group">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} inputMode="tel" placeholder="Tu # de WhatsApp" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 px-1 mt-5">
                <button onClick={()=>fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 bg-slate-50"><Camera size={18}/></button>
                {PRESET_AVATARS.map(item => (
                  <button key={item.id} onClick={()=>setAvatar(item.url)} className={`relative aspect-square rounded-2xl border-2 transition-all ${avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105' : 'border-transparent opacity-80'}`}><img src={item.url} className="h-full w-full object-cover" alt={item.id} /></button>
                ))}
              </div>
            </div>
          ) : (
            /* PASO 2: MAPA MODERNO INTERACTIVO */
            <div className="animate-in slide-in-from-right duration-300 space-y-4">
              <div className="relative h-72 w-full rounded-[40px] overflow-hidden border-4 border-white shadow-2xl bg-slate-200">
                
                {/* 🔍 Buscador de lugares */}
                <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2">
                  <div className="flex-1 bg-white rounded-2xl shadow-lg flex items-center px-4 border border-slate-100">
                    <Search size={16} className="text-slate-400" />
                    <input 
                      className="w-full h-10 text-[11px] font-bold text-slate-700 bg-transparent outline-none px-2"
                      placeholder="Busca un lugar en Puerto Ayora..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                {/* 🗺️ Mapa de Leaflet */}
                <div ref={mapContainerRef} className="h-full w-full z-0" />
                
                {/* 📍 Info de Ubicación (Cuadro negro como tu referencia) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[170%] z-[1001] pointer-events-none">
                  <div className={`bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-white/20 transition-all duration-300 ${isMoving ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      <p className="text-[10px] font-black text-white whitespace-nowrap uppercase tracking-tighter">{address}</p>
                    </div>
                  </div>
                </div>

                {/* 📍 Pin Naranja Dinámico */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none">
                  <div className={`relative flex flex-col items-center transition-all duration-200 ${isMoving ? '-translate-y-4 scale-110' : 'translate-y-0 scale-100'}`}>
                    <div className="bg-orange-500 p-2 rounded-full shadow-2xl border-2 border-white">
                      <MapPin size={24} className="text-white fill-white" />
                    </div>
                    {/* Sombra dinámica */}
                    <div className={`w-2 h-1 bg-black/20 rounded-full blur-[2px] mt-1 transition-all duration-200 ${isMoving ? 'scale-50 opacity-30' : 'scale-100 opacity-100'}`} />
                  </div>
                </div>

                <button onClick={handleGetLocation} className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-2xl shadow-xl bg-white text-orange-500 active:scale-75 transition-all ${isLocating ? 'animate-spin' : ''}`}><Navigation size={20} /></button>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Añade Referencias</h3>
                <textarea value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: Casa amarilla de 2 pisos, frente al parque..." className="w-full h-20 rounded-[25px] bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 transition-all resize-none shadow-inner" />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 pt-2 bg-white flex-shrink-0 border-t border-slate-50 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="p-4 rounded-2xl bg-slate-100 text-slate-500 active:scale-90 transition-all"><ArrowLeft size={20} /></button>
          )}
          <div className="flex-1 flex flex-col">
            <button 
              onClick={step === 1 ? () => setStep(2) : handleSave} 
              className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 h-16 text-[12px] font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700"
            >
              {step === 1 ? <>CONTINUAR A UBICACIÓN <ArrowRight className="inline ml-2" size={16}/></> : <>CONFIRMAR PUNTO DE ENTREGA 🚀</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`.leaflet-container { filter: grayscale(0.2) contrast(1.1); }`}</style>
    </div>
  );
}
