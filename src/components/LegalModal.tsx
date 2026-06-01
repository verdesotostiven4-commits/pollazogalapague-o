import { type ReactNode } from 'react';
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
  CheckCircle2,
  FileText,
  Lock,
  BellRing,
  HelpCircle,
  Crown,
  Star,
  Smartphone,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;

  // No es obligatorio pasarlo.
  // auto:
  // - si el cliente aún no aceptó, muestra versión obligatoria sin X.
  // - si ya aceptó, muestra versión de lectura con X.
  mode?: 'auto' | 'required' | 'read';
}

const LEGAL_ACCEPTED_KEY = 'pollazo_legal_accepted';

const WHATSAPP_HELP_URL =
  'https://wa.me/593989795628?text=Hola%2C%20tengo%20una%20consulta%20sobre%20t%C3%A9rminos%2C%20privacidad%20o%20un%20pedido%20en%20La%20Casa%20del%20Pollazo.';

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white border border-orange-100/70 rounded-[30px] p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-[20px] bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 border border-orange-100">
          {icon}
        </div>

        <div className="min-w-0 pt-0.5">
          <h3 className="text-[11px] font-black text-gray-950 uppercase tracking-widest leading-tight">
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

function MiniLegalCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white/80 border border-white rounded-[24px] p-3 shadow-sm">
      <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
        {icon}
      </div>

      <p className="text-[9px] font-black text-gray-900 uppercase leading-tight">
        {title}
      </p>

      <p className="text-[9px] font-bold text-gray-400 leading-relaxed mt-1">
        {text}
      </p>
    </div>
  );
}

function HelpItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-orange-50/70 border border-orange-100 rounded-[24px] p-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-2xl bg-white text-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black text-gray-900 uppercase leading-tight">
          {title}
        </p>

        <p className="text-[10px] font-bold text-gray-500 leading-relaxed mt-1">
          {text}
        </p>
      </div>
    </div>
  );
}

