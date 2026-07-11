import { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  Crown,
  Lock,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { deliveryFeeOf } from '../utils/whatsapp';
import { getProductDisplay } from '../utils/productI18n';
import type { CartItem, PaymentMethod, Screen } from '../types';

interface Props {
  onCheckout: () => void;
  onNavigate: (screen: Screen) => void;
  onRequireLogin: (mode: 'block' | 'change_location') => void;
  onEarlySave: () => Promise<void> | void;
}

type CheckoutPayment = Extract<PaymentMethod, 'efectivo' | 'deuna'>;

const money = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? '0').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const linePrice = (item: CartItem) => {
  const custom = Number(item.custom_price ?? item.product.custom_price ?? 0);
  if (Number.isFinite(custom) && custom > 0) return custom;

  const direct = Number(item.price ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  return money(item.product.price);
};

const hasExactPrice = (item: CartItem) => linePrice(item) > 0;

const savedPayment = (): CheckoutPayment | null => {
  const value = localStorage.getItem('selectedPaymentMethod');
  return value === 'efectivo' || value === 'deuna' ? value : null;
};

export default function CartScreen({
  onCheckout,
  onNavigate,
  onRequireLogin,
  onEarlySave,
}: Props) {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const {
    customerName,
    customerPhone,
    customerLat,
    customerLng,
    customerReference,
    hasPollazoPlus,
  } = useUser();
  const { language } = useLanguage();

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPayment | null>(savedPayment);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const subtotal = money(total);
  const deliveryOriginal = deliveryFeeOf(subtotal);
  const delivery = hasPollazoPlus ? 0 : deliveryOriginal;
  const finalTotal = subtotal + delivery;
  const hasUnknownPrice = items.some(item => !hasExactPrice(item));
  const hasProfile = Boolean(customerName.trim() && customerPhone.trim());
  const hasLocation =
    Number.isFinite(customerLat) &&
    Number.isFinite(customerLng) &&
    Boolean(customerReference.trim());

  const canSubmit =
    hasProfile &&
    hasLocation &&
    Boolean(paymentMethod) &&
    (!hasUnknownPrice || paymentMethod === 'efectivo');

  const unitCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    [items]
  );

  const choosePayment = (method: CheckoutPayment) => {
    if (saved) return;

    if (method === 'deuna' && hasUnknownPrice) {
      setNotice('Este pedido tiene precios por confirmar. Por ahora debe quedar en efectivo contra entrega.');
      return;
    }

    setPaymentMethod(method);
    localStorage.setItem('selectedPaymentMethod', method);
    localStorage.removeItem('selectedBank');
    setNotice(null);
  };

  const registerOrder = async () => {
    if (saving || saved) return;

    if (!hasProfile || !hasLocation) {
      onRequireLogin('block');
      return;
    }

    if (!paymentMethod) {
      setNotice('Selecciona efectivo o DeUna al recibir.');
      return;
    }

    if (paymentMethod === 'deuna' && hasUnknownPrice) {
      setNotice('DeUna se habilita cuando todos los precios están definidos.');
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      localStorage.setItem('selectedPaymentMethod', paymentMethod);
      localStorage.removeItem('selectedBank');
      await onEarlySave();
      setSaved(true);
      setNotice(
        paymentMethod === 'deuna'
          ? 'Pedido registrado. Pagarás por DeUna cuando llegue el repartidor.'
          : 'Pedido registrado. Pagarás en efectivo cuando lo recibas.'
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo registrar el pedido.');
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    if (saved) return;
    clearCart();
    localStorage.removeItem('selectedPaymentMethod');
    localStorage.removeItem('selectedBank');
    setPaymentMethod(null);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-16 text-center bg-slate-50">
        <div className="w-24 h-24 rounded-[32px] bg-orange-50 text-orange-400 flex items-center justify-center mb-5">
          <ShoppingBag size={42} />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase italic">Tu carrito está vacío</h2>
        <p className="text-sm font-bold text-slate-400 mt-2 max-w-sm">
          Agrega productos del catálogo para comenzar tu pedido.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="mt-7 bg-orange-500 text-white px-7 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-orange-200 active:scale-95"
        >
          Ver catálogo <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 pt-4 pb-36 space-y-4 overflow-y-auto">
      {saved && (
        <section className="bg-slate-950 text-white rounded-[28px] p-4 flex gap-3 shadow-xl">
          <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Lock size={19} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest">Pedido registrado</p>
            <p className="text-[11px] font-bold text-white/65 mt-1 leading-relaxed">
              El carrito y el método de pago quedaron bloqueados para evitar duplicados.
            </p>
          </div>
        </section>
      )}

      {hasPollazoPlus && (
        <section className="rounded-[28px] border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white p-4 flex gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center shadow-lg">
            <Crown size={21} />
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Pollazo Plus</p>
            <p className="text-sm font-black text-slate-900 uppercase italic">Delivery gratis aplicado</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1">
              Ahorras ${deliveryOriginal.toFixed(2)} en este pedido.
            </p>
          </div>
        </section>
      )}

      <section className="bg-white rounded-[30px] border border-slate-100 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500">Paso 1</p>
            <h2 className="text-lg font-black uppercase italic text-slate-900">Tus productos</h2>
            <p className="text-[10px] font-bold text-slate-400">{unitCount} unidades</p>
          </div>
          <button
            type="button"
            onClick={clearAll}
            disabled={saved}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center disabled:opacity-30"
            aria-label="Vaciar carrito"
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div className="space-y-2">
          {items.map(item => {
            const display = getProductDisplay(item.product, language);
            const price = linePrice(item);
            const quantity = Number(item.quantity || 1);

            return (
              <article
                key={item.product.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3"
              >
                <img
                  src={item.product.image || '/logo-final.png'}
                  alt={display.name}
                  className="w-14 h-14 rounded-2xl object-cover bg-white border border-slate-100"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800 uppercase truncate">{display.name}</p>
                  <p className="text-[10px] font-black text-orange-600 mt-1">
                    {price > 0 ? `$${price.toFixed(2)}` : 'Precio por confirmar'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      disabled={saved}
                      onClick={() =>
                        quantity <= 1
                          ? removeItem(item.product.id)
                          : updateQuantity(item.product.id, quantity - 1)
                      }
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-8 text-center text-sm font-black">{quantity}</span>
                    <button
                      type="button"
                      disabled={saved}
                      onClick={() => updateQuantity(item.product.id, quantity + 1)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-black text-slate-900">
                  {price > 0 ? `$${(price * quantity).toFixed(2)}` : '--'}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-[30px] border border-slate-100 p-4 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
            <MapPin size={19} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500">Paso 2</p>
            <h2 className="text-sm font-black uppercase italic text-slate-900">Entrega</h2>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              {hasProfile && hasLocation ? customerReference : 'Completa tus datos y ubicación'}
            </p>
          </div>
          <button
            type="button"
            disabled={saved}
            onClick={() => onRequireLogin(hasProfile ? 'change_location' : 'block')}
            className="bg-orange-50 text-orange-600 border border-orange-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase disabled:opacity-30"
          >
            {hasProfile && hasLocation ? 'Cambiar' : 'Completar'}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-[30px] border border-slate-100 p-4 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
            <Wallet size={19} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500">Paso 3</p>
            <h2 className="text-sm font-black uppercase italic text-slate-900">Forma de pago</h2>
            <p className="text-[11px] font-bold text-slate-400 mt-1">Solo pago contra entrega</p>
          </div>
        </div>

        {hasUnknownPrice && (
          <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-3 text-[10px] font-bold text-yellow-700">
            Hay productos con precio por confirmar. El negocio revisará el total antes de preparar.
          </div>
        )}

        <button
          type="button"
          disabled={saved}
          onClick={() => choosePayment('efectivo')}
          className={`w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-all disabled:opacity-60 ${
            paymentMethod === 'efectivo'
              ? 'bg-green-50 border-green-400 ring-2 ring-green-100'
              : 'bg-white border-slate-100'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-white text-green-600 flex items-center justify-center shadow-sm">
            <Banknote size={22} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase text-green-700">Efectivo</p>
            <p className="text-[10px] font-bold text-green-700/65 mt-1">Pagas cuando recibes el pedido</p>
          </div>
          {paymentMethod === 'efectivo' && <CheckCircle2 size={20} className="text-green-600" />}
        </button>

        <button
          type="button"
          disabled={saved || hasUnknownPrice}
          onClick={() => choosePayment('deuna')}
          className={`w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-all disabled:opacity-35 ${
            paymentMethod === 'deuna'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-100'
              : 'bg-white border-slate-100'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-white text-purple-600 flex items-center justify-center shadow-sm">
            <QrCode size={22} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase text-purple-700">DeUna al recibir</p>
            <p className="text-[10px] font-bold text-purple-700/65 mt-1">
              El repartidor muestra su QR personal cuando llegue
            </p>
          </div>
          {paymentMethod === 'deuna' && <CheckCircle2 size={20} className="text-purple-600" />}
        </button>

        {paymentMethod === 'deuna' && (
          <div className="rounded-2xl bg-purple-50 border border-purple-100 p-3 flex gap-3">
            <ShieldCheck size={19} className="text-purple-600 flex-shrink-0" />
            <p className="text-[10px] font-bold text-purple-700 leading-relaxed">
              No pagues antes. Cuando llegue el repartidor, escanea su QR de DeUna y él confirmará el cobro.
            </p>
          </div>
        )}
      </section>

      <section className="bg-white rounded-[30px] border border-slate-100 p-4 shadow-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-bold text-slate-500">Subtotal</span>
          <span className="font-black text-slate-900">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-bold text-slate-500">Delivery</span>
          <span className="font-black text-slate-900">
            {delivery === 0 ? 'GRATIS' : `$${delivery.toFixed(2)}`}
          </span>
        </div>
        <div className="border-t border-slate-100 pt-3 flex justify-between items-end">
          <span className="font-black uppercase text-slate-900">Total</span>
          <span className="text-2xl font-black text-orange-600">${finalTotal.toFixed(2)}</span>
        </div>
        {hasUnknownPrice && (
          <p className="text-[10px] font-bold text-yellow-700 bg-yellow-50 rounded-xl p-2">
            Total parcial: faltan precios por confirmar.
          </p>
        )}
      </section>

      {notice && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-[10px] font-black text-blue-700 uppercase leading-relaxed">
          {notice}
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-20 z-30 px-4 pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          {!saved ? (
            <button
              type="button"
              onClick={registerOrder}
              disabled={!canSubmit || saving}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-2xl py-4 font-black uppercase text-xs shadow-xl shadow-orange-200 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {saving ? 'Registrando...' : 'Confirmar pedido'}
              {!saving && <ChevronRight size={18} />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCheckout}
              className="w-full bg-slate-950 text-white rounded-2xl py-4 font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Ver confirmación <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
