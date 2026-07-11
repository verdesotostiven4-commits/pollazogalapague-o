import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceRequired(content, before, after, label) {
  if (!content.includes(before)) {
    throw new Error(`Missing required block: ${label}`);
  }
  return content.replace(before, after);
}

function replaceRegexRequired(content, regex, replacement, label) {
  if (!regex.test(content)) {
    throw new Error(`Missing required regex block: ${label}`);
  }
  return content.replace(regex, replacement);
}

function patchPanelAction() {
  const path = 'server/api-handlers/panel-action.ts';
  let content = read(path);

  content = content.replace("  'confirm_order_payment',\n", '');

  content = replaceRegexRequired(
    content,
    /    case 'transition_order': \{[\s\S]*?      return \{ transition: transition\.data, order: order\.data \};\n    \}/,
    `    case 'transition_order': {
      const orderId = cleanText(payload.orderId, 100);
      const nextStatus = cleanText(payload.status, 40);
      const reason = cleanText(payload.reason, 500) || null;

      if (!ORDER_STATUSES.has(nextStatus)) throw new Error('Invalid order status');

      const transition = await supabase.rpc('transition_online_order_v3', {
        p_order_id: orderId,
        p_next_status: nextStatus,
        p_actor: panel,
        p_reason: reason,
      });
      if (transition.error) throw transition.error;

      const order = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (order.error) throw order.error;

      return { transition: transition.data, order: order.data };
    }`,
    'panel transition_order'
  );

  content = replaceRegexRequired(
    content,
    /    case 'confirm_order_payment': \{[\s\S]*?      return update\.data;\n    \}/,
    `    case 'confirm_order_payment': {
      const orderId = cleanText(payload.orderId, 100);
      const status = cleanText(payload.paymentStatus, 40);
      if (!PAYMENT_STATUSES.has(status)) throw new Error('Invalid payment status');
      if (!['confirmado', 'rechazado', 'contra_entrega'].includes(status)) {
        throw new Error('Unsupported payment transition');
      }

      const confirmation = await supabase.rpc('confirm_online_order_payment_v2', {
        p_order_id: orderId,
        p_next_status: status,
        p_actor: panel,
      });
      if (confirmation.error) throw confirmation.error;

      const order = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (order.error) throw order.error;

      return { confirmation: confirmation.data, order: order.data };
    }`,
    'panel confirm_order_payment'
  );

  write(path, content);
}

function patchAdminContext() {
  const path = 'src/context/AdminContext.tsx';
  let content = read(path);

  content = replaceRequired(
    content,
    `  cancelled_reason?: string | null;\n  counted_in_metrics?: boolean;`,
    `  cancelled_reason?: string | null;
  stock_reserved?: boolean;
  stock_released?: boolean;
  payment_confirmed_at?: string | null;
  payment_confirmed_by?: string | null;
  payment_rejected_at?: string | null;
  payment_rejected_by?: string | null;
  counted_in_metrics?: boolean;`,
    'extended order payment/stock fields'
  );

  content = replaceRequired(
    content,
    `  updateOrderStatus: (orderId: string, status: ExtendedOrder['status']) => Promise<void>;`,
    `  updateOrderStatus: (
    orderId: string,
    status: ExtendedOrder['status'],
    reason?: string | null
  ) => Promise<void>;
  confirmOrderPayment: (
    orderId: string,
    paymentStatus: Extract<PaymentStatus, 'confirmado' | 'rechazado' | 'contra_entrega'>
  ) => Promise<void>;`,
    'admin context order methods'
  );

  content = replaceRequired(
    content,
    `  const updateOrderStatus = useCallback(
    async (orderId: string, status: ExtendedOrder['status']) => {
      const currentOrder = orders.find(order => order.id === orderId);
      const result = await runPanelAction<{ order: ExtendedOrder }>('transition_order', {
        orderId,
        status,
      });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );

        if (currentOrder) {
          void sendOrderPushNotification(
            result.order,
            result.order.status,
            result.order.payment_status || currentOrder.payment_status || 'pendiente'
          );
        }
      }

      await load();
    },
    [load, orders]
  );

  const addVipGiftToOrder`,
    `  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: ExtendedOrder['status'],
      reason?: string | null
    ) => {
      const currentOrder = orders.find(order => order.id === orderId);
      const result = await runPanelAction<{ order: ExtendedOrder }>('transition_order', {
        orderId,
        status,
        reason: reason || null,
      });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );

        if (currentOrder) {
          void sendOrderPushNotification(
            result.order,
            result.order.status,
            result.order.payment_status || currentOrder.payment_status || 'pendiente'
          );
        }
      }

      await load();
    },
    [load, orders]
  );

  const confirmOrderPayment = useCallback(
    async (
      orderId: string,
      paymentStatus: Extract<PaymentStatus, 'confirmado' | 'rechazado' | 'contra_entrega'>
    ) => {
      const result = await runPanelAction<{ order: ExtendedOrder }>('confirm_order_payment', {
        orderId,
        paymentStatus,
      });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );
      }

      await load();
    },
    [load]
  );

  const addVipGiftToOrder`,
    'admin context callbacks'
  );

  content = replaceRequired(
    content,
    `        createOrder,\n        updateOrderStatus,`,
    `        createOrder,
        updateOrderStatus,
        confirmOrderPayment,`,
    'admin provider payment callback'
  );

  write(path, content);
}

