import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function CartAvailabilityToast() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer: number | null = null;

    const handleUnavailable = (event: Event) => {
      const detail = (event as CustomEvent<{ names?: string }>).detail;
      const names = detail?.names || 'un producto';

      setMessage(`Quitamos ${names} del carrito porque ya no está disponible. Puedes continuar con los demás productos.`);

      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(''), 5200);
    };

    window.addEventListener('pollazo:cart-unavailable', handleUnavailable as EventListener);

    return () => {
      window.removeEventListener('pollazo:cart-unavailable', handleUnavailable as EventListener);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+14px)] z-[15000] animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="mx-auto max-w-md rounded-[26px] border border-yellow-100 bg-white shadow-2xl shadow-orange-200/30 p-4 flex gap-3">
        <div className="w-11 h-11 rounded-[18px] bg-yellow-50 text-yellow-600 flex items-center justify-center flex-shrink-0 border border-yellow-100">
          <AlertCircle size={22} />
        </div>
        <p className="flex-1 text-[11px] font-black text-gray-700 uppercase leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={() => setMessage('')}
          className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          aria-label="Cerrar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
