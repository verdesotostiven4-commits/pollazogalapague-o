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
  const [isExpanded, setIsExpanded] = useState(false); // ✅ Controla el "Ver más"

  // Filtramos: 3 destacados + Galería = Fila perfecta de 4
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
      const file = files; // ✅ FIX: Capturamos el primer archivo correctamente
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

      const SIZE = 400; // Calidad un poco mayor
      canvas.width = SIZE; canvas.height = SIZE;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const cropSize = Math.min(img.width, img.height);
      const cropX = (img.width - cropSize) / 2;
      const cropY = (img.height - cropSize) / 2;

      ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, SIZE, SIZE);
      const finalImage = canvas.toDataURL('image/jpeg', 0.9);
      setAvatar(finalImage); // ✅ Se refleja inmediatamente
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
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <div className="fixed inset-0 z- flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4">
        <div className="relative w-full max-w-md rounded-t-[40px] sm:rounded-[45px] bg-white shadow-2xl flex flex-col max-h-[95vh] animate-slide-up sm:animate-in sm:zoom-in-95 sm:fade-in">
          
          {/* Indicador de arrastre para móvil */}
          <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-4 mb-2 sm:hidden" />

          {/* Header Compacto */}
          <div className="px-8 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 p-1.5 rounded-xl">
                <Sparkles size={18} className="text-orange-600 fill-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-none uppercase italic">{title}</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-300 hover:bg-slate-50 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-4 space-y-6">
            
            {/* SECCIÓN 1: FOTO Y DATOS (TODO JUNTO) */}
            <div className="flex items-center gap-6 bg-orange-50/50 p-4 rounded-[30px] border border-orange-100/50">
              <div className="relative flex-shrink-0">
                <div className="h-24 w-24 rounded-[28px] overflow-hidden ring-[4px] ring-white shadow-xl bg-white">
                  <img src={avatar} alt="Preview" className="h-full w-full object-cover" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[28px]">
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-lg shadow-lg border-2 border-white">
                  <Check size={12} strokeWidth={4} />
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="relative group">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu Nombre"
                    className="h-11 w-full rounded-xl bg-white pl-10 pr-4 text-sm font-bold text-slate-800 outline-none border border-slate-100 focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500" />
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    inputMode="tel"
                    placeholder="WhatsApp"
                    className="h-11 w-full rounded-xl bg-white pl-10 pr-4 text-sm font-bold text-slate-800 outline-none border border-slate-100 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: AVATARES (PANTALLA LIMPIA) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Elige tu Guerrero</h3>
              </div>

              {/* Grid Compacto: 3 destacados + Galería */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-90"
                >
                  <Camera size={18} />
                  <span className="text-[6px] font-black uppercase mt-1">Galería</span>
                </button>

                {featuredAvatars.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAvatar(item.url)}
                    className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-90 overflow-hidden ${
                      avatar === item.url ? 'border-orange-500 ring-2 ring-orange-100' : 'border-transparent opacity-80'
                    }`}
                  >
                    <img src={item.url} alt={item.id} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Acordeón "Ver más" */}
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 flex items-center justify-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-orange-50 rounded-xl transition-all"
              >
                {isExpanded ? (
                  <><ChevronUp size={14}/> Menos opciones</>
                ) : (
                  <><ChevronDown size={14}/> Ver más guerreros</>
                )}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {moreAvatars.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAvatar(item.url)}
                      className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-90 overflow-hidden ${
                        avatar === item.url ? 'border-orange-500 ring-2 ring-orange-100' : 'border-transparent opacity-70'
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

          {/* Botón de Acción Fijo al fondo */}
          <div className="p-8 pt-2 bg-white border-t border-slate-50">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-4 animate-bounce">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={isProcessing}
              className="w-full rounded-[20px] bg-gradient-to-r from-orange-500 to-orange-600 py-4 text-xs font-black text-white shadow-xl shadow-orange-500/30 active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] transition-all"
            >
              ¡GUARDAR Y CONTINUAR! 🚀
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
