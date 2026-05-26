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

export type Screen = 'home' | 'catalog' | 'cart' | 'info' | 'ranking';

export interface Product {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  price?: string;
  unit?: string;
  description?: string;
  image?: string;
  badge?: string;
  available?: boolean;

  /**
   * Productos como pollo/carnes que el cliente compra por valor:
   * ejemplo: "$10 de pollo entero", "$15 de pechuga", etc.
   */
  is_variable?: boolean;

  /**
   * Precio elegido por el cliente para productos variables.
   * Este campo vive en el carrito, no necesariamente en la tabla products.
   */
  custom_price?: number;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  avatar_url?: string | null;

  /**
   * Fidelización
   */
  points: number;
  exp: number;
  is_vip: boolean;
  has_reviewed?: boolean;

  /**
   * Ubicación del cliente
   */
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;

  created_at?: string;
  updated_at?: string;
}

export type OrderStatus =
  | 'Por Confirmar'
  | 'Recibido'
  | 'Preparando'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

export type PaymentMethod = 'efectivo' | 'deuna' | 'transferencia';
export type DeliveryType = 'domicilio' | 'retiro';

export interface CartItem {
  /**
   * Estructura real usada por la app:
   * CartScreen, Cart.tsx, utils/whatsapp.ts y ProductCard trabajan con item.product.
   */
  product: Product;
  quantity: number;

  /**
   * Compatibilidad temporal con partes antiguas del código.
   * Luego podemos limpiar esto cuando corrijamos App.tsx y CartScreen.tsx.
   */
  id?: string;
  name?: string;
  price?: number;
  custom_price?: number;
}

export interface Order {
  /**
   * Supabase genera este id automáticamente al insertar.
   */
  id?: string;

  order_code: string;
  customer_id?: string | null;
  customer_phone: string;

  /**
   * En pedidos nuevos debería venir como CartItem[] normalizado.
   * Se deja any[] como compatibilidad con pedidos antiguos guardados en Supabase.
   */
  items: CartItem[] | any[];

  subtotal: number;
  delivery_fee?: number;
  total: number;
  status: OrderStatus;
  provider?: boolean;
  preorder: boolean;
  created_at?: string;
  updated_at?: string;

  payment_method?: PaymentMethod;
  delivery_type?: DeliveryType;
  payment_proof_url?: string;

  lat?: number | null;
  lng?: number | null;
  reference?: string | null;
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
}
