import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Copy,
  Link2,
  LoaderCircle,
  Minus,
  Plus,
  Power,
  RefreshCw,
  Route,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  trackingPost,
  trackingStatusLabel,
  type TrackingDevice,
} from '../utils/deliveryTrackingApi';

type ListResult = { ok: true; devices: TrackingDevice[] };
type CreateResult = {
  ok: true;
  device: TrackingDevice;
  deviceToken: string;
  invitePath: string;
  warning?: string;
};
type UpdateResult = { ok: true; device: TrackingDevice };

const relativeSeen = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : 0;
  if (!time || Number.isNaN(time)) return 'Nunca conectado';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 10) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds} s`;
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  return `Hace ${Math.floor(seconds / 3600)} h`;
};

export default function AdminDeliveryDevices() {
  const [devices, setDevices] = useState<TrackingDevice[]>([]);
  const [name, setName] = useState('Repartidor principal');
  const [maxOrders, setMaxOrders] = useState(3);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const loadDevices = useCallback(async () => {
    setError('');
    try {
      const result = await trackingPost<ListResult>('list_devices');
      setDevices(result.devices || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los repartidores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
    const timer = window.setInterval(() => void loadDevices(), 15_000);
    return () => window.clearInterval(timer);
  }, [loadDevices]);

  const activeCount = useMemo(
    () => devices.filter(device => device.enabled && device.online).length,
    [devices]
  );

  const createDevice = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Escribe un nombre para el celular.');
      return;
    }

    setCreating(true);
    setError('');
    setCreatedLink('');

    try {
      const result = await trackingPost<CreateResult>('create_device', {
        name: cleanName,
        maxOrders,
      });
      const link = new URL(result.invitePath, window.location.origin).toString();
      setCreatedLink(link);
      setName(`Repartidor ${devices.length + 2}`);
      await loadDevices();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el dispositivo.');
    } finally {
      setCreating(false);
    }
  };

  const updateDevice = async (
    device: TrackingDevice,
    patch: { enabled?: boolean; maxOrders?: number }
  ) => {
    setUpdatingId(device.id);
    setError('');
    try {
      await trackingPost<UpdateResult>('update_device', {
        deviceId: device.id,
        ...patch,
      });
      await loadDevices();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el dispositivo.');
    } finally {
      setUpdatingId('');
    }
  };

  const copyLink = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copia este enlace para el celular del repartidor:', createdLink);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      <section className="overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-300">
              Reparto conectado
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase italic leading-none">
              {activeCount} celular{activeCount !== 1 ? 'es' : ''} activo{activeCount !== 1 ? 's' : ''}
            </h2>
            <p className="mt-2 max-w-xl text-[11px] font-bold leading-relaxed text-white/60">
              Crea un enlace una sola vez, ábrelo en el celular del trabajador y controla aquí su capacidad o disponibilidad.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
            <Smartphone size={24} />
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-orange-500" />
          <h3 className="text-xs font-black uppercase italic">Agregar otro repartidor</h3>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Nombre</span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Repartidor principal"
              className="mt-2 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-black outline-none focus:border-orange-300"
            />
          </label>

          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Capacidad</span>
            <input
              type="number"
              min={1}
              max={8}
              value={maxOrders}
              onChange={event => setMaxOrders(Math.max(1, Math.min(8, Number(event.target.value) || 1)))}
              className="mt-2 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-black outline-none focus:border-orange-300"
            />
          </label>

          <button
            type="button"
            onClick={() => void createDevice()}
            disabled={creating}
            className="self-end rounded-2xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-orange-100 disabled:opacity-50"
          >
            {creating ? <LoaderCircle className="mx-auto animate-spin" size={17} /> : 'Crear enlace'}
          </button>
        </div>

        {createdLink && (
          <div className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={21} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase text-emerald-700">
                  Enlace listo — guárdalo ahora
                </p>
                <p className="mt-2 break-all text-[10px] font-bold leading-relaxed text-emerald-800/75">
                  {createdLink}
                </p>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase text-white"
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-600">
            <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-bold leading-relaxed">{error}</p>
          </div>
        )}
      </section>

      <section className="rounded-[30px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase italic">Celulares habilitados</h3>
            <p className="mt-1 text-[9px] font-bold text-gray-400">Se actualizan sin recargar la página.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadDevices()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"
            aria-label="Actualizar repartidores"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {!loading && devices.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <Smartphone className="mx-auto text-gray-300" size={28} />
              <p className="mt-2 text-xs font-black uppercase text-gray-500">Todavía no hay repartidores</p>
            </div>
          )}

          {devices.map(device => {
            const activeOrders = device.activeOrders || [];
            const updating = updatingId === device.id;
            const connected = device.enabled && device.online;

            return (
              <article key={device.id} className={`rounded-[24px] border p-4 ${device.enabled ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-gray-100 opacity-75'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${connected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                      {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase text-gray-900">{device.name}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase text-gray-400">
                        {device.enabled ? relativeSeen(device.last_seen_at) : 'Deshabilitado'} · {device.load || 0}/{device.max_orders} pedidos
                      </p>
                    </div>
                  </div>

                  <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase ${connected ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : device.enabled ? 'border-gray-200 bg-white text-gray-400' : 'border-red-100 bg-red-50 text-red-500'}`}>
                    {connected ? 'En línea' : device.enabled ? 'Desconectado' : 'Deshabilitado'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-gray-400">
                      <BatteryCharging size={13} /> Batería
                    </div>
                    <p className="mt-2 text-xs font-black text-gray-800">
                      {typeof device.battery_percent === 'number' ? `${device.battery_percent}%` : 'Sin dato'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase text-gray-400">
                      <span className="flex items-center gap-2"><Route size={13} /> Capacidad</span>
                      {updating && <LoaderCircle size={13} className="animate-spin text-orange-500" />}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={updating || device.max_orders <= Math.max(1, device.load || 0)}
                        onClick={() => void updateDevice(device, { maxOrders: device.max_orders - 1 })}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30"
                        aria-label={`Reducir capacidad de ${device.name}`}
                      >
                        <Minus size={13} />
                      </button>
                      <p className="text-xs font-black text-gray-800">{device.load || 0} / {device.max_orders}</p>
                      <button
                        type="button"
                        disabled={updating || device.max_orders >= 8}
                        onClick={() => void updateDevice(device, { maxOrders: device.max_orders + 1 })}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-orange-50 text-orange-600 disabled:opacity-30"
                        aria-label={`Aumentar capacidad de ${device.name}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={updating || (device.enabled && activeOrders.length > 0)}
                  onClick={() => void updateDevice(device, { enabled: !device.enabled })}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[9px] font-black uppercase disabled:opacity-40 ${device.enabled ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}
                >
                  {updating ? <LoaderCircle size={14} className="animate-spin" /> : <Power size={14} />}
                  {device.enabled ? 'Deshabilitar celular' : 'Habilitar celular'}
                </button>

                {device.enabled && activeOrders.length > 0 && (
                  <p className="mt-2 text-center text-[8px] font-bold text-amber-600">
                    Finaliza sus entregas antes de deshabilitarlo.
                  </p>
                )}

                {activeOrders.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {activeOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-800">{order.order_code}</p>
                          <p className="mt-1 text-[8px] font-bold uppercase text-gray-400">
                            {trackingStatusLabel(order.status)}
                          </p>
                        </div>
                        <Link2 size={15} className="text-orange-400" />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
