import {
  AlertCircle,
  Banknote,
  Bell,
  BellOff,
  BellRing,
  Building,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Crown,
  Gift,
  Info,
  MapPin,
  MessageCircle,
  Navigation,
  PackageSearch,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  TimerReset,
  Truck,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  getPushPermission,
  isPushSupported,
  registerPushNotifications,
} from '../utils/pushNotifications';
import type { LanguageCode, Order, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

type TrackingNoticeTone = 'green' | 'orange' | 'blue' | 'red';
type PushCardTone = 'green' | 'orange' | 'red' | 'blue';
type LangText = Partial<Record<LanguageCode, string>> & { es: string; en?: string };
type TextKey = keyof typeof TEXTS;

interface TrackingNotice {
  id: string;
  orderId?: string;
  title: string;
  message: string;
  tone: TrackingNoticeTone;
  createdAt: number;
}

interface OrderSnapshot {
  id: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus | null;
  updatedAt?: string | null;
}

interface PushCardFeedback {
  tone: PushCardTone;
  message: string;
}

const STORE_LOCATION = {
  lat: -0.736323,
  lng: -90.321829,
};

const NOTICE_AUTO_CLOSE_MS = 6500;
const PUSH_CARD_HIDE_KEY = 'pollazo_hide_push_card_until';
const WHATSAPP_NUMBER = '593989795628';

const TEXTS = {
  close: { es: 'Cerrar', en: 'Close', pt: 'Fechar', fr: 'Fermer', de: 'Schließen', it: 'Chiudi', zh: '关闭', ja: '閉じる', nl: 'Sluiten', ru: 'Закрыть' },
  understood: { es: 'Entendido', en: 'Got it', pt: 'Entendi', fr: 'Compris', de: 'Verstanden', it: 'Capito', zh: '明白', ja: '了解', nl: 'Begrepen', ru: 'Понятно' },
  autoCloses: { es: 'Se cierra solo', en: 'Closes automatically', pt: 'Fecha sozinho', fr: 'Se ferme seul', de: 'Schließt automatisch', it: 'Si chiude da solo', zh: '自动关闭', ja: '自動で閉じます', nl: 'Sluit automatisch', ru: 'Закроется автоматически' },

  trackingKicker: { es: 'Rastreo Pollazo', en: 'Pollazo tracking', pt: 'Rastreamento Pollazo', fr: 'Suivi Pollazo', de: 'Pollazo-Tracking', it: 'Tracciamento Pollazo', zh: 'Pollazo 追踪', ja: 'Pollazo 追跡', nl: 'Pollazo tracking', ru: 'Отслеживание Pollazo' },
  trackingLive: { es: 'Rastreo en vivo', en: 'Live tracking', pt: 'Rastreamento ao vivo', fr: 'Suivi en direct', de: 'Live-Tracking', it: 'Tracciamento live', zh: '实时追踪', ja: 'ライブ追跡', nl: 'Live tracking', ru: 'Отслеживание онлайн' },
  followStep: { es: 'Sigue tu compra paso a paso.', en: 'Follow your order step by step.', pt: 'Acompanhe seu pedido passo a passo.', fr: 'Suivez votre commande étape par étape.', de: 'Verfolge deine Bestellung Schritt für Schritt.', it: 'Segui il tuo ordine passo dopo passo.', zh: '逐步追踪你的订单。', ja: '注文を段階ごとに確認できます。', nl: 'Volg je bestelling stap voor stap.', ru: 'Отслеживайте заказ по шагам.' },
  order: { es: 'Pedido', en: 'Order', pt: 'Pedido', fr: 'Commande', de: 'Bestellung', it: 'Ordine', zh: '订单', ja: '注文', nl: 'Bestelling', ru: 'Заказ' },
  product: { es: 'producto', en: 'item', pt: 'produto', fr: 'article', de: 'Artikel', it: 'prodotto', zh: '件商品', ja: '点', nl: 'product', ru: 'товар' },
  products: { es: 'productos', en: 'items', pt: 'produtos', fr: 'articles', de: 'Artikel', it: 'prodotti', zh: '件商品', ja: '点', nl: 'producten', ru: 'товаров' },
  units: { es: 'unidades', en: 'units', pt: 'unidades', fr: 'unités', de: 'Einheiten', it: 'unità', zh: '件', ja: '点', nl: 'stuks', ru: 'ед.' },

  statusPorConfirmar: { es: 'Por confirmar', en: 'To confirm', pt: 'A confirmar', fr: 'À confirmer', de: 'Zu bestätigen', it: 'Da confermare', zh: '待确认', ja: '確認待ち', nl: 'Te bevestigen', ru: 'Ожидает подтверждения' },
  statusRecibido: { es: 'Pedido confirmado', en: 'Order confirmed', pt: 'Pedido confirmado', fr: 'Commande confirmée', de: 'Bestellung bestätigt', it: 'Ordine confermato', zh: '订单已确认', ja: '注文確認済み', nl: 'Bestelling bevestigd', ru: 'Заказ подтвержден' },
  statusPreparando: { es: 'Empacando tu pedido', en: 'Packing your order', pt: 'Preparando seu pedido', fr: 'Préparation de votre commande', de: 'Bestellung wird gepackt', it: 'Prepariamo il tuo ordine', zh: '正在打包你的订单', ja: '注文を準備中', nl: 'Je bestelling wordt ingepakt', ru: 'Заказ собирается' },
  statusEnviado: { es: 'Tu pedido va en camino', en: 'Your order is on the way', pt: 'Seu pedido está a caminho', fr: 'Votre commande est en route', de: 'Deine Bestellung ist unterwegs', it: 'Il tuo ordine è in arrivo', zh: '你的订单正在配送中', ja: '注文は配送中です', nl: 'Je bestelling is onderweg', ru: 'Ваш заказ в пути' },
  statusEntregado: { es: 'Pedido entregado', en: 'Order delivered', pt: 'Pedido entregue', fr: 'Commande livrée', de: 'Bestellung geliefert', it: 'Ordine consegnato', zh: '订单已送达', ja: '配達完了', nl: 'Bestelling geleverd', ru: 'Заказ доставлен' },
  statusCancelado: { es: 'Pedido cancelado', en: 'Order cancelled', pt: 'Pedido cancelado', fr: 'Commande annulée', de: 'Bestellung storniert', it: 'Ordine annullato', zh: '订单已取消', ja: '注文キャンセル', nl: 'Bestelling geannuleerd', ru: 'Заказ отменен' },

  stepConfirm: { es: 'Por confirmar', en: 'To confirm', zh: '待确认', ja: '確認待ち' },
  stepReceived: { es: 'Confirmado', en: 'Confirmed', zh: '已确认', ja: '確認済み' },
  stepPacking: { es: 'Empacando', en: 'Packing', zh: '打包中', ja: '準備中' },
  stepRoute: { es: 'En camino', en: 'On the way', zh: '配送中', ja: '配送中' },
  stepDelivered: { es: 'Entregado', en: 'Delivered', zh: '已送达', ja: '配達済み' },

  msgPorConfirmar: { es: 'Recibimos tu pedido. El negocio está revisando disponibilidad, ubicación y método de pago.', en: 'We received your order. The business is checking availability, location and payment method.', pt: 'Recebemos seu pedido. Estamos verificando disponibilidade, localização e pagamento.', fr: 'Nous avons reçu votre commande. Disponibilité, adresse et paiement sont en vérification.', de: 'Wir haben deine Bestellung erhalten. Verfügbarkeit, Adresse und Zahlung werden geprüft.', it: 'Abbiamo ricevuto il tuo ordine. Stiamo verificando disponibilità, posizione e pagamento.', zh: '我们已收到你的订单，正在检查库存、地址和付款方式。', ja: '注文を受け取りました。在庫、住所、支払い方法を確認しています。', nl: 'We hebben je bestelling ontvangen en controleren beschikbaarheid, locatie en betaling.', ru: 'Мы получили заказ и проверяем наличие, адрес и оплату.' },
  msgRecibido: { es: '¡Pedido confirmado! Ya tenemos tu compra en el sistema.', en: 'Order confirmed! Your purchase is now in the system.', zh: '订单已确认！你的购买已进入系统。', ja: '注文が確認されました。購入内容がシステムに入りました。' },
  msgPreparando: { es: 'Estamos empacando tus productos con cuidado.', en: 'We are carefully packing your products.', zh: '我们正在仔细打包你的商品。', ja: '商品を丁寧に準備しています。' },
  msgEnviado: { es: '¡Tu pedido va en camino a tu casa!', en: 'Your order is on the way!', zh: '你的订单正在送达途中！', ja: '注文は配送中です！' },
  msgEntregado: { es: '¡Pedido entregado! Gracias por comprar en La Casa del Pollazo.', en: 'Order delivered! Thank you for shopping at La Casa del Pollazo.', zh: '订单已送达！感谢你在 La Casa del Pollazo 购物。', ja: '配達完了！La Casa del Pollazo のご利用ありがとうございます。' },
  msgCancelado: { es: 'Este pedido fue cancelado.', en: 'This order was cancelled.', zh: '此订单已取消。', ja: 'この注文はキャンセルされました。' },

  progressTitle: { es: 'Progreso del pedido', en: 'Order progress', pt: 'Progresso do pedido', fr: 'Progression de la commande', de: 'Bestellfortschritt', it: 'Avanzamento ordine', zh: '订单进度', ja: '注文の進行状況', nl: 'Bestelvoortgang', ru: 'Статус заказа' },
  plusApplied: { es: 'Pollazo Plus aplicado', en: 'Pollazo Plus applied', zh: '已应用 Pollazo Plus', ja: 'Pollazo Plus 適用済み' },
  plusAppliedText: { es: 'Tu membresía se aplicó en este pedido. Si era domicilio, el delivery queda gratis según cobertura.', en: 'Your membership was applied to this order. Delivery is free within coverage.', zh: '你的会员已应用到此订单。在覆盖范围内配送免费。', ja: 'この注文にメンバーシップが適用されました。対象エリア内の配送料は無料です。' },
  giftAdded: { es: 'Regalo agregado', en: 'Gift added', pt: 'Presente adicionado', fr: 'Cadeau ajouté', de: 'Geschenk hinzugefügt', it: 'Regalo aggiunto', zh: '已添加礼物', ja: 'ギフト追加', nl: 'Cadeau toegevoegd', ru: 'Подарок добавлен' },
  surprise: { es: 'Sorpresa Pollazo', en: 'Pollazo surprise', zh: 'Pollazo 惊喜', ja: 'Pollazo サプライズ' },

  activatePushTitle: { es: 'Activa avisos del pedido', en: 'Turn on order alerts', pt: 'Ative avisos do pedido', fr: 'Activez les alertes', de: 'Bestellhinweise aktivieren', it: 'Attiva avvisi ordine', zh: '开启订单通知', ja: '注文通知を有効化', nl: 'Zet meldingen aan', ru: 'Включить уведомления' },
  activatePushText: { es: 'Te avisaremos cuando tu pedido sea confirmado, esté en preparación, salga a ruta o sea entregado.', en: 'We will notify you when your order is confirmed, packed, on the way or delivered.', zh: '订单确认、打包、配送或送达时会通知你。', ja: '注文確認、準備中、配送中、配達済みになったら通知します。' },
  pushBlocked: { es: 'Las notificaciones están bloqueadas. Puedes permitirlas desde ajustes del navegador o de la app.', en: 'Notifications are blocked. You can allow them from browser or app settings.', zh: '通知已被阻止。你可以在浏览器或应用设置中允许。', ja: '通知がブロックされています。ブラウザまたはアプリ設定で許可できます。' },
  pushFirstPhone: { es: 'Primero necesitamos tu WhatsApp para activar avisos del pedido.', en: 'We need your WhatsApp first to activate order alerts.', zh: '需要先登记 WhatsApp 才能开启订单通知。', ja: '注文通知を有効にするには先にWhatsAppが必要です。' },
  pushNotSupported: { es: 'Este navegador no permite notificaciones push web.', en: 'This browser does not support web push notifications.', zh: '此浏览器不支持网页推送通知。', ja: 'このブラウザはWebプッシュ通知に対応していません。' },
  pushActivating: { es: 'Activando avisos del pedido...', en: 'Activating order alerts...', zh: '正在开启订单通知...', ja: '注文通知を有効化中...' },
  pushReady: { es: 'Listo. Te avisaremos cuando tu pedido cambie de estado.', en: 'Ready. We will notify you when your order changes status.', zh: '已准备好。订单状态变化时会通知你。', ja: '準備完了。注文状態が変わったら通知します。' },
  pushError: { es: 'No se pudieron activar los avisos en este dispositivo.', en: 'Could not activate alerts on this device.', zh: '无法在此设备开启通知。', ja: 'この端末で通知を有効にできませんでした。' },
  pushRetry: { es: 'No se pudieron activar los avisos. Puedes intentarlo otra vez desde el rastreo.', en: 'Could not activate alerts. You can try again from tracking.', zh: '无法开启通知。你可以在追踪页重试。', ja: '通知を有効化できませんでした。追跡画面から再試行できます。' },
  activating: { es: 'Activando...', en: 'Activating...', zh: '正在开启...', ja: '有効化中...' },
  activate: { es: 'Activar avisos 🔔', en: 'Activate alerts 🔔', zh: '开启通知 🔔', ja: '通知を有効化 🔔' },
  later: { es: 'Después', en: 'Later', pt: 'Depois', fr: 'Plus tard', de: 'Später', it: 'Dopo', zh: '稍后', ja: 'あとで', nl: 'Later', ru: 'Позже' },

  paymentCash: { es: 'Efectivo', en: 'Cash', pt: 'Dinheiro', fr: 'Espèces', de: 'Bar', it: 'Contanti', zh: '现金', ja: '現金', nl: 'Contant', ru: 'Наличные' },
  paymentDeuna: { es: 'Deuna', en: 'Deuna', zh: 'Deuna', ja: 'Deuna' },
  paymentTransfer: { es: 'Transferencia', en: 'Bank transfer', pt: 'Transferência', fr: 'Virement', de: 'Überweisung', it: 'Bonifico', zh: '银行转账', ja: '銀行振込', nl: 'Overschrijving', ru: 'Перевод' },
  paymentCard: { es: 'Tarjeta', en: 'Card', pt: 'Cartão', fr: 'Carte', de: 'Karte', it: 'Carta', zh: '银行卡', ja: 'カード', nl: 'Kaart', ru: 'Карта' },
  paymentUndefined: { es: 'No definido', en: 'Not defined', zh: '未定义', ja: '未設定' },
  paymentContra: { es: 'Pago contra entrega', en: 'Pay on delivery', zh: '货到付款', ja: '代金引換' },
  paymentValidating: { es: 'Pago en validación', en: 'Payment being validated', zh: '付款验证中', ja: '支払い確認中' },
  paymentConfirmed: { es: 'Pago confirmado', en: 'Payment confirmed', zh: '付款已确认', ja: '支払い確認済み' },
  paymentRejected: { es: 'Pago rechazado', en: 'Payment rejected', zh: '付款被拒绝', ja: '支払い拒否' },
  paymentPending: { es: 'Pago pendiente', en: 'Payment pending', zh: '待付款', ja: '支払い保留中' },
  paymentStatePending: { es: 'Estado pendiente', en: 'Pending status', zh: '待处理状态', ja: '保留中' },
  paymentConfirmedHelp: { es: 'Tu pago ya fue validado. El pedido puede avanzar normalmente.', en: 'Your payment was validated. The order can continue normally.', zh: '你的付款已验证，订单可以继续处理。', ja: '支払いが確認され、注文は通常通り進行できます。' },
  paymentRejectedHelp: { es: 'El pago no fue aceptado. Comunícate por WhatsApp para resolverlo.', en: 'Payment was not accepted. Contact us by WhatsApp to solve it.', zh: '付款未被接受，请通过 WhatsApp 联系我们解决。', ja: '支払いが承認されませんでした。WhatsAppでご連絡ください。' },
  paymentCashHelp: { es: 'Pagarás al recibir. El negocio debe aceptar el pedido antes de prepararlo.', en: 'You will pay on delivery. The business must accept the order before preparing it.', zh: '你将在收货时付款。商家需先接受订单。', ja: '受け取り時にお支払いください。準備前に店舗が注文を確認します。' },
  paymentDeunaHelp: { es: 'Estamos validando tu comprobante de Deuna antes de confirmar el pedido.', en: 'We are validating your Deuna proof before confirming the order.', zh: '确认订单前正在验证你的 Deuna 凭证。', ja: '注文確認前にDeunaの支払い証明を確認しています。' },
  paymentTransferHelp: { es: 'Estamos validando tu comprobante de transferencia antes de confirmar el pedido.', en: 'We are validating your transfer proof before confirming the order.', zh: '确认订单前正在验证你的转账凭证。', ja: '注文確認前に振込証明を確認しています。' },
  paymentCardHelp: { es: 'El pedido avanzará cuando el pago con tarjeta sea aprobado.', en: 'The order will continue when the card payment is approved.', zh: '银行卡付款通过后订单会继续处理。', ja: 'カード決済が承認されると注文が進みます。' },
  paymentDefaultHelp: { es: 'El negocio revisará el método de pago antes de preparar tu pedido.', en: 'The business will check the payment method before preparing your order.', zh: '商家会在准备订单前检查付款方式。', ja: '準備前に店舗が支払い方法を確認します。' },

  pendingTime: { es: 'Tiempo estimado pendiente', en: 'Estimated time pending', zh: '预计时间待定', ja: '予定時間は確認待ち' },
  pendingCash: { es: 'El negocio confirmará tu pedido y luego aparecerá el tiempo estimado.', en: 'The business will confirm your order and then the estimated time will appear.', zh: '商家确认订单后会显示预计时间。', ja: '店舗が注文を確認すると予定時間が表示されます。' },
  pendingDigital: { es: 'Se validará el pago y luego aparecerá el tiempo estimado.', en: 'Payment will be validated and then the estimated time will appear.', zh: '付款验证后会显示预计时间。', ja: '支払い確認後に予定時間が表示されます。' },
  pendingTransfer: { es: 'Se validará la transferencia y luego aparecerá el tiempo estimado.', en: 'The bank transfer will be validated and then the estimated time will appear.', zh: '转账验证后会显示预计时间。', ja: '振込確認後に予定時間が表示されます。' },
  pendingCard: { es: 'Se aprobará el pago y luego aparecerá el tiempo estimado.', en: 'Payment will be approved and then the estimated time will appear.', zh: '付款批准后会显示预计时间。', ja: '支払い承認後に予定時間が表示されます。' },
  pendingDefault: { es: 'Cuando el negocio confirme tu pedido, aquí aparecerá el tiempo estimado de entrega.', en: 'When the business confirms your order, the estimated delivery time will appear here.', zh: '商家确认订单后，这里会显示预计送达时间。', ja: '店舗が注文を確認すると、ここに配送予定時間が表示されます。' },

  etaTitle: { es: 'Tiempo estimado', en: 'Estimated time', pt: 'Tempo estimado', fr: 'Temps estimé', de: 'Geschätzte Zeit', it: 'Tempo stimato', zh: '预计时间', ja: '予定時間', nl: 'Geschatte tijd', ru: 'Примерное время' },
  arrival: { es: 'Llegada', en: 'Arrival', pt: 'Chegada', fr: 'Arrivée', de: 'Ankunft', it: 'Arrivo', zh: '到达', ja: '到着', nl: 'Aankomst', ru: 'Прибытие' },
  distance: { es: 'Distancia', en: 'Distance', pt: 'Distância', fr: 'Distance', de: 'Distanz', it: 'Distanza', zh: '距离', ja: '距離', nl: 'Afstand', ru: 'Расстояние' },
  noGps: { es: 'Sin GPS exacto', en: 'No exact GPS', zh: '无精确 GPS', ja: '正確なGPSなし' },
  etaSent: { es: 'Tu pedido debería llegar en aproximadamente {minutes} min.', en: 'Your order should arrive in about {minutes} min.', zh: '你的订单预计约 {minutes} 分钟后送达。', ja: '注文は約 {minutes} 分で到着予定です。' },
  etaNormal: { es: 'Tu pedido está estimado para llegar entre {min} y {max} min desde la confirmación.', en: 'Your order is estimated to arrive between {min} and {max} min from confirmation.', zh: '订单预计在确认后 {min} 到 {max} 分钟送达。', ja: '注文は確認後 {min}〜{max} 分で到着予定です。' },

  summaryTitle: { es: 'Pedido', en: 'Order', zh: '订单', ja: '注文' },
  summaryProducts: { es: 'Productos', en: 'Products', zh: '商品', ja: '商品' },
  delivery: { es: 'Delivery', en: 'Delivery', zh: '配送费', ja: '配送料' },
  free: { es: 'Gratis', en: 'Free', zh: '免费', ja: '無料' },
  subtotal: { es: 'Subtotal', en: 'Subtotal', zh: '小计', ja: '小計' },
  total: { es: 'Total', en: 'Total', zh: '总计', ja: '合計' },
  thanks: { es: 'Gracias por tu compra', en: 'Thank you for your purchase', zh: '感谢你的购买', ja: 'ご購入ありがとうございます' },
  thanksText: { es: 'Tu historial y experiencia se actualizarán si aplica. Puedes repetir este pedido desde la pestaña Pedidos.', en: 'Your history and experience will update when applicable. You can repeat this order from the Orders tab.', zh: '你的记录会在适用时更新。可以在订单页再次下单。', ja: '履歴は必要に応じて更新されます。注文タブから再注文できます。' },
  cancelledText: { es: 'Si crees que hubo un error, comunícate por WhatsApp con el negocio.', en: 'If you think this was an error, contact the business by WhatsApp.', zh: '如果你认为这是错误，请通过 WhatsApp 联系商家。', ja: '誤りと思われる場合はWhatsAppで店舗にご連絡ください。' },
  reference: { es: 'Referencia', en: 'Reference', zh: '参考信息', ja: 'メモ' },
  noExactGpsText: { es: 'No encontramos GPS exacto en este pedido. El tiempo se calcula como zona cercana.', en: 'No exact GPS was found in this order. Time is calculated as a nearby area.', zh: '此订单没有精确GPS，时间按附近区域估算。', ja: 'この注文には正確なGPSがありません。近隣エリアとして時間を計算します。' },
  whatsappHelp: { es: 'Ayuda por WhatsApp', en: 'Help by WhatsApp', zh: 'WhatsApp 帮助', ja: 'WhatsAppヘルプ' },

  noActiveKicker: { es: 'Sin pedido activo', en: 'No active order', pt: 'Sem pedido ativo', fr: 'Aucune commande active', de: 'Keine aktive Bestellung', it: 'Nessun ordine attivo', zh: '无进行中订单', ja: '進行中の注文なし', nl: 'Geen actieve bestelling', ru: 'Нет активного заказа' },
  noActiveTitle: { es: 'Aquí verás tu rastreo', en: 'Your tracking will appear here', zh: '追踪信息会显示在这里', ja: '追跡情報はここに表示されます' },
  noActiveText: { es: 'Cuando realices un pedido reciente, aquí aparecerán sus estados, pago, tiempo estimado, regalos Plus y ayuda.', en: 'When you place a recent order, its status, payment, estimated time, Plus gifts and help will appear here.', zh: '下新订单后，这里会显示状态、付款、预计时间、Plus 礼物和帮助。', ja: '最近の注文があると、状態・支払い・予定時間・Plusギフト・ヘルプが表示されます。' },
  noActiveInfo: { es: 'Te avisaremos dentro de la app cuando el pedido cambie de estado.', en: 'We will notify you inside the app when the order changes status.', zh: '订单状态变化时会在应用内通知你。', ja: '注文状態が変わるとアプリ内で通知します。' },

  noticeConfirmedTitle: { es: 'Pedido confirmado', en: 'Order confirmed', zh: '订单已确认', ja: '注文確認済み' },
  noticeConfirmedMsg: { es: 'El negocio aceptó tu pedido. Ahora empieza el seguimiento.', en: 'The business accepted your order. Tracking starts now.', zh: '商家已接受你的订单，现在开始追踪。', ja: '店舗が注文を受け付けました。追跡が始まります。' },
  noticePackingTitle: { es: 'Ya estamos empacando', en: 'We are packing now', zh: '正在打包', ja: '準備を開始しました' },
  noticePackingMsg: { es: 'Tu pedido está en preparación. Te avisaremos cuando salga a ruta.', en: 'Your order is being prepared. We will notify you when it leaves.', zh: '你的订单正在准备，出发配送时会通知你。', ja: '注文を準備中です。配送に出たら通知します。' },
  noticeRouteTitle: { es: 'Tu pedido va en camino', en: 'Your order is on the way', zh: '订单配送中', ja: '注文は配送中です' },
  noticeRouteMsg: { es: 'Prepárate para recibirlo. Revisa tu referencia y mantente atento.', en: 'Get ready to receive it. Check your reference and stay alert.', zh: '请准备收货，检查参考信息并保持关注。', ja: '受け取り準備をしてください。配送メモを確認してください。' },
  noticeDeliveredTitle: { es: 'Pedido entregado', en: 'Order delivered', zh: '订单已送达', ja: '配達完了' },
  noticeDeliveredMsg: { es: '¡Gracias por comprar en La Casa del Pollazo!', en: 'Thank you for shopping at La Casa del Pollazo!', zh: '感谢你在 La Casa del Pollazo 购物！', ja: 'La Casa del Pollazo のご利用ありがとうございます！' },
  noticeCancelledTitle: { es: 'Pedido cancelado', en: 'Order cancelled', zh: '订单已取消', ja: '注文キャンセル' },
  noticeCancelledMsg: { es: 'Tu pedido fue cancelado. Escríbenos si necesitas ayuda.', en: 'Your order was cancelled. Write to us if you need help.', zh: '你的订单已取消。如需帮助请联系我们。', ja: '注文はキャンセルされました。サポートが必要な場合はご連絡ください。' },
  noticeReceivedTitle: { es: 'Pedido recibido', en: 'Order received', zh: '订单已收到', ja: '注文を受け取りました' },
  noticeReceivedMsg: { es: 'Estamos revisando disponibilidad y método de pago.', en: 'We are checking availability and payment method.', zh: '正在检查库存和付款方式。', ja: '在庫と支払い方法を確認しています。' },
  noticePaymentConfirmedTitle: { es: 'Pago confirmado', en: 'Payment confirmed', zh: '付款已确认', ja: '支払い確認済み' },
  noticePaymentConfirmedMsg: { es: 'Tu pago fue validado. El pedido puede avanzar normalmente.', en: 'Your payment was validated. The order can continue normally.', zh: '你的付款已验证，订单可继续处理。', ja: '支払い確認済みです。注文を進められます。' },
  noticePaymentRejectedTitle: { es: 'Pago rechazado', en: 'Payment rejected', zh: '付款被拒绝', ja: '支払い拒否' },
  noticePaymentRejectedMsg: { es: 'No se pudo validar el pago. Comunícate con el negocio para resolverlo.', en: 'Payment could not be validated. Contact the business to solve it.', zh: '无法验证付款，请联系商家解决。', ja: '支払いを確認できません。店舗へご連絡ください。' },
  noticePaymentValidatingTitle: { es: 'Pago en validación', en: 'Payment being validated', zh: '付款验证中', ja: '支払い確認中' },
  noticePaymentValidatingMsg: { es: 'Estamos revisando tu pago. Te avisaremos cuando sea confirmado.', en: 'We are checking your payment. We will notify you when it is confirmed.', zh: '正在检查付款，确认后会通知你。', ja: '支払いを確認中です。確認後に通知します。' },
} as const;

const text = (language: LanguageCode, key: TextKey, params?: Record<string, string | number>) => {
  const entry = TEXTS[key] as LangText;
  const base = entry[language] || entry.en || entry.es;

  if (!params) return base;

  return Object.entries(params).reduce(
    (current, [paramKey, value]) => current.replaceAll(`{${paramKey}}`, String(value)),
    base
  );
};

const localeOf = (language: LanguageCode) => {
  if (language === 'es') return 'es-EC';
  if (language === 'zh') return 'zh-CN';
  if (language === 'ja') return 'ja-JP';
  if (language === 'pt') return 'pt-BR';
  if (language === 'fr') return 'fr-FR';
  if (language === 'de') return 'de-DE';
  if (language === 'it') return 'it-IT';
  if (language === 'nl') return 'nl-NL';
  if (language === 'ru') return 'ru-RU';
  return 'en-US';
};

const statusSteps: Array<{ status: OrderStatus; labelKey: TextKey; icon: LucideIcon }> = [
  { status: 'Por Confirmar', labelKey: 'stepConfirm', icon: Clock3 },
  { status: 'Recibido', labelKey: 'stepReceived', icon: ClipboardList },
  { status: 'Preparando', labelKey: 'stepPacking', icon: ShoppingBag },
  { status: 'Enviado', labelKey: 'stepRoute', icon: Truck },
  { status: 'Entregado', labelKey: 'stepDelivered', icon: CheckCircle2 },
];

const cleanPhoneTail = (phone?: string | null) => String(phone || '').replace(/\D/g, '').slice(-9);
const toRadians = (value: number) => (value * Math.PI) / 180;

const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const parseMoney = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const parsed = Number.parseFloat(
    String(value || '0')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? parsed : 0;
};

const moneyText = (value: unknown) => `$${parseMoney(value).toFixed(2)}`;

const getOrderLocation = (order: Order | null) => {
  if (!order) return null;

  const lat = parseCoordinate(order.lat);
  const lng = parseCoordinate(order.lng);

  if (lat === null || lng === null) return null;
  return { lat, lng };
};

const getOptionalDate = (order: Order, key: string): Date | null => {
  const value = (order as unknown as Record<string, unknown>)[key];
  if (!value) return null;

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const distanceKmBetween = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isRecentOrder = (order: Order) => {
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;
  return Boolean(createdAt && !Number.isNaN(createdAt) && createdAt > Date.now() - 24 * 60 * 60 * 1000);
};

const formatTime = (date: Date, language: LanguageCode) => {
  return date.toLocaleTimeString(localeOf(language), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: language === 'es' || language === 'en',
  });
};

const getOrderItemCount = (order: Order) => {
  return (order.items || []).reduce((sum: number, item: any) => sum + Number(item?.quantity || 1), 0);
};

const hasFreshOrVariableItems = (order: Order) => {
  return (order.items || []).some((item: any) => {
    const name = String(item?.name || item?.product?.name || '').toLowerCase();
    const category = String(item?.category || item?.product?.category || '').toLowerCase();

    return (
      item?.custom_price ||
      item?.product?.custom_price ||
      item?.product?.is_variable ||
      category.includes('pollo') ||
      name.includes('pollo') ||
      name.includes('pechuga') ||
      name.includes('alas') ||
      name.includes('cuartos') ||
      name.includes('menudencia')
    );
  });
};

const getPrepMinutes = (order: Order) => {
  const itemCount = getOrderItemCount(order);
  const hasFresh = hasFreshOrVariableItems(order);
  let min = 4;
  let max = 8;

  if (itemCount >= 4 && itemCount <= 8) {
    min += 3;
    max += 5;
  }

  if (itemCount > 8) {
    min += 6;
    max += 10;
  }

  if (hasFresh) {
    min += 4;
    max += 8;
  }

  if (order.payment_method === 'transferencia' || order.payment_method === 'deuna') {
    min += 2;
    max += 4;
  }

  return { min, max };
};

const getDeliveryMinutes = (distanceKm: number | null) => {
  if (distanceKm === null) return { min: 8, max: 18 };
  if (distanceKm <= 0) return { min: 5, max: 10 };

  const baseMin = Math.ceil(distanceKm * 4) + 4;
  const baseMax = Math.ceil(distanceKm * 6) + 8;

  return {
    min: Math.max(5, baseMin),
    max: Math.max(10, baseMax),
  };
};

const getTimingBaseDate = (order: Order, now: Date) => {
  const createdAt = order.created_at ? new Date(order.created_at) : now;
  const confirmedAt = getOptionalDate(order, 'confirmed_at');
  const updatedAt = getOptionalDate(order, 'updated_at');

  if (order.status === 'Enviado') return updatedAt || confirmedAt || createdAt;
  if (order.status === 'Preparando') return updatedAt || confirmedAt || createdAt;
  if (order.status === 'Recibido') return confirmedAt || updatedAt || createdAt;
  return createdAt;
};

const estimateOrderTiming = (order: Order, now: Date) => {
  const baseDate = getTimingBaseDate(order, now);
  const customerLocation = getOrderLocation(order);
  const distanceKm = customerLocation ? distanceKmBetween(STORE_LOCATION, customerLocation) : null;
  const prep = getPrepMinutes(order);
  const delivery = getDeliveryMinutes(distanceKm);

  let minMinutes = prep.min + delivery.min;
  let maxMinutes = prep.max + delivery.max;

  if (order.status === 'Preparando') {
    minMinutes = Math.max(6, delivery.min + 3);
    maxMinutes = Math.max(12, delivery.max + 8);
  }

  if (order.status === 'Enviado') {
    minMinutes = delivery.min;
    maxMinutes = delivery.max;
  }

  if (order.status === 'Entregado') {
    minMinutes = 0;
    maxMinutes = 0;
  }

  const earliest = new Date(baseDate.getTime() + minMinutes * 60 * 1000);
  const latest = new Date(baseDate.getTime() + maxMinutes * 60 * 1000);
  const remainingMs = latest.getTime() - now.getTime();
  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

  return {
    distanceKm,
    minMinutes,
    maxMinutes,
    earliest,
    latest,
    remainingMinutes,
  };
};

const getStatusTitle = (status: OrderStatus | undefined, language: LanguageCode) => {
  if (status === 'Por Confirmar') return text(language, 'statusPorConfirmar');
  if (status === 'Recibido') return text(language, 'statusRecibido');
  if (status === 'Preparando') return text(language, 'statusPreparando');
  if (status === 'Enviado') return text(language, 'statusEnviado');
  if (status === 'Entregado') return text(language, 'statusEntregado');
  if (status === 'Cancelado') return text(language, 'statusCancelado');
  return text(language, 'trackingLive');
};

const getStatusMessage = (status: OrderStatus, language: LanguageCode) => {
  if (status === 'Por Confirmar') return text(language, 'msgPorConfirmar');
  if (status === 'Recibido') return text(language, 'msgRecibido');
  if (status === 'Preparando') return text(language, 'msgPreparando');
  if (status === 'Enviado') return text(language, 'msgEnviado');
  if (status === 'Entregado') return text(language, 'msgEntregado');
  if (status === 'Cancelado') return text(language, 'msgCancelado');
  return text(language, 'followStep');
};

const getPaymentMethodLabel = (method: PaymentMethod | null | undefined, language: LanguageCode) => {
  if (method === 'efectivo') return text(language, 'paymentCash');
  if (method === 'deuna') return text(language, 'paymentDeuna');
  if (method === 'transferencia') return text(language, 'paymentTransfer');
  if (method === 'tarjeta') return text(language, 'paymentCard');
  return text(language, 'paymentUndefined');
};

const getPaymentIcon = (method: PaymentMethod | null | undefined): LucideIcon => {
  if (method === 'efectivo') return Banknote;
  if (method === 'deuna') return QrCode;
  if (method === 'transferencia') return Building;
  if (method === 'tarjeta') return ShieldCheck;
  return AlertCircle;
};

const getPaymentStatusLabel = (status: PaymentStatus | null | undefined, language: LanguageCode) => {
  if (status === 'contra_entrega') return text(language, 'paymentContra');
  if (status === 'validando') return text(language, 'paymentValidating');
  if (status === 'confirmado') return text(language, 'paymentConfirmed');
  if (status === 'rechazado') return text(language, 'paymentRejected');
  if (status === 'pendiente') return text(language, 'paymentPending');
  return text(language, 'paymentStatePending');
};

const getPaymentStatusTone = (status: PaymentStatus | null | undefined) => {
  if (status === 'confirmado') {
    return { wrapper: 'bg-green-50 border-green-100', icon: 'bg-white text-green-600', title: 'text-green-700', text: 'text-green-700/75' };
  }
  if (status === 'validando') {
    return { wrapper: 'bg-blue-50 border-blue-100', icon: 'bg-white text-blue-600', title: 'text-blue-700', text: 'text-blue-700/75' };
  }
  if (status === 'contra_entrega') {
    return { wrapper: 'bg-orange-50 border-orange-100', icon: 'bg-white text-orange-600', title: 'text-orange-700', text: 'text-orange-700/75' };
  }
  if (status === 'rechazado') {
    return { wrapper: 'bg-red-50 border-red-100', icon: 'bg-white text-red-500', title: 'text-red-600', text: 'text-red-600/75' };
  }
  return { wrapper: 'bg-gray-50 border-gray-100', icon: 'bg-white text-gray-500', title: 'text-gray-700', text: 'text-gray-500' };
};

const getPaymentHelpText = (order: Order, language: LanguageCode) => {
  if (order.payment_status === 'confirmado') return text(language, 'paymentConfirmedHelp');
  if (order.payment_status === 'rechazado') return text(language, 'paymentRejectedHelp');
  if (order.payment_method === 'efectivo') return text(language, 'paymentCashHelp');
  if (order.payment_method === 'deuna') return text(language, 'paymentDeunaHelp');
  if (order.payment_method === 'transferencia') return text(language, 'paymentTransferHelp');
  if (order.payment_method === 'tarjeta') return text(language, 'paymentCardHelp');
  return text(language, 'paymentDefaultHelp');
};

const getPendingPaymentText = (order: Order, language: LanguageCode) => {
  if (order.payment_method === 'efectivo') return text(language, 'pendingCash');
  if (order.payment_method === 'deuna') return text(language, 'pendingDigital');
  if (order.payment_method === 'transferencia') return text(language, 'pendingTransfer');
  if (order.payment_method === 'tarjeta') return text(language, 'pendingCard');
  return text(language, 'pendingDefault');
};

const getHeaderIcon = (status: OrderStatus | undefined): LucideIcon => {
  if (status === 'Cancelado') return XCircle;
  if (status === 'Por Confirmar') return Clock3;
  if (status === 'Entregado') return CheckCircle2;
  if (status === 'Enviado') return Truck;
  return PackageSearch;
};

const getHeroTone = (status: OrderStatus | undefined) => {
  if (status === 'Cancelado') {
    return {
      hero: 'from-red-500 via-red-400 to-orange-400',
      glow: 'bg-red-300/30',
      chip: 'bg-red-50 text-red-500 border-red-100',
      message: 'bg-red-50 border-red-100 text-red-600',
    };
  }

  if (status === 'Entregado') {
    return {
      hero: 'from-green-500 via-emerald-400 to-yellow-400',
      glow: 'bg-green-300/30',
      chip: 'bg-green-50 text-green-600 border-green-100',
      message: 'bg-green-50 border-green-100 text-green-700',
    };
  }

  if (status === 'Por Confirmar') {
    return {
      hero: 'from-orange-500 via-orange-400 to-yellow-400',
      glow: 'bg-orange-300/30',
      chip: 'bg-orange-50 text-orange-600 border-orange-100',
      message: 'bg-orange-50 border-orange-100 text-orange-700',
    };
  }

  return {
    hero: 'from-orange-500 via-orange-400 to-yellow-400',
    glow: 'bg-yellow-300/30',
    chip: 'bg-blue-50 text-blue-600 border-blue-100',
    message: 'bg-green-50 border-green-100 text-green-700',
  };
};

const getNoticeClasses = (tone: TrackingNoticeTone) => {
  if (tone === 'green') return { wrapper: 'bg-green-50 border-green-100 text-green-700', icon: 'bg-white text-green-600', button: 'bg-green-500 text-white' };
  if (tone === 'blue') return { wrapper: 'bg-blue-50 border-blue-100 text-blue-700', icon: 'bg-white text-blue-600', button: 'bg-blue-500 text-white' };
  if (tone === 'red') return { wrapper: 'bg-red-50 border-red-100 text-red-600', icon: 'bg-white text-red-500', button: 'bg-red-500 text-white' };
  return { wrapper: 'bg-orange-50 border-orange-100 text-orange-700', icon: 'bg-white text-orange-600', button: 'bg-orange-500 text-white' };
};

const getPushFeedbackClasses = (tone: PushCardTone) => {
  if (tone === 'green') return 'bg-green-50 border-green-100 text-green-700';
  if (tone === 'red') return 'bg-red-50 border-red-100 text-red-600';
  if (tone === 'blue') return 'bg-blue-50 border-blue-100 text-blue-700';
  return 'bg-orange-50 border-orange-100 text-orange-700';
};

const getOrderDeliveryText = (order: Order, language: LanguageCode) => {
  const deliveryFeeFinal = (order as unknown as { delivery_fee_final?: number | null }).delivery_fee_final;
  const delivery = Number(deliveryFeeFinal ?? order.delivery_fee ?? 0);
  return delivery <= 0 ? text(language, 'free') : moneyText(delivery);
};

const getOrderBonusItems = (order: Order) => {
  const raw = (order as unknown as {
    bonus_items?: Array<{
      item_name?: string | null;
      quantity?: number | string | null;
      message?: string | null;
    }> | null;
  }).bonus_items;

  return Array.isArray(raw) ? raw : [];
};

const hasOrderMembershipApplied = (order: Order) => {
  return Boolean((order as unknown as { membership_applied?: boolean }).membership_applied);
};

const buildHelpWhatsAppUrl = (order: Order, language: LanguageCode) => {
  const message = [
    `Hola, necesito ayuda con mi pedido ${order.order_code || 'actual'}.`,
    `Estado: ${getStatusTitle(order.status, language)}.`,
    `Pago: ${getPaymentStatusLabel(order.payment_status, language)}.`,
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

const buildTrackingNotice = (
  order: Order,
  previous: OrderSnapshot | null,
  language: LanguageCode
): Omit<TrackingNotice, 'id' | 'createdAt'> | null => {
  if (!previous || previous.id !== order.id) return null;

  if (previous.status !== order.status) {
    if (order.status === 'Recibido') {
      return { orderId: order.id, tone: 'green', title: text(language, 'noticeConfirmedTitle'), message: text(language, 'noticeConfirmedMsg') };
    }
    if (order.status === 'Preparando') {
      return { orderId: order.id, tone: 'blue', title: text(language, 'noticePackingTitle'), message: text(language, 'noticePackingMsg') };
    }
    if (order.status === 'Enviado') {
      return { orderId: order.id, tone: 'orange', title: text(language, 'noticeRouteTitle'), message: text(language, 'noticeRouteMsg') };
    }
    if (order.status === 'Entregado') {
      return { orderId: order.id, tone: 'green', title: text(language, 'noticeDeliveredTitle'), message: text(language, 'noticeDeliveredMsg') };
    }
    if (order.status === 'Cancelado') {
      return { orderId: order.id, tone: 'red', title: text(language, 'noticeCancelledTitle'), message: text(language, 'noticeCancelledMsg') };
    }
    if (order.status === 'Por Confirmar') {
      return { orderId: order.id, tone: 'orange', title: text(language, 'noticeReceivedTitle'), message: text(language, 'noticeReceivedMsg') };
    }
  }

  if (previous.paymentStatus !== order.payment_status) {
    if (order.payment_status === 'confirmado') {
      return { orderId: order.id, tone: 'green', title: text(language, 'noticePaymentConfirmedTitle'), message: text(language, 'noticePaymentConfirmedMsg') };
    }
    if (order.payment_status === 'rechazado') {
      return { orderId: order.id, tone: 'red', title: text(language, 'noticePaymentRejectedTitle'), message: text(language, 'noticePaymentRejectedMsg') };
    }
    if (order.payment_status === 'validando') {
      return { orderId: order.id, tone: 'blue', title: text(language, 'noticePaymentValidatingTitle'), message: text(language, 'noticePaymentValidatingMsg') };
    }
  }

  return null;
};

const triggerTrackingVibration = () => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 45, 80, 45, 130]);
    }
  } catch {
    // Vibración opcional.
  }
};

