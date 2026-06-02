import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  ChevronDown,
  FileText,
  Lock,
  BellRing,
  Crown,
  Star,
  Smartphone,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { LanguageCode } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'auto' | 'required' | 'read';
}

const LEGAL_ACCEPTED_KEY = 'pollazo_legal_accepted';

const WHATSAPP_HELP_URL =
  'https://wa.me/593989795628?text=Hola%2C%20tengo%20una%20consulta%20sobre%20t%C3%A9rminos%2C%20privacidad%20o%20un%20pedido%20en%20La%20Casa%20del%20Pollazo.';

type LegalSectionCopy = {
  title: string;
  paragraphs: string[];
};

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

const SECTION_ICONS = [
  <ClipboardList size={20} />,
  <BadgeCheck size={20} />,
  <CreditCard size={20} />,
  <Truck size={20} />,
  <RefreshCw size={20} />,
  <Crown size={20} />,
  <Gift size={20} />,
  <BellRing size={20} />,
  <ShieldCheck size={20} />,
  <AlertTriangle size={20} />,
  <MapPin size={20} />,
];

const esSections: LegalSectionCopy[] = [
  {
    title: '1. Uso de la app',
    paragraphs: [
      'La app permite ver productos, armar pedidos, registrar datos de entrega, revisar historial, participar en dinámicas de puntos cuando estén activas, recibir avisos importantes y contactar al negocio.',
      'El cliente debe ingresar información real y suficiente para coordinar la atención: nombre, WhatsApp, ubicación y referencia de entrega.',
    ],
  },
  {
    title: '2. Confirmación de pedidos',
    paragraphs: [
      'Todo pedido puede entrar inicialmente como Por Confirmar. El negocio revisa disponibilidad, ubicación, método de pago y detalles necesarios antes de preparar.',
      'El pedido se considera aceptado cuando cambia a Recibido, Preparando, Enviado o Entregado. El negocio puede cancelar pedidos por falta de stock, datos incompletos, ubicación no atendida, pago no validado o imposibilidad de contacto.',
    ],
  },
  {
    title: '3. Pagos y comprobantes',
    paragraphs: [
      'Los métodos disponibles pueden incluir efectivo, Deuna, transferencia bancaria y tarjeta, según lo que el negocio tenga activo.',
      'En efectivo, el pago se realiza contra entrega. En Deuna, transferencia o tarjeta, el pedido puede requerir validación antes de avanzar. Si el comprobante, monto o referencia no coincide, el pedido puede quedar pendiente, rechazado o cancelado.',
    ],
  },
  {
    title: '4. Entregas y ubicación',
    paragraphs: [
      'El cliente debe marcar una ubicación lo más exacta posible y escribir una referencia clara, como color de casa, entrada, calle, negocio cercano o punto de encuentro.',
      'Los tiempos de entrega son estimados y pueden variar por distancia, clima, tráfico, cantidad de productos, disponibilidad o coordinación con el cliente.',
    ],
  },
  {
    title: '5. Cambios, cancelaciones y disponibilidad',
    paragraphs: [
      'Los productos están sujetos a disponibilidad. Si un producto se agota, cambia de precio o requiere confirmación, el negocio podrá informarlo antes de preparar.',
      'En productos de valor variable, como compras por monto, el valor elegido por el cliente sirve como referencia del pedido.',
    ],
  },
  {
    title: '6. Pollazo Plus',
    paragraphs: [
      'Pollazo Plus es una membresía mensual que puede incluir delivery gratis dentro de cobertura, prioridad operativa, avisos importantes y regalos sorpresa cuando el negocio los active.',
      'Los beneficios aplican mientras la membresía esté activa. El negocio podrá revisar, pausar o cancelar beneficios si detecta abuso, datos falsos, pagos no válidos o uso indebido.',
    ],
  },
  {
    title: '7. Niveles, puntos, ranking y promociones',
    paragraphs: [
      'La app puede mostrar niveles, progreso del cliente, puntos de temporada, rankings, premios o dinámicas promocionales.',
      'Los puntos no son dinero, no son transferibles y no garantizan premio salvo que una temporada activa lo indique claramente.',
    ],
  },
  {
    title: '8. Notificaciones y rastreo',
    paragraphs: [
      'La app puede pedir permiso para enviar notificaciones importantes sobre estados del pedido, pago, entrega, regalos Plus, membresía, seguridad o novedades relevantes.',
      'Las notificaciones se usan para mejorar la experiencia del cliente, no para enviar spam. El cliente puede administrar permisos desde la configuración de su navegador o celular.',
    ],
  },
  {
    title: '9. Privacidad y datos personales',
    paragraphs: [
      'La app puede guardar datos como nombre, teléfono, avatar, ubicación de entrega, referencia, historial de pedidos, método de pago, estado de pago, opiniones, puntos, membresía y estadísticas de uso.',
      'Estos datos se usan para procesar pedidos, coordinar entregas, mejorar la atención, prevenir pedidos falsos, mostrar historial, entregar beneficios y administrar el servicio. No vendemos los datos del cliente a anunciantes.',
    ],
  },
  {
    title: '10. Uso responsable y seguridad',
    paragraphs: [
      'Está prohibido usar números ajenos, ubicaciones falsas, pedidos de broma, abuso de promociones, suplantación de identidad o manipulación del sistema de puntos.',
      'Si se detecta abuso, el negocio puede cancelar pedidos, bloquear beneficios, marcar al cliente como riesgoso o restringir atención por la app.',
    ],
  },
  {
    title: '11. Productos o zonas con restricción',
    paragraphs: [
      'Si el catálogo incluye productos con restricción por edad, disponibilidad especial o control operativo, el negocio podrá pedir verificación, limitar la venta o retirarlos de la app.',
      'Algunas zonas, horarios o entregas pueden requerir confirmación adicional antes de aceptar el pedido.',
    ],
  },
];

