import React, { useEffect, useRef, useState } from 'react';
import { Camera, Phone, User, X, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { PRESET_AVATARS } from '../constants/avatars';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (payload: {
    name: string;
    whatsapp: string;
    avatarUrl: string;
  }) => void;
  title?: string;
  subtitle?: string;
};

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
  title = 'Únete al Club',
  subtitle = 'Gana puntos con tus compras',
}: LoginModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { customerName, customerPhone, customerAvatar } = useUser();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(PRESET_AVATARS?.url || '');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const featuredAvatars = PRESET_AVATARS.slice(0, 3);
  const moreAvatars = PRESET_AVATARS.slice(3).filter(a => a.id !== 'wink');

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || PRESET_AVATARS?.url || '');
    setError('');
    setIsExpanded(false);
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files) return; 
    setIsProcessing(true);

    try {
      const file = files; // ✅ FIX DEFINITIVO
      const objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const SIZE = 400; 
      canvas.width = SIZE; canvas.height = SIZE;
      const cropSize = Math.min(img.width, img.height);
      const cropX = (img.width - cropSize) / 2;
      const cropY = (img.height - cropSize) / 2;

      ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, SIZE, SIZE);
      const finalImage = canvas.toDataURL('image/jpeg', 0.9);
      setAvatar(finalImage); 
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleLogin = () => {
    if (!name.trim() || !whatsapp.trim()) {
      setError('Escribe tu nombre y WhatsApp');
      return;
    }
    setError('');
    onLogin({ name: name.trim(), whatsapp: whatsapp.trim(), avatarUrl: avatar });
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes popIn {
            0% { transform: scale(0.9) translateY(20px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {/* ✅ Z-INDEX AL MÁXIMO PARA TAPAR TODO */}
      <div className="fixed inset-0 z- flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-xl p-0 sm:p-4 overflow-hidden">
        <div className="relative w-full max-w-md rounded-t-[45px] sm:rounded-[50px] bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.3)] flex flex-col max-h-[92vh] animate-pop-in">
          
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 opacity-50" />

          {/* Header Elegante */}
          <div className="px-8 pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-2xl shadow-inner">
                <Sparkles size={20} className="text-orange-600 fill-orange-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{title}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-orange-50 hover:text-orange-500 transition-all">
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar px-8 space-y-8 pb-10">
            
            {/* PANEL DE CONTROL DEL GUERRERO */}
            <div className="flex items-center gap-5 bg-gradient-to-br from-orange-50 to-white p-5 rounded-[35px] border border-orange-100/50 shadow-sm">
              <div className="relative flex-shrink-0 group">
                <div className="h-24 w-24 rounded-[30px] overflow-hidden ring-[5px] ring-white shadow-2xl bg-white transition-transform group-hover:scale-105 duration-500">
                  <img src={avatar} alt="Preview" className="h-full w-full object-cover" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-[30px]">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-white animate-bounce">
                  <Check size={14} strokeWidth={4} />
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="relative group">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu Alias"
                    className="h-11 w-full rounded-xl bg-white/80 pl-10 pr-4 text-sm font-black text-slate-800 outline-none border border-slate-200 focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    inputMode="tel"
                    placeholder="Tu # de WhatsApp"
                    className="h-11 w-full rounded-xl bg-white/80 pl-10 pr-4 text-sm font-black text-slate-800 outline-none border border-slate-200 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN AVATARES */}
            <div className="space-y-5">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] ml-2 italic opacity-60">Escoge tu Identidad</h3>

              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-[24px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-orange-50 hover:border-orange-500 transition-all active:scale-90"
                >
                  <Camera size={22} />
                  <span className="text-[7px] font-black uppercase mt-1">Galería</span>
                </button>

                {featuredAvatars.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAvatar(item.url)}
                    className={`relative aspect-square rounded-[24px] border-2 transition-all active:scale-95 overflow-hidden shadow-sm ${
                      avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10' : 'border-transparent opacity-80'
                    }`}
                  >
                    <img src={item.url} alt={item.id} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Botón Ver Más */}
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-4 flex items-center justify-center gap-3 text-orange-600 font-black text-[10px] uppercase tracking-[0.2em] bg-orange-50/30 rounded-[22px] border border-orange-100/50 hover:bg-orange-50 transition-all active:scale-95"
              >
                {isExpanded ? <><ChevronUp size={16}/> Menos Opciones</> : <><ChevronDown size={16}/> Explorar Avatares</>}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  {moreAvatars.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAvatar(item.url)}
                      className={`relative aspect-square rounded-[24px] border-2 transition-all active:scale-95 overflow-hidden shadow-sm ${
                        avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={item.url} alt={item.id} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* FOOTER PREMIUM */}
          <div className="p-8 pt-4 bg-white border-t border-slate-50 flex-shrink-0 pb-10">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-4 animate-shake">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={isProcessing}
              className="group relative w-full overflow-hidden rounded-[26px] bg-slate-900 py-5 text-[11px] font-black text-white shadow-2xl active:scale-95 disabled:opacity-50 uppercase tracking-[0.3em] transition-all"
            >
              <span className="relative z-10">¡Empezar mi Aventura! 🚀</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
