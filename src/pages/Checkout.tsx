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

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// Razorpay's Checkout.js is only needed on this one page, so it's
// loaded on demand rather than as a static <script> tag in index.html —
// nobody browsing the storefront should have to download it.
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { profile } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { push } = useToast();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const [placingCod, setPlacingCod] = useState(false);

  const missingMobile = !profile?.mobile_number;
  const appliedCouponCode = couponPreview?.is_valid ? couponInput.trim() : null;

  const handleCheckCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
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

  // Online payment: UPI, cards, netbanking, wallets — all handled
  // inside Razorpay's own Checkout.js sheet, we never see raw
  // card/bank details. The order isn't created until payment is
  // confirmed — see verify-razorpay-payment / razorpay-webhook.
  const handlePayOnline = async () => {
    if (missingMobile) {
      push('Add a mobile number to your profile before checking out — delivery needs a contact number.', 'error');
      return;
    }

    setPayingOnline(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        push('Could not load the payment window. Check your connection and try again.', 'error');
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      if (!accessToken) {
        push('Please sign in again to continue.', 'error');
        return;
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { coupon_code: appliedCouponCode },
      });
      if (orderError || orderData?.error) {
        push(orderData?.error || 'Could not start payment. Please try again.', 'error');
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.razorpay_order_id,
        name: 'Mobile Bar',
        description: `${items.length} item${items.length !== 1 ? 's' : ''}`,
        prefill: {
          name: profile?.full_name,
          email: profile?.email,
          contact: profile?.mobile_number ?? undefined,
        },
        theme: { color: '#065F46' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: response,
          });
          if (verifyError || verifyData?.error) {
            push(verifyData?.error || 'Payment could not be verified. If money was deducted, it will be refunded.', 'error');
            return;
          }
          push('Payment successful — order confirmed!', 'success');
          await clearCart();
          navigate('/profile');
        },
        modal: {
          ondismiss: () => {
            setPayingOnline(false);
          },
        },
      });

      razorpay.open();
    } catch {
      push('Could not start payment. Please try again.', 'error');
    } finally {
      setPayingOnline(false);
    }
  };

  // Cash on Delivery: still goes through the existing checkout() RPC,
  // which creates the order immediately (now as "confirmed", with
  // payment_status "pending" until cash is collected at delivery).
  const handleCod = async () => {
    if (missingMobile) {
      push('Add a mobile number to your profile before checking out — delivery needs a contact number.', 'error');
      return;
    }
    setPlacingCod(true);
    const { data, error } = await supabase.rpc('checkout', { p_coupon_code: appliedCouponCode });
    setPlacingCod(false);

    if (error) {
      push(error.message || 'Could not place your order. Please try again.', 'error');
      return;
    }
    if (!data || data.length === 0) {
      push('Your cart may have already been checked out. Please refresh and try again.', 'error');
      return;
    }
    push('Order placed and confirmed!', 'success');
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
  const grandTotal = Math.max(0, totalPrice - discount) * 1.18; // preview only — server computes the authoritative figure

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

      <button
        onClick={handlePayOnline}
        disabled={payingOnline || placingCod}
        className="btn-primary mt-6 w-full !py-4 shadow-3"
      >
        <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
          lock
        </span>
        {payingOnline ? 'Opening secure payment…' : 'Pay Online (UPI / Card / Netbanking)'}
      </button>

      <button onClick={handleCod} disabled={payingOnline || placingCod} className="btn-secondary mt-3 w-full !py-3.5">
        {placingCod ? 'Placing order…' : 'Cash on Delivery'}
      </button>

      <p className="mt-3 text-center text-caption text-on-surface-variant">
        Online payments are handled entirely by Razorpay — we never see your card or bank details.
      </p>
    </div>
  );
}