const enSections: LegalSectionCopy[] = [
  {
    title: '1. App use',
    paragraphs: [
      'The app lets you view products, build orders, save delivery details, review history, join active points dynamics, receive important alerts and contact the business.',
      'Customers must enter real and sufficient information to coordinate service: name, WhatsApp, location and delivery reference.',
    ],
  },
  {
    title: '2. Order confirmation',
    paragraphs: [
      'Every order may start as Pending Confirmation. The business reviews availability, location, payment method and required details before preparing it.',
      'The order is accepted when it changes to Received, Preparing, Sent or Delivered. The business may cancel orders due to lack of stock, incomplete data, unsupported location, unvalidated payment or inability to contact the customer.',
    ],
  },
  {
    title: '3. Payments and receipts',
    paragraphs: [
      'Available methods may include cash, Deuna, bank transfer and card, depending on what the business has active.',
      'Cash is paid on delivery. Deuna, transfer or card may require validation before the order moves forward. If the receipt, amount or reference does not match, the order may remain pending, be rejected or cancelled.',
    ],
  },
  {
    title: '4. Delivery and location',
    paragraphs: [
      'Customers must mark the most accurate location possible and write a clear reference, such as house color, entrance, street, nearby shop or meeting point.',
      'Delivery times are estimates and may vary due to distance, weather, traffic, product quantity, availability or coordination with the customer.',
    ],
  },
  {
    title: '5. Changes, cancellations and availability',
    paragraphs: [
      'Products are subject to availability. If a product runs out, changes price or needs confirmation, the business may inform the customer before preparing.',
      'For variable-value products, the selected value works as a reference for the order.',
    ],
  },
  {
    title: '6. Pollazo Plus',
    paragraphs: [
      'Pollazo Plus is a monthly membership that may include free delivery within coverage, operational priority, important alerts and surprise gifts when activated by the business.',
      'Benefits apply while the membership is active. The business may review, pause or cancel benefits if abuse, false data, invalid payments or misuse is detected.',
    ],
  },
  {
    title: '7. Levels, points, ranking and promotions',
    paragraphs: [
      'The app may show levels, customer progress, seasonal points, rankings, rewards or promotional dynamics.',
      'Points are not money, are not transferable and do not guarantee a reward unless an active season clearly says so.',
    ],
  },
  {
    title: '8. Notifications and tracking',
    paragraphs: [
      'The app may request permission to send important notifications about order status, payment, delivery, Plus gifts, membership, security or relevant updates.',
      'Notifications are used to improve the customer experience, not to send spam. Customers may manage permissions from their browser or phone settings.',
    ],
  },
  {
    title: '9. Privacy and personal data',
    paragraphs: [
      'The app may save data such as name, phone, avatar, delivery location, reference, order history, payment method, payment status, reviews, points, membership and usage statistics.',
      'This data is used to process orders, coordinate deliveries, improve service, prevent fake orders, show history, deliver benefits and administer the service. We do not sell customer data to advertisers.',
    ],
  },
  {
    title: '10. Responsible use and security',
    paragraphs: [
      'Using other people’s numbers, fake locations, joke orders, promotion abuse, identity impersonation or points manipulation is prohibited.',
      'If abuse is detected, the business may cancel orders, block benefits, mark the customer as risky or restrict app service.',
    ],
  },
  {
    title: '11. Restricted products or areas',
    paragraphs: [
      'If the catalog includes products with age, special availability or operational restrictions, the business may request verification, limit the sale or remove them from the app.',
      'Some areas, schedules or deliveries may require additional confirmation before accepting the order.',
    ],
  },
];