function patchAdminDashboard() {
  const path = 'src/components/AdminDashboard.tsx';
  let content = read(path);

  content = replaceRequired(
    content,
    `const isValidSaleOrder = (order: any) => {\n  return order?.status !== 'Cancelado' && order?.status !== 'Por Confirmar';\n};`,
    `const isValidSaleOrder = (order: any) => {
  return order?.status === 'Entregado' && order?.payment_status === 'confirmado';
};`,
    'cash totals require delivered and paid'
  );

  content = replaceRequired(
    content,
    `const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
];`,
    `const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
];

const adminStatusOptions = (status: OrderStatus): OrderStatus[] => {
  const nextByStatus: Partial<Record<OrderStatus, OrderStatus[]>> = {
    'Por Confirmar': ['Recibido', 'Cancelado'],
    Recibido: ['Preparando', 'Cancelado'],
    Preparando: ['Enviado', 'Cancelado'],
    Enviado: ['Entregado', 'Cancelado'],
    Entregado: [],
    Cancelado: [],
  };

  return ORDER_STATUS_OPTIONS.filter(option => {
    return option === status || (nextByStatus[status] || []).includes(option);
  });
};`,
    'admin status options helper'
  );

  content = replaceRequired(
    content,
    `  const handleOrderStatus = async (orderId: string | undefined, status: OrderStatus) => {
    if (!orderId) return;

    try {
      await context.updateOrderStatus(orderId, status);
      await context.refreshData();

      if (activeAlert?.orderId === orderId) {
        setActiveAlert(null);
      }
    } catch {
      window.alert('No se pudo actualizar el pedido.');
    }
  };`,
    `  const handleOrderStatus = async (
    orderId: string | undefined,
    status: OrderStatus,
    reason?: string | null
  ) => {
    if (!orderId) return;

    try {
      await context.updateOrderStatus(orderId, status, reason);
      await context.refreshData();

      if (activeAlert?.orderId === orderId) {
        setActiveAlert(null);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.');
    }
  };

  const handleOrderPayment = async (
    orderId: string | undefined,
    paymentStatus: 'confirmado' | 'rechazado' | 'contra_entrega'
  ) => {
    if (!orderId) return;

    try {
      await context.confirmOrderPayment(orderId, paymentStatus);
      await context.refreshData();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo actualizar el pago.');
    }
  };`,
    'admin order handlers'
  );

  content = content.replace(
    'Revisa Deuna o transferencia antes de confirmar.',
    'Confirma efectivo o Deuna únicamente cuando recibas el pago.'
  );

  content = content.replace(
    `(order.status === 'Por Confirmar' || order.status === 'Recibido') && (`,
    `order.status === 'Recibido' && (`
  );
  content = content.replace(
    `(order.status === 'Recibido' || order.status === 'Preparando') && (`,
    `order.status === 'Preparando' && (`
  );

  content = replaceRequired(
    content,
    `                  </div>

                  {hasDeliveryGps && (`,
    `                  </div>

                  {order.status !== 'Cancelado' && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase text-emerald-700">
                            Cobro contra entrega
                          </p>
                          <p className="text-[9px] font-bold text-emerald-700/75 mt-1 leading-relaxed">
                            {order.payment_method === 'deuna'
                              ? 'El repartidor muestra su QR de Deuna y confirma al recibir el pago.'
                              : 'Confirma únicamente después de recibir el efectivo.'}
                          </p>
                        </div>
                        <span className={\`text-[8px] font-black uppercase px-2 py-1 rounded-lg border \${paymentStatusTone(order.payment_status)}\`}>
                          {paymentStatusLabel(order.payment_status)}
                        </span>
                      </div>

                      {order.payment_status !== 'confirmado' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleOrderPayment(order.id, 'confirmado')}
                            className="bg-emerald-600 text-white rounded-xl py-3 text-[9px] font-black uppercase active:scale-95 transition-all"
                          >
                            Confirmar pago
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderPayment(order.id, 'rechazado')}
                            className="bg-white text-red-500 border border-red-100 rounded-xl py-3 text-[9px] font-black uppercase active:scale-95 transition-all"
                          >
                            Pago no recibido
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {hasDeliveryGps && (`,
    'admin payment action card'
  );

  content = replaceRequired(
    content,
    `                    {order.status === 'Enviado' && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(order.id, 'Entregado')}
                        className="bg-green-500 text-white py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all shadow-md shadow-green-100 flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={13} />
                        Entregar
                      </button>
                    )}`,
    `                    {order.status === 'Enviado' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (order.payment_status !== 'confirmado') {
                            window.alert('Confirma el pago antes de entregar.');
                            return;
                          }
                          void handleOrderStatus(order.id, 'Entregado');
                        }}
                        className={\`py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all shadow-md flex items-center justify-center gap-1 \${
                          order.payment_status === 'confirmado'
                            ? 'bg-green-500 text-white shadow-green-100'
                            : 'bg-gray-100 text-gray-400 shadow-none'
                        }\`}
                      >
                        <CheckCircle2 size={13} />
                        {order.payment_status === 'confirmado' ? 'Entregar' : 'Falta pago'}
                      </button>
                    )}`,
    'admin delivered requires payment'
  );

  content = content.replace(
    `{ORDER_STATUS_OPTIONS.map(status => (`,
    `{adminStatusOptions(order.status).map(status => (`
  );

  content = replaceRequired(
    content,
    `                        onClick={() => handleOrderStatus(order.id, 'Cancelado')}`,
    `                        onClick={() => {
                          const reason = window.prompt('Motivo de cancelación:')?.trim();
                          if (reason) void handleOrderStatus(order.id, 'Cancelado', reason);
                        }}`,
    'admin cancel reason'
  );

  write(path, content);
}

