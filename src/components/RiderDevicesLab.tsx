import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Bike,
  CheckCircle2,
  Clipboard,
  Copy,
  Link2,
  MapPin,
  PackageCheck,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  autoAssignOrders,
  claimOrder,
  createDeviceToken,
  deviceInviteUrl,
  deviceStatus,
  releaseCompletedOrder,
  type DispatchOrder,
  type RiderDevice,
} from '../utils/riderDevices';

const now = Date.now();

const initialDevices: RiderDevice[] = [
  {
    id: 'device-main',
    name: 'Repartidor principal',
    token: 'PRINCIPAL2026',
    enabled: true,
    maxOrders: 3,
    activeOrderIds: [],
    lastSeenAt: now,
    gpsPermission: 'granted',
    batteryPercent: 82,
  },
];

const initialOrders: DispatchOrder[] = [
  {
    id: 'order-1',
    code: 'PZ-501',
    customer: 'Andrea',
    ageMinutes: 18,
    distanceKm: 1.4,
  },
  {
    id: 'order-2',
    code: 'PZ-502',
    customer: 'Carlos',
    ageMinutes: 13,
    distanceKm: 2.1,
    needsCascada: true,
  },
  {
    id: 'order-3',
    code: 'PZ-503',
    customer: 'Elena',
    ageMinutes: 7,
    distanceKm: 0.9,
  },
  {
    id: 'order-4',
    code: 'PZ-504',
    customer: 'Martín',
    ageMinutes: 4,
    distanceKm: 2.8,
  },
];

const statusMeta = {
  available: {
    label: 'Disponible',
    className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    Icon: Wifi,
  },
  busy: {
    label: 'Ocupado',
    className: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    Icon: Route,
  },
  offline: {
    label: 'Desconectado',
    className: 'border-red-400/20 bg-red-400/10 text-red-300',
    Icon: WifiOff,
  },
  disabled: {
    label: 'Deshabilitado',
    className: 'border-white/10 bg-white/5 text-white/40',
    Icon: Power,
  },
} as const;

