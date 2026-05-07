import { ArrowDownToLine } from 'lucide-react';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#f39763] text-center">
      
      {/* Contenedor del Logo Circular */}
      <div className="w-40 h-40 rounded-full border-[5px] border-[#a0522d] bg-[#fdf5e6] flex items-center justify-center mb-6 shadow-xl">
        <img src="/logo-final.png" alt="Logo" className="w-28 h-28 object-contain" />
      </div>

      {/* Identidad */}
      <p className="text-[#8b4513] text-[13px] font-black uppercase tracking-[0.2em] mb-2">
        GALÁPAGOS • ECUADOR
      </p>

      <h1 className="text-5xl font-black text-[#1a1a1a] leading-none mb-4 italic uppercase">
        Pollazo <br /> <span className="text-[#1a1a1a]">El Mirador</span>
      </h1>

      <p className="text-[#8b4513] text-sm font-bold max-w-[280px] mb-12 leading-relaxed">
        Tu market con pollo fresco enfundado y productos esenciales.
      </p>

      {/* Botón Instalar (Solo si el navegador da el permiso) */}
      {canInstall ? (
        <button 
          onClick={onInstall}
          className="flex items-center gap-3 px-10 py-5 bg-white text-[#f39763] font-black rounded-full shadow-2xl shadow-black/20 active:scale-95 transition-all mb-6"
        >
          <ArrowDownToLine size={24} strokeWidth={3} />
          <span className="text-lg uppercase">Instalar App</span>
        </button>
      ) : (
        /* Si ya está instalada o no puede instalarse, mostramos un aviso sutil o nada */
        <div className="h-[76px]" /> 
      )}

      {/* Enlace para continuar */}
      <button 
        onClick={onContinueWeb}
        className="text-[#2d1a12] text-sm font-black uppercase tracking-widest hover:text-white transition-colors active:scale-95"
      >
        Explorar Catálogo
      </button>

      {/* Decoración inferior */}
      <div className="absolute bottom-8 opacity-20 text-[#2d1a12] font-black text-[10px] tracking-[0.5em] uppercase">
        Premium Market
      </div>
    </div>
  );
}
