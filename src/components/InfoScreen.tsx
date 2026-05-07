import { Info, MapPin, Phone, Instagram, Clock, ShieldCheck } from 'lucide-react';

export default function InfoScreen() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-orange-50 mb-6">
        <div className="w-16 h-16 bg-orange-500 text-white rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-orange-100">
          <Info size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 uppercase italic leading-none mb-2">Información</h1>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Sobre La Casa del Pollazo</p>
      </div>

      <div className="grid gap-4">
        <div className="bg-white p-6 rounded-[24px] flex items-center gap-4 border border-gray-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><MapPin size={24}/></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Ubicación</p>
            <p className="text-sm font-black text-gray-900 mt-1">Puerto Ayora, Galápagos</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] flex items-center gap-4 border border-gray-100">
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center"><Clock size={24}/></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Horario de Atención</p>
            <p className="text-sm font-black text-gray-900 mt-1">7:00 AM - 9:00 PM</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] flex items-center gap-4 border border-gray-100">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center"><ShieldCheck size={24}/></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Calidad Garantizada</p>
            <p className="text-sm font-black text-gray-900 mt-1">Productos frescos cada día</p>
          </div>
        </div>
      </div>
      
      <p className="text-center text-[9px] text-gray-300 font-black uppercase mt-10 tracking-[0.2em]">Versión 2.0.4 - Pollazo El Mirador</p>
    </div>
  );
}
