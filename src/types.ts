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
}
