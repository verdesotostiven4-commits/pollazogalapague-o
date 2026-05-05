import { MessageCircle, Tag, Sparkles } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const WHATSAPP = '+593989795628';

export default function Promotions() {
  const { ref, visible } = useScrollReveal();

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP}?text=Hola%2C%20deseo%20consultar%20las%20ofertas%20del%20d%C3%ADa%20en%20Pollazo%20Galap%C3%A1gue%C3%B1o%20El%20Mirador.`,
      '_blank'
    );
  };

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-24 bg-gradient-to-br from-orange-500 to-amber-500 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_60%)]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-5 py-2 mb-8">
            <Sparkles size={14} className="text-white" />
            <span className="text-white font-bold text-sm">Actualizadas cada día</span>
          </div>

          <h2 className="text-5xl sm:text-6xl font-black text-white mb-6">
            Ofertas del{' '}
            <span className="text-amber-100">día</span>
          </h2>
          <p className="text-white/80 text-xl max-w-2xl mx-auto mb-12">
            Tenemos promociones especiales cada día. Consulta por WhatsApp para conocer los precios y ofertas de hoy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {['Pollos frescos', 'Cortes especiales', 'Productos del hogar'].map((item, i) => (
              <div
                key={item}
                className={`bg-white/20 border border-white/30 rounded-2xl p-6 transition-all duration-500 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: visible ? `${i * 100 + 200}ms` : '0ms' }}
              >
                <div className="w-12 h-12 bg-white/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Tag size={22} className="text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">{item}</h3>
                <p className="text-white/80 text-sm font-semibold">Precio del día</p>
              </div>
            ))}
          </div>

          <button
            onClick={openWhatsApp}
            className={`group inline-flex items-center gap-3 bg-white hover:bg-amber-50 text-orange-600 font-black px-10 py-5 rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl shadow-orange-700/30 text-lg ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: visible ? '500ms' : '0ms' }}
          >
            <MessageCircle size={22} className="group-hover:rotate-12 transition-transform" />
            Consultar ofertas
          </button>
        </div>
      </div>
    </section>
  );
}
