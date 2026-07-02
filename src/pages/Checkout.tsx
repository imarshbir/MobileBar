import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/Toast';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Checkout() {
  const { profile } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { push } = useToast();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    let failed = 0;

    for (const item of items) {
      const { error } = await supabase.rpc('place_order', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      if (error) failed += 1;
    }

    setPlacing(false);

    if (failed === items.length) {
      push('Could not place your order. Please check stock and try again.', 'error');
      return;
    }
    if (failed > 0) {
      push(`${failed} item(s) could not be ordered (likely out of stock). The rest were placed.`, 'error');
    } else {
      push('Order placed! Track it from your profile.', 'success');
    }
    await clearCart();
    navigate('/profile');
  };

  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-headline-md text-on-surface">Nothing to check out.</p>
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-xl">
      <div className="mb-6 flex justify-center">
        <div className="flex items-center gap-xs rounded-full bg-surface-container-high px-md py-xs shadow-1">
          <span className="material-symbols-outlined !text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
          <span className="text-label-sm uppercase tracking-wider text-primary">Secure Checkout</span>
        </div>
      </div>

      <h1 className="text-center text-headline-lg text-on-surface">Checkout</h1>

      <div className="card-surface mt-6 p-6">
        <h2 className="text-headline-md !text-base text-on-surface">Ship to</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">{profile?.full_name}</p>
        <p className="text-body-md text-on-surface-variant">{profile?.shipping_address}</p>
        <p className="text-body-md text-on-surface-variant">
          {profile?.mobile_number} · {profile?.email}
        </p>
      </div>

      <div className="card-surface mt-4 divide-y divide-border-soft p-6">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between py-2 text-body-md">
            <span className="text-on-surface-variant">
              {item.product?.brand} {item.product?.model_name} × {item.quantity}
            </span>
            <span className="text-on-surface">{formatPrice((item.product?.price ?? 0) * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 text-headline-md !text-lg text-on-surface">
          <span>Total</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
      </div>

      <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary mt-6 w-full !py-4 shadow-3">
        <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
          lock
        </span>
        {placing ? 'Placing order…' : `Place order · ${formatPrice(totalPrice)}`}
      </button>
      <p className="mt-3 text-center text-caption text-on-surface-variant">
        Cash on delivery. Payment gateway integration is a drop-in for launch.
      </p>
    </div>
  );
}
