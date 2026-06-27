import { useEffect } from 'react';

const LANGUAGE_KEY = 'pollazo_language';
const SKIP_SELECTOR = 'script,style,textarea,select,input,.maplibregl-map,.maplibregl-map *,[contenteditable="true"]';

const toEnglish: Record<string, string> = {
  'información oficial': 'Official information',
  'renueva tus beneficios': 'Renew your benefits',
  'renueva tus beneficios plus': 'Renew your Plus benefits',
  'recupera delivery gratis dentro de cobertura, prioridad y beneficios especiales en pedidos seleccionados.': 'Recover free delivery within coverage, priority and special benefits on selected orders.',
  'delivery gratis': 'Free delivery',
  'envíos gratis': 'Free delivery',
  'todo el mes': 'All month',
  'sorpresas': 'Surprises',
  'según stock': 'Depending on stock',
  'prioridad': 'Priority',
  'atención plus': 'Plus service',
  'beneficios': 'Benefits',
  'sin contrato': 'No contract',
  'puedes solicitar cancelar': 'You can request cancellation',
  'pago de membresía': 'Membership payment',
  'suscripción mensual': 'Monthly subscription',
  'membresía mensual': 'Monthly membership',
  'ver plus': 'View Plus',
  'condiciones': 'Conditions',
  'pago mensual': 'Monthly payment',
  'beneficios especiales': 'Special benefits',
  'cancelación': 'Cancellation',
  'uso correcto': 'Correct use',
  'términos y condiciones': 'Terms and conditions',
  'transparencia': 'Transparency',
  'en tiempo real': 'In real time',
  'en línea ahora': 'Online now',
  'visitas totales': 'Total visits',
  'pedidos confirmados': 'Confirmed orders',
  'marca tu punto exacto': 'Mark your exact point',
  'punto dentro de zona': 'Point inside zone',
  'punto seleccionado': 'Selected point',
  'guardar como': 'Save as',
  'casa': 'Home',
  'trabajo': 'Work',
  'otro': 'Other',
  'referencia': 'Reference',
  'confirmar punto': 'Confirm point',
  'centro de ayuda': 'Help center',
  'nuestro equipo': 'Our team',
  'personas detrás de la atención y servicio': 'People behind service and support',
  'encargado': 'Manager',
  'encargada': 'Manager',
  'parte del equipo': 'Team member',
  'galería': 'Gallery',
  'nuestras instalaciones': 'Our facilities',
  'nuestros productos': 'Our products',
  'pollos frescos': 'Fresh chicken',
  'productos del día': 'Today’s products',
  'opiniones del club': 'Club reviews',
  'opinar': 'Review',
  'danos tu calificación': 'Rate your experience',
  'cómo estuvo tu experiencia': 'How was your experience?',
  'mi historial pollazo': 'My Pollazo history',
  'mis pedidos': 'My orders',
  'revisa tus compras, estados y detalles.': 'Review your purchases, statuses and details.',
  'buscar por código o producto...': 'Search by code or product...',
  'estado': 'Status',
  'activos': 'Active',
  'entregados': 'Delivered',
  'todos': 'All',
  'comprado': 'Purchased',
  'por confirmar': 'To confirm',
  'productos': 'Products',
  'detalle': 'Detail',
  'detalles': 'Details',
  'ayuda': 'Help',
  'ver todos los productos': 'View all products',
  'ver más productos': 'View more products',
  'método de pago': 'Payment method',
  'elige cómo quieres pagar': 'Choose how you want to pay',
  'efectivo': 'Cash',
  'transferencia': 'Transfer',
  'confirmar': 'Confirm',
  'subtotal': 'Subtotal',
  'total final': 'Final total',
  'pendiente': 'Pending',
  'elige tu método de pago': 'Choose your payment method',
  'qué buscas hoy?': 'What are you looking for today?',
  '¿qué buscas hoy?': 'What are you looking for today?',
  'pedido': 'Order',
  'canasta': 'Basket',
  'ver categorías': 'View categories',
  'únete al club': 'Join the club',
  'acumula puntos y gana premios': 'Earn points and win prizes',
  'personaliza tu avatar': 'Customize your avatar',
  'ranking de clientes': 'Customer ranking',
  'salón de la fama': 'Hall of fame',
  'nivel': 'Level',
  'cliente nuevo': 'New customer',
  'cliente fiel': 'Loyal customer',
  'cliente oro': 'Gold customer',
  'leyenda pollazo': 'Pollazo legend',
  'ya llegaste al nivel máximo.': 'You have reached the maximum level.',
  'progreso de nivel': 'Level progress',
  'ver niveles': 'View levels',
  'ubicación guardada': 'Saved location',
  'mi entrega': 'My delivery',
  'agregar nueva dirección': 'Add new address',
  'avisos importantes': 'Important notices',
  'notificaciones pollazo': 'Pollazo notifications',
  'activar avisos': 'Enable notices',
  'contacto directo': 'Direct contact',
  'whatsapp oficial': 'Official WhatsApp',
  'atención inmediata': 'Immediate support',
  'línea telefónica': 'Phone line',
  'horario de atención': 'Opening hours',
  'ubicación': 'Location',
  'comprar ahora': 'Order now',
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

export default function PollazoLanguagePolish() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let timer = 0;

    const run = () => {
      timer = 0;
      const language = window.localStorage.getItem(LANGUAGE_KEY) || 'es';
      if (language === 'es') return;

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
          const key = normalize(node.nodeValue || '');
          if (!key || key.length > 110) return NodeFilter.FILTER_REJECT;
          return toEnglish[key] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      });

      const nodes: Text[] = [];
      let node = walker.nextNode();
      while (node && nodes.length < 260) {
        nodes.push(node as Text);
        node = walker.nextNode();
      }

      nodes.forEach(textNode => {
        const current = textNode.nodeValue || '';
        const replacement = toEnglish[normalize(current)];
        if (!replacement) return;
        textNode.nodeValue = current.replace(current.trim(), replacement);
      });
    };

    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(run, 120);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    schedule();
    window.addEventListener('click', schedule, true);
    window.addEventListener('input', schedule, true);
    window.addEventListener('popstate', schedule);

    return () => {
      if (timer) window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('click', schedule, true);
      window.removeEventListener('input', schedule, true);
      window.removeEventListener('popstate', schedule);
    };
  }, []);

  return null;
}
