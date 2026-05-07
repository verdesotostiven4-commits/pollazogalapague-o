import { ArrowDownToLine, MapPin } from 'lucide-react'; // Usamos este icono de descarga

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  return (
    // Pantalla completa, flex en columna, todo centrado, fondo melocotón/naranja
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#f39763]">
      
      {/* Elemento del logo - Recreando el diseño circular complejo del logo con tu 'logo-final.png' */}
      <div className="w-36 h-36 rounded-full border-4 border-[#b15f3e] bg-[#f8e8cd] flex items-center justify-center mb-6">
        {/* El usuario mencionó logo-final.png en el contexto anterior. Usaré ese nombre. */}
        <img src="/logo-final.png" alt="Logo" className="w-28 h-28 object-contain" />
      </div>

      {/* Texto GALÁPAGOS • ECUADOR */}
      <p className="text-[#964a27] text-sm font-bold uppercase tracking-wider mb-2">GALÁPAGOS • ECUADOR</p>

      {/* Título principal: Pollazo El Mirador */}
      <h1 className="text-5xl font-black text-gray-950 leading-none mb-4">Pollazo El Mirador</h1>

      {/* Sub-descripción: smaller, lighter centered text */}
      <p className="text-[#a15532] text-sm max-w-sm text-center mb-10 leading-relaxed">
        Tu market con pollo fresco enfundado y productos esenciales.
      </p>

      {/* Botón "Instalar App" - Botón grande, blanco, con icono y texto, que conecta a la prop onInstall */}
      {canInstall && (
        <button 
          onClick={onInstall}
          className="flex items-center gap-3 px-10 py-4.5 bg-white text-[#d2754c] font-black rounded-full shadow-lg shadow-black/10 active:scale-95 transition-all mb-4"
        >
          <ArrowDownToLine size={24} className="text-[#d2754c]" />
          <span className="text-base">Instalar App</span>
        </button>
      )}

      {/* Texto vinculado "Explorar Catálogo" - Acts as 'onContinueWeb' */}
      <button 
        onClick={onContinueWeb}
        className="text-[#3c1e11] text-sm font-semibold hover:text-white active:scale-95 transition-colors"
      >
        Explorar Catálogo
      </button>
    </div>
  );
}
