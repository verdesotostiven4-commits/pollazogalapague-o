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

  // 🔥 ARREGLO DEFINITIVO DE GALERÍA 🔥
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !fileList) return; 
    
    setIsProcessing(true);
    const file = fileList; // ✅ Accedemos al archivo real

    try {
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
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const cropSize = Math.min(img.width, img.height);
      const cropX = (img.width - cropSize) / 2;
      const cropY = (img.height - cropSize) / 2;

      ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, SIZE, SIZE);
      const finalImage = canvas.toDataURL('image/jpeg', 0.9);
      
      setAvatar(finalImage); // ✅ Ahora sí se refleja
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = ''; // Reset para subir la misma si se desea
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
            0% { opacity: 0; transform: scale(0.9) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-pop { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}
      </style>

      {/* OVERLAY DE VIDRIO CLARO (Cubre todo, incluso BottomNav) */}
      <div className="fixed inset-0 z- flex items-end sm:items-center justify-center bg-white/40 backdrop-blur-xl p-0 sm:p-4">
        
        <div className="relative w-full max-w-md rounded-t-[45px] sm:rounded-[50px] bg-white/90 backdrop-blur-md shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col max-h-[92vh] animate-pop border border-white/40">
          
          {/* Handle de arrastre estético */}
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-4 mb-2 sm:hidden" />

          {/* Header */}
          <div className="px-8 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200">
                <Sparkles size={18} className="text-white fill-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-none uppercase italic tracking-tighter">{title}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-90 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6 space-y-8">
            
            {/* PERFIL Y DATOS - ESTILO CARD VIP */}
            <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-orange-50 to-white p-6 rounded-[35px] border border-orange-100/50 shadow-inner">
              <div className="relative">
                <div className="h-28 w-28 rounded-[38px] overflow-hidden ring-[6px] ring-white shadow-2xl bg-white transition-transform hover:rotate-3">
                  <img src={avatar} alt="Preview" className="h-full w-full object-cover" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-2xl shadow-lg border-4 border-white animate-bounce">
                  <Check size={14} strokeWidth={4} />
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu Nombre o Alias"
                    className="h-12 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>
                <div className="relative group">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    inputMode="tel"
                    placeholder="Tu # de WhatsApp"
                    className="h-12 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN AVATARES */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Elige tu Identidad</h3>
              
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 active:scale-95 transition-all"
                >
                  <Camera size={20} />
                  <span className="text-[7px] font-black uppercase mt-1">Galería</span>
                </button>

                {featuredAvatars.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAvatar(item.url)}
                    className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-95 overflow-hidden ${
                      avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10 shadow-lg' : 'border-transparent opacity-80'
                    }`}
                  >
                    <img src={item.url} alt={item.id} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-3 flex items-center justify-center gap-2 text-orange-600 font-black text-[9px] uppercase tracking-[0.15em] bg-orange-50/50 rounded-2xl active:scale-[0.98] transition-all border border-orange-100/50"
              >
                {isExpanded ? <><ChevronUp size={14}/> Menos Opciones</> : <><ChevronDown size={14}/> Ver más Avatares</>}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                  {moreAvatars.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAvatar(item.url)}
                      className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-95 overflow-hidden ${
                        avatar === item.url ? 'border-orange-500 ring-2 ring-orange-100' : 'border-transparent opacity-60'
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

          {/* FOOTER CON BOTÓN (Espaciado mejorado) */}
          <div className="p-8 pt-4 pb-10 sm:pb-8 bg-white border-t border-slate-50 flex-shrink-0">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-4 animate-bounce">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={isProcessing}
              className="w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-orange-600 py-4.5 text-[11px] font-black text-white shadow-2xl shadow-orange-500/40 active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] transition-all border-b-4 border-orange-700"
            >
              ¡GUARDAR Y CONTINUAR! 🚀
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
