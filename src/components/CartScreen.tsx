import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Banknote,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Crown,
  Gift,
  Home,
  Info,
  Lock,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { deliveryFeeOf, isFixedPrice } from '../utils/whatsapp';
import { getProductDisplay } from '../utils/productI18n';
import type { CartItem, LanguageCode, PaymentMethod, Product, Screen } from '../types';

interface Props {
  onCheckout: () => void;
  onNavigate: (s: Screen) => void;
  onRequireLogin: (mode: 'block' | 'change_location') => void;
  onEarlySave: () => Promise<void> | void;
}

type SupportedPaymentMethod = Extract<PaymentMethod, 'efectivo' | 'deuna' | 'transferencia'>;
type TextKey = keyof typeof TEXTS;

const CONFETTI_COLORS = [
  '#f97316',
  '#fbbf24',
  '#ea580c',
  '#fb923c',
  '#fde68a',
  '#f59e0b',
  '#fdba74',
  '#ffffff',
];

const BUSINESS_DEUNA_PHONE = '0989795628';
const BUSINESS_BANK_ACCOUNT = '2204567890';
const BUSINESS_BANK_ID = '1726543210';
const BUSINESS_BENEFICIARY = 'La Casa del Pollazo';
const PLUS_OPEN_SIGNAL_KEY = 'pollazo_open_plus';

