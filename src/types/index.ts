export interface Product {
  id: string;
  brand: string;
  model_name: string;
  description: string;
  ram_gb: number;
  storage_gb: number;
  color: string;
  processor: string;
  price: number;
  stock_quantity: number;
  image_urls: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: { full_name: string };
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  shipping_address: string;
  is_admin: boolean;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  shipping_address: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Bestseller {
  product_id: string;
  brand: string;
  model_name: string;
  image_urls: string[];
  price: number;
  stock_quantity: number;
  units_sold_30d: number;
  units_sold_all_time: number;
  revenue_all_time: number;
}
