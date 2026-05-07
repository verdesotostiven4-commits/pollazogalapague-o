import { Download, Globe, Sparkles } from 'lucide-react';

interface Props {
  onInstall: () => void;
  canInstall: boolean;
  onContinueWeb: () => void;
}

export default function LandingPage({ onInstall, canInstall, onContinueWeb }: Props) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      {/* Logo y Header */}
      <div className="mb-12 animate-in zoom-in duration-700">
        <div className="w-24 h-24 bg-orange-500 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/20">
          <img src="/logo-final.png" alt="Logo" className="w-16 h-16 object-contain" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase italic leading-none tracking-tighter">
          La Casa del <span className="text-orange-500">Pollazo</span>
        </h1>
        <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Puerto Ayora - Galápagos</p>
      </div>

      {/* Botones de Acción */}
      <div className="w-full max-w-xs space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
        
        {/* Este botón SIEMPRE debe verse para que no se traben en la web */}
        <button 
          onClick={onContinueWeb}
          className="w-full py-5 bg-white/10 hover:bg-white/15 text-white font-black rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/10"
        >
          <Globe size={20} className="text-orange-500" />
          <span className="uppercase italic text-sm">Continuar en la Web</span>
        </button>

        {/* El de instalar solo se habilita si el navegador lo permite, pero puedes mostrarlo igual con opacidad */}
        {canInstall && (
          <button 
            onClick={onInstall}
            className="w-full py-5 bg-orange-500 text-white font-black rounded-[24px] flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
          >
            <Download size={20} />
            <span className="uppercase italic text-sm">Instalar Aplicación</span>
          </button>
        )}
      </div>

      <div className="mt-12 flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
        <Sparkles size={12} className="text-orange-500" />
        Experiencia Premium
      </div>
    </div>
  );
}
