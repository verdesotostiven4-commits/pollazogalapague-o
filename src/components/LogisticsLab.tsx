import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  CircleDot,
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  Play,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import {
  deriveAutomaticStatus,
  planDeliveries,
  statusLabel,
  type SimOrder,
  type SimRider,
} from '../utils/deliveryPlanner';

type ScenarioId = 'normal' | 'rush' | 'cascada' | 'gps';

type Scenario = {
  id: ScenarioId;
  name: string;
  description: string;
  orders: SimOrder[];
  riders: SimRider[];
};

const scenarios: Scenario[] = [
  {
    id: 'normal',
    name: '1 repartidor · 3 pedidos',
    description: 'Flujo normal con un solo celular de reparto.',
    riders: [
      {
        id: 'r1',
        name: 'Repartidor principal',
        active: true,
        maxOrders: 3,
        distanceFromMiradorM: 10,
        distanceFromCustomerM: 1700,
        moving: false,
        gpsAccuracyM: 12,
      },
    ],
    orders: [
      { id: 'o1', code: 'PZ-101', customer: 'Ana', ageMinutes: 14, distanceKm: 1.7, status: 'listo' },
      { id: 'o2', code: 'PZ-102', customer: 'Luis', ageMinutes: 9, distanceKm: 2.2, status: 'listo' },
      { id: 'o3', code: 'PZ-103', customer: 'Marta', ageMinutes: 4, distanceKm: 1.1, status: 'empacando' },
    ],
  },
  {
    id: 'rush',
    name: 'Hora pico · 2 repartidores',
    description: 'Se reparten automáticamente los pedidos para no cargar a una sola persona.',
    riders: [
      {
        id: 'r1',
        name: 'Repartidor 1',
        active: true,
        maxOrders: 3,
        distanceFromMiradorM: 15,
        distanceFromCustomerM: 2600,
        moving: false,
        gpsAccuracyM: 10,
      },
      {
        id: 'r2',
        name: 'Repartidor 2',
        active: true,
        maxOrders: 3,
        distanceFromMiradorM: 20,
        distanceFromCustomerM: 1900,
        moving: false,
        gpsAccuracyM: 18,
      },
    ],
    orders: [
      { id: 'o1', code: 'PZ-201', customer: 'Carlos', ageMinutes: 22, distanceKm: 2.6, status: 'listo' },
      { id: 'o2', code: 'PZ-202', customer: 'Jazmín', ageMinutes: 18, distanceKm: 1.9, status: 'listo' },
      { id: 'o3', code: 'PZ-203', customer: 'Pedro', ageMinutes: 15, distanceKm: 3.2, status: 'listo' },
      { id: 'o4', code: 'PZ-204', customer: 'Rosa', ageMinutes: 11, distanceKm: 1.4, status: 'listo' },
      { id: 'o5', code: 'PZ-205', customer: 'Kevin', ageMinutes: 7, distanceKm: 2.8, status: 'listo' },
      { id: 'o6', code: 'PZ-206', customer: 'Sofía', ageMinutes: 3, distanceKm: 0.9, status: 'empacando' },
    ],
  },
  {
    id: 'cascada',
    name: 'Recogida en La Cascada',
    description: 'Incluye una parada interna antes de ir al cliente, sin mostrarla en la app pública.',
    riders: [
      {
        id: 'r1',
        name: 'Repartidor principal',
        active: true,
        maxOrders: 3,
        distanceFromMiradorM: 8,
        distanceFromCustomerM: 2100,
        moving: false,
        gpsAccuracyM: 14,
      },
    ],
    orders: [
      { id: 'o1', code: 'PZ-301', customer: 'Diego', ageMinutes: 17, distanceKm: 2.1, status: 'listo', needsCascada: true },
      { id: 'o2', code: 'PZ-302', customer: 'Elena', ageMinutes: 8, distanceKm: 1.3, status: 'listo' },
    ],
  },
  {
    id: 'gps',
    name: 'GPS débil o perdido',
    description: 'El sistema no cambia estados si la ubicación no es confiable.',
    riders: [
      {
        id: 'r1',
        name: 'Repartidor principal',
        active: true,
        maxOrders: 3,
        distanceFromMiradorM: 250,
        distanceFromCustomerM: 900,
        moving: true,
        gpsAccuracyM: 140,
      },
    ],
    orders: [
      { id: 'o1', code: 'PZ-401', customer: 'Andrea', ageMinutes: 13, distanceKm: 1.8, status: 'listo' },
    ],
  },
];

const cloneScenario = (scenario: Scenario) => ({
  orders: scenario.orders.map(order => ({ ...order })),
  riders: scenario.riders.map(rider => ({ ...rider })),
});

