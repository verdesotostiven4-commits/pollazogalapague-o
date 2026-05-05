import { Zap, Star, Truck, ShoppingBag, MessageCircle, Sun } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const reasons = [
  {
    icon: Sun,
    title: 'Pollo fresco todos los días',
    desc: 'Recibimos pollo fresco cada día para garantizar la mejor calidad.',
    color: 'from-orange-400 to-amber-400',
  },
  {
    icon: Zap,
    title: 'Atención rápida',
    desc: 'Te atendemos con rapidez y amabilidad en todo momento.',
    color: 'from-yellow-400 to-orange-400',
  },
  {
    icon: Truck,
    title: 'Entrega a domicilio',
    desc: 'Llevamos tu pedido a casa en Puerto Ayora, Santa Rosa, Bellavista y Cascajo.',
    color: 'from-amber-500 to-yellow-400',
  },
  {
    icon: ShoppingBag,
    title: 'Productos básicos del hogar',
    desc: 'Todo lo que necesitas en un solo lugar: arroz, aceite, lácteos y más.',
    color: 'from-orange-500 to-amber-400',
  },
  {
    icon: MessageCircle,
    title: 'Pedidos fáciles por WhatsApp',
    desc: 'Haz tu pedido por WhatsApp en segundos, sin complicaciones.',
    color: 'from-yellow-500 to-orange-400',
  },
  {
    icon: Star,
    title: 'Calidad garantizada',
    desc: 'Años de experiencia sirviendo a la comunidad de Puerto Ayora.',
    color: 'from-amber-400 to-yellow-500',
  },
];

export default function TrustSection() {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-24 bg-amber-50/60 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.05),transparent_60%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Por qué elegirnos</span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mt-3 mb-4">
            Tu tienda de confianza en{' '}
            <span className="text-gradient-warm">Galápagos</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Nos esforzamos cada día para darte lo mejor en productos y servicio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`group relative bg-white/80 border border-orange-200/60 shadow-sm rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-orange-100/50 hover:-translate-y-2 transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: visible ? `${i * 80}ms` : '0ms' }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <r.icon size={26} className="text-white" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg mb-2">{r.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
