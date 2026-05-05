import { MapPin, Truck } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const areas = [
  {
    name: 'Puerto Ayora',
    image: '/attractive_3720.jpg',
    desc: 'Ciudad principal de Santa Cruz',
  },
];

export default function DeliveryAreas() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="delivery" ref={ref as React.RefObject<HTMLElement>} className="py-24 bg-neutral-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(249,115,22,0.07),transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">Cobertura de entrega</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">
            Zonas de{' '}
            <span className="text-gradient-warm">delivery</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto text-lg">
            Llevamos tu pedido directamente a la puerta de tu casa en estas zonas.
          </p>
        </div>

        <div className="flex justify-center">
          {areas.map((area, i) => (
            <div
              key={area.name}
              className={`group relative bg-white/[0.05] border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.09] hover:border-orange-500/30 hover:-translate-y-2 transition-all duration-400 w-full max-w-sm ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: visible ? `${i * 100}ms` : '0ms' }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={area.image}
                  alt={area.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute top-3 right-3 bg-orange-500 rounded-xl p-2 shadow-lg">
                  <Truck size={14} className="text-white" />
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} className="text-orange-400" />
                  <h3 className="text-white font-bold text-lg">{area.name}</h3>
                </div>
                <p className="text-white/50 text-sm">{area.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-12 text-center transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-2xl px-8 py-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/60 text-sm">
              Servicio de delivery disponible todos los días
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
