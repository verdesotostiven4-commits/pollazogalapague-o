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
  // ✅ Corregido: Inicialización segura con el primer avatar
  const [avatar, setAvatar] = useState(PRESET_AVATARS?.url || '');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtramos la lista para que solo queden 11 (Quitamos 'wink' para que con 'subir' sumen 12)
  const filteredAvatars = PRESET_AVATARS.filter(a => a.id !== 'wink');

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || PRESET_AVATARS?.url || '');
    setError('');
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files) return; // ✅ Corregido acceso a archivos
    setIsProcessing(true);

    try {
      const file = files; // ✅ Captura el archivo real
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
          @keyframes avatarEntry {
            0% { opacity: 0; transform: scale(0.8) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-avatar { animation: avatarEntry 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <div className="fixed inset-0 z- flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative w-full max-w-sm rounded-[45px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          
          {/* Header */}
          <div className="p-7 pb-4 relative flex-shrink-0 text-center">
            <button onClick={onClose} className="absolute right-6 top-6 rounded-full p-2 text-slate-300 hover:text-slate-500 transition-colors">
              <X size={24} />
            </button>
            <div className="inline-flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-orange-500 fill-orange-500" />
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{title}</h2>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{subtitle}</p>
          </div>

          {/* Cuerpo con Scroll */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-7 space-y-8 pb-4">
            
            {/* Preview Principal (Grande y Claro) */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-32 w-32 rounded-[40px] overflow-hidden ring-[6px] ring-orange-50 shadow-2xl bg-slate-50 transition-all duration-500">
                  {avatar ? (
                    <img src={avatar} alt="Preview" className="h-full w-full object-cover animate-in zoom-in duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><User size={50}/></div>
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-2xl shadow-lg border-4 border-white animate-bounce">
                  <Check size={18} strokeWidth={4} />
                </div>
              </div>
            </div>

            {/* Grid de Avatares (3 columnas para más espacio) */}
            <div className="grid grid-cols-3 gap-5">
              {/* Botón Subir Foto */}
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-[28px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-90 bg-slate-50/30 group"
              >
                <Camera size={22} className="group-hover:text-orange-500 transition-colors" />
                <span className="text-[8px] font-black uppercase mt-1.5">Galería</span>
              </button>

              {/* Presets */}
              {filteredAvatars.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAvatar(item.url)}
                  className={`relative aspect-square rounded-[28px] border-2 transition-all active:scale-90 animate-avatar overflow-hidden bg-slate-50 ${
                    avatar === item.url
                      ? 'border-orange-500 ring-4 ring-orange-100 scale-110 z-10 shadow-xl'
                      : 'border-transparent opacity-90'
                  }`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <img 
                    src={item.url} 
                    alt={item.id} 
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} 
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-slate-300 uppercase text-center p-2 pointer-events-none opacity-40">
                    {item.id.replace('-', ' ')}
                  </span>
                </button>
              ))}
            </div>
            
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* Inputs con Estilo Premium */}
            <div className="space-y-4">
              <div className="relative group">
                <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre de Guerrero"
                  className="h-14 w-full rounded-[22px] bg-slate-50/80 border-2 border-transparent focus:border-orange-500 focus:bg-white pl-14 pr-6 text-sm font-bold text-slate-800 outline-none transition-all"
                />
              </div>

              <div className="relative group">
                <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  inputMode="tel"
                  placeholder="WhatsApp (09...)"
                  className="h-14 w-full rounded-[22px] bg-slate-50/80 border-2 border-transparent focus:border-orange-500 focus:bg-white pl-14 pr-6 text-sm font-bold text-slate-800 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Botón de Acción Fijo */}
          <div className="p-7 pt-2 bg-white/80 backdrop-blur-md">
            {error && <p className="text-center text-[10px] font-black text-red-500 uppercase mb-4 animate-shake">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={isProcessing}
              className="w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-orange-600 py-4 text-[11px] font-black text-white shadow-xl shadow-orange-500/30 active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] transition-all"
            >
              ¡Comenzar mi Aventura! 🚀
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
