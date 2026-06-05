import { useState } from 'react';
import { ChevronDown, CreditCard, HelpCircle, MapPin, MessageCircle, PackageSearch, Star } from 'lucide-react';

const topics = [
  {
    id: 'pedido',
    icon: <PackageSearch size={20} />,
    title: 'Problemas con mi pedido',
    subtitle: 'Estado, cambios o entrega.',
    items: [
      ['Mi pedido no llegó', 'Revisa el estado del pedido. Si ya pasó mucho tiempo, contacta al local con tu nombre y código de pedido.'],
      ['Mi pedido llegó incompleto', 'Envía una foto de lo recibido y el código del pedido para que el local revise el caso.'],
    ],
  },
  {
    id: 'pagos',
    icon: <CreditCard size={20} />,
    title: 'Problemas con pagos',
    subtitle: 'Comprobantes y validación.',
    items: [
      ['Pagué pero sigue pendiente', 'Algunos pagos necesitan revisión manual. Ten listo tu comprobante y el código del pedido.'],
      ['Tengo una duda con mi pago', 'El local puede revisar el valor, método de pago y estado del pedido con una captura o referencia.'],
    ],
  },
  {
    id: 'entrega',
    icon: <MapPin size={20} />,
    title: 'Entrega y ubicación',
    subtitle: 'Dirección y referencias.',
    items: [
      ['No encuentran mi casa', 'Agrega una referencia clara: color de casa, entrada, calle, local cercano o punto conocido.'],
      ['Quiero cambiar mi ubicación', 'Guarda otra dirección desde Info y selecciónala antes de hacer tu pedido.'],
    ],
  },
  {
    id: 'plus',
    icon: <Star size={20} />,
    title: 'Pollazo Plus',
    subtitle: 'Membresía y beneficios.',
    items: [
      ['No se aplicó mi beneficio', 'Revisa que tu membresía esté activa y que el pedido esté dentro de cobertura.'],
      ['Quiero ver Pollazo Plus', 'Revisa la tarjeta de Pollazo Plus en esta misma pantalla.'],
    ],
  },
];

export default function InfoHelpCenter() {
  const [openTopic, setOpenTopic] = useState('pedido');
  const [openItem, setOpenItem] = useState('Mi pedido no llegó');

  return (
    <section className="bg-white rounded-[34px] border border-orange-50 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-orange-500 to-yellow-400 px-5 py-5 text-white">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-[22px] bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={24} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/75">Soporte local</p>
            <h3 className="text-xl font-black uppercase italic leading-none mt-1">Centro de ayuda</h3>
            <p className="text-[11px] font-bold text-white/80 leading-relaxed mt-2">Soluciones rápidas para pedidos, pagos y entregas.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {topics.map(topic => {
          const activeTopic = openTopic === topic.id;

          return (
            <div key={topic.id} className="rounded-[28px] border border-orange-100 bg-orange-50/50 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setOpenTopic(activeTopic ? '' : topic.id);
                  if (!activeTopic) setOpenItem(topic.items[0][0]);
                }}
                className="w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${activeTopic ? 'bg-orange-500 text-white' : 'bg-white text-orange-500 border border-orange-100'}`}>
                  {topic.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 uppercase leading-tight">{topic.title}</p>
                  <p className="text-[10px] font-bold text-gray-500 leading-relaxed mt-1">{topic.subtitle}</p>
                </div>
                <ChevronDown className={`text-orange-500 transition-transform ${activeTopic ? 'rotate-180' : ''}`} size={18} />
              </button>

              {activeTopic && (
                <div className="px-3 pb-3 space-y-2">
                  {topic.items.map(([title, text]) => {
                    const activeItem = openItem === title;

                    return (
                      <div key={title} className="rounded-[24px] bg-white border border-orange-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenItem(activeItem ? '' : title)}
                          className="w-full px-4 py-3 flex items-center gap-2 text-left active:bg-orange-50 transition-colors"
                        >
                          <span className="flex-1 text-[11px] font-black text-gray-900 uppercase leading-tight">{title}</span>
                          <ChevronDown className={`text-gray-300 transition-transform ${activeItem ? 'rotate-180' : ''}`} size={15} />
                        </button>

                        {activeItem && (
                          <div className="px-4 pb-4">
                            <p className="text-[11px] font-bold text-gray-500 leading-relaxed">{text}</p>
                            <div className="mt-3 rounded-[20px] bg-orange-50 border border-orange-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center justify-center gap-2">
                              <MessageCircle size={15} />
                              Escríbenos si necesitas ayuda
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
