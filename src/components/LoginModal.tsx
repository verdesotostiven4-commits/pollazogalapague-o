import { useState, useRef, useEffect } from 'react';
import { Camera, Phone, User, X, Sparkles, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userData: { name: string; whatsapp: string; avatarUrl: string }) => void;
}

const AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophie&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=b6e3f4' 
];

// 🛠️ TRITURADOR NATIVO: Aplasta la foto a 96x96 para que no pese nada
const compressImageNative = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_SIZE = 96; // Tamaño ultra ligero
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        // Exportamos a JPG con calidad 0.7 para que sea un Base64 enano
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const { customerName, customerPhone, customerAvatar } = useUser();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false); // ✅ Ruedita de carga
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(customerName || '');
      setWhatsapp(customerPhone || '');
      if (customerAvatar) {
        if (customerAvatar.startsWith('data:image')) {
          setUploadedImage(customerAvatar);
          setSelectedAvatar(customerAvatar);
        } else {
          setSelectedAvatar(customerAvatar);
          setUploadedImage(null);
        }
      }
    }
  }, [isOpen, customerName, customerPhone, customerAvatar]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files : null; 
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    setIsCompressing(true);

    try {
      // Pasamos la foto por el triturador nativo
      const base64data = await compressImageNative(file);
      setUploadedImage(base64data);
      setSelectedAvatar(base64data);
      setIsCompressing(false);
    } catch (error) {
      console.error('Error al procesar la foto:', error);
      alert('Hubo un error con esa foto. Intenta con otra.');
      setIsCompressing(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !whatsapp.trim()) {
      alert('Por favor completa tus datos.');
      return;
    }
    onLogin({ name, whatsapp, avatarUrl: selectedAvatar });
    onClose(); 
  };

  return (
    /* ✅ FIX: z- agregado para que el modal no se deje aplastar por el catálogo */
    <div className="fixed inset-0 z- flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
        <button type="button" onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90">
          <X size={20} />
        </button>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase italic">Únete al Club</h2>
          <p className="text-sm font-bold text-gray-400 mt-2">Acumula puntos y gana premios</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500 text-gray-900" />
          </div>
          <div className="relative">
            <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500 text-gray-900" />
          </div>
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mt-8 mb-4 text-center">Avatar o Foto de Galería</p>
        
        <div className="grid grid-cols-4 gap-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} className={`relative aspect-square rounded-2xl flex items-center justify-center border-2 transition-all ${uploadedImage ? 'border-orange-500' : 'border-dashed border-gray-200 bg-gray-50'}`}>
            {/* ✅ Spinner de carga si la foto se está triturando */}
            {isCompressing ? (
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            ) : uploadedImage ? (
              <img src={uploadedImage} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Camera size={20} className="text-gray-400" />
            )}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          
          {AVATARS.map((avatar, idx) => (
            <button key={idx} type="button" onClick={() => { setSelectedAvatar(avatar); setUploadedImage(null); }} className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedAvatar === avatar && !uploadedImage ? 'border-orange-500 scale-105 shadow-lg' : 'border-transparent opacity-60'}`}>
              <img src={avatar} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        <button 
          type="button" 
          onClick={handleSave} 
          disabled={isCompressing}
          className="mt-8 w-full py-5 bg-orange-500 text-white font-black rounded-[28px] shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
        >
          {isCompressing ? 'Procesando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