function patchDeliveryDashboard() {
  const path = 'src/components/DeliveryDashboard.tsx';
  let content = read(path);

  content = replaceRequired(
    content,
    `  Package,\n  RefreshCw,`,
    `  Package,
  Banknote,
  QrCode,
  ShieldCheck,
  RefreshCw,`,
    'delivery payment icons'
  );

  content = replaceRequired(
    content,
    `  const { orders, customers, updateOrderStatus, refreshData, loading } = useAdmin();`,
    `  const {
    orders,
    customers,
    updateOrderStatus,
    confirmOrderPayment,
    refreshData,
    loading,
  } = useAdmin();`,
    'delivery context payment method'
  );

  content = replaceRequired(
    content,
    `  const handleStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);

      if (status === 'Enviado') {
        const seen = readSeenReadyIds();
        seen.add(orderId);
        saveSeenReadyIds(seen);

        setUrgentReadyIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }

      await refreshData();
    } catch (error) {
      console.error('No se pudo actualizar pedido:', error);
      window.alert('No se pudo actualizar el pedido.');
    }
  };`,
    `  const handleStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);

      if (status === 'Enviado') {
        const seen = readSeenReadyIds();
        seen.add(orderId);
        saveSeenReadyIds(seen);

        setUrgentReadyIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }

      await refreshData();
    } catch (error) {
      console.error('No se pudo actualizar pedido:', error);
      window.alert(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.');
    }
  };

  const handlePayment = async (orderId: string) => {
    try {
      await confirmOrderPayment(orderId, 'confirmado');
      await refreshData();
    } catch (error) {
      console.error('No se pudo confirmar pago:', error);
      window.alert(error instanceof Error ? error.message : 'No se pudo confirmar el pago.');
    }
  };`,
    'delivery handlers'
  );

  content = replaceRequired(
    content,
    `                  <div className="grid grid-cols-2 gap-2">`,
    `                  <div className={\`rounded-2xl border p-3 \${
                    order.payment_status === 'confirmado'
                      ? 'bg-green-50 border-green-100'
                      : 'bg-purple-50 border-purple-100'
                  }\`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        {order.payment_method === 'deuna' ? (
                          <QrCode size={19} className="text-purple-600" />
                        ) : (
                          <Banknote size={19} className="text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase text-gray-500">
                          {order.payment_method === 'deuna' ? 'Cobro por Deuna' : 'Cobro en efectivo'}
                        </p>
                        <p className="text-[10px] font-bold text-gray-700 mt-1 leading-relaxed">
                          {order.payment_status === 'confirmado'
                            ? 'Pago recibido y confirmado.'
                            : order.payment_method === 'deuna'
                              ? 'Muestra tu QR personal de Deuna y confirma cuando recibas el pago.'
                              : 'Cuenta el efectivo y confirma cuando lo recibas.'}
                        </p>
                      </div>
                      <ShieldCheck
                        size={18}
                        className={order.payment_status === 'confirmado' ? 'text-green-600' : 'text-purple-500'}
                      />
                    </div>

                    {order.payment_status !== 'confirmado' && (
                      <button
                        type="button"
                        onClick={() => void handlePayment(order.id)}
                        className="w-full mt-3 bg-emerald-600 text-white rounded-xl py-3 font-black text-[9px] uppercase active:scale-95 transition-transform"
                      >
                        Confirmar pago recibido
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">`,
    'delivery payment card'
  );

  content = replaceRequired(
    content,
    `                         onClick={() => {
                           const ok = window.confirm('¿Marcar este pedido como entregado?');

                           if (ok) {
                             handleStatus(order.id, 'Entregado');
                           }
                         }}
                         className="bg-green-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-green-100"
                       >
                         <CheckCircle2 size={14} />
                         Entregado`,
    `                         onClick={() => {
                           if (order.payment_status !== 'confirmado') {
                             window.alert('Primero confirma que recibiste el pago.');
                             return;
                           }

                           const ok = window.confirm('¿Marcar este pedido como entregado?');
                           if (ok) void handleStatus(order.id, 'Entregado');
                         }}
                         className={\`rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg \${
                           order.payment_status === 'confirmado'
                             ? 'bg-green-500 text-white shadow-green-100'
                             : 'bg-gray-100 text-gray-400 shadow-none'
                         }\`}
                       >
                         <CheckCircle2 size={14} />
                         {order.payment_status === 'confirmado' ? 'Entregado' : 'Falta pago'}`,
    'delivery delivered requires payment'
  );

  write(path, content);
}

