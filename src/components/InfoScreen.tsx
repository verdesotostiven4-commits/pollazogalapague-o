import { Info, MapPin, Phone, Instagram, Clock, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function InfoScreen() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen pb-24">
      {/* CABECERA DE INFO */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-orange-50 mb-6">
        <div className="w-16 h-16 bg-orange-500 text-white rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-orange-100">
          <Info size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 uppercase italic leading-none mb-2 tracking-tighter">Información</h1>
        <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Sobre La Casa del Pollazo</p>
      </div>

      {/* TARJETAS DE DATOS */}
      <div className="grid gap-4">
        {/* Ubicación */}
        <div className="bg-white p-6 rounded-[28px] flex items-center gap-5 border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none tracking-widest">Ubicación</p>
            <p className="text-sm font-black text-gray-900 mt-1.5">Puerto Ayora, Galápagos</p>
            <p className="text-[11px] font-bold text-gray-500">Barrio El Mirador</p>
          </div>
        </div>

        {/* Horario */}
        <div className="bg-white p-6 rounded-[28px] flex items-center gap-5 border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none tracking-widest">Atención</p>
            <p className="text-sm font-black text-gray-900 mt-1.5">7:00 AM - 9:00 PM</p>
            <p className="text-[11px] font-bold text-gray-500">Lunes a Domingo</p>
          </div>
        </div>

        {/* Garantía */}
        <div className="bg-white p-6 rounded-[28px] flex items-center gap-5 border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none tracking-widest">Garantía</p>
            <p className="text-sm font-black text-gray-900 mt-1.5">Frescura Total</p>
            <p className="text-[11px] font-bold text-gray-500">Productos seleccionados hoy</p>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white p-6 rounded-[28px] flex items-center gap-5 border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none tracking-widest">Servicio</p>
            <p className="text-sm font-black text-gray-900 mt-1.5">Entrega a Domicilio</p>
            <p className="text-[11px] font-bold text-gray-500">Rápido y Seguro</p>
          </div>
        </div>
      </div>

      {/* FOOTER DE APP */}
      <div className="mt-12 text-center space-y-2">
        <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.3em]">Pollazo App v2.0.4</p>
        <p className="text-[9px] text-gray-400 font-bold uppercase italic">Desarrollado con Elegancia Tecnológica</p>
      </div>
    </div>
  );
}
