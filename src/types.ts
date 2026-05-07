export interface Product {
  id: string;
  name: string;
  category: Category;
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
  // ✅ Campos para Gamificación Pro
  last_roulette_spin?: string | null; // Para el bloqueo Anti-Candy Crush
  completed_missions?: string[]; // IDs de misiones ya hechas
  total_orders?: number; // Para estadísticas de "Vecino Fiel"
}

// ✅ Nuevo: Modelo para las Misiones del Minimarket
export interface Mission {
  id: string;
  title: string;
  description: string;
  points_reward: number;
  icon: string;
  category_target?: Category; // Por ejemplo: Misión de 'Limpieza y hogar'
  requirement_count: number; // Ej: "Compra 3 veces"
  type: 'daily' | 'weekly' | 'permanent';
}

export type OrderStatus = 'Recibido' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado';

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
  preorder: boolean;
  created_at?: string;
}

export type Category = 
  | 'Pollos' | 'Embutidos' | 'Lácteos y refrigerados' | 'Abarrotes y básicos' 
  | 'Salsas, aliños y aceites' | 'Bebidas' | 'Frutas y verduras' 
  | 'Snacks y dulces' | 'Cuidado personal' | 'Limpieza y hogar';

// ✅ Añadida la pantalla 'profile' para el Centro de Control del Guerrero
export type Screen = 'home' | 'catalog' | 'cart' | 'info' | 'ranking' | 'profile';

export interface CartItem {
  product: Product;
  quantity: number;
}
