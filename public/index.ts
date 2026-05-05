export interface Product {
  id: string;
  name: string;
  category: Category;
  price?: string;
  unit?: string;
  description?: string;
  image?: string;
  badge?: string;
}

export type Category =
  | 'Pollos'
  | 'Embutidos'
  | 'Menudencia'
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