export default function LegalModal({
  isOpen,
  onClose,
  mode = 'auto',
}: Props) {
  if (!isOpen) return null;

  const hasAccepted =
    typeof window !== 'undefined' &&
    window.localStorage.getItem(LEGAL_ACCEPTED_KEY) === '1';

  const isRequired = mode === 'required' || (mode === 'auto' && !hasAccepted);
  const isReadOnly = !isRequired;

  const handlePrimaryAction = () => {
    if (isRequired && typeof window !== 'undefined') {
      window.localStorage.setItem(LEGAL_ACCEPTED_KEY, '1');
    }

    onClose();
  };

  const modalTitle = isRequired
    ? 'Antes de continuar'
    : 'Centro legal y ayuda';

  const modalSubtitle = isRequired
    ? 'Revisa y acepta para usar la app'
    : 'Consulta reglas, privacidad y soporte';

  return (
    <div className="fixed inset-0 z-[12000] flex items-end sm:items-center justify-center bg-orange-950/20 p-0 sm:p-4">
      {isReadOnly ? (
        <button
          type="button"
          aria-label="Cerrar centro legal"
          onClick={onClose}
          className="absolute inset-0 bg-orange-950/10"
        />
      ) : (
        <div className="absolute inset-0 bg-orange-950/10" />
      )}

      <section className="relative w-full sm:max-w-lg h-[94dvh] sm:h-[90vh] bg-gradient-to-b from-orange-50 via-white to-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 border border-white/80 flex flex-col">
        <header className="flex-shrink-0 bg-white/95 border-b border-orange-100 px-5 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-13 h-13 flex-shrink-0">
                <div className="absolute inset-0 bg-orange-300/40 rounded-[24px] blur-lg" />
                <div className="relative w-13 h-13 rounded-[24px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                  <Scale size={24} />
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-black text-gray-950 uppercase italic leading-tight truncate">
                  {modalTitle}
                </h2>

                <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.22em] mt-1 truncate">
                  {modalSubtitle}
                </p>
              </div>
            </div>

            {isReadOnly && (
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0 border border-orange-100"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {isRequired && (
            <div className="mt-4 bg-orange-50 border border-orange-100 rounded-[24px] p-3 flex items-start gap-3">
              <ShieldCheck size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
                Para comprar, guardar tu ubicación, recibir avisos de pedido y usar beneficios, necesitamos que aceptes estas reglas básicas.
              </p>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
          <section className="relative overflow-hidden bg-gradient-to-br from-white via-orange-50 to-yellow-50 border border-orange-100 rounded-[36px] p-5 shadow-sm">
            <div className="absolute -right-12 -top-12 w-36 h-36 bg-orange-300/25 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-14 w-36 h-36 bg-yellow-300/25 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-start gap-3">
                <div className="w-13 h-13 rounded-[24px] bg-white text-orange-500 flex items-center justify-center shadow-md border border-orange-100 flex-shrink-0">
                  <ShieldCheck size={28} />
                </div>

                <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.24em]">
                    La Casa del Pollazo
                  </p>

                  <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">
                    Compra fácil, con reglas claras
                  </h3>

                  <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-3">
                    Aquí explicamos cómo funcionan pedidos, pagos, entregas, datos personales, beneficios, puntos, notificaciones y ayuda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5">
                <MiniLegalCard
                  icon={<FileText size={18} />}
                  title="Pedidos"
                  text="Estados, cambios y confirmación."
                />

                <MiniLegalCard
                  icon={<CreditCard size={18} />}
                  title="Pagos"
                  text="Efectivo, Deuna, transferencia y tarjeta."
                />

                <MiniLegalCard
                  icon={<Lock size={18} />}
                  title="Datos"
                  text="Privacidad, ubicación y seguridad."
                />
              </div>
            </div>
          </section>

          <div className="px-1">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.24em]">
              Información legal
            </p>
          </div>

          <Section icon={<ClipboardList size={20} />} title="1. Uso de la app">
            <p>
              La app permite ver productos, armar pedidos, registrar datos de entrega, revisar historial, participar en dinámicas de puntos cuando estén activas, recibir avisos importantes y contactar al negocio.
            </p>
            <p>
              El cliente debe ingresar información real y suficiente para coordinar la atención: nombre, WhatsApp, ubicación y referencia de entrega.
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

          <Section icon={<CreditCard size={20} />} title="3. Pagos y comprobantes">
            <p>
              Los métodos disponibles pueden incluir efectivo, Deuna, transferencia bancaria y tarjeta, según lo que el negocio tenga activo.
            </p>
            <p>
              En efectivo, el pago se realiza contra entrega. En Deuna, transferencia o tarjeta, el pedido puede requerir validación antes de avanzar.
            </p>
            <p>
              Si el pago, comprobante, monto o referencia no coincide, el pedido puede quedar pendiente, rechazado o cancelado.
            </p>
            <p>
              Si a futuro se activa una pasarela de tarjeta con comisión, la app podrá mostrar el valor adicional antes de confirmar el pedido.
            </p>
          </Section>

          <Section icon={<Truck size={20} />} title="4. Entregas y ubicación">
            <p>
              El cliente debe marcar una ubicación lo más exacta posible y escribir una referencia clara, como color de casa, entrada, calle, negocio cercano o punto de encuentro.
            </p>
            <p>
              Los tiempos de entrega son estimados. Pueden variar por distancia, clima, tráfico, cantidad de productos, disponibilidad o coordinación con el cliente.
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

          <Section icon={<Crown size={20} />} title="6. Pollazo Plus">
            <p>
              Pollazo Plus es una membresía mensual que puede incluir beneficios como delivery gratis dentro de cobertura, prioridad operativa, avisos importantes y regalos sorpresa cuando el negocio los active.
            </p>
            <p>
              Los beneficios aplican mientras la membresía esté activa. El negocio podrá revisar, pausar o cancelar beneficios si detecta abuso, datos falsos, pagos no válidos o uso indebido.
            </p>
            <p>
              El delivery gratis aplica dentro de las zonas y condiciones operativas del negocio. Algunos pedidos pueden requerir coordinación especial por distancia, horario o disponibilidad.
            </p>
          </Section>

          <Section icon={<Gift size={20} />} title="7. Niveles, puntos, ranking y promociones">
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
              El negocio puede pausar, reiniciar o ajustar temporadas por errores, abuso, pedidos falsos o cambios operativos.
            </p>
          </Section>

          <Section icon={<BellRing size={20} />} title="8. Notificaciones y rastreo">
            <p>
              La app puede pedir permiso para enviar notificaciones importantes sobre estados del pedido, pago, entrega, regalos Plus, membresía, seguridad o novedades relevantes.
            </p>
            <p>
              Las notificaciones se usan para mejorar la experiencia del cliente, no para enviar spam. El cliente puede administrar permisos desde la configuración de su navegador o celular.
            </p>
          </Section>

          <Section icon={<ShieldCheck size={20} />} title="9. Privacidad y datos personales">
            <p>
              La app puede guardar datos como nombre, teléfono, avatar, ubicación de entrega, referencia, historial de pedidos, método de pago, estado de pago, opiniones, puntos, membresía y estadísticas de uso.
            </p>
            <p>
              Estos datos se usan para procesar pedidos, coordinar entregas, mejorar la atención, prevenir pedidos falsos, mostrar historial, entregar beneficios y administrar el servicio.
            </p>
            <p>
              No vendemos los datos del cliente a anunciantes. El acceso interno debe limitarse al negocio, administración, soporte técnico o reparto cuando sea necesario para cumplir el pedido.
            </p>
            <p>
              El cliente puede solicitar por WhatsApp corrección, actualización o eliminación de sus datos, salvo información que deba conservarse por control operativo, seguridad, historial comercial o respaldo del negocio.
            </p>
          </Section>

          <Section icon={<AlertTriangle size={20} />} title="10. Uso responsable y seguridad">
            <p>
              Está prohibido usar números ajenos, ubicaciones falsas, pedidos de broma, abuso de promociones, suplantación de identidad o manipulación del sistema de puntos.
            </p>
            <p>
              Si se detecta abuso, el negocio puede cancelar pedidos, bloquear beneficios, marcar al cliente como riesgoso o restringir atención por la app.
            </p>
          </Section>

          <Section icon={<MapPin size={20} />} title="11. Productos o zonas con restricción">
            <p>
              Si el catálogo incluye productos con restricción por edad, disponibilidad especial o control operativo, el negocio podrá pedir verificación, limitar la venta o retirarlos de la app.
            </p>
            <p>
              Algunas zonas, horarios o entregas pueden requerir confirmación adicional antes de aceptar el pedido.
            </p>
          </Section>

          <div className="px-1 pt-1">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.24em]">
              Ayuda rápida
            </p>
          </div>

          <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm space-y-3">
            <HelpItem
              icon={<ClipboardList size={18} />}
              title="Problemas con mi pedido"
              text="Consulta estados, cambios, cancelaciones, productos faltantes o coordinación de entrega."
            />

            <HelpItem
              icon={<CreditCard size={18} />}
              title="Problemas con pago"
              text="Ayuda con comprobantes, Deuna, transferencias, pagos rechazados o pagos pendientes."
            />

            <HelpItem
              icon={<MapPin size={18} />}
              title="Ubicación o entrega"
              text="Corrige referencia, punto de entrega, Airbnb, hotel, casa o negocio cercano."
            />

            <HelpItem
              icon={<BellRing size={18} />}
              title="Notificaciones y rastreo"
              text="Revisa avisos del pedido, permisos del celular y seguimiento en vivo."
            />

            <HelpItem
              icon={<Smartphone size={18} />}
              title="Seguridad de mi cuenta"
              text="Reporta actividad sospechosa, número equivocado o problemas de verificación."
            />

            <HelpItem
              icon={<UserCheck size={18} />}
              title="Mis datos"
              text="Solicita actualizar, corregir o eliminar datos asociados a tu WhatsApp."
            />

            <a
              href={WHATSAPP_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white px-4 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              Contactar por WhatsApp
            </a>
          </section>

          <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4">
            <div className="flex items-start gap-3">
              <Star size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
                Estos términos pueden actualizarse cuando cambien funciones, métodos de pago, promociones, reparto, membresías o requisitos del negocio.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex-shrink-0 bg-white/95 border-t border-orange-100 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]">
          <p className="text-[9px] font-bold text-gray-400 leading-relaxed text-center mb-3">
            {isRequired
              ? 'Al continuar confirmas que entiendes las reglas de uso, compra, entrega, pagos y privacidad.'
              : 'Esta sección es solo para consulta. Ya aceptaste las reglas al ingresar por primera vez.'}
          </p>

          <button
            type="button"
            onClick={handlePrimaryAction}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-5 rounded-[26px] font-black text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-200 border-b-4 border-orange-600 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={17} />
            {isRequired ? 'Acepto y continuar' : 'Cerrar lectura'}
          </button>
        </footer>
      </section>
    </div>
  );
}
