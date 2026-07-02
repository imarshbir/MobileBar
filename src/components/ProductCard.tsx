import { Link, useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/Toast';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function ProductCard({ product }: { product: Product }) {
  const { session } = useAuth();
  const { addToCart } = useCart();
  const { push } = useToast();
  const navigate = useNavigate();
  const outOfStock = product.stock_quantity <= 0;

  const handleAddToCart = async () => {
    if (!session) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    const { error } = await addToCart(product.id, 1);
    push(error ? 'Could not add to cart.' : `${product.brand} ${product.model_name} added to cart.`, error ? 'error' : 'success');
  };

  return (
    <div className="card-surface group flex flex-col overflow-hidden transition hover:shadow-2">
      <Link to={`/product/${product.id}`} className="relative aspect-[4/3] overflow-hidden bg-surface-container-low">
        {product.image_urls?.[0] ? (
          <img
            src={product.image_urls[0]}
            alt={`${product.brand} ${product.model_name}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-outline">
            <span className="material-symbols-outlined !text-4xl">smartphone</span>
          </div>
        )}
        {outOfStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-secondary px-3 py-1 text-caption font-semibold uppercase tracking-wide text-white">
            Out of stock
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-caption font-semibold uppercase tracking-wide text-primary shadow-1">
            In stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-md">
        <div>
          <p className="eyebrow">{product.brand}</p>
          <Link to={`/product/${product.id}`}>
            <h3 className="mt-0.5 text-headline-md !text-[18px] font-semibold text-on-surface hover:text-primary">
              {product.model_name}
            </h3>
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="spec-chip">{product.ram_gb}GB RAM</span>
          <span className="spec-chip">{product.storage_gb}GB</span>
          {product.color && <span className="spec-chip">{product.color}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-headline-md !text-[20px] font-bold text-on-surface">{formatPrice(product.price)}</span>
          <button onClick={handleAddToCart} disabled={outOfStock} className="btn-primary !px-3.5 !py-2 !text-caption">
            <span className="material-symbols-outlined !text-base">{outOfStock ? 'notifications' : 'add_shopping_cart'}</span>
            {outOfStock ? 'Notify me' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
