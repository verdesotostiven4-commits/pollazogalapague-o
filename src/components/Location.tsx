import { MapPin, ExternalLink, Clock, Phone } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const MAPS_URL = 'https://maps.app.goo.gl/uM7jPvwGxzyUeeJYA';
const WHATSAPP = '+593989795628';

export default function Location() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="location" ref={ref as React.RefObject<HTMLElement>} className="py-24 bg-white/60 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.07),transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Encuéntranos</span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mt-3 mb-4">
            Nuestra{' '}
            <span className="text-gradient-warm">ubicación</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className={`space-y-6 transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="bg-white/80 border border-orange-200/60 shadow-sm rounded-2xl p-6 space-y-5">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <MapPin size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold mb-1">Dirección</h3>
                  <p className="text-gray-600 text-sm">El Mirador, Calle Delfín</p>
                  <p className="text-gray-600 text-sm">Puerto Ayora, Santa Cruz Island, Galápagos</p>
                  <p className="text-orange-500 text-xs mt-1 font-medium">Ref: La casa del Pollazo</p>
                </div>
              </div>

              <div className="h-px bg-orange-100" />

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <Clock size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold mb-1">Horario de atención</h3>
                  <p className="text-gray-600 text-sm">Todos los días</p>
                  <p className="text-gray-900 font-semibold text-sm">7:00 AM – 8:00 / 9:00 PM</p>
                </div>
              </div>

              <div className="h-px bg-orange-100" />

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <Phone size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold mb-1">Contacto WhatsApp</h3>
                  <a
                    href={`https://wa.me/${WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 font-bold hover:text-orange-600 transition-colors"
                  >
                    +593 989 795 628
                  </a>
                </div>
              </div>
            </div>

            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white font-black px-7 py-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl shadow-orange-500/30 w-full"
            >
              <ExternalLink size={20} />
              Abrir en Google Maps
            </a>
          </div>

          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="relative rounded-2xl overflow-hidden border-2 border-orange-200 shadow-xl shadow-orange-100/60 aspect-[4/3] bg-gradient-to-br from-orange-100 to-amber-100 flex flex-col items-center justify-center gap-6 p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center shadow-2xl shadow-orange-300/60">
                  <MapPin size={40} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-gray-900 font-black text-lg leading-snug">El Mirador, Calle Delfín</p>
                  <p className="text-gray-600 text-sm mt-1">Puerto Ayora, Galápagos</p>
                </div>
                <div className="flex items-center gap-2 bg-white/80 border border-orange-200 rounded-xl px-4 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-gray-600 text-sm font-medium">Abierto todos los días</span>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-xs text-center mt-3">El Mirador, Calle Delfín – Puerto Ayora, Santa Cruz, Galápagos</p>
          </div>
        </div>
      </div>
    </section>
  );
}
