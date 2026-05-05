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
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  points: number;
  created_at?: string;
}

export type OrderStatus = 'Recibido' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado';

export interface Order {
  id: string;
  order_code: string;
  customer_id?: string | null;
  customer_phone: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  preorder: boolean;
  created_at?: string;
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

export interface CartItem {
  product: Product;
  quantity: number;
}
