import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Cart() {
  const { session } = useAuth();
  const { items, loading, updateQuantity, removeFromCart, totalPrice } = useCart();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-headline-md text-on-surface">Sign in to see your cart.</p>
        <button onClick={() => navigate('/login', { state: { from: '/cart' } })} className="btn-primary mt-4">
          Login / Register
        </button>
      </div>
    );
  }

  if (loading) return <Loader label="Loading cart" />;

  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <span className="material-symbols-outlined !text-4xl text-outline">shopping_bag</span>
        <p className="mt-2 text-headline-md text-on-surface">Your cart is empty.</p>
        <p className="mt-1 text-body-md text-on-surface-variant">Add a phone to get started.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Browse phones
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-xl">
      <h1 className="text-headline-lg text-on-surface">Your cart</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="card-surface flex items-center gap-4 p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-container-low">
                {item.product?.image_urls?.[0] && (
                  <img src={item.product.image_urls[0]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-label-sm font-semibold text-on-surface">
                  {item.product?.name}
                </p>
                <p className="mt-1 text-caption text-on-surface-variant">
                  {item.product?.compatible_models?.slice(0, 2).join(', ') || item.product?.color}
                </p>
                <p className="mt-1 font-semibold text-primary-deep">{formatPrice(item.product?.sale_price ?? 0)}</p>
              </div>
              <div className="flex items-center rounded-lg border border-border-soft">
                <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="px-2.5 py-1.5 text-on-surface-variant hover:text-primary">
                  −
                </button>
                <span className="w-7 text-center text-label-sm">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="px-2.5 py-1.5 text-on-surface-variant hover:text-primary">
                  +
                </button>
              </div>
              <button onClick={() => removeFromCart(item.product_id)} className="text-outline hover:text-error">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
        </div>

        <div className="card-surface h-fit p-6">
          <h2 className="text-headline-md !text-lg text-on-surface">Order summary</h2>
          <div className="mt-4 flex justify-between text-body-md text-on-surface-variant">
            <span>Subtotal</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <div className="mt-1 flex justify-between text-body-md text-on-surface-variant">
            <span>Shipping</span>
            <span className="text-primary">Free</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border-soft pt-3 text-headline-md !text-lg text-on-surface">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <Link to="/checkout" className="btn-primary mt-5 w-full shadow-3">
            <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
            Proceed to checkout
          </Link>
        </div>
      </div>
    </div>
  );
}