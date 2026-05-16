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
  isMandatory?: boolean; // PROP: Para obligar el registro desde el carrito
}

const DEFAULT_AVATAR = PRESET_AVATARS[0].url;
const DEFAULT_CENTER = { lat: -0.7439, lng: -90.3131 };

export default function LoginModal({ isOpen, onClose, onLogin, isMandatory = false }: LoginModalProps) {
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
  
  const [userActualLocation, setUserActualLocation] = useState<{lat: number, lng: number} | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // 1. 🔥 MOTOR DE MAPA MODERNO CON INTEGRACIÓN INMEDIATA DE PUNTO AZUL
  useEffect(() => {
    if (step === 2 && mapContainerRef.current && !mapInstance.current) {
      setTimeout(() => {
        if (!mapContainerRef.current) return;

        const startLat = lat || DEFAULT_CENTER.lat;
        const startLng = lng || DEFAULT_CENTER.lng;

        mapInstance.current = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 17,
          zoomControl: false,
          attributionControl: false 
        });

        L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(mapInstance.current);

        mapInstance.current.on('movestart', () => setIsDragging(true));
        mapInstance.current.on('move', () => {
          const center = mapInstance.current.getCenter();
          setLat(center.lat);
          setLng(center.lng);
        });
        mapInstance.current.on('moveend', () => setIsDragging(false));

        mapInstance.current.invalidateSize();

        // Si ya capturamos la ubicación real en el botón anterior, vuela directo allá y DIBUJA EL PUNTO AZUL DE UNA
        if (userActualLocation) {
          mapInstance.current.flyTo([userActualLocation.lat, userActualLocation.lng], 18, { duration: 1.2 });
          
          if (!userMarkerRef.current) {
            const blueDotIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="relative flex items-center justify-center">
                      <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
                      <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                    </div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            userMarkerRef.current = L.marker([userActualLocation.lat, userActualLocation.lng], { icon: blueDotIcon }).addTo(mapInstance.current);
          }
        }
      }, 300);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      userMarkerRef.current = null; // Reseteamos el punto azul al destruir el mapa para que no desaparezca
    };
  }, [step, userActualLocation]);

  // 🔵 PUNTO AZUL DE RESPALDO (SE ACTUALIZA SI UTILIZA EL BOTÓN DE RE-LOCALIZACIÓN FLOTANTE)
  useEffect(() => {
    if (mapInstance.current && userActualLocation) {
      if (!userMarkerRef.current) {
        const blueDotIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="relative flex items-center justify-center">
                  <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
                  <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        userMarkerRef.current = L.marker([userActualLocation.lat, userActualLocation.lng], { icon: blueDotIcon }).addTo(mapInstance.current);
      } else {
        userMarkerRef.current.setLatLng([userActualLocation.lat, userActualLocation.lng]);
      }
    }
  }, [userActualLocation, step]);

  const handleGetLocation = () => {
    setIsLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserActualLocation({ lat: latitude, lng: longitude });
        setLat(latitude);
        setLng(longitude);
        
        if (mapInstance.current) {
          mapInstance.current.flyTo([latitude, longitude], 18, { duration: 1.5 });
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

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || DEFAULT_AVATAR);
    setLat(customerLat);
    setLng(customerLng);
    setReference(customerReference || '');

    if (isMandatory) {
      if (!customerName || !customerPhone) {
        setStep(1);
        setError('¡Espera! Necesitamos saber quién eres para poder entregarte tu pedido. Completa tus datos aquí.');
      } else if (!customerLat || !customerLng || !customerReference) {
        setStep(2);
        setError('¡Ojo! Es obligatorio que pongas tu ubicación o punto de entrega en el mapa para llevarte el pedido exacto.');
      }
    } else {
      setStep(1);
      setError('');
    }
  }, [isOpen, isMandatory]);

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

  // ✅ EL BOTÓN "CONTINUAR" ACTIVA EL GPS EN SEGUNDO PLANO
  const handleNextStep = () => {
    if (!name.trim() || !whatsapp.trim()) {
      setError(isMandatory ? '¡Espera! Necesitamos saber quién eres para poder entregarte tu pedido. Completa tus datos aquí.' : 'Escribe tu nombre y WhatsApp');
      return;
    }
    setError('');
    
    // Dispara el GPS justo en el clic de avanzar para que el mapa abra centrado y con el Punto Azul listo
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserActualLocation({ lat: latitude, lng: longitude });
        if (!lat || !lng) {
          setLat(latitude);
          setLng(longitude);
        }
        setStep(2);
      },
      () => {
        setStep(2);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = () => {
    if (!reference.trim()) {
      setError(isMandatory ? '¡Ojo! Es obligatorio que pongas tu ubicación o punto de entrega en el mapa para llevarte el pedido exacto.' : 'Danos una referencia (ej: casa azul)');
      return;
    }
    onLogin({ name: name.trim(), whatsapp: whatsapp.trim(), avatarUrl: avatar, lat, lng, reference: reference.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl animate-in fade-in duration-500" onClick={isMandatory ? undefined : onClose} />
      
      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md rounded-[50px] shadow-[0_20px_100px_-20px_rgba(0,0,0,0.3)] border border-white flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 pb-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200">
              {step === 1 ? <Sparkles size={18} className="text-white fill-white" /> : <LocateFixed size={18} className="text-white" />}
            </div>
            <div className="text-left leading-tight">
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                {/* ✅ CAMBIO: "Punto exacto" cambiado por "Punto de entrega" para mejor semántica */}
                {step === 1 ? 'Únete al Club' : 'Punto de entrega'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {!isMandatory && (
              <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-75 transition-all">
                <X size={18}/>
              </button>
            )}
          </div>
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
            /* 📍 PASO 2: MAPA INTERACTIVO */
            <div className="animate-in slide-in-from-right duration-300 space-y-4">
              
              {/* ✅ NUEVO INDICADOR DE PRECISIÓN URBANA: Obliga de forma bonita a marcar en la calle */}
              <p className="text-[11px] font-bold text-slate-500 bg-orange-50/50 border border-orange-100/40 p-2.5 rounded-2xl text-center leading-snug">
                📍 Marca en la calle el punto exacto donde quieres que llegue tu pedido (evita marcar dentro de la casa).
              </p>

              <div className="relative h-[320px] w-full rounded-[40px] overflow-hidden shadow-2xl border-2 border-white">
                <div ref={mapContainerRef} className="h-full w-full z-0" />
                
                {/* OVERLAY DE CONFIRMACIÓN */}
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-orange-100 transition-all duration-300 ${isDragging ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                  <p className="text-[9px] font-black text-orange-600 uppercase flex items-center gap-2 whitespace-nowrap">
                    {lat ? "📍 Punto marcado correctamente" : "Mueve para marcar"}
                  </p>
                </div>

                {/* PUNTO DE PRECISIÓN GRIS PALPITANTE */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none transition-opacity duration-200 ${isDragging ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full shadow-lg border border-white/50 animate-pulse" />
                </div>

                {/* PIN DINÁMICO */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 z-[101] pointer-events-none transition-all duration-300 ease-out flex flex-col items-center
                  ${isDragging ? '-translate-y-[120%] scale-75' : '-translate-y-full scale-100'}`}>
                  
                  <div className="bg-orange-500 p-2 rounded-2xl shadow-[0_10px_20px_rgba(249,115,22,0.4)] border-2 border-white">
                    <MapPin size={24} className="text-white fill-white" />
                  </div>
                  
                  <div className={`w-[3px] bg-orange-600 transition-all duration-300 ${isDragging ? 'h-10 opacity-40' : 'h-4 opacity-100'}`} />
                  <div className="w-2 h-1 bg-black/20 rounded-full blur-[1px]" />
                </div>

                {/* 🧭 BOTÓN GPS FLOTANTE MODERNO */}
                <button 
                  onClick={handleGetLocation}
                  className={`absolute bottom-6 right-6 z-[1000] p-4 rounded-3xl shadow-2xl transition-all ${isLocating ? 'bg-orange-500 animate-spin text-white' : 'bg-white text-slate-800 active:scale-75'}`}
                >
                  <Navigation size={22} className={lat ? 'fill-orange-500 text-orange-500' : ''} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Añade Referencias</h3>
                <textarea 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: Casa blanca de dos pisos, portón negro, junto a la farmacia..."
                  className="w-full h-20 rounded-[25px] bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 transition-all resize-none shadow-inner"
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
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3 animate-bounce leading-tight">{error}</p>}
            <button 
              onClick={step === 1 ? handleNextStep : handleSave} 
              className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 h-16 text-[12px] font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700 flex items-center justify-center gap-2"
            >
              {step === 1 ? (
                <>CONTINUAR A UBICACIÓN <ArrowRight size={16}/></>
              ) : (
                isProcessing ? 'PROCESANDO...' : 'CONFIRMAR PUNTO 🚀'
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .leaflet-container { font-family: inherit; cursor: crosshair !important; }
        .custom-div-icon { background: none; border: none; }
      `}</style>
    </div>
  );
}
