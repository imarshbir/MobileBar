import { useEffect, useState } from 'react';
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

interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon_id: string | null;
  coupon_code: string | null;
}

type PaymentMethod = 'razorpay' | 'cod';

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
  const { items, clearCart } = useCart();
  const { push } = useToast();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [couponInput, setCouponInput] = useState('');
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [totals, setTotals] = useState<CartTotals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [payingOnline, setPayingOnline] = useState(false);
  const [placingCod, setPlacingCod] = useState(false);

  const missingMobile = !profile?.mobile_number;
  const appliedCouponCode = couponPreview?.is_valid ? couponInput.trim() : null;

  // The price table always reflects exactly what compute_cart_total()
  // on the server will charge — same function both create-razorpay-
  // order and finalize_paid_order/checkout use — so nothing shown here
  // can ever drift from what actually gets charged. Recomputes whenever
  // the payment method (which changes the ₹99 COD surcharge) or the
  // applied coupon changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTotals(true);
      const { data, error } = await supabase.rpc('compute_cart_total', {
        p_customer_id: profile?.id,
        p_coupon_code: appliedCouponCode,
        p_payment_method: paymentMethod,
      });
      if (!cancelled) {
        if (!error && data?.[0]) setTotals(data[0] as CartTotals);
        setLoadingTotals(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, appliedCouponCode, paymentMethod]);

  const handleCheckCoupon = async () => {
    if (!couponInput.trim() || !totals) return;
    setCheckingCoupon(true);
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: couponInput.trim(),
      p_cart_total: totals.subtotal,
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

      {/* Payment method — chosen here because it affects the ₹99 COD
          surcharge shown in the price table right below. */}
      <div className="card-surface mt-4 p-6">
        <h2 className="text-headline-md !text-base text-on-surface">Payment method</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod('razorpay')}
            className={`rounded-lg border-2 px-4 py-3 text-left transition ${
              paymentMethod === 'razorpay' ? 'border-primary bg-primary/5' : 'border-border-soft bg-white'
            }`}
          >
            <span className="flex items-center gap-2 text-label-sm font-semibold text-on-surface">
              <span className="material-symbols-outlined !text-lg text-primary">credit_card</span>
              Pay Online
            </span>
            <span className="mt-1 block text-caption text-on-surface-variant">UPI / Card / Netbanking</span>
          </button>
          <button
            onClick={() => setPaymentMethod('cod')}
            className={`rounded-lg border-2 px-4 py-3 text-left transition ${
              paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border-soft bg-white'
            }`}
          >
            <span className="flex items-center gap-2 text-label-sm font-semibold text-on-surface">
              <span className="material-symbols-outlined !text-lg text-primary">payments</span>
              Cash on Delivery
            </span>
            <span className="mt-1 block text-caption text-on-surface-variant">+₹99 handling charge</span>
          </button>
        </div>
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

      {/* Price breakdown — a real, server-verified table, not an
          estimate: subtotal, then shipping (with the COD surcharge
          folded in when that method is selected), then the coupon
          discount subtracted, then the grand total. */}
      <div className="card-surface mt-4 overflow-hidden">
        <div className="border-b border-border-soft bg-surface-container-low px-6 py-3">
          <h2 className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">Price Details</h2>
        </div>
        {loadingTotals || !totals ? (
          <div className="p-6 text-center text-body-md text-on-surface-variant">Calculating…</div>
        ) : (
          <table className="w-full text-body-md">
            <tbody>
              <tr className="border-b border-border-soft">
                <td className="px-6 py-3 text-on-surface-variant">Order Amount</td>
                <td className="px-6 py-3 text-right text-on-surface">{formatPrice(totals.subtotal)}</td>
              </tr>
              <tr className="border-b border-border-soft">
                <td className="px-6 py-3 text-on-surface-variant">
                  Delivery Charges
                  {paymentMethod === 'cod' && <span className="ml-1 text-caption">(incl. ₹99 COD charge)</span>}
                </td>
                <td className="px-6 py-3 text-right">
                  {totals.shipping === 0 ? (
                    <span className="font-semibold text-primary">FREE</span>
                  ) : (
                    <span className="text-on-surface">+{formatPrice(totals.shipping)}</span>
                  )}
                </td>
              </tr>
              {totals.discount > 0 && (
                <tr className="border-b border-border-soft">
                  <td className="px-6 py-3 text-on-surface-variant">
                    Coupon Discount {totals.coupon_code ? `(${totals.coupon_code})` : ''}
                  </td>
                  <td className="px-6 py-3 text-right text-primary">−{formatPrice(totals.discount)}</td>
                </tr>
              )}
              <tr className="bg-surface-container-low">
                <td className="px-6 py-4 text-headline-md !text-base font-bold text-on-surface">Total Payable</td>
                <td className="px-6 py-4 text-right text-headline-md !text-lg font-bold text-primary-deep">
                  {formatPrice(totals.total)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
        {totals && totals.subtotal <= 799 && (
          <p className="flex items-center gap-1.5 border-t border-border-soft px-6 py-2.5 text-caption text-on-surface-variant">
            <span className="material-symbols-outlined !text-sm">local_shipping</span>
            Add {formatPrice(799 - totals.subtotal + 1)} more to get free delivery.
          </p>
        )}
      </div>

      {paymentMethod === 'razorpay' ? (
        <button onClick={handlePayOnline} disabled={payingOnline || placingCod} className="btn-primary mt-6 w-full !py-4 shadow-3">
          <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
          {payingOnline ? 'Opening secure payment…' : totals ? `Pay ${formatPrice(totals.total)}` : 'Pay Online'}
        </button>
      ) : (
        <button onClick={handleCod} disabled={payingOnline || placingCod} className="btn-primary mt-6 w-full !py-4 shadow-3">
          {placingCod ? 'Placing order…' : 'Place Order (Cash on Delivery)'}
        </button>
      )}

      <p className="mt-3 text-center text-caption text-on-surface-variant">
        {paymentMethod === 'razorpay'
          ? 'Online payments are handled entirely by Razorpay — we never see your card or bank details.'
          : 'Pay in cash when your order is delivered.'}
      </p>
    </div>
  );
}