import fs from 'node:fs';

const replaceOnce = (source, before, after, label) => {
  const index = source.indexOf(before);
  if (index === -1) throw new Error(`No se encontró: ${label}`);
  if (source.indexOf(before, index + before.length) !== -1) {
    throw new Error(`Bloque repetido: ${label}`);
  }
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
};

const adminPath = 'src/components/AdminDashboard.tsx';
let admin = fs.readFileSync(adminPath, 'utf8');
admin = replaceOnce(
  admin,
  "  Home,\n} from 'lucide-react';",
  "  Home,\n  Smartphone,\n} from 'lucide-react';",
  'icono Smartphone admin'
);
admin = replaceOnce(
  admin,
  "import AdminPlusPanel from './AdminPlusPanel';",
  "import AdminPlusPanel from './AdminPlusPanel';\nimport AdminDeliveryDevices from './AdminDeliveryDevices';",
  'importar panel reparto'
);
admin = replaceOnce(
  admin,
  "  { id: 'orders', label: 'Pedidos', Icon: Send },\n  { id: 'cash', label: 'Caja', Icon: ReceiptText },",
  "  { id: 'orders', label: 'Pedidos', Icon: Send },\n  { id: 'delivery', label: 'Reparto', Icon: Smartphone },\n  { id: 'cash', label: 'Caja', Icon: ReceiptText },",
  'pestaña reparto'
);
admin = replaceOnce(
  admin,
  "        {tab === 'plus' && <AdminPlusPanel />}\n\n        {tab === 'orders' && (",
  "        {tab === 'delivery' && <AdminDeliveryDevices />}\n\n        {tab === 'plus' && <AdminPlusPanel />}\n\n        {tab === 'orders' && (",
  'render panel reparto'
);
fs.writeFileSync(adminPath, admin);

const deliveryPath = 'src/components/DeliveryDashboard.tsx';
let delivery = fs.readFileSync(deliveryPath, 'utf8');
delivery = replaceOnce(
  delivery,
  "import { logoutPanelSession } from '../utils/panelSession';",
  "import { logoutPanelSession } from '../utils/panelSession';\nimport RiderTrackingBridge, { hasStoredDeliveryDevice } from './RiderTrackingBridge';",
  'importar puente GPS'
);
delivery = replaceOnce(
  delivery,
  "  const { orders, customers, updateOrderStatus, refreshData, loading } = useAdmin();\n\n  const initializedRef",
  "  const { orders, customers, updateOrderStatus, refreshData, loading } = useAdmin();\n  const trackingDeviceMode = useMemo(() => hasStoredDeliveryDevice(), []);\n\n  const initializedRef",
  'modo dispositivo'
);
delivery = replaceOnce(
  delivery,
  "                 Hay {urgentCount} pedido{urgentCount !== 1 ? 's' : ''} preparado{urgentCount !== 1 ? 's' : ''} esperando salida. Toca “En ruta” cuando lo tomes.",
  "                 Hay {urgentCount} pedido{urgentCount !== 1 ? 's' : ''} preparado{urgentCount !== 1 ? 's' : ''} esperando salida. {trackingDeviceMode ? 'Toca “Iniciar GPS” cuando lo tomes.' : 'Toca “En ruta” cuando lo tomes.'}",
  'mensaje pedido listo'
);
delivery = replaceOnce(
  delivery,
  "        <section className=\"grid grid-cols-3 gap-2\">",
  "        <RiderTrackingBridge orders={orders} onOrdersChanged={refreshData} />\n\n        <section className=\"grid grid-cols-3 gap-2\">",
  'insertar control GPS'
);
const manualButtons = `                    {order.status === 'Preparando' ? (\n                      <button\n                        type=\"button\"\n                        onClick={() => handleStatus(order.id, 'Enviado')}\n                        className=\"bg-yellow-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-yellow-100\"\n                      >\n                        <Truck size={14} />\n                        En ruta\n                      </button>\n                    ) : (\n                      <button\n                        type=\"button\"\n                        onClick={() => {\n                          const ok = window.confirm('¿Marcar este pedido como entregado?');\n\n                          if (ok) {\n                            handleStatus(order.id, 'Entregado');\n                          }\n                        }}\n                        className=\"bg-green-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-green-100\"\n                      >\n                        <CheckCircle2 size={14} />\n                        Entregado\n                      </button>\n                    )}`;
const safeButtons = `                    {trackingDeviceMode ? (\n                      <div className=\"col-span-2 rounded-2xl border border-blue-100 bg-blue-50 py-3 text-center text-[9px] font-black uppercase text-blue-600\">\n                        Control automático en el módulo GPS de arriba\n                      </div>\n                    ) : order.status === 'Preparando' ? (\n                      <button\n                        type=\"button\"\n                        onClick={() => handleStatus(order.id, 'Enviado')}\n                        className=\"bg-yellow-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-yellow-100\"\n                      >\n                        <Truck size={14} />\n                        En ruta\n                      </button>\n                    ) : (\n                      <button\n                        type=\"button\"\n                        onClick={() => {\n                          const ok = window.confirm('¿Marcar este pedido como entregado?');\n\n                          if (ok) {\n                            handleStatus(order.id, 'Entregado');\n                          }\n                        }}\n                        className=\"bg-green-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-green-100\"\n                      >\n                        <CheckCircle2 size={14} />\n                        Entregado\n                      </button>\n                    )}`;
delivery = replaceOnce(delivery, manualButtons, safeButtons, 'botones manuales reparto');
fs.writeFileSync(deliveryPath, delivery);

