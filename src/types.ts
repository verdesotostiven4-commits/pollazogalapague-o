export interface Product {
  id: string;
  name: string;
  category: Category;
  subcategory?: string; // ✅ Clasificación estilo PedidosYa
  price?: string;
  unit?: string;
  description?: string;
  image?: string;
  badge?: string;
  available?: boolean;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  points: number;
  avatar_url?: string | null;
}

export type OrderStatus = 'Recibido' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado';

export interface Order {
  id: string;
  order_code: string;
  customer_id?: string | null;
  customer_phone: string;
  items: any[]; // Lista detallada de productos
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  provider: boolean; // Corregido de preorder a provider según lógica previa o mantenido según tu flujo
  preorder: boolean;
  created_at?: string;
}

export interface ExtraSettings {
  logo_url: string;
  ranking_title: string;
  prize_description: string;
  ranking_end_date: string;
  winner_photo_url: string;
  prize_1: string; // ✅ Premio Oro
  prize_2: string; // ✅ Premio Plata
  prize_3: string; // ✅ Premio Bronce
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
}
