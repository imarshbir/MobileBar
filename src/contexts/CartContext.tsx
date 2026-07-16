import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CartItem } from '@/types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<{ error: string | null }>;
  updateQuantity: (productId: string, quantity: number) => Promise<{ error: string | null }>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!session?.user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    setItems((data as unknown as CartItem[]) ?? []);
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Uses the add_to_cart() Postgres function — a single atomic
  // INSERT ... ON CONFLICT DO UPDATE — instead of reading local state
  // to decide insert-vs-update. That old pattern had a real race: two
  // rapid clicks (or two open tabs) could both see "not in cart yet"
  // and both fire an insert, and the loser would get a raw unique-
  // constraint error instead of their quantity just incrementing.
  const addToCart = async (productId: string, quantity = 1) => {
    if (!session?.user) return { error: 'not-authenticated' };

    const { error } = await supabase.rpc('add_to_cart', {
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) return { error: error.message };
    await fetchCart();
    return { error: null };
  };

  // Uses set_cart_quantity() — also atomic, and collapses to a delete
  // server-side when quantity < 1, so there's one code path instead of
  // the caller having to branch between update and remove.
  const updateQuantity = async (productId: string, quantity: number) => {
    const { error } = await supabase.rpc('set_cart_quantity', {
      p_product_id: productId,
      p_quantity: quantity,
    });
    if (error) return { error: error.message };
    await fetchCart();
    return { error: null };
  };

  const removeFromCart = async (productId: string) => {
    if (!session?.user) return;
    await supabase.from('cart_items').delete().eq('customer_id', session.user.id).eq('product_id', productId);
    await fetchCart();
  };

  const clearCart = async () => {
    if (!session?.user) return;
    await supabase.from('cart_items').delete().eq('customer_id', session.user.id);
    await fetchCart();
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + (i.product?.sale_price ?? 0) * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, loading, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}