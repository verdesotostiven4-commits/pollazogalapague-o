import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Camera, User, Phone, X, Sparkles, Check } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '@/context/UserContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: {
    name: string;
    whatsapp: string;
    avatarUrl: string;
  }) => void;
}

const DEFAULT_AVATAR = PRESET_AVATARS[0].url;

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    customerName,
    customerPhone,
    customerAvatar,
  } = useUser();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || DEFAULT_AVATAR);
    setIsExpanded(false);
    setError('');
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  const visibleAvatars = useMemo(() => {
    if (isExpanded) {
      return PRESET_AVATARS;
    }
    return PRESET_AVATARS.slice(0, 3);
  }, [isExpanded]);

  const processImage = (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result || typeof result !== 'string') {
        setIsProcessing(false);
        return;
      }

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const SIZE = 400;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        const minSide = Math.min(image.width, image.height);
        const sx = (image.width - minSide) / 2;
        const sy = (image.height - minSide) / 2;

        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.drawImage(image, sx, sy, minSide, minSide, 0, 0, SIZE, SIZE);

        const finalImage = canvas.toDataURL('image/jpeg', 0.9);
        setAvatar(finalImage);
        setIsProcessing(false);
      };
      image.onerror = () => setIsProcessing(false);
      image.src = result;
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
    e.target.value = '';
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedWhatsapp = whatsapp.trim();

    if (!trimmedName || !trimmedWhatsapp) {
      setError('Escribe tu nombre y WhatsApp');
      return;
    }

    onLogin({
      name: trimmedName,
      whatsapp: trimmedWhatsapp,
      avatarUrl: avatar,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Fondo de Vidrio que tapa TODO (incluyendo BottomNav) */}
      <div 
        className="absolute inset-0 bg-white/40 backdrop-blur-3xl animate-in fade-in duration-500" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md rounded-[50px] shadow-[0_20px_100px_-20px_rgba(0,0,0,0.3)] border border-white flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* HEADER COMPACTO */}
        <div className="p-6 pb-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200">
              <Sparkles size={18} className="text-white fill-white" />
            </div>
            <div className="text-left leading-none">
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Únete al Club</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sabor Galapagueño 🏝️</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-75 transition-all">
            <X size={18}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-5 custom-scrollbar">
          
          {/* SECCIÓN DATOS Y FOTO */}
          <div className="bg-gradient-to-br from-orange-50/50 to-white p-5 rounded-[35px] border border-orange-100/50 shadow-inner flex flex-col items-center gap-5">
            <div className="relative">
              <div className="h-24 w-24 rounded-[32px] overflow-hidden ring-[6px] ring-white shadow-xl bg-white group">
                <img src={avatar} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Preview" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-[32px]">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white animate-bounce">
                <Check size={14} strokeWidth={4} />
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <div className="relative group">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Tu Nombre o Alias" 
                  className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm" 
                />
              </div>
              <div className="relative group">
                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                <input 
                  value={whatsapp} 
                  onChange={(e) => setWhatsapp(e.target.value)} 
                  inputMode="tel" 
                  placeholder="Tu # de WhatsApp" 
                  className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm" 
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN SELECCIÓN AVATARES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">Personaliza tu Guerrero</h3>
            
            <div className="grid grid-cols-4 gap-3 px-1">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 active:scale-95 transition-all hover:bg-orange-50"
              >
                <Camera size={18}/>
                <span className="text-[6px] font-black uppercase mt-0.5">Galería</span>
              </button>
              
              {visibleAvatars.map(item => (
                <button 
                  key={item.id} 
                  type="button"
                  onClick={() => setAvatar(item.url)} 
                  className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-95 overflow-hidden ${avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10' : 'border-transparent opacity-80'}`}
                >
                  <img src={item.url} className="h-full w-full object-cover" alt={item.id} />
                </button>
              ))}
            </div>

            <button 
              type="button"
              onClick={() => setIsExpanded(!isExpanded)} 
              className="w-full py-2.5 flex items-center justify-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-widest bg-orange-50/50 rounded-2xl border border-orange-100 active:scale-[0.98] transition-all"
            >
              {isExpanded ? <><ChevronUp size={14}/> Ver menos</> : <><ChevronDown size={14}/> VER MÁS AVATARES</>}
            </button>
          </div>
          
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange} 
          />
        </div>

        {/* FOOTER FIJO */}
        <div className="p-6 pt-2 bg-white flex-shrink-0 border-t border-slate-50">
          {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3 animate-bounce">{error}</p>}
          <button 
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 py-4.5 text-[11px] font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-[0.25em] transition-all border-b-4 border-orange-700"
          >
            {isProcessing ? 'PROCESANDO...' : '¡COMENZAR AVENTURA! 🚀'}
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default LoginModal;
