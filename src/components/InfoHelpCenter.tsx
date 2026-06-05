import { useState } from 'react';
import {
  ChevronDown,
  CreditCard,
  HelpCircle,
  MapPin,
  MessageCircle,
  PackageSearch,
  Search,
  Star,
  X,
} from 'lucide-react';

const WHATSAPP = '593989795628';

type HelpAction = 'whatsapp' | 'orders' | 'location' | 'plus';

type HelpItem = {
  title: string;
  text: string;
  actionLabel: string;
  action: HelpAction;
};

type HelpTopic = {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: HelpItem[];
};

const topics: HelpTopic[] = [
  {
    id: 'pedido',
    icon: <PackageSearch size={20} />,
    title: 'Problemas con mi pedido',
    subtitle: 'Estado, demora, cambios o pedido incompleto.',
    items: [
      {
        title: 'Mi pedido no llegó',
        text: 'Revisa el estado del pedido. Si está enviado y ya pasó mucho tiempo, escribe al local con tu nombre y código de pedido para revisar con el repartidor.',
        actionLabel: 'Ver mis pedidos',
        action: 'orders',
      },
      {
        title: 'Mi pedido llegó incompleto',
        text: 'Toma una foto de lo recibido y envía el código del pedido. El local revisará si corresponde completar el producto, corregir el cobro o coordinar una solución.',
        actionLabel: 'Reportar por WhatsApp',
        action: 'whatsapp',
      },
      {
        title: 'Quiero cambiar o cancelar mi pedido',
        text: 'Si aún no está en preparación o enviado, se puede intentar cambiar. Si ya está avanzado, depende del tiempo, disponibilidad y coordinación del local.',
        actionLabel: 'Escribir al local',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'pagos',
    icon: <CreditCard size={20} />,
    title: 'Problemas con pagos',
    subtitle: 'Comprobantes, Deuna, transferencia o validación.',
    items: [
      {
        title: 'Pagué pero sigue pendiente',
        text: 'Algunos pagos necesitan revisión manual. Ten listo tu comprobante, valor pagado y código del pedido para validar más rápido.',
        actionLabel: 'Enviar comprobante',
        action: 'whatsapp',
      },
      {
        title: 'Me equivoqué en el comprobante',
        text: 'Envía el comprobante correcto y explica el error. Si el pedido aún no se prepara, el local puede corregir la validación.',
        actionLabel: 'Corregir comprobante',
        action: 'whatsapp',
      },
      {
        title: 'Creo que me cobraron mal',
        text: 'Envía captura del movimiento o recibo. El local revisará monto, método de pago, productos y delivery aplicado.',
        actionLabel: 'Consultar pago',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'entrega',
    icon: <MapPin size={20} />,
    title: 'Entrega y ubicación',
    subtitle: 'Dirección, referencia, cobertura y repartidor.',
    items: [
      {
        title: 'No encuentran mi casa',
        text: 'Agrega una referencia clara: color de casa, entrada, calle, local cercano o punto conocido. En la isla una buena referencia evita demoras.',
        actionLabel: 'Editar ubicación',
        action: 'location',
      },
      {
        title: 'Quiero cambiar mi ubicación',
        text: 'Guarda otra dirección desde Info y selecciónala antes de hacer el pedido. Si el pedido ya fue enviado, consulta por WhatsApp.',
        actionLabel: 'Cambiar ubicación',
        action: 'location',
      },
      {
        title: '¿Llegan a mi zona?',
        text: 'Algunas zonas pueden requerir confirmación por distancia, horario, clima o disponibilidad de reparto.',
        actionLabel: 'Consultar cobertura',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'plus',
    icon: <Star size={20} />,
    title: 'Pollazo Plus',
    subtitle: 'Membresía, beneficios y delivery.',
    items: [
      {
        title: 'No se aplicó mi beneficio',
        text: 'Revisa que tu membresía esté activa y que el pedido esté dentro de cobertura. Si algo no cuadra, el local puede revisar manualmente.',
        actionLabel: 'Consultar Plus',
        action: 'whatsapp',
      },
      {
        title: 'Quiero ver Pollazo Plus',
        text: 'Puedes revisar la tarjeta de Pollazo Plus en Info para ver beneficios activos y detalles de la membresía.',
        actionLabel: 'Ver Plus',
        action: 'plus',
      },
    ],
  },
];

function buildWhatsApp(topic: string, item: string) {
  const message = `Hola, necesito ayuda con ${topic}: ${item}`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function clickByText(words: string[]) {
  const buttons = Array.from(document.querySelectorAll('button, a')) as HTMLElement[];
  const found = buttons.find(button => {
    const text = (button.innerText || '').toLowerCase();
    return words.some(word => text.includes(word));
  });

  found?.click();
  return Boolean(found);
}

export default function InfoHelpCenter() {
  const [open, setOpen] = useState(false);
  const [openTopic, setOpenTopic] = useState('pedido');
  const [openItem, setOpenItem] = useState('Mi pedido no llegó');

  const runAction = (topic: HelpTopic, item: HelpItem) => {
    if (item.action === 'orders') {
      setOpen(false);
      window.setTimeout(() => {
        if (!clickByText(['pedidos', 'orders'])) {
          window.open(buildWhatsApp(topic.title, item.title), '_blank');
        }
      }, 80);
      return;
    }

    if (item.action === 'location') {
      setOpen(false);
      window.setTimeout(() => {
        if (!clickByText(['agregar nueva', 'cambiar ubicación', 'editar ubicación', 'add new'])) {
          window.open(buildWhatsApp(topic.title, item.title), '_blank');
        }
      }, 80);
      return;
    }

    if (item.action === 'plus') {
      setOpen(false);
      window.setTimeout(() => {
        if (!clickByText(['pollazo plus', 'plus'])) {
          window.open(buildWhatsApp(topic.title, item.title), '_blank');
        }
      }, 80);
      return;
    }

    window.open(buildWhatsApp(topic.title, item.title), '_blank');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className="w-12 h-12 rounded-[22px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-100 flex-shrink-0">
          <HelpCircle size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.22em]">Soporte local</p>
          <h3 className="text-base font-black text-gray-950 uppercase italic leading-none mt-1">Centro de ayuda</h3>
          <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">Pedidos, pagos, entregas y Pollazo Plus.</p>
        </div>

        <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
          <Search size={18} />
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[13090] flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar centro de ayuda"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-orange-950/25"
          />

          <section className="relative w-full max-w-md max-h-[86dvh] bg-white rounded-t-[38px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300 flex flex-col">
            <header className="flex-shrink-0 bg-gradient-to-br from-orange-500 to-yellow-400 px-5 pt-5 pb-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-[22px] bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
                    <HelpCircle size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/75">Soporte local</p>
                    <h3 className="text-xl font-black uppercase italic leading-none mt-1">Centro de ayuda</h3>
                    <p className="text-[11px] font-bold text-white/80 leading-relaxed mt-2">Respuestas rápidas y acciones útiles.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-orange-50/40">
              {topics.map(topic => {
                const activeTopic = openTopic === topic.id;

                return (
                  <div key={topic.id} className="rounded-[28px] border border-orange-100 bg-white overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenTopic(activeTopic ? '' : topic.id);
                        if (!activeTopic) setOpenItem(topic.items[0]?.title || '');
                      }}
                      className="w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${activeTopic ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}>
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
                        {topic.items.map(item => {
                          const activeItem = openItem === item.title;

                          return (
                            <div key={item.title} className="rounded-[24px] bg-orange-50/70 border border-orange-100 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setOpenItem(activeItem ? '' : item.title)}
                                className="w-full px-4 py-3 flex items-center gap-2 text-left active:bg-orange-50 transition-colors"
                              >
                                <span className="flex-1 text-[11px] font-black text-gray-900 uppercase leading-tight">{item.title}</span>
                                <ChevronDown className={`text-gray-400 transition-transform ${activeItem ? 'rotate-180' : ''}`} size={15} />
                              </button>

                              {activeItem && (
                                <div className="px-4 pb-4">
                                  <p className="text-[11px] font-bold text-gray-500 leading-relaxed">{item.text}</p>
                                  <button
                                    type="button"
                                    onClick={() => runAction(topic, item)}
                                    className="mt-3 w-full rounded-[20px] bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                  >
                                    <MessageCircle size={15} />
                                    {item.actionLabel}
                                  </button>
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
        </div>
      )}
    </>
  );
}
