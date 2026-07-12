import fs from 'node:fs';

const path = 'src/components/RiderTrackingBridge.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (before, after, label) => {
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`No se encontró: ${label}`);
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Aparece más de una vez: ${label}`);
  }
  source = `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
};

replaceOnce(
  "} from '../utils/deliveryTrackingApi';\n",
  "} from '../utils/deliveryTrackingApi';\nimport {\n  enqueueTrackingUpdates,\n  flushTrackingQueue,\n  readTrackingQueue,\n  type QueuedTrackingUpdate,\n} from '../utils/deliveryTrackingQueue';\n",
  'importar cola offline'
);

replaceOnce(
  "const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';\nconst STORE_LOCATION_KEY = 'pollazo_delivery_store_location_v1';\n",
  "const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';\nconst STORE_LOCATION_KEY = 'pollazo_delivery_store_location_v1';\nconst AUTO_MODE_KEY = 'pollazo_delivery_auto_mode_v1';\n",
  'constante modo automático'
);

replaceOnce(
  `    if (fromUrl) {\n      localStorage.setItem(DEVICE_TOKEN_KEY, fromUrl);\n      return fromUrl;\n    }`,
  `    if (fromUrl) {\n      localStorage.setItem(DEVICE_TOKEN_KEY, fromUrl);\n      params.delete('device');\n      const query = params.toString();\n      window.history.replaceState(\n        {},\n        document.title,\n        \`${'${window.location.pathname}'}${'${query ? `?${query}` : \'\'}'}${'${window.location.hash}'}\`\n      );\n      return fromUrl;\n    }`,
  'limpiar token de la URL'
);

replaceOnce(
  "const activeStatus = (status?: TrackingStatus | null) =>\n",
  "const readAutoMode = () => {\n  try {\n    return localStorage.getItem(AUTO_MODE_KEY) !== '0';\n  } catch {\n    return true;\n  }\n};\n\nconst activeStatus = (status?: TrackingStatus | null) =>\n",
  'lector modo automático'
);

replaceOnce(
  "  const [online, setOnline] = useState(() => navigator.onLine);\n  const [loading, setLoading] = useState(Boolean(deviceToken));\n",
  "  const [online, setOnline] = useState(() => navigator.onLine);\n  const [autoMode, setAutoMode] = useState(readAutoMode);\n  const [queuedCount, setQueuedCount] = useState(() => readTrackingQueue().length);\n  const [loading, setLoading] = useState(Boolean(deviceToken));\n",
  'estados de cola y automático'
);

replaceOnce(
  "  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);\n",
  "  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);\n  const autoStartingRef = useRef(false);\n",
  'guardia de auto inicio'
);

replaceOnce(
  "  useEffect(() => {\n    sessionsRef.current = sessions;\n  }, [sessions]);\n",
  "  useEffect(() => {\n    sessionsRef.current = sessions;\n  }, [sessions]);\n\n  useEffect(() => {\n    try {\n      localStorage.setItem(AUTO_MODE_KEY, autoMode ? '1' : '0');\n    } catch {\n      // El modo sigue funcionando durante la sesión aunque no se pueda guardar.\n    }\n  }, [autoMode]);\n",
  'persistir modo automático'
);

replaceOnce(
  "  useEffect(() => {\n    const handleOnline = () => {\n      setOnline(true);\n      setMessage('Internet recuperado. El rastreo continúa.');\n    };",
  "  const flushQueuedPositions = useCallback(async () => {\n    if (!navigator.onLine) return;\n\n    const result = await flushTrackingQueue(item =>\n      trackingPost<UpdateResult>('update_location', item)\n    );\n    setQueuedCount(result.remaining);\n\n    if (result.sent > 0) {\n      setMessage(`${result.sent} ubicaciones pendientes fueron sincronizadas.`);\n      await refreshDevice();\n      await onOrdersChanged();\n    }\n  }, [onOrdersChanged, refreshDevice]);\n\n  useEffect(() => {\n    const handleOnline = () => {\n      setOnline(true);\n      setMessage('Internet recuperado. Sincronizando ubicaciones pendientes…');\n      void flushQueuedPositions();\n    };",
  'sincronizador de cola offline'
);

replaceOnce(
  "  }, []);\n\n  const requestWakeLock = useCallback(async () => {",
  "  }, [flushQueuedPositions]);\n\n  const requestWakeLock = useCallback(async () => {",
  'dependencia del evento online'
);

