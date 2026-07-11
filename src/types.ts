export type LanguageCode =
  | 'es'
  | 'en'
  | 'pt'
  | 'fr'
  | 'de'
  | 'it'
  | 'zh'
  | 'ja'
  | 'nl'
  | 'ru';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  shortLabel: string;
  flag: string;
}

export type Category =
  | 'Pollos'
  | 'Embutidos'
  | 'Lácteos y refrigerados'
  | 'Abarrotes y básicos'
  | 'Salsas, aliños y aceites'
  | 'Bebidas'
  | 'Frutas y verduras'
  | 'Snacks y dulces'
  | 'Cuidado personal'
  | 'Limpieza y hogar';

export type Screen =
  | 'home'
  | 'catalog'
  | 'orders'
  | 'cart'
  | 'info'
  | 'ranking';

export type OrderStatus =
  | 'Por Confirmar'
  | 'Recibido'
  | 'Preparando'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

export type PaymentMethod =
  | 'efectivo'
  | 'deuna'
  | 'transferencia'
  | 'tarjeta';

export type PaymentStatus =
  | 'pendiente'
  | 'validando'
  | 'confirmado'
  | 'rechazado'
  | 'contra_entrega';

export type DeliveryType = 'domicilio' | 'retiro';

export type CustomerRiskLevel =
  | 'normal'
  | 'confiable'
  | 'riesgoso'
  | 'bloqueado';

export type DeliveryAddressLabel =
  | 'Casa'
  | 'Trabajo'
  | 'Airbnb'
  | 'Otro';

export type MembershipStatus =
  | 'none'
  | 'pending'
  | 'active'
  | 'expired'
  | 'cancelled';

export type MembershipPlanKey = 'pollazo_plus';

export interface DeliveryAddress {
  id: string;
  label: DeliveryAddressLabel;
  reference: string;
  lat: number;
  lng: number;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  subcategory?: string | null;
  price?: string | null;
  unit?: string | null;
  description?: string | null;
  image?: string | null;
  badge?: string | null;
  available?: boolean;

  // Dónde se muestra el producto.
  show_in_app?: boolean;
  show_in_pos?: boolean;

  // Para productos pedidos por valor: "$10 de pollo", "$15 de alas", etc.
  is_variable?: boolean;

  // Precio elegido por el cliente en productos variables.
  custom_price?: number;

  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;

  // Compatibilidad con código anterior.
  // id normalmente conserva el ID base del producto.
  id?: string;
  name?: string;
  price?: number;
  custom_price?: number;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  avatar_url?: string | null;

  // Fidelización
  points: number;
  exp: number;
  is_vip: boolean;

  // Membresía Pollazo Plus
  membership_status?: MembershipStatus | null;
  membership_plan?: string | null;
  membership_started_at?: string | null;
  membership_expires_at?: string | null;
  membership_updated_at?: string | null;

  // Seguridad / confianza
  phone_verified?: boolean;
  risk_level?: CustomerRiskLevel | null;
  blocked?: boolean;

  // Ubicación activa
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;

  // Direcciones favoritas
  delivery_addresses?: DeliveryAddress[] | null;
  selected_delivery_address_id?: string | null;

  created_at?: string;
  updated_at?: string;
}

/**
 * Representación estable de una línea guardada dentro de un pedido.
 * Conserva campos antiguos mientras la creación de pedidos se migra al servidor.
 */
export interface OrderItem {
  id?: string;
  product_id?: string;
  cart_item_id?: string;
  name: string;
  quantity: number;
  price?: number | string | null;
  price_text?: string | null;
  custom_price?: number | null;
  subtotal?: number;
  line_subtotal?: number;
  category?: Category | string | null;
  image?: string | null;
  unit?: string | null;
  product?: Partial<Product> | null;
}

export interface OrderBonusItem {
  id?: string;
  order_id?: string;
  order_code?: string;
  customer_phone?: string;
  item_name: string;
  quantity: number;
  reason?: string | null;
  message?: string | null;
  added_by_admin?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  order_code: string;
  customer_id?: string | null;
  customer_phone: string;
  customer_name?: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;

  provider?: boolean;
  preorder?: boolean;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
  delivery_type?: DeliveryType | null;
  payment_proof_url?: string | null;
  selected_bank?: string | null;

  lat?: number | null;
  lng?: number | null;
  reference?: string | null;

  service_fee?: number;
  card_fee?: number;
  delivery_fee_original?: number;
  delivery_fee_final?: number;

  membership_applied?: boolean;
  membership_id?: string | null;
  membership_plan?: string | null;

  bonus_items?: OrderBonusItem[] | null;
  vip_gift_message?: string | null;

  counted_in_metrics?: boolean;
  is_test_order?: boolean;
  idempotency_key?: string | null;

  confirmed_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AppSettings {
  announcement: string;
  primary_color: string;
  banner_link: string;
}

export interface ExtraSettings {
  logo_url: string;
  ranking_title: string;
  prize_description: string;
  ranking_end_date: string;
  winner_photo_url: string;
  prize_1: string;
  prize_2: string;
  prize_3: string;
  event_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerMembership {
  id: string;
  customer_phone: string;
  customer_name?: string | null;
  plan_key: MembershipPlanKey | string;
  plan_name: string;
  status: Exclude<MembershipStatus, 'none'>;
  price: number;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
  started_at?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MembershipPayment {
  id: string;
  membership_id: string;
  customer_phone: string;
  customer_name?: string | null;
  amount: number;
  payment_method?: PaymentMethod | null;
  payment_status: PaymentStatus;
  period_start?: string | null;
  period_end?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}