const TEXTS = {
  emptyTitle: {
    es: 'Tu carrito está vacío',
    en: 'Your cart is empty',
    pt: 'Seu carrinho está vazio',
    fr: 'Votre panier est vide',
    de: 'Dein Warenkorb ist leer',
    it: 'Il carrello è vuoto',
    zh: '购物车是空的',
    ja: 'カートは空です',
    nl: 'Je winkelwagen is leeg',
    ru: 'Корзина пуста',
  },
  emptyText: {
    es: 'Agrega productos del catálogo para comenzar tu pedido.',
    en: 'Add products from the catalog to start your order.',
    pt: 'Adicione produtos do catálogo para começar seu pedido.',
    fr: 'Ajoutez des produits du catalogue pour commencer votre commande.',
    de: 'Füge Produkte aus dem Katalog hinzu, um zu bestellen.',
    it: 'Aggiungi prodotti dal catalogo per iniziare l’ordine.',
    zh: '从目录添加商品即可开始下单。',
    ja: 'カタログから商品を追加して注文を始めます。',
    nl: 'Voeg producten uit de catalogus toe om je bestelling te starten.',
    ru: 'Добавьте товары из каталога, чтобы начать заказ.',
  },
  viewCatalog: { es: 'Ver catálogo', en: 'View catalog', pt: 'Ver catálogo', fr: 'Voir le catalogue', de: 'Katalog ansehen', it: 'Vedi catalogo', zh: '查看目录', ja: 'カタログを見る', nl: 'Catalogus bekijken', ru: 'Открыть каталог' },
  step: { es: 'Paso {step}', en: 'Step {step}', pt: 'Passo {step}', fr: 'Étape {step}', de: 'Schritt {step}', it: 'Passo {step}', zh: '第 {step} 步', ja: 'ステップ {step}', nl: 'Stap {step}', ru: 'Шаг {step}' },
  orderLockedTitle: { es: 'Pedido registrado', en: 'Order registered', zh: '订单已登记', ja: '注文を登録しました' },
  orderLockedText: { es: 'Para evitar errores, el carrito y método de pago quedan bloqueados.', en: 'To avoid mistakes, the cart and payment method are locked.', zh: '为避免错误，购物车和付款方式已锁定。', ja: '間違いを防ぐため、カートと支払い方法はロックされています。' },
  plusActive: { es: 'Pollazo Plus activo', en: 'Pollazo Plus active', zh: 'Pollazo Plus 已开启', ja: 'Pollazo Plus 有効' },
  plusDeliveryApplied: { es: 'Delivery gratis aplicado', en: 'Free delivery applied', zh: '已应用免费配送', ja: '無料配送が適用されました' },
  plusReady: { es: 'Tu membresía está lista para aplicar beneficios.', en: 'Your membership is ready to apply benefits.', zh: '你的会员已准备好使用福利。', ja: 'メンバーシップ特典を利用できます。' },
  plusSaving: { es: 'Ahorras ${amount} en este pedido.', en: 'You save ${amount} on this order.', zh: '本订单节省 ${amount}。', ja: 'この注文で ${amount} お得です。' },
  expires: { es: 'Vence el {date}.', en: 'Expires on {date}.', zh: '到期日：{date}。', ja: '有効期限：{date}。' },
  plusTip: { es: 'Tip Pollazo Plus', en: 'Pollazo Plus tip', zh: 'Pollazo Plus 提示', ja: 'Pollazo Plus ヒント' },
  plusFreeDelivery: { es: 'Este delivery podría ser gratis', en: 'This delivery could be free', zh: '这次配送可以免费', ja: 'この配送は無料にできます' },
  plusBadgeSave: { es: 'Ahorras ${amount}', en: 'Save ${amount}', zh: '节省 ${amount}', ja: '${amount} お得' },
  plusPitch: { es: 'Hoy pagarías ${amount} de delivery. Con Pollazo Plus, este envío saldría gratis y podrías recibir beneficios sorpresa cuando estén activos.', en: 'Today you would pay ${amount} for delivery. With Pollazo Plus, this delivery would be free and you could receive surprise benefits.', zh: '今天配送费为 ${amount}。使用 Pollazo Plus，本次配送免费，并可能获得惊喜福利。', ja: '今日の配送料は ${amount} です。Pollazo Plusならこの配送が無料になり、特典を受け取れる場合があります。' },
  viewPlus: { es: 'Ver Pollazo Plus', en: 'View Pollazo Plus', zh: '查看 Pollazo Plus', ja: 'Pollazo Plusを見る' },
  productsTitle: { es: 'Tus productos', en: 'Your products', zh: '你的商品', ja: '商品' },
  unitsInCart: { es: '{count} unidad{plural} en el carrito', en: '{count} item{plural} in cart', zh: '购物车中有 {count} 件商品', ja: 'カート内 {count} 点' },
  consultPrice: { es: 'Consultar precio', en: 'Ask price', zh: '咨询价格', ja: '価格確認' },
  decreaseProduct: { es: 'Restar producto', en: 'Decrease product', zh: '减少商品', ja: '商品を減らす' },
  increaseProduct: { es: 'Sumar producto', en: 'Increase product', zh: '增加商品', ja: '商品を増やす' },
  removeProduct: { es: 'Eliminar producto', en: 'Remove product', zh: '删除商品', ja: '商品を削除' },
  emptyCart: { es: 'Vaciar carrito', en: 'Empty cart', zh: '清空购物车', ja: 'カートを空にする' },
  clearConfirm: { es: '¿Seguro? toca otra vez para vaciar', en: 'Sure? Tap again to empty', zh: '确定吗？再次点击清空', ja: 'よろしいですか？もう一度タップ' },
  cartLocked: { es: 'Pedido registrado: carrito bloqueado', en: 'Order registered: cart locked', zh: '订单已登记：购物车已锁定', ja: '注文登録済み：カートはロック中' },
  deliveryTitle: { es: 'Entrega', en: 'Delivery', pt: 'Entrega', fr: 'Livraison', de: 'Lieferung', it: 'Consegna', zh: '配送', ja: '配送', nl: 'Bezorging', ru: 'Доставка' },
  deliveryReady: { es: 'Dirección lista para entregar', en: 'Address ready for delivery', zh: '配送地址已准备好', ja: '配送先の準備完了' },
  deliveryMissing: { es: 'Completa tus datos y ubicación', en: 'Complete your details and location', zh: '请完善资料和位置', ja: '情報と場所を入力してください' },
  needDelivery: { es: 'Necesitamos saber dónde entregar', en: 'We need to know where to deliver', zh: '我们需要知道配送地点', ja: '配送先が必要です' },
  needDeliveryText: { es: 'Completa tu nombre, WhatsApp y punto exacto para continuar.', en: 'Complete your name, WhatsApp and exact location to continue.', zh: '请填写姓名、WhatsApp 和准确位置以继续。', ja: '続行するには名前、WhatsApp、正確な場所を入力してください。' },
  completeData: { es: 'Completar datos', en: 'Complete details', zh: '完善资料', ja: '情報を入力' },
  deliveryAddress: { es: 'Dirección de entrega', en: 'Delivery address', zh: '配送地址', ja: '配送先住所' },
  defaultLocation: { es: 'Ubicación en Puerto Ayora', en: 'Location in Puerto Ayora', zh: 'Puerto Ayora 的位置', ja: 'Puerto Ayora の場所' },
  change: { es: 'Cambiar', en: 'Change', zh: '更改', ja: '変更' },
  paymentTitle: { es: 'Forma de pago', en: 'Payment method', zh: '付款方式', ja: '支払い方法' },
  payOnReceive: { es: 'Pagarás al recibir', en: 'Pay when you receive', zh: '收到时付款', ja: '受け取り時に支払い' },
  digitalPayment: { es: 'Pedido con pago digital', en: 'Order with digital payment', zh: '数字付款订单', ja: 'デジタル支払いの注文' },
  choosePayment: { es: 'Elige cómo quieres pagar', en: 'Choose how you want to pay', zh: '选择付款方式', ja: '支払い方法を選択' },
  consultAlertTitle: { es: 'Hay precios por confirmar', en: 'Some prices need confirmation', zh: '有价格需要确认', ja: '価格確認が必要です' },
  consultAlertText: { es: 'Para productos con precio a consultar, el negocio confirma el total antes de preparar.', en: 'For ask-price products, the business confirms the total before preparing.', zh: '对于需咨询价格的商品，商家会先确认总额再准备。', ja: '価格確認の商品は、準備前に店舗が合計を確認します。' },
  confirmPrice: { es: 'Confirmar precio', en: 'Confirm price', zh: '确认价格', ja: '価格を確認' },
  cash: { es: 'Efectivo', en: 'Cash', pt: 'Dinheiro', fr: 'Espèces', de: 'Barzahlung', it: 'Contanti', zh: '现金', ja: '現金', nl: 'Contant', ru: 'Наличные' },
  businessReviewsTotal: { es: 'El negocio revisa el total', en: 'The business reviews the total', zh: '商家会确认总额', ja: '店舗が合計を確認します' },
  payWhenReceive: { es: 'Pagas al recibir', en: 'Pay on delivery', zh: '收货付款', ja: '受け取り時払い' },
  deunaDescription: { es: 'Pago rápido por QR o número', en: 'Fast payment by QR or number', zh: '通过二维码或号码快速付款', ja: 'QRまたは番号で簡単支払い' },
  transfer: { es: 'Transferencia', en: 'Bank transfer', pt: 'Transferência', fr: 'Virement', de: 'Überweisung', it: 'Bonifico', zh: '银行转账', ja: '銀行振込', nl: 'Overschrijving', ru: 'Перевод' },
  transferDescription: { es: 'Elige tu banco y copia datos', en: 'Choose your bank and copy details', zh: '选择银行并复制资料', ja: '銀行を選んで情報をコピー' },
  blockedDeuna: { es: 'No se puede pagar por Deuna hasta confirmar todos los precios.', en: 'You cannot pay with Deuna until all prices are confirmed.', zh: '所有价格确认前不能用 Deuna 付款。', ja: 'すべての価格確認まで Deuna で支払えません。' },
  blockedTransfer: { es: 'No se puede pagar por transferencia hasta confirmar todos los precios.', en: 'You cannot pay by transfer until all prices are confirmed.', zh: '所有价格确认前不能银行转账。', ja: 'すべての価格確認まで銀行振込はできません。' },
  cashStatusTitle: { es: 'Pago contra entrega', en: 'Pay on delivery', zh: '货到付款', ja: '代金引換' },
  cashStatusText: { es: 'Pagarás cuando recibas tu pedido.', en: 'You will pay when you receive your order.', zh: '收到订单时付款。', ja: '注文を受け取る時に支払います。' },
  paymentReadyTitle: { es: 'Datos de pago listos', en: 'Payment details ready', zh: '付款信息已准备好', ja: '支払い情報の準備完了' },
  paymentReadyText: { es: 'Realiza el pago y luego toca “Ya pagué / continuar”.', en: 'Make the payment and then tap “I paid / continue”.', zh: '付款后点击“我已付款 / 继续”。', ja: '支払い後「支払い済み / 続行」をタップしてください。' },
  scanQr: { es: 'Escanea el código desde Deuna o Pichincha', en: 'Scan the code from Deuna or Pichincha', zh: '使用 Deuna 或 Pichincha 扫码', ja: 'Deuna または Pichincha でコードをスキャン' },
  samePhone: { es: '¿En el mismo celular? Paga directo al número:', en: 'On the same phone? Pay directly to this number:', zh: '同一手机上？直接付款到这个号码：', ja: '同じスマホですか？この番号へ直接支払い：' },
  copy: { es: 'Copiar', en: 'Copy', zh: '复制', ja: 'コピー' },
  copied: { es: 'Copiado', en: 'Copied', zh: '已复制', ja: 'コピー済み' },
  thenContinue: { es: 'Luego toca “Ya pagué / continuar”.', en: 'Then tap “I paid / continue”.', zh: '然后点击“我已付款 / 继续”。', ja: 'その後「支払い済み / 続行」をタップしてください。' },
  selectBank: { es: 'Selecciona tu banco:', en: 'Select your bank:', zh: '选择你的银行：', ja: '銀行を選択：' },
  accountDetails: { es: 'Datos de nuestra cuenta:', en: 'Our account details:', zh: '我们的账户信息：', ja: '当店の口座情報：' },
  bank: { es: 'Banco', en: 'Bank', zh: '银行', ja: '銀行' },
  accountNumber: { es: 'Número de cuenta', en: 'Account number', zh: '账号', ja: '口座番号' },
  idNumber: { es: 'Cédula', en: 'ID number', zh: '身份证号', ja: '身分証番号' },
  beneficiary: { es: 'Beneficiario', en: 'Beneficiary', zh: '收款人', ja: '受取人' },
  confirmTitle: { es: 'Confirmar', en: 'Confirm', pt: 'Confirmar', fr: 'Confirmer', de: 'Bestätigen', it: 'Conferma', zh: '确认', ja: '確認', nl: 'Bevestigen', ru: 'Подтвердить' },
  confirmSubtitle: { es: 'Revisa el total antes de continuar', en: 'Check the total before continuing', zh: '继续前请检查总额', ja: '続行前に合計を確認' },
  products: { es: 'Productos', en: 'Products', zh: '商品', ja: '商品' },
  partialSubtotal: { es: 'Subtotal parcial', en: 'Partial subtotal', zh: '部分小计', ja: '一部小計' },
  subtotal: { es: 'Subtotal', en: 'Subtotal', zh: '小计', ja: '小計' },
  deliveryFee: { es: 'Delivery', en: 'Delivery', zh: '配送费', ja: '配送料' },
  freePlus: { es: 'GRATIS PLUS', en: 'FREE PLUS', zh: 'PLUS 免费', ja: 'PLUS 無料' },
  free: { es: 'GRATIS', en: 'FREE', zh: '免费', ja: '無料' },
  plusApplied: { es: 'Pollazo Plus aplicado: delivery gratis en este pedido.', en: 'Pollazo Plus applied: free delivery on this order.', zh: '已应用 Pollazo Plus：本订单免配送费。', ja: 'Pollazo Plus 適用：この注文は配送料無料です。' },
  partialTotal: { es: 'Total parcial', en: 'Partial total', zh: '部分总额', ja: '一部合計' },
  finalTotal: { es: 'Total final', en: 'Final total', zh: '最终总额', ja: '最終合計' },
  someNeedConfirm: { es: 'Algunos productos requieren confirmación de precio.', en: 'Some products require price confirmation.', zh: '部分商品需要确认价格。', ja: '一部商品は価格確認が必要です。' },
  seeMore: { es: 'Ver más información del pedido', en: 'See more order information', zh: '查看更多订单信息', ja: '注文の詳細を見る' },
  payment: { es: 'Pago', en: 'Payment', zh: '付款', ja: '支払い' },
  pending: { es: 'Pendiente', en: 'Pending', zh: '待处理', ja: '保留中' },
  chooseBank: { es: 'Elige banco', en: 'Choose bank', zh: '选择银行', ja: '銀行を選択' },
  plusActiveShort: { es: 'Plus activo', en: 'Plus active', zh: 'Plus 已开启', ja: 'Plus 有効' },
  confirmOrder: { es: 'Confirmar pedido', en: 'Confirm order', zh: '确认订单', ja: '注文を確認' },
  viewConfirmation: { es: 'Ver confirmación', en: 'View confirmation', zh: '查看确认', ja: '確認を見る' },
  paidContinue: { es: 'Ya pagué / continuar', en: 'I paid / continue', zh: '我已付款 / 继续', ja: '支払い済み / 続行' },
  sendReview: { es: 'Enviar a revisión', en: 'Send for review', zh: '提交审核', ja: '確認へ送信' },
  continuePayment: { es: 'Continuar a pago', en: 'Continue to payment', zh: '继续付款', ja: '支払いへ進む' },
  continuing: { es: 'Continuando...', en: 'Continuing...', zh: '正在继续...', ja: '続行中...' },
  completeDelivery: { es: 'Completa tus datos de entrega', en: 'Complete your delivery details', zh: '完善配送资料', ja: '配送情報を入力' },
  chooseYourBank: { es: 'Elige tu banco', en: 'Choose your bank', zh: '选择你的银行', ja: '銀行を選択' },
  chooseConfirmCash: { es: 'Elige confirmar precio / efectivo', en: 'Choose price confirmation / cash', zh: '选择确认价格 / 现金', ja: '価格確認 / 現金を選択' },
  choosePaymentMethod: { es: 'Elige tu forma de pago', en: 'Choose your payment method', zh: '选择付款方式', ja: '支払い方法を選択' },
  selectPaymentFirst: { es: 'Selecciona primero un método de pago.', en: 'Choose a payment method first.', zh: '请先选择付款方式。', ja: '先に支払い方法を選択してください。' },
  consultDigitalBlocked: { es: 'Hay productos con precio a consultar. Por ahora este pedido debe quedar por confirmar antes de pagar.', en: 'Some products need price confirmation. This order must be reviewed before payment.', zh: '部分商品需要确认价格。付款前订单需先审核。', ja: '価格確認が必要な商品があります。支払い前に確認が必要です。' },
  paymentLocked: { es: 'El método de pago ya quedó asociado a este pedido. Finaliza o crea un pedido nuevo.', en: 'The payment method is already linked to this order. Finish it or create a new order.', zh: '付款方式已关联到此订单。请完成或创建新订单。', ja: '支払い方法はこの注文に紐づいています。完了するか新しい注文を作成してください。' },
  consultReview: { es: 'Este pedido tiene precios por confirmar. Primero debe revisarlo el negocio.', en: 'This order has prices to confirm. The business must review it first.', zh: '此订单有待确认价格，商家需先审核。', ja: 'この注文には確認が必要な価格があります。店舗確認が必要です。' },
  selectBankBefore: { es: 'Selecciona tu banco antes de continuar.', en: 'Select your bank before continuing.', zh: '继续前请选择银行。', ja: '続行前に銀行を選択してください。' },
  orderRegisteredCash: { es: 'Pedido registrado. Ahora puedes ver la confirmación dentro de la app.', en: 'Order registered. Now you can see the confirmation inside the app.', zh: '订单已登记。现在可在应用内查看确认。', ja: '注文が登録されました。アプリ内で確認できます。' },
  orderRegisteredPay: { es: 'Pedido registrado. Revisa los datos de pago y continúa cuando termines.', en: 'Order registered. Check the payment details and continue when you finish.', zh: '订单已登记。请查看付款信息，完成后继续。', ja: '注文が登録されました。支払い情報を確認し、完了後に続行してください。' },
  orderError: { es: 'No se pudo registrar el pedido. Intenta otra vez.', en: 'The order could not be registered. Try again.', zh: '无法登记订单，请重试。', ja: '注文を登録できませんでした。もう一度お試しください。' },
  copyError: { es: 'No se pudo copiar. Mantén presionado el dato para copiarlo manualmente.', en: 'Could not copy. Press and hold the value to copy manually.', zh: '无法复制。请长按数据手动复制。', ja: 'コピーできませんでした。長押しして手動でコピーしてください。' },
  continueFirst: { es: 'Primero continúa con el pedido.', en: 'Continue with the order first.', zh: '请先继续订单。', ja: '先に注文を続行してください。' },
  alreadySaved: { es: 'Este pedido ya fue registrado. Para evitar errores, termina la confirmación o crea un pedido nuevo después.', en: 'This order is already registered. To avoid mistakes, finish confirmation or create a new order later.', zh: '此订单已登记。为避免错误，请完成确认或稍后创建新订单。', ja: 'この注文は登録済みです。間違いを防ぐため、確認を完了するか新しい注文を作成してください。' },
} as const;