const formatSeen = (lastSeenAt: number) => {
  const seconds = Math.max(0, Math.floor((Date.now() - lastSeenAt) / 1000));
  if (seconds < 5) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds} s`;
  return `Hace ${Math.floor(seconds / 60)} min`;
};

export default function RiderDevicesLab() {
  const [devices, setDevices] = useState<RiderDevice[]>(initialDevices);
  const [orders, setOrders] = useState<DispatchOrder[]>(initialOrders);
  const [newName, setNewName] = useState('Repartidor 2');
  const [newCapacity, setNewCapacity] = useState(3);
  const [events, setEvents] = useState<string[]>([
    'Laboratorio listo. No usa pedidos reales ni escribe en Supabase.',
  ]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const pendingOrders = useMemo(
    () => orders.filter(order => !order.assignedDeviceId),
    [orders]
  );

  const activeDevices = useMemo(
    () => devices.filter(device => {
      const status = deviceStatus(device);
      return status !== 'offline' && status !== 'disabled';
    }),
    [devices]
  );

  const totalCapacity = useMemo(
    () => activeDevices.reduce((sum, device) => sum + device.maxOrders, 0),
    [activeDevices]
  );

  const occupiedCapacity = useMemo(
    () => activeDevices.reduce((sum, device) => sum + device.activeOrderIds.length, 0),
    [activeDevices]
  );

  const addEvent = (message: string) => {
    setEvents(previous => [message, ...previous].slice(0, 12));
  };

  const addDevice = () => {
    const name = newName.trim();
    if (!name) return;

    const token = createDeviceToken();
    const device: RiderDevice = {
      id: `device-${Date.now()}`,
      name,
      token,
      enabled: true,
      maxOrders: Math.max(1, Math.min(8, Number(newCapacity) || 1)),
      activeOrderIds: [],
      lastSeenAt: Date.now(),
      gpsPermission: 'prompt',
      batteryPercent: 100,
    };

    setDevices(previous => [...previous, device]);
    setNewName(`Repartidor ${devices.length + 2}`);
    addEvent(`${name}: dispositivo creado y listo para abrir mediante enlace.`);
  };

  const copyInvite = async (device: RiderDevice) => {
    const link = deviceInviteUrl(origin, device.token);

    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(device.token);
      window.setTimeout(() => setCopiedToken(null), 1800);
    } catch {
      window.prompt('Copia este enlace:', link);
    }
  };

  const heartbeat = (deviceId: string) => {
    setDevices(previous =>
      previous.map(device =>
        device.id === deviceId
          ? {
              ...device,
              lastSeenAt: Date.now(),
              batteryPercent: Math.max(5, Number(device.batteryPercent || 100) - 1),
            }
          : device
      )
    );
    addEvent('El celular envió una señal de actividad correcta.');
  };

  const toggleDevice = (deviceId: string) => {
    setDevices(previous =>
      previous.map(device =>
        device.id === deviceId
          ? { ...device, enabled: !device.enabled, lastSeenAt: Date.now() }
          : device
      )
    );
    addEvent('Se actualizó la disponibilidad del dispositivo.');
  };

  const setGps = (deviceId: string, granted: boolean) => {
    setDevices(previous =>
      previous.map(device =>
        device.id === deviceId
          ? {
              ...device,
              gpsPermission: granted ? 'granted' : 'denied',
              lastSeenAt: Date.now(),
            }
          : device
      )
    );
    addEvent(
      granted
        ? 'Ubicación permitida: el celular puede entrar al flujo automático.'
        : 'Ubicación rechazada: el sistema no asignará rutas automáticas a ese celular.'
    );
  };

  const simulateOffline = (deviceId: string) => {
    setDevices(previous =>
      previous.map(device =>
        device.id === deviceId
          ? { ...device, lastSeenAt: Date.now() - 90_000 }
          : device
      )
    );
    addEvent('Se simuló pérdida de conexión. Los pedidos nuevos no irán a ese celular.');
  };

  const removeDevice = (deviceId: string) => {
    const device = devices.find(item => item.id === deviceId);
    if (!device || device.activeOrderIds.length > 0) {
      addEvent('No se puede borrar un dispositivo mientras tenga pedidos asignados.');
      return;
    }

    setDevices(previous => previous.filter(item => item.id !== deviceId));
    addEvent(`${device.name}: dispositivo eliminado del laboratorio.`);
  };

  const autoAssign = () => {
    const result = autoAssignOrders(orders, devices);
    setOrders(result.orders);
    setDevices(result.devices);
    setEvents(previous => [...result.events.reverse(), ...previous].slice(0, 12));
  };

  const simulateConflict = () => {
    const order = orders.find(item => !item.assignedDeviceId);
    const candidates = devices.filter(device => {
      const status = deviceStatus(device);
      return status === 'available' || status === 'busy';
    });

    if (!order || candidates.length < 2) {
      addEvent('Agrega un segundo dispositivo y deja un pedido sin asignar para probar el conflicto.');
      return;
    }

    const first = claimOrder(order.id, candidates[0].id, orders, devices);
    const second = claimOrder(order.id, candidates[1].id, first.orders, first.devices);

    setOrders(second.orders);
    setDevices(second.devices);
    setEvents(previous => [...second.events, ...first.events, ...previous].slice(0, 12));
  };

  const completeOrder = (orderId: string) => {
    const result = releaseCompletedOrder(orderId, orders, devices);
    setOrders(result.orders);
    setDevices(result.devices);
    setEvents(previous => [...result.events, ...previous].slice(0, 12));
  };

  const resetLab = () => {
    setDevices(initialDevices.map(device => ({ ...device, lastSeenAt: Date.now() })));
    setOrders(initialOrders.map(order => ({ ...order })));
    setEvents(['Laboratorio reiniciado.']);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-950/40">
              <Smartphone size={23} />
            </div>
            <div>
              <p className="text-sm font-black uppercase italic">Dispositivos de reparto</p>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                Laboratorio seguro
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetLab}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black uppercase text-white/60 transition hover:bg-white/10"
          >
            <RefreshCw size={14} />
            Reiniciar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4 pb-12">
        <section className="rounded-[28px] border border-emerald-400/15 bg-emerald-400/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 flex-shrink-0 text-emerald-300" size={22} />
            <div>
              <h1 className="text-lg font-black uppercase italic">Agregar celulares sin cruzar pedidos</h1>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-white/55">
                Este laboratorio prueba enlaces por dispositivo, capacidad, desconexión, GPS y el caso en que dos teléfonos intentan tomar el mismo pedido. No modifica pedidos reales.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <Users className="text-orange-300" size={20} />
            <p className="mt-3 text-2xl font-black">{activeDevices.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Celulares activos</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <PackageCheck className="text-blue-300" size={20} />
            <p className="mt-3 text-2xl font-black">{pendingOrders.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Pedidos en espera</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <Route className="text-violet-300" size={20} />
            <p className="mt-3 text-2xl font-black">{occupiedCapacity}/{totalCapacity}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Capacidad usada</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <Zap className="text-amber-300" size={20} />
            <p className="mt-3 text-2xl font-black">{orders.filter(order => order.assignedDeviceId).length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Asignados</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Plus className="text-orange-300" size={20} />
                <h2 className="text-sm font-black uppercase italic">Agregar otro celular</h2>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Nombre visible</span>
                  <input
                    value={newName}
                    onChange={event => setNewName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold outline-none ring-orange-400 transition focus:ring-2"
                    placeholder="Repartidor 2"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Máximo de pedidos simultáneos</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={newCapacity}
                    onChange={event => setNewCapacity(Number(event.target.value))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold outline-none ring-orange-400 transition focus:ring-2"
                  />
                </label>

                <button
                  type="button"
                  onClick={addDevice}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-xs font-black uppercase shadow-lg shadow-orange-950/30 transition active:scale-[0.98]"
                >
                  <Smartphone size={17} />
                  Crear dispositivo
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase italic">Pruebas rápidas</p>
                  <p className="mt-1 text-[10px] font-semibold text-white/40">Sin tocar la base real</p>
                </div>
                <Radio className="text-blue-300" size={20} />
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={autoAssign}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500/15 px-4 py-3 text-[10px] font-black uppercase text-blue-200 transition hover:bg-blue-500/25"
                >
                  <Zap size={15} />
                  Asignar automáticamente
                </button>
                <button
                  type="button"
                  onClick={simulateConflict}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-violet-500/15 px-4 py-3 text-[10px] font-black uppercase text-violet-200 transition hover:bg-violet-500/25"
                >
                  <ShieldCheck size={15} />
                  Probar dos celulares a la vez
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {devices.map(device => {
              const status = deviceStatus(device);
              const meta = statusMeta[status];
              const StatusIcon = meta.Icon;
              const invite = deviceInviteUrl(origin, device.token);

              return (
                <article key={device.id} className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <Bike className="text-orange-300" size={23} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase">{device.name}</h3>
                        <p className="mt-1 text-[10px] font-semibold text-white/40">
                          {device.activeOrderIds.length}/{device.maxOrders} pedidos · {formatSeen(device.lastSeenAt)}
                        </p>
                      </div>
                    </div>

                    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase ${meta.className}`}>
                      <StatusIcon size={12} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/35">
                      <Link2 size={13} />
                      Enlace privado del dispositivo
                    </div>
                    <p className="mt-2 break-all text-[10px] font-semibold leading-relaxed text-white/55">{invite}</p>
                    <button
                      type="button"
                      onClick={() => copyInvite(device)}
                      className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[9px] font-black uppercase transition hover:bg-white/15"
                    >
                      {copiedToken === device.token ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {copiedToken === device.token ? 'Copiado' : 'Copiar enlace'}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-2 text-white/35">
                        <MapPin size={14} /> GPS
                      </div>
                      <p className={`mt-2 uppercase ${device.gpsPermission === 'granted' ? 'text-emerald-300' : device.gpsPermission === 'denied' ? 'text-red-300' : 'text-amber-300'}`}>
                        {device.gpsPermission === 'granted' ? 'Permitido' : device.gpsPermission === 'denied' ? 'Rechazado' : 'Pendiente'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-2 text-white/35">
                        <BatteryCharging size={14} /> Batería
                      </div>
                      <p className="mt-2 text-emerald-300">{device.batteryPercent ?? '--'}%</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => heartbeat(device.id)}
                      className="rounded-xl bg-emerald-500/15 px-3 py-2 text-[9px] font-black uppercase text-emerald-200"
                    >
                      Señal activa
                    </button>
                    <button
                      type="button"
                      onClick={() => setGps(device.id, device.gpsPermission !== 'granted')}
                      className="rounded-xl bg-blue-500/15 px-3 py-2 text-[9px] font-black uppercase text-blue-200"
                    >
                      {device.gpsPermission === 'granted' ? 'Quitar GPS' : 'Permitir GPS'}
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateOffline(device.id)}
                      className="rounded-xl bg-amber-500/15 px-3 py-2 text-[9px] font-black uppercase text-amber-200"
                    >
                      Simular sin internet
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDevice(device.id)}
                      className="rounded-xl bg-white/10 px-3 py-2 text-[9px] font-black uppercase text-white/65"
                    >
                      {device.enabled ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDevice(device.id)}
                      className="rounded-xl bg-red-500/15 px-3 py-2 text-red-200"
                      aria-label={`Eliminar ${device.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase italic">Cola de pedidos simulados</h2>
                <p className="mt-1 text-[10px] font-semibold text-white/40">La Cascada es una parada interna</p>
              </div>
              <Clipboard className="text-orange-300" size={20} />
            </div>

            <div className="mt-4 space-y-2">
              {orders.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-xs font-bold text-white/35">
                  Todas las entregas simuladas fueron cerradas.
                </p>
              )}

              {orders.map(order => {
                const device = devices.find(item => item.id === order.assignedDeviceId);
                return (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black">{order.code}</p>
                        {order.needsCascada && (
                          <span className="rounded-full bg-red-500/15 px-2 py-1 text-[8px] font-black uppercase text-red-200">
                            Recoger en Cascada
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-white/40">
                        {order.customer} · {order.distanceKm} km · espera {order.ageMinutes} min
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase ${device ? 'bg-blue-500/15 text-blue-200' : 'bg-amber-500/15 text-amber-200'}`}>
                        {device?.name || 'Sin asignar'}
                      </span>
                      {device && (
                        <button
                          type="button"
                          onClick={() => completeOrder(order.id)}
                          className="rounded-xl bg-emerald-500/15 p-2 text-emerald-200"
                          aria-label={`Cerrar ${order.code}`}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <Radio className="text-violet-300" size={20} />
              <h2 className="text-sm font-black uppercase italic">Registro de decisiones</h2>
            </div>

            <div className="mt-4 space-y-2">
              {events.map((event, index) => (
                <div key={`${event}-${index}`} className="flex gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  {event.includes('no hay') || event.includes('No se puede') || event.includes('rechazada') ? (
                    <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-300" size={15} />
                  ) : (
                    <CheckCircle2 className="mt-0.5 flex-shrink-0 text-emerald-300" size={15} />
                  )}
                  <p className="text-[10px] font-semibold leading-relaxed text-white/55">{event}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