const statusTone = (status: SimOrder['status']) => {
  if (status === 'entregado') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'cerca') return 'bg-violet-100 text-violet-700 border-violet-200';
  if (status === 'en_camino') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'listo') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-orange-100 text-orange-700 border-orange-200';
};

export default function LogisticsLab() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('normal');
  const initial = cloneScenario(scenarios[0]);
  const [orders, setOrders] = useState<SimOrder[]>(initial.orders);
  const [riders, setRiders] = useState<SimRider[]>(initial.riders);
  const [step, setStep] = useState(0);
  const [events, setEvents] = useState<string[]>(['Simulación lista. Ningún pedido real fue modificado.']);

  const assignments = useMemo(() => planDeliveries(orders, riders), [orders, riders]);

  const selectScenario = (id: ScenarioId) => {
    const scenario = scenarios.find(item => item.id === id) || scenarios[0];
    const next = cloneScenario(scenario);
    setScenarioId(id);
    setOrders(next.orders);
    setRiders(next.riders);
    setStep(0);
    setEvents([`Escenario cargado: ${scenario.name}.`]);
  };

  const addRider = () => {
    const index = riders.length + 1;
    setRiders(previous => [
      ...previous,
      {
        id: `r${Date.now()}`,
        name: `Repartidor ${index}`,
        active: true,
        maxOrders: 3,
        distanceFromMiradorM: 12,
        distanceFromCustomerM: 2200,
        moving: false,
        gpsAccuracyM: 15,
      },
    ]);
    setEvents(previous => [`Se habilitó un segundo dispositivo de reparto.`, ...previous].slice(0, 8));
  };

  const simulateStep = () => {
    const nextStep = step + 1;
    const currentAssignments = planDeliveries(orders, riders);
    const assignedMap = new Map<string, string>();

    currentAssignments.forEach(assignment => {
      assignment.orderIds.forEach(orderId => assignedMap.set(orderId, assignment.riderId));
    });

    const nextRiders = riders.map(rider => {
      if (nextStep === 1) return { ...rider, moving: false, distanceFromMiradorM: 35 };
      if (nextStep === 2) return { ...rider, moving: true, distanceFromMiradorM: 160, distanceFromCustomerM: 1300 };
      if (nextStep === 3) return { ...rider, moving: true, distanceFromMiradorM: 900, distanceFromCustomerM: 150 };
      return { ...rider, moving: false, distanceFromMiradorM: 1200, distanceFromCustomerM: 25 };
    });

    const nextOrders = orders.map(order => {
      const assignedRiderId = order.assignedRiderId || assignedMap.get(order.id) || null;
      const rider = nextRiders.find(item => item.id === assignedRiderId);
      const withAssignment = { ...order, assignedRiderId };
      const status = deriveAutomaticStatus(withAssignment, rider);
      return { ...withAssignment, status };
    });

    setRiders(nextRiders);
    setOrders(nextOrders);
    setStep(nextStep);

    const message =
      nextStep === 1
        ? 'Pedidos listos asignados sin cambiar todavía a En camino.'
        : nextStep === 2
          ? 'El GPS detectó salida real del local: cambió automáticamente a En camino.'
          : nextStep === 3
            ? 'El repartidor entró al radio del cliente: cambió a Ya casi llega.'
            : 'Llegada detectada. La entrega sigue esperando confirmación manual.';

    setEvents(previous => [message, ...previous].slice(0, 8));
  };

  const markDelivered = (orderId: string) => {
    setOrders(previous =>
      previous.map(order => (order.id === orderId ? { ...order, status: 'entregado' } : order))
    );
    setEvents(previous => ['Entrega confirmada manualmente por el repartidor.', ...previous].slice(0, 8));
  };

  const activeScenario = scenarios.find(item => item.id === scenarioId) || scenarios[0];
  const gpsWarning = riders.some(rider => rider.gpsAccuracyM > 60);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-950/40">
              <Route size={23} />
            </div>
            <div>
              <p className="text-sm font-black uppercase italic">Laboratorio de logística</p>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">La Casa del Pollazo</p>
            </div>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[9px] font-black uppercase text-emerald-300">
            No toca pedidos reales
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4 pb-10">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 flex-shrink-0 text-emerald-300" size={22} />
            <div>
              <h1 className="text-lg font-black uppercase italic">Primero simulamos, después conectamos</h1>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-white/55">
                Aquí probamos carga alta, varios repartidores, paradas en La Cascada, GPS débil y estados automáticos sin arriesgar la aplicación funcionando.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {scenarios.map(scenario => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => selectScenario(scenario.id)}
              className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                scenarioId === scenario.id
                  ? 'border-orange-400 bg-orange-500 text-white shadow-lg shadow-orange-950/30'
                  : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/10'
              }`}
            >
              <p className="text-xs font-black uppercase">{scenario.name}</p>
              <p className="mt-1 text-[10px] font-semibold leading-relaxed opacity-70">{scenario.description}</p>
            </button>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-orange-300">Escenario actual</p>
                  <h2 className="mt-1 text-xl font-black uppercase italic">{activeScenario.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addRider}
                    className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 text-[10px] font-black uppercase active:scale-95"
                  >
                    <Plus size={16} /> Repartidor
                  </button>
                  <button
                    type="button"
                    onClick={simulateStep}
                    className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-4 text-[10px] font-black uppercase shadow-lg shadow-orange-950/30 active:scale-95"
                  >
                    <Play size={16} /> Simular paso
                  </button>
                </div>
              </div>

              {gpsWarning && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200">
                  <AlertTriangle size={19} className="mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">
                    GPS poco preciso. El sistema conserva el estado anterior y evita marcar una salida falsa.
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {orders.map(order => (
                  <article key={order.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black">{order.code}</p>
                        <p className="mt-1 text-[10px] font-semibold text-white/45">{order.customer} · {order.distanceKm} km</p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase ${statusTone(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-black uppercase text-white/45">
                      <span className="rounded-lg bg-white/5 px-2 py-1"><Clock3 size={11} className="mr-1 inline" />{order.ageMinutes} min</span>
                      {order.needsCascada && <span className="rounded-lg bg-red-500/15 px-2 py-1 text-red-300"><Store size={11} className="mr-1 inline" />Recoger en Cascada</span>}
                    </div>
                    {order.status === 'cerca' && (
                      <button
                        type="button"
                        onClick={() => markDelivered(order.id)}
                        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[9px] font-black uppercase text-white active:scale-95"
                      >
                        <CheckCircle2 size={15} /> Confirmar entregado
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Users size={19} className="text-blue-300" />
                <h2 className="text-sm font-black uppercase italic">Dispositivos de reparto</h2>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {riders.map(rider => (
                  <div key={rider.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><Bike size={18} /></div>
                        <div>
                          <p className="text-xs font-black">{rider.name}</p>
                          <p className="text-[9px] font-bold text-white/40">GPS ±{rider.gpsAccuracyM} m</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-300"><CircleDot size={10} />Activo</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-white/5 p-2"><p className="text-base font-black">{rider.maxOrders}</p><p className="text-[8px] font-black uppercase text-white/35">Capacidad</p></div>
                      <div className="rounded-xl bg-white/5 p-2"><p className="text-base font-black">{rider.moving ? 'Sí' : 'No'}</p><p className="text-[8px] font-black uppercase text-white/35">En movimiento</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Navigation size={19} className="text-orange-300" />
                <h2 className="text-sm font-black uppercase italic">Plan automático</h2>
              </div>
              <div className="mt-4 space-y-3">
                {assignments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs font-bold text-white/35">
                    No hay pedidos listos sin asignar.
                  </div>
                ) : (
                  assignments.map(assignment => {
                    const rider = riders.find(item => item.id === assignment.riderId);
                    return (
                      <div key={assignment.riderId} className="rounded-2xl border border-orange-400/15 bg-orange-400/10 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black uppercase">{rider?.name || 'Repartidor'}</p>
                          <span className="text-[9px] font-black text-orange-200">≈ {assignment.estimatedKm} km</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {assignment.stops.map((stop, index) => {
                            const order = orders.find(item => item.id === stop);
                            const label = stop === 'mirador' ? 'El Mirador' : stop === 'cascada' ? 'La Cascada' : order?.code || stop;
                            return (
                              <div key={`${stop}-${index}`} className="flex items-center gap-1.5">
                                <span className="rounded-xl border border-white/10 bg-slate-950/70 px-2 py-1.5 text-[8px] font-black uppercase">{label}</span>
                                {index < assignment.stops.length - 1 && <span className="text-orange-300">→</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2"><PackageCheck size={19} className="text-emerald-300" /><h2 className="text-sm font-black uppercase italic">Registro de prueba</h2></div>
                <button type="button" onClick={() => selectScenario(scenarioId)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 active:scale-95" aria-label="Reiniciar"><RefreshCw size={15} /></button>
              </div>
              <div className="mt-3 space-y-2">
                {events.map((event, index) => (
                  <div key={`${event}-${index}`} className="flex items-start gap-2 rounded-xl bg-slate-900/60 p-2.5">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0 text-orange-300" />
                    <p className="text-[10px] font-semibold leading-relaxed text-white/60">{event}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
