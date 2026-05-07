import { Download, Globe, Sparkles } from 'lucide-react';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#f39763] text-center">
      
      {/* Contenedor del Logo Circular (Diseño Original) */}
      <div className="w-40 h-40 rounded-full border-[5px] border-[#a0522d] bg-[#fdf5e6] flex items-center justify-center mb-6 shadow-2xl">
        <img src="/logo-final.png" alt="Logo" className="w-28 h-28 object-contain" />
      </div>

      {/* Identidad de Ubicación */}
      <p className="text-[#8b4513] text-[13px] font-black uppercase tracking-[0.2em] mb-2">
        GALÁPAGOS • ECUADOR
      </p>

      {/* Título Principal */}
      <h1 className="text-5xl font-black text-[#1a1a1a] leading-none mb-4 italic uppercase">
        Pollazo <br /> <span className="text-[#1a1a1a]">El Mirador</span>
      </h1>

      {/* Descripción Corta */}
      <p className="text-[#8b4513] text-sm font-bold max-w-[280px] mb-12 leading-relaxed">
        Tu market con pollo fresco enfundado y productos esenciales.
      </p>

      {/* Botones de Acción */}
      <div className="w-full max-w-xs space-y-4">
        
        {/* BOTÓN INSTALAR: Blanco con texto naranja (como en la captura) */}
        {canInstall && (
          <button 
            onClick={onInstall}
            className="w-full py-5 bg-white text-[#f39763] font-black rounded-full shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <Download size={22} strokeWidth={3} />
            <span className="text-lg uppercase italic">Instalar App</span>
          </button>
        )}

        {/* BOTÓN CONTINUAR: Texto oscuro vinculado */}
        <button 
          onClick={onContinueWeb}
          className="w-full py-4 text-[#2d1a12] font-black uppercase tracking-widest text-sm hover:text-white transition-colors active:scale-95"
        >
          Explorar Catálogo
        </button>
      </div>

      {/* Decoración Final */}
      <div className="absolute bottom-10 flex items-center gap-2 text-[#2d1a12] opacity-30 text-[10px] font-black uppercase tracking-[0.3em]">
        <Sparkles size={12} />
        Premium Market
      </div>
    </div>
  );
}
