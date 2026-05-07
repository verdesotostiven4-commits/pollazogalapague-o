import React, { useEffect, useRef, useState } from 'react';
import { Camera, Phone, User, X, Sparkles } from 'lucide-react';
import { useUser } from '@/context/UserContext';

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

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo1',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo2',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo3',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo4',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo5',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo6',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo7',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo8',
];

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

  // FIX: iniciar con un avatar individual, no con el array completo
  const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]);

  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setName(customerName || '');
    setWhatsapp(customerPhone || '');
    setAvatar(customerAvatar || DEFAULT_AVATARS[0]);
    setError('');
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // FIX móvil: usar e.target.files
    const selectedFile = e.target.files;

    if (!selectedFile || !selectedFile[0]) return;

    setIsProcessing(true);

    try {
      const file = selectedFile[0];

      const objectUrl = URL.createObjectURL(file);

      const img = await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const image = new Image();

          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = objectUrl;
        }
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      // Center Crop 256x256
      const SIZE = 256;

      canvas.width = SIZE;
      canvas.height = SIZE;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const cropSize = Math.min(img.width, img.height);

      const cropX = (img.width - cropSize) / 2;
      const cropY = (img.height - cropSize) / 2;

      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropSize,
        cropSize,
        0,
        0,
        SIZE,
        SIZE
      );

      const finalImage = canvas.toDataURL(
        'image/jpeg',
        0.85
      );

      setAvatar(finalImage);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error procesando imagen:', error);
    } finally {
      setIsProcessing(false);

      // permitir volver a subir misma imagen
      e.target.value = '';
    }
  };

  const handleLogin = () => {
    if (!name.trim() || !whatsapp.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    setError('');

    onLogin({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      avatarUrl: avatar,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes softPulse {
            0%,100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.05);
            }
          }
        `}
      </style>

      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md">
        <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl">

          {/* Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 active:scale-95"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          {/* Header dinámico */}
          <div className="mb-5 pr-10">
            <div className="flex items-center gap-2">
              <Sparkles
                size={20}
                className="text-orange-500"
              />

              <h2 className="text-xl font-black text-slate-900">
                {title}
              </h2>
            </div>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {subtitle}
            </p>
          </div>

          {/* Avatar principal */}
          <div className="mb-5 flex flex-col items-center">
            <img
              src={avatar}
              alt="Avatar cliente"
              className="h-24 w-24 rounded-[28px] object-cover ring-4 ring-orange-500 shadow-lg"
            />

            {/* Botón compacto */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing}
              className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 active:scale-95 disabled:opacity-70"
              style={{
                animation:
                  'softPulse 2s ease-in-out infinite',
              }}
            >
              <Camera size={20} />

              {isProcessing
                ? 'PROCESANDO...'
                : 'SUBIR MI FOTO'}
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Avatares */}
          <div className="mb-5 grid grid-cols-4 gap-3">
            {DEFAULT_AVATARS.map(
              (item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  className={`aspect-square overflow-hidden rounded-2xl border-2 transition active:scale-95 ${
                    avatar === item
                      ? 'scale-105 border-orange-500 ring-2 ring-orange-200'
                      : 'border-transparent'
                  }`}
                >
                  <img
                    src={item}
                    alt={`Avatar ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              )
            )}
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div className="relative">
              <User
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Ej: Stiven Verdesoto"
                className="h-12 w-full rounded-2xl bg-slate-50 pl-12 pr-4 font-bold text-slate-800 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-orange-500"
              />
            </div>

            <div className="relative">
              <Phone
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(e.target.value)
                }
                inputMode="tel"
                placeholder="Tu # de WhatsApp"
                className="h-12 w-full rounded-2xl bg-slate-50 pl-12 pr-4 font-bold text-slate-800 outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Error */}
          <div className="mt-3 min-h-[20px]">
            {error && (
              <p className="text-center text-sm font-bold text-red-500">
                {error}
              </p>
            )}
          </div>

          {/* Guardar */}
          <button
            type="button"
            onClick={handleLogin}
            className="mt-2 w-full rounded-2xl bg-orange-500 py-4 text-base font-black text-white shadow-xl shadow-orange-500/30 transition hover:bg-orange-600 active:scale-95"
          >
            GUARDAR
          </button>

        </div>
      </div>
    </>
  );
}
