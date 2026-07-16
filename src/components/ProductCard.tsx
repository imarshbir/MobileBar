import { Link, useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/components/Toast';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// The "-X% OFF" badge is always computed from price + discount_amount,
// never stored or entered as its own number — see AdminProducts.tsx
// for the same computation used when the admin is setting the price.
const computeDiscountPercent = (product: Product) => {
  if (product.discount_amount <= 0 || product.compare_at_price <= 0) return 0;
  return Math.round((product.discount_amount / product.compare_at_price) * 100);
};

export default function ProductCard({ product }: { product: Product }) {
  const { session } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { push } = useToast();
  const navigate = useNavigate();
  const outOfStock = product.stock_quantity <= 0;
  const discountPercent = computeDiscountPercent(product);
  const hasDiscount = discountPercent > 0;

  const handleAddToCart = async () => {
    if (!session) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    const { error } = await addToCart(product.id, 1);
    push(error ? 'Could not add to cart.' : `${product.name} added to cart.`, error ? 'error' : 'success');
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    await toggleWishlist(product.id);
  };

  return (
    <div className="card-surface group flex flex-col overflow-hidden transition hover:shadow-2">
      <Link to={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-surface-container-low">
        {product.image_urls?.[0] ? (
          <img
            src={product.image_urls[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-outline">
            <span className="material-symbols-outlined !text-4xl">category</span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="rounded-full bg-error px-3 py-1 text-caption font-semibold text-white">
              -{discountPercent}% OFF
            </span>
          )}
          {product.is_new_arrival && (
            <span className="rounded-full bg-primary px-3 py-1 text-caption font-semibold text-white">New</span>
          )}
        </div>

        <button
          onClick={handleWishlist}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-1"
        >
          <span
            className={`material-symbols-outlined !text-lg ${isWishlisted(product.id) ? 'text-error' : 'text-on-surface-variant'}`}
            style={{ fontVariationSettings: `'FILL' ${isWishlisted(product.id) ? 1 : 0}` }}
          >
            favorite
          </span>
        </button>

        {outOfStock && (
          <span className="absolute bottom-3 left-3 rounded-full bg-secondary px-3 py-1 text-caption font-semibold uppercase tracking-wide text-white">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-md">
        {product.brand && <p className="eyebrow">{product.brand.name}</p>}
        <Link to={`/product/${product.id}`}>
          <h3 className="text-headline-md !text-[16px] font-semibold text-on-surface hover:text-primary">{product.name}</h3>
        </Link>

        {product.compatible_models?.length > 0 && (
          <p className="text-caption text-on-surface-variant">Fits: {product.compatible_models.slice(0, 2).join(', ')}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-headline-md !text-[18px] font-bold text-on-surface">{formatPrice(product.price)}</span>
            {hasDiscount && <span className="text-caption text-outline line-through">{formatPrice(product.compare_at_price)}</span>}
          </div>
          <button onClick={handleAddToCart} disabled={outOfStock} className="btn-primary !px-3 !py-2 !text-caption">
            <span className="material-symbols-outlined !text-base">add_shopping_cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}