const mapPath = 'src/components/CustomerTrackingMapLab.tsx';
let customerMap = fs.readFileSync(mapPath, 'utf8');
customerMap = replaceOnce(
  customerMap,
  "} from '../utils/customerTrackingMap';",
  "} from '../utils/customerTrackingMap';\nimport { getOrderCredential } from '../utils/orderCredentials';",
  'credencial mapa'
);
customerMap = replaceOnce(
  customerMap,
  "type MapPoint = {\n  latitude: number;\n  longitude: number;\n};\n\nconst STORE:",
  "type MapPoint = {\n  latitude: number;\n  longitude: number;\n};\n\nconst EMBEDDED_PARAMS = new URLSearchParams(window.location.search);\nconst COMPACT_MODE = EMBEDDED_PARAMS.get('compact') === '1';\nconst EMBEDDED_ORDER_CODE = String(EMBEDDED_PARAMS.get('orderCode') || '').trim().toUpperCase();\nconst EMBEDDED_CREDENTIAL = getOrderCredential(EMBEDDED_ORDER_CODE);\n\nconst STORE:",
  'modo compacto mapa'
);
customerMap = replaceOnce(
  customerMap,
  "  const [mode, setMode] = useState<Mode>('demo');",
  "  const [mode, setMode] = useState<Mode>(COMPACT_MODE ? 'real' : 'demo');",
  'modo inicial mapa'
);
customerMap = replaceOnce(
  customerMap,
  "  const [orderCode, setOrderCode] = useState('');\n  const [trackingToken, setTrackingToken] = useState('');",
  "  const [orderCode, setOrderCode] = useState(EMBEDDED_ORDER_CODE);\n  const [trackingToken, setTrackingToken] = useState(EMBEDDED_CREDENTIAL?.trackingToken || '');",
  'credenciales iniciales mapa'
);
customerMap = replaceOnce(
  customerMap,
  "  useEffect(() => {\n    if (!connected || mode !== 'real') return;\n    const timer = window.setInterval(() => {\n      void fetchRealTracking();\n    }, 4000);\n    return () => window.clearInterval(timer);\n  }, [connected, fetchRealTracking, mode]);",
  "  useEffect(() => {\n    if (!COMPACT_MODE || !orderCode || !trackingToken) return;\n    void fetchRealTracking();\n  }, [fetchRealTracking, orderCode, trackingToken]);\n\n  useEffect(() => {\n    if (!connected || mode !== 'real') return;\n    const timer = window.setInterval(() => {\n      void fetchRealTracking();\n    }, 4000);\n    return () => window.clearInterval(timer);\n  }, [connected, fetchRealTracking, mode]);",
  'autoconectar mapa'
);
customerMap = replaceOnce(
  customerMap,
  "  const rank = statusSteps.findIndex(step => step.key === status);\n\n  return (",
  "  const rank = statusSteps.findIndex(step => step.key === status);\n\n  if (COMPACT_MODE) {\n    return (\n      <div className=\"relative h-[100dvh] min-h-[320px] overflow-hidden bg-slate-950 text-white\">\n        <div ref={mapNodeRef} className=\"absolute inset-0\" />\n\n        {!connected && (\n          <div className=\"absolute inset-0 z-20 grid place-items-center bg-slate-950 p-6 text-center\">\n            <div>\n              <Radio className=\"mx-auto animate-pulse text-orange-400\" size={28} />\n              <p className=\"mt-3 text-sm font-black uppercase italic\">Preparando mapa en vivo</p>\n              <p className=\"mt-2 text-[10px] font-bold leading-relaxed text-white/45\">\n                {error || 'Aparecerá cuando el repartidor tome tu pedido.'}\n              </p>\n            </div>\n          </div>\n        )}\n\n        {connected && (\n          <>\n            <div className=\"pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3\">\n              <div className=\"rounded-2xl border border-white/30 bg-slate-950/82 px-3 py-2 backdrop-blur-xl\">\n                <p className=\"text-[8px] font-black uppercase tracking-widest text-white/45\">Estado</p>\n                <p className=\"mt-1 text-sm font-black uppercase italic text-orange-300\">{ui.label}</p>\n              </div>\n              <div className=\"rounded-2xl border border-white/30 bg-slate-950/82 px-3 py-2 text-right backdrop-blur-xl\">\n                <p className=\"text-[8px] font-black uppercase tracking-widest text-white/45\">En vivo</p>\n                <p className=\"mt-1 text-[9px] font-black text-emerald-300\">{formatTrackingTime(lastUpdatedAt)}</p>\n              </div>\n            </div>\n\n            <div className=\"absolute inset-x-3 bottom-3 z-10 rounded-[22px] border border-white/20 bg-slate-950/90 p-4 shadow-xl backdrop-blur-xl\">\n              <div className=\"flex items-start justify-between gap-3\">\n                <div>\n                  <p className=\"text-[9px] font-black uppercase tracking-widest text-orange-300\">{riderName}</p>\n                  <p className=\"mt-1 text-sm font-black uppercase italic\">{ui.message}</p>\n                </div>\n                <div className=\"grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-orange-500 text-white\">\n                  <Bike size={21} />\n                </div>\n              </div>\n              <div className=\"mt-3 h-2 overflow-hidden rounded-full bg-white/10\">\n                <div className=\"h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-300 transition-all duration-700\" style={{ width: `${ui.progress}%` }} />\n              </div>\n            </div>\n          </>\n        )}\n      </div>\n    );\n  }\n\n  return (",
  'vista compacta mapa'
);
fs.writeFileSync(mapPath, customerMap);