replaceOnce(
  `      const batteryPercent = await getBatteryPercent();\n\n      const active = sessionsRef.current.filter(session => activeStatus(session.status));\n      const results = await Promise.allSettled(\n        active.map(session =>\n          trackingPost<UpdateResult>('update_location', {\n            deviceToken,\n            sessionId: session.id,\n            latitude: position.coords.latitude,\n            longitude: position.coords.longitude,\n            accuracyM: position.coords.accuracy,\n            speedMps: position.coords.speed,\n            headingDeg: position.coords.heading,\n            capturedAt: position.timestamp || Date.now(),\n            batteryPercent,\n          })\n        )\n      );`,
  `      const batteryPercent = await getBatteryPercent();\n\n      const active = sessionsRef.current.filter(session => activeStatus(session.status));\n      const payloads: QueuedTrackingUpdate[] = active.map(session => ({\n        deviceToken,\n        sessionId: session.id,\n        latitude: position.coords.latitude,\n        longitude: position.coords.longitude,\n        accuracyM: position.coords.accuracy,\n        speedMps: position.coords.speed,\n        headingDeg: position.coords.heading,\n        capturedAt: position.timestamp || Date.now(),\n        batteryPercent,\n      }));\n\n      if (!navigator.onLine) {\n        const queue = enqueueTrackingUpdates(payloads);\n        setQueuedCount(queue.length);\n        setOnline(false);\n        setMessage(`${queue.length} ubicaciones guardadas hasta recuperar internet.`);\n        return;\n      }\n\n      await flushQueuedPositions();\n      const results = await Promise.allSettled(\n        payloads.map(payload =>\n          trackingPost<UpdateResult>('update_location', payload)\n        )\n      );\n\n      const failedPayloads = payloads.filter((_, index) => results[index]?.status === 'rejected');\n      if (failedPayloads.length > 0) {\n        const queue = enqueueTrackingUpdates(failedPayloads);\n        setQueuedCount(queue.length);\n      } else {\n        setQueuedCount(readTrackingQueue().length);\n      }`,
  'guardar ubicaciones sin internet'
);

replaceOnce(
  "    [deviceToken, onOrdersChanged]\n  );",
  "    [deviceToken, flushQueuedPositions, onOrdersChanged]\n  );",
  'dependencia de envío GPS'
);

replaceOnce(
  "  const completeSession = async (session: TrackingSession) => {",
  `  useEffect(() => {\n    if (\n      !autoMode ||\n      !online ||\n      !deviceToken ||\n      !storePoint ||\n      !device ||\n      autoStartingRef.current\n    ) {\n      return;\n    }\n\n    const activeCodes = new Set(activeSessions.map(session => session.order_code));\n    const availableCapacity = Math.max(0, device.max_orders - activeSessions.length);\n    const candidates = readyOrders\n      .filter(order => order.order_code && !activeCodes.has(order.order_code))\n      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())\n      .slice(0, availableCapacity);\n\n    if (candidates.length === 0) return;\n\n    const run = async () => {\n      autoStartingRef.current = true;\n      let started = 0;\n\n      for (const order of candidates) {\n        try {\n          await trackingPost<StartResult>('start_session', {\n            deviceToken,\n            orderCode: order.order_code,\n            storeLat: storePoint.latitude,\n            storeLng: storePoint.longitude,\n          });\n          started += 1;\n        } catch {\n          // Otro celular pudo tomarlo primero; la restricción del servidor evita duplicados.\n        }\n      }\n\n      if (started > 0) {\n        navigator.vibrate?.(80);\n        setMessage(`${started} pedido${started !== 1 ? 's' : ''} asignado${started !== 1 ? 's' : ''} automáticamente.`);\n      }\n\n      await refreshDevice();\n      await onOrdersChanged();\n      autoStartingRef.current = false;\n    };\n\n    void run().catch(cause => {\n      autoStartingRef.current = false;\n      setError(cause instanceof Error ? cause.message : 'No se pudo completar la asignación automática.');\n    });\n  }, [\n    activeSessions,\n    autoMode,\n    device,\n    deviceToken,\n    onOrdersChanged,\n    online,\n    readyOrders,\n    refreshDevice,\n    storePoint,\n  ]);\n\n  const completeSession = async (session: TrackingSession) => {`,
  'modo automático real'
);

replaceOnce(
  "        {message && (\n",
  `        <div className="grid grid-cols-2 gap-2">\n          <button\n            type="button"\n            onClick={() => setAutoMode(value => !value)}\n            className={\`rounded-2xl border p-3 text-left transition ${'${autoMode ? \'border-emerald-100 bg-emerald-50 text-emerald-700\' : \'border-gray-100 bg-gray-50 text-gray-500\'}'}\`}\n          >\n            <p className="text-[8px] font-black uppercase tracking-widest">Asignación automática</p>\n            <p className="mt-1 text-[10px] font-black uppercase">{autoMode ? 'Activa' : 'Pausada'}</p>\n          </button>\n          <div className={\`rounded-2xl border p-3 ${'${queuedCount > 0 ? \'border-amber-100 bg-amber-50 text-amber-700\' : \'border-gray-100 bg-gray-50 text-gray-500\'}'}\`}>\n            <p className="text-[8px] font-black uppercase tracking-widest">Cola sin internet</p>\n            <p className="mt-1 text-[10px] font-black uppercase">{queuedCount} pendiente{queuedCount !== 1 ? 's' : ''}</p>\n          </div>\n        </div>\n\n        {message && (\n`,
  'controles de automático y cola'
);

fs.writeFileSync(path, source);
console.log('Rastreo endurecido: cola offline, autoasignación y token fuera de la URL.');
