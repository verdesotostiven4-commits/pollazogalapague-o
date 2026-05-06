import { useState, useRef } from 'react';
import { Camera, Phone, User, X, Check, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userData: { name: string; whatsapp: string; avatarUrl: string }) => void;
}

const AVATARS = Array.of(
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophie&backgroundColor=c0aede'
);

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS.at(0) as string);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    const file = filesList ? filesList.item(0) : null;
    
    if (file) {
      // MAGIA: Comprimir la imagen y convertirla en texto (Base64) para que viaje a Supabase
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 150; // Tamaño pequeño para que no pese
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setUploadedImage(dataUrl);
          setSelectedAvatar(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (name.trim() === '' || whatsapp.trim() === '') {
      alert('Por favor llena tu nombre y WhatsApp para continuar.');
      return;
    }
    onLogin({
      name,
      whatsapp,
      avatarUrl: selectedAvatar
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-white rounded-[36px] p-6 shadow-2xl relative flex flex-col"
        style={{ animation: 'modalFadeIn 0.3s ease-out' }}
      >
        <style>
          {`
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}
        </style>

        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 w-10 h-10 bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full flex items-center justify-center transition-transform active:scale-90"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6 mt-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Únete al Club</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">Acumula puntos y gana con tus compras.</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tu Nombre o Apodo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone size={20} className="text-gray-400" />
            </div>
            <input
              type="tel"
              placeholder="Número de WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>
        </div>

        <div className="mt-6 mb-2">
          <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-3 text-center">
            Elige tu Avatar o Sube Foto
          </p>
          
          <div className="grid grid-cols-4 gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 overflow-hidden ${
                uploadedImage === selectedAvatar ? 'border-orange-500 shadow-md' : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="Tu foto" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera size={24} className="text-gray-400 mb-1" />
                  <span className="text-[10px] font-bold text-gray-400">Foto</span>
                </>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {AVATARS.map((avatar, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedAvatar(avatar);
                  setUploadedImage(null);
                }}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${
                  selectedAvatar === avatar ? 'border-orange-500 shadow-lg scale-105 z-10' : 'border-transparent hover:scale-105'
                }`}
              >
                <img src={avatar} alt={`Avatar`} className="w-full h-full object-cover bg-gray-100" />
                {selectedAvatar === avatar && (
                  <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-0.5 shadow-sm">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="mt-6 w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-colors active:scale-95 flex items-center justify-center gap-2"
        >
          Guardar y Continuar
        </button>
      </div>
    </div>
  );
}
