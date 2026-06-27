import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Gift, ShieldCheck, Truck, X, WalletCards } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import type { Screen } from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
}

const PLUS_PRICE = 6.99;

const copy = {
  es: {
    small: 'La Casa del Pollazo',
    title: 'Renueva tus beneficios Plus',
    subtitle: 'Recupera delivery gratis dentro de cobertura, prioridad y beneficios especiales en pedidos seleccionados.',
    delivery: 'Delivery gratis', deliveryDesc: 'Todo el mes', gifts: 'Beneficios', giftsDesc: 'Sorpresas según stock', priority: 'Prioridad', priorityDesc: 'Atención preferente', noContract: 'Sin contrato', noContractDesc: 'Puedes solicitar cancelar',
    paymentBox: 'Pago de membresía', paymentText: 'Por ahora se registra una solicitud para que el admin active Plus. Luego conectaremos el cobro real con tarjeta.', subscription: 'Suscripción mensual', month: '/ mes', renew: 'Renovar Pollazo Plus', view: 'Ver Plus',
    activeTitle: 'Tu Plus está activo', activeText: 'Revisa tu ahorro, beneficios y gestión de membresía.', totalSaving: 'Ahorro acumulado', orders: 'pedidos con Plus', help: 'Necesito ayuda', terms: 'términos y condiciones', termsTitle: 'Condiciones',
    termsIntro: 'Pollazo Plus es una membresía mensual para comprar más cómodo: delivery gratis dentro de cobertura, prioridad y beneficios especiales.', termsPaymentTitle: 'Pago mensual', termsPayment: 'Pollazo Plus tiene un valor mensual de $6.99. Por ahora se registra una solicitud y el negocio puede activarla manualmente.',
    termsDeliveryTitle: 'Delivery gratis', termsDelivery: 'El beneficio principal es delivery gratis durante el periodo activo, dentro de la zona de cobertura del negocio.', termsBenefitsTitle: 'Beneficios especiales', termsBenefits: 'Los regalos, extras o descuentos dependen de disponibilidad, stock, temporada y decisión del negocio.', termsCancelTitle: 'Cancelación', termsCancel: 'El cliente puede solicitar cancelar la membresía. Los beneficios se mantienen hasta el vencimiento del periodo correspondiente.', sent: 'Solicitud enviada. El negocio podrá activar tu Plus.', error: 'No se pudo enviar la solicitud. Intenta otra vez.', pendingTitle: 'Solicitud en revisión', pendingText: 'Cuando el negocio confirme la activación, tu app cambiará en tiempo real.'
  },
  en: {
    small: 'La Casa del Pollazo',
    title: 'Renew your Plus benefits',
    subtitle: 'Recover free delivery within coverage, priority and special benefits on selected orders.',
    delivery: 'Free delivery', deliveryDesc: 'All month', gifts: 'Benefits', giftsDesc: 'Surprises while in stock', priority: 'Priority', priorityDesc: 'Preferred service', noContract: 'No contract', noContractDesc: 'You can request cancellation',
    paymentBox: 'Membership payment', paymentText: 'For now, a request is registered so the admin can activate Plus. Later we will connect real card payment.', subscription: 'Monthly subscription', month: '/ month', renew: 'Renew Pollazo Plus', view: 'View Plus',
    activeTitle: 'Your Plus is active', activeText: 'Review your savings, benefits and membership management.', totalSaving: 'Total savings', orders: 'Plus orders', help: 'I need help', terms: 'terms and conditions', termsTitle: 'Conditions',
    termsIntro: 'Pollazo Plus is a monthly membership for easier shopping: free delivery within coverage, priority and special benefits.', termsPaymentTitle: 'Monthly payment', termsPayment: 'Pollazo Plus costs $6.99 per month. For now, a request is registered and the business can activate it manually.',
    termsDeliveryTitle: 'Free delivery', termsDelivery: 'The main benefit is free delivery during the active period, inside the business coverage area.', termsBenefitsTitle: 'Special benefits', termsBenefits: 'Gifts, extras or discounts depend on availability, stock, season and business decision.', termsCancelTitle: 'Cancellation', termsCancel: 'The customer can request cancellation. Benefits remain active until the current period expires.', sent: 'Request sent. The business can activate your Plus.', error: 'Could not send the request. Try again.', pendingTitle: 'Request under review', pendingText: 'When the business confirms activation, your app will update in real time.'
  },
};

