export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  hero_image_url: string;
  filter_config: string[];
  display_order: number;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string | null;
  category_id: string;
  brand_id: string | null;
  description: string;
  features: string[];
  whats_included: string[];
  delivery_info: string;
  return_policy: string;
  compatible_models: string[];
  material: string;
  finish: string;
  color: string;
  // Pricing model: `price` is the real selling price the admin
  // receives per sale. `discount_amount` is an optional flat rupee
  // amount the admin adds on top to show as a "was" price —
  // `compare_at_price` (price + discount_amount) is what renders
  // crossed-out, and the "-X% OFF" badge is always computed from these
  // two numbers on the frontend, never entered directly by the admin.
  price: number;
  discount_amount: number;
  compare_at_price: number;
  sale_price: number;
  stock_quantity: number;
  image_urls: string[];
  video_url: string;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined at query time
  category?: Category;
  brand?: Brand;
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
  mobile_number: string | null;
  shipping_address: string;
  is_admin: boolean;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  full_name: string;
  mobile_number: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface WishlistItem {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: boolean;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  customer_email: string;
  shipping_address: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  coupon_code: string | null;
  coupon_discount: number;
  shipping_charges: number;
  taxable_value: number;
  gst_percent: number;
  gst_amount: number;
  total_price: number;
  payment_status: PaymentStatus;
  payment_method: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
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
  name: string;
  image_urls: string[];
  price: number;
  stock_quantity: number;
  units_sold_30d: number;
  units_sold_all_time: number;
  revenue_all_time: number;
}