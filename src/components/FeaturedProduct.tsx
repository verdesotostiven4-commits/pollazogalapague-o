import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const WHATSAPP = '+593989795628';

const cuts = [
  'Pollo entero',
  'Pechuga',
  'Alas',
  'Cuartos',
  'Menudencia',
];

export default function FeaturedProduct() {
  const { ref, visible } = useScrollReveal();

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP}?text=Hola%2C%20deseo%20consultar%20el%20precio%20del%20pollo%20en%20Pollazo%20Galap%C3%A1gue%C3%B1o%20El%20Mirador.`,
      '_blank'
    );
  };

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-24 bg-white/60 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.06),transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
            <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Producto estrella</span>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mt-3 mb-6 leading-tight">
              Pollo fresco{' '}
              <span className="text-gradient-warm">todos los días</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Nuestro pollo es fresco y de primera calidad. Lo conseguimos cada mañana para que llegue a tu mesa con el mejor sabor. Disponible entero o por cortes al precio justo.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {cuts.map(cut => (
                <div key={cut} className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle2 size={16} className="text-orange-500 shrink-0" />
                  {cut}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={openWhatsApp}
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white font-black px-7 py-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl shadow-orange-500/30"
              >
                <MessageCircle size={20} />
                Consultar precio
              </button>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 bg-orange-50/80 border border-orange-200/60 rounded-xl px-4 py-3">
              <span className="text-green-600 font-bold text-sm">Precio por libra</span>
              <span className="text-gray-500 text-sm">— consulta disponibilidad diaria</span>
            </div>
          </div>

          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-500/15 rounded-3xl blur-2xl scale-110" />
              <div className="relative bg-white/80 border border-orange-200/60 rounded-3xl overflow-hidden aspect-square shadow-xl shadow-orange-100/60">
                <img
                  src="/WhatsApp_Image_2026-03-14_at_05.27.35.jpeg"
                  alt="Pollo fresco Pollazo Galapagueño"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-orange-200/60 rounded-2xl px-4 py-3">
                    <span className="text-2xl">🐔</span>
                    <div>
                      <div className="text-gray-900 font-bold text-sm">Pollo fresco del día</div>
                      <div className="text-orange-500 text-xs">Disponible todos los días</div>
                    </div>
                    <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-2xl p-4 shadow-2xl shadow-orange-500/40">
                <div className="text-white font-black text-xs uppercase tracking-wide">Fresco</div>
                <div className="text-white/80 text-xs">Cada día</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