const BANK_OPTIONS = [
  { id: 'pichincha', label: 'Banco Pichincha', badge: 'P', activeClass: 'bg-yellow-50 border-yellow-400 text-yellow-900 font-black scale-[1.01]', badgeClass: 'bg-yellow-400 text-yellow-950' },
  { id: 'guayaquil', label: 'Banco Guayaquil', badge: 'G', activeClass: 'bg-pink-50 border-pink-400 text-pink-700 font-black scale-[1.01]', badgeClass: 'bg-pink-500 text-white' },
  { id: 'pacifico', label: 'Banco del Pacífico', badge: 'B', activeClass: 'bg-teal-50 border-teal-400 text-teal-800 font-black scale-[1.01]', badgeClass: 'bg-teal-500 text-white' },
  { id: 'austro', label: 'Banco del Austro', badge: 'A', activeClass: 'bg-red-50 border-red-400 text-red-700 font-black scale-[1.01]', badgeClass: 'bg-red-500 text-white' },
  { id: 'otros', label: 'Produbanco / Otros Bancos', badge: 'O', activeClass: 'bg-green-50 border-green-400 text-green-700 font-black scale-[1.01]', badgeClass: 'bg-green-600 text-white' },
];

function tx(language: LanguageCode, key: TextKey, params?: Record<string, string | number>) {
  const entry = TEXTS[key] as Partial<Record<LanguageCode, string>>;
  const base = entry[language] ?? entry.en ?? entry.es ?? '';

  if (!params) return base;

  return Object.entries(params).reduce(
    (current, [paramKey, value]) => current.replaceAll(`{${paramKey}}`, String(value)),
    base
  );
}

function spawnConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return;
  }

  const confettiContext: CanvasRenderingContext2D = context;

  const count = 55;
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.55;
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const speed = 5 + Math.random() * 8;

    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    };
  });

  let frame = 0;
  const max = 65;

  function animate() {
    confettiContext.clearRect(0, 0, canvas.width, canvas.height);
    const alpha = Math.max(0, 1 - frame / max);

    particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.25;
      particle.vx *= 0.98;
      particle.rotation += particle.rotSpeed;
      confettiContext.globalAlpha = alpha;
      confettiContext.fillStyle = particle.color;
      confettiContext.save();
      confettiContext.translate(particle.x, particle.y);
      confettiContext.rotate(particle.rotation);
      confettiContext.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.5);
      confettiContext.restore();
    });

    frame += 1;
    if (frame < max) requestAnimationFrame(animate);
    else canvas.remove();
  }

  requestAnimationFrame(animate);
}

const triggerDryTap = () => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(15);
  } catch {
    // Vibración opcional.
  }
};

const triggerDoubleTap = () => {
  try {
    if ('vibrate' in navigator) navigator.vibrate([25, 35, 25]);
  } catch {
    // Vibración opcional.
  }
};

const toMoney = (value: number): number => Number.isFinite(value) ? Number(value.toFixed(2)) : 0;

const parsePrice = (price?: string | number | null): number => {
  if (typeof price === 'number') return price > 0 ? toMoney(price) : 0;

  const raw = String(price || '').trim();
  if (!raw) return 0;

  const numeric = Number.parseFloat(raw.replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? toMoney(numeric) : 0;
};

const itemUnitPrice = (item: CartItem): number => {
  if (typeof item.product.custom_price === 'number' && item.product.custom_price > 0) return toMoney(item.product.custom_price);
  if (typeof item.custom_price === 'number' && item.custom_price > 0) return toMoney(item.custom_price);
  if (typeof item.price === 'number' && item.price > 0) return toMoney(item.price);
  return parsePrice(item.product.price);
};

const itemHasKnownPrice = (item: CartItem): boolean => itemUnitPrice(item) > 0 || isFixedPrice(item.product.price);

const hasValidDeliveryLocation = (lat: number | null, lng: number | null, reference: string): boolean => {
  return typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng) && reference.trim().length > 0;
};

const clearPaymentStorage = () => {
  localStorage.removeItem('selectedPaymentMethod');
  localStorage.removeItem('selectedBank');
};

