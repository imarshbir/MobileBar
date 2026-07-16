import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { WishlistItem } from '@/types';
import { useAuth } from './AuthContext';

interface WishlistContextValue {
  items: WishlistItem[];
  loading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<{ error: string | null }>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!session?.user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('wishlist_items')
      .select('*, product:products(*)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    setItems((data as unknown as WishlistItem[]) ?? []);
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isWishlisted = (productId: string) => items.some((i) => i.product_id === productId);

  const toggleWishlist = async (productId: string) => {
    if (!session?.user) return { error: 'not-authenticated' };
    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      await supabase.from('wishlist_items').delete().eq('id', existing.id);
    } else {
      const { error } = await supabase
        .from('wishlist_items')
        .insert({ customer_id: session.user.id, product_id: productId });
      if (error) return { error: error.message };
    }
    await fetchWishlist();
    return { error: null };
  };

  return (
    <WishlistContext.Provider value={{ items, loading, isWishlisted, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
