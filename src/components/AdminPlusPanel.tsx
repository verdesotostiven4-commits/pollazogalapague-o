import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  Filter,
  Gift,
  Phone,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import type { PaymentMethod } from '../types';

type MembershipFilter = 'pending' | 'active' | 'all';
type PlusPaymentMethod = Extract<PaymentMethod, 'efectivo' | 'deuna' | 'transferencia'>;

const cleanPhone = (phone?: string | null) => String(phone || '').replace(/\D/g, '');

const phoneTail = (phone?: string | null) => cleanPhone(phone).slice(-9);

const prettyPhone = (phone?: string | null) => {
  const clean = cleanPhone(phone);

  if (!clean) return 'Sin teléfono';

  return clean.length >= 10 ? `+${clean}` : clean;
};

const whatsappLink = (phone?: string | null) => {
  const clean = cleanPhone(phone);
  return clean ? `https://wa.me/${clean}` : '#';
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value || '').trim();

  if (!raw) return 0;

  const normalized = raw
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const numeric = Number.parseFloat(normalized);

  return Number.isFinite(numeric) ? numeric : 0;
};

const money = (value: unknown) => toNumber(value).toFixed(2);

const isToday = (value?: string | null) => {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isThisMonth = (value?: string | null) => {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const isMembershipActive = (membership: any) => {
  if (!membership || membership.status !== 'active') return false;

  if (!membership.expires_at) return true;

  return new Date(membership.expires_at).getTime() > Date.now();
};

const formatDateShort = (value?: string | null) => {
  if (!value) return '--';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '--';

  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const paymentIcon = (method?: string | null) => {
  if (method === 'efectivo') return <Banknote size={13} />;
  if (method === 'deuna') return <QrCode size={13} />;
  if (method === 'transferencia') return <Building size={13} />;
  return <Wallet size={13} />;
};

const paymentLabel = (method?: string | null) => {
  if (method === 'efectivo') return 'Efectivo';
  if (method === 'deuna') return 'Deuna';
  if (method === 'transferencia') return 'Transferencia';
  if (method === 'tarjeta') return 'Tarjeta';
  return 'No definido';
};

const paymentStatusLabel = (status?: string | null) => {
  if (status === 'pendiente') return 'Pendiente';
  if (status === 'validando') return 'Validando';
  if (status === 'confirmado') return 'Confirmado';
  if (status === 'rechazado') return 'Rechazado';
  if (status === 'contra_entrega') return 'Contra entrega';
  return 'Sin estado';
};

const paymentStatusTone = (status?: string | null) => {
  if (status === 'confirmado') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'validando') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'contra_entrega') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (status === 'rechazado') return 'bg-red-50 text-red-500 border-red-100';

  return 'bg-gray-50 text-gray-500 border-gray-100';
};

const membershipStatusLabel = (status?: string | null) => {
  if (status === 'pending') return 'Pendiente';
  if (status === 'active') return 'Activa';
  if (status === 'expired') return 'Vencida';
  if (status === 'cancelled') return 'Cancelada';
  return 'Sin estado';
};

const membershipStatusTone = (status?: string | null) => {
  if (status === 'active') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'pending') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (status === 'expired') return 'bg-slate-50 text-slate-500 border-slate-100';
  if (status === 'cancelled') return 'bg-red-50 text-red-500 border-red-100';

  return 'bg-gray-50 text-gray-500 border-gray-100';
};

