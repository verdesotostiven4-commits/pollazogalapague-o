import React, { useEffect, useRef, useState } from 'react';
import { Camera, User, Phone, X, Sparkles, Check, MapPin, Navigation, ArrowRight, ArrowLeft, LocateFixed } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '@/context/UserContext';

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
  const userMarkerRef = useRef<any>(null);

  const { customerName, customerPhone, customerAvatar, customerLat, customerLng, customerReference } = useUser();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMoving, setIsMoving] = useState(false); // 🔥 Para la animación del pin
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 2 && mapContainerRef.current && !mapInstance.current) {
      setTimeout(() => {
        if (!mapContainerRef.current) return;

        const startLat = lat || DEFAULT_CENTER.lat;
        const startLng = lng || DEFAULT_CENTER.lng;

        // Configuración estilo Google Maps
        mapInstance.current = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 17,
          zoomControl: false,
          attributionControl: false // 🔥 Quita el texto de Leaflet abajo
        });

        // 🔥 CAPA ESTILO GOOGLE MAPS (Modo Claro con parques y negocios)
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
        }).addTo(mapInstance.current);

        // Marcador de posición real del usuario (Punto Azul)
        userMarkerRef.current = L.circleMarker([0, 0], {
          radius: 8,
          fillColor: "#3b82f6",
          color: "white",
          weight: 3,
          fillOpacity: 1
        }).addTo(mapInstance.current);

        // Detectar posición real para guía sin mover el mapa forzosamente
        mapInstance.current.locate({ watch: true, enableHighAccuracy: true });
        mapInstance.current.on('locationfound', (e: any) => {
          userMarkerRef.current.setLatLng(e.latlng);
        });

        // Eventos para animar el Pin
        mapInstance.current.on('movestart', () => setIsMoving(true));
        mapInstance.current.on('move', () => {
          const center = mapInstance.current.getCenter();
          setLat(center.lat);
          setLng(center.lng);
        });
        mapInstance.current.on('moveend', () => setIsMoving(false));

        mapInstance.current.invalidateSize();
      }, 300);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.stopLocate();
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [step]);

  // Función para centrar el mapa en la ubicación del usuario
  const handleGetLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        if (mapInstance.current) {
          mapInstance.current.flyTo([latitude, longitude], 18);
        }
        setIsLocating(false);
      },
      () => {
        setError('Activa el GPS para guiarte');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

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
      <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.4)] border border-white/50 flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 pb-2 flex items-center justify-between flex-shrink-0 z-10 bg-white">
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

        <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col">
          {step === 1 ? (
            /* PASO 1: PERFIL */
            <div className="p-6 pt-2 space-y-5 animate-in slide-in-from-left duration-300">
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
            /* PASO 2: MAPA INTERACTIVO (PEDIDOSYA STYLE) */
            <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="relative flex-1 min-h-[400px] bg-slate-100">
                {/* 🗺️ Contenedor del Mapa */}
                <div ref={mapContainerRef} className="absolute inset-0 z-0" />
                
                {/* 📍 MARCADOR DINÁMICO (Se mueve con el mapa) */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none transition-all duration-300 ${isMoving ? '-translate-y-[120%] scale-110' : '-translate-y-full scale-100'}`}>
                  <div className="relative flex flex-col items-center">
                    {/* Burbuja informativa opcional o solo el pin */}
                    <div className="bg-orange-500 p-2.5 rounded-full shadow-[0_15px_30px_rgba(249,115,22,0.5)] border-2 border-white">
                      <MapPin size={28} className="text-white fill-white" />
                    </div>
                    {/* La "Colita" o línea de precisión */}
                    <div className={`w-1 bg-orange-600 transition-all duration-300 ${isMoving ? 'h-10 opacity-40' : 'h-6 opacity-100'}`} />
                    {/* Sombra en el suelo */}
                    <div className={`w-3 h-1.5 bg-black/20 rounded-full blur-[1px] transition-all duration-300 ${isMoving ? 'scale-150 opacity-20' : 'scale-100 opacity-60'}`} />
                  </div>
                </div>

                {/* 🧭 BOTÓN CENTRAR GPS */}
                <button 
                  onClick={handleGetLocation}
                  className={`absolute bottom-8 right-6 z-[1000] p-4 rounded-full shadow-2xl transition-all ${isLocating ? 'bg-orange-500 text-white animate-spin' : 'bg-white text-slate-700 active:scale-75'}`}
                >
                  <LocateFixed size={24} />
                </button>
              </div>

              {/* REFERENCIAS */}
              <div className="p-6 bg-white space-y-3 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Añade Referencias</h3>
                  <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">Precisión Máxima</span>
                </div>
                <textarea 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: Frente al Hotel X, casa amarilla con portón negro..."
                  className="w-full h-20 rounded-[25px] bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 transition-all resize-none shadow-inner"
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 pt-2 bg-white flex-shrink-0 border-t border-slate-50 flex gap-3 z-20">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="p-4 rounded-3xl bg-slate-100 text-slate-500 active:scale-90 transition-all">
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="flex-1 flex flex-col">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3 animate-bounce">{error}</p>}
            <button 
              onClick={step === 1 ? handleNextStep : handleSave} 
              className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 h-16 text-[13px] font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700 flex items-center justify-center gap-2"
            >
              {step === 1 ? (
                <>UBICAR EN MAPA <ArrowRight size={18}/></>
              ) : (
                isProcessing ? 'PROCESANDO...' : 'CONFIRMAR PUNTO 🚀'
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-container { font-family: inherit; cursor: crosshair !important; }
        /* Efecto de pulso para el punto azul del usuario */
        .leaflet-interactive { transition: all 0.3s; }
      `}</style>
    </div>
  );
}
