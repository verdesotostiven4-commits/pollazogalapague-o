import React, { useEffect, useRef, useState } from 'react';
import { Camera, User, Phone, X, Sparkles, Check, MapPin, Navigation, ArrowRight, ArrowLeft, Map as MapIcon } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '@/context/UserContext';

// 🛡️ Declaración para que TypeScript reconozca Leaflet
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
  const userMarkerRef = useRef<any>(null); // Para el punto azul de ubicación real

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
  const [address, setAddress] = useState('Buscando dirección...');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // Estado para animar el pin
  const [error, setError] = useState('');

  // 🌍 Obtener nombre de la calle (Reverse Geocoding)
  const fetchAddress = async (laitude: number, longitude: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${laitude}&lon=${longitude}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const street = data.address?.road || data.address?.pedestrian || "Calle sin nombre";
      const neighborhood = data.address?.suburb || data.address?.neighbourhood || "";
      setAddress(`${street}${neighborhood ? ', ' + neighborhood : ''}`);
    } catch {
      setAddress("Ubicación seleccionada");
    }
  };

  // 🗺️ INICIALIZACIÓN DEL MAPA MODERNO
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
          attributionControl: false // Quitamos las letras de Leaflet
        });

        // 🎨 Estilo moderno "Voyager" (Parecido a Google Maps)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20
        }).addTo(mapInstance.current);

        // Detectar inicio de movimiento
        mapInstance.current.on('movestart', () => setIsDragging(true));

        // Detectar fin de movimiento
        mapInstance.current.on('moveend', () => {
          const center = mapInstance.current.getCenter();
          setLat(center.lat);
          setLng(center.lng);
          setIsDragging(false);
          fetchAddress(center.lat, center.lng);
        });

        // Carga inicial de dirección
        fetchAddress(startLat, startLng);
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

  const handleGetLocation = () => {
    setIsLocating(true);
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
        
        if (mapInstance.current) {
          mapInstance.current.flyTo([latitude, longitude], 18);
          
          // Crear o mover el "Punto Azul" de ubicación real
          if (userMarkerRef.current) {
             userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
             const blueDotIcon = L.divIcon({
               className: 'custom-div-icon',
               html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>`,
               iconSize: [16, 16],
               iconAnchor: [8, 8]
             });
             userMarkerRef.current = L.marker([latitude, longitude], { icon: blueDotIcon }).addTo(mapInstance.current);
          }
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
    setStep(1);
    setError('');
  }, [isOpen]);

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
              {step === 1 ? <Sparkles size={18} className="text-white fill-white" /> : <MapIcon size={18} className="text-white" />}
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
            /* PASO 1: PERFIL */
            <div className="animate-in slide-in-from-left duration-300 space-y-5">
              <div className="bg-gradient-to-br from-orange-50/50 to-white p-5 rounded-[35px] border border-orange-100/50 shadow-inner flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="h-24 w-24 rounded-[32px] overflow-hidden ring-[6px] ring-white shadow-xl bg-white group">
                    <img src={avatar} className="h-full w-full object-cover transition-transform group-hover:scale-110" alt="Preview" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white animate-bounce"><Check size={14} strokeWidth={4} /></div>
                </div>

                <div className="w-full space-y-2.5">
                  <div className="relative group">
                    <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                    <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Tu Nombre o Alias" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 shadow-sm" />
                  </div>
                  <div className="relative group">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                    <input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} inputMode="tel" placeholder="Tu WhatsApp" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 px-1">
                <button onClick={()=>fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 active:scale-95 transition-all">
                  <Camera size={18}/>
                </button>
                {PRESET_AVATARS.map(item => (
                  <button key={item.id} onClick={()=>setAvatar(item.url)} className={`relative aspect-square rounded-2xl border-2 transition-all overflow-hidden ${avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10' : 'border-transparent opacity-80'}`}><img src={item.url} className="h-full w-full object-cover" alt={item.id} /></button>
                ))}
              </div>
            </div>
          ) : (
            /* PASO 2: MAPA INTERACTIVO PRO */
            <div className="animate-in slide-in-from-right duration-300 space-y-4">
              <div className="relative h-80 w-full rounded-[45px] overflow-hidden border-4 border-white shadow-2xl bg-slate-100">
                {/* 🗺️ MAPA */}
                <div ref={mapContainerRef} className="h-full w-full z-0" />
                
                {/* 💬 GLOBO DE DIRECCIÓN */}
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[80%] transition-all duration-300 ${isDragging ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                  <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-tighter leading-none mb-1">Confirmar ubicación</p>
                    <p className="text-[11px] font-bold text-slate-700 truncate">{address}</p>
                  </div>
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white mx-auto"></div>
                </div>

                {/* 📍 PIN CON COLITA Y PUNTO (Estilo Uber/PedidosYa) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
                  <div className="relative flex flex-col items-center">
                    {/* Icono que salta */}
                    <div className={`transition-all duration-300 ease-out ${isDragging ? '-translate-y-10 scale-75' : '-translate-y-8 scale-100'}`}>
                      <div className="bg-orange-500 p-2.5 rounded-full shadow-[0_15px_30px_rgba(249,115,22,0.5)] border-2 border-white">
                        <MapPin size={28} className="text-white fill-white" />
                      </div>
                      {/* Colita del icono */}
                      <div className={`w-0.5 bg-orange-600/60 mx-auto transition-all duration-300 ${isDragging ? 'h-10' : 'h-0'}`}></div>
                    </div>
                    {/* Puntito de precisión en el mapa */}
                    <div className="w-2.5 h-2.5 bg-orange-600 rounded-full border-2 border-white shadow-lg"></div>
                    <div className={`w-8 h-2 bg-black/10 rounded-full blur-[2px] transition-all duration-300 ${isDragging ? 'scale-150 opacity-20' : 'scale-50 opacity-40'}`}></div>
                  </div>
                </div>

                {/* 🧭 BOTÓN GPS */}
                <button onClick={handleGetLocation} className={`absolute bottom-6 right-6 z-[1000] p-4 rounded-2xl shadow-2xl transition-all ${isLocating ? 'bg-orange-500 animate-spin text-white' : 'bg-white text-orange-500 active:scale-75'}`}>
                  <Navigation size={22} />
                </button>
              </div>

              <div className="space-y-2 px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">¿Cómo llegamos a tu puerta?</h3>
                <div className="relative">
                  <textarea 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full h-24 rounded-[30px] bg-slate-50 border border-slate-100 p-5 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 transition-all resize-none shadow-inner"
                  />
                  {!reference && (
                    <div className="absolute inset-0 p-5 pointer-events-none">
                      <p className="text-[11px] font-bold text-slate-300 italic leading-snug">
                        Ej: Casa amarilla de 2 pisos, portón negro con letras blancas, frente a la Ferretería "El Mirador"...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* FOOTER */}
        <div className="p-6 pt-2 bg-white flex-shrink-0 border-t border-slate-50 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="p-4 rounded-3xl bg-slate-100 text-slate-500 active:scale-90 transition-all"><ArrowLeft size={20} /></button>
          )}
          <div className="flex-1 flex flex-col">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3 animate-bounce">{error}</p>}
            <button 
              onClick={step === 1 ? handleNextStep : handleSave} 
              className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 h-16 text-[12px] font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700 flex items-center justify-center gap-2"
            >
              {step === 1 ? <>CONTINUAR A UBICACIÓN <ArrowRight size={16}/></> : '¡ESTABLECER PUNTO DE ENTREGA! 🚀'}
            </button>
          </div>
        </div>
      </div>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}
