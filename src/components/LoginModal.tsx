import React, { useEffect, useRef, useState } from 'react';
import { Camera, Phone, User, X, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { PRESET_AVATARS } from '../constants/avatars';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (payload: { name: string; whatsapp: string; avatarUrl: string; }) => void;
  title?: string;
  subtitle?: string;
};

export default function LoginModal({ isOpen, onClose, onLogin, title = 'Únete al Club', subtitle = 'Gana puntos con tus compras' }: LoginModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { customerName, customerPhone, customerAvatar } = useUser();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  // ✅ Inicialización corregida
  const [avatar, setAvatar] = useState(PRESET_AVATARS.url);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const featured = PRESET_AVATARS.slice(0, 3);
  const remaining = PRESET_AVATARS.slice(3);

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || PRESET_AVATARS.url);
    setIsExpanded(false);
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  // 🔥 ARREGLO DEFINITIVO DE GALERÍA (USANDO FILEREADER) 🔥
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.;
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

        // Recorte cuadrado perfecto
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, SIZE, SIZE);
        
        setAvatar(canvas.toDataURL('image/jpeg', 0.9)); // ✅ Ahora se refleja sí o sí
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4">
      {/* FONDO VIDRIO TOTAL (Cubre BottomNav) */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white/90 backdrop-blur-md rounded-[50px] shadow-[0_20px_100px_-20px_rgba(0,0,0,0.2)] border border-white flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 pb-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-left">
            <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200">
              <Sparkles size={18} className="text-white fill-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none uppercase italic tracking-tighter">{title}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-75 transition-transform"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">
          
          {/* SECCIÓN DATOS Y FOTO */}
          <div className="bg-gradient-to-br from-orange-50 to-white p-5 rounded-[35px] border border-orange-100/50 shadow-inner flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-[32px] overflow-hidden ring-[6px] ring-white shadow-xl bg-white group">
                <img src={avatar} className="h-full w-full object-cover transition-transform group-hover:scale-110" alt="Preview" />
                {isProcessing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white animate-bounce"><Check size={14} strokeWidth={4} /></div>
            </div>

            <div className="w-full space-y-2">
              <div className="relative group">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Tu Nombre o Alias" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm" />
              </div>
              <div className="relative group">
                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} placeholder="Tu # de WhatsApp" className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm" />
              </div>
            </div>
          </div>

          {/* SECCIÓN SELECCIÓN AVATARES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Elige tu Identidad</h3>
            <div className="grid grid-cols-4 gap-3">
              <button onClick={()=>inputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 active:scale-95 transition-all hover:bg-orange-50"><Camera size={18}/><span className="text-[6px] font-black uppercase">Galería</span></button>
              {featured.map(item => (
                <button key={item.id} onClick={()=>setAvatar(item.url)} className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-95 overflow-hidden ${avatar === item.url ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10' : 'border-transparent opacity-80'}`}><img src={item.url} className="h-full w-full object-cover" /></button>
              ))}
            </div>

            <button onClick={()=>setIsExpanded(!isExpanded)} className="w-full py-2.5 flex items-center justify-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-widest bg-orange-50/50 rounded-2xl border border-orange-100 active:scale-[0.98] transition-all">
              {isExpanded ? <><ChevronUp size={14}/> Menos Opciones</> : <><ChevronDown size={14}/> Ver más Avatares</>}
            </button>

            {isExpanded && (
              <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                {remaining.map(item => (
                  <button key={item.id} onClick={()=>setAvatar(item.url)} className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-95 overflow-hidden ${avatar === item.url ? 'border-orange-500 ring-2 ring-orange-100' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={item.url} className="h-full w-full object-cover" /></button>
                ))}
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* FOOTER CON BOTÓN */}
        <div className="p-6 pt-2 bg-white flex-shrink-0">
          {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3 animate-bounce">{error}</p>}
          <button 
            onClick={() => {
              if(!name.trim() || !whatsapp.trim()) { setError('Completa tus datos de Guerrero'); return; }
              onLogin({ name, whatsapp, avatarUrl: avatar });
            }}
            className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 py-4.5 text-xs font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700"
          >
            ¡COMENZAR AVENTURA! 🚀
          </button>
        </div>
      </div>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
