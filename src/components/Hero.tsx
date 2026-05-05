import { MessageCircle, BookOpen, Clock, Truck } from 'lucide-react';

const WHATSAPP = '+593989795628';

const infoCards = [
  { icon: Clock, label: 'Abierto todos los días', sub: '7:00 AM – 8/9 PM' },
  { icon: Truck, label: 'Delivery disponible', sub: 'Puerto Ayora y más' },
  { icon: MessageCircle, label: 'Pedidos por WhatsApp', sub: 'Rápido y fácil' },
];

export default function Hero() {
  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20Pollazo%20Galap%C3%A1gue%C3%B1o%20El%20Mirador.`,
      '_blank'
    );
  };

  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),transparent_60%)]" />

      <div className="absolute top-[18%] left-[10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-[20%] right-[8%] w-80 h-80 bg-yellow-200/20 rounded-full blur-3xl animate-blob-2" />
      <div className="absolute top-[55%] left-[45%] w-48 h-48 bg-orange-300/15 rounded-full blur-2xl animate-blob animation-delay-4000" />

      <div className="absolute top-[22%] right-[15%] w-6 h-6 rounded-full bg-white/25 animate-float" />
      <div className="absolute bottom-[28%] left-[10%] w-4 h-4 rounded-full bg-yellow-100/40 animate-float-gen" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-[45%] left-[6%] w-5 h-5 rounded-xl bg-white/15 animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-[38%] right-[10%] w-8 h-8 rounded-2xl bg-amber-200/20 animate-float-gen" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto pt-24 pb-24">
        <div className="inline-flex items-center gap-2 bg-black/15 backdrop-blur-sm border border-white/30 rounded-full px-5 py-2 mb-8 text-sm text-white font-semibold animate-fade-in-down">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Puerto Ayora, Santa Cruz Island, Galápagos
        </div>

        <div className="flex justify-center mb-7 animate-fade-in-down animation-delay-100">
          <div className="relative inline-flex" style={{ animation: 'logofloat 3s ease-in-out infinite' }}>
            <div className="absolute inset-0 -z-10 blur-3xl scale-110" style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.55) 0%, rgba(234,88,12,0.25) 60%, transparent 100%)' }} />
            <img
              src="/logo-final.png"
              alt="Pollazo Galapagueño El Mirador"
              className="w-48 sm:w-56 md:w-64 h-auto"
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 24px rgba(234,88,12,0.5)) drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
              }}
            />
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-3 animate-fade-in-up animation-delay-200 drop-shadow-lg">
          Pollazo{' '}
          <span className="text-amber-900/80">Galapagueño</span>
        </h1>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/90 mb-6 animate-fade-in-up animation-delay-300 drop-shadow-md">
          El Mirador
        </h2>

        <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-400 font-medium drop-shadow">
          Pollos frescos y productos de tienda para tu hogar en Puerto Ayora.
          <br className="hidden sm:block" />
          Calidad y frescura en cada pedido.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14 animate-fade-in-up animation-delay-600">
          <a
            href="#catalog"
            className="group flex items-center justify-center gap-3 bg-white/20 backdrop-blur-sm border-2 border-white/50 hover:bg-white/30 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 text-lg shadow-lg"
          >
            <BookOpen size={22} className="group-hover:rotate-12 transition-transform" />
            Ver Catálogo
          </a>
          <button
            onClick={openWhatsApp}
            className="group flex items-center justify-center gap-3 bg-white hover:bg-amber-50 text-orange-600 font-black px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl shadow-orange-600/20 text-lg"
          >
            <MessageCircle size={22} className="group-hover:rotate-12 transition-transform" />
            Pedir por WhatsApp
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto animate-fade-in-up animation-delay-800">
          {infoCards.map(({ icon: Icon, label, sub }, i) => (
            <div
              key={label}
              className="group flex flex-col items-center gap-2 bg-black/20 backdrop-blur-md border border-white/25 rounded-2xl p-5 hover:bg-black/30 hover:border-white/40 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              <div className="w-12 h-12 bg-white/25 border border-white/40 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-white/35 transition-all duration-300">
                <Icon size={22} className="text-white" />
              </div>
              <div className="text-white font-bold text-sm drop-shadow">{label}</div>
              <div className="text-white/80 text-xs">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 animate-bounce pointer-events-none">
        <span className="text-xs tracking-widest uppercase font-medium">Explorar</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent" />
      </div>
    </section>
  );
}