function patchCartScreen() {
  const path = 'src/components/CartScreen.tsx';
  let content = read(path);

  content = content.replace('  Building,\n', '');
  content = content.replace(
    `type SupportedPaymentMethod = Extract<PaymentMethod, 'efectivo' | 'deuna' | 'transferencia'>;`,
    `type SupportedPaymentMethod = Extract<PaymentMethod, 'efectivo' | 'deuna'>;`
  );

  content = content.replace(/const BUSINESS_DEUNA_PHONE = .*\n/, '');
  content = content.replace(/const BUSINESS_BANK_ACCOUNT = .*\n/, '');
  content = content.replace(/const BUSINESS_BANK_ID = .*\n/, '');
  content = content.replace(/const BUSINESS_BENEFICIARY = .*\n/, '');
  content = content.replace(/\nconst BANK_OPTIONS = \[[\s\S]*?\n\];\n/, '\n');

  content = content.replace(
    `  localStorage.removeItem('selectedPaymentMethod');\n  localStorage.removeItem('selectedBank');`,
    `  localStorage.removeItem('selectedPaymentMethod');`
  );

  content = content.replace(`  const [selectedBank, setSelectedBank] = useState<string | null>(null);\n`, '');
  content = content.replace(`  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);\n`, '');

  content = replaceRegexRequired(
    content,
    /  const isPaymentReady = .*?;\n/,
    `  const isPaymentReady = paymentMethod === 'efectivo' || (canUseDigitalPayment && paymentMethod === 'deuna');\n`,
    'cart payment readiness'
  );

  content = replaceRegexRequired(
    content,
    /  const checkoutLabel = paymentMethod === 'efectivo'[\s\S]*?  const registerLabel = paymentMethod === 'efectivo'[\s\S]*?    : tx\(language, 'continuePayment'\);/,
    `  const checkoutLabel = hasConsult
    ? tx(language, 'viewConfirmation')
    : tx(language, 'confirmOrder');

  const registerLabel = hasConsult
    ? tx(language, 'sendReview')
    : tx(language, 'confirmOrder');`,
    'cart labels'
  );

  content = replaceRegexRequired(
    content,
    /  const pendingActionText = !hasProfile \|\| !hasLocation[\s\S]*?        : tx\(language, 'choosePaymentMethod'\);/,
    `  const pendingActionText = !hasProfile || !hasLocation
    ? tx(language, 'completeDelivery')
    : hasConsult
      ? tx(language, 'chooseConfirmCash')
      : tx(language, 'choosePaymentMethod');`,
    'cart pending action text'
  );

  content = content.replace(`      setSelectedBank(null);\n`, '');
  content = content.replace(`    if ((method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment) {`, `    if (method === 'deuna' && !canUseDigitalPayment) {`);

  content = replaceRegexRequired(
    content,
    /    setPaymentMethod\(method\);\n\n    if \(method === 'transferencia'\) \{[\s\S]*?    \}\n\n    window\.setTimeout/,
    `    setPaymentMethod(method);
    triggerDryTap();

    window.setTimeout`,
    'cart choose payment method'
  );

  content = content.replace(`    if ((paymentMethod === 'deuna' || paymentMethod === 'transferencia') && !canUseDigitalPayment) {`, `    if (paymentMethod === 'deuna' && !canUseDigitalPayment) {`);
  content = replaceRegexRequired(
    content,
    /\n    if \(paymentMethod === 'transferencia' && !selectedBank\) \{[\s\S]*?\n    \}\n/,
    '\n',
    'cart transfer precheck'
  );
  content = content.replace(`      localStorage.setItem('selectedBank', selectedBank || 'Ninguno');\n`, '');
  content = content.replace(
    `      showNotice(paymentMethod === 'efectivo' ? tx(language, 'orderRegisteredCash') : tx(language, 'orderRegisteredPay'));`,
    `      showNotice(
        paymentMethod === 'deuna'
          ? 'Pedido registrado. Pagarás por Deuna al recibir; el repartidor mostrará su QR.'
          : tx(language, 'orderRegisteredCash')
      );`
  );

  content = replaceRegexRequired(
    content,
    /\n  const handleCopyText = async \([\s\S]*?\n  const handleCheckout = \(\) => \{/,
    `
  const handleCheckout = () => {`,
    'cart remove bank/copy handlers'
  );

  content = replaceRegexRequired(
    content,
    /    return \(\n      <div className="bg-blue-50[\s\S]*?\n    \);\n  \};/,
    `    return (
      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-purple-600 flex-shrink-0 shadow-sm">
          <QrCode size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black text-purple-700 uppercase">Deuna contra entrega</p>
          <p className="text-[10px] font-bold text-purple-700/80 leading-relaxed mt-1">
            Paga cuando recibas el pedido. El repartidor te mostrará su QR personal de Deuna.
          </p>
        </div>
      </div>
    );
  };`,
    'cart Deuna status box'
  );

  content = content.replace(
    `(method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment`,
    `method === 'deuna' && !canUseDigitalPayment`
  );

  content = replaceRegexRequired(
    content,
    /  const paymentSummary = useMemo\(\(\) => \{[\s\S]*?  \}, \[language, paymentMethod, selectedBank\]\);/,
    `  const paymentSummary = useMemo(() => {
    if (!paymentMethod) return tx(language, 'pending');
    if (paymentMethod === 'efectivo') return tx(language, 'cash');
    return 'Deuna al recibir';
  }, [language, paymentMethod]);`,
    'cart payment summary'
  );

  content = content.replace(
    `    if (paymentMethod || isOrderSaved || selectedBank) {`,
    `    if (paymentMethod || isOrderSaved) {`
  );

  content = content.replace(
    `subtitle={paymentMethod ? paymentMethod === 'efectivo' ? tx(language, 'payOnReceive') : tx(language, 'digitalPayment') : tx(language, 'choosePayment')}`,
    `subtitle={paymentMethod ? tx(language, 'payOnReceive') : tx(language, 'choosePayment')}`
  );

  content = replaceRegexRequired(
    content,
    /\n            \{renderPaymentButton\(\n              'transferencia',[\s\S]*?\n            \)\}/,
    '',
    'cart remove transfer button'
  );

  content = replaceRegexRequired(
    content,
    /\n          \{isOrderSaved && paymentMethod === 'deuna' && \([\s\S]*?\n          \)\}/,
    `
          {isOrderSaved && paymentMethod === 'deuna' && (
            <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 flex items-start gap-3 animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm flex-shrink-0">
                <QrCode size={20} />
              </div>
              <div>
                <p className="text-xs text-purple-900 font-black uppercase tracking-tight">
                  Deuna al recibir
                </p>
                <p className="text-[10px] text-purple-700 font-bold leading-relaxed mt-1">
                  No pagues todavía. Cuando llegue el repartidor, él te mostrará su QR personal y confirmará el cobro.
                </p>
              </div>
            </div>
          )}`,
    'cart remove fixed Deuna QR'
  );

  content = replaceRegexRequired(
    content,
    /\n          \{paymentMethod === 'transferencia' && \([\s\S]*?\n          \)\}\n        <\/section>/,
    `
        </section>`,
    'cart remove transfer account section'
  );

  for (const forbidden of [
    'selectedBank',
    'setSelectedBank',
    'copiedLabel',
    'setCopiedLabel',
    'BUSINESS_BANK_',
    'BUSINESS_DEUNA_PHONE',
    'BANK_OPTIONS',
    "paymentMethod === 'transferencia'",
    "method === 'transferencia'",
  ]) {
    if (content.includes(forbidden)) {
      throw new Error(`CartScreen still contains forbidden Phase 2 token: ${forbidden}`);
    }
  }

  write(path, content);
}

patchPanelAction();
patchAdminContext();
patchAdminDashboard();
patchDeliveryDashboard();
patchCartScreen();

console.log('Phase 2 UI/API patch applied successfully.');