const localizedSectionNames: Record<LanguageCode, string[]> = {
  es: esSections.map(section => section.title),
  en: enSections.map(section => section.title),
  pt: ['1. Uso do app', '2. Confirmação de pedidos', '3. Pagamentos e comprovantes', '4. Entregas e localização', '5. Mudanças e disponibilidade', '6. Pollazo Plus', '7. Níveis e pontos', '8. Notificações e rastreamento', '9. Privacidade e dados', '10. Uso responsável', '11. Produtos ou zonas restritas'],
  fr: ['1. Utilisation de l’app', '2. Confirmation des commandes', '3. Paiements et justificatifs', '4. Livraison et localisation', '5. Changements et disponibilité', '6. Pollazo Plus', '7. Niveaux et points', '8. Notifications et suivi', '9. Confidentialité et données', '10. Usage responsable', '11. Produits ou zones restreints'],
  de: ['1. Nutzung der App', '2. Bestellbestätigung', '3. Zahlungen und Belege', '4. Lieferung und Standort', '5. Änderungen und Verfügbarkeit', '6. Pollazo Plus', '7. Level und Punkte', '8. Benachrichtigungen und Tracking', '9. Datenschutz und Daten', '10. Verantwortliche Nutzung', '11. Eingeschränkte Produkte oder Gebiete'],
  it: ['1. Uso dell’app', '2. Conferma ordini', '3. Pagamenti e ricevute', '4. Consegna e posizione', '5. Cambi e disponibilità', '6. Pollazo Plus', '7. Livelli e punti', '8. Notifiche e tracciamento', '9. Privacy e dati', '10. Uso responsabile', '11. Prodotti o zone limitate'],
  zh: ['1. 应用使用', '2. 订单确认', '3. 支付与凭证', '4. 配送和位置', '5. 变更和库存', '6. Pollazo Plus', '7. 等级与积分', '8. 通知和追踪', '9. 隐私和数据', '10. 负责任使用', '11. 受限商品或区域'],
  ja: ['1. アプリ利用', '2. 注文確認', '3. 支払いと証明', '4. 配送と位置', '5. 変更と在庫', '6. Pollazo Plus', '7. レベルとポイント', '8. 通知と追跡', '9. プライバシーとデータ', '10. 責任ある利用', '11. 制限商品または地域'],
  nl: ['1. App-gebruik', '2. Bestelbevestiging', '3. Betalingen en bewijzen', '4. Levering en locatie', '5. Wijzigingen en beschikbaarheid', '6. Pollazo Plus', '7. Niveaus en punten', '8. Meldingen en tracking', '9. Privacy en gegevens', '10. Verantwoord gebruik', '11. Beperkte producten of zones'],
  ru: ['1. Использование приложения', '2. Подтверждение заказов', '3. Платежи и чеки', '4. Доставка и местоположение', '5. Изменения и наличие', '6. Pollazo Plus', '7. Уровни и баллы', '8. Уведомления и отслеживание', '9. Конфиденциальность и данные', '10. Ответственное использование', '11. Ограниченные товары или зоны'],
};

function getLegalSections(language: LanguageCode) {
  if (language === 'es') return esSections;
  if (language === 'en') return enSections;

  const names = localizedSectionNames[language] || localizedSectionNames.en;

  return enSections.map((section, index) => ({
    title: names[index] || section.title,
    paragraphs: section.paragraphs,
  }));
}

