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
  // ✅ NUEVO: Para saber si es pollo/carne que se pide por valor ($10, $15)
  is_variable?: boolean; 
}

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  avatar_url?: string | null;
  // ✅ NUEVOS CAMPOS DE FIDELIZACIÓN Y UBICACIÓN
  points: number;       // Puntos de temporada (los que se reinician)
  exp: number;          // EXP histórica (la que define el NIVEL y no se borra)
  is_vip: boolean;      // ¿Tiene el Pollazo Pass?
  lat?: number;         // Coordenada GPS
  lng?: number;         // Coordenada GPS
  reference?: string;   // Referencia escrita (casa amarilla, etc.)
}

export type OrderStatus = 'Recibido' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado';

// ✅ NUEVOS TIPOS PARA LOGÍSTICA
export type PaymentMethod = 'efectivo' | 'deuna' | 'transferencia';
export type DeliveryType = 'domicilio' | 'retiro';

export interface Order {
  id: string;
  order_code: string;
  customer_id?: string | null;
  customer_phone: string;
  items: any[]; 
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  provider: boolean; 
  preorder: boolean;
  created_at?: string;
  // ✅ NUEVOS CAMPOS PARA EL ADMIN OJO DE HALCÓN
  payment_method: PaymentMethod;
  delivery_type: DeliveryType;
  payment_proof_url?: string; // Link a la foto del comprobante
  lat?: number;               // Ubicación exacta del pedido
  lng?: number;               // Ubicación exacta del pedido
  reference?: string;         // Referencia de la casa para este pedido
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
  // ✅ NUEVO: Para activar/desactivar el Ranking
  event_active: boolean; 
}

export type Category = 
  | 'Pollos' | 'Embutidos' | 'Lácteos y refrigerados' | 'Abarrotes y básicos' 
  | 'Salsas, aliños y aceites' | 'Bebidas' | 'Frutas y verduras' 
  | 'Snacks y dulces' | 'Cuidado personal' | 'Limpieza y hogar';

export type Screen = 'home' | 'catalog' | 'cart' | 'info' | 'ranking';

export interface CartItem {
  id: string;
  quantity: number;
  name?: string;
  price?: number;
  // ✅ NUEVO: Por si el cliente pidió "$12.50 de pollo"
  custom_price?: number; 
}