const trackingPath = 'src/components/OrderTracking.tsx';
let orderTracking = fs.readFileSync(trackingPath, 'utf8');
orderTracking = replaceOnce(
  orderTracking,
  "import { useUser } from '../context/UserContext';",
  "import { useUser } from '../context/UserContext';\nimport { getOrderCredential } from '../utils/orderCredentials';",
  'credenciales en rastreo'
);
orderTracking = replaceOnce(
  orderTracking,
  "  const deliveryText = activeOrder?.membership_applied\n    ? `Plus · ahorro ${money(activeOrder.delivery_fee || deliveryAmount || 0)}`\n    : deliveryAmount > 0\n      ? `Delivery ${money(deliveryAmount)}`\n      : 'Delivery gratis';",
  "  const deliveryText = activeOrder?.membership_applied\n    ? `Plus · ahorro ${money(activeOrder.delivery_fee || deliveryAmount || 0)}`\n    : deliveryAmount > 0\n      ? `Delivery ${money(deliveryAmount)}`\n      : 'Delivery gratis';\n  const trackingCredential = activeOrder\n    ? getOrderCredential(activeOrder.order_code)\n    : null;",
  'resolver token de mapa'
);
orderTracking = replaceOnce(
  orderTracking,
  "              </section>\n\n              <section className=\"rounded-[21px] border border-orange-100 bg-white p-3.5 shadow-sm\">\n                <div className=\"mb-2.5 flex items-center justify-between gap-2\">\n                  <p className=\"text-[8px] font-black uppercase tracking-[0.15em] text-orange-500\">Progreso</p>",
  "              </section>\n\n              {trackingCredential && activeOrder.order_code && (\n                <section className=\"overflow-hidden rounded-[21px] border border-orange-100 bg-slate-950 shadow-sm\">\n                  <iframe\n                    title={`Mapa en vivo ${activeOrder.order_code}`}\n                    src={`/mapa-cliente-lab?compact=1&orderCode=${encodeURIComponent(activeOrder.order_code)}`}\n                    className=\"h-[340px] w-full border-0\"\n                    loading=\"lazy\"\n                    allow=\"geolocation 'none'\"\n                  />\n                </section>\n              )}\n\n              <section className=\"rounded-[21px] border border-orange-100 bg-white p-3.5 shadow-sm\">\n                <div className=\"mb-2.5 flex items-center justify-between gap-2\">\n                  <p className=\"text-[8px] font-black uppercase tracking-[0.15em] text-orange-500\">Progreso</p>",
  'insertar mapa en rastreo'
);
fs.writeFileSync(trackingPath, orderTracking);

console.log('Fase 7 aplicada: admin, repartidor y cliente conectados al rastreo real.');
