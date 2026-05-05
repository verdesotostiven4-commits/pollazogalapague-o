import { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const WHATSAPP = '+593989795628';

const faqs = [
  {
    q: '¿Hacen delivery a domicilio?',
    a: 'Sí, hacemos delivery a Puerto Ayora, Santa Rosa, Bellavista y Cascajo. Contáctanos por WhatsApp para coordinar la entrega a tu dirección.',
  },
  {
    q: '¿A qué hora están abiertos?',
    a: 'Abrimos todos los días desde las 7:00 AM hasta aproximadamente las 8:00 o 9:00 PM. ¡Sin descanso para servirte mejor!',
  },
  {
    q: '¿Cómo hago un pedido?',
    a: 'Puedes agregar productos al carrito desde nuestra web y enviarnos el pedido directo por WhatsApp, o escribirnos directamente al +593 989 795 628 con tu lista de productos.',
  },
  {
    q: '¿El pollo es fresco todos los días?',
    a: 'Sí, recibimos pollo fresco diariamente para garantizar la mejor calidad y sabor en cada compra.',
  },
  {
    q: '¿Venden el pollo por libras?',
    a: 'Sí, el pollo se vende por libra, tanto entero como por cortes. Consulta el precio del día por WhatsApp.',
  },
  {
    q: '¿Venden productos del hogar además de pollo?',
    a: 'Sí, tenemos arroz, aceite, azúcar, leche, gaseosas, agua, papel higiénico, detergente y más productos básicos para tu hogar.',
  },
  {
    q: '¿Dónde están ubicados?',
    a: 'Estamos en El Mirador, Calle Delfín, Puerto Ayora, Santa Cruz Island, Galápagos. La referencia es "La casa del Pollazo".',
  },
];

export default function FAQ() {
  const { ref, visible } = useScrollReveal();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-24 bg-amber-50/50 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(251,146,60,0.06),transparent_50%)]" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Preguntas frecuentes</span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mt-3 mb-4">
            Resolvemos tus{' '}
            <span className="text-gradient-warm">dudas</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`bg-white/80 border rounded-2xl overflow-hidden transition-all duration-500 ${
                open === i ? 'border-orange-400 bg-white shadow-md shadow-orange-100/60' : 'border-orange-200/60 hover:border-amber-300'
              } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: visible ? `${i * 60}ms` : '0ms' }}
            >
              <button
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-gray-900 font-semibold text-sm sm:text-base">{faq.q}</span>
                <ChevronDown
                  size={20}
                  className={`text-orange-500 shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-40' : 'max-h-0'}`}>
                <p className="text-gray-600 text-sm leading-relaxed px-5 pb-5">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`text-center mt-12 transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-gray-500 mb-4 text-sm">¿Tienes más preguntas?</p>
          <a
            href={`https://wa.me/${WHATSAPP}?text=Hola%2C%20tengo%20una%20consulta%20sobre%20Pollazo%20Galap%C3%A1gue%C3%B1o%20El%20Mirador.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white border border-orange-200 hover:bg-orange-50 hover:border-orange-400 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-sm"
          >
            <MessageCircle size={18} className="text-orange-500" />
            Pregúntanos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
