import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/Toast';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

interface CouponPreview {
  is_valid: boolean;
  discount_amount: number;
  message: string;
}

export default function Checkout() {
  const { profile } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { push } = useToast();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [placing, setPlacing] = useState(false);

  const missingMobile = !profile?.mobile_number;

  const handleCheckCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    // validate_coupon() is a read-only preview — it never locks a row or
    // increments usage. The real, authoritative check (and the only
    // place a coupon actually gets consumed) happens inside checkout()
    // below, so a stale preview here can never cause an incorrect charge.
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: couponInput.trim(),
      p_cart_total: totalPrice,
    });
    setCheckingCoupon(false);
    if (error || !data || data.length === 0) {
      setCouponPreview({ is_valid: false, discount_amount: 0, message: 'Could not check this coupon.' });
      return;
    }
    setCouponPreview(data[0] as CouponPreview);
  };

  const handlePlaceOrder = async () => {
    if (missingMobile) {
      push('Add a mobile number to your profile before checking out — delivery needs a contact number.', 'error');
      return;
    }
    setPlacing(true);

    // One atomic call: the server re-reads the cart itself, locks every
    // affected product row, validates stock, applies the coupon exactly
    // once against the true cart total, and creates all order lines
    // together or not at all. Nothing here can be tampered with from
    // the client — price, stock, and coupon math are all authoritative
    // on the server side.
    const { data, error } = await supabase.rpc('checkout', {
      p_coupon_code: couponPreview?.is_valid ? couponInput.trim() : null,
    });

    setPlacing(false);

    if (error) {
      push(error.message || 'Could not place your order. Please try again.', 'error');
      return;
    }
    if (!data || data.length === 0) {
      push('Your cart may have already been checked out. Please refresh and try again.', 'error');
      return;
    }

    push('Order placed! Track it from your profile.', 'success');
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

  const discount = couponPreview?.is_valid ? couponPreview.discount_amount : 0;
  const grandTotal = Math.max(0, totalPrice - discount) * 1.18; // GST preview only — server computes the authoritative figure

  return (
    <div className="container-page max-w-2xl py-xl">
      <h1 className="text-headline-lg text-on-surface">Checkout</h1>

      <div className="card-surface mt-6 p-6">
        <h2 className="text-headline-md !text-base text-on-surface">Ship to</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">{profile?.full_name}</p>
        <p className="text-body-md text-on-surface-variant">{profile?.shipping_address}</p>
        <p className="text-body-md text-on-surface-variant">
          {profile?.mobile_number ?? 'No mobile number on file'} · {profile?.email}
        </p>
        {missingMobile && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-label-sm text-amber-800">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-base">warning</span>
              A mobile number is required for delivery.
            </span>
            <button onClick={() => navigate('/profile')} className="font-semibold underline underline-offset-2">
              Add one
            </button>
          </div>
        )}
      </div>

      <div className="card-surface mt-4 divide-y divide-border-soft p-6">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between py-2 text-body-md">
            <span className="text-on-surface-variant">
              {item.product?.name} × {item.quantity}
            </span>
            <span className="text-on-surface">{formatPrice((item.product?.sale_price ?? 0) * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="card-surface mt-4 p-6">
        <h2 className="text-headline-md !text-base text-on-surface">Coupon code</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={couponInput}
            onChange={(e) => {
              setCouponInput(e.target.value);
              setCouponPreview(null);
            }}
            placeholder="Enter code"
            className="input-field bg-white"
          />
          <button onClick={handleCheckCoupon} disabled={checkingCoupon || !couponInput.trim()} className="btn-secondary shrink-0">
            {checkingCoupon ? 'Checking…' : 'Apply'}
          </button>
        </div>
        {couponPreview && (
          <p className={`mt-2 flex items-center gap-1.5 text-label-sm ${couponPreview.is_valid ? 'text-primary' : 'text-error'}`}>
            <span className="material-symbols-outlined !text-base">{couponPreview.is_valid ? 'check_circle' : 'error'}</span>
            {couponPreview.message}
          </p>
        )}
      </div>

      <div className="card-surface mt-4 p-6">
        <div className="flex justify-between text-body-md text-on-surface-variant">
          <span>Subtotal</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
        {discount > 0 && (
          <div className="mt-1 flex justify-between text-body-md text-primary">
            <span>Coupon discount</span>
            <span>−{formatPrice(discount)}</span>
          </div>
        )}
        <p className="mt-1 text-caption text-on-surface-variant">Plus applicable GST, calculated at checkout.</p>
        <div className="mt-3 flex justify-between border-t border-border-soft pt-3 text-headline-md !text-lg text-on-surface">
          <span>Estimated total</span>
          <span>{formatPrice(grandTotal)}</span>
        </div>
      </div>

      <button onClick={handlePlaceOrder} disabled={placing || missingMobile} className="btn-primary mt-6 w-full !py-4 shadow-3">
        <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
          lock
        </span>
        {placing ? 'Placing order…' : 'Place order'}
      </button>
      <p className="mt-3 text-center text-caption text-on-surface-variant">
        Cash on delivery. Payment gateway integration is a drop-in for launch.
      </p>
    </div>
  );
}