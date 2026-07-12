import fs from 'node:fs';

const replaceOnce = (source, before, after, label) => {
  const index = source.indexOf(before);
  if (index === -1) throw new Error(`No se encontró el bloque esperado: ${label}`);
  if (source.indexOf(before, index + before.length) !== -1) {
    throw new Error(`El bloque aparece más de una vez: ${label}`);
  }
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
};

const adminContextPath = 'src/context/AdminContext.tsx';
let adminContext = fs.readFileSync(adminContextPath, 'utf8');

adminContext = replaceOnce(
  adminContext,
  "  useMemo,\n  useState,",
  "  useMemo,\n  useRef,\n  useState,",
  'importar useRef'
);

adminContext = replaceOnce(
  adminContext,
  "  const [loading, setLoading] = useState(true);\n",
  "  const [loading, setLoading] = useState(true);\n  const loadInFlightRef = useRef<Promise<void> | null>(null);\n",
  'crear guardia de sincronización'
);

adminContext = replaceOnce(
  adminContext,
  "  const load = useCallback(async () => {\n    setLoading(true);\n\n    try {",
  "  const load = useCallback(async () => {\n    if (loadInFlightRef.current) {\n      return loadInFlightRef.current;\n    }\n\n    const request = (async () => {\n      try {",
  'inicio de carga silenciosa'
);

adminContext = replaceOnce(
  adminContext,
  "    } catch (error) {\n      console.error('❌ Error cargando datos protegidos:', error);\n    } finally {\n      setLoading(false);\n    }\n  }, []);",
  "      } catch (error) {\n        console.error('❌ Error cargando datos protegidos:', error);\n      } finally {\n        setLoading(false);\n        loadInFlightRef.current = null;\n      }\n    })();\n\n    loadInFlightRef.current = request;\n    return request;\n  }, []);",
  'fin de carga silenciosa'
);

fs.writeFileSync(adminContextPath, adminContext);

const deliveryPath = 'src/components/DeliveryDashboard.tsx';
let delivery = fs.readFileSync(deliveryPath, 'utf8');

const duplicatedRefresh = `  useEffect(() => {\n    void refreshData();\n\n    const interval = window.setInterval(() => {\n      void refreshData();\n    }, 9000);\n\n    const handleFocus = () => {\n      void refreshData();\n    };\n\n    const handleVisibility = () => {\n      if (document.visibilityState === 'visible') {\n        void refreshData();\n      }\n    };\n\n    window.addEventListener('focus', handleFocus);\n    document.addEventListener('visibilitychange', handleVisibility);\n\n    return () => {\n      window.clearInterval(interval);\n      window.removeEventListener('focus', handleFocus);\n      document.removeEventListener('visibilitychange', handleVisibility);\n    };\n  }, [refreshData]);\n\n`;

delivery = replaceOnce(delivery, duplicatedRefresh, '', 'refresco duplicado del repartidor');
delivery = replaceOnce(
  delivery,
  "\n\n      await refreshData();\n    } catch (error) {",
  "\n    } catch (error) {",
  'refresco doble después de cambiar estado'
);

fs.writeFileSync(deliveryPath, delivery);
console.log('Fase 3 aplicada: sincronización silenciosa y sin refrescos duplicados.');
