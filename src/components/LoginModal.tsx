import React, { useEffect, useRef, useState } from 'react'; import { Camera, Phone, User, X, Sparkles } from 'lucide-react'; import { useUser } from '@/context/UserContext';

type LoginModalProps = { isOpen: boolean; onClose: () => void; onLogin: (payload: { name: string; whatsapp: string; avatarUrl: string; }) => void; };

const DEFAULT_AVATARS = [ 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo1', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo2', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo3', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo4', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo5', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo6', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo7', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo8', ];

export default function LoginModal({ isOpen, onClose, onLogin, }: LoginModalProps) { const inputRef = useRef<HTMLInputElement | null>(null); const { customerName, customerPhone, customerAvatar } = useUser();

const [name, setName] = useState(''); const [whatsapp, setWhatsapp] = useState(''); const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]); const [error, setError] = useState(''); const [isProcessing, setIsProcessing] = useState(false);

useEffect(() => { if (!isOpen) return;

setName(customerName || '');
setWhatsapp(customerPhone || '');
setAvatar(customerAvatar || DEFAULT_AVATARS[0]);
setError('');

}, [isOpen, customerName, customerPhone, customerAvatar]);

const handleFileChange = async ( e: React.ChangeEvent<HTMLInputElement> ) => { const file = e.target.files;

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

  if (!ctx) return;

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

  setAvatar(canvas.toDataURL('image/jpeg', 0.8));
  URL.revokeObjectURL(imageUrl);
} catch (err) {
  console.error(err);
} finally {
  setIsProcessing(false);
}

};

const handleLogin = () => { if (!name.trim() || !whatsapp.trim()) { setError('Por favor, completa los campos'); return; }

setError('');

onLogin({
  name: name.trim(),
  whatsapp: whatsapp.trim(),
  avatarUrl: avatar,
});

};

if (!isOpen) return null;

return ( <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-xl p-4"> <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl"> <button
onClick={onClose}
className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100"
> <X size={20} /> </button>

<div className="mb-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-orange-500" size={20} />
        <h2 className="text-xl font-black text-slate-800">
          Únete al Club
        </h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Acumula puntos y gana con tus compras
      </p>
    </div>

    <div className="mb-5 flex flex-col items-center">
      <img
        src={avatar}
        alt="avatar"
        className="h-24 w-24 rounded-[32px] object-cover ring-4 ring-orange-500"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing}
        className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-4 py-4 text-sm font-bold text-white active:scale-95"
      >
        <Camera size={24} />
        SUBIR MI FOTO DESDE EL CELULAR
      </button>
    </div>

    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileChange}
    />

    <div className="mb-4 grid grid-cols-4 gap-3">
      {DEFAULT_AVATARS.map((item, index) => (
        <button
          key={index}
          onClick={() => setAvatar(item)}
          className={`aspect-square overflow-hidden rounded-2xl border-2 transition ${
            avatar === item
              ? 'border-orange-500 scale-110'
              : 'border-transparent'
          }`}
        >
          <img
            src={item}
            alt={`avatar-${index}`}
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>

    <div className="space-y-3">
      <div className="relative">
        <User
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Stiven Verdesoto"
          className="h-12 w-full rounded-2xl bg-slate-100 pl-11 pr-4 outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="relative">
        <Phone
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Tu WhatsApp"
          className="h-12 w-full rounded-2xl bg-slate-100 pl-11 pr-4 outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
    </div>

    <div className="mt-4 min-h-[20px]">
      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>

    <button
      onClick={handleLogin}
      className="mt-1 h-12 w-full rounded-2xl bg-orange-500 font-semibold text-white shadow-lg active:scale-95"
    >
      Guardar
    </button>
  </div>
</div>

); }