const getInitialPushPermission = () => {
  try {
    return getPushPermission();
  } catch {
    return 'default' as NotificationPermission;
  }
};

const getPushCardHidden = () => {
  try {
    const value = Number(localStorage.getItem(PUSH_CARD_HIDE_KEY) || '0');
    return value > Date.now();
  } catch {
    return false;
  }
};

const hidePushCardForNow = () => {
  try {
    const hideUntil = Date.now() + 12 * 60 * 60 * 1000;
    localStorage.setItem(PUSH_CARD_HIDE_KEY, String(hideUntil));
  } catch {
    // localStorage opcional.
  }
};

export default function OrderTracking({ isOpen = false, onClose = () => {} }: Props) {
  const { orders, refreshData } = useAdmin();
  const { customerPhone } = useUser();
  const { language } = useLanguage();

  const [now, setNow] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trackingNotice, setTrackingNotice] = useState<TrackingNotice | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getInitialPushPermission);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<PushCardFeedback | null>(null);
  const [pushCardHidden, setPushCardHidden] = useState(getPushCardHidden);

  const previousOrderSnapshotRef = useRef<OrderSnapshot | null>(null);
  const initializedNoticeWatcherRef = useRef(false);
  const alertAudioRef = useRef<AudioContext | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const cleanUserPhone = cleanPhoneTail(customerPhone);

  const activeOrder = useMemo(() => {
    if (!cleanUserPhone) return null;

    return (
      orders
        ?.filter(order => {
          const cleanOrder = cleanPhoneTail(order.customer_phone);
          return cleanOrder === cleanUserPhone && isRecentOrder(order);
        })
        .sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || '').getTime();
          const dateB = new Date(b.updated_at || b.created_at || '').getTime();
          return dateB - dateA;
        })[0] || null
    );
  }, [cleanUserPhone, orders]);

  const pushSupported = useMemo(() => isPushSupported(), []);
  const shouldShowPushCard =
    Boolean(activeOrder) &&
    Boolean(customerPhone) &&
    pushSupported &&
    pushPermission !== 'granted' &&
    !pushCardHidden;

  const playTrackingSound = useCallback((tone: TrackingNoticeTone) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      if (alertAudioRef.current) {
        alertAudioRef.current.close().catch(() => undefined);
        alertAudioRef.current = null;
      }

      const ctx = new AudioContextClass();
      alertAudioRef.current = ctx;

      const notes =
        tone === 'red'
          ? [392, 349.23]
          : tone === 'green'
            ? [523.25, 659.25, 783.99]
            : tone === 'blue'
              ? [440, 587.33, 659.25]
              : [493.88, 659.25, 880];

      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.12;
        const duration = 0.18;

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.start(start);
        oscillator.stop(start + duration);
      });

      window.setTimeout(() => {
        if (alertAudioRef.current) {
          alertAudioRef.current.close().catch(() => undefined);
          alertAudioRef.current = null;
        }
      }, 900);
    } catch {
      // Algunos navegadores bloquean audio sin interacción previa.
    }
  }, []);

  const showBrowserNotification = useCallback((notice: Omit<TrackingNotice, 'id' | 'createdAt'>) => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const notification = new Notification(notice.title, {
        body: notice.message,
        icon: '/logo-final.png',
        badge: '/logo-final.png',
        tag: `pollazo-${notice.orderId || 'tracking'}`,
        requireInteraction: false,
      });

      window.setTimeout(() => notification.close(), 6500);
    } catch {
      // Notificación del sistema opcional.
    }
  }, []);

  const raiseTrackingNotice = useCallback(
    (notice: Omit<TrackingNotice, 'id' | 'createdAt'>) => {
      const nextNotice: TrackingNotice = {
        ...notice,
        id: `${notice.orderId || 'tracking'}-${Date.now()}`,
        createdAt: Date.now(),
      };

      setTrackingNotice(nextNotice);
      triggerTrackingVibration();
      playTrackingSound(notice.tone);
      showBrowserNotification(notice);

      try {
        if (notice.tone === 'red') {
          document.title = '⚠️ Pedido - Pollazo';
        } else if (notice.title.toLowerCase().includes('camino')) {
          document.title = '🛵 En camino - Pollazo';
        } else {
          document.title = '🔔 Pedido actualizado';
        }
      } catch {
        // Título opcional.
      }
    },
    [playTrackingSound, showBrowserNotification]
  );

  const refreshTracking = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshData();
      setNow(new Date());
    } catch (error) {
      console.error('No se pudo refrescar el rastreo:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  const handleEnablePush = useCallback(async () => {
    if (!customerPhone) {
      setPushFeedback({ tone: 'orange', message: text(language, 'pushFirstPhone') });
      return;
    }

    if (!pushSupported) {
      setPushFeedback({ tone: 'red', message: text(language, 'pushNotSupported') });
      return;
    }

    try {
      setIsEnablingPush(true);
      setPushFeedback({ tone: 'blue', message: text(language, 'pushActivating') });

      const result = await registerPushNotifications(customerPhone);
      const nextPermission = getInitialPushPermission();
      setPushPermission(nextPermission);

      if (result.ok) {
        setPushFeedback({ tone: 'green', message: text(language, 'pushReady') });

        try {
          localStorage.removeItem(PUSH_CARD_HIDE_KEY);
        } catch {
          // localStorage opcional.
        }

        window.setTimeout(() => setPushFeedback(null), 4500);
        return;
      }

      setPushFeedback({
        tone: result.permission === 'denied' ? 'red' : 'orange',
        message: result.reason || text(language, 'pushRetry'),
      });
    } catch (error) {
      console.error('No se pudieron activar avisos del pedido:', error);
      setPushPermission(getInitialPushPermission());
      setPushFeedback({ tone: 'red', message: text(language, 'pushError') });
    } finally {
      setIsEnablingPush(false);
    }
  }, [customerPhone, language, pushSupported]);

  const handleHidePushCard = useCallback(() => {
    hidePushCardForNow();
    setPushCardHidden(true);
    setPushFeedback(null);
  }, []);

  useEffect(() => {
    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.close().catch(() => undefined);
        alertAudioRef.current = null;
      }

      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      try {
        document.title = 'La Casa del Pollazo';
      } catch {
        // Ignorar.
      }
    };
  }, []);

  useEffect(() => {
    if (!trackingNotice) {
      try {
        document.title = 'La Casa del Pollazo';
      } catch {
        // Ignorar.
      }
      return undefined;
    }

    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    const noticeId = trackingNotice.id;

    autoCloseTimerRef.current = window.setTimeout(() => {
      setTrackingNotice(current => (current?.id === noticeId ? null : current));
      autoCloseTimerRef.current = null;
    }, NOTICE_AUTO_CLOSE_MS);

    return () => {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [trackingNotice]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setNow(new Date());
    setPushPermission(getInitialPushPermission());
    setPushCardHidden(getPushCardHidden());

    const clock = window.setInterval(() => setNow(new Date()), 10000);
    return () => window.clearInterval(clock);
  }, [isOpen]);

  useEffect(() => {
    if (!cleanUserPhone) return undefined;

    if (isOpen) {
      refreshTracking();
    }

    const interval = window.setInterval(refreshTracking, isOpen ? 6000 : 15000);
    return () => window.clearInterval(interval);
  }, [cleanUserPhone, isOpen, refreshTracking]);

  useEffect(() => {
    if (!isSupabaseConfigured || !cleanUserPhone) return undefined;

    const channel = supabase
      .channel(`pollazo_tracking_${cleanUserPhone}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        const nextRow = payload.new as { customer_phone?: string } | null;
        const oldRow = payload.old as { customer_phone?: string } | null;
        const changedPhone = cleanPhoneTail(nextRow?.customer_phone) || cleanPhoneTail(oldRow?.customer_phone);

        if (changedPhone === cleanUserPhone) {
          refreshTracking();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanUserPhone, refreshTracking]);

  useEffect(() => {
    if (!cleanUserPhone) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setPushPermission(getInitialPushPermission());
        refreshTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refreshTracking);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refreshTracking);
    };
  }, [cleanUserPhone, refreshTracking]);

  useEffect(() => {
    if (!cleanUserPhone) {
      previousOrderSnapshotRef.current = null;
      initializedNoticeWatcherRef.current = false;
      return;
    }

    const nextSnapshot: OrderSnapshot | null = activeOrder
      ? {
          id: activeOrder.id,
          status: activeOrder.status,
          paymentStatus: activeOrder.payment_status || null,
          updatedAt: activeOrder.updated_at || activeOrder.created_at || null,
        }
      : null;

    if (!initializedNoticeWatcherRef.current) {
      previousOrderSnapshotRef.current = nextSnapshot;
      initializedNoticeWatcherRef.current = true;
      return;
    }

    if (!nextSnapshot || !activeOrder) {
      previousOrderSnapshotRef.current = null;
      return;
    }

    const previousSnapshot = previousOrderSnapshotRef.current;
    const notice = buildTrackingNotice(activeOrder, previousSnapshot, language);
    previousOrderSnapshotRef.current = nextSnapshot;

    if (notice) {
      raiseTrackingNotice(notice);
    }
  }, [activeOrder, activeOrder?.id, activeOrder?.payment_status, activeOrder?.status, activeOrder?.updated_at, cleanUserPhone, language, raiseTrackingNotice]);

  const renderTrackingNotice = (compact = false) => {
    if (!trackingNotice) return null;

    const classes = getNoticeClasses(trackingNotice.tone);

    return (
      <div className={`rounded-[28px] border p-4 shadow-xl animate-in slide-in-from-top-4 duration-300 ${classes.wrapper} ${compact ? 'w-[calc(100vw-24px)] max-w-md' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${classes.icon}`}>
            <BellRing size={22} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase italic leading-tight">{trackingNotice.title}</p>
            <p className="text-[11px] font-bold leading-relaxed mt-1 opacity-80">{trackingNotice.message}</p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" onClick={() => setTrackingNotice(null)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all ${classes.button}`}>
                {text(language, 'understood')}
              </button>
              <div className="flex items-center gap-1 text-[9px] font-black uppercase opacity-60">
                <Volume2 size={12} />
                {text(language, 'autoCloses')}
              </div>
            </div>
          </div>

          <button type="button" onClick={() => setTrackingNotice(null)} className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center active:scale-90 transition-transform" aria-label={text(language, 'close')}>
            <X size={15} />
          </button>
        </div>
      </div>
    );
  };

  const renderPushCard = () => {
    if (!shouldShowPushCard) return null;

    return (
      <section className="rounded-[30px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 flex items-center justify-center flex-shrink-0">
            {pushPermission === 'denied' ? <BellOff size={22} /> : <Bell size={22} />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900 uppercase italic leading-tight">{text(language, 'activatePushTitle')}</p>
            <p className="text-[11px] font-bold text-slate-500 leading-relaxed mt-1">{text(language, 'activatePushText')}</p>

            {pushFeedback && (
              <p className={`mt-3 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase leading-relaxed ${getPushFeedbackClasses(pushFeedback.tone)}`}>
                {pushFeedback.message}
              </p>
            )}

            {pushPermission === 'denied' && (
              <p className="mt-3 rounded-2xl bg-red-50 border border-red-100 px-3 py-2 text-[10px] font-black uppercase leading-relaxed text-red-600">
                {text(language, 'pushBlocked')}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {pushPermission !== 'denied' && (
                <button type="button" onClick={handleEnablePush} disabled={isEnablingPush} className="flex-1 min-w-[150px] rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                  {isEnablingPush ? text(language, 'activating') : text(language, 'activate')}
                </button>
              )}
              <button type="button" onClick={handleHidePushCard} className="rounded-2xl bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 active:scale-95 transition-all">
                {text(language, 'later')}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  };

  if (!isOpen) {
    if (!trackingNotice) return null;

    return (
      <div className="fixed left-0 right-0 top-4 z-[10001] flex justify-center px-3 pointer-events-none">
        <div className="pointer-events-auto">{renderTrackingNotice(true)}</div>
      </div>
    );
  }

  const hasActiveOrder = Boolean(activeOrder);
  const currentStatus = activeOrder?.status;
  const currentStatusIdx = currentStatus ? statusSteps.findIndex(step => step.status === currentStatus) : -1;
  const canShowEta =
    activeOrder &&
    currentStatus &&
    currentStatus !== 'Por Confirmar' &&
    currentStatus !== 'Entregado' &&
    currentStatus !== 'Cancelado';

  const estimate = canShowEta ? estimateOrderTiming(activeOrder, now) : null;
  const orderLocation = getOrderLocation(activeOrder);
  const PaymentIcon = activeOrder ? getPaymentIcon(activeOrder.payment_method) : AlertCircle;
  const paymentTone = activeOrder ? getPaymentStatusTone(activeOrder.payment_status) : null;
  const HeaderIcon = getHeaderIcon(currentStatus);
  const heroTone = getHeroTone(currentStatus);
  const progressPercent = currentStatus && currentStatusIdx >= 0 ? Math.round((currentStatusIdx / Math.max(1, statusSteps.length - 1)) * 100) : 0;
  const bonusItems = activeOrder ? getOrderBonusItems(activeOrder) : [];
  const plusApplied = activeOrder ? hasOrderMembershipApplied(activeOrder) : false;
  const activeHelpUrl = activeOrder ? buildHelpWhatsAppUrl(activeOrder, language) : '';

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-orange-950/20" onClick={onClose} aria-label={text(language, 'close')} />

      <section className="relative z-10 w-full sm:max-w-md max-h-[88dvh] bg-white rounded-t-[36px] sm:rounded-[36px] shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 border border-white/80 overflow-hidden flex flex-col">
        <header className={`relative overflow-hidden bg-gradient-to-br ${heroTone.hero} text-white px-5 pt-[calc(env(safe-area-inset-top)+14px)] sm:pt-4 pb-4 flex-shrink-0`}>
          <div className={`absolute -right-16 -top-16 w-52 h-52 ${heroTone.glow} rounded-full blur-3xl`} />
          <div className="absolute -left-16 -bottom-16 w-52 h-52 bg-white/15 rounded-full blur-3xl" />

          <button type="button" onClick={onClose} className="absolute top-[calc(env(safe-area-inset-top)+14px)] sm:top-4 right-4 w-9 h-9 bg-white/20 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform z-10 border border-white/20" aria-label={text(language, 'close')}>
            <X size={20} />
          </button>

          <div className="relative pr-12">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[22px] flex items-center justify-center shadow-xl border bg-white/20 text-white border-white/25">
                <HeaderIcon size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/75">{text(language, 'trackingKicker')}</p>
                <h2 className="text-xl font-black uppercase italic leading-none mt-1.5">{hasActiveOrder ? getStatusTitle(currentStatus, language) : text(language, 'trackingLive')}</h2>
                <p className="text-[12px] font-bold text-white/80 leading-relaxed mt-2 line-clamp-2">
                  {hasActiveOrder && activeOrder
                    ? currentStatus === 'Por Confirmar'
                      ? `${activeOrder.order_code || text(language, 'order')}`
                      : `${activeOrder.order_code || text(language, 'order')} · ${getOrderItemCount(activeOrder)} ${getOrderItemCount(activeOrder) === 1 ? text(language, 'product') : text(language, 'products')}`
                    : text(language, 'followStep')}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] space-y-3 bg-gradient-to-b from-orange-50/45 via-white to-white">
          {renderTrackingNotice(false)}

          {hasActiveOrder && currentStatus && activeOrder ? (
            <>
              {currentStatus !== 'Cancelado' && (
                <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">{text(language, 'progressTitle')}</p>
                    <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase ${heroTone.chip}`}>{getStatusTitle(currentStatus, language)}</span>
                  </div>

                  <div className="relative px-1 pt-1 pb-2">
                    <div className="absolute left-5 right-5 top-[21px] h-2 bg-orange-50 rounded-full" />
                    <div className="absolute left-5 top-[21px] h-2 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-700" style={{ width: `calc((100% - 40px) * ${progressPercent / 100})` }} />

                    <div className="relative flex justify-between">
                      {statusSteps.map((step, idx) => {
                        const isCompleted = currentStatusIdx >= idx;
                        const isCurrent = currentStatus === step.status;
                        const Icon = step.icon;

                        return (
                          <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isCompleted ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200' : 'bg-white border-orange-100 text-orange-200'} ${isCurrent ? 'scale-110 ring-4 ring-orange-100 animate-pulse' : ''}`}>
                              <Icon size={18} />
                            </div>
                            <span className={`text-[7px] font-black uppercase tracking-tighter text-center max-w-[58px] leading-tight ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>
                              {text(language, step.labelKey)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              <section className={`rounded-[30px] border p-4 shadow-sm ${heroTone.message}`}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/85 flex items-center justify-center shadow-sm flex-shrink-0">
                    <HeaderIcon size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase italic leading-tight">{getStatusTitle(currentStatus, language)}</p>
                    <p className="text-[11px] font-bold leading-relaxed mt-1.5 opacity-80">{getStatusMessage(currentStatus, language)}</p>
                  </div>
                </div>
              </section>

              {(plusApplied || bonusItems.length > 0) && (
                <section className="grid grid-cols-1 gap-3">
                  {plusApplied && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-[28px] p-4 shadow-sm flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-100 flex-shrink-0">
                        <Crown size={22} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">{text(language, 'plusApplied')}</p>
                        <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-1">{text(language, 'plusAppliedText')}</p>
                      </div>
                    </div>
                  )}

                  {bonusItems.length > 0 && (
                    <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Gift size={17} className="text-orange-500" />
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">{text(language, 'giftAdded')}</p>
                      </div>
                      <div className="space-y-2">
                        {bonusItems.map((gift, index) => (
                          <div key={`${gift.item_name || 'regalo'}-${index}`} className="bg-white border border-orange-100 rounded-2xl p-3">
                            <p className="text-[11px] font-black text-gray-900 uppercase">{Number(gift.quantity || 1)}x {gift.item_name || text(language, 'surprise')}</p>
                            {gift.message && <p className="text-[10px] font-bold text-gray-400 mt-1 leading-relaxed">{gift.message}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {renderPushCard()}

              {paymentTone && currentStatus !== 'Por Confirmar' && (
                <section className={`rounded-[30px] border p-4 shadow-sm ${paymentTone.wrapper}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${paymentTone.icon}`}>
                      <PaymentIcon size={21} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase leading-tight ${paymentTone.title}`}>
                        {getPaymentMethodLabel(activeOrder.payment_method, language)} · {getPaymentStatusLabel(activeOrder.payment_status, language)}
                      </p>
                      <p className={`text-[10px] font-bold leading-relaxed mt-1 ${paymentTone.text}`}>{getPaymentHelpText(activeOrder, language)}</p>
                    </div>
                  </div>
                </section>
              )}

              {currentStatus === 'Por Confirmar' && (
                <section className="bg-yellow-50 border border-yellow-100 rounded-[26px] p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm flex-shrink-0">
                      <ShieldCheck size={21} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">{text(language, 'pendingTime')}</p>
                      <p className="text-[11px] font-bold text-yellow-700/80 leading-relaxed mt-1">{getPendingPaymentText(activeOrder, language)}</p>
                    </div>
                  </div>
                </section>
              )}

              {estimate && (
                <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <TimerReset size={16} className="text-orange-500" />
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{text(language, 'etaTitle')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
                      <div className="flex items-center gap-2 text-orange-600 mb-1">
                        <Clock3 size={15} />
                        <span className="text-[8px] font-black uppercase">{text(language, 'arrival')}</span>
                      </div>
                      <p className="text-xs font-black text-gray-900 leading-snug">{formatTime(estimate.earliest, language)} - {formatTime(estimate.latest, language)}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Navigation size={15} />
                        <span className="text-[8px] font-black uppercase">{text(language, 'distance')}</span>
                      </div>
                      <p className="text-xs font-black text-gray-900 leading-snug">{estimate.distanceKm !== null ? `${estimate.distanceKm.toFixed(1)} km` : text(language, 'noGps')}</p>
                    </div>
                  </div>

                  <div className="mt-3 bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-green-700 leading-relaxed">
                      {currentStatus === 'Enviado'
                        ? text(language, 'etaSent', { minutes: estimate.remainingMinutes })
                        : text(language, 'etaNormal', { min: estimate.minMinutes, max: estimate.maxMinutes })}
                    </p>
                  </div>
                </section>
              )}

              <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <ReceiptText size={16} className="text-orange-500" />
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{text(language, 'summaryTitle')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
                    <p className="text-[8px] font-black text-orange-500 uppercase">{text(language, 'summaryProducts')}</p>
                    <p className="text-sm font-black text-gray-900 mt-1">{getOrderItemCount(activeOrder)} {text(language, 'units')}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
                    <p className="text-[8px] font-black text-yellow-700 uppercase">{text(language, 'delivery')}</p>
                    <p className="text-sm font-black text-gray-900 mt-1">{getOrderDeliveryText(activeOrder, language)}</p>
                  </div>
                </div>

                <div className="mt-3 bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>{text(language, 'subtotal')}</span>
                    <span>{moneyText(activeOrder.subtotal)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 uppercase">{text(language, 'total')}</span>
                    <span className="text-2xl font-black text-orange-600">{moneyText(activeOrder.total)}</span>
                  </div>
                </div>
              </section>

              {currentStatus === 'Entregado' && (
                <section className="bg-green-50 border border-green-100 rounded-[30px] p-5 text-center shadow-sm">
                  <CheckCircle2 size={34} className="text-green-600 mx-auto mb-3" />
                  <p className="text-xs font-black text-green-700 uppercase italic leading-tight">{text(language, 'thanks')}</p>
                  <p className="text-[11px] font-bold text-green-700/75 leading-relaxed mt-2">{text(language, 'thanksText')}</p>
                </section>
              )}

              {currentStatus === 'Cancelado' && (
                <section className="bg-red-50 border border-red-100 rounded-[30px] p-5 text-center shadow-sm">
                  <XCircle size={34} className="text-red-500 mx-auto mb-3" />
                  <p className="text-xs font-black text-red-600 uppercase italic leading-tight">{getStatusTitle(currentStatus, language)}</p>
                  <p className="text-[11px] font-bold text-red-600/75 leading-relaxed mt-2">{text(language, 'cancelledText')}</p>
                </section>
              )}

              {activeOrder.reference && (
                <section className="bg-blue-50 border border-blue-100 rounded-[28px] p-4 flex items-start gap-3 shadow-sm">
                  <MapPin size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{text(language, 'reference')}</p>
                    <p className="text-[11px] font-bold text-blue-700 leading-relaxed mt-1">{activeOrder.reference}</p>
                  </div>
                </section>
              )}

              {!orderLocation && currentStatus !== 'Por Confirmar' && currentStatus !== 'Cancelado' && (
                <section className="bg-orange-50 border border-orange-100 rounded-[28px] p-4 flex items-start gap-3 shadow-sm">
                  <MapPin size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-orange-700 uppercase leading-relaxed">{text(language, 'noExactGpsText')}</p>
                </section>
              )}

              <a href={activeHelpUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-green-500 text-white rounded-[24px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-100">
                <MessageCircle size={16} />
                {text(language, 'whatsappHelp')}
              </a>
            </>
          ) : (
            <div className="space-y-4">
              <section className="relative overflow-hidden bg-white border border-orange-100 rounded-[34px] p-6 text-center shadow-sm">
                <div className="absolute -right-12 -top-12 w-40 h-40 bg-orange-200/30 rounded-full blur-3xl" />
                <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-yellow-200/30 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="w-20 h-20 rounded-[30px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white mx-auto flex items-center justify-center shadow-xl shadow-orange-100 mb-5">
                    <PackageSearch size={38} />
                  </div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.26em]">{text(language, 'noActiveKicker')}</p>
                  <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">{text(language, 'noActiveTitle')}</h3>
                  <p className="text-sm font-bold text-gray-500 leading-relaxed mt-4">{text(language, 'noActiveText')}</p>
                </div>
              </section>

              <section className="bg-blue-50 rounded-[30px] flex items-start gap-4 border border-blue-100 shadow-sm p-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                  <Info size={24} />
                </div>
                <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed text-left">{text(language, 'noActiveInfo')}</p>
              </section>

              <button type="button" onClick={onClose} className="w-full py-5 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-black rounded-[26px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-orange-100">
                {text(language, 'understood')}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
