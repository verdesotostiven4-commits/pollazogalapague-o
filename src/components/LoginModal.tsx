import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Camera, User, Phone, X, Sparkles, Check } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '@/context/UserContext'; 

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: {
    name: string;
    phone: string;
    avatar: string;
  }) => void;
}

const DEFAULT_AVATAR = PRESET_AVATARS.url;

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { customerName, customerPhone, customerAvatar } = useUser();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setPhone(customerPhone || '');
    setAvatar(customerAvatar || DEFAULT_AVATAR);
    setIsExpanded(false);
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  const visibleAvatars = useMemo(() => {
    return isExpanded ? PRESET_AVATARS : PRESET_AVATARS.slice(0, 3);
  }, [isExpanded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.; // ✅ SINTAXIS VERIFICADA
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
        setAvatar(canvas.toDataURL('image/jpeg', 0.9));
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      alert('Completa tu nombre y WhatsApp para continuar.');
      return;
    }
    onLogin({ name: name.trim(), phone: phone.trim(), avatar });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z- overflow-hidden bg-white/40 backdrop-blur-3xl flex items-center justify-center p-4">
      <div className="relative flex w-full max-w-sm flex-col rounded-[40px] border border-white/60 bg-white/80 p-5 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-hidden">
        
        <button onClick={onClose} className="absolute right-5 top-5 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
          <X size={20} />
        </button>

        <div className="mb-4 text-center">
          <h1 className="text-2xl font-black text-orange-600 flex items-center justify-center gap-2 italic uppercase tracking-tighter">
            <Sparkles size={24} fill="currentColor"/> ¡BIENVENIDO!
          </h1>
          <p className="mt-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Personaliza tu perfil de Guerrero</p>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-6 pr-1">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-[35px] border-[6px] border-white bg-orange-50 shadow-xl">
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover animate-in zoom-in duration-300" />
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white animate-bounce">
                <Check size={14} strokeWidth={4} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu Nombre o Alias" className="h-12 w-full rounded-2xl border-none bg-white/90 px-11 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tu # de WhatsApp" className="h-12 w-full rounded-2xl border-none bg-white/90 px-11 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">Selecciona tu Avatar</p>
            <div className="grid grid-cols-4 gap-3 px-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-slate-50/50 text-orange-400 active:scale-95 transition-all">
                <Camera size={20} />
                <span className="text-[7px] font-black uppercase">Galería</span>
              </button>

              {visibleAvatars.map((item) => (
                <button key={item.id} type="button" onClick={() => setAvatar(item.url)} className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-all active:scale-95 ${avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10 shadow-lg' : 'border-transparent opacity-80'}`}>
                  <img src={item.url} alt={item.id} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-100/50 py-3 text-[10px] font-black uppercase tracking-widest text-orange-600 transition-all hover:bg-orange-100 active:scale-95">
              {isExpanded ? <><ChevronUp size={16}/> Ocultar</> : <><ChevronDown size={16}/> VER MÁS AVATARES</>}
            </button>
          </div>
        </div>

        <div className="pt-6">
          <button type="button" onClick={handleSubmit} disabled={isProcessing} className="w-full h-14 rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-orange-500/40 border-b-4 border-orange-700 active:translate-y-1 active:border-b-0 transition-all disabled:opacity-50">
            {isProcessing ? 'PROCESANDO...' : '¡COMENZAR AVENTURA! 🚀'}
          </button>
        </div>
        
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default LoginModal;
