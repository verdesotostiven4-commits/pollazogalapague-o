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

export interface OrderItem {
  id?: string;
  product_id?: string;
  cart_item_id?: string;
  name?: string;
  category?: Category | string;
  quantity?: number;
  price?: number | string | null;
  price_text?: string | null;
  custom_price?: number | null;
  subtotal?: number | string | null;
  image?: string | null;
  product?: Product | null;
}

export interface OrderBonusItem {
  id?: string;
  order_id: string;
  order_code?: string | null;
  customer_phone?: string | null;
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
  items: OrderItem[];
  subtotal: number | string;
  delivery_fee: number | string;
  delivery_fee_original?: number | string | null;
  delivery_fee_final?: number | string | null;
  service_fee?: number | string | null;
  card_fee?: number | string | null;
  total: number | string;
  status: OrderStatus;
  preorder?: boolean;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
  delivery_type?: DeliveryType | null;
  lat?: number | string | null;
  lng?: number | string | null;
  reference?: string | null;
  provider?: boolean | null;
  membership_applied?: boolean | null;
  membership_id?: string | null;
  membership_plan?: string | null;
  bonus_items?: OrderBonusItem[] | null;
  vip_gift_message?: string | null;
  counted_in_metrics?: boolean | null;
  is_test_order?: boolean | null;
  estimated_time?: number | string | null;
  eta?: number | string | null;
  created_at: string;
  updated_at?: string;
}

export interface AppSettings {
  announcement: string;
  primary_color: string;
  banner_link: string;
}

export interface ExtraSettings {
  id?: string;
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
  status: MembershipStatus;
  price?: number | string | null;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
  notes?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MembershipPayment {
  id: string;
  membership_id: string;
  customer_phone: string;
  customer_name?: string | null;
  amount: number | string;
  payment_method?: PaymentMethod | null;
  payment_status: PaymentStatus;
  notes?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
