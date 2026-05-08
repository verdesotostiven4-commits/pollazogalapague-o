import { Check, Camera } from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';

interface Props {
  selectedUrl: string;
  onSelect: (url: string) => void;
}

export default function AvatarSelector({ selectedUrl, onSelect }: Props) {
  return (
    <div className="space-y-6">
      {/* Visualización Principal Animada */}
      <div className="flex justify-center">
        <div className="relative group">
          <div className={`w-28 h-28 rounded-[35px] overflow-hidden border-4 transition-all duration-500 shadow-2xl ${selectedUrl ? 'border-orange-500 scale-105' : 'border-gray-100'}`}>
            {selectedUrl ? (
              <img src={selectedUrl} className="w-full h-full object-cover animate-in zoom-in duration-300" alt="Selected" />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                <Camera size={40} strokeWidth={1.5} />
              </div>
            )}
          </div>
          {selectedUrl && (
            <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-1.5 rounded-full shadow-lg border-4 border-white animate-bounce">
              <Check size={16} strokeWidth={4} />
            </div>
          )}
        </div>
      </div>

      {/* Grid de Selección con Entrada "Pin Pin" */}
      <div className="grid grid-cols-3 gap-4 px-2">
        {PRESET_AVATARS.map((avatar, index) => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.url)}
            className={`relative aspect-square rounded-[22px] overflow-hidden border-2 transition-all duration-300 active:scale-90 hover:shadow-md ${
              selectedUrl === avatar.url 
                ? 'border-orange-500 ring-4 ring-orange-100 scale-110 z-10' 
                : 'border-transparent opacity-80 hover:opacity-100'
            }`}
            style={{ 
              animation: `avatar-entry 0.6s ease-out ${index * 0.05}s both` 
            }}
          >
            <img src={avatar.url} className="w-full h-full object-cover" alt="Avatar option" />
            {selectedUrl === avatar.url && (
              <div className="absolute inset-0 bg-orange-500/10 backdrop-blur-[1px]" />
            )}
          </button>
        ))}
        
        {/* Botón Galería (Al final como comodín) */}
        <button className="aspect-square rounded-[22px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-1 hover:bg-gray-50 transition-colors animate-pulse">
           <Camera size={20} />
           <span className="text-[8px] font-black uppercase">Tu Foto</span>
        </button>
      </div>

      <style>{`
        @keyframes avatar-entry {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
