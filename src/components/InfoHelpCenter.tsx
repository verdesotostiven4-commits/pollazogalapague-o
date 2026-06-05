import { useEffect, useRef, useState } from 'react';
import {
  BadgePercent,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';

const WHATSAPP = '593989795628';
const PLUS_OPEN_SIGNAL_KEY = 'pollazo_open_plus';

type HelpAction = 'whatsapp' | 'orders' | 'location' | 'plus' | 'none';

type HelpItem = {
  title: string;
  text: string;
  actionLabel?: string;
  action?: HelpAction;
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
    id: 'pedidos',
    icon: <PackageSearch size={20} />,
    title: 'Pedidos',
    subtitle: 'Estado, preparación, cambios y seguimiento.',
    items: [
      {
        title: '¿Cómo sé si mi pedido fue recibido?',
        text: 'Cuando haces un pedido puede entrar como Por Confirmar. El local revisa disponibilidad, ubicación y datos necesarios. Luego el estado puede cambiar a Recibido, Preparando, Enviado o Entregado.',
        actionLabel: 'Ver mis pedidos',
        action: 'orders',
      },
      {
        title: 'Mi pedido no llegó',
        text: 'Revisa el estado en Mis pedidos. Si ya aparece como Enviado y pasó más tiempo de lo normal, escribe al local con tu nombre y código de pedido para revisar con el repartidor.',
        actionLabel: 'Ver mis pedidos',
        action: 'orders',
      },
      {
        title: 'Mi pedido llegó incompleto',
        text: 'Toma una foto de lo recibido y envía el código del pedido. El local revisará qué ocurrió y coordinará la solución correspondiente.',
        actionLabel: 'Reportar por WhatsApp',
        action: 'whatsapp',
      },
      {
        title: 'Quiero cambiar algo de mi pedido',
        text: 'Si el pedido aún no está en preparación o enviado, se puede intentar cambiar. Si ya está avanzado, depende del tiempo, stock y operación del local.',
        actionLabel: 'Escribir al local',
        action: 'whatsapp',
      },
      {
        title: 'No veo mi pedido en la app',
        text: 'Asegúrate de usar el mismo número de WhatsApp con el que hiciste el pedido. Si igual no aparece, el local puede ayudarte a revisarlo con tu nombre o código.',
        actionLabel: 'Contactar soporte',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'cancelaciones',
    icon: <RefreshCw size={20} />,
    title: 'Cancelaciones y devoluciones',
    subtitle: 'Cambios, productos agotados y soluciones.',
    items: [
      {
        title: '¿Puedo cancelar un pedido?',
        text: 'Puedes solicitar cancelación mientras el pedido aún no esté en preparación o enviado. Si ya fue preparado o va en camino, el local revisará si todavía es posible.',
        actionLabel: 'Solicitar ayuda',
        action: 'whatsapp',
      },
      {
        title: '¿Qué pasa si un producto se agotó?',
        text: 'Si un producto se agota, el local puede avisarte para cambiarlo, quitarlo del pedido o coordinar una alternativa antes de preparar.',
        actionLabel: 'Consultar pedido',
        action: 'whatsapp',
      },
      {
        title: '¿Cuándo aplica una devolución?',
        text: 'Puede aplicar cuando hubo pago duplicado confirmado, producto no entregado o una corrección aprobada por el local. El tiempo depende del método de pago y del caso.',
        actionLabel: 'Reportar devolución',
        action: 'whatsapp',
      },
      {
        title: 'Recibí otro producto por error',
        text: 'Guarda el producto recibido y envía una foto al local. Así se puede revisar el caso y coordinar el cambio o la solución más conveniente.',
        actionLabel: 'Reportar error',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'pagos',
    icon: <CreditCard size={20} />,
    title: 'Pagos',
    subtitle: 'Efectivo, Deuna, transferencia y confirmación.',
    items: [
      {
        title: '¿Qué medios de pago aceptan?',
        text: 'La app puede manejar efectivo contra entrega y pagos digitales como Deuna, transferencia o tarjeta si están activos. Los métodos disponibles pueden cambiar según operación del local.',
        actionLabel: 'Preguntar métodos',
        action: 'whatsapp',
      },
      {
        title: 'Pagué pero sigue pendiente',
        text: 'Si un pago no se confirma al momento o notas algo raro, espera unos minutos y revisa el estado. Si continúa pendiente, contacta al local para ayudarte con el pedido.',
        actionLabel: 'Consultar pago',
        action: 'whatsapp',
      },
      {
        title: '¿Cuánto tarda en confirmarse un pago?',
        text: 'Normalmente la confirmación debe ser rápida cuando el método está funcionando bien. Puede tardar más si hay mala señal, datos incompletos o un problema externo del método de pago.',
        actionLabel: 'Consultar estado',
        action: 'whatsapp',
      },
      {
        title: 'Me equivoqué al pagar',
        text: 'Si escribiste mal un dato, pagaste otro valor o seleccionaste otro método, contacta al local lo antes posible para revisar el caso antes de preparar el pedido.',
        actionLabel: 'Pedir ayuda',
        action: 'whatsapp',
      },
      {
        title: 'Creo que me cobraron dos veces',
        text: 'Revisa tus movimientos y contacta al local con la información del pedido. Se revisará el caso para confirmar si hubo duplicado y coordinar la solución.',
        actionLabel: 'Reportar cobro',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'promos',
    icon: <BadgePercent size={20} />,
    title: 'Cupones y promociones',
    subtitle: 'Descuentos, puntos, premios y campañas.',
    items: [
      {
        title: '¿Hay cupones activos?',
        text: 'Cuando existan cupones o promociones, la app podrá mostrarlos en Inicio, catálogo, ranking o campañas especiales. Si no aparece nada, puede que no haya promoción activa.',
        actionLabel: 'Consultar promoción',
        action: 'whatsapp',
      },
      {
        title: '¿Cómo funcionan los puntos?',
        text: 'Los puntos o rankings pueden usarse para temporadas, premios o dinámicas especiales. No son dinero y no siempre garantizan premio, salvo que la campaña lo indique claramente.',
        actionLabel: 'Preguntar por puntos',
        action: 'whatsapp',
      },
      {
        title: 'No se aplicó una promoción',
        text: 'Revisa si la promoción seguía activa, si aplicaba al producto y si cumplías las condiciones. El local puede revisar el caso si envías captura o detalle del pedido.',
        actionLabel: 'Revisar promo',
        action: 'whatsapp',
      },
      {
        title: '¿Las promociones se acumulan?',
        text: 'Depende de la campaña activa. Algunas promociones pueden ser únicas por pedido, por cliente o por temporada. Cuando haya reglas finales, se mostrarán en la app.',
        actionLabel: 'Consultar reglas',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'entregas',
    icon: <MapPin size={20} />,
    title: 'Entregas y cobertura',
    subtitle: 'Dirección, referencia, zonas y tiempos.',
    items: [
      {
        title: '¿A dónde hacen envíos?',
        text: 'Por ahora los envíos se manejan principalmente dentro de Puerto Ayora y el sector El Mirador. Zonas como Bellavista, Santa Rosa o El Cascajo podrían confirmarse a futuro o revisarse según operación del local.',
        actionLabel: 'Consultar cobertura',
        action: 'whatsapp',
      },
      {
        title: 'No encuentran mi casa',
        text: 'Agrega una referencia clara: color de casa, entrada, calle, tienda cercana o punto conocido. En la isla una buena referencia ayuda muchísimo al repartidor.',
        actionLabel: 'Editar ubicación',
        action: 'location',
      },
      {
        title: 'Quiero cambiar mi ubicación',
        text: 'Puedes guardar otra ubicación desde Info y seleccionarla antes de hacer tu pedido. Si el pedido ya fue enviado, consulta por WhatsApp.',
        actionLabel: 'Cambiar ubicación',
        action: 'location',
      },
      {
        title: '¿Cuánto tarda la entrega?',
        text: 'El tiempo depende de distancia, clima, tráfico, cantidad de pedidos, disponibilidad de productos y repartidor. El estado del pedido te ayuda a saber si ya va en camino.',
        actionLabel: 'Ver mis pedidos',
        action: 'orders',
      },
      {
        title: '¿Puedo pedir para recoger?',
        text: 'Por ahora el flujo principal está pensado para domicilio. Si deseas recoger en el local, consúltalo antes por WhatsApp para coordinar.',
        actionLabel: 'Coordinar retiro',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'plus',
    icon: <Star size={20} />,
    title: 'Pollazo Plus',
    subtitle: 'Membresía, beneficios, regalos y delivery.',
    items: [
      {
        title: '¿Qué es Pollazo Plus?',
        text: 'Es una membresía mensual de beneficios. Puede incluir delivery gratis dentro de cobertura, prioridad operativa, avisos importantes y regalos o sorpresas cuando el local los active.',
        actionLabel: 'Ver Plus',
        action: 'plus',
      },
      {
        title: 'No se aplicó mi beneficio',
        text: 'Revisa que tu membresía esté activa y que el pedido esté dentro de cobertura. Si algo no cuadra, el local puede revisar el caso.',
        actionLabel: 'Consultar Plus',
        action: 'whatsapp',
      },
      {
        title: '¿El delivery gratis aplica siempre?',
        text: 'Aplica según cobertura, estado de membresía y reglas activas del local. Si estás fuera de cobertura o hay una condición especial, el negocio puede confirmarlo antes.',
        actionLabel: 'Consultar beneficio',
        action: 'whatsapp',
      },
      {
        title: '¿Puedo cancelar Pollazo Plus?',
        text: 'Cuando la suscripción esté completamente activa, se podrá definir el proceso de cancelación. Por ahora, cualquier duda se revisa directo con el local.',
        actionLabel: 'Contactar soporte',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'cuenta',
    icon: <Lock size={20} />,
    title: 'Cuenta y seguridad',
    subtitle: 'Datos, WhatsApp, ubicación y notificaciones.',
    items: [
      {
        title: '¿Por qué piden mi WhatsApp?',
        text: 'Se usa para identificar tus pedidos, coordinar entrega, confirmar novedades del pedido y contactarte si falta información. Es importante usar tu número real.',
        actionLabel: 'Contactar soporte',
        action: 'whatsapp',
      },
      {
        title: 'Quiero cambiar mis datos',
        text: 'Puedes actualizar ubicación y referencia desde Info. Si necesitas cambiar nombre o número, escribe al local para evitar confusión con pedidos anteriores.',
        actionLabel: 'Pedir cambio',
        action: 'whatsapp',
      },
      {
        title: 'No me llegan notificaciones',
        text: 'Revisa permisos del navegador o celular. También puede influir si la app no está instalada o si el sistema bloqueó avisos.',
        actionLabel: 'Pedir ayuda',
        action: 'whatsapp',
      },
      {
        title: '¿Mis datos están protegidos?',
        text: 'Los datos se usan para pedidos, entregas, historial, beneficios y seguridad operativa. No deben venderse a terceros ni usarse para publicidad externa.',
        actionLabel: 'Consultar privacidad',
        action: 'whatsapp',
      },
    ],
  },
  {
    id: 'faq',
    icon: <ShieldCheck size={20} />,
    title: 'Preguntas frecuentes',
    subtitle: 'Dudas rápidas sobre la app y el local.',
    items: [
      {
        title: '¿Los productos agotados desaparecen?',
        text: 'Lo ideal es que sigan visibles como Agotado para que el cliente sepa que existen, pero no pueda comprarlos hasta que vuelvan a estar disponibles.',
        action: 'none',
      },
      {
        title: '¿Puedo hacer pedido fuera de horario?',
        text: 'La app puede permitir dejar pedidos como preventa o por confirmar. El local los revisará cuando esté operativo.',
        action: 'none',
      },
      {
        title: '¿Qué pasa si no respondo al repartidor?',
        text: 'Si no se puede contactar al cliente o no se encuentra la ubicación, el pedido puede demorarse, pausarse o cancelarse según el caso.',
        action: 'none',
      },
      {
        title: '¿Puedo guardar más de una ubicación?',
        text: 'La idea es que puedas actualizar tu ubicación y referencia desde Info. Más adelante se puede mejorar para manejar varias direcciones guardadas si el flujo lo necesita.',
        action: 'none',
      },
      {
        title: '¿Qué hago si la app no carga bien?',
        text: 'Prueba cerrar y abrir la app, revisar conexión o actualizar la página. Si sigue igual, contacta al local y describe qué estabas intentando hacer.',
        action: 'none',
      },
      {
        title: '¿Necesito instalar la app?',
        text: 'No siempre es obligatorio, pero instalarla puede mejorar el acceso rápido, la experiencia tipo app y las notificaciones cuando estén disponibles.',
        action: 'none',
      },
      {
        title: '¿Puedo comprar productos agotados?',
        text: 'No. Si un producto aparece como agotado, debes esperar a que el local lo vuelva a habilitar o consultar si hay una alternativa disponible.',
        action: 'none',
      },
      {
        title: '¿Esta ayuda cambiará después?',
        text: 'Sí. Esta sección es una base inicial. Cuando la app esté completa y el local defina reglas finales, se actualizarán respuestas, cobertura, pagos, promociones y beneficios.',
        action: 'none',
      },
    ],
  },
];

function buildWhatsApp(topic: string, item: string) {
  const message = `Hola, necesito ayuda con ${topic}: ${item}`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function clickMainNav(words: string[]) {
  const nav = document.querySelector('nav[aria-label="Navegación principal"]');
  const buttons = Array.from(nav?.querySelectorAll('button') || []) as HTMLButtonElement[];

  const found = buttons.find(button => {
    const aria = (button.getAttribute('aria-label') || '').toLowerCase();
    const text = (button.innerText || '').toLowerCase();
    return words.some(word => aria.includes(word) || text === word || text.includes(word));
  });

  found?.click();
  return Boolean(found);
}

function clickInfoAction(words: string[]) {
  const main = document.querySelector('main');
  const buttons = Array.from(main?.querySelectorAll('button') || []) as HTMLButtonElement[];

  const found = buttons.find(button => {
    const text = (button.innerText || '').toLowerCase();
    const isHelpButton = text.includes('centro de ayuda');
    return !isHelpButton && words.some(word => text.includes(word));
  });

  found?.click();
  return Boolean(found);
}

export default function InfoHelpCenter() {
  const [open, setOpen] = useState(false);
  const [openTopic, setOpenTopic] = useState('pedidos');
  const [openItem, setOpenItem] = useState('');
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!open) return undefined;

    const main = document.querySelector('main') as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousMainOverflow = main?.style.overflowY || '';

    document.body.style.overflow = 'hidden';
    if (main) main.style.overflowY = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (main) main.style.overflowY = previousMainOverflow;
    };
  }, [open]);

  const openTopicOnly = (topic: HelpTopic, activeTopic: boolean) => {
    const nextTopic = activeTopic ? '' : topic.id;
    setOpenTopic(nextTopic);
    setOpenItem('');

    if (!activeTopic) {
      window.setTimeout(() => {
        topicRefs.current[topic.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 90);
    }
  };

  const runAction = (topic: HelpTopic, item: HelpItem) => {
    if (!item.action || item.action === 'none') return;

    if (item.action === 'orders') {
      setOpen(false);
      window.setTimeout(() => {
        if (!clickMainNav(['pedidos', 'orders'])) {
          window.open(buildWhatsApp(topic.title, item.title), '_blank');
        }
      }, 120);
      return;
    }

    if (item.action === 'location') {
      setOpen(false);
      window.setTimeout(() => {
        if (!clickInfoAction(['agregar nueva', 'editar', 'cambiar ubicación', 'add new', 'edit'])) {
          window.open(buildWhatsApp(topic.title, item.title), '_blank');
        }
      }, 120);
      return;
    }

    if (item.action === 'plus') {
      setOpen(false);
      sessionStorage.setItem(PLUS_OPEN_SIGNAL_KEY, '1');
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('pollazo:open-plus'));
      }, 120);
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
          <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">Pedidos, pagos, entregas, promociones y cuenta.</p>
        </div>

        <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
          <Search size={18} />
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[13090] flex items-end justify-center overscroll-contain" onWheel={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}>
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
                    <p className="text-[11px] font-bold text-white/80 leading-relaxed mt-2">Elige una categoría y abre solo la pregunta que quieras leer.</p>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-orange-50/40 overscroll-contain">
              {topics.map(topic => {
                const activeTopic = openTopic === topic.id;

                return (
                  <div
                    key={topic.id}
                    ref={element => { topicRefs.current[topic.id] = element; }}
                    className="rounded-[28px] border border-orange-100 bg-white overflow-hidden shadow-sm scroll-mt-4"
                  >
                    <button
                      type="button"
                      onClick={() => openTopicOnly(topic, activeTopic)}
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

                                  {item.action && item.action !== 'none' && item.actionLabel && (
                                    <button
                                      type="button"
                                      onClick={() => runAction(topic, item)}
                                      className="mt-3 w-full rounded-[20px] bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                    >
                                      <MessageCircle size={15} />
                                      {item.actionLabel}
                                    </button>
                                  )}
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