const formatShortDate = (value?: string | null, language: LanguageCode = 'es') => {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-EC' : language, {
      day: '2-digit',
      month: 'short',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

function StepTitle({
  step,
  title,
  subtitle,
  icon,
  done = false,
  language,
}: {
  step: number;
  title: string;
  subtitle: string;
  icon: ReactNode;
  done?: boolean;
  language: LanguageCode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${done ? 'bg-green-500 text-white' : 'bg-gradient-to-br from-orange-500 to-yellow-400 text-white'}`}>
        {done ? <CheckCircle2 size={20} /> : icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.22em] leading-none">
          {tx(language, 'step', { step })}
        </p>
        <h3 className="text-sm font-black text-slate-900 uppercase italic leading-tight mt-1">
          {title}
        </h3>
        <p className="text-[11px] font-bold text-slate-400 leading-relaxed mt-1">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function PollazoPlusSmartHint({
  deliveryFee,
  language,
  onOpenPlus,
}: {
  deliveryFee: number;
  language: LanguageCode;
  onOpenPlus: () => void;
}) {
  if (deliveryFee <= 0) return null;

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-yellow-50 p-4 shadow-sm">
      <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-orange-300/25 blur-3xl" />
      <div className="absolute -left-10 -bottom-12 w-32 h-32 rounded-full bg-yellow-300/25 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="w-12 h-12 rounded-[22px] bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200 flex-shrink-0">
          <Crown size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.22em]">
                {tx(language, 'plusTip')}
              </p>
              <h3 className="text-sm font-black text-slate-900 uppercase italic leading-tight mt-1">
                {tx(language, 'plusFreeDelivery')}
              </h3>
            </div>

            <span className="bg-green-50 text-green-600 border border-green-100 rounded-full px-2.5 py-1 text-[8px] font-black uppercase flex-shrink-0">
              {tx(language, 'plusBadgeSave', { amount: deliveryFee.toFixed(2) })}
            </span>
          </div>

          <p className="text-[10px] font-bold text-slate-500 leading-relaxed mt-2">
            {tx(language, 'plusPitch', { amount: deliveryFee.toFixed(2) })}
          </p>

          <button
            type="button"
            onClick={onOpenPlus}
            className="mt-3 inline-flex items-center justify-center gap-2 bg-white text-orange-600 border border-orange-100 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-sm"
          >
            {tx(language, 'viewPlus')}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

function getTranslatedProduct(product: Product, language: LanguageCode) {
  return getProductDisplay(product, language);
}

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
    activeMembership,
    pollazoPlusExpiresAt,
  } = useUser();
  const { language } = useLanguage();

  const [confirmClear, setConfirmClear] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<SupportedPaymentMethod | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isOrderSaved, setIsOrderSaved] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const confirmSectionRef = useRef<HTMLDivElement>(null);

  const subtotal = toMoney(total);
  const deliveryFeeOriginal = deliveryFeeOf(subtotal);
  const deliveryFee = hasPollazoPlus ? 0 : deliveryFeeOriginal;
  const deliverySavings = Math.max(0, deliveryFeeOriginal - deliveryFee);
  const finalTotal = toMoney(subtotal + deliveryFee);
  const plusExpiresLabel = formatShortDate(activeMembership?.expires_at || pollazoPlusExpiresAt, language);
  const hasConsult = items.some(item => !itemHasKnownPrice(item));
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasProfile = Boolean(customerName.trim() && customerPhone.trim());
  const hasLocation = hasValidDeliveryLocation(customerLat, customerLng, customerReference);
  const canUseDigitalPayment = !hasConsult && finalTotal > 0;
  const isPaymentReady = paymentMethod === 'efectivo' || (canUseDigitalPayment && paymentMethod === 'deuna') || (canUseDigitalPayment && paymentMethod === 'transferencia' && selectedBank !== null);

  const checkoutLabel = paymentMethod === 'efectivo'
    ? hasConsult
      ? tx(language, 'viewConfirmation')
      : tx(language, 'confirmOrder')
    : tx(language, 'paidContinue');

  const registerLabel = paymentMethod === 'efectivo'
    ? hasConsult
      ? tx(language, 'sendReview')
      : tx(language, 'confirmOrder')
    : tx(language, 'continuePayment');

  const pendingActionText = !hasProfile || !hasLocation
    ? tx(language, 'completeDelivery')
    : paymentMethod === 'transferencia' && !selectedBank
      ? tx(language, 'chooseYourBank')
      : hasConsult
        ? tx(language, 'chooseConfirmCash')
        : tx(language, 'choosePaymentMethod');

  const updateScrollHint = () => {
    const container = scrollRef.current;
    if (!container) {
      setShowScrollHint(false);
      return;
    }

    setShowScrollHint(container.scrollTop + container.clientHeight < container.scrollHeight - 36);
  };

  const showNotice = (message: string) => {
    setActionNotice(message);
    window.setTimeout(() => setActionNotice(null), 2800);
  };

  const blockIfOrderSaved = () => {
    if (!isOrderSaved) return false;

    triggerDryTap();
    showNotice(tx(language, 'alreadySaved'));
    return true;
  };

  const scrollToPayment = () => paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToConfirm = () => confirmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleOpenPlusInfo = () => {
    sessionStorage.setItem(PLUS_OPEN_SIGNAL_KEY, '1');
    onNavigate('info');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('pollazo:open-plus')), 220);
  };

  const handleSmartScroll = () => {
    if (!hasProfile || !hasLocation) {
      scrollRef.current?.scrollBy({ top: 360, behavior: 'smooth' });
      return;
    }

    if (!paymentMethod) {
      scrollToPayment();
      return;
    }

    scrollToConfirm();
  };

  const handleClearRequest = () => {
    if (blockIfOrderSaved()) return;

    if (confirmClear) {
      clearCart();
      clearPaymentStorage();
      setConfirmClear(false);
      setPaymentMethod(null);
      setSelectedBank(null);
      setActionNotice(null);
      setIsOrderSaved(false);
      return;
    }

    setConfirmClear(true);
    window.setTimeout(() => setConfirmClear(false), 3000);
  };

  const handleRemoveItem = (productId: string) => {
    if (blockIfOrderSaved()) return;
    removeItem(productId);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (blockIfOrderSaved()) return;
    updateQuantity(productId, quantity);
  };

  const handlePaymentMethodClick = (method: SupportedPaymentMethod) => {
    if (!hasProfile || !hasLocation) {
      triggerDryTap();
      onRequireLogin('block');
      return;
    }

    if ((method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment) {
      triggerDryTap();
      showNotice(tx(language, 'consultDigitalBlocked'));
      return;
    }

    if (isOrderSaved && paymentMethod && method !== paymentMethod) {
      triggerDryTap();
      showNotice(tx(language, 'paymentLocked'));
      return;
    }

    setPaymentMethod(method);

    if (method === 'transferencia') {
      if (paymentMethod !== 'transferencia') setSelectedBank(null);
      triggerDoubleTap();
    } else {
      setSelectedBank(null);
      triggerDryTap();
    }

    window.setTimeout(updateScrollHint, 120);
  };

  const handleEarlySaveClick = async () => {
    if (isSavingOrder || isOrderSaved) return;

    if (!hasProfile || !hasLocation) {
      triggerDryTap();
      onRequireLogin('block');
      return;
    }

    if (!paymentMethod) {
      triggerDryTap();
      showNotice(tx(language, 'selectPaymentFirst'));
      scrollToPayment();
      return;
    }

    if ((paymentMethod === 'deuna' || paymentMethod === 'transferencia') && !canUseDigitalPayment) {
      triggerDryTap();
      showNotice(tx(language, 'consultReview'));
      return;
    }

    if (paymentMethod === 'transferencia' && !selectedBank) {
      triggerDryTap();
      showNotice(tx(language, 'selectBankBefore'));
      scrollToPayment();
      return;
    }

    if (!isPaymentReady) return;

    triggerDryTap();
    setIsSavingOrder(true);
    setActionNotice(null);

    try {
      localStorage.setItem('selectedPaymentMethod', paymentMethod);
      localStorage.setItem('selectedBank', selectedBank || 'Ninguno');
      await onEarlySave();
      setIsOrderSaved(true);
      showNotice(paymentMethod === 'efectivo' ? tx(language, 'orderRegisteredCash') : tx(language, 'orderRegisteredPay'));
      window.setTimeout(() => scrollToConfirm(), 150);
    } catch (error) {
      console.error('No se pudo guardar el pedido anticipado:', error);
      setIsOrderSaved(false);
      showNotice(tx(language, 'orderError'));
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 2000);
    } catch {
      setCopiedLabel(null);
      showNotice(tx(language, 'copyError'));
    }
  };

  const handleBankSelect = (bank: string) => {
    if (blockIfOrderSaved()) return;

    setSelectedBank(bank);
    triggerDoubleTap();
    window.setTimeout(() => scrollToConfirm(), 180);
  };

  const handleCheckout = () => {
    if (!isPaymentReady || !isOrderSaved) {
      triggerDryTap();
      showNotice(tx(language, 'continueFirst'));
      return;
    }

    triggerDryTap();
    spawnConfetti();
    window.setTimeout(() => onCheckout(), 200);
  };

  const renderPaymentStatusBox = () => {
    if (!paymentMethod || !isOrderSaved) return null;

    if (paymentMethod === 'efectivo') {
      return (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-green-600 flex-shrink-0 shadow-sm">
            <Banknote size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase">{tx(language, 'cashStatusTitle')}</p>
            <p className="text-[10px] font-bold text-green-700/80 leading-relaxed mt-1">{tx(language, 'cashStatusText')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black text-blue-700 uppercase">{tx(language, 'paymentReadyTitle')}</p>
          <p className="text-[10px] font-bold text-blue-700/80 leading-relaxed mt-1">{tx(language, 'paymentReadyText')}</p>
        </div>
      </div>
    );
  };

  const renderPaymentButton = (
    method: SupportedPaymentMethod,
    label: string,
    description: string,
    icon: ReactNode,
    activeClass: string,
    defaultClass: string,
    disabledReason?: string
  ) => {
    const active = paymentMethod === method;
    const lockedOther = isOrderSaved && paymentMethod !== method;
    const blockedByConsult = (method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment;
    const visuallyDisabled = lockedOther || blockedByConsult;

    return (
      <button
        type="button"
        onClick={() => {
          if (disabledReason && blockedByConsult) {
            triggerDryTap();
            showNotice(disabledReason);
            return;
          }

          handlePaymentMethodClick(method);
        }}
        disabled={lockedOther}
        className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left active:scale-[0.98] ${active ? activeClass : defaultClass} ${visuallyDisabled ? 'opacity-45 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
      >
        <div className="w-10 h-10 rounded-2xl bg-white/85 flex items-center justify-center shadow-sm flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase leading-none">{label}</p>
          <p className="text-[10px] font-bold opacity-70 leading-relaxed mt-1">{description}</p>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${active ? 'bg-white text-green-500 border-white shadow-md scale-110' : 'bg-white/60 text-gray-300 border-white/80'}`}>
          {active ? <CheckCircle2 size={18} /> : <Circle size={15} />}
        </div>
        {isOrderSaved && active && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center border-2 border-white shadow-sm">
            <Lock size={10} />
          </span>
        )}
        {blockedByConsult && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center border-2 border-white shadow-sm">
            <Lock size={10} />
          </span>
        )}
      </button>
    );
  };

  const paymentSummary = useMemo(() => {
    if (!paymentMethod) return tx(language, 'pending');
    if (paymentMethod === 'efectivo') return tx(language, 'cash');
    if (paymentMethod === 'deuna') return 'Deuna';
    return selectedBank ? tx(language, 'transfer') : tx(language, 'chooseBank');
  }, [language, paymentMethod, selectedBank]);

  if (items.length === 0) {
    if (paymentMethod || isOrderSaved || selectedBank) {
      clearPaymentStorage();
    }

    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingBag size={40} className="text-orange-300" />
        </div>
        <h2 className="font-black text-gray-900 text-xl mb-2">{tx(language, 'emptyTitle')}</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">{tx(language, 'emptyText')}</p>
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-orange-300/40 active:scale-95 transition-transform"
        >
          {tx(language, 'viewCatalog')} <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div
        ref={scrollRef}
        onScroll={updateScrollHint}
        className="flex-1 px-4 pt-4 pb-36 space-y-4 overflow-y-auto overscroll-contain scrollbar-hide scroll-pb-36"
      >
        {isOrderSaved && (
          <div className="bg-slate-900 text-white rounded-[26px] p-4 flex items-center gap-3 shadow-lg animate-in fade-in duration-300">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">{tx(language, 'orderLockedTitle')}</p>
              <p className="text-[10px] font-bold text-white/70 mt-1 leading-relaxed">{tx(language, 'orderLockedText')}</p>
            </div>
          </div>
        )}

        {hasPollazoPlus && (
          <section className="relative overflow-hidden rounded-[30px] border border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-white p-4 shadow-sm">
            <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-yellow-300/20 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200/60 flex-shrink-0">
                <Crown size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">{tx(language, 'plusActive')}</p>
                <h3 className="text-sm font-black text-slate-900 uppercase italic leading-tight">{tx(language, 'plusDeliveryApplied')}</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-1 leading-relaxed">
                  {deliverySavings > 0
                    ? tx(language, 'plusSaving', { amount: deliverySavings.toFixed(2) })
                    : tx(language, 'plusReady')}
                  {plusExpiresLabel ? ` ${tx(language, 'expires', { date: plusExpiresLabel })}` : ''}
                </p>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-white/80 text-orange-500 flex items-center justify-center border border-yellow-100">
                <Gift size={18} />
              </div>
            </div>
          </section>
        )}

        {!hasPollazoPlus && subtotal > 0 && deliveryFeeOriginal > 0 && !isOrderSaved && (
          <PollazoPlusSmartHint deliveryFee={deliveryFeeOriginal} language={language} onOpenPlus={handleOpenPlusInfo} />
        )}

        <section className="bg-white rounded-[30px] border border-orange-100 p-4 shadow-sm space-y-3">
          <StepTitle
            step={1}
            title={tx(language, 'productsTitle')}
            subtitle={tx(language, 'unitsInCart', { count: totalUnits, plural: totalUnits !== 1 ? 's' : '' })}
            icon={<ShoppingBag size={20} />}
            done={items.length > 0}
            language={language}
          />

          <div className="space-y-2.5 pt-1">
            {items.map(item => {
              const unitPrice = itemUnitPrice(item);
              const itemSubtotal = unitPrice > 0 ? (unitPrice * item.quantity).toFixed(2) : null;
              const customPrice = item.product.custom_price;
              const fixed = isFixedPrice(item.product.price);
              const display = getTranslatedProduct(item.product, language);

              return (
                <div key={item.product.id} className={`flex gap-3 rounded-2xl p-3 border transition-all ${isOrderSaved ? 'border-slate-200 bg-slate-50/70' : 'border-gray-100 bg-white shadow-sm'}`}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                    <img src={item.product.image || '/logo-final.png'} alt={display.name} className="w-full h-full object-contain p-1" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-black text-sm leading-snug line-clamp-2">{display.name}</p>
                    <p className={`text-xs mt-1 font-black ${itemSubtotal ? 'text-orange-500' : 'text-gray-400'}`}>
                      {itemSubtotal ? `$${itemSubtotal}` : customPrice || fixed ? `$${unitPrice.toFixed(2)}` : tx(language, 'consultPrice')}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                        disabled={isOrderSaved}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOrderSaved ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600 active:scale-90 active:bg-orange-100'}`}
                        aria-label={tx(language, 'decreaseProduct')}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-gray-900 font-black text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                        disabled={isOrderSaved}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOrderSaved ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-orange-100 text-orange-600 active:scale-90 active:bg-orange-200'}`}
                        aria-label={tx(language, 'increaseProduct')}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.product.id)}
                    disabled={isOrderSaved}
                    className={`self-center p-2 rounded-xl transition-all ${isOrderSaved ? 'text-gray-200 cursor-not-allowed' : 'text-gray-300 hover:text-red-400 active:text-red-500 hover:bg-red-50'}`}
                    aria-label={tx(language, 'removeProduct')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClearRequest}
            disabled={isOrderSaved}
            className={`w-full text-[11px] font-black py-3 rounded-2xl border transition-all duration-300 ${isOrderSaved ? 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed' : confirmClear ? 'text-red-600 bg-red-50 border-red-100 scale-[1.01]' : 'text-gray-400 bg-gray-50 border-gray-100 active:text-red-400'}`}
          >
            {isOrderSaved ? tx(language, 'cartLocked') : confirmClear ? tx(language, 'clearConfirm') : tx(language, 'emptyCart')}
          </button>
        </section>

        <section className="bg-white rounded-[30px] border border-gray-100 p-4 shadow-sm space-y-3">
          <StepTitle
            step={2}
            title={tx(language, 'deliveryTitle')}
            subtitle={hasLocation ? tx(language, 'deliveryReady') : tx(language, 'deliveryMissing')}
            icon={<Home size={20} />}
            done={hasProfile && hasLocation}
            language={language}
          />

          {!hasProfile || !hasLocation ? (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-orange-600 flex-shrink-0 shadow-sm">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-orange-700 uppercase">{tx(language, 'needDelivery')}</p>
                <p className="text-[10px] font-bold text-orange-700/80 leading-relaxed mt-1">{tx(language, 'needDeliveryText')}</p>
                <button type="button" onClick={() => onRequireLogin('block')} className="mt-3 bg-white text-orange-600 border border-orange-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-95">
                  {tx(language, 'completeData')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={17} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">{tx(language, 'deliveryAddress')}</span>
                  <p className="text-xs font-bold text-gray-700 line-clamp-2">{customerReference || tx(language, 'defaultLocation')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (blockIfOrderSaved()) return;
                  onRequireLogin('change_location');
                }}
                disabled={isOrderSaved}
                className={`text-[11px] font-black px-3 py-2 rounded-xl border transition-all flex-shrink-0 shadow-sm ${isOrderSaved ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-orange-600 border-gray-200/80 active:scale-95'}`}
              >
                {tx(language, 'change')}
              </button>
            </div>
          )}
        </section>

        {actionNotice && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-500 flex-shrink-0 shadow-sm">
              <Info size={16} />
            </div>
            <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed">{actionNotice}</p>
          </div>
        )}

        <section ref={paymentSectionRef} className="bg-white rounded-[30px] border border-gray-100 p-4 shadow-sm space-y-3 scroll-mt-4">
          <StepTitle
            step={3}
            title={tx(language, 'paymentTitle')}
            subtitle={paymentMethod ? paymentMethod === 'efectivo' ? tx(language, 'payOnReceive') : tx(language, 'digitalPayment') : tx(language, 'choosePayment')}
            icon={<Wallet size={20} />}
            done={isPaymentReady}
            language={language}
          />

          {hasConsult && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-yellow-600 flex-shrink-0 shadow-sm">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-yellow-700 uppercase">{tx(language, 'consultAlertTitle')}</p>
                <p className="text-[10px] font-bold text-yellow-700/80 leading-relaxed mt-1">{tx(language, 'consultAlertText')}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {renderPaymentButton(
              'efectivo',
              hasConsult ? tx(language, 'confirmPrice') : tx(language, 'cash'),
              hasConsult ? tx(language, 'businessReviewsTotal') : tx(language, 'payWhenReceive'),
              <Banknote size={21} className={paymentMethod === 'efectivo' ? 'text-green-600' : 'text-green-500'} />,
              'bg-green-50 border-green-400 text-green-700 font-black shadow-sm ring-2 ring-green-100',
              'bg-green-50/70 border-green-100 text-green-700 font-bold'
            )}
            {renderPaymentButton(
              'deuna',
              'Deuna',
              tx(language, 'deunaDescription'),
              <QrCode size={21} className={paymentMethod === 'deuna' ? 'text-purple-600' : 'text-purple-500'} />,
              'bg-purple-50 border-purple-400 text-purple-700 font-black shadow-sm ring-2 ring-purple-100',
              'bg-purple-50/70 border-purple-100 text-purple-700 font-bold',
              tx(language, 'blockedDeuna')
            )}
            {renderPaymentButton(
              'transferencia',
              tx(language, 'transfer'),
              tx(language, 'transferDescription'),
              <Building size={21} className={paymentMethod === 'transferencia' ? 'text-blue-600' : 'text-blue-500'} />,
              'bg-blue-50 border-blue-400 text-blue-700 font-black shadow-sm ring-2 ring-blue-100',
              'bg-blue-50/70 border-blue-100 text-blue-700 font-bold',
              tx(language, 'blockedTransfer')
            )}
          </div>

          {renderPaymentStatusBox()}

          {isOrderSaved && paymentMethod === 'deuna' && (
            <div className="bg-purple-50/40 rounded-2xl p-4 border border-purple-100 flex flex-col items-center text-center space-y-2 animate-in fade-in duration-300">
              <p className="text-xs text-purple-900 font-black uppercase tracking-tight">{tx(language, 'scanQr')}</p>
              <div className="w-32 h-32 bg-white rounded-xl p-2 border border-purple-200/60 shadow-inner flex items-center justify-center">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=LaCasaDelPollazoDeunaQR" alt="QR Deuna" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col items-center gap-1 w-full pt-1">
                <p className="text-[10px] text-purple-700 font-bold uppercase">{tx(language, 'samePhone')}</p>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-200/60 w-full max-w-[220px]">
                  <span className="font-mono font-black text-purple-950 text-xs">{BUSINESS_DEUNA_PHONE}</span>
                  <button type="button" onClick={() => handleCopyText(BUSINESS_DEUNA_PHONE, 'celular_deuna')} className="text-[9px] bg-purple-100 text-purple-700 font-black px-2 py-1 rounded-lg active:scale-90 transition-all">
                    {copiedLabel === 'celular_deuna' ? tx(language, 'copied') : tx(language, 'copy')}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-purple-500 font-black uppercase tracking-tight">{tx(language, 'thenContinue')}</p>
            </div>
          )}

          {paymentMethod === 'transferencia' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{tx(language, 'selectBank')}</p>
              <div className="flex flex-col gap-2">
                {BANK_OPTIONS.map(bank => (
                  <button
                    type="button"
                    key={bank.id}
                    onClick={() => handleBankSelect(bank.id)}
                    disabled={isOrderSaved && selectedBank !== bank.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedBank === bank.id ? bank.activeClass : 'bg-white border-gray-100 text-gray-600 font-bold'} ${isOrderSaved && selectedBank !== bank.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${bank.badgeClass}`}>{bank.badge}</span>
                    <span className="text-xs">{bank.label}</span>
                  </button>
                ))}
              </div>

              {isOrderSaved && selectedBank && (
                <div className="bg-blue-50/40 rounded-2xl p-3 border border-blue-100 space-y-2 mt-2 animate-in fade-in duration-300">
                  <p className="text-xs text-blue-900 font-black uppercase tracking-tight">{tx(language, 'accountDetails')}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">{tx(language, 'bank')}</span>
                        <span className="font-bold text-gray-700">Banco Pichincha · Ahorros</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">{tx(language, 'accountNumber')}</span>
                        <span className="font-mono font-black text-gray-800">{BUSINESS_BANK_ACCOUNT}</span>
                      </div>
                      <button type="button" onClick={() => handleCopyText(BUSINESS_BANK_ACCOUNT, 'cuenta')} className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all">
                        {copiedLabel === 'cuenta' ? tx(language, 'copied') : tx(language, 'copy')}
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">{tx(language, 'idNumber')}</span>
                        <span className="font-mono font-black text-gray-800">{BUSINESS_BANK_ID}</span>
                      </div>
                      <button type="button" onClick={() => handleCopyText(BUSINESS_BANK_ID, 'cedula')} className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all">
                        {copiedLabel === 'cedula' ? tx(language, 'copied') : tx(language, 'copy')}
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">{tx(language, 'beneficiary')}</span>
                        <span className="font-bold text-gray-700">{BUSINESS_BENEFICIARY}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-tight mt-1">{tx(language, 'thenContinue')}</p>
                </div>
              )}
            </div>
          )}
        </section>

        <section ref={confirmSectionRef} className="bg-white rounded-[30px] border border-gray-100 p-4 shadow-sm space-y-3 scroll-mt-4">
          <StepTitle
            step={4}
            title={tx(language, 'confirmTitle')}
            subtitle={tx(language, 'confirmSubtitle')}
            icon={<ReceiptText size={20} />}
            done={isPaymentReady && isOrderSaved}
            language={language}
          />

          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{tx(language, 'products')}</span>
              <span className="text-gray-800 font-bold">{tx(language, 'unitsInCart', { count: totalUnits, plural: totalUnits !== 1 ? 's' : '' })}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{hasConsult ? tx(language, 'partialSubtotal') : tx(language, 'subtotal')}</span>
              <span className="text-orange-600 font-black">${subtotal.toFixed(2)}</span>
            </div>

            {subtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{tx(language, 'deliveryFee')}</span>
                {hasPollazoPlus ? (
                  <span className="text-right">
                    {deliveryFeeOriginal > 0 && <span className="block text-[10px] text-gray-400 line-through font-bold">${deliveryFeeOriginal.toFixed(2)}</span>}
                    <span className="text-green-600 font-black">{tx(language, 'freePlus')}</span>
                  </span>
                ) : (
                  <span className="text-gray-800 font-bold">{deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : tx(language, 'free')}</span>
                )}
              </div>
            )}

            {hasPollazoPlus && (
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-xl p-2">
                <Crown size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-[9px] font-black text-orange-700 uppercase leading-relaxed">{tx(language, 'plusApplied')}</p>
              </div>
            )}

            {subtotal > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-black">{hasConsult ? tx(language, 'partialTotal') : tx(language, 'finalTotal')}</span>
                <span className="text-orange-600 font-black">${finalTotal.toFixed(2)}</span>
              </div>
            )}

            {hasConsult && (
              <p className="text-[9px] text-gray-400 pt-1 border-t border-gray-200 uppercase font-bold leading-relaxed">{tx(language, 'someNeedConfirm')}</p>
            )}
          </div>
        </section>
      </div>

      {showScrollHint && (
        <button
          type="button"
          onClick={handleSmartScroll}
          aria-label={tx(language, 'seeMore')}
          className="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+132px)] z-40 h-12 w-8 flex items-center justify-center active:scale-95 transition-transform animate-bounce"
        >
          <ChevronDown size={26} strokeWidth={3.2} className="text-orange-500" />
        </button>
      )}

      <div className="absolute left-0 right-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-white/95 backdrop-blur-xl border-t border-orange-100 shadow-[0_-10px_35px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{hasConsult ? tx(language, 'partialTotal') : tx(language, 'finalTotal')}</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-orange-600 leading-none mt-1">${finalTotal.toFixed(2)}</p>
              {hasPollazoPlus && deliverySavings > 0 && (
                <span className="mb-0.5 text-[9px] font-black text-green-600 uppercase bg-green-50 border border-green-100 px-2 py-1 rounded-full">-${deliverySavings.toFixed(2)}</span>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{tx(language, 'payment')}</p>
            <p className="text-[11px] font-black text-gray-700 uppercase mt-1">{paymentSummary}</p>
            {hasPollazoPlus && <p className="text-[9px] font-black text-orange-500 uppercase mt-1">{tx(language, 'plusActiveShort')}</p>}
          </div>
        </div>

        {isPaymentReady ? (
          isOrderSaved ? (
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-green-500/30 active:scale-[0.98] text-[13px] uppercase tracking-widest animate-in slide-in-from-bottom-4"
            >
              <PackageCheck size={20} />
              {checkoutLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEarlySaveClick}
              disabled={isSavingOrder}
              className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-orange-500/40 active:scale-[0.98] text-[13px] uppercase tracking-widest border-b-4 border-orange-700 animate-in slide-in-from-bottom-4 ${isSavingOrder ? 'opacity-70 cursor-wait' : ''}`}
            >
              <Sparkles size={20} />
              {isSavingOrder ? tx(language, 'continuing') : registerLabel}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!hasProfile || !hasLocation) {
                onRequireLogin('block');
                return;
              }
              scrollToPayment();
            }}
            className="w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-black p-4 rounded-2xl text-center uppercase tracking-tight active:scale-[0.98] transition-all"
          >
            <AlertCircle size={16} />
            {pendingActionText}
          </button>
        )}
      </div>
    </div>
  );
}
