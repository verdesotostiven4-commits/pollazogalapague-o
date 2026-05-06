import { useState, useRef } from 'react';
import { Camera, Phone, User, X, Check, Image as ImageIcon, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userData: { name: string; whatsapp: string; avatarUrl: string }) => void;
}

// 6 Avatares divertidos y únicos de DiceBear (estilo adventurer)
const AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophie&backgroundColor=c0aede',
];

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Manejar subida de foto local
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.;
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      setSelectedAvatar(imageUrl); // Usamos la foto subida como avatar
    }
  };

  const handleSave = () => {
    if (name.trim() === '' || whatsapp.trim() === '') {
      alert('Por favor llena tu nombre y WhatsApp para continuar.');
      return;
    }
    // Pasamos los datos al componente padre
    onLogin({
      name,
      whatsapp,
      avatarUrl: selectedAvatar
    });
  };

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Contenedor Principal del Modal con animación */}
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

        {/* Botón Cerrar */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 w-10 h-10 bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full flex items-center justify-center transition-transform active:scale-90"
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div className="text-center mb-6 mt-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Únete al Club</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">Acumula puntos y gana con tus compras.</p>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          {/* Input Nombre */}
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

          {/* Input WhatsApp */}
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

        {/* Sección de Avatares */}
        <div className="mt-6 mb-2">
          <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-3 text-center">
            Elige tu Avatar o Sube Foto
          </p>
          
          <div className="grid grid-cols-4 gap-3">
            {/* Botón para subir foto local */}
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

            {/* Renderizar los 6 avatares (Solo mostramos 3 en la primera fila para completar los 4 espacios, y los otros 3 abajo) */}
            {AVATARS.map((avatar, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedAvatar(avatar);
                  setUploadedImage(null); // Resetea la foto subida si elige un avatar
                }}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${
                  selectedAvatar === avatar ? 'border-orange-500 shadow-lg scale-105 z-10' : 'border-transparent hover:scale-105'
                }`}
              >
                <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover bg-gray-100" />
                {selectedAvatar === avatar && (
                  <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-0.5 shadow-sm">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Acción */}
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
