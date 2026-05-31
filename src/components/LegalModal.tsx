import { useRef } from 'react';
import {
  X,
  Scale,
  ShieldCheck,
  ClipboardList,
  Truck,
  CreditCard,
  Gift,
  MapPin,
  MessageCircle,
  AlertTriangle,
  BadgeCheck,
  UserCheck,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  FileText,
  Lock,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-orange-50 rounded-[28px] p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-tight">
            {title}
          </h3>
        </div>
      </div>

      <div className="text-[11px] font-bold text-gray-500 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

export default function LegalModal({ isOpen, onClose }: Props) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  };

  return (
    <div className="fixed inset-0 z-[12000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar términos"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-xl"
      />

      <div className="relative w-full sm:max-w-lg h-[92dvh] sm:h-[90vh] bg-gray-50 rounded-t-[38px] sm:rounded-[38px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 border border-white/70">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-orange-50 px-5 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-200 flex-shrink-0">
                <Scale size={23} />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-black text-gray-900 uppercase italic leading-tight truncate">
                  Términos y Privacidad
                </h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 truncate">
                  La Casa del Pollazo
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={scrollToBottom}
              className="bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <ChevronDown size={14} />
              Bajar al final
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-950 text-white rounded-2xl py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <CheckCircle2 size={14} />
              Aceptar
            </button>
          </div>
        </div>

        <div
          ref={contentRef}
          className="overflow-y-auto h-[calc(92dvh-137px)] sm:h-[calc(90vh-137px)] p-4 space-y-4 hide-scrollbar"
        >
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 rounded-[34px] p-5 text-white shadow-xl overflow-hidden relative">
            <div className="absolute -top-14 -right-12 w-36 h-36 bg-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-14 -left-12 w-36 h-36 bg-yellow-400/10 rounded-full blur-3xl" />

            <div className="relative flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg flex-shrink-0">
                <ShieldCheck size={25} />
              </div>

              <div>
                <p className="text-sm font-black uppercase italic leading-tight">
                  Reglas claras para comprar mejor
                </p>
                <p className="text-[10px] font-bold text-white/60 mt-1">
                  Última actualización: 2026
                </p>
              </div>
            </div>

            <p className="relative text-xs font-bold text-white/85 leading-relaxed">
              Al usar la app, hacer un pedido o contactarnos por WhatsApp, aceptas estas reglas básicas de compra, entrega, pagos y tratamiento de datos.
            </p>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
                <FileText size={18} className="mx-auto text-orange-300 mb-1" />
                <p className="text-[7px] font-black uppercase text-white/55">
                  Pedidos
                </p>
              </div>

              <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
                <CreditCard size={18} className="mx-auto text-orange-300 mb-1" />
                <p className="text-[7px] font-black uppercase text-white/55">
                  Pagos
                </p>
              </div>

              <div className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
                <Lock size={18} className="mx-auto text-orange-300 mb-1" />
                <p className="text-[7px] font-black uppercase text-white/55">
                  Datos
                </p>
              </div>
            </div>
          </div>

          <Section icon={<ClipboardList size={20} />} title="1. Uso de la app">
            <p>
              La app permite ver productos, armar pedidos, registrar datos de entrega, revisar historial, participar en dinámicas de puntos cuando estén activas y contactar al negocio.
            </p>
            <p>
              El cliente debe ingresar información real y suficiente para poder coordinar la entrega: nombre, teléfono, ubicación y referencia.
            </p>
          </Section>

          <Section icon={<BadgeCheck size={20} />} title="2. Confirmación de pedidos">
            <p>
              Todo pedido puede entrar inicialmente como <b>Por Confirmar</b>. Esto significa que el negocio debe revisar disponibilidad, ubicación, método de pago y cualquier detalle necesario antes de preparar.
            </p>
            <p>
              El pedido se considera aceptado cuando cambia a estados como <b>Recibido</b>, <b>Preparando</b>, <b>Enviado</b> o <b>Entregado</b>.
            </p>
            <p>
              El negocio puede cancelar pedidos por falta de stock, datos incompletos, ubicación no atendida, pago no validado, comportamiento sospechoso o imposibilidad de contacto.
            </p>
          </Section>

          <Section icon={<CreditCard size={20} />} title="3. Métodos de pago">
            <p>
              Los métodos disponibles pueden incluir efectivo, Deuna, transferencia bancaria y tarjeta, según lo que el negocio tenga activo.
            </p>
            <p>
              En efectivo, el pago se realiza contra entrega y el pedido debe ser aceptado por el negocio antes de prepararse.
            </p>
            <p>
              En Deuna, transferencia o tarjeta, el pedido puede requerir validación del pago antes de avanzar. Si el comprobante o pago no coincide, el pedido puede quedar pendiente, rechazado o cancelado.
            </p>
            <p>
              Si a futuro se activa pago con tarjeta o pasarela con comisión, el negocio podrá mostrar una tarifa adicional o recargo antes de confirmar el pedido.
            </p>
          </Section>

          <Section icon={<Truck size={20} />} title="4. Entregas y ubicación">
            <p>
              El cliente debe marcar una ubicación lo más exacta posible y escribir una referencia clara. Ejemplo: color de casa, entrada, calle, negocio cercano o punto de encuentro.
            </p>
            <p>
              Los tiempos de entrega mostrados en la app son estimados. Pueden variar por distancia, cantidad de productos, clima, tráfico, disponibilidad o coordinación con el cliente.
            </p>
            <p>
              Si la ubicación GPS no es exacta o la referencia es insuficiente, el repartidor o el negocio puede llamar o escribir por WhatsApp para coordinar.
            </p>
          </Section>

          <Section icon={<RefreshCw size={20} />} title="5. Cambios, cancelaciones y disponibilidad">
            <p>
              Los productos están sujetos a disponibilidad. Si un producto se agota, cambia de precio o requiere confirmación, el negocio podrá informarlo antes de preparar.
            </p>
            <p>
              En productos de valor variable, como compras por monto, el valor elegido por el cliente sirve como referencia del pedido.
            </p>
            <p>
              El cliente puede pedir ayuda por WhatsApp si necesita corregir datos o cancelar antes de que el pedido sea preparado o enviado.
            </p>
          </Section>

          <Section icon={<Gift size={20} />} title="6. Niveles, puntos y temporadas">
            <p>
              La app puede mostrar niveles, progreso del cliente, puntos de temporada, rankings, premios o dinámicas promocionales.
            </p>
            <p>
              El <b>nivel del cliente</b> refleja su historial de compras válidas. Los <b>puntos de temporada</b> solo aplican cuando el negocio active una temporada o concurso.
            </p>
            <p>
              Los puntos no son dinero, no son transferibles y no garantizan premio salvo que una temporada activa lo indique claramente.
            </p>
            <p>
              El negocio puede pausar, reiniciar o ajustar temporadas, especialmente por errores, abuso, pedidos falsos o cambios operativos.
            </p>
          </Section>

          <Section icon={<UserCheck size={20} />} title="7. Opiniones del Club Pollazo">
            <p>
              El cliente puede dejar opiniones sobre su experiencia. Cuando exista una temporada activa, la primera opinión puede otorgar puntos promocionales una sola vez.
            </p>
            <p>
              No se permiten comentarios ofensivos, falsos, discriminatorios, spam o contenido que afecte injustamente a otras personas.
            </p>
            <p>
              El negocio puede ocultar o eliminar opiniones abusivas o claramente falsas.
            </p>
          </Section>

          <Section icon={<ShieldCheck size={20} />} title="8. Privacidad y datos personales">
            <p>
              La app puede guardar datos como nombre, teléfono, avatar, ubicación de entrega, referencia, historial de pedidos, estado de pago, opiniones, puntos y estadísticas de uso.
            </p>
            <p>
              Estos datos se usan para procesar pedidos, coordinar entregas, mejorar la atención, prevenir pedidos falsos, mostrar historial del cliente y administrar beneficios.
            </p>
            <p>
              No vendemos los datos del cliente a anunciantes. El acceso interno debe limitarse al negocio, administración, soporte técnico o reparto cuando sea necesario para cumplir el pedido.
            </p>
            <p>
              El cliente puede solicitar por WhatsApp corrección, actualización o eliminación de sus datos, salvo información que deba conservarse por control operativo, seguridad, historial comercial o respaldo del negocio.
            </p>
          </Section>

          <Section icon={<AlertTriangle size={20} />} title="9. Uso responsable y pedidos falsos">
            <p>
              Está prohibido usar números ajenos, ubicaciones falsas, pedidos de broma, abuso de promociones, suplantación de identidad o manipulación del sistema de puntos.
            </p>
            <p>
              Si se detecta abuso, el negocio puede cancelar pedidos, bloquear beneficios, marcar al cliente como riesgoso o restringir atención por la app.
            </p>
          </Section>

          <Section icon={<MapPin size={20} />} title="10. Productos sensibles o con restricción">
            <p>
              Si el catálogo incluye productos con restricción por edad o control especial, el negocio podrá pedir verificación, limitar su venta o retirarlos de la app.
            </p>
            <p>
              El cliente declara que usará la app de forma responsable y conforme a las normas aplicables.
            </p>
          </Section>

          <Section icon={<MessageCircle size={20} />} title="11. Contacto">
            <p>
              Para soporte, reclamos, correcciones de pedido, privacidad o dudas sobre estos términos, el canal principal de contacto es WhatsApp oficial del negocio.
            </p>

            <a
              href="https://wa.me/593989795628?text=Hola%2C%20tengo%20una%20consulta%20sobre%20t%C3%A9rminos%2C%20privacidad%20o%20un%20pedido."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            >
              <MessageCircle size={15} />
              Contactar por WhatsApp
            </a>
          </Section>

          <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4">
            <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed text-center">
              Estos términos pueden actualizarse cuando cambien funciones, métodos de pago, promociones, reparto o requisitos del negocio.
            </p>
          </div>

          <div ref={bottomRef} />

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-200 border-b-4 border-orange-700 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={17} />
            Aceptar y cerrar
          </button>

          <div className="h-3" />
        </div>
      </div>
    </div>
  );
}