function PlusStatCard({
  label,
  value,
  detail,
  icon,
  tone = 'orange',
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
  tone?: 'orange' | 'green' | 'blue' | 'yellow' | 'slate';
}) {
  const tones = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <div className="bg-white rounded-[28px] border border-gray-100 p-4 shadow-sm min-w-[140px]">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border mb-3 ${tones[tone]}`}>
        {icon}
      </div>

      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
        {label}
      </p>

      <p className="text-2xl font-black text-gray-900 mt-2 leading-none">
        {value}
      </p>

      {detail && (
        <p className="text-[9px] font-bold text-gray-400 mt-2 leading-tight">
          {detail}
        </p>
      )}
    </div>
  );
}

export default function AdminPlusPanel() {
  const context = useAdmin();

  const {
    customers,
    orders,
    memberships,
    membershipPayments,
    orderBonusItems,
    activateMembership,
    cancelMembership,
    expireMembership,
    addVipGiftToOrder,
    refreshData,
  } = context;

  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('pending');
  const [activationMethod, setActivationMethod] = useState<Record<string, PlusPaymentMethod>>({});
  const [giftDraft, setGiftDraft] = useState<Record<string, { name: string; quantity: string; message: string }>>({});
  const [giftSavingOrderId, setGiftSavingOrderId] = useState<string | null>(null);

  const plusStats = useMemo(() => {
    const pendingMemberships = memberships.filter(membership => membership.status === 'pending');
    const activeMemberships = memberships.filter(isMembershipActive);
    const expiredMemberships = memberships.filter(membership => membership.status === 'expired');
    const cancelledMemberships = memberships.filter(membership => membership.status === 'cancelled');

    const confirmedPayments = membershipPayments.filter(
      payment => payment.payment_status === 'confirmado'
    );

    const todayPayments = confirmedPayments.filter(payment =>
      isToday(payment.confirmed_at || payment.updated_at || payment.created_at)
    );

    const monthPayments = confirmedPayments.filter(payment =>
      isThisMonth(payment.confirmed_at || payment.updated_at || payment.created_at)
    );

    return {
      pendingMemberships,
      activeMemberships,
      expiredMemberships,
      cancelledMemberships,
      confirmedPayments,
      todayPayments,
      monthPayments,
      todayIncome: todayPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
      monthIncome: monthPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
      totalIncome: confirmedPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
    };
  }, [membershipPayments, memberships]);

  const visibleMemberships = useMemo(() => {
    if (membershipFilter === 'pending') return plusStats.pendingMemberships;
    if (membershipFilter === 'active') return plusStats.activeMemberships;

    return memberships;
  }, [membershipFilter, memberships, plusStats.activeMemberships, plusStats.pendingMemberships]);

  const activePlusOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.status === 'Entregado' || order.status === 'Cancelado') return false;

      const customerHasActiveMembership = plusStats.activeMemberships.some(
        membership => phoneTail(membership.customer_phone) === phoneTail(order.customer_phone)
      );

      return Boolean(order.membership_applied || customerHasActiveMembership);
    });
  }, [orders, plusStats.activeMemberships]);

  const updateGiftDraft = (
    orderId: string,
    patch: Partial<{ name: string; quantity: string; message: string }>
  ) => {
    setGiftDraft(prev => ({
      ...prev,
      [orderId]: {
        name: prev[orderId]?.name || '',
        quantity: prev[orderId]?.quantity || '1',
        message: prev[orderId]?.message || '',
        ...patch,
      },
    }));
  };

  const handleActivateMembership = async (membershipId: string) => {
    const method = activationMethod[membershipId] || 'efectivo';

    if (!window.confirm('¿Activar Pollazo Plus por 30 días para este cliente?')) return;

    try {
      await activateMembership(membershipId, method);
      await refreshData();
      window.alert('Pollazo Plus activado por 30 días.');
    } catch (error) {
      console.error(error);
      window.alert('No se pudo activar la membresía.');
    }
  };

  const handleCancelMembership = async (membershipId: string) => {
    const reason = window.prompt('Motivo de cancelación, opcional:') || '';

    if (!window.confirm('¿Cancelar esta membresía Pollazo Plus?')) return;

    try {
      await cancelMembership(membershipId, reason || null);
      await refreshData();
    } catch (error) {
      console.error(error);
      window.alert('No se pudo cancelar la membresía.');
    }
  };

  const handleExpireMembership = async (membershipId: string) => {
    if (!window.confirm('¿Marcar esta membresía como vencida?')) return;

    try {
      await expireMembership(membershipId);
      await refreshData();
    } catch (error) {
      console.error(error);
      window.alert('No se pudo vencer la membresía.');
    }
  };

  const handleAddVipGift = async (orderId: string) => {
    const draft = giftDraft[orderId] || { name: '', quantity: '1', message: '' };
    const itemName = draft.name.trim();

    if (!itemName) {
      window.alert('Escribe qué regalo vas a agregar.');
      return;
    }

    setGiftSavingOrderId(orderId);

    try {
      await addVipGiftToOrder(orderId, {
        item_name: itemName,
        quantity: Math.max(1, toNumber(draft.quantity || 1)),
        reason: 'Regalo Pollazo Plus',
        message: draft.message.trim() || null,
        added_by_admin: 'admin',
      });

      setGiftDraft(prev => ({
        ...prev,
        [orderId]: {
          name: '',
          quantity: '1',
          message: '',
        },
      }));

      await refreshData();
      window.alert('Regalo VIP agregado y notificación enviada.');
    } catch (error) {
      console.error(error);
      window.alert('No se pudo agregar el regalo VIP.');
    } finally {
      setGiftSavingOrderId(null);
    }
  };

  return (
    <div className="space-y-5 pb-10 animate-in fade-in duration-500">
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 rounded-[34px] p-5 text-white shadow-2xl shadow-orange-100 overflow-hidden relative">
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute -left-16 bottom-0 w-44 h-44 bg-yellow-400/10 rounded-full blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">
              Pollazo Plus
            </p>

            <h2 className="text-2xl font-black uppercase italic mt-2 leading-none">
              Membresías $6.99/mes
            </h2>

            <p className="text-[11px] font-bold text-white/55 mt-2 leading-relaxed">
              Activa clientes Plus, controla ingresos y agrega regalos VIP a pedidos activos.
            </p>
          </div>

          <div className="w-14 h-14 rounded-3xl bg-white/10 border border-white/10 flex items-center justify-center text-yellow-300 shadow-lg">
            <Crown size={28} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <PlusStatCard
          label="Pendientes"
          value={plusStats.pendingMemberships.length}
          detail="Por confirmar pago"
          icon={<Clock size={18} />}
          tone="orange"
        />

        <PlusStatCard
          label="Activas"
          value={plusStats.activeMemberships.length}
          detail="Con delivery gratis"
          icon={<Crown size={18} />}
          tone="yellow"
        />

        <PlusStatCard
          label="Hoy"
          value={`$${money(plusStats.todayIncome)}`}
          detail={`${plusStats.todayPayments.length} pagos`}
          icon={<DollarSign size={18} />}
          tone="green"
        />

        <PlusStatCard
          label="Este mes"
          value={`$${money(plusStats.monthIncome)}`}
          detail={`${plusStats.monthPayments.length} pagos`}
          icon={<TrendingUp size={18} />}
          tone="blue"
        />

        <PlusStatCard
          label="Total Plus"
          value={`$${money(plusStats.totalIncome)}`}
          detail={`${plusStats.confirmedPayments.length} pagos confirmados`}
          icon={<Wallet size={18} />}
          tone="slate"
        />
      </section>

      <section className="bg-white rounded-[32px] p-4 border border-gray-100 shadow-sm space-y-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            {
              id: 'pending' as const,
              label: 'Pendientes',
              count: plusStats.pendingMemberships.length,
              Icon: Clock,
            },
            {
              id: 'active' as const,
              label: 'Activas',
              count: plusStats.activeMemberships.length,
              Icon: Crown,
            },
            {
              id: 'all' as const,
              label: 'Todas',
              count: memberships.length,
              Icon: Filter,
            },
          ].map(filter => {
            const Icon = filter.Icon;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setMembershipFilter(filter.id)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                  membershipFilter === filter.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                    : 'bg-white text-gray-400 border-gray-100'
                }`}
              >
                <Icon size={13} />
                {filter.label}

                <span
                  className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[8px] ${
                    membershipFilter === filter.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        {visibleMemberships.length === 0 && (
          <div className="bg-white rounded-[32px] p-10 text-center border border-gray-100 shadow-sm">
            <Crown size={38} className="mx-auto text-orange-300 mb-3" />
            <p className="text-gray-900 font-black uppercase">
              No hay membresías aquí
            </p>
            <p className="text-gray-400 text-xs font-bold mt-1">
              Cuando un cliente solicite Pollazo Plus aparecerá en esta sección.
            </p>
          </div>
        )}

        {visibleMemberships.map(membership => {
          const customer = customers.find(
            current => phoneTail(current.phone) === phoneTail(membership.customer_phone)
          );

          const selectedMethod =
            activationMethod[membership.id] ||
            (membership.payment_method as PlusPaymentMethod) ||
            'efectivo';

          return (
            <div
              key={membership.id}
              className="bg-white rounded-[32px] border border-gray-100 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      customer?.avatar_url ||
                      `https://api.dicebear.com/8.x/adventurer/svg?seed=${membership.customer_phone}`
                    }
                    className="w-12 h-12 rounded-2xl border-2 border-orange-100 shadow-sm object-cover flex-shrink-0"
                    alt="Cliente Plus"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-xs uppercase leading-none truncate">
                        {membership.customer_name || customer?.name || 'Cliente Pollazo'}
                      </p>

                      <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-full border ${membershipStatusTone(membership.status)}`}>
                        {membershipStatusLabel(membership.status)}
                      </span>
                    </div>

                    <a
                      href={whatsappLink(membership.customer_phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 mt-2 bg-green-50 px-2 py-1 rounded-lg border border-green-100"
                    >
                      <Phone size={10} />
                      {prettyPhone(membership.customer_phone)}
                    </a>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-orange-600 leading-none">
                    ${money(membership.price || 6.99)}
                  </p>
                  <p className="text-[8px] font-black text-gray-400 uppercase mt-1">
                    mensual
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Plan
                  </p>
                  <p className="text-[10px] font-black text-slate-700 uppercase mt-1">
                    {membership.plan_name || 'Pollazo Plus'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Método
                  </p>
                  <p className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1 mt-1">
                    {paymentIcon(membership.payment_method)}
                    {paymentLabel(membership.payment_method)}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Inicio
                  </p>
                  <p className="text-[10px] font-black text-slate-700 uppercase mt-1">
                    {formatDateShort(membership.started_at)}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Vence
                  </p>
                  <p className="text-[10px] font-black text-slate-700 uppercase mt-1">
                    {formatDateShort(membership.expires_at)}
                  </p>
                </div>
              </div>

              {membership.status === 'pending' && (
                <div className="bg-orange-50 border border-orange-100 rounded-[26px] p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white text-orange-500 flex items-center justify-center shadow-sm flex-shrink-0">
                      <ShieldCheck size={20} />
                    </div>

                    <div>
                      <p className="text-xs font-black text-orange-700 uppercase">
                        Confirmar pago y activar
                      </p>
                      <p className="text-[10px] font-bold text-orange-700/75 mt-1 leading-relaxed">
                        Cuando revises el pago, activa la membresía por 30 días.
                        El cliente tendrá delivery gratis automáticamente.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['efectivo', 'deuna', 'transferencia'] as PlusPaymentMethod[]).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() =>
                          setActivationMethod(prev => ({
                            ...prev,
                            [membership.id]: method,
                          }))
                        }
                        className={`rounded-2xl border py-3 text-[8px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-all ${
                          selectedMethod === method
                            ? 'bg-slate-950 text-white border-slate-950'
                            : 'bg-white text-slate-500 border-orange-100'
                        }`}
                      >
                        {paymentIcon(method)}
                        {paymentLabel(method)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleActivateMembership(membership.id)}
                      className="bg-green-500 text-white py-3.5 rounded-2xl font-black text-[9px] uppercase active:scale-95 transition-all shadow-md shadow-green-100 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      Activar 30 días
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelMembership(membership.id)}
                      className="bg-red-50 text-red-500 py-3.5 rounded-2xl font-black text-[9px] uppercase border border-red-100 active:scale-95 transition-all"
                    >
                      Rechazar / cancelar
                    </button>
                  </div>
                </div>
              )}

              {membership.status === 'active' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleExpireMembership(membership.id)}
                    className="bg-slate-950 text-white py-3.5 rounded-2xl font-black text-[9px] uppercase active:scale-95 transition-all"
                  >
                    Marcar vencida
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCancelMembership(membership.id)}
                    className="bg-red-50 text-red-500 py-3.5 rounded-2xl font-black text-[9px] uppercase border border-red-100 active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded-[32px] border border-gray-100 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase italic">
              Pedidos Plus activos
            </p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">
              Aquí puedes agregar regalos VIP manuales y notificar al cliente.
            </p>
          </div>

          <Gift size={22} className="text-orange-500" />
        </div>

        {activePlusOrders.length === 0 ? (
          <p className="text-xs font-bold text-gray-400 text-center bg-gray-50 rounded-2xl p-5">
            No hay pedidos activos de clientes Plus ahora.
          </p>
        ) : (
          <div className="space-y-3">
            {activePlusOrders.map(order => {
              const customer = customers.find(
                current => phoneTail(current.phone) === phoneTail(order.customer_phone)
              );

              const draft = giftDraft[order.id] || {
                name: '',
                quantity: '1',
                message: '',
              };

              const gifts = Array.isArray(order.bonus_items)
                ? order.bonus_items
                : orderBonusItems.filter(
                    item => item.order_code === order.order_code || item.order_id === order.id
                  );

              return (
                <div
                  key={order.id}
                  className="bg-slate-950 text-white rounded-[28px] p-4 space-y-3 overflow-hidden relative"
                >
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl" />

                  <div className="relative flex justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black text-yellow-300 uppercase tracking-widest">
                        Pedido Plus
                      </p>
                      <p className="text-sm font-black uppercase mt-1">
                        {order.order_code || 'Pedido'} · {customer?.name || prettyPhone(order.customer_phone)}
                      </p>
                      <p className="text-[10px] font-bold text-white/45 mt-1">
                        Estado: {order.status} · Total ${money(order.total)}
                      </p>
                    </div>

                    <a
                      href={whatsappLink(order.customer_phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 h-10 rounded-2xl bg-green-500 text-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                      aria-label="Abrir WhatsApp"
                    >
                      <Phone size={17} />
                    </a>
                  </div>

                  {gifts.length > 0 && (
                    <div className="relative bg-white/8 border border-white/10 rounded-2xl p-3 space-y-2">
                      <p className="text-[9px] font-black text-yellow-200 uppercase flex items-center gap-2">
                        <Gift size={13} />
                        Regalos agregados
                      </p>

                      {gifts.map((gift: any, index: number) => (
                        <div
                          key={`${gift.id || gift.item_name}-${index}`}
                          className="bg-white/8 rounded-xl px-3 py-2 flex justify-between gap-3"
                        >
                          <span className="text-[10px] font-black uppercase truncate">
                            {money(gift.quantity || 1).replace('.00', '')}x {gift.item_name}
                          </span>

                          <span className="text-[8px] font-black text-yellow-200 uppercase">
                            VIP
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative space-y-2">
                    <div className="grid grid-cols-[1fr_72px] gap-2">
                      <input
                        value={draft.name}
                        onChange={event => updateGiftDraft(order.id, { name: event.target.value })}
                        placeholder="Ej: 5 verdes, 1 cola..."
                        className="bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-[10px] font-bold outline-none placeholder:text-white/30"
                      />

                      <input
                        value={draft.quantity}
                        onChange={event => updateGiftDraft(order.id, { quantity: event.target.value })}
                        type="number"
                        min="1"
                        className="bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-[10px] font-bold outline-none text-center"
                      />
                    </div>

                    <input
                      value={draft.message}
                      onChange={event => updateGiftDraft(order.id, { message: event.target.value })}
                      placeholder="Mensaje opcional para el cliente"
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-[10px] font-bold outline-none placeholder:text-white/30"
                    />

                    <button
                      type="button"
                      onClick={() => handleAddVipGift(order.id)}
                      disabled={giftSavingOrderId === order.id}
                      className={`w-full bg-yellow-400 text-yellow-950 py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                        giftSavingOrderId === order.id ? 'opacity-60 cursor-wait' : ''
                      }`}
                    >
                      <Gift size={13} />
                      {giftSavingOrderId === order.id ? 'Agregando...' : 'Agregar y notificar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-[32px] border border-gray-100 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase italic">
              Pagos recientes Plus
            </p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">
              Registro de ingresos por membresías.
            </p>
          </div>

          <ReceiptText size={22} className="text-orange-500" />
        </div>

        {membershipPayments.length > 0 ? (
          <div className="space-y-2">
            {membershipPayments.slice(0, 10).map(payment => (
              <div
                key={payment.id}
                className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-gray-800 uppercase truncate">
                    {payment.customer_name || prettyPhone(payment.customer_phone)}
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 mt-1">
                    {formatDateShort(payment.created_at)} · {paymentLabel(payment.payment_method)}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-gray-900">
                    ${money(payment.amount)}
                  </p>

                  <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-full border ${paymentStatusTone(payment.payment_status)}`}>
                    {paymentStatusLabel(payment.payment_status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-bold text-gray-400 text-center bg-gray-50 rounded-2xl p-5">
            Aún no hay pagos de membresía registrados.
          </p>
        )}
      </section>
    </div>
  );
}
