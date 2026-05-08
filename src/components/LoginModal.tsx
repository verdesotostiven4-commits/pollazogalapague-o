import React, { useEffect, useRef, useState } from 'react';
import { Camera, Phone, User, X, Sparkles, Check } from 'lucide-react';
import { useUser } from '../context/UserContext'; // Ajusté la ruta por si acaso
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
  const [avatar, setAvatar] = useState(PRESET_AVATARS.url);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || PRESET_AVATARS.url);
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
            0% { opacity: 0; transform: scale(0.5) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-avatar { animation: avatarEntry 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
        `}
      </style>

      <div className="fixed inset-0 z- flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative w-full max-w-sm rounded-[40px] bg-white p-6 shadow-2xl overflow-hidden">
          
          {/* Fondo Decorativo */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-50 rounded-full blur-3xl opacity-50" />

          {/* Cerrar */}
          <button onClick={onClose} className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-50 transition-colors">
            <X size={20} />
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-orange-100 p-1.5 rounded-lg">
                <Sparkles size={18} className="text-orange-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{title}</h2>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none ml-1">{subtitle}</p>
          </div>

          {/* Avatar Preview Principal */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="h-28 w-28 rounded-[35px] overflow-hidden ring-[6px] ring-orange-50 shadow-2xl transition-transform duration-500 hover:scale-105">
                <img src={avatar} alt="Preview" className="h-full w-full object-cover" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-2xl shadow-lg border-4 border-white animate-bounce">
                <Check size={16} strokeWidth={4} />
              </div>
            </div>
          </div>

          {/* Grid Selector de Avatares */}
          <div className="mb-8 grid grid-cols-4 gap-3">
            {/* Opción: Subir Foto */}
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-90 group"
            >
              <Camera size={20} className="group-hover:text-orange-500 transition-colors" />
              <span className="text-[7px] font-black uppercase mt-1">Subir</span>
            </button>

            {/* Presets */}
            {PRESET_AVATARS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAvatar(item.url)}
                className={`aspect-square overflow-hidden rounded-2xl border-2 transition-all active:scale-90 animate-avatar ${
                  avatar === item.url
                    ? 'border-orange-500 ring-4 ring-orange-100 scale-110 z-10 shadow-lg'
                    : 'border-transparent grayscale-[30%] opacity-80 hover:grayscale-0 hover:opacity-100'
                }`}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <img src={item.url} alt={item.id} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {/* Formulario */}
          <div className="space-y-3">
            <div className="relative group">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del Guerrero"
                className="h-14 w-full rounded-[20px] bg-slate-50 pl-12 pr-4 font-bold text-slate-800 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-orange-500 shadow-sm"
              />
            </div>

            <div className="relative group">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                inputMode="tel"
                placeholder="WhatsApp (Ej: 098...)"
                className="h-14 w-full rounded-[20px] bg-slate-50 pl-12 pr-4 font-bold text-slate-800 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-orange-500 shadow-sm"
              />
            </div>
          </div>

          {/* Error y Botón */}
          <div className="mt-4">
            {error && <p className="text-center text-xs font-black text-red-500 uppercase mb-3 animate-shake">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={isProcessing}
              className="w-full rounded-[22px] bg-gradient-to-r from-orange-500 to-orange-600 py-4 text-sm font-black text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 uppercase tracking-widest"
            >
              ¡Comenzar Aventura! 🚀
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
