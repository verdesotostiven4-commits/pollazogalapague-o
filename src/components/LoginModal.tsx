import React, { useEffect, useRef, useState } from 'react';
import { Camera, Phone, User, X, Sparkles, Check } from 'lucide-react';
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
  subtitle = 'Acumula puntos y gana con tus compras',
}: LoginModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { customerName, customerPhone, customerAvatar } = useUser();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  // ✅ Corregido: Acceso al primer elemento del array
  const [avatar, setAvatar] = useState(PRESET_AVATARS?.url || '');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || PRESET_AVATARS?.url || '');
    setError('');
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files;
    if (!selectedFile || !selectedFile) return;
    setIsProcessing(true);

    try {
      const file = selectedFile;
      const objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); return; }

      const SIZE = 256;
      canvas.width = SIZE; canvas.height = SIZE;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const cropSize = Math.min(img.width, img.height);
      const cropX = (img.width - cropSize) / 2;
      const cropY = (img.height - cropSize) / 2;

      ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, SIZE, SIZE);
      const finalImage = canvas.toDataURL('image/jpeg', 0.85);
      setAvatar(finalImage);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error procesando imagen:', error);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleLogin = () => {
    if (!name.trim() || !whatsapp.trim()) {
      setError('Por favor completa todos los campos');
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
          @keyframes avatarEntry {
            0% { opacity: 0; transform: scale(0.5) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-avatar { animation: avatarEntry 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <div className="fixed inset-0 z- flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative w-full max-w-sm rounded-[40px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header Fijo */}
          <div className="p-6 pb-2 relative flex-shrink-0">
            <button onClick={onClose} className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-50 active:scale-90 transition-all">
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-orange-100 p-1.5 rounded-lg">
                <Sparkles size={18} className="text-orange-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">{title}</h2>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none ml-1">{subtitle}</p>
          </div>

          {/* Cuerpo con Scroll */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pt-2 space-y-6">
            
            {/* Preview Principal */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-[32px] overflow-hidden ring-[5px] ring-orange-50 shadow-xl bg-slate-100">
                  {avatar ? (
                    <img src={avatar} alt="Preview" className="h-full w-full object-cover animate-in fade-in zoom-in duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40}/></div>
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white animate-bounce">
                  <Check size={14} strokeWidth={4} />
                </div>
              </div>
            </div>

            {/* Grid de Avatares */}
            <div className="grid grid-cols-4 gap-3">
              {/* Botón Subir */}
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-90 bg-slate-50/50"
              >
                <Camera size={18} />
                <span className="text-[7px] font-black uppercase mt-1">Subir</span>
              </button>

              {/* Presets Blindados */}
              {PRESET_AVATARS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAvatar(item.url)}
                  className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-90 animate-avatar overflow-hidden bg-slate-50 ${
                    avatar === item.url
                      ? 'border-orange-500 ring-2 ring-orange-100 scale-105 z-10 shadow-md'
                      : 'border-transparent opacity-80'
                  }`}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <img 
                    src={item.url} 
                    alt={item.id} 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Si la imagen falla, ocultamos el texto roto
                      (e.target as HTMLImageElement).style.opacity = '0';
                    }} 
                  />
                  {/* Etiqueta invisible para mantener el tamaño si no carga imagen */}
                  <span className="absolute inset-0 flex items-center justify-center text-[6px] font-bold text-slate-300 uppercase text-center p-1 pointer-events-none">
                    {item.id.replace('-', ' ')}
                  </span>
                </button>
              ))}
            </div>
            
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* Inputs de Texto */}
            <div className="space-y-3">
              <div className="relative group">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu Nombre o Alias"
                  className="h-12 w-full rounded-[18px] bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none ring-2 ring-transparent focus:bg-white focus:ring-orange-500 transition-all shadow-sm"
                />
              </div>

              <div className="relative group">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  inputMode="tel"
                  placeholder="WhatsApp (09...)"
                  className="h-12 w-full rounded-[18px] bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none ring-2 ring-transparent focus:bg-white focus:ring-orange-500 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Footer Fijo con Botón */}
          <div className="p-6 pt-2 bg-white flex-shrink-0">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={isProcessing}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-4 text-xs font-black text-white shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 uppercase tracking-widest transition-all"
            >
              ¡COMENZAR AVENTURA! 🚀
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