const money = (value: number) => `$${Math.max(0, value).toFixed(2)}`;
const cleanDigits = (value?: string | null) => String(value || '').replace(/\D/g, '').slice(-9);

function BenefitTile({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-[24px] border border-orange-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">{icon}</div>
      <p className="text-[10px] font-black uppercase leading-tight text-gray-950">{title}</p>
      <p className="mt-1 text-[9px] font-bold leading-snug text-gray-500">{desc}</p>
    </div>
  );
}

export default function PollazoPlusProCard({ onNavigate }: Props) {
  const { language } = useLanguage();
  const c = language === 'es' ? copy.es : copy.en;
  const { orders, requestMembership } = useAdmin();
  const { customerPhone, customerName, hasPollazoPlus, membershipStatus, refreshMembership } = useUser();
  const [open, setOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const isPending = membershipStatus === 'pending';
  const stats = useMemo(() => {
    const phoneTail = cleanDigits(customerPhone);
    const plusOrders = (orders as any[]).filter(order => cleanDigits(order.customer_phone) === phoneTail && order.membership_applied);
    const savings = plusOrders.reduce((sum, order) => {
      const original = Number(order.delivery_fee || 0);
      const final = Number(order.delivery_fee_final || 0);
      return sum + Math.max(0, original - final, original > 0 && final === 0 ? original : 0);
    }, 0);
    return { count: plusOrders.length, savings };
  }, [customerPhone, orders]);

  const requestPlus = async () => {
    if (!customerPhone) {
      setOpen(false);
      onNavigate('cart');
      return;
    }
    setLoading(true);
    setNotice('');
    try {
      await requestMembership({ customerPhone, customerName, paymentMethod: 'tarjeta', notes: 'Solicitud Pollazo Plus desde app.' });
      await refreshMembership();
      setNotice(c.sent);
    } catch {
      setNotice(c.error);
    } finally {
      setLoading(false);
    }
  };

  const cardTitle = hasPollazoPlus ? c.activeTitle : isPending ? c.pendingTitle : c.title;
  const cardText = hasPollazoPlus ? c.activeText : isPending ? c.pendingText : c.subtitle;

  return (
    <>
      <section className="relative overflow-hidden rounded-[36px] border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-yellow-50 p-5 shadow-xl shadow-orange-100/70 transition-transform active:scale-[0.99]" onClick={() => setOpen(true)}>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white shadow-xl shadow-orange-200/70"><Crown size={29} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-orange-500">Pollazo Plus</p>
            <h3 className="mt-2 text-2xl font-black uppercase italic leading-none text-gray-950">{cardTitle}</h3>
            <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-500">{cardText}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <BenefitTile icon={<Truck size={17} />} title={c.delivery} desc={c.deliveryDesc} />
          <BenefitTile icon={<Gift size={17} />} title={c.gifts} desc={c.giftsDesc} />
          <BenefitTile icon={<ShieldCheck size={17} />} title={c.priority} desc={c.priorityDesc} />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 rounded-[28px] border border-orange-100 bg-white/90 p-3 shadow-sm">
          <div><p className="text-[8px] font-black uppercase tracking-widest text-gray-400">{c.subscription}</p><p className="mt-1 text-2xl font-black leading-none text-orange-600">{money(PLUS_PRICE)}<span className="text-[10px] font-bold text-gray-400"> {c.month}</span></p></div>
          <button type="button" onClick={event => { event.stopPropagation(); setOpen(true); }} className="rounded-[22px] bg-gradient-to-r from-orange-500 to-yellow-400 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 active:scale-95">{c.view}</button>
        </div>
      </section>

      {open && createPortal(
        <div className="fixed inset-0 z-[200000] bg-white text-gray-950 overflow-y-auto">
          <div className="relative overflow-hidden rounded-b-[34px] bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-400 px-6 pb-7 pt-[calc(env(safe-area-inset-top)+18px)] text-white">
            <button type="button" onClick={() => setOpen(false)} className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-950 shadow-lg active:scale-90" aria-label="Close"><X size={24} /></button>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-orange-600 shadow-lg"><Crown size={18} /><span className="text-sm font-black italic lowercase">plus</span></div>
            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-white/85">{c.small}</p>
            <h2 className="mt-3 text-[34px] font-black uppercase italic leading-[0.92]">{cardTitle}</h2>
            <p className="mt-5 text-sm font-bold leading-relaxed text-white/92">{cardText}</p>
          </div>
          <main className="px-6 py-6 pb-[calc(env(safe-area-inset-bottom)+26px)]">
            <div className="grid grid-cols-2 gap-3">
              <BenefitTile icon={<Truck size={17} />} title={c.delivery} desc={c.deliveryDesc} />
              <BenefitTile icon={<ShieldCheck size={17} />} title={c.priority} desc={c.priorityDesc} />
              <BenefitTile icon={<Gift size={17} />} title={c.gifts} desc={c.giftsDesc} />
              <BenefitTile icon={<Crown size={17} />} title={c.noContract} desc={c.noContractDesc} />
            </div>
            {hasPollazoPlus ? <div className="mt-5 rounded-[28px] border border-orange-100 bg-orange-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{c.totalSaving}</p><p className="mt-2 text-4xl font-black text-gray-950">{money(stats.savings)}</p><p className="mt-1 text-[11px] font-bold text-gray-500">{stats.count} {c.orders}</p></div> : <div className="mt-5 rounded-[28px] border border-orange-100 bg-orange-50 p-5"><div className="flex gap-3"><WalletCards className="mt-1 text-orange-500" size={24} /><div><p className="text-sm font-black text-gray-950">{isPending ? c.pendingTitle : c.paymentBox}</p><p className="mt-2 text-[12px] font-bold leading-relaxed text-gray-500">{isPending ? c.pendingText : c.paymentText}</p></div></div></div>}
            <div className="mt-7 rounded-[30px] border border-orange-100 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{c.subscription}</p><p className="mt-1 text-4xl font-black leading-none text-orange-600">{money(PLUS_PRICE)} <span className="text-sm font-bold text-gray-400">{c.month}</span></p></div>
            {notice && <div className="mt-4 rounded-[22px] bg-orange-50 p-3 text-[11px] font-bold text-orange-700">{notice}</div>}
            {!hasPollazoPlus && !isPending && <button type="button" disabled={loading} onClick={requestPlus} className="mt-5 h-16 w-full rounded-[26px] bg-gradient-to-r from-orange-500 to-yellow-400 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 active:scale-95 disabled:opacity-60"><Crown className="mr-2 inline" size={18} />{loading ? '...' : c.renew}</button>}
            <div className="mt-5 flex justify-center gap-3 text-[11px] font-black uppercase text-orange-600"><button type="button" onClick={() => setTermsOpen(true)}>{c.terms}</button><span>·</span><button type="button" onClick={() => onNavigate('info')}>{c.help}</button></div>
          </main>
        </div>, document.body
      )}

      {termsOpen && createPortal(
        <div className="fixed inset-0 z-[210000] flex items-end bg-gray-950/55 backdrop-blur-[1px]"><button type="button" aria-label="Close" className="absolute inset-0" onClick={() => setTermsOpen(false)} /><section className="relative z-10 max-h-[70dvh] w-full overflow-y-auto rounded-t-[34px] bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.28em] text-orange-500">Pollazo Plus</p><h3 className="mt-1 text-2xl font-black uppercase italic text-gray-950">{c.termsTitle}</h3></div><button type="button" onClick={() => setTermsOpen(false)} className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-500"><X size={24} /></button></div><p className="rounded-[24px] bg-orange-50 p-4 text-[12px] font-black leading-relaxed text-orange-800">{c.termsIntro}</p>{[[c.termsPaymentTitle, c.termsPayment], [c.termsDeliveryTitle, c.termsDelivery], [c.termsBenefitsTitle, c.termsBenefits], [c.termsCancelTitle, c.termsCancel]].map(([title, text]) => <div key={title} className="border-b border-gray-100 py-4 last:border-0"><p className="text-sm font-black uppercase text-gray-950">{title}</p><p className="mt-2 text-[12px] font-bold leading-relaxed text-gray-500">{text}</p></div>)}</section></div>, document.body
      )}
    </>
  );
}
