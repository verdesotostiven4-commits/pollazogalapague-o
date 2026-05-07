import { MessageCircle, X, ChevronRight } from 'lucide-react';

interface Props {
  visible: boolean;
  onClose: () => void;
  onWhatsApp: () => void;
}

export default function OrderConfirmation({ visible, onClose, onWhatsApp }: Props) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
        
        <div className="text-center mb-8 mt-4">
          <div className="w-20 h-20 bg-[#25D366] text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100">
            <MessageCircle size={40} fill="currentColor" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 uppercase italic leading-none mb-3">¿Todo listo?</h3>
          <p className="text-sm font-bold text-gray-400">Te enviaremos a WhatsApp para finalizar tu pedido con el comprobante de pago.</p>
        </div>

        <button onClick={onWhatsApp} className="w-full py-5 bg-[#25D366] text-white font-black rounded-[24px] shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
          Enviar por WhatsApp <ChevronRight size={18}/>
        </button>
      </div>
    </div>
  );
}