function getScrollRequiredText(language: LanguageCode) {
  if (language === 'en') return 'Scroll to the end to enable continue.';
  if (language === 'pt') return 'Role até o final para continuar.';
  if (language === 'fr') return 'Faites défiler jusqu’à la fin pour continuer.';
  if (language === 'de') return 'Scrolle bis zum Ende, um fortzufahren.';
  if (language === 'it') return 'Scorri fino alla fine per continuare.';
  if (language === 'zh') return '请滚动到底部以继续。';
  if (language === 'ja') return '最後までスクロールして続行してください。';
  if (language === 'nl') return 'Scroll naar het einde om verder te gaan.';
  if (language === 'ru') return 'Прокрутите до конца, чтобы продолжить.';
  return 'Desliza hasta el final para continuar.';
}

export default function LegalModal({
  isOpen,
  onClose,
  mode = 'auto',
}: Props) {
  const { language, t } = useLanguage();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const hasAccepted =
    typeof window !== 'undefined' &&
    window.localStorage.getItem(LEGAL_ACCEPTED_KEY) === '1';

  const isRequired = mode === 'required' || (mode === 'auto' && !hasAccepted);
  const isReadOnly = !isRequired;
  const legalSections = getLegalSections(language);

  useEffect(() => {
    if (!isOpen) return undefined;

    const content = contentRef.current;

    if (!isRequired) {
      setHasReachedEnd(true);
      setShowScrollArrow(false);
      return undefined;
    }

    if (!content) return undefined;

    const updateProgress = () => {
      const canScroll = content.scrollHeight > content.clientHeight + 12;
      const distanceToBottom = content.scrollHeight - content.clientHeight - content.scrollTop;
      const reachedEnd = !canScroll || distanceToBottom <= 18;

      setHasReachedEnd(reachedEnd);
      setShowScrollArrow(canScroll && !reachedEnd);
      setIsScrolling(true);

      if (scrollIdleTimerRef.current) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }

      scrollIdleTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 760);
    };

    content.scrollTo({ top: 0, behavior: 'auto' });
    updateProgress();
    content.addEventListener('scroll', updateProgress, { passive: true });

    const previewTimer = window.setTimeout(() => {
      const target = Math.min(76, content.scrollHeight - content.clientHeight);
      if (target <= 0) return;

      content.scrollTo({ top: target, behavior: 'smooth' });

      window.setTimeout(() => {
        content.scrollTo({ top: 0, behavior: 'smooth' });
      }, 850);
    }, 360);

    return () => {
      content.removeEventListener('scroll', updateProgress);
      window.clearTimeout(previewTimer);
      if (scrollIdleTimerRef.current) window.clearTimeout(scrollIdleTimerRef.current);
    };
  }, [isOpen, isRequired, language]);

  if (!isOpen) return null;

  const handlePrimaryAction = () => {
    if (isRequired && !hasReachedEnd) return;

    if (isRequired && typeof window !== 'undefined') {
      window.localStorage.setItem(LEGAL_ACCEPTED_KEY, '1');
    }

    onClose();
  };

  const scrollToEnd = () => {
    const content = contentRef.current;
    if (!content) return;

    content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
  };

  const modalTitle = isRequired
    ? t('legal.required.title')
    : t('legal.read.title');

  const modalSubtitle = isRequired
    ? t('legal.required.subtitle')
    : t('legal.read.subtitle');

  return (
    <div className="fixed inset-0 z-[12000] flex items-end sm:items-center justify-center bg-orange-950/20 p-0 sm:p-4">
      <style>{`
        @keyframes pollazoLegalArrowBounce {
          0%, 100% { transform: translateY(0); opacity: 0.9; }
          50% { transform: translateY(8px); opacity: 1; }
        }

        .pollazo-legal-arrow {
          animation: pollazoLegalArrowBounce 1.05s ease-in-out infinite;
        }

        .pollazo-legal-scroll {
          scrollbar-width: none;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .pollazo-legal-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .pollazo-legal-scroll::-webkit-scrollbar-thumb,
        .pollazo-legal-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }

        .pollazo-legal-scroll.is-scrolling {
          scrollbar-width: thin;
          scrollbar-color: #fb923c #fff7ed;
        }

        .pollazo-legal-scroll.is-scrolling::-webkit-scrollbar-thumb {
          background: #fb923c;
        }

        .pollazo-legal-scroll.is-scrolling::-webkit-scrollbar-track {
          background: #fff7ed;
        }
      `}</style>

      {isReadOnly ? (
        <button
          type="button"
          aria-label={t('common.close')}
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
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {isRequired && (
            <div className="mt-4 bg-orange-50 border border-orange-100 rounded-[24px] p-3 flex items-start gap-3">
              <ShieldCheck size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
                {t('legal.required.notice')}
              </p>
            </div>
          )}
        </header>

        <div
          ref={contentRef}
          className={`pollazo-legal-scroll flex-1 overflow-y-auto p-4 space-y-4 pb-8 ${isScrolling ? 'is-scrolling' : ''}`}
        >
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
                    {t('legal.hero.kicker')}
                  </p>

                  <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">
                    {t('legal.hero.title')}
                  </h3>

                  <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-3">
                    {t('legal.hero.text')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5">
                <MiniLegalCard
                  icon={<FileText size={18} />}
                  title={t('legal.category.orders')}
                  text={t('legal.category.orders_text')}
                />

                <MiniLegalCard
                  icon={<CreditCard size={18} />}
                  title={t('legal.category.payments')}
                  text={t('legal.category.payments_text')}
                />

                <MiniLegalCard
                  icon={<Lock size={18} />}
                  title={t('legal.category.data')}
                  text={t('legal.category.data_text')}
                />
              </div>
            </div>
          </section>

          <div className="px-1">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.24em]">
              {t('legal.info_title')}
            </p>
          </div>

          {legalSections.map((section, index) => (
            <Section
              key={section.title}
              icon={SECTION_ICONS[index] || <FileText size={20} />}
              title={section.title}
            >
              {section.paragraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Section>
          ))}

          <div className="px-1 pt-1">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.24em]">
              {t('legal.help_title')}
            </p>
          </div>

          <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm space-y-3">
            <HelpItem
              icon={<ClipboardList size={18} />}
              title={t('legal.help.order')}
              text={t('legal.help.order_text')}
            />

            <HelpItem
              icon={<CreditCard size={18} />}
              title={t('legal.help.payment')}
              text={t('legal.help.payment_text')}
            />

            <HelpItem
              icon={<MapPin size={18} />}
              title={t('legal.help.location')}
              text={t('legal.help.location_text')}
            />

            <HelpItem
              icon={<BellRing size={18} />}
              title={t('legal.help.notifications')}
              text={t('legal.help.notifications_text')}
            />

            <HelpItem
              icon={<Smartphone size={18} />}
              title={t('legal.help.security')}
              text={t('legal.help.security_text')}
            />

            <HelpItem
              icon={<UserCheck size={18} />}
              title={t('legal.help.data')}
              text={t('legal.help.data_text')}
            />

            <a
              href={WHATSAPP_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white px-4 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              {t('legal.whatsapp')}
            </a>
          </section>

          <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4">
            <div className="flex items-start gap-3">
              <Star size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
                {t('legal.update_note')}
              </p>
            </div>
          </div>
        </div>

        {isRequired && showScrollArrow && (
          <button
            type="button"
            onClick={scrollToEnd}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 z-20 -translate-x-1/2 text-orange-500 drop-shadow-[0_2px_6px_rgba(124,45,18,0.35)] active:scale-90 transition-transform"
            aria-label="Ir al final de términos y condiciones"
          >
            <ChevronDown className="pollazo-legal-arrow" size={30} strokeWidth={4} />
          </button>
        )}

        <footer className="flex-shrink-0 bg-white/95 border-t border-orange-100 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]">
          {isRequired && !hasReachedEnd ? (
            <div className="flex items-center justify-center gap-2 py-3 text-center text-[9px] font-black uppercase tracking-widest text-orange-500">
              <ChevronDown size={15} className="animate-bounce" />
              {getScrollRequiredText(language)}
            </div>
          ) : (
            <>
              <p className="text-[9px] font-bold text-gray-400 leading-relaxed text-center mb-3">
                {isRequired
                  ? t('legal.footer_required')
                  : t('legal.footer_read')}
              </p>

              <button
                type="button"
                onClick={handlePrimaryAction}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-5 rounded-[26px] font-black text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-200 border-b-4 border-orange-600 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={17} />
                {isRequired ? t('legal.accept') : t('legal.close_reading')}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
