import React, { useEffect, useRef, useState } from 'react';
import { Camera, Phone, User, X, Sparkles } from 'lucide-react';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: {
    name: string;
    whatsapp: string;
    avatarUrl: string;
  }) => void;
};

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo1',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo2',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo3',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo4',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo5',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo6',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo7',
  'https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo8',
];

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const customerName = localStorage.getItem('customerName') || '';
    const customerPhone = localStorage.getItem('customerPhone') || '';
    const customerAvatar = localStorage.getItem('customerAvatar') || '';

    setName(customerName);
    setWhatsapp(customerPhone);
    setAvatar(customerAvatar || DEFAULT_AVATARS[0]);
    setError('');
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files;

    if (!file || !file[0]) return;

    const selectedFile = file[0];
    setIsProcessing(true);

    try {
      const imageUrl = URL.createObjectURL(selectedFile);

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(imageUrl);
        return;
      }

      const SIZE = 256;
      canvas.width = SIZE;
      canvas.height = SIZE;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const sourceWidth = img.width;
      const sourceHeight = img.height;

      const cropSize = Math.min(sourceWidth, sourceHeight);
      const cropX = (sourceWidth - cropSize) / 2;
      const cropY = (sourceHeight - cropSize) / 2;

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

      const croppedImage = canvas.toDataURL('image/jpeg', 0.8);
      setAvatar(croppedImage);

      URL.revokeObjectURL(imageUrl);
    } catch (err) {
      console.error('Error al procesar la imagen:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleLogin = () => {
    if (!name.trim() || !whatsapp.trim()) {
      setError('Por favor, completa los campos');
      return;
    }

    const cleanName = name.trim();
    const cleanWhatsapp = whatsapp.trim();

    localStorage.setItem('customerName', cleanName);
    localStorage.setItem('customerPhone', cleanWhatsapp);
    localStorage.setItem('customerAvatar', avatar);

    setError('');

    onLogin({
      name: cleanName,
      whatsapp: cleanWhatsapp,
      avatarUrl: avatar,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-xl">
      <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 active:scale-95"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="mb-4 pr-10">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={20} className="text-orange-500" />
            <h2 className="text-2xl font-black text-slate-900">
              Únete al Club
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Acumula puntos y gana con tus compras
          </p>
        </div>

        <div className="mb-4 flex flex-col items-center">
          <img
            src={avatar}
            alt="Avatar del cliente"
            className="h-28 w-28 rounded-[32px] object-cover ring-4 ring-orange-500 shadow-xl"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-600 ring-2 ring-orange-100 transition hover:bg-orange-100 active:scale-95 disabled:opacity-70"
          >
            <Camera size={22} />
            {isProcessing ? 'PROCESANDO FOTO...' : 'SUBIR MI FOTO'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {DEFAULT_AVATARS.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setAvatar(item)}
              className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition active:scale-95 ${
                avatar === item
                  ? 'border-orange-500 ring-2 ring-orange-200'
                  : 'border-transparent'
              }`}
            >
              <img
                src={item}
                alt={`Avatar ${index + 1}`}
                className="h-14 w-full object-cover"
              />
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <User
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Stiven Verdesoto"
              className="h-12 w-full rounded-2xl bg-slate-100 pl-12 pr-4 text-base font-semibold text-slate-800 outline-none ring-2 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-orange-500"
            />
          </div>

          <div className="relative">
            <Phone
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Tu WhatsApp"
              inputMode="tel"
              className="h-12 w-full rounded-2xl bg-slate-100 pl-12 pr-4 text-base font-semibold text-slate-800 outline-none ring-2 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="mt-3 min-h-[20px]">
          {error && (
            <p className="text-center text-sm font-bold text-red-500">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogin}
          className="mt-2 h-13 w-full rounded-2xl bg-orange-500 py-4 text-base font-black text-white shadow-xl shadow-orange-500/30 transition hover:bg-orange-600 active:scale-95"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
