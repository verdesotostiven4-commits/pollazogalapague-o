import React, { useRef, useState } from 'react'; import { Camera, Phone, User, X, Sparkles } from 'lucide-react';

type LoginModalProps = { isOpen: boolean; onClose: () => void; onSave: (payload: { name: string; phone: string; avatar: string; }) => void; };

const DEFAULT_AVATARS = [ 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo1', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo2', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo3', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo4', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo5', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo6', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo7', 'https://api.dicebear.com/8.x/adventurer/svg?seed=pollo8', ];

export default function LoginModal({ isOpen, onClose, onSave, }: LoginModalProps) { const inputRef = useRef<HTMLInputElement | null>(null);

const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]); const [error, setError] = useState(''); const [isProcessing, setIsProcessing] = useState(false);

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

  const compressed = canvas.toDataURL('image/jpeg', 0.8);
  setAvatar(compressed);

  URL.revokeObjectURL(imageUrl);
} catch (err) {
  console.error('Error processing image:', err);
} finally {
  setIsProcessing(false);
}

};

const handleSave = () => { if (!name.trim() || !phone.trim()) { setError('Por favor, completa los campos'); return; }

setError('');

onSave({
  name: name.trim(),
  phone: phone.trim(),
  avatar,
});

};

if (!isOpen) return null;

return ( <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-md p-4"> <div className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl p-5"> <button
onClick={onClose}
className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-100"
> <X size={18} /> </button>

<div className="mb-4 flex items-center gap-2">
      <Sparkles className="text-orange-500" size={18} />
      <h2 className="text-lg font-bold text-slate-800">
        Tu perfil Pollazo
      </h2>
    </div>

    <div className="mb-4 flex justify-center">
      <div className="relative">
        <img
          src={avatar}
          alt="avatar"
          className="h-20 w-20 rounded-3xl object-cover border-4 border-orange-500 shadow-lg"
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-2 -right-2 rounded-full bg-orange-500 p-2 text-white shadow-lg"
          disabled={isProcessing}
        >
          <Camera size={14} />
        </button>
      </div>
    </div>

    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileChange}
    />

    <div className="mb-3 grid grid-cols-4 gap-2">
      {DEFAULT_AVATARS.map((item, index) => (
        <button
          key={index}
          onClick={() => setAvatar(item)}
          className={`overflow-hidden rounded-2xl border-2 shadow-sm transition ${
            avatar === item
              ? 'border-orange-500 scale-95'
              : 'border-transparent'
          }`}
        >
          <img
            src={item}
            alt={`avatar-${index}`}
            className="h-14 w-full object-cover"
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
          className="h-12 w-full rounded-2xl bg-slate-100 pl-11 pr-4 outline-none ring-2 ring-transparent focus:ring-orange-500"
        />
      </div>

      <div className="relative">
        <Phone
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Tu WhatsApp"
          inputMode="numeric"
          className="h-12 w-full rounded-2xl bg-slate-100 pl-11 pr-4 outline-none ring-2 ring-transparent focus:ring-orange-500"
        />
      </div>
    </div>

    <div className="mt-4 min-h-[20px]">
      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>

    <button
      onClick={handleSave}
      className="mt-1 h-12 w-full rounded-2xl bg-orange-500 font-semibold text-white shadow-lg transition active:scale-95"
    >
      Guardar
    </button>
  </div>
</div>

); }
